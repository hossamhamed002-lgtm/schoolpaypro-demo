
import React, { useState, useEffect } from 'react';
/* Added X to the import list from lucide-react */
import { Settings, Printer, Lock, Hash, Plus, Trash2, Users, AlertTriangle, Grid, FileText, ArrowDownAZ, Eye, Tags, CreditCard, CalendarClock, MoveHorizontal, MoveVertical, Columns, FileDown, Loader2, FileSpreadsheet, Copy, X } from 'lucide-react';
import { printExamReport } from '../print/examPrintAdapter';
import * as XLSX from 'xlsx';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { SecretGenRange, Student, GradeLevel, GRADE_LABELS, ExamCommittee, SchoolInfo, ExamScheduleItem, Subject } from '../examControl.types';
import { db } from '../services/db';
import CommitteeDirectory from './CommitteeDirectory';

interface ControlProps {
  students: Student[];
  onUpdate: (students: Student[]) => void;
}

const Control: React.FC<ControlProps> = ({ students, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'seating' | 'secret' | 'committees' | 'directory' | 'labels' | 'cards'>('seating');
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('p1');
  const [schoolInfo] = useState<SchoolInfo>(db.getSchoolInfo());

  // Seating Number State
  const [startSeatingNumber, setStartSeatingNumber] = useState<number | ''>('');
  const [generationSortType, setGenerationSortType] = useState<'alphabetical' | 'boys_first' | 'girls_first'>('alphabetical');

  // Secret Number Ranges State
  const [secretRanges, setSecretRanges] = useState<SecretGenRange[]>([]);
  const [isRandomSecret, setIsRandomSecret] = useState(true);
  const [secretTerm, setSecretTerm] = useState<'term1' | 'term2'>('term1');

  // Committees State
  const [committees, setCommittees] = useState<ExamCommittee[]>([]);
  const [newComm, setNewComm] = useState({ name: '', location: '', capacity: 20, shift: 'morning' as 'morning' | 'evening' });
  const [selectedCommitteeId, setSelectedCommitteeId] = useState<string>('');
  const [callingListTerm, setCallingListTerm] = useState<'term1' | 'term2'>('term1');
  const [callingListDisplayMode, setCallingListDisplayMode] = useState<'single' | 'double'>('single');
  const [directoryTerm, setDirectoryTerm] = useState<'term1' | 'term2'>('term1');
  const [distributionMode, setDistributionMode] = useState<'mixed' | 'separated'>('mixed');
  const [distributionPlan, setDistributionPlan] = useState<{
    map: Map<string, string>;
    report: Array<{ name: string; capacity: number; assigned: number }>;
    remaining: number;
  } | null>(null);

  // Labels & Cards State
  const [labelsPerPage, setLabelsPerPage] = useState<number>(8);
  const [cardsPerPage, setCardsPerPage] = useState<number>(4);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleTerm, setScheduleTerm] = useState<'term1' | 'term2'>('term1');
  const [currentSchedule, setCurrentSchedule] = useState<ExamScheduleItem[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);

  // Card/Label Inner Margins State (mm)
  const [cardPaddingX, setCardPaddingX] = useState<number>(5);
  const cardPaddingY = 5; 
  const [cardGap, setCardGap] = useState<number>(5);

  // Print Page Offsets (mm)
  const [printOffsetX, setPrintOffsetX] = useState<number>(0);
  const [printOffsetY, setPrintOffsetY] = useState<number>(0);
  const [autoCenter, setAutoCenter] = useState<boolean>(true);

  // Export State
  const [isExporting, setIsExporting] = useState(false);

  // Modal States
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message?: string;
    details: { label: string; value: string | number }[];
    customContent?: React.ReactNode; 
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    details: [],
    onConfirm: () => {},
  });

  useEffect(() => {
    setSecretRanges(db.getSecretRanges());
    setCommittees(db.getCommittees());
  }, []);

  const studentsInGrade = students.filter(s => s.gradeLevel === selectedGrade);

  // Calculate Seating Statistics
  const assignedSeating = studentsInGrade
    .map(s => s.seatingNumber)
    .filter((n): n is number => n !== null && n > 0);
  
  const minSeating = assignedSeating.length > 0 ? Math.min(...assignedSeating) : 0;
  const maxSeating = assignedSeating.length > 0 ? Math.max(...assignedSeating) : 0;
  const studentsWithSeatingCount = assignedSeating.length;

  const termSpecificRanges = secretRanges.filter(r => r.term === secretTerm);

  const coveredSeatingCount = studentsInGrade.filter(s => {
      if (!s.seatingNumber) return false;
      return termSpecificRanges.some(r => s.seatingNumber! >= r.fromSeating && s.seatingNumber! <= r.toSeating);
  }).length;

  const notCoveredCount = studentsWithSeatingCount - coveredSeatingCount;

  const saveRanges = (newRanges: SecretGenRange[]) => {
    setSecretRanges(newRanges);
    db.saveSecretRanges(newRanges);
  };

  const addRange = () => {
    let nextStart = minSeating;
    const maxCovered = termSpecificRanges.reduce((max, r) => Math.max(max, r.toSeating), 0);
    if (maxCovered > 0) {
        nextStart = maxCovered + 1;
    }
    if (nextStart > maxSeating && maxSeating > 0) nextStart = maxSeating;
    let suggestEnd = nextStart + 49;
    if (maxSeating > 0 && suggestEnd > maxSeating) suggestEnd = maxSeating;

    const lastRange = termSpecificRanges[termSpecificRanges.length - 1];
    const newSecret = lastRange ? lastRange.startSecret + 1000 : (secretTerm === 'term1' ? 5000 : 8000);
    
    const newRange: SecretGenRange = {
      id: Date.now().toString(),
      term: secretTerm,
      fromSeating: nextStart,
      toSeating: suggestEnd,
      startSecret: newSecret
    };
    saveRanges([...secretRanges, newRange]);
  };

  const removeRange = (id: string) => {
    saveRanges(secretRanges.filter(r => r.id !== id));
  };

  const updateRange = (id: string, field: keyof SecretGenRange, value: number) => {
    saveRanges(secretRanges.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // --- COMMITTEE LOGIC ---
  const saveCommittees = (newCommittees: ExamCommittee[]) => {
      setCommittees(newCommittees);
      db.saveCommittees(newCommittees);
  };

  const updateCommitteeData = (updated: ExamCommittee) => {
      const updatedList = committees.map(c => c.id === updated.id ? updated : c);
      saveCommittees(updatedList);
  };

  const addCommittee = () => {
      if (!newComm.name || !newComm.location) {
          alert('يرجى إدخال اسم اللجنة ومقرها.');
          return;
      }
      const newItem: ExamCommittee = {
          id: Date.now().toString(),
          name: newComm.name,
          location: newComm.location,
          capacity: newComm.capacity,
          gradeLevel: selectedGrade,
          shift: newComm.shift,
          notes: ''
      };
      saveCommittees([...committees, newItem]);
      setNewComm({ name: '', location: '', capacity: 20, shift: 'morning' });
  };

  const removeCommittee = (id: string) => {
      setConfirmModal({
        isOpen: true,
        title: 'حذف اللجنة',
        message: 'هل أنت متأكد من حذف هذه اللجنة؟\nسيتم إلغاء توزيع الطلاب المرتبطين بها.',
        details: [],
        isDanger: true,
        onConfirm: () => {
            saveCommittees(committees.filter(c => c.id !== id));
            const updatedStudents = students.map(s => s.committeeId === id ? { ...s, committeeId: null } : s);
            onUpdate(updatedStudents);
            closeConfirmModal();
        }
      });
  };

  const assignBalanced = (comms: ExamCommittee[], studs: Student[]) => {
      const buckets = comms.map((c) => ({ ...c, assigned: 0 }));
      const resultMap = new Map<string, string>();
      studs.forEach((s) => {
          const target = buckets
              .filter((c) => c.assigned < c.capacity)
              .sort((a, b) => a.assigned / a.capacity - b.assigned / b.capacity || a.assigned - b.assigned)[0];
          if (!target) return;
          resultMap.set(s.id, target.id);
          target.assigned += 1;
      });
      const report = buckets.map((b) => ({ name: b.name, capacity: b.capacity, assigned: b.assigned }));
      return { map: resultMap, report };
  };

  const buildDistributionPlan = (mode: 'mixed' | 'separated') => {
      const gradeCommittees = committees.filter((c) => c.gradeLevel === selectedGrade);
      if (gradeCommittees.length === 0) return null;
      const validStudents = studentsInGrade
          .filter((s) => s.seatingNumber !== null)
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
      if (validStudents.length === 0) return null;

      if (mode === 'mixed') {
          const { map, report } = assignBalanced(gradeCommittees, validStudents);
          const remaining = validStudents.length - Array.from(map.keys()).length;
          return { map, report, remaining };
      }

      const males = validStudents.filter((s) => (s.gender || '').toLowerCase().startsWith('ذ') || (s.gender || '').toLowerCase() === 'm');
      const females = validStudents.filter((s) => (s.gender || '').toLowerCase().startsWith('أ') || (s.gender || '').toLowerCase() === 'f');
      const others = validStudents.filter((s) => !males.includes(s) && !females.includes(s));

      const totalCapacity = gradeCommittees.reduce((acc, c) => acc + c.capacity, 0);
      const targetMale = Math.round((males.length / validStudents.length) * totalCapacity);

      const orderedComms = [...gradeCommittees].sort((a, b) => b.capacity - a.capacity);
      const maleGroup: ExamCommittee[] = [];
      const femaleGroup: ExamCommittee[] = [];
      orderedComms.forEach((c) => {
          const maleCap = maleGroup.reduce((acc, cc) => acc + cc.capacity, 0);
          const femaleCap = femaleGroup.reduce((acc, cc) => acc + cc.capacity, 0);
          if (maleCap < targetMale) maleGroup.push(c);
          else femaleGroup.push(c);
      });
      if (femaleGroup.length === 0) {
          femaleGroup.push(...maleGroup.splice(Math.floor(maleGroup.length / 2)));
      }

      const malePlan = assignBalanced(maleGroup, males);
      const femalePlan = assignBalanced(femaleGroup, females);
      const map = new Map<string, string>([...malePlan.map, ...femalePlan.map]);

      if (others.length > 0) {
          const combined = [...gradeCommittees].map((c) => ({
              ...c,
              assigned: Array.from(map.values()).filter((id) => id === c.id).length
          }));
          const fallback = assignBalanced(combined, others);
          fallback.map.forEach((val, key) => map.set(key, val));
      }

      const report = gradeCommittees.map((c) => ({
          name: c.name,
          capacity: c.capacity,
          assigned: Array.from(map.values()).filter((id) => id === c.id).length
      }));
      const remaining = validStudents.length - Array.from(map.keys()).length;
      return { map, report, remaining };
  };

  const previewDistribution = (modeOverride?: 'mixed' | 'separated') => {
      const mode = modeOverride || distributionMode;
      const plan = buildDistributionPlan(mode);
      const gradeCommittees = committees.filter(c => c.gradeLevel === selectedGrade);
      const validStudents = studentsInGrade.filter(s => s.seatingNumber !== null);

      if (!plan) {
          alert('يرجى إضافة لجان لهذا الصف وطلاب بأرقام جلوس.');
          return;
      }

      setDistributionMode(mode);
      setDistributionPlan(plan);

      const statusColor = plan.remaining === 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200';
      const statusText = plan.remaining === 0 
          ? '✅ جميع الطلاب موزعين بشكل صحيح.' 
          : `⚠️ يوجد (${plan.remaining}) طالب متبقي بدون لجنة لعدم كفاية السعة.`;

      setConfirmModal({
          isOpen: true,
          title: 'تأكيد توزيع اللجان',
          message: 'تقرير محاكاة توزيع الطلاب على اللجان:',
          details: [],
          customContent: (
              <div className="space-y-4 text-sm">
                  <div className="flex flex-wrap gap-4 text-center mb-2">
                      <div className="flex-1 min-w-[140px] bg-blue-50 p-2 rounded">
                          <p className="text-gray-500 text-xs">إجمالي الطلاب (بأرقام جلوس)</p>
                          <p className="font-bold text-lg text-blue-700">{validStudents.length}</p>
                      </div>
                      <div className="flex-1 min-w-[140px] bg-emerald-50 p-2 rounded">
                          <p className="text-gray-500 text-xs">عدد اللجان المتاحة</p>
                          <p className="font-bold text-lg text-emerald-700">{gradeCommittees.length}</p>
                      </div>
                      <div className="flex-1 min-w-[180px] bg-gray-50 p-2 rounded">
                          <p className="text-gray-500 text-xs mb-1">وضع التوزيع</p>
                          <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-700">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="radio" name="distMode" checked={mode === 'mixed'} onChange={() => previewDistribution('mixed')} />
                              مختلط
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="radio" name="distMode" checked={mode === 'separated'} onChange={() => previewDistribution('separated')} />
                              منفصل بنين/بنات
                            </label>
                          </div>
                      </div>
                    </div>

                  <div className="max-h-48 overflow-y-auto border rounded-lg custom-scrollbar">
                      <table className="w-full text-right text-xs">
                          <thead className="bg-gray-100 sticky top-0">
                              <tr>
                                  <th className="p-2 border-b">اللجنة</th>
                                  <th className="p-2 border-b text-center">السعة</th>
                                  <th className="p-2 border-b text-center">الموزعين</th>
                                  <th className="p-2 border-b text-center">نسبة الامتلاء</th>
                              </tr>
                          </thead>
                          <tbody>
                              {plan.report.map((row, idx) => (
                                  <tr key={idx} className="border-b last:border-0">
                                      <td className="p-2 font-medium">{row.name}</td>
                                      <td className="p-2 text-center text-gray-500">{row.capacity}</td>
                                      <td className="p-2 text-center font-bold text-blue-600">{row.assigned}</td>
                                      <td className="p-2 text-center">
                                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                              <div 
                                                  className={`h-1.5 rounded-full ${row.assigned >= row.capacity ? 'bg-red-400' : 'bg-green-500'}`}
                                                  style={{ width: `${Math.min((row.assigned / row.capacity) * 100, 100)}%` }}
                                              ></div>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>

                  <div className={`p-3 rounded-lg border text-center font-bold ${statusColor}`}>
                      {statusText}
                  </div>
              </div>
          ),
          onConfirm: () => executeDistributionFromPlan()
      });
  };

  const executeDistributionFromPlan = () => {
      if (!distributionPlan) return;
      const distributionMap = distributionPlan.map;

      const updatedStudents = students.map(s => {
          if (distributionMap.has(s.id)) {
              return { ...s, committeeId: distributionMap.get(s.id) };
          }
          if (s.gradeLevel === selectedGrade) {
              return { ...s, committeeId: s.committeeId || null };
          }
          return s;
      });

      onUpdate(updatedStudents);
      closeConfirmModal();
      setTimeout(() => alert("تم اعتماد توزيع اللجان بنجاح."), 200);
  };

  const closeConfirmModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  const getCommitteeStudents = () => {
      if (!selectedCommitteeId) return [];
      return studentsInGrade
        .filter(s => s.committeeId === selectedCommitteeId)
        .sort((a, b) => (a.seatingNumber || 0) - (b.seatingNumber || 0));
  };

  const handleExportCommitteeExcel = () => {
      if (!selectedCommitteeId) return;
      
      const commStudents = getCommitteeStudents();
      const committee = committees.find(c => c.id === selectedCommitteeId);
      
      const data = commStudents.map((s, idx) => ({
          'م': idx + 1,
          'اسم الطالب': s.name,
          'رقم الجلوس': s.seatingNumber,
          'النوع': s.gender,
          'الديانة': s.religion || 'مسلم',
          'الفصل': s.classroom
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "كشف المناداة");
      XLSX.writeFile(wb, `كشف_مناداة_${committee?.name}_${GRADE_LABELS[selectedGrade]}.xlsx`);
  };

  const handlePrint = () => {
    setConfirmModal({
        isOpen: true,
        title: 'تأكيد الطباعة',
        message: 'هل أنت جاهز لطباعة هذا الكشف؟\nيرجى التأكد من إعدادات الطابعة (حجم A4) وإخفاء الهوامش للحصول على أفضل تنسيق.',
        details: [],
        onConfirm: () => {
            closeConfirmModal();
            const targetId =
              'exam-print-root';
            if (targetId) {
              const targetEl = document.getElementById(targetId);
              if (targetEl) {
                printExamReport({
                  sourceElement: targetEl,
                  orientation: activeTab === 'secret' || activeTab === 'committees' ? 'landscape' : 'portrait'
                });
              } else {
                window.print();
              }
            } else {
              window.print();
            }
          }
    });
  };

  // --- PDF EXPORT LOGIC ---
  const handleExportPDF = (elementId: string, filename: string, orientation: 'portrait' | 'landscape' = 'portrait') => {
      setIsExporting(true);
      const element = document.getElementById(elementId);
      if (!element) {
          setIsExporting(false);
          return;
      }

      const opt = {
          margin: [3, 3, 3, 3] as [number, number, number, number],
          filename: `${filename}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: {
              scale: 3,
              useCORS: true,
              letterRendering: true,
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
          jsPDF: { unit: 'mm', format: 'a4', orientation: orientation }
      };

      html2pdf().set(opt).from(element).save().then(() => {
          setIsExporting(false);
      }).catch((err: any) => {
          console.error(err);
          setIsExporting(false);
          alert('حدث خطأ أثناء تصدير ملف PDF.');
      });
  };

  // --- SCHEDULE LOGIC ---
  const handleAddScheduleRow = () => {
      const newRow: ExamScheduleItem = {
          id: `custom_${Date.now()}`,
          subjectName: '',
          day: '',
          date: '',
          timeFrom: '',
          timeTo: '',
          duration: ''
      };
      setCurrentSchedule([...currentSchedule, newRow]);
  };

  const handleOpenScheduleModal = () => {
      const allSubjects = db.getSubjects();
      const gradeSubjects = allSubjects.filter(sub => sub.gradeLevels?.includes(selectedGrade) && sub.showInSchedule);
      setAvailableSubjects(gradeSubjects);

      const savedSchedule = db.getExamSchedule(selectedGrade, scheduleTerm);
      if (!savedSchedule || savedSchedule.length === 0) {
          const initSchedule: ExamScheduleItem[] = [{
              id: `sched_init_${Date.now()}`,
              subjectName: '',
              day: '',
              date: '',
              timeFrom: '',
              timeTo: '',
              duration: ''
          }];
          setCurrentSchedule(initSchedule);
      } else {
          setCurrentSchedule(savedSchedule);
      }
      setScheduleModalOpen(true);
  };

  const handleSyncWithSettings = () => {
    if (!confirm("سيتم تحديث قائمة المواد بناءً على الإعدادات الحالية. لن يتم حذف البيانات المدخلة للمواد الموجودة بالفعل. هل تريد الاستمرار؟")) return;
    
    const gradeSubjects = db.getSubjects().filter(sub => sub.gradeLevels?.includes(selectedGrade) && sub.showInSchedule);
    const syncedSchedule = [...currentSchedule];

    gradeSubjects.forEach(sub => {
        const exists = syncedSchedule.some(item => item.subjectName === sub.name);
        if (!exists) {
            syncedSchedule.push({
                id: `sched_${sub.id}_${Date.now()}`,
                subjectName: sub.name,
                day: '', date: '', timeFrom: '', timeTo: '', duration: ''
            });
        }
    });

    const finalSchedule = syncedSchedule.filter(item => 
        gradeSubjects.some(gs => gs.name === item.subjectName) || item.id.startsWith('custom_') || item.id.startsWith('sched_init_')
    );

    setCurrentSchedule(finalSchedule);
  };

  const handleScheduleChange = (rowId: string, field: keyof ExamScheduleItem, value: string) => {
      if (field === 'subjectName' && value !== '' && value !== 'custom_input') {
          const isDuplicate = currentSchedule.some(item => item.id !== rowId && item.subjectName === value);
          if (isDuplicate) {
              alert(`المادة "${value}" موجودة بالفعل في هذا الجدول.`);
              return;
          }
      }

      setCurrentSchedule(prev => prev.map(item => {
          if (item.id === rowId) {
              const updatedItem = { ...item, [field]: value };
              
              // أتمتة اختيار اليوم عند اختيار التاريخ
              if (field === 'date' && value) {
                const dateObj = new Date(value);
                if (!isNaN(dateObj.getTime())) {
                    updatedItem.day = dateObj.toLocaleDateString('ar-EG', { weekday: 'long' });
                }
              }

              // أتمتة حساب الزمن التقريبي
              if ((field === 'timeFrom' || field === 'timeTo') && updatedItem.timeFrom && updatedItem.timeTo) {
                  const [h1, m1] = updatedItem.timeFrom.split(':').map(Number);
                  const [h2, m2] = updatedItem.timeTo.split(':').map(Number);
                  const diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
                  if (diffMinutes > 0) {
                      const hours = Math.floor(diffMinutes / 60);
                      const mins = diffMinutes % 60;
                      let durStr = "";
                      if (hours === 1) durStr += "ساعة";
                      else if (hours === 2) durStr += "ساعتان";
                      else if (hours > 2) durStr += `${hours} ساعات`;
                      
                      if (mins > 0) durStr += ` و ${mins} دقيقة`;
                      updatedItem.duration = durStr;
                  }
              }

              return updatedItem;
          }
          return item;
      }));
  };

  const handleDeleteScheduleRow = (rowId: string) => {
      if (confirm('هل أنت متأكد من حذف هذه المادة من الجدول؟')) {
          setCurrentSchedule(prev => prev.filter(item => item.id !== rowId));
      }
  };

  const handleSaveSchedule = () => {
      const sanitized = currentSchedule.map(item => ({
          ...item,
          subjectName: item.subjectName === 'custom_input' ? '' : item.subjectName
      })).filter(item => item.subjectName !== '');
      
      db.saveExamSchedule(selectedGrade, scheduleTerm, sanitized);
      setScheduleModalOpen(false);
      alert("تم حفظ جدول الامتحانات بنجاح");
  };

  // --- SEATING NUMBERS ---
  const generateSeatingNumbers = () => {
    if (studentsInGrade.length === 0) {
        alert(`عفواً، لا يوجد طلاب مسجلين في ${GRADE_LABELS[selectedGrade]} لتوليد أرقام جلوس لهم.`);
        return;
    }

    if (startSeatingNumber === '' || startSeatingNumber <= 0) {
        alert("يرجى إدخل رقم بداية صحيح (أكبر من صفر).");
        return;
    }

    let sortLabel = 'أبجدي (الكل)';
    if (generationSortType === 'boys_first') sortLabel = 'بنين أولاً';
    if (generationSortType === 'girls_first') sortLabel = 'بنات أولاً';

    setConfirmModal({
        isOpen: true,
        title: 'تأكيد توليد أرقام الجلوس',
        details: [
            { label: 'الصف الدراسي', value: GRADE_LABELS[selectedGrade] },
            { label: 'عدد الطلاب', value: studentsInGrade.length },
            { label: 'بداية الترقيم', value: startSeatingNumber },
            { label: 'نظام الترتيب', value: sortLabel }
        ],
        message: 'سيتم إعادة ترتيب الطلاب وتوليد أرقام جلوس متسلسلة.\nهل أنت متأكد من الاستمرار؟',
        onConfirm: () => executeSeatingGeneration()
    });
  };

  const executeSeatingGeneration = () => {
      const targetGrade = selectedGrade;
      let sortedGradeStudents = [...studentsInGrade];
      
      if (generationSortType === 'alphabetical') {
          sortedGradeStudents.sort((a, b) => a.name.trim().localeCompare(b.name.trim(), 'ar'));
      } else if (generationSortType === 'boys_first') {
          sortedGradeStudents.sort((a, b) => {
              if (a.gender === b.gender) return a.name.trim().localeCompare(b.name.trim(), 'ar');
              return a.gender === 'ذكر' ? -1 : 1;
          });
      } else if (generationSortType === 'girls_first') {
           sortedGradeStudents.sort((a, b) => {
              if (a.gender === b.gender) return a.name.trim().localeCompare(b.name.trim(), 'ar');
              return a.gender === 'أنثى' ? -1 : 1;
          });
      }
      
      let currentNumber = Number(startSeatingNumber);
      
      const updatesMap = new Map<string, number>();
      sortedGradeStudents.forEach(st => {
          updatesMap.set(st.id, currentNumber);
          currentNumber++;
      });

      const updatedAllStudents = students.map(student => {
        if (updatesMap.has(student.id)) {
            return { ...student, seatingNumber: updatesMap.get(student.id) || null };
        }
        return student;
      });

      onUpdate(updatedAllStudents);
      closeConfirmModal();
      
      setTimeout(() => {
          alert(`تم بنجاح توليد أرقام جلوس لـ ${updatesMap.size} طالب في ${GRADE_LABELS[targetGrade]}.`);
      }, 200);
  };

  const resetSeatingNumbers = () => {
    if (studentsInGrade.length === 0) return;
    
    setConfirmModal({
        isOpen: true,
        title: 'حذف أرقام الجلوس',
        details: [
            { label: 'الصف الدراسي', value: GRADE_LABELS[selectedGrade] }
        ],
        message: 'سيتم حذف أرقام جلوس جميع طلاب هذا الصف نهائياً.\nهل أنت متأكد؟',
        isDanger: true,
        onConfirm: () => {
            const updatedStudents = students.map(s => {
                if (s.gradeLevel === selectedGrade) {
                    return { ...s, seatingNumber: null };
                }
                return s;
            });
            onUpdate(updatedStudents);
            closeConfirmModal();
        }
    });
  };

  // --- SECRET NUMBERS (RANGE BASED) ---
  const generateSecretNumbers = () => {
    if (termSpecificRanges.length === 0) {
      alert("يرجى إضافة نطاق واحد على الأقل لهذا الترم.");
      return;
    }

    if (notCoveredCount > 0) {
        if (!confirm(`تحذير: يوجد ${notCoveredCount} طالب في هذا الصف لم تشملهم النطاقات المحددة ولن يتم توليد أرقام سرية لهم.\nهل تريد المتابعة على أي حال؟`)) {
            return;
        }
    }

    setConfirmModal({
        isOpen: true,
        title: `توليد السري (${secretTerm === 'term1' ? 'الترم الأول' : 'الترم الثاني'})`,
        details: [
            { label: 'الصف الدراسي', value: GRADE_LABELS[selectedGrade] },
            { label: 'الفصل الدراسي', value: secretTerm === 'term1' ? 'الترم الأول' : 'الترم الثاني' },
            { label: 'عدد النطاقات', value: termSpecificRanges.length },
            { label: 'طلاب مشمولين', value: coveredSeatingCount }
        ],
        message: 'سيتم توزيع الأرقام السرية على طلاب الصف المختار لهذا الترم فقط.\nلن يتأثر الترم الآخر.',
        onConfirm: () => {
            let updatedStudents = [...students];
            const termKey = secretTerm === 'term1' ? 'secretNumberTerm1' : 'secretNumberTerm2';

            updatedStudents = updatedStudents.map(s => s.gradeLevel === selectedGrade ? { ...s, [termKey]: null } : s);

            termSpecificRanges.forEach(range => {
                const targetIndices = updatedStudents.map((s, idx) => ({ s, idx })).filter(item => 
                item.s.gradeLevel === selectedGrade &&
                item.s.seatingNumber !== null && 
                item.s.seatingNumber >= range.fromSeating && 
                item.s.seatingNumber <= range.toSeating
                ).map(item => item.idx);

                if (targetIndices.length === 0) return;

                let secretsPool: number[] = [];
                for (let i = 0; i < targetIndices.length; i++) {
                secretsPool.push(range.startSecret + i);
                }

                if (isRandomSecret) {
                secretsPool = secretsPool.sort(() => Math.random() - 0.5);
                }

                targetIndices.sort((a, b) => (updatedStudents[a].seatingNumber || 0) - (updatedStudents[b].seatingNumber || 0));

                targetIndices.forEach((studentIdx, poolIdx) => {
                    updatedStudents[studentIdx] = { 
                        ...updatedStudents[studentIdx], 
                        [termKey]: secretsPool[poolIdx] 
                    };
                });
            });
            
            onUpdate(updatedStudents);
            closeConfirmModal();
            setTimeout(() => alert("تم التوليد بنجاح للصف المختار."), 200);
        }
    });
  };
  
  const resetSecretNumbers = () => {
    setConfirmModal({
        isOpen: true,
        title: `حذف السري (${secretTerm === 'term1' ? 'الترم الأول' : 'الترم الثاني'})`,
        details: [
            { label: 'الصف الدراسي', value: GRADE_LABELS[selectedGrade] },
            { label: 'الفصل الدراسي', value: secretTerm === 'term1' ? 'الترم الأول' : 'الترم الثاني' }
        ],
        message: 'سيتم حذف الأرقام السرية الخاصة بهذا الترم فقط.\nهل أنت متأكد؟',
        isDanger: true,
        onConfirm: () => {
            const termKey = secretTerm === 'term1' ? 'secretNumberTerm1' : 'secretNumberTerm2';
            const updatedStudents = students.map(s => {
                if (s.gradeLevel === selectedGrade) {
                    return { ...s, [termKey]: null };
                }
                return s;
            });
            onUpdate(updatedStudents);
            closeConfirmModal();
        }
    });
  };

  // --- RENDER CONTENT FUNCTIONS ---

  const renderCallingListContent = () => {
      const committee = committees.find(c => c.id === selectedCommitteeId);
      const commStudents = getCommitteeStudents();

      const coreContent = (_isSecondCopy = false) => {
          const isDouble = callingListDisplayMode === 'double';
          return (
          <div className={`flex flex-col h-full bg-white ${isDouble ? 'px-1 scale-[0.99] border-l-[0.5px] border-dotted border-gray-400' : 'p-2'}`} dir="rtl">
            <div className={`flex items-center justify-between mb-4 border-b-2 border-black pb-2`}>
                <div className="w-[30%] text-center">
                    {schoolInfo.logo && <img src={schoolInfo.logo} alt="Logo" className={`${isDouble ? 'h-8' : 'h-14'} mx-auto object-contain mb-1`} />}
                    <p className={`font-bold ${isDouble ? 'text-[7px]' : 'text-[9px]'}`}>{schoolInfo.educationalAdministration}</p>
                    <p className={`font-bold ${isDouble ? 'text-[8px]' : 'text-[10px]'}`}>{schoolInfo.schoolName}</p>
                </div>
                <div className="w-[40%] text-center">
                    <h2 className={`${isDouble ? 'text-[11px]' : 'text-lg'} font-black mb-1 underline`}>كشف مناداة اللجان</h2>
                    <p className={`${isDouble ? 'text-[9px]' : 'text-sm'} font-bold`}>{callingListTerm === 'term1' ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثاني'}</p>
                    <p className={`${isDouble ? 'text-[8px]' : 'text-xs'} mt-1`}>{schoolInfo.academicYear}</p>
                </div>
                <div className={`w-[30%] text-right ${isDouble ? 'text-[8px]' : 'text-sm'} font-bold space-y-1`}>
                    <p>اللجنة: <span className="font-black text-blue-700">{committee?.name}</span></p>
                    <p>المقر: <span className="font-normal">{committee?.location}</span></p>
                    <p>الصف: <span className="font-normal">{GRADE_LABELS[selectedGrade]}</span></p>
                </div>
            </div>

            <table data-exam-print-table className="w-full text-center border-collapse border-2 border-black table-fixed">
                <thead>
                    <tr className={`bg-gray-100 print:bg-gray-200 font-black ${isDouble ? 'text-[9px]' : 'text-sm'}`}>
                        <th className="border-2 border-black p-1 w-[10%]">م</th>
                        <th className="border-2 border-black p-1 w-[50%]">اسم الطالب</th>
                        <th className="border-2 border-black p-1 w-[10%]">ن</th>
                        <th className="border-2 border-black p-1 w-[10%]">د</th>
                        <th className="border-2 border-black p-1 w-[20%]">الجلوس</th>
                    </tr>
                </thead>
                <tbody>
                    {commStudents.map((s, idx) => (
                        <tr key={s.id} className={`hover:bg-gray-50 transition-colors font-bold ${isDouble ? 'text-[9px] h-7' : 'h-10 text-sm'}`}>
                            <td className="border-[0.5px] border-black">{idx + 1}</td>
                            <td className={`border-[0.5px] border-black text-center px-1 font-black whitespace-normal break-words leading-tight`}>{s.name}</td>
                            <td className="border-[0.5px] border-black">{s.gender === 'ذكر' ? 'ذ' : 'أ'}</td>
                            <td className="border-[0.5px] border-black">{s.religion === 'مسلم' ? 'م' : 'س'}</td>
                            <td className="border-[0.5px] border-black font-black font-mono">{s.seatingNumber}</td>
                        </tr>
                    ))
                    }
                </tbody>
            </table>

            <div className="mt-4 flex justify-center">
                <table data-exam-print-table className={`border-collapse text-center border-2 border-black font-bold ${isDouble ? 'text-[8px] w-full' : 'text-xs w-2/3'}`}>
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border-2 border-black p-1">بنين</th>
                            <th className="border-2 border-black p-1">بنات</th>
                            <th className="border-2 border-black p-1">مسلم</th>
                            <th className="border-2 border-black p-1">مسيحي</th>
                            <th className="border-2 border-black p-1 bg-slate-800 text-white">جملة</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border-2 border-black p-1">{commStudents.filter(s => s.gender === 'ذكر').length}</td>
                            <td className="border-2 border-black p-1">{commStudents.filter(s => s.gender === 'أنثى').length}</td>
                            <td className="border-2 border-black p-1">{commStudents.filter(s => s.religion === 'مسلم').length}</td>
                            <td className="border-2 border-black p-1">{commStudents.filter(s => s.religion === 'مسيحي').length}</td>
                            <td className="border-2 border-black p-1 font-black bg-gray-50">{commStudents.length}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className={`mt-auto pt-6 flex justify-between text-center font-black ${isDouble ? 'text-[9px]' : 'text-sm'}`}>
                <div className="w-1/3">
                    <p className="mb-8 underline underline-offset-4 decoration-1">رئيس الكنترول</p>
                    <p className="text-slate-700 text-[10px]">{schoolInfo.controlHead || '..............'}</p>
                </div>
                <div className="w-1/3">
                    <p className="mb-8 underline underline-offset-4 decoration-1">مدير المدرسة</p>
                    <p className="text-slate-700 text-[10px]">{schoolInfo.managerName || '..............'}</p>
                </div>
            </div>
          </div>
      )};

      return (
    <div id="exam-print-root" data-exam-print-preview className="bg-white mx-auto max-w-5xl print:p-0 print:max-w-none h-full" dir="rtl">
              {callingListDisplayMode === 'single' ? (
                  <div className="w-full h-full p-4">{coreContent()}</div>
              ) : (
                  <div className="flex flex-row w-full h-full gap-0 overflow-hidden">
                      <div className="w-1/2">
                          {coreContent(false)}
                      </div>
                      <div className="w-1/2">
                          {coreContent(true)}
                      </div>
                  </div>
              )}
          </div>
      );
  };

  const renderSeatingContent = () => (
    <div id="exam-print-root" data-exam-print-preview className="bg-white p-6 md:p-10 mx-auto max-w-4xl print:p-0 print:max-w-none h-full">
        <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-4">
            <div className="w-1/4 text-center">
                {schoolInfo.logo && <img src={schoolInfo.logo} alt="Logo" className="h-16 mx-auto object-contain" />}
                <p className="font-bold mt-1 text-xs">{schoolInfo.educationalAdministration}</p>
            </div>
            <div className="w-2/4 text-center">
                <h2 className="text-xl font-bold mb-1">{schoolInfo.schoolName}</h2>
                <p className="text-lg font-bold">كشف أرقام الجلوس</p>
                <p className="text-sm mt-1">{schoolInfo.academicYear}</p>
            </div>
            <div className="w-1/4 text-right text-sm font-bold border-r pr-4">
                <p>الصف: <span className="font-normal">{GRADE_LABELS[selectedGrade]}</span></p>
                <p>العدد: <span className="font-normal">{studentsInGrade.length}</span></p>
            </div>
        </div>

        <table data-exam-print-table className="w-full text-right text-sm print:text-base border-collapse">
            <thead className="bg-gray-100 print:bg-gray-200">
                <tr>
                    <th className="p-3 border border-black">الاسم</th>
                    <th className="p-3 border border-black w-24 text-center">النوع</th>
                    <th className="p-3 border border-black">الفصل</th>
                    <th className="p-3 text-center border border-black">رقم الجلوس</th>
                </tr>
            </thead>
            <tbody>
                 {studentsInGrade
                    .filter(s => s.seatingNumber !== null)
                    .sort((a, b) => (a.seatingNumber || 0) - (b.seatingNumber || 0))
                    .map(s => (
                        <tr key={s.id}>
                            <td className="p-3 border border-black">{s.name}</td>
                            <td className="p-3 border border-black text-center text-gray-500">{s.gender}</td>
                            <td className="p-3 text-gray-500 border border-black print:text-black">{s.classroom}</td>
                            <td className="p-3 text-center font-bold font-mono text-blue-700 border border-black print:text-black">{s.seatingNumber}</td>
                        </tr>
                    ))
                 }
            </tbody>
        </table>
    </div>
  );

  const renderSecretContent = () => (
    <div id="exam-print-root" data-exam-print-preview className="bg-white p-6 md:p-10 mx-auto max-w-4xl print:p-0 print:max-w-none h-full">
        <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-4">
            <div className="w-1/4 text-center">
                {schoolInfo.logo && <img src={schoolInfo.logo} alt="Logo" className="h-16 mx-auto object-contain" />}
                <p className="font-bold mt-1 text-xs">{schoolInfo.educationalAdministration}</p>
            </div>
            <div className="w-2/4 text-center">
                <h2 className="text-xl font-bold mb-1">{schoolInfo.schoolName}</h2>
                <p className="text-lg font-bold">كشف الأرقام السرية</p>
                <p className="text-sm mt-1">{schoolInfo.academicYear}</p>
            </div>
            <div className="w-1/4 text-right text-sm font-bold border-r pr-4">
                <p>الصف: <span className="font-normal">{GRADE_LABELS[selectedGrade]}</span></p>
            </div>
        </div>

        <table data-exam-print-table className="w-full text-right text-sm print:text-base border-collapse">
            <thead className="bg-gray-100 print:bg-gray-200">
                <tr>
                    <th className="p-3 border border-black">الاسم</th>
                    <th className="p-3 text-center border border-black">رقم الجلوس</th>
                    <th className="p-3 text-center bg-blue-50 text-blue-900 border border-black print:bg-white print:text-black">الرقم السري (ت1)</th>
                    <th className="p-3 text-center bg-indigo-50 text-indigo-900 border border-black print:bg-white print:text-black">الرقم السري (ت2)</th>
                </tr>
            </thead>
            <tbody>
                 {studentsInGrade
                    .sort((a, b) => (a.seatingNumber || 0) - (b.seatingNumber || 0))
                    .map(s => (
                        <tr key={s.id}>
                            <td className="p-3 border border-black">{s.name}</td>
                            <td className="p-3 text-center font-mono text-gray-500 border border-black print:text-black">{s.seatingNumber || '-'}</td>
                            <td className="p-3 text-center font-bold font-mono bg-blue-50/50 text-blue-700 border border-black print:bg-transparent print:text-black">
                                {s.secretNumberTerm1 || '-'}
                            </td>
                            <td className="p-3 text-center font-bold font-mono bg-indigo-50/50 text-indigo-700 border border-black print:bg-transparent print:text-black">
                                {s.secretNumberTerm2 || '-'}
                            </td>
                        </tr>
                    ))
                 }
            </tbody>
        </table>
    </div>
  );

  const renderLabelsContent = () => {
    const validStudents = studentsInGrade
        .filter(s => s.seatingNumber !== null)
        .sort((a, b) => (a.seatingNumber || 0) - (b.seatingNumber || 0));

    if (validStudents.length === 0) {
        return <div className="p-12 text-center text-gray-400">لا يوجد طلاب لديهم أرقام جلوس لعرض الملصقات.</div>;
    }

    const cols = 2; 
    const rows = Math.ceil(labelsPerPage / cols);
    const totalPageHeightMM = 285; 
    const gapMM = cardGap; 
    const labelHeightMM = Math.floor((totalPageHeightMM - (rows * gapMM)) / rows);

    const textSizeClass = labelsPerPage > 10 ? 'text-[9px]' : 'text-xs';
    const headerSizeClass = labelsPerPage > 10 ? 'text-[10px]' : 'text-sm';
    const titleSizeClass = labelsPerPage > 10 ? 'text-xs' : 'text-lg';
    const seatSizeClass = labelsPerPage > 10 ? 'text-xl' : 'text-4xl';

    const pages = [];
    for (let i = 0; i < validStudents.length; i += labelsPerPage) {
        pages.push(validStudents.slice(i, i + labelsPerPage));
    }

    return (
    <div id="exam-print-root" data-exam-print-preview className="print:w-full">
            {pages.map((pageStudents, pageIdx) => (
                <div 
                    key={pageIdx} 
                    className={`grid grid-cols-2 print:h-[296mm] print:break-after-page content-start p-1 ${autoCenter ? 'mx-auto' : ''}`}
                    style={{
                        gap: `${gapMM}mm`,
                        position: 'relative',
                        left: !autoCenter ? `${printOffsetX}mm` : undefined,
                        top: !autoCenter ? `${printOffsetY}mm` : undefined,
                    }}
                >
                    {pageStudents.map(student => (
                         <div 
                            key={student.id} 
                            style={{ 
                                height: `${labelHeightMM}mm`,
                                paddingLeft: `${cardPaddingX}mm`, 
                                paddingRight: `${cardPaddingX}mm`, 
                                paddingTop: `${cardPaddingY}mm`, 
                                paddingBottom: `${cardPaddingY}mm`
                            }}
                            className="border-2 border-black rounded-lg flex flex-col justify-between bg-white relative overflow-hidden break-inside-avoid"
                         >
                             <div className="flex justify-between items-start border-b border-gray-400 pb-1 mb-1">
                                <div className="text-center w-full z-10">
                                    <h4 className={`font-bold text-gray-800 ${headerSizeClass}`}>{schoolInfo.schoolName}</h4>
                                    <p className={`text-gray-600 ${textSizeClass}`}>{schoolInfo.educationalAdministration}</p>
                                    <div className="bg-gray-100 text-gray-800 text-[10px] font-bold px-2 rounded mt-0.5 inline-block">
                                        {schoolInfo.academicYear}
                                    </div>
                                </div>
                                {schoolInfo.logo && <img src={schoolInfo.logo} className="h-8 object-contain absolute left-1 top-1 opacity-20" alt="logo"/>}
                             </div>
                             
                             <div className="text-center flex-1 flex flex-col justify-center z-10">
                                 <h3 className={`font-bold mb-0.5 line-clamp-1 ${titleSizeClass}`}>{student.name}</h3>
                                 <div className={`flex justify-center gap-2 font-bold text-gray-600 mb-1 ${textSizeClass}`}>
                                     <span>{GRADE_LABELS[student.gradeLevel]}</span>
                                     <span>|</span>
                                     <span>فصل: {student.classroom}</span>
                                 </div>
                                 <div className="border-2 border-black rounded px-4 py-0.5 inline-block mx-auto bg-gray-50">
                                     <span className="block text-[8px] text-gray-500 uppercase">Seating No.</span>
                                     <span className={`block font-black font-mono tracking-widest ${seatSizeClass}`}>{student.seatingNumber}</span>
                                 </div>
                             </div>

                             <div className={`mt-1 pt-1 border-t border-gray-300 flex justify-between items-center ${textSizeClass}`}>
                                 <span className="font-bold text-gray-500">لجنة: {committees.find(c => c.id === student.committeeId)?.name || '____'}</span>
                                 <span className="text-[8px] text-gray-400">نظام كنترول</span>
                             </div>
                         </div>
                    ))}
                </div>
            ))}
        </div>
    );
  };

  const renderCardsContent = () => {
    const validStudents = studentsInGrade
        .filter(s => s.seatingNumber !== null)
        .sort((a, b) => (a.seatingNumber || 0) - (b.seatingNumber || 0));

    if (validStudents.length === 0) {
        return <div className="p-12 text-center text-gray-400">لا يوجد طلاب لديهم أرقام جلوس لعرض البطاقات.</div>;
    }

    const activeSchedule = db.getExamSchedule(selectedGrade, scheduleTerm);

    const pages = [];
    for (let i = 0; i < validStudents.length; i += cardsPerPage) {
        pages.push(validStudents.slice(i, i + cardsPerPage));
    }

    const textSize = cardsPerPage >= 5 ? 'text-[8px]' : 'text-[10px]';
    const titleSize = cardsPerPage >= 5 ? 'text-[10px]' : 'text-xs';
    const headerSize = cardsPerPage >= 5 ? 'text-[8px]' : 'text-[10px]';
    const tablePadding = cardsPerPage >= 5 ? 'p-0.5' : 'p-1';
    const tableHeaderHeight = cardsPerPage >= 5 ? 'h-4' : 'h-6';

    return (
    <div id="exam-print-root" data-exam-print-preview className="print:w-full">
            {pages.map((pageStudents, pageIdx) => (
                <div 
                    key={pageIdx} 
                    className={`flex flex-col h-[296mm] w-[210mm] bg-white print:break-after-page overflow-hidden shadow-sm border print:border-none mb-8 print:mb-0 ${autoCenter ? 'mx-auto' : ''}`}
                    style={{ 
                        position: 'relative',
                        left: !autoCenter ? `${printOffsetX}mm` : undefined,
                        top: !autoCenter ? `${printOffsetY}mm` : undefined,
                    }}
                >
                    {pageStudents.map((student, sIndex) => (
                        <div key={student.id} style={{ height: `${100 / cardsPerPage}%` }} className={`flex border-b-2 border-dashed border-black relative ${sIndex === pageStudents.length - 1 ? 'border-b-0' : ''}`}>
                            <div className="flex w-full" style={{ paddingLeft: `${cardPaddingX}mm`, paddingRight: `${cardPaddingX}mm`, paddingTop: `${cardPaddingY}mm`, paddingBottom: `${cardPaddingY}mm`, gap: `${cardGap}mm` }}>
                                <div className="w-[45%] flex flex-col p-1 border-l-2 border-black pl-2">
                                    <div className={`border-b-2 border-black pb-1 mb-2 text-center font-bold ${headerSize}`}>
                                        <div className="flex justify-between px-1">
                                            <span>إدارة : {schoolInfo.educationalAdministration}</span>
                                        </div>
                                        <div className="flex justify-between px-1">
                                            <span>مدرسة : {schoolInfo.schoolName}</span>
                                        </div>
                                    </div>

                                    <div className="bg-rose-100 border-2 border-black text-center py-1 mb-2 shadow-sm">
                                        <h3 className={`font-bold ${titleSize}`}>امتحان {scheduleTerm === 'term1' ? 'نصف العام' : 'نهاية العام'} - {GRADE_LABELS[student.gradeLevel]}</h3>
                                    </div>

                                    <div className="flex-1 px-1 space-y-2 text-right" dir="rtl">
                                        <div className="flex items-baseline gap-1">
                                            <span className={`font-bold ${textSize}`}>الاسم:</span>
                                            <span className={`font-bold border-b border-dotted border-black flex-1 text-center ${titleSize}`}>{student.name}</span>
                                        </div>

                                        <div className="flex justify-between items-center mt-2 px-1">
                                            <div className="text-center">
                                                <p className={`font-bold mb-0.5 ${textSize}`}>رقم الجلوس</p>
                                                <div className={`font-black border border-black rounded px-2 ${cardsPerPage >= 5 ? 'text-lg' : 'text-xl'}`}>{student.seatingNumber}</div>
                                            </div>
                                            <div className="text-center">
                                                <p className={`font-bold mb-0.5 ${textSize}`}>رقم اللجنة</p>
                                                <div className={`font-black ${cardsPerPage >= 5 ? 'text-base' : 'text-lg'}`}>{committees.find(c => c.id === selectedCommitteeId)?.name || '...'}</div>
                                            </div>
                                        </div>

                                        <div className="mt-2 flex items-baseline gap-1">
                                            <span className={`font-bold ${textSize}`}>المقر:</span>
                                            <span className={`font-bold border-b border-dotted border-black flex-1 text-center ${textSize}`}>{committees.find(c => c.id === selectedCommitteeId)?.location || '...'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-[55%] flex flex-col justify-between">
                                    <table data-exam-print-table className={`w-full text-center border-collapse border border-black ${textSize}`}>
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th rowSpan={2} className={`border border-black ${tablePadding} align-middle w-24`}>المادة</th>
                                                <th rowSpan={2} className={`border border-black ${tablePadding} align-middle w-12`}>اليوم</th>
                                                <th rowSpan={2} className={`border border-black ${tablePadding} align-middle w-16`}>التاريخ</th>
                                                <th colSpan={3} className={`border border-black ${tablePadding} ${tableHeaderHeight}`}>الوقت</th>
                                            </tr>
                                            <tr className="bg-gray-100">
                                                <th className={`border border-black ${tablePadding}`}>من</th>
                                                <th className={`border border-black ${tablePadding}`}>إلى</th>
                                                <th className={`border border-black ${tablePadding} ${tableHeaderHeight}`}>الزمن</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeSchedule && activeSchedule.length > 0 ? (
                                                activeSchedule.map((item) => (
                                                    <tr key={item.id}>
                                                        <td className={`border border-black ${tablePadding} font-bold`}>{item.subjectName}</td>
                                                        <td className={`border border-black ${tablePadding}`}>{item.day}</td>
                                                        <td className={`border border-black ${tablePadding}`}>{item.date}</td>
                                                        <td className={`border border-black ${tablePadding}`}>{item.timeFrom}</td>
                                                        <td className={`border border-black ${tablePadding}`}>{item.timeTo}</td>
                                                        <td className={`border border-black ${tablePadding}`}>{item.duration}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                [1,2,3,4,5].map(i => (
                                                    <tr key={i}><td colSpan={6} className={`border border-black ${tablePadding} ${tableHeaderHeight}`}></td></tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                    
                                    <div className={`flex justify-between items-end mt-1 px-4 text-center font-bold ${headerSize}`}>
                                        <div><p>مدير المدرسة</p></div>
                                        <div><p>رئيس الكنترول</p></div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <h2 className="text-2xl font-bold text-gray-800">الكنترول</h2>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
             <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border shadow-sm">
                <span className="text-sm text-gray-500 font-medium">الصف الدراسي:</span>
                <select 
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value as GradeLevel)}
                    className="bg-transparent font-bold text-blue-700 outline-none cursor-pointer"
                >
                    {(Object.keys(GRADE_LABELS) as GradeLevel[]).map(g => (
                        <option key={g} value={g}>{GRADE_LABELS[g]}</option>
                    ))}
                </select>
            </div>

            <div className="bg-gray-200 p-1 rounded-lg flex overflow-x-auto max-w-[calc(100vw-40px)] md:max-w-none custom-scrollbar">
                <button onClick={() => setActiveTab('seating')} className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'seating' ? 'bg-white shadow text-blue-700' : 'text-gray-600'}`}><Hash size={16} /> أرقام الجلوس</button>
                <button onClick={() => setActiveTab('secret')} className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'secret' ? 'bg-white shadow text-indigo-700' : 'text-gray-600'}`}><Lock size={16} /> الأرقام السرية</button>
                <button onClick={() => setActiveTab('committees')} className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'committees' ? 'bg-white shadow text-emerald-700' : 'text-gray-600'}`}><Grid size={16} /> اللجان</button>
                <button onClick={() => setActiveTab('directory')} className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'directory' ? 'bg-white shadow text-slate-800' : 'text-gray-600'}`}><FileText size={16} /> دليل اللجان</button>
                <button onClick={() => setActiveTab('cards')} className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'cards' ? 'bg-white shadow text-purple-700' : 'text-gray-600'}`}><CreditCard size={16} /> بطاقات الجلوس</button>
                <button onClick={() => setActiveTab('labels')} className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 whitespace-nowrap ${activeTab === 'labels' ? 'bg-white shadow text-orange-700' : 'text-gray-600'}`}><Tags size={16} /> الملصقات</button>
            </div>
        </div>
      </div>

      {activeTab === 'seating' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6 h-fit no-print">
                <div className="text-center">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Settings size={24} />
                    </div>
                    <h3 className="font-bold text-gray-800">إعدادات التوليد</h3>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-blue-600">الصف المحدد:</span>
                        <span className="font-bold text-blue-900">{GRADE_LABELS[selectedGrade]}</span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">بداية الترقيم لهذا صف</label>
                    <input 
                    type="number" 
                    value={startSeatingNumber} 
                    onChange={(e) => setStartSeatingNumber(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="أدخل رقم البداية يدوياً"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <ArrowDownAZ size={16} /> ترتيب الطلاب قبل الترقيم
                    </label>
                    <select
                        value={generationSortType}
                        onChange={(e) => setGenerationSortType(e.target.value as any)}
                        className="w-full border rounded-lg p-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="alphabetical">أبجدي (الكل)</option>
                        <option value="boys_first">بنين أولاً (ثم بنات)</option>
                        <option value="girls_first">بنات أولاً (ثم بنين)</option>
                    </select>
                </div>

                <button onClick={generateSeatingNumbers} className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md shadow-blue-200 transition-colors">توليد أرقام جلوس ({GRADE_LABELS[selectedGrade]})</button>
                <button onClick={resetSeatingNumbers} className="w-full py-2.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium">حذف الأرقام ({GRADE_LABELS[selectedGrade]})</button>
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col print:w-full print:shadow-none print:border-none print:col-span-3">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 print:bg-white print:border-b-2">
                    <h3 className="font-bold flex items-center gap-2 text-xl print:text-2xl">كشف أرقام الجلوس <span className="text-sm font-normal bg-white px-2 py-1 rounded border text-gray-500 print:text-lg print:border-none print:font-bold print:text-black">{GRADE_LABELS[selectedGrade]}</span></h3>
                    <div className="flex gap-2">
                         <button onClick={() => setPreviewModalOpen(true)} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded border border-blue-200 no-print" title="معاينة"><Eye size={20}/></button>
                         <button onClick={() => handleExportPDF('seating-print-area', `كشف_جلوس_${GRADE_LABELS[selectedGrade]}`)} className="text-red-600 hover:text-red-800 bg-red-50 p-2 rounded border border-red-200 no-print flex items-center gap-2" title="تصدير PDF" disabled={isExporting}>{isExporting ? <Loader2 size={20} className="animate-spin"/> : <FileDown size={20}/>}</button>
                         <button onClick={handlePrint} className="text-gray-600 hover:text-gray-800 no-print bg-white p-2 rounded border hover:bg-gray-50"><Printer size={20}/></button>
                    </div>
                </div>
                <div className="overflow-auto flex-1 max-h-[600px] print:max-h-none print:overflow-visible custom-scrollbar">{renderSeatingContent()}</div>
            </div>
        </div>
      )}

      {activeTab === 'secret' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
            <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6 h-fit no-print">
                <div className="text-center">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Lock size={24} />
                    </div>
                    <h3 className="font-bold text-gray-800">توليد سري ({GRADE_LABELS[selectedGrade]})</h3>
                </div>

                <div className="bg-indigo-50 p-2 rounded-lg flex">
                    <button onClick={() => setSecretTerm('term1')} className={`flex-1 py-1.5 text-sm font-bold rounded shadow-sm transition ${secretTerm === 'term1' ? 'bg-white text-indigo-600' : 'text-indigo-400 hover:bg-indigo-100'}`}>الترم الأول</button>
                    <button onClick={() => setSecretTerm('term2')} className={`flex-1 py-1.5 text-sm font-bold rounded shadow-sm transition ${secretTerm === 'term2' ? 'bg-white text-indigo-600' : 'text-indigo-400 hover:bg-indigo-100'}`}>الترم الثاني</button>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-2 border">
                    <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-gray-600">لهم جلوس</span>
                        <span className="font-bold">{studentsWithSeatingCount}</span>
                    </div>
                </div>
                
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                   {termSpecificRanges.length > 0 ? termSpecificRanges.map((range, index) => (
                      <div key={range.id} className="bg-gray-50 p-3 rounded-lg border relative group hover:border-indigo-200 transition">
                          <button onClick={() => removeRange(range.id)} className="absolute top-2 left-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16} /></button>
                          <div className="text-xs font-bold text-gray-500 mb-2">المجموعة {index + 1} <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1 rounded mr-2">{range.term === 'term1' ? 'الترم 1' : 'الترم 2'}</span></div>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                             <div><label className="text-[10px] text-gray-500 block">من جلوس</label><input type="number" value={range.fromSeating} onChange={(e) => updateRange(range.id, 'fromSeating', parseInt(e.target.value))} className={`w-full border rounded p-1 text-sm ${(maxSeating > 0 && range.fromSeating > maxSeating) ? 'border-red-400 bg-red-50' : ''}`} /></div>
                             <div><label className="text-[10px] text-gray-500 block">إلى جلوس</label><input type="number" value={range.toSeating} onChange={(e) => updateRange(range.id, 'toSeating', parseInt(e.target.value))} className={`w-full border rounded p-1 text-sm ${(maxSeating > 0 && range.toSeating > maxSeating) ? 'border-red-400 bg-red-50' : ''}`} /></div>
                          </div>
                          <div><label className="text-[10px] text-gray-500 block">يبدأ السري من</label><input type="number" value={range.startSecret} onChange={(e) => updateRange(range.id, 'startSecret', parseInt(e.target.value))} className="w-full border rounded p-1 text-sm bg-indigo-50 border-indigo-200 font-mono" /></div>
                      </div>
                   )) : <div className="text-center py-4 text-gray-400 text-sm border-2 border-dashed rounded-lg">لا توجد نطاقات لهذا الترم</div>}
                   <button onClick={addRange} className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-2 text-sm"><Plus size={16} /> إضافة مجموعة ({secretTerm === 'term1' ? 'ترم 1' : 'ترم 2'})</button>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t">
                    <input type="checkbox" id="randomSecret" checked={isRandomSecret} onChange={(e) => setIsRandomSecret(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" /><label htmlFor="randomSecret" className="text-sm text-gray-700">توزيع عشوائي داخل كل مجموعة</label>
                </div>

                <button onClick={generateSecretNumbers} className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200">توليد ({secretTerm === 'term1' ? 'الترم الأول' : 'الترم الثاني'})</button>
                <button onClick={resetSecretNumbers} className="w-full py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">حذف سري ({secretTerm === 'term1' ? 'الترم الأول' : 'الترم الثاني'})</button>
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden print:w-full print:shadow-none print:border-none print:col-span-3">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 print:bg-white print:border-b-2">
                    <h3 className="font-bold flex items-center gap-2 text-xl print:text-2xl">كشف الأرقام السرية <span className="text-sm px-2 py-0.5 rounded bg-blue-100 text-blue-700 no-print">الترم الأول</span><span className="text-sm px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 no-print">الترم الثاني</span><span className="text-sm font-normal text-gray-500 print:text-black print:font-bold">({GRADE_LABELS[selectedGrade]})</span></h3>
                    <div className="flex gap-2">
                        <button onClick={() => setPreviewModalOpen(true)} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded border border-blue-200 no-print" title="معاينة"><Eye size={20}/></button>
                        <button onClick={() => handleExportPDF('secret-print-area', `كشف_سري_${GRADE_LABELS[selectedGrade]}`)} className="text-red-600 hover:text-red-800 bg-red-50 p-2 rounded border border-red-200 no-print flex items-center gap-2" title="تصدير PDF" disabled={isExporting}>{isExporting ? <Loader2 size={20} className="animate-spin"/> : <FileDown size={20}/>}</button>
                        <button onClick={handlePrint} className="text-gray-600 hover:text-gray-800 no-print"><Printer size={20}/></button>
                    </div>
                </div>
                <div className="overflow-auto max-h-[500px] print:max-h-none print:overflow-visible custom-scrollbar">{renderSecretContent()}</div>
            </div>
        </div>
      )}

      {activeTab === 'committees' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
               <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6 h-fit no-print">
                   <div className="text-center">
                       <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                           <Grid size={24} />
                       </div>
                       <h3 className="font-bold text-gray-800">إدارة اللجان ({GRADE_LABELS[selectedGrade]})</h3>
                   </div>

                   <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
                       <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1"><Plus size={16}/> إضافة لجنة جديدة</h4>
                       <input type="text" placeholder="اسم اللجنة (مثلاً: لجنة 1)" value={newComm.name} onChange={(e) => setNewComm({...newComm, name: e.target.value})} className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-emerald-200 outline-none" />
                       <input type="text" placeholder="المقر (مثلاً: فصل 1/أ)" value={newComm.location} onChange={(e) => setNewComm({...newComm, location: e.target.value})} className="w-full p-2 text-sm border rounded focus:ring-2 focus:ring-emerald-200 outline-none" />
                       <div className="flex items-center gap-2">
                           <span className="text-sm text-gray-600">الفترة:</span>
                           <select 
                                value={newComm.shift} 
                                onChange={(e) => setNewComm({...newComm, shift: e.target.value as any})}
                                className="flex-1 p-2 text-sm border rounded focus:ring-2 focus:ring-emerald-200 outline-none"
                           >
                               <option value="morning">صباحي</option>
                               <option value="evening">مسائي</option>
                           </select>
                       </div>
                       <div className="flex items-center gap-2"><span className="text-sm text-gray-600">السعة:</span><input type="number" value={newComm.capacity} onChange={(e) => setNewComm({...newComm, capacity: parseInt(e.target.value)})} className="w-20 p-2 text-sm border rounded focus:ring-2 focus:ring-emerald-200 outline-none" /></div>
                       <button onClick={addCommittee} className="w-full py-2 bg-emerald-600 text-white rounded text-sm font-bold hover:bg-emerald-700">حفظ اللجنة</button>
                   </div>

                   <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar">
                       {committees.filter(c => c.gradeLevel === selectedGrade).map(comm => (
                           <div key={comm.id} className="bg-white p-3 rounded border flex justify-between items-center hover:shadow-sm">
                               <div>
                                   <div className="font-bold text-gray-800 text-sm">{comm.name}</div>
                                   <div className="text-xs text-gray-500">{comm.location} (سعة: {comm.capacity}) - {comm.shift === 'evening' ? 'مسائي' : 'صباحي'}</div>
                               </div>
                               <button type="button" onClick={() => removeCommittee(comm.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                           </div>
                       ))}
                       {committees.filter(c => c.gradeLevel === selectedGrade).length === 0 && <p className="text-center text-xs text-gray-400 py-2">لا توجد لجان مضافة لهذا الصف.</p>}
                   </div>

                   <button onClick={previewDistribution} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold shadow-md shadow-blue-200 hover:bg-blue-700 flex items-center justify-center gap-2"><Users size={18}/> توزيع الطلاب تلقائياً</button>
               </div>

               <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col print:w-full print:shadow-none print:border-none print:col-span-3">
                   <div className="p-4 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-center no-print gap-4">
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                            <div className="flex items-center gap-2"><FileText size={20} className="text-gray-600" /><h3 className="font-bold text-gray-800 whitespace-nowrap">كشف المناداة</h3></div>
                            <div className="flex flex-col gap-2 w-full sm:w-auto">
                                <div className="flex gap-2">
                                    <select value={selectedCommitteeId} onChange={(e) => setSelectedCommitteeId(e.target.value)} className="border rounded px-2 py-1 text-sm bg-white flex-1 sm:flex-none font-bold"><option value="">اختر اللجنة لعرض الكشف</option>{committees.filter(c => c.gradeLevel === selectedGrade).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                                    <select value={callingListTerm} onChange={(e) => setCallingListTerm(e.target.value as any)} className="border rounded px-2 py-1 text-sm bg-white font-bold text-blue-700"><option value="term1">الترم الأول</option><option value="term2">الترم الثاني</option></select>
                                </div>
                                <div className="flex bg-gray-200 p-1 rounded-lg text-[10px]">
                                    <button onClick={() => setCallingListDisplayMode('single')} className={`flex-1 py-1 rounded transition flex items-center justify-center gap-1 ${callingListDisplayMode === 'single' ? 'bg-white shadow text-slate-800' : 'text-gray-500'}`}><FileText size={12}/> نسخة واحدة</button>
                                    <button onClick={() => setCallingListDisplayMode('double')} className={`flex-1 py-1 rounded transition flex items-center justify-center gap-1 ${callingListDisplayMode === 'double' ? 'bg-white shadow text-slate-800' : 'text-gray-500'}`}><Copy size={12}/> نسختان بالورقة</button>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={handleExportCommitteeExcel} className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200" title="تصدير Excel"><FileSpreadsheet size={20}/></button>
                             <button onClick={() => setPreviewModalOpen(true)} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded border border-blue-200" title="معاينة"><Eye size={20}/></button>
                             <button onClick={() => handleExportPDF('calling-list-print-area', `كشف_مناداة_${committees.find(c => c.id === selectedCommitteeId)?.name || ''}`)} className="text-red-600 hover:text-red-800 bg-red-50 p-2 rounded border border-red-200 no-print flex items-center gap-2" title="تصدير PDF" disabled={isExporting || !selectedCommitteeId}>{isExporting ? <Loader2 size={20} className="animate-spin"/> : <FileDown size={20}/>}</button>
                             <button onClick={handlePrint} className="text-gray-600 hover:text-gray-800 bg-white p-2 rounded border hover:bg-gray-50" title="طباعة"><Printer size={20}/></button>
                        </div>
                   </div>

                   <div className="p-6 overflow-auto flex-1 print:p-0 print:overflow-visible bg-gray-100/50 custom-scrollbar">
                       {selectedCommitteeId ? <div className="print:w-full bg-white shadow-sm border mx-auto max-w-4xl print:shadow-none print:border-none print:p-0">{renderCallingListContent()}</div> : <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12"><FileText size={48} className="mb-4 opacity-50"/><p>اختر لجنة من القائمة أعلاه لعرض كشف المناداة</p></div>}
                   </div>
               </div>
          </div>
      )}

      {activeTab === 'directory' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col print:w-full print:shadow-none print:border-none">
              <div className="p-4 border-b flex justify-between items-center bg-gray-50 print:bg-white print:border-b-2">
                  <div className="flex items-center gap-3 no-print">
                      <h3 className="font-bold flex items-center gap-2 text-xl print:text-2xl">
                          دليل اللجان الموزعة 
                          <span className="text-sm font-normal bg-white px-2 py-1 rounded border text-gray-500 print:text-lg print:border-none print:font-bold print:text-black">
                              {GRADE_LABELS[selectedGrade]}
                          </span>
                      </h3>
                      <select 
                          value={directoryTerm} 
                          onChange={(e) => setDirectoryTerm(e.target.value as any)} 
                          className="border rounded px-2 py-1 text-sm bg-white font-bold text-blue-700"
                      >
                          <option value="term1">الفصل الدراسي الأول</option>
                          <option value="term2">الفصل الدراسي الثاني</option>
                      </select>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => setPreviewModalOpen(true)} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded border border-blue-200 no-print" title="معاينة"><Eye size={20}/></button>
                      <button onClick={() => handleExportPDF('directory-print-area', `دليل_اللجان_${GRADE_LABELS[selectedGrade]}`)} className="text-red-600 hover:text-red-800 bg-red-50 p-2 rounded border border-red-200 no-print flex items-center gap-2" title="تصدير PDF" disabled={isExporting}>{isExporting ? <Loader2 size={20} className="animate-spin"/> : <FileDown size={20}/>}</button>
                      <button onClick={handlePrint} className="text-gray-600 hover:text-gray-800 no-print bg-white p-2 rounded border hover:bg-gray-50"><Printer size={20}/></button>
                  </div>
              </div>
              <div className="overflow-auto flex-1 max-h-[600px] print:max-h-none print:overflow-visible custom-scrollbar">
                  <CommitteeDirectory 
                    students={students} 
                    committees={committees} 
                    selectedGrade={selectedGrade} 
                    schoolInfo={schoolInfo} 
                    onUpdateCommittee={updateCommitteeData}
                    selectedTerm={directoryTerm}
                  />
              </div>
          </div>
      )}

      {activeTab === 'cards' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
               <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6 h-fit no-print">
                   <div className="text-center">
                       <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                           <CreditCard size={24} />
                       </div>
                       <h3 className="font-bold text-gray-800">بطاقات الجلوس</h3>
                       <p className="text-sm text-gray-500 mt-2">طباعة بطاقات التعريف للطلاب</p>
                   </div>
                   
                   <button onClick={handleOpenScheduleModal} className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 flex items-center justify-center gap-2 transition"><CalendarClock size={20} /> إعداد جدول الامتحانات</button>

                   <div className="bg-purple-50 p-4 rounded-lg text-sm text-purple-800 space-y-2">
                       <p className="font-bold">تنسيق الطباعة:</p>
                       <ul className="list-disc list-inside space-y-1"><li>بطاقتين في كل ورقة A4 (عرضي/طولي)</li><li>تأكد من إلغاء الهوامش (Margins: None)</li><li>الجدول يظهر على اليمين والبيانات على اليسار</li></ul>
                   </div>

                   <div className="bg-white border rounded-lg p-4 space-y-4 mt-4">
                        <h4 className="font-bold text-gray-700 text-sm border-b pb-2 flex items-center gap-2"><Settings size={14}/> إعدادات البطاقة (داخلي)</h4>
                        <div><label className="flex justify-between text-xs font-bold text-gray-600 mb-1"><span>عدد البطاقات/صفحة</span><span className="text-purple-600">{cardsPerPage}</span></label><input type="range" min="3" max="6" step="1" value={cardsPerPage} onChange={(e) => setCardsPerPage(parseInt(e.target.value))} className="w-full accent-purple-600 cursor-pointer" /></div>
                        <div><label className="flex justify-between text-xs font-bold text-gray-600 mb-1"><span className="flex items-center gap-1"><MoveHorizontal size={12}/> هامش أفقي داخلي</span><span className="text-blue-600">{cardPaddingX}mm</span></label><input type="range" min="0" max="20" step="1" value={cardPaddingX} onChange={(e) => setCardPaddingX(parseInt(e.target.value))} className="w-full accent-blue-600 cursor-pointer" /></div>
                   </div>

                   <div className="bg-white border rounded-lg p-4 space-y-4 mt-4">
                        <h4 className="font-bold text-gray-700 text-sm border-b pb-2 flex items-center gap-2"><Printer size={14}/> ضبط هوامش الطابعة (الصفحة)</h4>
                        <div className="flex items-center gap-2 mb-2 bg-gray-50 p-2 rounded"><input type="checkbox" id="autoCenter" checked={autoCenter} onChange={(e) => setAutoCenter(e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" /><label htmlFor="autoCenter" className="text-sm font-medium cursor-pointer select-none">توسط تلقائي (Center)</label></div>
                        {!autoCenter && (<div className="space-y-3 animate-in fade-in slide-in-from-top-2"><div><label className="flex justify-between text-xs font-bold text-gray-600 mb-1"><span className="flex items-center gap-1"><MoveHorizontal size={12}/> إزاحة أفقية (يمين/يسار)</span><span className="text-blue-600 font-mono" dir="ltr">{printOffsetX} mm</span></label><input type="range" min="-50" max="50" step="1" value={printOffsetX} onChange={(e) => setPrintOffsetX(parseInt(e.target.value))} className="w-full accent-blue-600 cursor-pointer" /></div></div>)}
                   </div>
               </div>

               <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col print:w-full print:shadow-none print:border-none print:col-span-3">
                   <div className="p-4 border-b flex justify-between items-center bg-gray-50 print:bg-white print:border-b-2">
                        <div className="flex items-center gap-3"><h3 className="font-bold flex items-center gap-2 text-xl print:text-2xl">بطاقات الجلوس <span className="text-sm font-normal bg-white px-2 py-1 rounded border text-gray-500 print:text-lg print:border-none print:font-bold print:text-black">{GRADE_LABELS[selectedGrade]}</span></h3><select value={scheduleTerm} onChange={(e) => setScheduleTerm(e.target.value as any)} className="border rounded px-2 py-1 text-sm bg-white font-bold text-purple-700 no-print"><option value="term1">جدول نصف العام</option><option value="term2">جدول آخر العام</option></select></div>
                        <div className="flex gap-2">
                             <button onClick={() => setPreviewModalOpen(true)} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded border border-blue-200 no-print" title="معاينة"><Eye size={20}/></button>
                             <button onClick={() => handleExportPDF('cards-print-area', `بطاقات_جلوس_${GRADE_LABELS[selectedGrade]}`)} className="text-red-600 hover:text-red-800 bg-red-50 p-2 rounded border border-red-200 no-print flex items-center gap-2" title="تصدير PDF" disabled={isExporting}>{isExporting ? <Loader2 size={20} className="animate-spin"/> : <FileDown size={20}/>}</button>
                             <button onClick={handlePrint} className="text-gray-600 hover:text-gray-800 no-print bg-white p-2 rounded border hover:bg-gray-50"><Printer size={20}/></button>
                        </div>
                   </div>
                   <div className="overflow-auto max-h-[600px] print:max-h-none print:overflow-visible bg-gray-100/50 print:bg-white p-4 print:p-0 custom-scrollbar"><div className="bg-white shadow-sm border mx-auto max-w-[210mm] print:shadow-none print:border-none print:p-0">{renderCardsContent()}</div></div>
               </div>
          </div>
      )}

      {activeTab === 'labels' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
               <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6 h-fit no-print">
                   <div className="text-center">
                       <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-3"><Tags size={24} /></div>
                       <h3 className="font-bold text-gray-800">ملصقات الجلوس</h3><p className="text-sm text-gray-500 mt-2">طباعة ملصقات صغيرة</p>
                   </div>
                   <div className="bg-white border rounded-lg p-4 space-y-4">
                        <label className="block text-sm font-bold text-gray-700">عدد الملصقات في الورقة (2-12)</label>
                        <div className="flex items-center gap-2"><input type="range" min="2" max="12" step="2" value={labelsPerPage} onChange={(e) => setLabelsPerPage(parseInt(e.target.value))} className="w-full accent-orange-600 cursor-pointer" /><span className="font-bold text-lg text-orange-600 w-8 text-center">{labelsPerPage}</span></div>
                        <div className="border-t pt-4 space-y-4">
                            <h4 className="font-bold text-gray-700 text-xs border-b pb-1">ضبط الهوامش (Labels Margins)</h4>
                            <div><label className="flex justify-between text-xs font-bold text-gray-600 mb-1"><span className="flex items-center gap-1"><MoveHorizontal size={12}/> هامش داخلي (Padding)</span><span className="text-orange-600">{cardPaddingX}mm</span></label><input type="range" min="0" max="20" step="1" value={cardPaddingX} onChange={(e) => setCardPaddingX(parseInt(e.target.value))} className="w-full accent-orange-600 cursor-pointer" /></div>
                            <div><label className="flex justify-between text-xs font-bold text-gray-600 mb-1"><span className="flex items-center gap-1"><Columns size={12}/> مسافة فاصلة (Gap)</span><span className="text-orange-600">{cardGap}mm</span></label><input type="range" min="0" max="10" step="1" value={cardGap} onChange={(e) => setCardGap(parseInt(e.target.value))} className="w-full accent-orange-600 cursor-pointer" /></div>
                        </div>
                   </div>

                   <div className="bg-white border rounded-lg p-4 space-y-4 mt-4">
                        <h4 className="font-bold text-gray-700 text-sm border-b pb-2 flex items-center gap-2"><Printer size={14}/> ضبط هوامش الطابعة</h4>
                        <div className="flex items-center gap-2 mb-2 bg-gray-50 p-2 rounded"><input type="checkbox" id="autoCenterLabels" checked={autoCenter} onChange={(e) => setAutoCenter(e.target.checked)} className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500" /><label htmlFor="autoCenterLabels" className="text-sm font-medium cursor-pointer select-none">توسط تلقائي</label></div>
                        {!autoCenter && (<div className="space-y-3"><div><label className="flex justify-between text-xs font-bold text-gray-600 mb-1"><span className="flex items-center gap-1"><MoveHorizontal size={12}/> إزاحة أفقية</span><span className="text-orange-600 font-mono" dir="ltr">{printOffsetX} mm</span></label><input type="range" min="-50" max="50" step="1" value={printOffsetX} onChange={(e) => setPrintOffsetX(parseInt(e.target.value))} className="w-full accent-orange-600 cursor-pointer" /></div><div><label className="flex justify-between text-xs font-bold text-gray-600 mb-1"><span className="flex items-center gap-1"><MoveVertical size={12}/> إزاحة رأسية</span><span className="text-orange-600 font-mono" dir="ltr">{printOffsetY} mm</span></label><input type="range" min="-50" max="50" step="1" value={printOffsetY} onChange={(e) => setPrintOffsetY(parseInt(e.target.value))} className="w-full accent-orange-600 cursor-pointer" /></div></div>)}
                   </div>
               </div>

               <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col print:w-full print:shadow-none print:border-none print:col-span-3">
                   <div className="p-4 border-b flex justify-between items-center bg-gray-50 print:bg-white print:border-b-2">
                        <h3 className="font-bold flex items-center gap-2 text-xl print:text-2xl">ملصقات الجلوس <span className="text-sm font-normal bg-white px-2 py-1 rounded border text-gray-500 print:text-lg print:border-none print:font-bold print:text-black">{GRADE_LABELS[selectedGrade]}</span></h3>
                        <div className="flex gap-2">
                             <button onClick={() => setPreviewModalOpen(true)} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded border border-blue-200 no-print" title="معاينة"><Eye size={20}/></button>
                             <button onClick={() => handleExportPDF('labels-print-area', `ملصقات_${GRADE_LABELS[selectedGrade]}`)} className="text-red-600 hover:text-red-800 bg-red-50 p-2 rounded border border-red-200 no-print flex items-center gap-2" title="تصدير PDF" disabled={isExporting}>{isExporting ? <Loader2 size={20} className="animate-spin"/> : <FileDown size={20}/>}</button>
                             <button onClick={handlePrint} className="text-gray-600 hover:text-gray-800 no-print bg-white p-2 rounded border hover:bg-gray-50"><Printer size={20}/></button>
                        </div>
                   </div>
                   <div className="overflow-auto max-h-[600px] print:max-h-none print:overflow-visible bg-gray-100/50 print:bg-white p-4 print:p-0 custom-scrollbar"><div className="bg-white p-4 shadow-sm border mx-auto max-w-[210mm] print:shadow-none print:border-none print:p-0">{renderLabelsContent()}</div></div>
               </div>
          </div>
      )}

      {previewModalOpen && (<div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200 no-print"><div className="w-full h-full flex flex-col"><div className="flex justify-between items-center text-white mb-4 px-4"><h3 className="text-lg font-bold">معاينة قبل الطباعة</h3><div className="flex gap-3"><button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Printer size={18} /> طباعة</button><button onClick={() => setPreviewModalOpen(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-bold">إغلاق</button></div></div><div className="flex-1 overflow-auto flex justify-center p-4 custom-scrollbar"><div className="bg-white shadow-2xl w-full max-w-4xl min-h-[1000px] p-4 animate-in zoom-in-95 duration-200">{activeTab === 'seating' && renderSeatingContent()}{activeTab === 'secret' && renderSecretContent()}{activeTab === 'committees' && (selectedCommitteeId ? renderCallingListContent() : <p className="text-center mt-20 text-gray-400">يرجى اختيار لجنة أولاً</p>)}{activeTab === 'directory' && <CommitteeDirectory students={students} committees={committees} selectedGrade={selectedGrade} schoolInfo={schoolInfo} onUpdateCommittee={updateCommitteeData} selectedTerm={directoryTerm} />}{activeTab === 'labels' && renderLabelsContent()}{activeTab === 'cards' && renderCardsContent()}</div></div></div></div>)}

      {scheduleModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200 no-print">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-purple-50 p-4 border-b border-purple-100 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-purple-800 flex items-center gap-2"><CalendarClock size={20}/> جدول الامتحانات: {GRADE_LABELS[selectedGrade]}</h3>
                      <div className="flex gap-2">
                        <button onClick={handleSyncWithSettings} className="px-3 py-1 bg-white border border-purple-200 text-purple-700 rounded text-xs font-bold hover:bg-purple-100 flex items-center gap-1 transition">تزامن</button>
                        <button onClick={() => setScheduleModalOpen(false)} className="text-gray-500 hover:text-red-500"><X size={20}/></button>
                      </div>
                  </div>
                  <div className="p-6 flex-1 overflow-y-auto">
                      <table data-exam-print-table className="w-full text-right border-collapse text-sm">
                          <thead>
                              <tr className="bg-gray-100 text-gray-700">
                                  <th className="p-2 border w-32">المادة</th>
                                  <th className="p-2 border w-40 text-center">التاريخ</th>
                                  <th className="p-2 border w-24 text-center">اليوم</th>
                                  <th className="p-2 border w-24 text-center">من</th>
                                  <th className="p-2 border w-24 text-center">إلى</th>
                                  <th className="p-2 border w-32 text-center">الزمن</th>
                                  <th className="p-2 border w-10 text-center">حذف</th>
                              </tr>
                          </thead>
                          <tbody>
                              {currentSchedule.map((item) => (
                                  <tr key={item.id} className="hover:bg-purple-50">
                                      <td className="p-2 border">
                                          <select 
                                              value={item.subjectName} 
                                              onChange={e => handleScheduleChange(item.id, 'subjectName', e.target.value)}
                                              className="w-full bg-transparent outline-none font-bold text-gray-800 cursor-pointer"
                                          >
                                              <option value="">-- مادة --</option>
                                              {availableSubjects.map(sub => (
                                                  <option key={sub.id} value={sub.name}>
                                                      {sub.name}
                                                  </option>
                                              ))}
                                              <option value="custom_input">... أخرى</option>
                                          </select>
                                      </td>
                                      <td className="p-2 border">
                                          <input 
                                              type="date" 
                                              value={item.date} 
                                              onChange={e => handleScheduleChange(item.id, 'date', e.target.value)} 
                                              className="w-full bg-white border border-gray-200 rounded p-1 text-center outline-none focus:ring-1 focus:ring-purple-400" 
                                          />
                                      </td>
                                      <td className="p-2 border">
                                          <input type="text" value={item.day} readOnly className="w-full bg-gray-50 border-0 text-center font-bold text-gray-600 outline-none" placeholder="-" />
                                      </td>
                                      <td className="p-2 border">
                                          <input 
                                              type="time" 
                                              value={item.timeFrom} 
                                              onChange={e => handleScheduleChange(item.id, 'timeFrom', e.target.value)} 
                                              className="w-full bg-white border border-gray-200 rounded p-1 text-center outline-none focus:ring-1 focus:ring-purple-400" 
                                          />
                                      </td>
                                      <td className="p-2 border">
                                          <input 
                                              type="time" 
                                              value={item.timeTo} 
                                              onChange={e => handleScheduleChange(item.id, 'timeTo', e.target.value)} 
                                              className="w-full bg-white border border-gray-200 rounded p-1 text-center outline-none focus:ring-1 focus:ring-purple-400" 
                                          />
                                      </td>
                                      <td className="p-2 border">
                                          <input type="text" value={item.duration} onChange={e => handleScheduleChange(item.id, 'duration', e.target.value)} className="w-full bg-transparent outline-none text-center font-medium" placeholder="ساعتان" />
                                      </td>
                                      <td className="p-2 border text-center">
                                          <button onClick={() => handleDeleteScheduleRow(item.id)} className="text-red-400 hover:text-red-600 transition"><Trash2 size={16}/></button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                      <button onClick={handleAddScheduleRow} className="mt-4 text-blue-600 font-bold flex items-center gap-1 bg-blue-50 px-3 py-1 rounded border border-blue-100 transition"><Plus size={16}/> إضافة سطر</button>
                  </div>
                  <div className="bg-gray-50 p-4 border-t flex justify-end gap-3">
                      <button onClick={() => setScheduleModalOpen(false)} className="px-4 py-2 border rounded hover:bg-gray-200 transition">إلغاء</button>
                      <button onClick={handleSaveSchedule} className="px-6 py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700 transition flex items-center gap-2 shadow-md shadow-purple-200">حفظ الجدول</button>
                  </div>
              </div>
          </div>
      )}

      {confirmModal.isOpen && (<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200 no-print"><div className="bg-white rounded-xl shadow-2xl w-full max-md overflow-hidden transform scale-100 transition-all"><div className="p-6"><div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmModal.isDanger ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{confirmModal.isDanger ? <AlertTriangle size={32} /> : (confirmModal.customContent ? <Grid size={32} /> : <Printer size={32} />)}</div><h3 className="text-xl font-bold text-center text-gray-900 mb-6">{confirmModal.title}</h3>{confirmModal.details.length > 0 && (<div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 border">{confirmModal.details.map((item, idx) => (<div key={idx} className="flex justify-between text-sm"><span className="text-gray-500">{item.label}:</span><span className="font-bold text-gray-800">{item.value}</span></div>))}</div>)}{confirmModal.customContent && (<div className="mb-6 custom-scrollbar">{confirmModal.customContent}</div>)}{confirmModal.message && (<p className="text-gray-600 text-center mb-6 text-sm whitespace-pre-line">{confirmModal.message}</p>)}<div className="flex gap-3 justify-center"><button onClick={closeConfirmModal} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition">إلغاء</button><button onClick={confirmModal.onConfirm} className={`flex-1 py-2.5 rounded-lg text-white font-bold transition shadow-lg ${confirmModal.isDanger ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}>{confirmModal.isDanger ? 'تأكيد' : 'تنفيذ'}</button></div></div></div></div>)}
    </div>
  );
};

export default Control;
