import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckSquare,
  X,
  AlertTriangle,
  ArrowRightLeft,
  Database
} from 'lucide-react';
import { AcademicYear, Class, Grade, Stage, StudentMaster, StudentStatus } from '../../types';

type PromotionChoice = 'promote' | 'retain';

interface StudentPromotionStore {
  lang: 'ar' | 'en';
  students: StudentMaster[];
  stages: Stage[];
  grades: Grade[];
  classes: Class[];
  allStudents?: StudentMaster[];
  allStages?: Stage[];
  allGrades?: Grade[];
  allClasses?: Class[];
  years: AcademicYear[];
  activeYear?: AcademicYear;
  importStudentsBatch: (batch: StudentMaster[]) => void;
}

interface PromotionTarget {
  student: StudentMaster;
  action: PromotionChoice;
  targetGrade: Grade | null;
  targetStage: Stage | null;
  targetClass: Class | null;
  classOptions: Class[];
  needsClassSelection: boolean;
  transitionKey?: string;
  error?: string;
  alreadyInNextYear: boolean;
}

interface TransitionGroup {
  key: string;
  label: string;
  classOptions: Class[];
}

interface PromotionPreview {
  targets: PromotionTarget[];
  promoteCount: number;
  retainCount: number;
  skippedCount: number;
  errorCount: number;
  errorSummaries: string[];
  summary: { label: string; count: number }[];
  transitionGroups: TransitionGroup[];
}

const StudentPromotion: React.FC<{ store: StudentPromotionStore }> = ({ store }) => {
  const {
    lang,
    students,
    stages,
    grades,
    classes,
    allStudents = students,
    allStages = stages,
    allGrades = grades,
    allClasses = classes,
    years,
    activeYear,
    importStudentsBatch
  } = store;
  const isRtl = lang === 'ar';
  const [selectedStageId, setSelectedStageId] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionMap, setActionMap] = useState<Record<string, PromotionChoice>>({});
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [preview, setPreview] = useState<PromotionPreview | null>(null);
  const [transitionSelections, setTransitionSelections] = useState<Record<string, string>>({});
  const alertedRef = useRef(false);
  const getYearId = (item: { Academic_Year_ID?: string; Year_ID?: string } | null | undefined) =>
    item?.Academic_Year_ID || item?.Year_ID || '';
  const normalizeLabel = (value: string) => value.trim().toLowerCase();
  const currentYearId = activeYear?.Year_ID || '';

  const classMap = useMemo(() => new Map(allClasses.map((klass) => [klass.Class_ID, klass])), [allClasses]);
  const gradeMap = useMemo(() => new Map(allGrades.map((grade) => [grade.Grade_ID, grade])), [allGrades]);

  const currentStages = useMemo(
    () => allStages.filter((stage) => getYearId(stage) === currentYearId),
    [allStages, currentYearId]
  );
  const currentGrades = useMemo(
    () => allGrades.filter((grade) => getYearId(grade) === currentYearId),
    [allGrades, currentYearId]
  );
  const currentClasses = useMemo(
    () => allClasses.filter((klass) => getYearId(klass) === currentYearId),
    [allClasses, currentYearId]
  );

  const stageOrder = useMemo(() => currentStages.map((stage) => stage.Stage_ID), [currentStages]);
  const currentStageMap = useMemo(() => new Map(currentStages.map((stage) => [stage.Stage_ID, stage])), [currentStages]);

  const gradesByStage = useMemo(() => {
    const map = new Map<string, Grade[]>();
    currentGrades.forEach((grade) => {
      if (!map.has(grade.Stage_ID)) map.set(grade.Stage_ID, []);
      map.get(grade.Stage_ID)?.push(grade);
    });
    return map;
  }, [currentGrades]);

  const nextYear = useMemo(() => {
    if (!activeYear) return undefined;
    const activeStart = new Date(activeYear.Start_Date);
    const future = years
      .filter((y) => new Date(y.Start_Date) > activeStart)
      .sort((a, b) => new Date(a.Start_Date).getTime() - new Date(b.Start_Date).getTime());
    return future[0];
  }, [years, activeYear]);

  const nextYearId = nextYear?.Year_ID || '';
  const nextStages = useMemo(
    () => allStages.filter((stage) => getYearId(stage) === nextYearId),
    [allStages, nextYearId]
  );
  const nextGrades = useMemo(
    () => allGrades.filter((grade) => getYearId(grade) === nextYearId),
    [allGrades, nextYearId]
  );
  const nextClasses = useMemo(
    () => allClasses.filter((klass) => getYearId(klass) === nextYearId),
    [allClasses, nextYearId]
  );

  const nextStageByName = useMemo(() => {
    const map = new Map<string, Stage>();
    nextStages.forEach((stage) => {
      map.set(normalizeLabel(stage.Stage_Name), stage);
    });
    return map;
  }, [nextStages]);

  const getNextYearStage = (stageName: string) =>
    nextStageByName.get(normalizeLabel(stageName)) || null;

  const getNextYearGrade = (stageName: string, gradeName: string) => {
    const nextStage = getNextYearStage(stageName);
    if (!nextStage) return null;
    return (
      nextGrades.find(
        (grade) =>
          grade.Stage_ID === nextStage.Stage_ID &&
          normalizeLabel(grade.Grade_Name) === normalizeLabel(gradeName)
      ) || null
    );
  };

  const nextYearNationalIds = useMemo(() => {
    if (!nextYearId) return new Set<string>();
    const set = new Set<string>();
    allStudents.forEach((student) => {
      const studentYearId = student.Academic_Year_ID || classMap.get(student.Class_ID)?.Year_ID || '';
      if (studentYearId === nextYearId) {
        set.add(student.National_ID);
      }
    });
    return set;
  }, [allStudents, classMap, nextYearId]);

  useEffect(() => {
    if (!nextYear && !alertedRef.current) {
      alertedRef.current = true;
      alert(isRtl ? 'برجاء إنشاء إعدادات السنة الدراسية الجديدة أولاً.' : 'Please create the new academic year settings first.');
    }
  }, [nextYear, isRtl]);

  const enrolledStudents = useMemo(() => {
    if (!activeYear) return [];
    return allStudents.filter((student) => {
      const studentYearId = student.Academic_Year_ID || classMap.get(student.Class_ID)?.Year_ID || '';
      return studentYearId === currentYearId && student.Status !== StudentStatus.DEPARTED;
    });
  }, [allStudents, classMap, activeYear, currentYearId]);

  const filteredGrades = useMemo(
    () => currentGrades.filter((grade) => grade.Stage_ID === selectedStageId),
    [currentGrades, selectedStageId]
  );

  const filteredClasses = useMemo(
    () => currentClasses.filter((klass) => klass.Grade_ID === selectedGradeId),
    [currentClasses, selectedGradeId]
  );

  const filteredStudents = useMemo(() => {
    return enrolledStudents.filter((student) => {
      if (selectedStageId && student.Stage_ID !== selectedStageId) return false;
      if (selectedGradeId && student.Grade_ID !== selectedGradeId) return false;
      if (selectedClassId && student.Class_ID !== selectedClassId) return false;
      return true;
    });
  }, [enrolledStudents, selectedStageId, selectedGradeId, selectedClassId]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => filteredStudents.some((s) => s.Student_Global_ID === id)));
  }, [filteredStudents]);

  useEffect(() => {
    setActionMap((prev) => {
      const next = { ...prev };
      filteredStudents.forEach((student) => {
        if (!next[student.Student_Global_ID]) {
          next[student.Student_Global_ID] = 'promote';
        }
      });
      return next;
    });
  }, [filteredStudents]);

  const isAllSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((student) => selectedIds.includes(student.Student_Global_ID));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map((student) => student.Student_Global_ID));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const applyBulkAction = (action: PromotionChoice) => {
    setActionMap((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        next[id] = action;
      });
      return next;
    });
  };

    const getTargetGradeForPromotion = (student: StudentMaster): { grade: Grade | null; stage: Stage | null; needsStageTransition: boolean; error?: string } => {
    const currentStage = currentStageMap.get(student.Stage_ID) || null;
    if (!currentStage) {
      return { grade: null, stage: null, needsStageTransition: false, error: 'Missing stage setup' };
    }

    const stageGrades = gradesByStage.get(student.Stage_ID) || [];
    const currentIndex = stageGrades.findIndex((g) => g.Grade_ID === student.Grade_ID);
    if (currentIndex == -1) {
      return { grade: null, stage: currentStage, needsStageTransition: false, error: 'Missing grade setup' };
    }

    if (currentIndex < stageGrades.length - 1) {
      const nextGradeCurrent = stageGrades[currentIndex + 1];
      const targetStage = getNextYearStage(currentStage.Stage_Name);
      const targetGrade = getNextYearGrade(currentStage.Stage_Name, nextGradeCurrent.Grade_Name);
      if (!targetStage || !targetGrade) {
        return { grade: null, stage: targetStage, needsStageTransition: false, error: 'Missing next year grade' };
      }
      return { grade: targetGrade, stage: targetStage, needsStageTransition: false };
    }

    const stageIndex = stageOrder.indexOf(student.Stage_ID);
    if (stageIndex == -1 || stageIndex == stageOrder.length - 1) {
      return { grade: null, stage: null, needsStageTransition: true, error: 'No next stage found' };
    }

    const nextStageCurrent = currentStages[stageIndex + 1];
    if (!nextStageCurrent) {
      return { grade: null, stage: null, needsStageTransition: true, error: 'No next stage found' };
    }

    const nextStageGradesCurrent = gradesByStage.get(nextStageCurrent.Stage_ID) || [];
    if (nextStageGradesCurrent.length == 0) {
      const mappedStage = getNextYearStage(nextStageCurrent.Stage_Name);
      return { grade: null, stage: mappedStage, needsStageTransition: true, error: 'Next stage has no grades' };
    }

    const entryGradeCurrent = nextStageGradesCurrent[0];
    const targetStage = getNextYearStage(nextStageCurrent.Stage_Name);
    const targetGrade = getNextYearGrade(nextStageCurrent.Stage_Name, entryGradeCurrent.Grade_Name);

    if (!targetStage || !targetGrade) {
      return { grade: null, stage: targetStage, needsStageTransition: true, error: 'Missing next year grade' };
    }

    return { grade: targetGrade, stage: targetStage, needsStageTransition: true };
  };

  const buildPromotionPreview = (ids: string[]): PromotionPreview => {
    const targets: PromotionTarget[] = [];
    const summaryMap = new Map<string, { label: string; count: number }>();
    const transitionGroups = new Map<string, TransitionGroup>();
    let promoteCount = 0;
    let retainCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errorSummaries: string[] = [];

    ids.forEach((id) => {
      const student = allStudents.find((s) => s.Student_Global_ID === id);
      if (!student || !nextYear) return;
      const action = actionMap[id] || 'promote';
      let targetGrade: Grade | null = null;
      let targetStage: Stage | null = null;
      let needsClassSelection = false;
      let error: string | undefined;

      if (action === 'promote') {
        const nextGradeInfo = getTargetGradeForPromotion(student);
        targetGrade = nextGradeInfo.grade;
        targetStage = nextGradeInfo.stage;
        needsClassSelection = nextGradeInfo.needsStageTransition;
        error = nextGradeInfo.error;
      } else {
        const currentGrade = gradeMap.get(student.Grade_ID) || null;
        const currentStage = currentStageMap.get(student.Stage_ID) || null;
        if (!currentGrade || !currentStage) {
          error = 'Missing grade setup';
        } else {
          targetStage = getNextYearStage(currentStage.Stage_Name);
          targetGrade = getNextYearGrade(currentStage.Stage_Name, currentGrade.Grade_Name);
          if (!targetGrade || !targetStage) {
            error = 'Missing next year grade';
          }
        }
      }

      const classOptions =
        targetGrade && nextYear
          ? nextClasses.filter((klass) => klass.Grade_ID === targetGrade.Grade_ID)
          : [];

      if (!error && classOptions.length === 0) {
        error = isRtl ? '?? ???? ???? ???? ???????? ?? ????? ??????' : 'Missing classes for target grade';
      }

      const currentClass = classMap.get(student.Class_ID);
      const defaultClass =
        classOptions.find((klass) => currentClass && klass.Class_Name === currentClass.Class_Name) || classOptions[0] || null;

      const alreadyInNextYear = nextYearNationalIds.has(student.National_ID);

      const transitionKey = needsClassSelection && targetGrade ? `${student.Stage_ID}:${targetGrade.Grade_ID}` : undefined;
      if (transitionKey && classOptions.length > 0 && !transitionGroups.has(transitionKey)) {
        transitionGroups.set(transitionKey, {
          key: transitionKey,
          label: `${targetGrade?.Grade_Name || ''} (${nextYear?.Year_Name || ''})`,
          classOptions
        });
      }

      if (alreadyInNextYear) skippedCount += 1;
      if (error) {
        errorCount += 1;
        const gradeName = gradeMap.get(student.Grade_ID)?.Grade_Name || '--';
        const className = classMap.get(student.Class_ID)?.Class_Name || '--';
        errorSummaries.push(`${student.Name_Ar} - ${gradeName} (${className}): ${error}`);
      }

      if (!error && !alreadyInNextYear) {
        if (action === 'promote') promoteCount += 1;
        else retainCount += 1;
        const label = action === 'promote'
          ? `${isRtl ? 'ترحيل إلى' : 'Promote to'} ${targetGrade?.Grade_Name || ''}`
          : `${isRtl ? 'إبقاء في' : 'Retain in'} ${targetGrade?.Grade_Name || ''}`;
        const key = `${action}:${targetGrade?.Grade_ID || ''}`;
        const existing = summaryMap.get(key);
        summaryMap.set(key, { label, count: existing ? existing.count + 1 : 1 });
      }

      targets.push({
        student,
        action,
        targetGrade,
        targetStage,
        targetClass: defaultClass,
        classOptions,
        needsClassSelection,
        transitionKey,
        error,
        alreadyInNextYear
      });
    });

    return {
      targets,
      promoteCount,
      retainCount,
      skippedCount,
      errorCount,
      errorSummaries,
      summary: Array.from(summaryMap.values()),
      transitionGroups: Array.from(transitionGroups.values())
    };
  };

  const openSummary = () => {
    if (!nextYear) return;
    if (selectedIds.length === 0) {
      alert(isRtl ? 'يرجى تحديد الطلاب أولاً.' : 'Please select students first.');
      return;
    }
    const nextPreview = buildPromotionPreview(selectedIds);
    const defaultSelections: Record<string, string> = {};
    nextPreview.transitionGroups.forEach((group) => {
      defaultSelections[group.key] = group.classOptions[0]?.Class_ID || '';
    });
    setTransitionSelections(defaultSelections);
    setPreview(nextPreview);
    setIsSummaryOpen(true);
  };

  const handleBulkPromotion = () => {
    if (!nextYear || !preview) return;
    const batch: StudentMaster[] = [];
    const duplicateIds = new Set<string>(nextYearNationalIds);
    const createdNationalIds = new Set<string>();
    let skipped = 0;
    let errors = 0;
    const now = Date.now();

    preview.targets.forEach((target, index) => {
      if (target.error) {
        errors += 1;
        return;
      }
      if (target.alreadyInNextYear) {
        skipped += 1;
        return;
      }
      const targetClassId =
        target.needsClassSelection && target.transitionKey
          ? transitionSelections[target.transitionKey]
          : target.targetClass?.Class_ID;
      const targetClass = targetClassId ? classMap.get(targetClassId) : null;
      if (!target.targetGrade || !targetClass) {
        errors += 1;
        return;
      }
      if (duplicateIds.has(target.student.National_ID) || createdNationalIds.has(target.student.National_ID)) {
        skipped += 1;
        return;
      }
      const newStudent: StudentMaster = {
        ...target.student,
        Student_Global_ID: `STU-${now}-${index}`,
        Academic_Year_ID: nextYear.Year_ID,
        Stage_ID: target.targetGrade.Stage_ID,
        Grade_ID: target.targetGrade.Grade_ID,
        Class_ID: targetClass.Class_ID,
        Status: target.action === 'promote' ? StudentStatus.ENROLLED : StudentStatus.REPEATING,
        Level: `${target.targetGrade.Grade_Name} - ${targetClass.Class_Name}`,
        Guardian_Phone: target.student.Father?.Mobile || target.student.Mother?.Mobile || target.student.Guardian_Phone || ''
      };
      createdNationalIds.add(target.student.National_ID);
      batch.push(newStudent);
    });

    if (batch.length > 0) {
      importStudentsBatch(batch);
    }

    alert(
      isRtl
        ? `تم ترحيل ${batch.length} طالب/ة. تم تجاوز ${skipped} طالب/ة، وأخطاء ${errors} طالب/ة.`
        : `Promoted ${batch.length} students. Skipped ${skipped}, errors ${errors}.`
    );
    setIsSummaryOpen(false);
    setPreview(null);
    setSelectedIds([]);
  };

  const actionsDisabled = !nextYear || filteredStudents.length === 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-start">
      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-orange-500 text-white rounded-2xl shadow-lg">
            <Database size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">{isRtl ? 'ترحيل الطلاب' : 'Student Promotion'}</h3>
            <p className="text-sm text-slate-500 font-bold">
              {activeYear?.Year_Name || '--'} → {nextYear?.Year_Name || (isRtl ? 'لا يوجد عام جديد' : 'No next year')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => applyBulkAction('promote')}
            disabled={actionsDisabled || selectedIds.length === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-emerald-600 text-white disabled:opacity-40"
          >
            <CheckSquare size={18} /> {isRtl ? 'ناجح - ترحيل' : 'Mark as Successful'}
          </button>
          <button
            onClick={() => applyBulkAction('retain')}
            disabled={actionsDisabled || selectedIds.length === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-rose-600 text-white disabled:opacity-40"
          >
            <ArrowRightLeft size={18} /> {isRtl ? 'راسب - إعادة' : 'Mark as Failed'}
          </button>
          <button
            onClick={openSummary}
            disabled={actionsDisabled || selectedIds.length === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-900 text-white disabled:opacity-40"
          >
            {isRtl ? 'مراجعة الترحيل' : 'Review Promotion'}
          </button>
        </div>
      </div>

      {!nextYear && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-[1.5rem] flex items-start gap-4">
          <div className="p-2 bg-white rounded-xl shadow-sm">
            <AlertTriangle size={20} className="text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-black text-amber-900">
              {isRtl ? 'برجاء إنشاء إعدادات السنة الدراسية الجديدة أولاً.' : 'Please create the new academic year settings first.'}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'المرحلة' : 'Stage'}</label>
            <select
              value={selectedStageId}
              onChange={(e) => {
                setSelectedStageId(e.target.value);
                setSelectedGradeId('');
                setSelectedClassId('');
              }}
              className="w-full mt-2 bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold"
            >
              <option value="">{isRtl ? 'كل المراحل' : 'All Stages'}</option>
              {currentStages.map((stage) => (
                <option key={stage.Stage_ID} value={stage.Stage_ID}>
                  {stage.Stage_Name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الصف' : 'Grade'}</label>
            <select
              value={selectedGradeId}
              onChange={(e) => {
                setSelectedGradeId(e.target.value);
                setSelectedClassId('');
              }}
              className="w-full mt-2 bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold"
              disabled={!selectedStageId}
            >
              <option value="">{isRtl ? 'كل الصفوف' : 'All Grades'}</option>
              {filteredGrades.map((grade) => (
                <option key={grade.Grade_ID} value={grade.Grade_ID}>
                  {grade.Grade_Name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الفصل' : 'Class'}</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full mt-2 bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold"
              disabled={!selectedGradeId}
            >
              <option value="">{isRtl ? 'كل الفصول' : 'All Classes'}</option>
              {filteredClasses.map((klass) => (
                <option key={klass.Class_ID} value={klass.Class_ID}>
                  {klass.Class_Name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse min-w-max">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-4 py-4 text-center w-12">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    disabled={actionsDisabled}
                  />
                </th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest">{isRtl ? 'اسم الطالب' : 'Student Name'}</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest">{isRtl ? 'الصف الحالي' : 'Current Grade'}</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest">{isRtl ? 'الحالة' : 'Status'}</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest">{isRtl ? 'الإجراء' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-bold text-slate-700 text-sm">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400 italic">
                    {isRtl ? 'لا توجد بيانات' : 'No students found'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const grade = gradeMap.get(student.Grade_ID);
                  return (
                    <tr key={student.Student_Global_ID} className="hover:bg-slate-50">
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                          checked={selectedIds.includes(student.Student_Global_ID)}
                          onChange={() => toggleSelectRow(student.Student_Global_ID)}
                          disabled={actionsDisabled}
                        />
                      </td>
                      <td className="px-6 py-4 text-slate-900">{student.Name_Ar}</td>
                      <td className="px-6 py-4">{grade?.Grade_Name || '--'}</td>
                      <td className="px-6 py-4">{student.Status}</td>
                      <td className="px-6 py-4">
                        <select
                          value={actionMap[student.Student_Global_ID] || 'promote'}
                          onChange={(e) =>
                            setActionMap((prev) => ({
                              ...prev,
                              [student.Student_Global_ID]: e.target.value as PromotionChoice
                            }))
                          }
                          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black"
                          disabled={actionsDisabled}
                        >
                          <option value="promote">{isRtl ? 'ناجح - ترحيل' : 'Promote'}</option>
                          <option value="retain">{isRtl ? 'راسب - إعادة' : 'Retain'}</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isSummaryOpen && preview && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900">{isRtl ? 'ملخص الترحيل' : 'Promotion Summary'}</h3>
                <p className="text-xs font-bold text-slate-400">
                  {activeYear?.Year_Name} → {nextYear?.Year_Name}
                </p>
              </div>
              <button onClick={() => setIsSummaryOpen(false)} className="p-2 rounded-xl hover:bg-rose-50 text-slate-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6 text-start">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                  <p className="text-xs font-black text-emerald-500 uppercase">{isRtl ? 'ناجح' : 'Promoted'}</p>
                  <p className="text-2xl font-black text-emerald-700">{preview.promoteCount}</p>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                  <p className="text-xs font-black text-rose-500 uppercase">{isRtl ? 'راسب' : 'Retained'}</p>
                  <p className="text-2xl font-black text-rose-700">{preview.retainCount}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <p className="text-xs font-black text-slate-400 uppercase">{isRtl ? 'متجاوز' : 'Skipped'}</p>
                  <p className="text-2xl font-black text-slate-600">{preview.skippedCount}</p>
                </div>
              </div>

              {preview.summary.length > 0 && (
                <div className="space-y-2">
                  {preview.summary.map((item) => (
                    <div key={item.label} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                      <span className="text-sm font-bold text-slate-700">{item.label}</span>
                      <span className="text-sm font-black text-slate-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              )}

              {preview.transitionGroups.length > 0 && (
                <div className="space-y-4">
                  <p className="text-sm font-black text-slate-700">
                    {isRtl ? 'اختيار الفصل للترحيل بين المراحل' : 'Select target class for stage transitions'}
                  </p>
                  {preview.transitionGroups.map((group) => (
                    <div key={group.key} className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{group.label}</label>
                      <select
                        value={transitionSelections[group.key] || ''}
                        onChange={(e) =>
                          setTransitionSelections((prev) => ({
                            ...prev,
                            [group.key]: e.target.value
                          }))
                        }
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold"
                      >
                        {group.classOptions.map((klass) => (
                          <option key={klass.Class_ID} value={klass.Class_ID}>
                            {klass.Class_Name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {preview.errorCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm font-bold text-amber-700 space-y-2">
                  <p>
                    {isRtl
                      ? "???? ???? ????? ????? ?? ?????????. ???? ???????."
                      : "Some students have missing setup. They will be skipped."}
                  </p>
                  {preview.errorSummaries.length > 0 && (
                    <div className="max-h-40 overflow-y-auto text-xs font-bold text-amber-800 space-y-1">
                      {preview.errorSummaries.slice(0, 20).map((item) => (
                        <div key={item}>{item}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-4 px-8 py-6 border-t border-slate-100 bg-slate-50/30">
              <button
                onClick={() => setIsSummaryOpen(false)}
                className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-black text-xs uppercase tracking-widest"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleBulkPromotion}
                className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-lg"
              >
                {isRtl ? 'تأكيد الترحيل' : 'Confirm Promotion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPromotion;
