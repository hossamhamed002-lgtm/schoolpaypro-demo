
import React, { useState, useEffect, useRef } from 'react';
import { Search, Lock, Users, PenTool, BookOpen, Loader2, CheckCircle2, Beaker, Camera, Mic } from 'lucide-react';
import { Student, Subject, GradesDatabase, GradeLevel, GRADE_LABELS } from '../examControl.types';
import { AssessmentType, OcrAssessmentSetup, OcrGradePreviewRow, persistAssessmentGrade, OcrGradeInputRow, buildPreviewRows } from '../services/ocrGrades';
import { AssessmentSetupScreen, OCRUploadHandler, GradesPreviewTable } from './ocr';
import { parseSpokenArabicNumber } from '../services/voiceGrading';

type SpeechRecognition = any;
type SpeechRecognitionEvent = any;

interface GradingProps {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
  onUpdate: (grades: GradesDatabase) => void;
}

const Grading: React.FC<GradingProps> = ({ students, subjects, grades, onUpdate }) => {
  const mapAssessmentType = (mode: 'work' | 'exam' | 'practical'): AssessmentType =>
    mode === 'work' ? 'year_work' : mode === 'exam' ? 'written_exam' : 'oral';

  const [selectedTerm, setSelectedTerm] = useState<'term1' | 'term2'>('term1');
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('p1');
  const [viewMode, setViewMode] = useState<'standard' | 'secret'>('standard');
  const [gradingMode, setGradingMode] = useState<'work' | 'exam' | 'practical'>('exam');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOCR, setShowOCR] = useState(false);
  const [ocrSetup, setOcrSetup] = useState<OcrAssessmentSetup | null>(null);
  const [ocrPreview, setOcrPreview] = useState<OcrGradePreviewRow[]>([]);
  const [ocrRawRows, setOcrRawRows] = useState<OcrGradeInputRow[]>([]);
  const [isOcrSaving, setIsOcrSaving] = useState(false);
  const [ocrApplied, setOcrApplied] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voicePosition, setVoicePosition] = useState<{ row: number; col: number } | null>(null);
  
  // Auto-Save State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  
  // Pending changes buffer
  const [pendingChanges, setPendingChanges] = useState<{[key: string]: number | ''}>({});
  const [lastColumnValues, setLastColumnValues] = useState<Record<string, number>>({});
  const [activeVoiceStudent, setActiveVoiceStudent] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceRecognitionRef = useRef<SpeechRecognition | null>(null);
  const columnVoiceRef = useRef<SpeechRecognition | null>(null);
  const lastColumnGradeRef = useRef<number | 'غ' | null>(null);
  
  const pendingChangesRef = useRef(pendingChanges);
  const saveRef = useRef<(changes: {[key: string]: number | ''}) => void>(() => {});

  const relevantSubjects = subjects.filter(sub => 
      sub.gradeLevels && 
      sub.gradeLevels.includes(selectedGrade) && 
      sub.id !== 'sub_total_desc'
  );

  useEffect(() => {
    pendingChangesRef.current = pendingChanges;
  }, [pendingChanges]);

  useEffect(() => {
    setOcrSetup((prev) => {
      if (!prev) return prev;
      const nextSubject = prev.subjectId || relevantSubjects[0]?.id || '';
      return {
        ...prev,
        gradeId: selectedGrade,
        term: selectedTerm,
        assessmentType: mapAssessmentType(gradingMode),
        subjectId: nextSubject
      };
    });
  }, [selectedGrade, selectedTerm, gradingMode, relevantSubjects]);

  const getSecretForTerm = (s: Student) => {
      return selectedTerm === 'term1' ? s.secretNumberTerm1 : s.secretNumberTerm2;
  };

  const filteredStudents = students.filter(s => {
    if (s.gradeLevel !== selectedGrade) return false;
    
    const search = searchTerm.toLowerCase();
    if (viewMode === 'standard') {
        return (
            s.name.toLowerCase().includes(search) || 
            (s.seatingNumber && s.seatingNumber.toString().includes(search))
        );
    } else {
        const secret = getSecretForTerm(s);
        return (
            (secret && secret.toString().includes(search))
        );
    }
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
      if (viewMode === 'secret') {
          const sA = getSecretForTerm(a) || 0;
          const sB = getSecretForTerm(b) || 0;
          return sA - sB;
      }
      return (a.seatingNumber || 0) - (b.seatingNumber || 0);
  });

  const defaultOcrSetup = (): OcrAssessmentSetup | null => {
    const targetSubjectId = relevantSubjects[0]?.id;
    if (!targetSubjectId) return null;
    return {
      academicYearId: 'ACTIVE_YEAR',
      gradeId: selectedGrade,
      classId: undefined,
      term: selectedTerm,
      assessmentType: mapAssessmentType(gradingMode),
      subjectId: targetSubjectId
    };
  };

  const normalizeStudentsForOcr = () =>
    students.map((s) => ({
      ...s,
      academicYearId: 'ACTIVE_YEAR',
      gradeId: s.gradeLevel,
      classId: s.classroom
    }));
  const classOptions: { value: string; label: string }[] = Array.from(
    new Set(students.filter((s) => s.gradeLevel === selectedGrade).map((s) => s.classroom || ''))
  )
    .filter(Boolean)
    .map((c) => ({ value: c, label: c }));

  const getGradeValue = (studentId: string, subjectId: string): number | '' => {
    const key = `${studentId}|${subjectId}|${gradingMode}|${selectedTerm}`;
    if (pendingChanges[key] !== undefined) {
        return pendingChanges[key];
    }
    const record = grades[studentId]?.[subjectId];
    if (record) {
        const termRecord = selectedTerm === 'term1' ? record.term1 : record.term2;
        if (termRecord) {
             if (gradingMode === 'work') return termRecord.work;
             if (gradingMode === 'practical') return termRecord.practical;
             return termRecord.exam;
        }
    }
    return '';
  };

  const getMaxScore = (sub: Subject) => gradingMode === 'work'
    ? sub.yearWork
    : (gradingMode === 'practical' ? sub.practicalScore : sub.examScore);

  const normalizeValue = (raw: string, max: number): number | '' | null => {
    const clean = raw.trim();
    if (clean === '') return '';
    if (clean === 'غ' || clean.toLowerCase() === 'a') return -1;
    const parsed = parseFloat(clean);
    if (Number.isNaN(parsed)) return null;
    if (parsed < 0) return null;
    if (max === 0 || parsed > max) return null;
    return parsed;
  };

  const pushPendingChange = (studentId: string, subjectId: string, val: number | '') => {
    setPendingChanges(prev => ({
      ...prev,
      [`${studentId}|${subjectId}|${gradingMode}|${selectedTerm}`]: val
    }));
    if (typeof val === 'number') {
      const key = `${subjectId}|${gradingMode}|${selectedTerm}`;
      setLastColumnValues(prev => ({ ...prev, [key]: val }));
    }
    setSaveStatus('idle');
  };

  const applyOcrGradesToStore = (entries: OcrGradePreviewRow[], setup: OcrAssessmentSetup, overrideExisting: boolean) => {
    // Build minimal existing records for conflict detection
    const subject = relevantSubjects.find((s) => s.id === setup.subjectId);
    const maxGrade = subject ? (gradingMode === 'work' ? subject.yearWork : gradingMode === 'practical' ? subject.practicalScore : subject.examScore) : 100;
    const existingRecords = Object.entries(grades).flatMap(([studentId, subjMap]) => {
      const rec = subjMap[setup.subjectId];
      if (!rec) return [];
      const termRec = setup.term === 'term1' ? rec.term1 : rec.term2;
      if (!termRec) return [];
      const val = gradingMode === 'work' ? termRec.work : gradingMode === 'practical' ? termRec.practical : termRec.exam;
      return [{
        studentId,
        academicYearId: setup.academicYearId,
        gradeId: setup.gradeId,
        classId: undefined,
        subjectId: setup.subjectId,
        term: setup.term,
        assessmentType: setup.assessmentType,
        gradeValue: val,
        maxGrade: maxGrade || 100
      }];
    });

    const { saved, skipped, updatedStore } = persistAssessmentGrade({
      entries,
      setup,
      existingGrades: existingRecords,
      overrideExisting
    });

    if (saved.length) {
      const newGrades: GradesDatabase = JSON.parse(JSON.stringify(grades));
      updatedStore.forEach((rec) => {
        const { studentId, subjectId, term, assessmentType, gradeValue } = rec;
        if (!newGrades[studentId]) newGrades[studentId] = {};
        if (!newGrades[studentId][subjectId]) {
          newGrades[studentId][subjectId] = {
            term1: { work: 0, practical: 0, exam: 0 },
            term2: { work: 0, practical: 0, exam: 0 }
          };
        }
        const targetTerm = term === 'term1' ? 'term1' : 'term2';
        const termRef = newGrades[studentId][subjectId][targetTerm];
        if (assessmentType === 'year_work') termRef.work = gradeValue;
        else if (assessmentType === 'oral' || assessmentType === 'activity') termRef.practical = gradeValue;
        else termRef.exam = gradeValue;
      });

      onUpdate(newGrades);
    }
    return { savedCount: saved.length, skippedCount: skipped.length };
  };

  const logOcrBatch = ({
    total,
    applied,
    rejected
  }: {
    total: number;
    applied: number;
    rejected: number;
  }) => {
    try {
      const existing = JSON.parse(localStorage.getItem('ocrAuditLog') || '[]');
      const userId =
        localStorage.getItem('currentUserId') ||
        localStorage.getItem('userId') ||
        'unknown';
      const record = {
        timestamp: new Date().toISOString(),
        userId,
        gradeId: ocrSetup?.gradeId,
        subjectId: ocrSetup?.subjectId,
        assessmentType: ocrSetup?.assessmentType,
        totalRows: total,
        appliedRows: applied,
        rejectedRows: rejected,
        source: 'OCR_GOOGLE_VISION'
      };
      existing.push(record);
      localStorage.setItem('ocrAuditLog', JSON.stringify(existing));
    } catch (e) {
      console.warn('Failed to log OCR batch', e);
    }
  };

  const handleGradeChange = (studentId: string, subjectId: string, value: string) => {
    const subject = relevantSubjects.find((s) => s.id === subjectId);
    const max = subject ? getMaxScore(subject) : 0;
    if (!subject || max === 0) return;
    const normalized = normalizeValue(value, max);
    if (normalized === null) return;
    pushPendingChange(studentId, subjectId, normalized);
  };

  const handlePaste = (e: React.ClipboardEvent, startRowIndex: number, startColIndex: number) => {
    e.preventDefault();
    const clipboardData = e.clipboardData.getData('text');
    if (!clipboardData) return;

    const rows = clipboardData.split(/\r\n|\n|\r/).filter(row => row.trim() !== '');
    const newPendingChanges = { ...pendingChanges };
    const lastUpdates: Record<string, number> = {};
    let changesCount = 0;

    rows.forEach((row, rIdx) => {
        const targetRowIndex = startRowIndex + rIdx;
        if (targetRowIndex >= sortedStudents.length) return;
        const cols = row.split('\t');
        
        cols.forEach((val, cIdx) => {
            const targetColIndex = startColIndex + cIdx;
            if (targetColIndex >= relevantSubjects.length) return;

            const student = sortedStudents[targetRowIndex];
            const subject = relevantSubjects[targetColIndex];
            const max = getMaxScore(subject);
            if (max === 0) return;

            const normalized = normalizeValue(val, max);
            if (normalized === null) return;

            const key = `${student.id}|${subject.id}|${gradingMode}|${selectedTerm}`;
            newPendingChanges[key] = normalized;
            if (typeof normalized === 'number') {
              const lastKey = `${subject.id}|${gradingMode}|${selectedTerm}`;
              lastUpdates[lastKey] = normalized;
            }
            changesCount++;
        });
    });

    if (changesCount > 0) {
        setPendingChanges(newPendingChanges);
        if (Object.keys(lastUpdates).length > 0) {
          setLastColumnValues(prev => ({ ...prev, ...lastUpdates }));
        }
        setSaveStatus('idle');
    }
  };

  const saveChangesToDb = (changesToSave: {[key: string]: number | ''}) => {
    if (Object.keys(changesToSave).length === 0) return;
    const newGrades = JSON.parse(JSON.stringify(grades));

    Object.keys(changesToSave).forEach(key => {
        const [studentId, subjectId, mode, term] = key.split('|');
        const value = changesToSave[key];
        
        if (!newGrades[studentId]) newGrades[studentId] = {};
        if (!newGrades[studentId][subjectId]) newGrades[studentId][subjectId] = { 
            term1: { work: 0, practical: 0, exam: 0 }, 
            term2: { work: 0, practical: 0, exam: 0 } 
        };
        
        const finalVal = typeof value === 'number' ? value : 0;
        if (!newGrades[studentId][subjectId].term1) newGrades[studentId][subjectId].term1 = { work: 0, practical: 0, exam: 0 };
        if (!newGrades[studentId][subjectId].term2) newGrades[studentId][subjectId].term2 = { work: 0, practical: 0, exam: 0 };

        if (term === 'term1') {
            if (mode === 'work') newGrades[studentId][subjectId].term1.work = finalVal;
            else if (mode === 'practical') newGrades[studentId][subjectId].term1.practical = finalVal;
            else newGrades[studentId][subjectId].term1.exam = finalVal;
        } else {
            if (mode === 'work') newGrades[studentId][subjectId].term2.work = finalVal;
            else if (mode === 'practical') newGrades[studentId][subjectId].term2.practical = finalVal;
            else newGrades[studentId][subjectId].term2.exam = finalVal;
        }
    });

    onUpdate(newGrades);
    setPendingChanges({});
    setSaveStatus('saved');
    setLastSavedTime(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
  };

  useEffect(() => {
    saveRef.current = saveChangesToDb;
  }, [grades, onUpdate]);

  useEffect(() => {
    if (Object.keys(pendingChanges).length === 0) return;
    setSaveStatus('saving');
    const timer = setTimeout(() => {
        saveChangesToDb(pendingChanges);
    }, 1000);
    return () => clearTimeout(timer);
  }, [pendingChanges]);

  useEffect(() => {
    return () => {
        if (Object.keys(pendingChangesRef.current).length > 0) {
            saveRef.current(pendingChangesRef.current);
        }
    };
  }, []);

  const focusCell = (row: number, col: number) => {
    const inputId = `cell-${row}-${col}`;
    const el = document.getElementById(inputId) as HTMLInputElement;
    if (el) {
        el.focus();
        el.select();
    }
  };

  const parseArabicNumber = (text: string): number | null => {
    const trimmed = text.trim();
    if (trimmed === '') return null;
    const direct = trimmed.replace(/[,،]/g, '.');
    const directNum = parseFloat(direct);
    if (!Number.isNaN(directNum)) return directNum;

    const delimiters = /(فاصلة|\.|,|،)/;
    const parts = trimmed.split(delimiters).filter((p) => p.trim() !== '' && !delimiters.test(p));
    const onesMap: Record<string, number> = {
      'صفر': 0, 'واحد': 1, 'واحدة': 1, 'اثنين': 2, 'اتنين': 2, 'اثنان': 2, 'ثلاثة': 3, 'ثلاثه': 3, 'تلاتة': 3,
      'اربعة': 4, 'أربعة': 4, 'أربعه': 4, 'اربعه': 4, 'خمسة': 5, 'خمسه': 5, 'ستة': 6, 'ست': 6, 'سبعة': 7, 'سبعه': 7,
      'ثمانية': 8, 'ثمانيه': 8, 'تمانية': 8, 'تسعة': 9, 'تسعه': 9, 'عشرة': 10, 'عشره': 10
    };
    const tensMap: Record<string, number> = {
      'عشرين': 20, 'ثلاثين': 30, 'تلاتين': 30, 'اربعين': 40, 'أربعين': 40, 'خمسين': 50, 'ستين': 60, 'سبعين': 70,
      'ثمانين': 80, 'تمانين': 80, 'تسعين': 90, 'مائة': 100, 'مئه': 100, 'مية': 100
    };

    const parseIntegerTokens = (segment: string): number | null => {
      const tokens = segment.split(/[\sو]+/).map((t) => t.trim()).filter(Boolean);
      let total = 0;
      tokens.forEach((t) => {
        if (onesMap[t] !== undefined) total += onesMap[t];
        else if (tensMap[t] !== undefined) total += tensMap[t];
        else {
          const n = parseFloat(t);
          if (!Number.isNaN(n)) total += n;
        }
      });
      return total === 0 && tokens.length === 0 ? null : total;
    };

    if (parts.length === 1) return parseIntegerTokens(parts[0]);
    if (parts.length >= 2) {
      const intPart = parseIntegerTokens(parts[0]) ?? 0;
      const fracPart = parseIntegerTokens(parts[1]);
      if (fracPart === null) return intPart;
      const fracStr = String(fracPart).replace(/[^\d]/g, '');
      const fracVal = parseFloat(`0.${fracStr}`);
      return parseFloat((intPart + fracVal).toFixed(fracStr.length));
    }
    return null;
  };

  const splitSegments = (text: string) => {
    const delimiterPattern = /(ثم|وبعدها|التالي|بعد كده|،|,)/i;
    return text
      .split(delimiterPattern)
      .map((s) => s.trim())
      .filter((s) => s && !delimiterPattern.test(s));
  };

  const applyVoiceGrades = (student: Student, value: number | 'غ' | null, subjectIndex: number) => {
    let idx = subjectIndex;
    while (idx < relevantSubjects.length && getMaxScore(relevantSubjects[idx]) === 0) {
      idx += 1;
    }
    if (idx >= relevantSubjects.length) return idx;
    const subject = relevantSubjects[idx];
    const max = getMaxScore(subject);
    if (value === 'غ') {
      handleGradeChange(student.id, subject.id, 'غ');
      return idx + 1;
    }
    if (typeof value === 'number') {
      if (value >= 0 && value <= max && !Number.isNaN(value)) {
        handleGradeChange(student.id, subject.id, String(value));
        return idx + 1;
      }
    }
    return idx;
  };

  const recomputePreviewFromRaw = (rawRows: OcrGradeInputRow[], setup: OcrAssessmentSetup) => {
    if (!setup) return;
    const preview = rawRows.length
      ? buildPreviewRows({
          rawRows,
          setup,
          students: normalizeStudentsForOcr(),
          subjects
        })
      : [];
    setOcrPreview(preview);
  };

  const activeVoiceSubjectIndexRef = useRef(0);
  const activeVoiceRowRef = useRef(-1);

  const stopRecognition = () => {
    const rec = recognitionRef.current;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.stop();
      recognitionRef.current = null;
    }
    setActiveVoiceStudent(null);
    activeVoiceSubjectIndexRef.current = 0;
    activeVoiceRowRef.current = -1;
  };

  const stopVoiceGrading = () => {
    const rec = voiceRecognitionRef.current;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.stop();
      voiceRecognitionRef.current = null;
    }
    setVoiceMode(false);
    setVoicePosition(null);
  };

  const stopColumnVoice = () => {
    const rec = columnVoiceRef.current;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.stop();
      columnVoiceRef.current = null;
    }
    setActiveVoiceStudent(null);
    activeVoiceSubjectIndexRef.current = 0;
    activeVoiceRowRef.current = -1;
  };

  useEffect(() => {
    return () => {
      stopRecognition();
      stopVoiceGrading();
      stopColumnVoice();
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeVoiceStudent) {
        stopRecognition();
      }
      if (e.key === 'Escape') {
        stopColumnVoice();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeVoiceStudent]);

  const startVoiceInput = (student: Student) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('الميزة غير مدعومة في هذا المتصفح.');
      return;
    }
    stopRecognition();
    const rowIndex = sortedStudents.findIndex((s) => s.id === student.id);
    if (rowIndex === -1) {
      alert('تعذر تحديد الصف في الجدول.');
      return;
    }
    let subjectIndex = 0;
    while (subjectIndex < relevantSubjects.length && getMaxScore(relevantSubjects[subjectIndex]) === 0) {
      subjectIndex += 1;
    }
    if (subjectIndex >= relevantSubjects.length) {
      alert('لا توجد مادة مفعّلة لهذا الصف.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex] || event.results[event.results.length - 1];
      const transcript = result ? (result[0]?.transcript || '').trim() : '';
      if (!transcript) return;
      const parsed = parseSpokenArabicNumber(transcript);
      const nextIdx = applyVoiceGrades(student, parsed, activeVoiceSubjectIndexRef.current);
      if (nextIdx > activeVoiceSubjectIndexRef.current) {
        activeVoiceSubjectIndexRef.current = nextIdx;
        focusCell(rowIndex, Math.min(nextIdx, relevantSubjects.length - 1));
      }
      if (activeVoiceSubjectIndexRef.current >= relevantSubjects.length) {
        stopRecognition();
      }
    };
    recognition.onerror = () => {
      stopRecognition();
    };
    recognition.onend = () => {
      if (activeVoiceStudent) {
        try {
          recognition.start();
        } catch {
          stopRecognition();
        }
      }
    };
    recognitionRef.current = recognition;
    setActiveVoiceStudent(student.id);
    activeVoiceSubjectIndexRef.current = subjectIndex;
    activeVoiceRowRef.current = rowIndex;
    focusCell(rowIndex, subjectIndex);
    recognition.start();
  };

  const findStudentBySecret = (secretVal: number): Student | undefined => {
    const target = Math.round(secretVal);
    return sortedStudents.find((s) => {
      const sec = getSecretForTerm(s);
      const seat = s.seatingNumber;
      const anon = (s as any).anonymousCode || (s as any).anonymousNumber;
      return (
        (sec !== undefined && sec !== null && Number(sec) === target) ||
        (seat !== undefined && seat !== null && Number(seat) === target) ||
        (anon !== undefined && anon !== null && Number(anon) === target)
      );
    });
  };

  const getFirstValidSubjectIndex = () => {
    for (let i = 0; i < relevantSubjects.length; i++) {
      const max = getMaxScore(relevantSubjects[i]);
      if (max > 0) return i;
    }
    return -1;
  };

  const moveToNextStudentSameSubject = (current: { row: number; col: number } | null) => {
    if (!current) return null;
    const nextRow = current.row + 1;
    if (nextRow >= sortedStudents.length) return null;
    return { row: nextRow, col: current.col };
  };

  const startVoiceGrading = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('الميزة غير مدعومة في هذا المتصفح.');
      return;
    }
    if (!sortedStudents.length) {
      alert('لا يوجد طلاب في الصف المحدد.');
      return;
    }
    const subjectIndex = getFirstValidSubjectIndex();
    if (subjectIndex === -1) {
      alert('لا توجد مادة مفعّلة لهذا الصف لبدء الرصد الصوتي.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex] || event.results[event.results.length - 1];
      const transcript = result ? (result[0]?.transcript || '').trim() : '';
      if (!voiceMode || !transcript) return;
      const parsed = parseSpokenArabicNumber(transcript);
      if (parsed === null) return;
      const pos = voicePosition;
      if (!pos) return;
      const student = sortedStudents[pos.row];
      const subject = relevantSubjects[pos.col];
      const max = getMaxScore(subject);
      if (max === 0) return;
      if (parsed === 'غ') {
        handleGradeChange(student.id, subject.id, 'غ');
      } else if (typeof parsed === 'number') {
        if (parsed < 0 || parsed > max || Number.isNaN(parsed)) return;
        handleGradeChange(student.id, subject.id, String(parsed));
      }
      const nextPos = moveToNextStudentSameSubject(pos);
      if (nextPos) {
        setVoicePosition(nextPos);
      } else {
        stopVoiceGrading();
      }
    };
    recognition.onerror = () => {
      if (voiceMode) recognition.start();
    };
    recognition.onend = () => {
      if (voiceMode) {
        try {
          recognition.start();
        } catch {
          stopVoiceGrading();
        }
      }
    };
    voiceRecognitionRef.current = recognition;
    setVoicePosition({ row: 0, col: subjectIndex });
    setVoiceMode(true);
    recognition.start();
  };

  const startColumnVoice = (subjectIndex: number) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('الميزة غير مدعومة في هذا المتصفح.');
      return;
    }
    if (!sortedStudents.length) {
      alert('لا يوجد طلاب في الصف المحدد.');
      return;
    }
    const subject = relevantSubjects[subjectIndex];
    const max = getMaxScore(subject);
    if (max === 0) {
      alert('المادة غير مفعّلة للرصد.');
      return;
    }
    stopColumnVoice();
    lastColumnGradeRef.current = null;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.continuous = true;
    recognition.interimResults = false;
    activeVoiceSubjectIndexRef.current = subjectIndex;
    activeVoiceRowRef.current = 0;
    focusCell(0, subjectIndex);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex] || event.results[event.results.length - 1];
      const transcript = result ? (result[0]?.transcript || '').trim() : '';
      if (!transcript) return;
      let parsed = parseSpokenArabicNumber(transcript);
      const commandSame = /(?:مثلها|مثله|نفسها|نفسه|زيها|زيه|كما هي|كما هو)/i.test(transcript);
      if (commandSame && parsed === null) {
        parsed = lastColumnGradeRef.current;
      }
      const rowIdx = activeVoiceRowRef.current;
      if (rowIdx < 0 || rowIdx >= sortedStudents.length) {
        stopColumnVoice();
        return;
      }
      const student = sortedStudents[rowIdx];
      const value = parsed;
      if (value === 'غ') {
        handleGradeChange(student.id, subject.id, 'غ');
        lastColumnGradeRef.current = 'غ';
      } else if (typeof value === 'number') {
        if (value < 0 || value > max || Number.isNaN(value)) return;
        handleGradeChange(student.id, subject.id, String(value));
        lastColumnGradeRef.current = value;
      } else {
        return;
      }
      const nextRow = rowIdx + 1;
      if (nextRow >= sortedStudents.length) {
        stopColumnVoice();
      } else {
        activeVoiceRowRef.current = nextRow;
        focusCell(nextRow, subjectIndex);
      }
    };
    recognition.onerror = () => {
      stopColumnVoice();
    };
    recognition.onend = () => {
      // if we still have rows and not stopped manually, restart
      if (activeVoiceRowRef.current >= 0 && activeVoiceRowRef.current < sortedStudents.length) {
        try {
          recognition.start();
        } catch {
          stopColumnVoice();
        }
      }
    };
    columnVoiceRef.current = recognition;
    recognition.start();
  };

  useEffect(() => {
    if (voicePosition) {
      focusCell(voicePosition.row, voicePosition.col);
    }
  }, [voicePosition]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && voiceMode) {
        stopVoiceGrading();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [voiceMode]);

  const startVoiceBySecret = () => {
    if (viewMode !== 'secret') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('الميزة غير مدعومة في هذا المتصفح.');
      return;
    }
    stopRecognition();
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(' ')
        .trim();
      if (!transcript) {
        stopRecognition();
        return;
      }
      const segments = splitSegments(transcript);
      if (segments.length < 2) {
        alert('لم يتم التعرف على رقم الطالب أو الدرجات.');
        stopRecognition();
        return;
      }
      const secretNum = parseArabicNumber(segments[0]);
      if (secretNum === null || Number.isNaN(secretNum)) {
        alert('تعذّر قراءة رقم الطالب.');
        stopRecognition();
        return;
      }
      const student = findStudentBySecret(secretNum);
      if (!student) {
        alert('لم يتم العثور على الطالب بهذا الرقم.');
        stopRecognition();
        return;
      }
      setActiveVoiceStudent(student.id);
      const gradesTranscript = segments.slice(1).join(' ثم ');
      if (gradesTranscript.trim()) {
        applyVoiceGrades(student, gradesTranscript);
      }
      stopRecognition();
    };
    recognition.onerror = () => {
      stopRecognition();
    };
    recognition.onend = () => {
      stopRecognition();
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
      const gridWidth = relevantSubjects.length; 
      const gridHeight = sortedStudents.length;

      const moveTo = (r: number, c: number) => {
        const targetRow = Math.min(Math.max(r, 0), gridHeight - 1);
        const targetCol = Math.min(Math.max(c, 0), gridWidth - 1);
        focusCell(targetRow, targetCol);
      };

      // Alt + ArrowDown: copy last value in column to next row
      if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        if (rowIndex < gridHeight - 1) {
          const subject = relevantSubjects[colIndex];
          const lastKey = `${subject.id}|${gradingMode}|${selectedTerm}`;
          const lastVal = lastColumnValues[lastKey];
          const max = getMaxScore(subject);
          if (lastVal !== undefined && lastVal <= max && max > 0) {
            const nextStudent = sortedStudents[rowIndex + 1];
            const key = `${nextStudent.id}|${subject.id}|${gradingMode}|${selectedTerm}`;
            setPendingChanges(prev => ({ ...prev, [key]: lastVal }));
            setLastColumnValues(prev => ({ ...prev, [lastKey]: lastVal }));
            setSaveStatus('idle');
          }
          moveTo(rowIndex + 1, colIndex);
        }
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab'].includes(e.key) || (e.shiftKey && e.key === 'Enter')) {
          e.preventDefault();
          
          let targetRow = rowIndex;
          let targetCol = colIndex;

          if (e.key === 'ArrowUp' || (e.shiftKey && e.key === 'Enter')) targetRow = Math.max(0, rowIndex - 1);
          if (e.key === 'ArrowDown' || e.key === 'Enter') targetRow = Math.min(gridHeight - 1, rowIndex + 1);
          if (e.key === 'ArrowLeft') targetCol = Math.min(gridWidth - 1, colIndex + 1);
          if (e.key === 'ArrowRight') targetCol = Math.max(0, colIndex - 1);

          if (e.key === 'Tab') {
            const nextCol = colIndex + (e.shiftKey ? -1 : 1);
            if (nextCol < 0 && rowIndex > 0) {
              targetRow = rowIndex - 1;
              targetCol = gridWidth - 1;
            } else if (nextCol >= gridWidth && rowIndex < gridHeight - 1) {
              targetRow = rowIndex + 1;
              targetCol = 0;
            } else {
              targetCol = Math.min(Math.max(nextCol, 0), gridWidth - 1);
            }
          }

          moveTo(targetRow, targetCol);
      }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                <h2 className="text-xl font-bold text-gray-800 whitespace-nowrap">رصد الدرجات</h2>
                <select 
                    value={selectedGrade} 
                    onChange={e => setSelectedGrade(e.target.value as GradeLevel)}
                    className="bg-gray-50 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold flex-1 sm:flex-none cursor-pointer"
                >
                    {(Object.keys(GRADE_LABELS) as GradeLevel[]).map(g => (
                        <option key={g} value={g}>{GRADE_LABELS[g]}</option>
                    ))}
                </select>
                <div className="bg-gray-100 p-1 rounded-lg flex text-xs sm:text-sm">
                    <button onClick={() => setSelectedTerm('term1')} className={`px-3 py-1.5 rounded-md transition ${selectedTerm === 'term1' ? 'bg-white shadow text-blue-700 font-bold' : 'text-gray-500'}`}>الترم الأول</button>
                    <button onClick={() => setSelectedTerm('term2')} className={`px-3 py-1.5 rounded-md transition ${selectedTerm === 'term2' ? 'bg-white shadow text-blue-700 font-bold' : 'text-gray-500'}`}>الترم الثاني</button>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border">
                {saveStatus === 'saving' ? (
                    <><Loader2 size={14} className="text-blue-600 animate-spin" /><span className="text-xs text-blue-600 font-medium">جارٍ الحفظ...</span></>
                ) : saveStatus === 'saved' ? (
                    <><CheckCircle2 size={14} className="text-emerald-500" /><span className="text-xs text-gray-400 font-medium">تم الحفظ {lastSavedTime}</span></>
                ) : <span className="text-xs text-gray-400">جاهز للرصد</span>}
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto justify-center">
                <button onClick={() => setViewMode('standard')} className={`flex-1 sm:flex-none p-2 rounded-md transition flex items-center justify-center gap-2 text-sm ${viewMode === 'standard' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}><Users size={16} /> <span className="inline">الأسماء</span></button>
                <button onClick={() => setViewMode('secret')} className={`flex-1 sm:flex-none p-2 rounded-md transition flex items-center justify-center gap-2 text-sm ${viewMode === 'secret' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}><Lock size={16} /> <span className="inline">سري</span></button>
            </div>
            <div className="relative flex-1 w-full lg:w-48">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" placeholder="بحث..." className="w-full pr-9 pl-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            {viewMode === 'secret' && (
              <button
                type="button"
                onClick={startVoiceBySecret}
                className="px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-bold hover:bg-indigo-100 transition shadow-sm"
              >
                🎤 إدخال صوتي برقم الطالب
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (voiceMode) stopVoiceGrading();
                else startVoiceGrading();
              }}
              className={`px-3 py-2 rounded-lg border text-sm font-bold transition shadow-sm flex items-center gap-2 ${
                voiceMode ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-emerald-300 bg-emerald-50 text-emerald-700'
              }`}
            >
              {voiceMode ? '⛔ إيقاف الرصد الصوتي' : '🎤 بدء الرصد الصوتي'}
            </button>
            <button
              type="button"
              onClick={() => {
                const setup = defaultOcrSetup();
                if (!setup) {
                  alert('لا توجد مادة مفعّلة لهذا الصف لبدء الرصد عبر OCR.');
                  return;
                }
                setOcrPreview([]);
                setOcrApplied(false);
                setOcrSetup(setup);
                setShowOCR(true);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition shadow-sm flex items-center gap-2"
            >
              <Camera size={16} /> رصد من ورقة (OCR)
            </button>
        </div>
      </div>
        <div className="flex items-center justify-center bg-blue-50/50 p-2 rounded-lg border border-blue-100">
             <span className="text-sm font-bold text-gray-600 ml-3">أنت ترصد الآن درجات:</span>
             <div className="flex bg-white rounded-lg shadow-sm border p-1">
                 <button onClick={() => setGradingMode('work')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition ${gradingMode === 'work' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}><BookOpen size={16} /> أعمال السنة</button>
                 <button onClick={() => setGradingMode('practical')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition ${gradingMode === 'practical' ? 'bg-teal-100 text-teal-700' : 'text-gray-500 hover:bg-gray-50'}`}><Beaker size={16} /> عملي</button>
                 <button onClick={() => setGradingMode('exam')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition ${gradingMode === 'exam' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}><PenTool size={16} /> تحريري (الامتحان)</button>
             </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
         <div className="overflow-auto flex-1">
            <table className="w-full text-right border-collapse min-w-[800px]">
                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                        {viewMode === 'standard' ? (
                            <>
                                <th className="p-3 border-b text-sm font-semibold w-16 text-center text-gray-600 bg-gray-50 z-20 sticky right-0">جلوس</th>
                                <th className="p-3 border-b text-sm font-semibold text-gray-600 min-w-[200px] bg-gray-50 z-20 sticky right-16">اسم الطالب</th>
                            </>
                        ) : (
                            <th className="p-3 border-b text-sm font-semibold w-24 text-center text-indigo-700 bg-indigo-50 sticky right-0 z-20">السري ({selectedTerm === 'term1' ? 'ت1' : 'ت2'})</th>
                        )}
                        {relevantSubjects.map(sub => {
                            const max = gradingMode === 'work' ? sub.yearWork : (gradingMode === 'practical' ? sub.practicalScore : sub.examScore);
                            return (
                        <th key={sub.id} className={`p-3 border-b text-center min-w-[120px] ${max === 0 ? 'bg-gray-100 opacity-50' : ''}`}>
                            <div className="flex flex-col items-center justify-center gap-1">
                                <div className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                  {sub.name}
                                  {max > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => startColumnVoice(relevantSubjects.indexOf(sub))}
                                      className="p-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                      title="رصد صوتي لهذا العمود"
                                    >
                                      <Mic size={14} />
                                    </button>
                                  )}
                                </div>
                                <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${max > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>{max > 0 ? `العظمى: ${max}` : 'لا يوجد'}</div>
                            </div>
                        </th>
                        );
                    })}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {sortedStudents.map((student, rowIndex) => (
                        <tr key={student.id} className="hover:bg-blue-50/50 transition-colors group">
                            {viewMode === 'standard' ? (
                                <><td className="p-3 border-b border-l text-center font-mono font-bold text-gray-600 bg-gray-50/50 sticky right-0 z-10">{student.seatingNumber || '-'}</td><td className="p-3 border-b border-l font-medium text-gray-800 bg-gray-50/50 sticky right-16 z-10">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startVoiceInput(student)}
                                      title="إدخال صوتي"
                                      className={`text-sm px-2 py-1 rounded border transition ${activeVoiceStudent === student.id ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-500 hover:border-emerald-200 hover:text-emerald-600'}`}
                                    >
                                      🎤
                                    </button>
                                    <span>{student.name}</span>
                                  </div>
                                </td></>
                            ) : (
                                <td className="p-3 border-b border-l text-center font-mono font-bold text-indigo-700 bg-indigo-50/50 sticky right-0 z-10">{getSecretForTerm(student) || '-'}</td>
                            )}
                            {relevantSubjects.map((sub, colIndex) => {
                                const val = getGradeValue(student.id, sub.id);
                                const max = gradingMode === 'work' ? sub.yearWork : (gradingMode === 'practical' ? sub.practicalScore : sub.examScore);
                                const isError = typeof val === 'number' && val !== -1 && (val > max || val < 0);
                                const isDisabled = max === 0;
                                const isAbsent = val === -1;
                                
                                // عرض الخلية فارغة إذا كانت الدرجة صفراً
                                const displayValue = (val === -1) ? 'غ' : (val === 0 ? '' : val);

                                return (
                                    <td key={sub.id} className={`p-1 border-b text-center border-l relative ${isDisabled ? 'bg-gray-100' : ''}`}>
                                        <input 
                                          id={`cell-${rowIndex}-${colIndex}`} 
                                          type="text" 
                                          inputMode="decimal" 
                                          value={displayValue} 
                                          onChange={(e) => handleGradeChange(student.id, sub.id, e.target.value)} 
                                          onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)} 
                                          onPaste={(e) => handlePaste(e, rowIndex, colIndex)} 
                                          onFocus={handleFocus} 
                                          disabled={isDisabled} 
                                          className={`w-full h-full text-center py-2 bg-transparent focus:bg-blue-100/50 outline-none font-bold transition-all ${isError ? 'text-red-600 font-black' : (isAbsent ? 'text-red-500 font-black' : 'text-gray-800')} ${isDisabled ? 'cursor-not-allowed' : 'cursor-text'}`} 
                                          placeholder={isDisabled ? '' : '-'} 
                                          autoComplete="off" 
                                          title={isError ? `قيمة غير صحيحة! الحد الأقصى هو ${max}` : (isAbsent ? 'غائب' : `من ${max}`)} 
                                        />
                                        {isError && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {showOCR && ocrSetup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 space-y-6" dir="rtl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">رصد الدرجات عبر OCR</h3>
              <button onClick={() => setShowOCR(false)} className="text-slate-500 hover:text-slate-800 px-3 py-1 rounded-lg border border-slate-200">إغلاق</button>
            </div>

            <AssessmentSetupScreen
              setup={ocrSetup}
              academicYears={[{ value: ocrSetup.academicYearId, label: 'العام الحالي' }]}
              grades={[{ value: ocrSetup.gradeId, label: GRADE_LABELS[ocrSetup.gradeId as GradeLevel] || ocrSetup.gradeId }]}
              classes={[{ value: '', label: 'كل فصول الصف' }, ...classOptions]}
              subjects={relevantSubjects.map((s) => ({ value: s.id, label: s.name }))}
              onChange={(next) => setOcrSetup((prev) => (prev ? { ...prev, ...next } : prev))}
              onFileSelect={() => {}}
              readOnly={false}
              lockSubject
            />

            <OCRUploadHandler
              setup={ocrSetup}
              students={normalizeStudentsForOcr()}
              subjects={subjects}
              onPreview={(rows) => {
                setOcrApplied(false);
                setOcrPreview(rows);
                setOcrRawRows([]);
              }}
              onRawRows={(raw) => {
                setOcrApplied(false);
                setOcrRawRows(raw);
              }}
              disabled={false}
            />

            <GradesPreviewTable
              rows={ocrPreview}
              applied={ocrApplied}
              editable
              onEditRow={(index, secret, grade) => {
                const updated = [...ocrRawRows];
                if (!updated[index]) {
                  updated[index] = { secretNumber: secret, gradeRaw: grade };
                } else {
                  updated[index] = { ...updated[index], secretNumber: secret, gradeRaw: grade };
                }
                setOcrRawRows(updated);
                recomputePreviewFromRaw(updated, ocrSetup);
              }}
              onSave={(rows) => {
                if (!rows.length || ocrApplied) return;
                const hasExisting = rows.some((row) => {
                  const current = grades[row.studentId || '']?.[ocrSetup.subjectId];
                  if (!current) return false;
                  const termRec = ocrSetup.term === 'term1' ? current.term1 : current.term2;
                  if (!termRec) return false;
                  const val = mapAssessmentType(gradingMode) === 'year_work'
                    ? termRec.work
                    : mapAssessmentType(gradingMode) === 'oral'
                      ? termRec.practical
                      : termRec.exam;
                  return val !== undefined && val !== null;
                });
                if (hasExisting && !window.confirm('هناك درجات مسجلة مسبقاً لنفس المادة/الترم. هل تريد استبدالها بالقيم المقروءة؟')) {
                  return;
                }
                setIsOcrSaving(true);
                const result = applyOcrGradesToStore(rows, ocrSetup, true);
                const savedCount = result?.savedCount || 0;
                const totalRows = rows.length;
                const rejectedRows = totalRows - savedCount;
                logOcrBatch({ total: totalRows, applied: savedCount, rejected: rejectedRows });
                setIsOcrSaving(false);
                setOcrApplied(true);
              }}
            />

            {isOcrSaving && <p className="text-xs text-indigo-600 font-bold">جاري حفظ الدرجات المقروءة...</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default Grading;
