
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserCheck, Plus, Trash2, Users, ClipboardList, BookOpen, AlertTriangle, Eye, Printer, Upload, X, Settings2, Save, Wand2, Clock, ShieldAlert, ArrowLeftRight, CheckCircle2, Loader2, FileDown, ShieldOff } from 'lucide-react';
import * as XLSX from 'xlsx';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { Teacher, GradeLevel, GRADE_LABELS, ExamScheduleItem, ExamCommittee, ObservationAssignment, CorrectionCommittee, Subject, ObserverConfig } from '../examControl.types';
import { db } from '../services/db';

const Observers: React.FC<{ externalMode?: boolean; externalTeachers?: Teacher[] }> = ({ externalMode = false, externalTeachers = [] }) => {
  const [activeTab, setActiveTab] = useState<'teachers' | 'config' | 'observation' | 'correction'>('teachers');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignments, setAssignments] = useState<ObservationAssignment[]>([]);
  const [correctionCommittees, setCorrectionCommittees] = useState<CorrectionCommittee[]>([]);
  const [obsConfig, setObsConfig] = useState<ObserverConfig>(db.getObserverConfig());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const schoolInfo = db.getSchoolInfo();
  
  // State for adding new teacher
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('');
  const [selectedExternalTeacherIds, setSelectedExternalTeacherIds] = useState<string[]>([]);

  // Conflict Modal State
  const [editingConflictsTeacherId, setEditingConflictsTeacherId] = useState<string | null>(null);
  const [conflictGradeFilter, setConflictGradeFilter] = useState<GradeLevel | 'all'>('all');

  // Selection States
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('p1');
  const [selectedTerm, setSelectedTerm] = useState<'term1' | 'term2'>('term1');
  
  // Data for distribution
  const [schedule, setSchedule] = useState<ExamScheduleItem[]>([]);
  const [committees, setCommittees] = useState<ExamCommittee[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // States
  const [isSwapMode, setIsSwapMode] = useState(false);
  const [swapSource, setSwapSource] = useState<{ 
    scheduleId: string, 
    committeeId: string, 
    index: number | 'reserve', 
    teacherId: string,
    gradeLevel: GradeLevel 
  } | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [printConfirmOpen, setPrintConfirmOpen] = useState(false); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
      refreshData();
  }, [externalMode, externalTeachers]);

  useEffect(() => {
      if (activeTab === 'observation' || activeTab === 'correction') {
          setSchedule(db.getExamSchedule(selectedGrade, selectedTerm));
          setCommittees(db.getCommittees().filter(c => c.gradeLevel === selectedGrade));
          setSubjects(db.getSubjects().filter(s => s.gradeLevels?.includes(selectedGrade)));
      }
  }, [activeTab, selectedGrade, selectedTerm]);

  const refreshData = () => {
      const storedTeachers = db.getTeachers();
      if (externalMode && externalTeachers.length > 0) {
          const allowedIds = new Set(externalTeachers.map(t => t.id));
          setTeachers(storedTeachers.filter(t => allowedIds.has(t.id)));
      } else {
          setTeachers(storedTeachers);
      }
      setAssignments(db.getObservationAssignments());
      setCorrectionCommittees(db.getCorrectionCommittees());
      setObsConfig(db.getObserverConfig());
  };

  // --- PRINT & PDF LOGIC ---
  const handlePrintRequest = () => {
      setPrintConfirmOpen(true);
  };

  const executePrint = () => {
      setPrintConfirmOpen(false);
      setTimeout(() => {
          window.print();
      }, 300);
  };

  const handleExportPDF = (elementId: string, filename: string) => {
    setIsExporting(true);
    const element = document.getElementById(elementId);
    if (!element) {
        setIsExporting(false);
        return;
    }

    const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `${filename}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
          foreignObjectRendering: true,
          onclone: (doc: Document) => {
            const link = doc.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&display=swap';
            doc.head.appendChild(link);
            const style = doc.createElement('style');
            style.textContent = `
              * { font-family: 'Cairo', 'Noto Naskh Arabic', sans-serif !important; }
              html, body { direction: rtl; unicode-bidi: plaintext; }
            `;
            doc.head.appendChild(style);
          }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        setIsExporting(false);
    }).catch((err: any) => {
        console.error(err);
        setIsExporting(false);
        alert('حدث خطأ أثناء تصدير ملف PDF.');
    });
  };

  // --- TIME UTILS ---
  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const cleanTime = timeStr.replace(/[^\d:]/g, '');
    const parts = cleanTime.split(':');
    if (parts.length < 2) return 0;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    return (hours || 0) * 60 + (minutes || 0);
  };

  const isOverlapping = (start1: number, end1: number, start2: number, end2: number): boolean => {
    return Math.max(start1, start2) < Math.min(end1, end2);
  };

  // --- GLOBAL CONFLICT MAP ---
  const globalSchedulesMap = useMemo(() => {
      const map: Record<string, { day: string, date: string, startMin: number, endMin: number, grade: string, subject: string, timeRange: string }> = {};
      const grades = Object.keys(GRADE_LABELS) as GradeLevel[];
      
      grades.forEach(g => {
          const gSchedule = db.getExamSchedule(g, selectedTerm);
          gSchedule.forEach(item => {
              map[item.id] = {
                  day: item.day,
                  date: item.date,
                  startMin: timeToMinutes(item.timeFrom),
                  endMin: timeToMinutes(item.timeTo),
                  grade: GRADE_LABELS[g],
                  subject: item.subjectName,
                  timeRange: `${item.timeFrom} - ${item.timeTo}`
              };
          });
      });
      return map;
  }, [selectedTerm]);

  const checkConflict = (teacherId: string, scheduleId: string, committeeId: string, currentAssignments: ObservationAssignment[]) => {
      const currentSched = globalSchedulesMap[scheduleId];
      if (!currentSched || !teacherId) return null;

      const conflict = currentAssignments.find(a => {
          const assignedSched = globalSchedulesMap[a.scheduleId];
          if (!assignedSched) return false;

          const isSameTeacher = a.observerIds.includes(teacherId) || a.reserveObserverId === teacherId;
          const isSameDay = assignedSched.date === currentSched.date;
          
          if (isSameTeacher && isSameDay) {
              const hasTimeOverlap = isOverlapping(
                currentSched.startMin, currentSched.endMin,
                assignedSched.startMin, assignedSched.endMin
              );
              const isDifferentCommittee = (a.committeeId !== committeeId || a.scheduleId !== scheduleId);
              return hasTimeOverlap && isDifferentCommittee;
          }
          return false;
      });

      if (conflict) {
          const info = globalSchedulesMap[conflict.scheduleId];
          const comm = db.getCommittees().find(c => c.id === conflict.committeeId);
          return { grade: info.grade, subject: info.subject, committee: comm?.name || 'لجنة أخرى', range: info.timeRange };
      }
      return null;
  };

  // --- AUTO DISTRIBUTE LOGIC ---
  const handleAutoDistribute = () => {
      if (teachers.length === 0) {
          alert("خطأ: لا يوجد مدرسين مسجلين في النظام. يرجى إضافة مدرسين أولاً.");
          return;
      }
      if (schedule.length === 0 || committees.length === 0) {
          alert("خطأ: يرجى إدخل جدول الامتحانات ولجان الطلاب للصف المختار أولاً.");
          return;
      }

      if (!confirm("سيتم توزيع الملاحظين تلقائياً مع ضمان عدم تكرار المدرس في نفس اليوم والتوقيت عبر كافة الصفوف، واحترام موانع اللجان المسجلة للمدرسين. هل تريد الاستمرار؟")) return;

      setIsProcessing(true);

      setTimeout(() => {
          try {
              const otherGradeAssignments = assignments.filter(a => {
                  const s = globalSchedulesMap[a.scheduleId];
                  return s && s.grade !== GRADE_LABELS[selectedGrade];
              });

              let workingAssignments = [...otherGradeAssignments];
              
              const workload: Record<string, number> = {};
              teachers.forEach(t => workload[t.id] = 0);
              
              otherGradeAssignments.forEach(a => {
                  [...a.observerIds, a.reserveObserverId].forEach(id => {
                      if (id && workload[id] !== undefined) workload[id]++;
                  });
              });

              const sortedExams = [...schedule].sort((a, b) => a.date.localeCompare(b.date) || timeToMinutes(a.timeFrom) - timeToMinutes(b.timeFrom));

              sortedExams.forEach(exam => {
                  committees.forEach(comm => {
                      const selectedObservers: string[] = [];
                      let reserveId = '';

                      for (let i = 0; i < obsConfig.observersPerCommittee; i++) {
                          const candidates = teachers
                              .filter(t => {
                                  const alreadyChosenInThisCommittee = selectedObservers.includes(t.id);
                                  const conflict = checkConflict(t.id, exam.id, comm.id, workingAssignments);
                                  // التحقق من موانع اللجنة أو الصف
                                  const hasForbiddenCommittee = t.conflicts?.includes(comm.id);
                                  const forbiddenGrade = t.forbiddenGrades?.includes(comm.gradeLevel);
                                  return !alreadyChosenInThisCommittee && !conflict && !hasForbiddenCommittee && !forbiddenGrade;
                              })
                              .sort((a, b) => (workload[a.id] - workload[b.id]) || (Math.random() - 0.5));

                          if (candidates.length > 0) {
                              const chosen = candidates[0];
                              selectedObservers.push(chosen.id);
                              workload[chosen.id]++;
                          } else {
                              selectedObservers.push('');
                          }
                      }

                      const reserveCandidates = teachers
                          .filter(t => {
                              const alreadyChosenInThisCommittee = selectedObservers.includes(t.id);
                              const conflict = checkConflict(t.id, exam.id, comm.id, workingAssignments);
                              const hasForbiddenCommittee = t.conflicts?.includes(comm.id);
                              const forbiddenGrade = t.forbiddenGrades?.includes(comm.gradeLevel);
                              return !alreadyChosenInThisCommittee && !conflict && !hasForbiddenCommittee && !forbiddenGrade;
                          })
                          .sort((a, b) => (workload[a.id] - workload[b.id]) || (Math.random() - 0.5));

                      if (reserveCandidates.length > 0) {
                          const chosenRes = reserveCandidates[0];
                          reserveId = chosenRes.id;
                          workload[chosenRes.id]++;
                      }

                      workingAssignments.push({
                          id: `obs_auto_${Math.random().toString(36).substr(2, 9)}`,
                          scheduleId: exam.id,
                          committeeId: comm.id,
                          term: selectedTerm,
                          observerIds: selectedObservers,
                          reserveObserverId: reserveId
                      });
                  });
              });

              setAssignments(workingAssignments);
              db.saveObservationAssignments(workingAssignments);
              alert("تم التوزيع التلقائي الذكي بنجاح.");
          } catch (err) {
              console.error(err);
              alert("حدث خطأ تقني أثناء التوزيع.");
          } finally {
              setIsProcessing(false);
          }
      }, 500);
  };

  const handleSwapClick = (scheduleId: string, committeeId: string, index: number | 'reserve', teacherId: string) => {
    if (!isSwapMode) return;
    if (!swapSource) {
        if (!teacherId) return;
        setSwapSource({ scheduleId, committeeId, index, teacherId, gradeLevel: selectedGrade });
    } else {
        const source = swapSource;
        const target = { scheduleId, committeeId, index, teacherId, gradeLevel: selectedGrade };

        if (source.scheduleId === target.scheduleId && source.committeeId === target.committeeId && source.index === target.index) {
            setSwapSource(null);
            return;
        }

        const sourceTeacher = teachers.find(t => t.id === source.teacherId);
        const targetTeacher = teachers.find(t => t.id === target.teacherId);

        const sourceTeacherName = sourceTeacher?.name || 'الملاحظ';
        const targetTeacherName = targetTeacher?.name || 'الملاحظ الآخر';

        // التحقق من موانع اللجنة للتبديل
        if (sourceTeacher?.conflicts?.includes(target.committeeId)) {
            alert(`فشل التبديل: المدرس ${sourceTeacherName} لديه مانع في دخول اللجنة المستهدفة.`);
            setSwapSource(null);
            return;
        }

        if (targetTeacher?.conflicts?.includes(source.committeeId)) {
            alert(`فشل التبديل: المدرس ${targetTeacherName} لديه مانع في دخول هذه اللجنة.`);
            setSwapSource(null);
            return;
        }

        const conflictForSource = checkConflict(source.teacherId, target.scheduleId, target.committeeId, assignments);
        if (conflictForSource) {
            alert(`فشل التبديل: ${sourceTeacherName} لديه تعارض زمني (مشغول بـ ${conflictForSource.grade} في ${conflictForSource.subject}).`);
            setSwapSource(null);
            return;
        }

        if (target.teacherId) {
            const conflictForTarget = checkConflict(target.teacherId, source.scheduleId, source.committeeId, assignments);
            if (conflictForTarget) {
                alert(`فشل التبديل: ${targetTeacherName} لديه تعارض زمني (مشغول بـ ${conflictForTarget.grade} في ${conflictForTarget.subject}).`);
                setSwapSource(null);
                return;
            }
        }

        const updatedAssignments = [...assignments];
        const applyUpdate = (assign: ObservationAssignment, idx: number | 'reserve', tId: string) => {
            if (idx === 'reserve') return { ...assign, reserveObserverId: tId };
            const ids = [...assign.observerIds];
            ids[idx] = tId;
            return { ...assign, observerIds: ids };
        };

        const sIdx = updatedAssignments.findIndex(a => a.scheduleId === source.scheduleId && a.committeeId === source.committeeId);
        const tIdx = updatedAssignments.findIndex(a => a.scheduleId === target.scheduleId && a.committeeId === target.committeeId);

        if (sIdx > -1) updatedAssignments[sIdx] = applyUpdate(updatedAssignments[sIdx], source.index, target.teacherId);
        if (tIdx > -1) updatedAssignments[tIdx] = applyUpdate(updatedAssignments[tIdx], target.index, source.teacherId);

        setAssignments(updatedAssignments);
        db.saveObservationAssignments(updatedAssignments);
        setSwapSource(null);
        setIsSwapMode(false);
        alert("تم التبديل بنجاح.");
    }
  };

  const handleSaveConfig = () => {
      db.saveObserverConfig(obsConfig);
      alert("تم حفظ إعدادات التوزيع بنجاح.");
  };

  const handleAddTeacher = () => {
      if (externalMode) {
          if (!selectedExternalTeacherIds.length) {
              alert("يرجى اختيار مدرس واحد على الأقل من قائمة العاملين");
              return;
          }
          const existing = new Set(teachers.map(t => t.id));
          const selectedRecords = externalTeachers.filter(t => selectedExternalTeacherIds.includes(t.id));
          const newOnes: Teacher[] = selectedRecords
            .filter(t => !existing.has(t.id))
            .map(t => ({ id: t.id, name: t.name, subject: t.subject, conflicts: [] }));
          if (!newOnes.length) {
              alert("جميع المختارين مضافون بالفعل");
              return;
          }
          const updated = [...teachers, ...newOnes];
          setTeachers(updated);
          db.saveTeachers(updated);
          setSelectedExternalTeacherIds([]);
          return;
      }
      if (!newTeacherName) {
          alert("يرجى إدخل اسم المدرس");
          return;
      }
      const newTeacher: Teacher = { id: `t_${Date.now()}`, name: newTeacherName, subject: newTeacherSubject, conflicts: [] };
      const updated = [...teachers, newTeacher];
      setTeachers(updated);
      db.saveTeachers(updated);
      setNewTeacherName('');
      setNewTeacherSubject('');
  };

  const handleDeleteTeacher = (id: string) => {
      if (confirm("هل أنت متأكد من حذف هذا المدرس؟ سيتم إزالته من جميع اللجان.")) {
          const updated = teachers.filter(t => t.id !== id);
          setTeachers(updated);
          db.saveTeachers(updated);
      }
  };

  const handleImportTeachers = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (externalMode) {
        alert("لا يمكن استيراد مدرسين عند الربط بقائمة العاملين.");
        return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws);
        const importedTeachers: Teacher[] = data.map((row: any) => ({
            id: `t_imp_${Math.random().toString(36).substr(2, 9)}`,
            name: row['الاسم'] || row['Name'] || 'مدرس جديد',
            subject: row['التخصص'] || row['المادة'] || '',
            conflicts: []
        })).filter((t: Teacher) => t.name !== 'مدرس جديد');
        if (importedTeachers.length > 0) {
            const updated = [...teachers, ...importedTeachers];
            setTeachers(updated);
            db.saveTeachers(updated);
            alert(`تم استيراد ${importedTeachers.length} مدرس بنجاح.`);
        }
      } catch { alert("خطأ في قراءة الملف."); }
    };
    reader.readAsBinaryString(file);
  };

  const handleAssignmentChange = (scheduleId: string, committeeId: string, observerIndex: number | 'reserve', teacherId: string) => {
      if (isSwapMode) return;

      const teacher = teachers.find(t => t.id === teacherId);
      const committee = db.getCommittees().find(c => c.id === committeeId);
      const forbiddenGrade = committee && teacher?.forbiddenGrades?.includes(committee.gradeLevel);
      if (teacher?.conflicts?.includes(committeeId) || forbiddenGrade) {
          alert(`تحذير صارم: المدرس ${teacher?.name || ''} لديه مانع قانوني في دخول هذه اللجنة (صلة قرابة أو غيره). يرجى اختيار مدرس آخر.`);
          return;
      }

      setAssignments(prev => {
          const updated = [...prev];
          const existingIdx = updated.findIndex(a => a.scheduleId === scheduleId && a.committeeId === committeeId && a.term === selectedTerm);
          
          if (existingIdx > -1) {
              const currentAssign = { ...updated[existingIdx] };
              if (observerIndex === 'reserve') {
                  currentAssign.reserveObserverId = teacherId;
              } else {
                  const ids = [...currentAssign.observerIds];
                  ids[observerIndex] = teacherId;
                  currentAssign.observerIds = ids;
              }
              updated[existingIdx] = currentAssign;
          } else {
              const ids = new Array(obsConfig.observersPerCommittee).fill('');
              const newAssign: ObservationAssignment = { 
                  id: `obs_${Date.now()}`, 
                  scheduleId, 
                  committeeId, 
                  term: selectedTerm, 
                  observerIds: ids,
                  reserveObserverId: observerIndex === 'reserve' ? teacherId : ''
              };
              if (observerIndex !== 'reserve') {
                  newAssign.observerIds[observerIndex] = teacherId;
              }
              updated.push(newAssign);
          }
          db.saveObservationAssignments(updated);
          return updated;
      });
  };

  const toggleTeacherConflict = (teacherId: string, committeeId: string) => {
    const updatedTeachers = teachers.map(t => {
      if (t.id === teacherId) {
        const currentConflicts = t.conflicts || [];
        const isSelected = currentConflicts.includes(committeeId);
        const newConflicts = isSelected 
          ? currentConflicts.filter(id => id !== committeeId) 
          : [...currentConflicts, committeeId];
        return { ...t, conflicts: newConflicts };
      }
      return t;
    });
    setTeachers(updatedTeachers);
    db.saveTeachers(updatedTeachers);
  };

  const toggleForbiddenGrade = (teacherId: string, grade: GradeLevel) => {
    const updatedTeachers = teachers.map(t => {
      if (t.id === teacherId) {
        const current = t.forbiddenGrades || [];
        const exists = current.includes(grade);
        const next = exists ? current.filter((g) => g !== grade) : [...current, grade];
        return { ...t, forbiddenGrades: next };
      }
      return t;
    });
    setTeachers(updatedTeachers);
    db.saveTeachers(updatedTeachers);
  };

  const handleCorrectionChange = (subjectId: string, field: 'headTeacherId' | 'memberIds', value: any) => {
      setCorrectionCommittees(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(c => c.subjectId === subjectId && c.gradeLevel === selectedGrade && c.term === selectedTerm);
          if (idx > -1) {
              updated[idx] = { ...updated[idx], [field]: value };
          } else {
              updated.push({
                  id: `corr_${Date.now()}`,
                  subjectId, gradeLevel: selectedGrade, term: selectedTerm,
                  headTeacherId: field === 'headTeacherId' ? value : undefined,
                  memberIds: field === 'memberIds' ? value : new Array(obsConfig.membersPerCorrection).fill('')
              });
          }
          db.saveCorrectionCommittees(updated);
          return updated;
      });
  };

  const handleMemberChange = (subjectId: string, memberIdx: number, teacherId: string) => {
      const comm = correctionCommittees.find(c => c.subjectId === subjectId && c.gradeLevel === selectedGrade && c.term === selectedTerm);
      const currentIds = comm ? [...comm.memberIds] : new Array(obsConfig.membersPerCorrection).fill('');
      currentIds[memberIdx] = teacherId;
      handleCorrectionChange(subjectId, 'memberIds', currentIds);
  };

  // --- RENDER PRINTABLES ---

  const renderOfficialHeader = (title: string) => (
      <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
          <div className="w-1/3 text-center">
              <p className="font-bold">{schoolInfo.governorate}</p>
              <p className="font-bold">{schoolInfo.educationalAdministration}</p>
              <p className="font-bold">{schoolInfo.schoolName}</p>
          </div>
          <div className="w-1/3 text-center">
              <h2 className="text-2xl font-bold mb-2 underline">{title}</h2>
              <h3 className="text-xl font-bold">{GRADE_LABELS[selectedGrade]}</h3>
              <p className="text-sm">{schoolInfo.academicYear} - {selectedTerm === 'term1' ? 'الترم الأول' : 'الترم الثاني'}</p>
          </div>
          <div className="w-1/3 text-left">
              {schoolInfo.logo && <img src={schoolInfo.logo} alt="Logo" className="h-20 mx-auto object-contain" />}
          </div>
      </div>
  );

  const renderOfficialSignatures = () => (
      <div className="mt-12 flex justify-between text-center font-bold text-lg px-10">
          <div className="w-1/3">
              <p className="mb-12">رئيس الكنترول</p>
              <p>{schoolInfo.controlHead || '..................'}</p>
          </div>
          <div className="w-1/3">
              <p className="mb-12">مدير المدرسة</p>
              <p>{schoolInfo.managerName || '..................'}</p>
          </div>
      </div>
  );

  const renderObservationPrint = () => (
      <div id="observation-print-area" className="w-full text-right p-8 bg-white print:p-0">
          {renderOfficialHeader("كشف توزيع الملاحظة")}
          {schedule.map(exam => (
              <div key={exam.id} className="mb-10 break-inside-avoid">
                  <div className="bg-gray-100 p-2 border-2 border-black font-bold flex justify-between mb-1">
                      <span>المادة: {exam.subjectName}</span>
                      <span>اليوم: {exam.day} {exam.date} | الموعد: {exam.timeFrom} - {exam.timeTo}</span>
                  </div>
                  <table className="w-full border-collapse border-2 border-black text-sm">
                      <thead>
                          <tr className="bg-gray-200">
                              <th className="border border-black p-2 w-1/4">اللجنة والمقر</th>
                              {Array.from({ length: obsConfig.observersPerCommittee }).map((_, i) => (
                                  <th key={i} className="border border-black p-2">ملاحظ {i + 1}</th>
                              ))}
                              <th className="border border-black p-2 bg-yellow-100">ملاحظ احتياطي</th>
                          </tr>
                      </thead>
                      <tbody>
                          {committees.map(comm => {
                              const assignment = assignments.find(a => a.scheduleId === exam.id && a.committeeId === comm.id && a.term === selectedTerm);
                              return (
                                  <tr key={comm.id}>
                                      <td className="border border-black p-2 font-bold">{comm.name} <span className="text-[10px] block font-normal">({comm.location})</span></td>
                                      {Array.from({ length: obsConfig.observersPerCommittee }).map((_, i) => (
                                          <td key={i} className="border border-black p-2">
                                              {teachers.find(t => t.id === assignment?.observerIds?.[i])?.name || '............'}
                                          </td>
                                      ))}
                                      <td className="border border-black p-2 bg-yellow-50/30 font-bold">
                                          {teachers.find(t => t.id === assignment?.reserveObserverId)?.name || '............'}
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          ))}
          {renderOfficialSignatures()}
      </div>
  );

  const renderCorrectionPrint = () => (
      <div id="correction-print-area" className="w-full text-right p-8 bg-white print:p-0">
          {renderOfficialHeader("كشف لجان تقدير الدرجات")}
          <table className="w-full border-collapse border-2 border-black text-sm mt-4">
              <thead>
                  <tr className="bg-gray-200">
                      <th className="border border-black p-2 w-12 text-center">م</th>
                      <th className="border border-black p-2 text-right">المادة</th>
                      <th className="border border-black p-2 text-right">رئيس اللجنة (المشرف)</th>
                      <th className="border border-black p-2 text-right">أعضاء اللجنة (المصححين)</th>
                  </tr>
              </thead>
              <tbody>
                  {subjects.filter(s => s.isBasic).map((subject, idx) => {
                      const comm = correctionCommittees.find(c => c.subjectId === subject.id && c.gradeLevel === selectedGrade && c.term === selectedTerm);
                      return (
                          <tr key={subject.id} className="break-inside-avoid">
                              <td className="border border-black p-2 text-center font-bold">{idx + 1}</td>
                              <td className="border border-black p-2 font-bold">{subject.name}</td>
                              <td className="border border-black p-2">{teachers.find(t => t.id === comm?.headTeacherId)?.name || '............'}</td>
                              <td className="border border-black p-2">
                                  <div className="grid grid-cols-2 gap-x-4">
                                      {Array.from({ length: obsConfig.membersPerCorrection }).map((_, i) => (
                                          <div key={i} className="py-0.5">{i+1}- {teachers.find(t => t.id === comm?.memberIds[i])?.name || '............'}</div>
                                      ))}
                                  </div>
                              </td>
                          </tr>
                      );
                  })}
              </tbody>
          </table>
          {renderOfficialSignatures()}
      </div>
  );

  const renderTeachersPrint = () => (
      <div id="teachers-print-area" className="w-full text-right p-8 bg-white print:p-0">
          <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
              <div className="w-1/3 text-center">
                  <p className="font-bold">{schoolInfo.governorate}</p>
                  <p className="font-bold">{schoolInfo.educationalAdministration}</p>
                  <p className="font-bold">{schoolInfo.schoolName}</p>
              </div>
              <div className="w-1/3 text-center">
                  <h2 className="text-2xl font-bold mb-2 underline">كشف أعضاء هيئة التدريس والموانع</h2>
                  <p className="text-sm">العام الدراسي: {schoolInfo.academicYear}</p>
              </div>
              <div className="w-1/3 text-left">
                  {schoolInfo.logo && <img src={schoolInfo.logo} alt="Logo" className="h-20 mx-auto object-contain" />}
              </div>
          </div>
          <table className="w-full border-collapse border-2 border-black text-sm">
              <thead>
                  <tr className="bg-gray-100">
                      <th className="border border-black p-2 w-12 text-center">م</th>
                      <th className="border border-black p-2 text-right">الاسم</th>
                      <th className="border border-black p-2 text-right">التخصص / المادة</th>
                      <th className="border border-black p-2 text-right">موانع اللجان المسجلة</th>
                      <th className="border border-black p-2 text-right w-40">التوقيع بالعلم</th>
                  </tr>
              </thead>
              <tbody>
                  {teachers.map((t, idx) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                          <td className="border border-black p-2 text-center font-bold">{idx + 1}</td>
                          <td className="border border-black p-2 font-bold">{t.name}</td>
                          <td className="border border-black p-2 text-gray-600">{t.subject || '-'}</td>
                          <td className="border border-black p-2 text-[10px] text-red-600 max-w-xs">
                              {t.conflicts && t.conflicts.length > 0 ? (
                                  t.conflicts.map(cId => {
                                      const c = db.getCommittees().find(comm => comm.id === cId);
                                      return c ? `${c.name} (${GRADE_LABELS[c.gradeLevel]})` : '';
                                  }).filter(Boolean).join(' - ')
                              ) : 'لا يوجد'}
                          </td>
                          <td className="border border-black p-2 h-10"></td>
                      </tr>
                  ))}
              </tbody>
          </table>
          <div className="mt-12 flex justify-end text-center font-bold text-lg px-10">
              <div className="w-1/3">
                  <p className="mb-12">مدير المدرسة</p>
                  <p>{schoolInfo.managerName || '..................'}</p>
              </div>
          </div>
      </div>
  );

  const renderConflictModal = () => {
    if (!editingConflictsTeacherId) return null;
    const teacher = teachers.find(t => t.id === editingConflictsTeacherId);
    if (!teacher) return null;

    const allCommittees = db.getCommittees();
    const groupedCommittees = (Object.keys(GRADE_LABELS) as GradeLevel[])
      .map(g => ({
        grade: g,
        label: GRADE_LABELS[g],
        comms: allCommittees.filter(c => c.gradeLevel === g)
      }))
      .filter(group => group.comms.length > 0)
      .filter(group => conflictGradeFilter === 'all' || group.grade === conflictGradeFilter);

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black">تحديد موانع اللجان (صلة القرابة)</h3>
              <p className="text-sm text-slate-400 mt-1">المدرس: <span className="text-emerald-400">{teacher.name}</span></p>
            </div>
            <button onClick={() => setEditingConflictsTeacherId(null)} className="p-2 hover:bg-slate-800 rounded-full"><X size={24}/></button>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            <div className="bg-amber-50 border-r-4 border-amber-500 p-4 rounded-l-xl flex items-start gap-3 text-amber-800 mb-6">
              <AlertTriangle size={24} className="shrink-0 text-amber-600" />
              <p className="text-xs font-bold leading-relaxed">
                اللجان التي يتم اختيارها أدناه لن يتم توزيع المدرس عليها "نهائياً" في أي امتحان لهذا الترم، سواء تم التوزيع تلقائياً أو يدوياً.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">تصفية حسب الصف</label>
                <select
                  value={conflictGradeFilter}
                  onChange={(e) => setConflictGradeFilter(e.target.value as GradeLevel | 'all')}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50"
                >
                  <option value="all">كل الصفوف</option>
                  {(Object.keys(GRADE_LABELS) as GradeLevel[]).map((g) => (
                    <option key={g} value={g}>{GRADE_LABELS[g]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-500">موانع عامة على مستوى الصفوف</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(GRADE_LABELS) as GradeLevel[]).map((g) => {
                    const active = teacher.forbiddenGrades?.includes(g);
                    return (
                      <button
                        key={g}
                        onClick={() => toggleForbiddenGrade(teacher.id, g)}
                        className={`px-3 py-1 rounded-lg border text-xs font-black ${active ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-white'}`}
                      >
                        {GRADE_LABELS[g]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-bold text-slate-500">ملاحظات/أسماء طلاب يمنع مراقبتهم (اختياري)</label>
                <textarea
                  value={(teacher as any).forbiddenStudentsNote || ''}
                  onChange={(e) => {
                    const updated = teachers.map(t => t.id === teacher.id ? { ...t, forbiddenStudentsNote: e.target.value } : t);
                    setTeachers(updated);
                    db.saveTeachers(updated);
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-slate-50 min-h-[80px]"
                  placeholder="اكتب أسماء الطلاب أو أرقامهم لفريق الكنترول"
                />
              </div>
            </div>

            <div className="space-y-8">
              {groupedCommittees.map(group => (
                <div key={group.grade} className="space-y-3">
                  <h4 className="font-black text-slate-700 border-b pb-2 flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-600 rounded-full"></span> {group.label}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {group.comms.map(comm => {
                      const isForbidden = teacher.conflicts?.includes(comm.id) || teacher.forbiddenGrades?.includes(comm.gradeLevel);
                      return (
                        <div 
                          key={comm.id} 
                          onClick={() => toggleTeacherConflict(teacher.id, comm.id)}
                          className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-2 ${isForbidden ? 'bg-red-50 border-red-200 text-red-700 shadow-inner' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-white hover:border-blue-200 hover:shadow-md'}`}
                        >
                          <div className="flex-1">
                            <p className="font-bold text-sm">{comm.name}</p>
                            <p className="text-[10px] opacity-60">{comm.location}</p>
                          </div>
                          {isForbidden ? <ShieldOff size={18} className="text-red-500" /> : <ShieldAlert size={18} className="text-gray-300" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {groupedCommittees.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  <AlertTriangle size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="font-bold">يرجى إضافة لجان طلابية أولاً من قسم الكنترول</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 border-t flex justify-end">
            <button 
              onClick={() => setEditingConflictsTeacherId(null)}
              className="bg-slate-900 text-white px-10 py-2.5 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              <CheckCircle2 size={20}/> إغلاق وحفظ
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <UserCheck className="text-blue-600" /> الملاحظين واللجان
            </h2>
            <div className="flex flex-wrap items-center gap-2">
                <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
                    <button onClick={() => setActiveTab('teachers')} className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'teachers' ? 'bg-white shadow text-blue-700' : 'text-gray-600'}`}>المدرسين</button>
                    <button onClick={() => setActiveTab('config')} className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'config' ? 'bg-white shadow text-orange-700' : 'text-gray-600'}`}>الأعداد</button>
                    <button onClick={() => setActiveTab('observation')} className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'observation' ? 'bg-white shadow text-purple-700' : 'text-gray-600'}`}>الملاحظة</button>
                    <button onClick={() => setActiveTab('correction')} className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'correction' ? 'bg-white shadow text-emerald-700' : 'text-gray-600'}`}>التصحيح</button>
                </div>
            </div>
        </div>

        {activeTab === 'config' && (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-2xl mx-auto animate-in zoom-in-95">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-3"><Settings2 size={32}/></div>
                    <h3 className="text-xl font-bold text-gray-800">إعدادات أعداد التوزيع</h3>
                    <p className="text-gray-500 text-sm">حدد الأعداد المطلوبة لتوليد الحقول تلقائياً</p>
                </div>
                <div className="space-y-8">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <label className="block text-sm font-bold text-gray-700 mb-4">عدد الملاحظين في كل لجنة طلابية:</label>
                        <div className="flex items-center gap-6">
                            <input type="range" min="1" max="5" step="1" value={obsConfig.observersPerCommittee} onChange={(e) => setObsConfig({...obsConfig, observersPerCommittee: parseInt(e.target.value)})} className="flex-1 accent-blue-600 h-2 bg-gray-200 rounded-lg cursor-pointer" />
                            <span className="w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-lg font-black text-xl shadow-lg">{obsConfig.observersPerCommittee}</span>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <label className="block text-sm font-bold text-gray-700 mb-4">عدد أعضاء لجنة التصحيح (بجانب المشرف):</label>
                        <div className="flex items-center gap-6">
                            <input type="range" min="1" max="10" step="1" value={obsConfig.membersPerCorrection} onChange={(e) => setObsConfig({...obsConfig, membersPerCorrection: parseInt(e.target.value)})} className="flex-1 accent-emerald-600 h-2 bg-gray-200 rounded-lg cursor-pointer" />
                            <span className="w-12 h-12 flex items-center justify-center bg-emerald-600 text-white rounded-lg font-black text-xl shadow-lg">{obsConfig.membersPerCorrection}</span>
                        </div>
                    </div>
                    <button onClick={handleSaveConfig} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-2"><Save size={20}/> حفظ الإعدادات</button>
                </div>
            </div>
        )}

        {activeTab === 'teachers' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg border h-fit no-print">
                        <h3 className="font-bold text-lg mb-4">{externalMode ? 'اختيار مدرس' : 'إضافة مدرس'}</h3>
                        <div className="space-y-3">
                            {externalMode ? (
                              <>
                                <select
                                  multiple
                                  value={selectedExternalTeacherIds}
                                  onChange={(e) => {
                                    const options = Array.from(e.target.selectedOptions).map(o => o.value);
                                    setSelectedExternalTeacherIds(options);
                                  }}
                                  className="w-full border rounded p-2 bg-white h-40"
                                >
                                  {externalTeachers.map((teacher) => (
                                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                                  ))}
                                </select>
                                <button onClick={handleAddTeacher} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 flex items-center justify-center gap-2"><Plus size={18}/> إضافة المختارين</button>
                              </>
                            ) : (
                              <>
                                <input type="text" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} className="w-full border rounded p-2" placeholder="اسم المدرس" />
                                <input type="text" value={newTeacherSubject} onChange={(e) => setNewTeacherSubject(e.target.value)} className="w-full border rounded p-2" placeholder="التخصص" />
                                <button onClick={handleAddTeacher} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 flex items-center justify-center gap-2"><Plus size={18}/> إضافة</button>
                              </>
                            )}
                        </div>
                        {!externalMode && (
                          <div className="mt-8 bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
                              💡 نصيحة: يمكنك استيراد قائمة المدرسين من ملف Excel لتوفير الوقت. تأكد من تحديد "الموانع" لاحقاً لضمان دقة التوزيع التلقائي.
                            </p>
                          </div>
                        )}
                    </div>
                    <div className="md:col-span-2">
                        <div className="flex justify-between items-center mb-4 no-print">
                            <h3 className="font-bold">قائمة المدرسين ({teachers.length})</h3>
                            <div className="flex gap-2">
                                <button onClick={() => setPreviewModalOpen(true)} className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded flex items-center gap-2 text-sm"><Eye size={16}/> معاينة</button>
                                <button onClick={handlePrintRequest} className="bg-gray-800 text-white px-3 py-1.5 rounded flex items-center gap-2 text-sm"><Printer size={16}/> طباعة</button>
                                {!externalMode && (
                                  <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded flex items-center gap-2 text-sm"><Upload size={16}/> استيراد Excel<input type="file" ref={fileInputRef} onChange={handleImportTeachers} className="hidden" accept=".xlsx, .xls" /></button>
                                )}
                            </div>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-right">
                            <thead className="bg-gray-50 border-b">
                              <tr>
                                <th className="p-3 w-10">م</th>
                                <th className="p-3">الاسم</th>
                                <th className="p-3">التخصص</th>
                                <th className="p-3 text-center">الموانع</th>
                                <th className="p-3 w-20 no-print">حذف</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {teachers.map((t, idx) => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                  <td className="p-3 text-center text-gray-500">{idx + 1}</td>
                                  <td className="p-3 font-bold">{t.name}</td>
                                  <td className="p-3 text-gray-600">{t.subject || '-'}</td>
                                  <td className="p-3 text-center">
                                    <button 
                                      onClick={() => setEditingConflictsTeacherId(t.id)}
                                      className={`px-3 py-1 rounded-lg text-[10px] font-black border transition-all flex items-center gap-1 mx-auto ${t.conflicts && t.conflicts.length > 0 ? 'bg-red-50 text-red-600 border-red-200 shadow-inner' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-white hover:text-blue-600'}`}
                                    >
                                      <ShieldAlert size={14} /> {t.conflicts && t.conflicts.length > 0 ? `(${t.conflicts.length}) موانع` : 'تحديد موانع'}
                                    </button>
                                  </td>
                                  <td className="p-3 text-center no-print"><button onClick={() => handleDeleteTeacher(t.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'observation' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b pb-4 no-print">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2"><span className="font-bold">الصف:</span><select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value as GradeLevel)} className="border rounded p-2 bg-gray-50 text-blue-700 font-bold">{(Object.keys(GRADE_LABELS) as GradeLevel[]).map(g => (<option key={g} value={g}>{GRADE_LABELS[g]}</option>))}</select></div>
                        <div className="flex items-center gap-2"><span className="font-bold">الترم:</span><select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value as any)} className="border rounded p-2 bg-gray-50"><option value="term1">الترم الأول</option><option value="term2">الترم الثاني</option></select></div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            disabled={isProcessing}
                            onClick={() => { setIsSwapMode(!isSwapMode); setSwapSource(null); }} 
                            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition shadow-md border ${isSwapMode ? 'bg-orange-600 text-white border-orange-700 animate-pulse' : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'}`}
                        >
                            <ArrowLeftRight size={18}/> {isSwapMode ? 'إلغاء التبديل' : 'تبديل الملاحظين'}
                        </button>
                        <button 
                            disabled={isProcessing}
                            onClick={handleAutoDistribute} 
                            className={`bg-purple-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-700 shadow-md transition ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <Wand2 size={18}/>}
                            {isProcessing ? 'جاري المعالجة...' : 'توزيع تلقائي ذكي (شامل)'}
                        </button>
                        <button onClick={() => setPreviewModalOpen(true)} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 border border-blue-200 hover:bg-blue-100 transition"><Eye size={18}/> معاينة</button>
                        <button 
                            onClick={() => handleExportPDF('observation-print-area', `كشف_توزيع_الملاحظة_${GRADE_LABELS[selectedGrade]}`)} 
                            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 border border-red-200 hover:bg-red-100 transition disabled:opacity-50"
                            disabled={isExporting}
                        >
                            {isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>} PDF
                        </button>
                        <button onClick={handlePrintRequest} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-900 transition shadow-md"><Printer size={18}/> طباعة</button>
                    </div>
                </div>

                {schedule.length === 0 || committees.length === 0 ? (
                    <div className="p-10 text-center bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200"><AlertTriangle className="mx-auto mb-2"/><p className="font-bold">تنبيه: يجب إدخال جدول الامتحانات ولجان الطلاب للصف المختار أولاً.</p></div>
                ) : (
                    <div className="space-y-10">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 flex items-start gap-2 text-blue-800 text-sm mb-4 no-print">
                            <Clock size={18} className="shrink-0 mt-0.5" />
                            <p>يتم التحقق من تداخل المواعيد عبر <strong>كافة الصفوف الدراسية</strong>. يمكنك التبديل بين مدرسين في لجان مختلفة عن طريق تفعيل "تبديل الملاحظين".</p>
                        </div>
                        {schedule.map(exam => (
                            <div key={exam.id} className="border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-slate-800 p-3 text-white flex justify-between items-center font-bold">
                                    <span className="text-lg">{exam.subjectName}</span>
                                    <span className="text-sm bg-slate-700 px-3 py-1 rounded">📅 {exam.day} {exam.date} | ⏰ {exam.timeFrom} - {exam.timeTo}</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right border-collapse">
                                        <thead className="bg-gray-100 border-b">
                                            <tr>
                                                <th className="p-3 border-l border-slate-200 w-48">اللجنة / المقر</th>
                                                {Array.from({ length: obsConfig.observersPerCommittee }).map((_, i) => (
                                                    <th key={i} className="p-3 text-center border-l border-slate-200">ملاحظ {i+1}</th>
                                                ))}
                                                <th className="p-3 text-center border-l border-slate-200 bg-yellow-50/50">ملاحظ احتياطي</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {committees.map(comm => {
                                                const assignment = assignments.find(a => a.scheduleId === exam.id && a.committeeId === comm.id && a.term === selectedTerm);
                                                return (
                                                    <tr key={comm.id} className="border-b hover:bg-blue-50/30 transition-colors">
                                                        <td className="p-3 font-bold border-l border-slate-200 bg-gray-50">{comm.name} <span className="text-[10px] block text-slate-400 font-normal">{comm.location}</span></td>
                                                        {Array.from({ length: obsConfig.observersPerCommittee }).map((_, i) => {
                                                            const currentTeacherId = assignment?.observerIds[i] || '';
                                                            const isThisSource = swapSource?.scheduleId === exam.id && swapSource?.committeeId === comm.id && swapSource?.index === i && swapSource?.gradeLevel === selectedGrade;

                                                            return (
                                                                <td key={i} className={`p-1 border-l border-slate-200 ${isThisSource ? 'bg-orange-100 ring-2 ring-orange-500 ring-inset' : ''}`}>
                                                                    {isSwapMode ? (
                                                                        <div 
                                                                            onClick={() => handleSwapClick(exam.id, comm.id, i, currentTeacherId)}
                                                                            className={`w-full p-2 text-center font-bold h-10 flex items-center justify-center cursor-pointer transition rounded ${currentTeacherId ? 'bg-orange-50 hover:bg-orange-200 text-orange-900 border border-orange-200' : 'bg-gray-50 text-gray-300'}`}
                                                                        >
                                                                            {teachers.find(t => t.id === currentTeacherId)?.name || 'فارغ'}
                                                                        </div>
                                                                    ) : (
                                                                        <select 
                                                                            value={currentTeacherId} 
                                                                            onChange={(e) => handleAssignmentChange(exam.id, comm.id, i, e.target.value)} 
                                                                            className="w-full p-2 bg-transparent outline-none cursor-pointer font-bold text-center appearance-none"
                                                                        >
                                                                            <option value="">-- اختر --</option>
                                                                            {teachers.map(t => {
                                                                                const conflict = checkConflict(t.id, exam.id, comm.id, assignments);
                                                                                const isCurrent = t.id === currentTeacherId;
                                                                                const alreadyInRoom = !isCurrent && (assignment?.observerIds.includes(t.id) || assignment?.reserveObserverId === t.id);
                                                                                // التحقق من موانع اللجنة أو الصف
                                                                                const hasForbiddenCommittee = t.conflicts?.includes(comm.id);
                                                                                const forbiddenGrade = t.forbiddenGrades?.includes(comm.gradeLevel);

                                                                                return (
                                                                                    <option 
                                                                                        key={t.id} 
                                                                                        value={t.id} 
                                                                                        disabled={!!conflict || alreadyInRoom || !!hasForbiddenCommittee || !!forbiddenGrade} 
                                                                                        className={conflict || alreadyInRoom || hasForbiddenCommittee || forbiddenGrade ? 'text-red-400 bg-red-50' : ''}
                                                                                    >
                                                                                        {t.name} 
                                                                                        {hasForbiddenCommittee || forbiddenGrade ? ' (مانع صلة قرابة/صف)' : (conflict ? ` (مشغول بـ ${conflict.grade} - ${conflict.range})` : (alreadyInRoom ? ' (مختار بالفعل في هذه اللجنة)' : ''))}
                                                                                    </option>
                                                                                );
                                                                            })}
                                                                        </select>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className={`p-1 border-l border-slate-200 bg-yellow-50/20 ${swapSource?.scheduleId === exam.id && swapSource?.committeeId === comm.id && swapSource?.index === 'reserve' && swapSource?.gradeLevel === selectedGrade ? 'bg-orange-100 ring-2 ring-orange-500 ring-inset' : ''}`}>
                                                            {isSwapMode ? (
                                                                <div 
                                                                    onClick={() => handleSwapClick(exam.id, comm.id, 'reserve', assignment?.reserveObserverId || '')}
                                                                    className={`w-full p-2 text-center font-bold h-10 flex items-center justify-center cursor-pointer transition rounded ${assignment?.reserveObserverId ? 'bg-orange-50 hover:bg-orange-200 text-orange-900 border border-orange-200' : 'bg-gray-50 text-gray-300'}`}
                                                                >
                                                                    {teachers.find(t => t.id === assignment?.reserveObserverId)?.name || 'فارغ'}
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center">
                                                                    <ShieldAlert size={14} className="text-yellow-600 ml-1 shrink-0" />
                                                                    <select 
                                                                        value={assignment?.reserveObserverId || ''} 
                                                                        onChange={(e) => handleAssignmentChange(exam.id, comm.id, 'reserve', e.target.value)} 
                                                                        className="w-full p-2 bg-transparent outline-none cursor-pointer font-bold text-center appearance-none text-yellow-800"
                                                                    >
                                                                        <option value="">-- احتياطي --</option>
                                                                        {teachers.map(t => {
                                                                            const conflict = checkConflict(t.id, exam.id, comm.id, assignments);
                                                                            const isCurrent = t.id === assignment?.reserveObserverId;
                                                                            const alreadyInRoom = !isCurrent && (assignment?.observerIds.includes(t.id) || assignment?.reserveObserverId === t.id);
                                                                            const hasForbiddenCommittee = t.conflicts?.includes(comm.id);
                                                                            const forbiddenGrade = t.forbiddenGrades?.includes(comm.gradeLevel);

                                                                            return (
                                                                                <option 
                                                                                    key={t.id} 
                                                                                    value={t.id} 
                                                                                    disabled={!!conflict || alreadyInRoom || !!hasForbiddenCommittee || !!forbiddenGrade} 
                                                                                    className={conflict || alreadyInRoom || hasForbiddenCommittee || forbiddenGrade ? 'text-red-400 bg-red-50' : ''}
                                                                                    >
                                                                                        {t.name} 
                                                                                        {hasForbiddenCommittee || forbiddenGrade ? ' (مانع صلة قرابة/صف)' : (conflict ? ` (مشغول بـ ${conflict.grade} - ${conflict.range})` : (alreadyInRoom ? ' (مختار بالفعل في هذه اللجنة)' : ''))}
                                                                                    </option>
                                                                                );
                                                                            })}
                                                                    </select>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'correction' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                 <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b pb-4 no-print">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2"><span className="font-bold">الصف:</span><select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value as GradeLevel)} className="border rounded p-2 bg-gray-50 text-blue-700 font-bold">{(Object.keys(GRADE_LABELS) as GradeLevel[]).map(g => (<option key={g} value={g}>{GRADE_LABELS[g]}</option>))}</select></div>
                        <div className="flex items-center gap-2"><span className="font-bold">الترم:</span><select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value as any)} className="border rounded p-2 bg-gray-50"><option value="term1">الترم الأول</option><option value="term2">الترم الثاني</option></select></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setPreviewModalOpen(true)} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 border border-blue-200 hover:bg-blue-100 transition"><Eye size={18}/> معاينة</button>
                        <button 
                            onClick={() => handleExportPDF('correction-print-area', `لجان_تقدير_الدرجات_${GRADE_LABELS[selectedGrade]}`)} 
                            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 border border-red-200 hover:bg-red-100 transition disabled:opacity-50"
                            disabled={isExporting}
                        >
                            {isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>} PDF
                        </button>
                        <button onClick={handlePrintRequest} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-900 transition shadow-md"><Printer size={18}/> طباعة</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {subjects.filter(s => s.isBasic).map(subject => {
                        const comm = correctionCommittees.find(c => c.subjectId === subject.id && c.gradeLevel === selectedGrade && c.term === selectedTerm);
                        return (
                            <div key={subject.id} className="border-2 border-emerald-100 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                                <h4 className="font-black text-lg text-emerald-800 border-b-2 border-emerald-50 pb-2 mb-4 flex items-center gap-2"><BookOpen size={20}/> لجنة تقدير مادة: {subject.name}</h4>
                                <div className="space-y-4">
                                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                        <label className="block text-xs font-bold text-emerald-700 mb-1">رئيس اللجنة (المشرف):</label>
                                        <select value={comm?.headTeacherId || ''} onChange={(e) => handleCorrectionChange(subject.id, 'headTeacherId', e.target.value)} className="w-full border-0 bg-transparent font-bold text-emerald-900 outline-none cursor-pointer">
                                            <option value="">-- اختر مشرف اللجنة --</option>
                                            {teachers.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <label className="block text-xs font-bold text-slate-500 px-1">أعضاء اللجنة (مصححين):</label>
                                        {Array.from({ length: obsConfig.membersPerCorrection }).map((_, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                <span className="w-6 h-6 flex items-center justify-center bg-slate-200 rounded-full text-[10px] font-bold text-slate-500">{i+1}</span>
                                                <select value={comm?.memberIds[i] || ''} onChange={(e) => handleMemberChange(subject.id, i, e.target.value)} className="flex-1 bg-transparent text-sm font-medium outline-none cursor-pointer">
                                                    <option value="">-- اختيار عضو --</option>
                                                    {teachers.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {isSwapMode && swapSource && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 no-print">
                <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-6 min-w-[400px]">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                        <ArrowLeftRight size={24} />
                    </div>
                    <div className="flex-1">
                        <p className="text-orange-400 font-bold text-xs uppercase tracking-wider mb-1">المدرس المختار للتبديل</p>
                        <p className="font-black text-lg">{teachers.find(t => t.id === swapSource.teacherId)?.name}</p>
                        <p className="text-slate-400 text-[10px]">{GRADE_LABELS[swapSource.gradeLevel]} | {globalSchedulesMap[swapSource.scheduleId]?.subject}</p>
                    </div>
                    <div className="h-10 w-px bg-slate-700 mx-2"></div>
                    <button 
                        onClick={() => setSwapSource(null)}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        )}

        {renderConflictModal()}

        {previewModalOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200 no-print">
                <div className="w-full h-full flex flex-col">
                    <div className="flex justify-between items-center text-white mb-4 px-4">
                        <h3 className="text-lg font-bold">معاينة المستند المطبوع</h3>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => {
                                    const areaId = activeTab === 'teachers' ? 'teachers-print-area' : (activeTab === 'observation' ? 'observation-print-area' : 'correction-print-area');
                                    const name = activeTab === 'teachers' ? 'كشف_المعلمين' : (activeTab === 'observation' ? 'كشف_الملاحظة' : 'كشف_التصحيح');
                                    handleExportPDF(areaId, name);
                                }} 
                                className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition shadow-lg hover:bg-red-700 disabled:opacity-50"
                                disabled={isExporting}
                            >
                                {isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>} تصدير PDF
                            </button>
                            <button onClick={handlePrintRequest} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition shadow-lg hover:bg-blue-700"><Printer size={18} /> طباعة</button>
                            <button onClick={() => setPreviewModalOpen(false)} className="bg-gray-700 text-white px-4 py-2 rounded-xl font-bold hover:bg-gray-600">إغلاق</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto flex justify-center p-4 custom-scrollbar">
                        <div className="bg-white shadow-2xl w-full max-w-4xl min-h-[1000px] animate-in zoom-in-95 duration-200">
                            {activeTab === 'teachers' && renderTeachersPrint()}
                            {activeTab === 'observation' && renderObservationPrint()}
                            {activeTab === 'correction' && renderCorrectionPrint()}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Print Confirmation Modal */}
        {printConfirmOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200 no-print">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center transform scale-100 transition-all">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Printer size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">تأكيد الطباعة</h3>
                    <p className="text-gray-600 mb-6 text-sm">
                        هل أنت متأكد من طباعة هذا الكشف؟ <br/>
                        يرجى التأكد من إعدادات الورق (A4) وإخفاء الهوامش للحصول على أفضل تنسيق.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button 
                            onClick={() => setPrintConfirmOpen(false)} 
                            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                        >
                            إلغاء
                        </button>
                        <button 
                            onClick={executePrint} 
                            className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                        >
                            تأكيد وطباعة
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Hidden Print Sections for standard window.print() */}
        <div className="hidden print:block">
            {activeTab === 'teachers' && renderTeachersPrint()}
            {activeTab === 'observation' && renderObservationPrint()}
            {activeTab === 'correction' && renderCorrectionPrint()}
        </div>
    </div>
  );
};

export default Observers;
