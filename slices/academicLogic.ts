import { setRedistributingStudentsFlag } from '../services/redistributionGuard';

const getItemYearId = (item: { Academic_Year_ID?: string; Year_ID?: string } | null | undefined) =>
  item?.Academic_Year_ID || item?.Year_ID || '';

const cloneYearStructure = (prev: any, sourceYearId?: string, targetYearId?: string) => {
  if (!sourceYearId || !targetYearId) return prev;

  const hasTargetData =
    (prev.stages || []).some((stage: any) => getItemYearId(stage) === targetYearId)
    || (prev.grades || []).some((grade: any) => getItemYearId(grade) === targetYearId)
    || (prev.classes || []).some((klass: any) => getItemYearId(klass) === targetYearId)
    || (prev.feeItems || []).some((item: any) => getItemYearId(item) === targetYearId)
    || (prev.feeStructure || []).some((structure: any) => getItemYearId(structure) === targetYearId);

  if (hasTargetData) return prev;

  const stamp = Date.now();

  const sourceStages = (prev.stages || []).filter((stage: any) => getItemYearId(stage) === sourceYearId);
  const stageIdMap = new Map<string, string>();
  const clonedStages = sourceStages.map((stage: any, index: number) => {
    const newId = `STG-${stamp}-${index}`;
    stageIdMap.set(stage.Stage_ID, newId);
    return {
      ...stage,
      Stage_ID: newId,
      Academic_Year_ID: targetYearId
    };
  });

  const sourceGrades = (prev.grades || []).filter((grade: any) => getItemYearId(grade) === sourceYearId);
  const gradeIdMap = new Map<string, string>();
  const clonedGrades = sourceGrades.map((grade: any, index: number) => {
    const newId = `GRD-${stamp}-${index}`;
    gradeIdMap.set(grade.Grade_ID, newId);
    return {
      ...grade,
      Grade_ID: newId,
      Stage_ID: stageIdMap.get(grade.Stage_ID) || grade.Stage_ID,
      Academic_Year_ID: targetYearId
    };
  });

  const sourceClasses = (prev.classes || []).filter((klass: any) => getItemYearId(klass) === sourceYearId);
  const clonedClasses = sourceClasses.map((klass: any, index: number) => {
    const newId = `CLS-${stamp}-${index}`;
    return {
      ...klass,
      Class_ID: newId,
      Grade_ID: gradeIdMap.get(klass.Grade_ID) || klass.Grade_ID,
      Year_ID: targetYearId,
      Academic_Year_ID: targetYearId,
      capacity: normalizeCapacity(klass.capacity ?? klass.Capacity ?? 40)
    };
  });

  const sourceFeeItems = (prev.feeItems || []).filter((item: any) => getItemYearId(item) === sourceYearId);
  const feeItemIdMap = new Map<string, string>();
  const clonedFeeItems = sourceFeeItems.map((item: any, index: number) => {
    const newId = `FEE-${stamp}-${index}`;
    feeItemIdMap.set(item.Fee_ID, newId);
    return {
      ...item,
      Fee_ID: newId,
      Academic_Year_ID: targetYearId
    };
  });

  const sourceFeeStructure = (prev.feeStructure || []).filter((structure: any) => getItemYearId(structure) === sourceYearId);
  const clonedFeeStructure = sourceFeeStructure.map((structure: any, index: number) => ({
    ...structure,
    Structure_ID: `STR-${stamp}-${index}`,
    Grade_ID: gradeIdMap.get(structure.Grade_ID) || structure.Grade_ID,
    Fee_ID: feeItemIdMap.get(structure.Fee_ID) || structure.Fee_ID,
    Year_ID: targetYearId,
    Academic_Year_ID: targetYearId
  }));

  return {
    ...prev,
    stages: [...(prev.stages || []), ...clonedStages],
    grades: [...(prev.grades || []), ...clonedGrades],
    classes: [...(prev.classes || []), ...clonedClasses],
    feeItems: [...(prev.feeItems || []), ...clonedFeeItems],
    feeStructure: [...(prev.feeStructure || []), ...clonedFeeStructure]
  };
};

const normalizeCapacity = (raw: any) => {
  const numeric = Number(raw);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 40;
};

export const getAcademicActions = (
  setDb: any,
  activeSchool: any,
  logAction: any,
  getActiveYearId: () => string,
  getDbSnapshot?: () => any,
  setRedistributionState?: (value: boolean) => void
) => ({
  // إضافة عام دراسي
  addYear: (name: string, start: string, end: string) => {
    const id = `YEAR-${Date.now()}`;
    setDb((prev: any) => ({
      ...prev,
      years: [...(prev.years || []), { Year_ID: id, School_ID: activeSchool.School_ID, Year_Name: name, Start_Date: start, End_Date: end, Is_Active: false }]
    }));
    logAction({ Action_Ar: `إضافة عام دراسي: ${name}`, Action_Type: 'add', Record_ID: id, Page_Name_Ar: 'الإعدادات العامة' });
    return id;
  },
  updateYear: (id: string, data: any) => setDb((prev: any) => ({
    ...prev,
    years: prev.years.map((y: any) => y.Year_ID === id ? { ...y, ...data } : y)
  })),
  deleteYear: (id: string) => setDb((prev: any) => ({
    ...prev,
    years: prev.years.filter((y: any) => y.Year_ID !== id)
  })),
  toggleYearStatus: (id: string) => setDb((prev: any) => {
    const target = prev.years.find((y: any) => y.Year_ID === id);
    if (!target) return prev;

    const isActivating = !target.Is_Active;
    const previousActiveYear = prev.years.find((y: any) => y.Is_Active && y.Year_ID !== id);

    const years = prev.years.map((y: any) => ({
      ...y,
      Is_Active: y.Year_ID === id ? isActivating : (isActivating ? false : y.Is_Active)
    }));

    let nextState = { ...prev, years };
    if (isActivating) {
      nextState = cloneYearStructure(nextState, previousActiveYear?.Year_ID, id);
    }

    return nextState;
  }),

  // إضافة مرحلة تعليمية
  addStage: (name: string) => {
    const id = `STG-${Date.now().toString().slice(-4)}`;
    const yearId = getActiveYearId();
    setDb((prev: any) => {
      const resolvedYearId = yearId || prev.years.find((y: any) => y.Is_Active)?.Year_ID || prev.years?.[0]?.Year_ID || '';
      return {
        ...prev,
        stages: [...(prev.stages || []), { Stage_ID: id, Stage_Name: name, Academic_Year_ID: resolvedYearId }]
      };
    });
    logAction({ Action_Ar: `????? ?????: ${name}`, Action_Type: 'add', Record_ID: id, Page_Name_Ar: '????????? ??????' });
    return id;
  },
  updateStage: (id: string, name: string) => setDb((prev: any) => ({
    ...prev,
    stages: (prev.stages || []).map((stg: any) => stg.Stage_ID === id ? { ...stg, Stage_Name: name } : stg)
  })),
  deleteStage: (id: string) => setDb((prev: any) => ({
    ...prev,
    stages: (prev.stages || []).filter((stg: any) => stg.Stage_ID !== id)
  })),

  // إضافة صف
  addGrade: (stageId: string, name: string) => {
    const id = `GRD-${Date.now()}`;
    const yearId = getActiveYearId();
    setDb((prev: any) => {
      const resolvedYearId = yearId || prev.years.find((y: any) => y.Is_Active)?.Year_ID || prev.years?.[0]?.Year_ID || '';
      return {
        ...prev,
        grades: [...(prev.grades || []), { Grade_ID: id, Stage_ID: stageId, Grade_Name: name, Academic_Year_ID: resolvedYearId }]
      };
    });
    logAction({ Action_Ar: `????? ??: ${name}`, Action_Type: 'add', Record_ID: id, Page_Name_Ar: '????????? ??????' });
    return id;
  },
  updateGrade: (id: string, name: string, isActive: boolean = true) => setDb((prev: any) => ({
    ...prev,
    grades: prev.grades.map((g: any) => g.Grade_ID === id ? { ...g, Grade_Name: name, Is_Active: isActive } : g)
  })),
  deleteGrade: (id: string) => setDb((prev: any) => ({
    ...prev,
    grades: prev.grades.filter((g: any) => g.Grade_ID !== id)
  })),

  // إضافة فصل
  addClass: (data: any) => {
    const yearId = data.Year_ID || getActiveYearId();
    const id = `CLS-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    setDb((prev: any) => {
      const resolvedYearId = yearId || prev.years.find((y: any) => y.Is_Active)?.Year_ID || prev.years?.[0]?.Year_ID || '';
      const resolvedCapacity = normalizeCapacity(data?.capacity ?? data?.Capacity ?? 40);
      const payload: any = {
        ...(data ? { ...data } : {}),
        Class_ID: id,
        Year_ID: resolvedYearId,
        Academic_Year_ID: resolvedYearId,
        capacity: resolvedCapacity
      };
      delete payload.Capacity;
      return {
        ...prev,
        classes: [...(prev.classes || []), payload]
      };
    });
    return id;
  },
  updateClass: (id: string, data: any) => setDb((prev: any) => ({
    ...prev,
    classes: prev.classes.map((c: any) => {
      if (c.Class_ID !== id) return c;
      const nextCapacity = data && (data.capacity !== undefined || data.Capacity !== undefined)
        ? normalizeCapacity((data as any).capacity ?? (data as any).Capacity ?? c.capacity ?? c.Capacity ?? 40)
        : normalizeCapacity(c.capacity ?? c.Capacity ?? 40);
      const updatePayload: any = {
        ...c,
        ...data,
        capacity: nextCapacity
      };
      delete updatePayload.Capacity;
      updatePayload.Class_ID = c.Class_ID;
      return updatePayload;
    })
  })),
  deleteClass: (id: string, redistributeToId?: string) => {
    let outcome: { ok: boolean; errorCode?: string } = { ok: true };
    setDb((prev: any) => {
      const classStudents = (prev.students || []).filter((s: any) => s.Class_ID === id);
      const studentIds = classStudents.map((s: any) => s.Student_ID);
      const hasFinancial = (prev.receipts || []).some((r: any) => r.Student_ID && studentIds.includes(r.Student_ID));

      if (hasFinancial) {
        outcome = { ok: false, errorCode: 'CLASS_DELETE_BLOCKED_FINANCIAL' };
        return prev;
      }

      const updatedClasses = prev.classes.filter((c: any) => c.Class_ID !== id);

      if (!classStudents.length) {
        return { ...prev, classes: updatedClasses };
      }

      // If no target provided, detach students; otherwise move them.
      const targetExists = redistributeToId
        ? (prev.classes || []).some((c: any) => c.Class_ID === redistributeToId)
        : false;

      const updatedStudents = (prev.students || []).map((s: any) => {
        if (s.Class_ID !== id) return s;
        if (redistributeToId && targetExists) return { ...s, Class_ID: redistributeToId };
        return { ...s, Class_ID: null };
      });

      return { ...prev, classes: updatedClasses, students: updatedStudents };
    });
    return outcome;
  }
,
  redistributeStudents: ({ gradeId, mode }: { gradeId?: string; mode: 'MIXED' | 'SEPARATE' }) => {
    const snapshot = getDbSnapshot?.() || {};
    const normalizeName = (raw: string) => {
      const base = (raw || '').toString().trim().replace(/\s+/g, ' ');
      const unifiedLetters = base
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/[ىيئ]/g, 'ي');
      return unifiedLetters.normalize('NFD').replace(/[\u064B-\u065F]/g, '');
    };
    const normalizeGender = (g?: string | null) => (g || '').toString().trim().toLowerCase();
    const isMale = (g?: string | null) => {
      const norm = normalizeGender(g).replace(/\s+/g, '');
      return norm === 'male' || norm === 'm' || norm === 'ذكر' || norm === 'ولد' || norm.startsWith('ذكر');
    };
    const isFemale = (g?: string | null) => {
      const norm = normalizeGender(g).replace(/\s+/g, '');
      return norm === 'female' || norm === 'f' || norm === 'أنثى' || norm === 'بنت' || norm.startsWith('انثى');
    };

    const getStudentKey = (student: any) => {
      const parts = [
        student?.Student_ID,
        student?.Student_Global_ID,
        student?.Student_Number,
        student?.Gov_Code,
        student?.National_ID
      ].filter(Boolean);
      if (parts.length) return String(parts[0]);
      const name = student?.Name_Ar || student?.Full_Name || student?.name || '';
      const dob = student?.DOB || student?.Date_Of_Birth || '';
      const gender = student?.Gender || student?.gender || '';
      return `STU-KEY-${name}-${dob}-${gender}`.trim() || `STU-KEY-${Math.random().toString(36).slice(2, 8)}`;
    };

    const assignRoundRobin = (
      studentsList: any[],
      classIds: string[],
      remainingCapacity: Map<string, number>
    ) => {
      if (!classIds.length) {
        throw new Error('REDISTRIBUTION_NO_CLASSES');
      }
      let pointer = 0;
      const assignments = new Map<string, string>();
      studentsList.forEach((student) => {
        const studentKey = getStudentKey(student);
        let placed = false;
        for (let attempt = 0; attempt < classIds.length; attempt++) {
          const idx = (pointer + attempt) % classIds.length;
          const targetId = classIds[idx];
          const left = remainingCapacity.get(targetId) || 0;
          if (left > 0) {
            assignments.set(studentKey, targetId);
            remainingCapacity.set(targetId, left - 1);
            pointer = (idx + 1) % classIds.length;
            placed = true;
            break;
          }
        }
        if (!placed) {
          throw new Error('REDISTRIBUTION_CAPACITY_EXCEEDED');
        }
      });
      return assignments;
    };

    const planRedistribution = (targetGradeId: string) => {
      const activeYearId = getActiveYearId();
      const normalizeId = (v: any) => (v ?? '').toString().trim();
      const isSameGrade = (value: any) => normalizeId(value) === normalizeId(targetGradeId);
      const isSameYear = (entity: any) => {
        if (!activeYearId) return true;
        const yearValue = entity?.Year_ID || entity?.Academic_Year_ID;
        return !yearValue || yearValue === activeYearId;
      };

      const gradeClasses = (snapshot.classes || []).filter(
        (c: any) => isSameGrade(c.Grade_ID) && isSameYear(c)
      );
      if (!gradeClasses.length) throw new Error('REDISTRIBUTION_NO_CLASSES');

      const studentsInGrade = (snapshot.students || []).filter(
        (s: any) => isSameGrade(s.Grade_ID) && isSameYear(s)
      );
      if (studentsInGrade.length === 0) throw new Error('REDISTRIBUTION_EMPTY_RESULT');

      const baseCapacity = new Map<string, number>();
      gradeClasses.forEach((cls: any) => {
        const cap = normalizeCapacity(cls.capacity ?? cls.Capacity ?? 40);
        baseCapacity.set(cls.Class_ID, Math.max(0, cap));
      });

      const totalAvailable = Array.from(baseCapacity.values()).reduce((sum, value) => sum + value, 0);
      if (totalAvailable < studentsInGrade.length) {
        throw new Error('REDISTRIBUTION_CAPACITY_EXCEEDED');
      }

      const sortStudents = (list: any[]) =>
        [...list].sort((a, b) => normalizeName(a.Name_Ar || a.Full_Name || a.name || '').localeCompare(
          normalizeName(b.Name_Ar || b.Full_Name || b.name || ''),
          'ar',
          { sensitivity: 'base' }
        ));

      const assignments = new Map<string, string>();

      const sortedClasses = [...gradeClasses].map((cls: any) => ({
        ...cls,
        capacity: normalizeCapacity(cls.capacity ?? cls.Capacity ?? 40)
      })).sort((a, b) => {
        if (b.capacity !== a.capacity) return b.capacity - a.capacity;
        return (a.Class_Name || '').toString().localeCompare((b.Class_Name || '').toString(), 'ar', { sensitivity: 'base' });
      });

      if (mode === 'SEPARATE') {
        const males = sortStudents(studentsInGrade.filter((s: any) => isMale(s.Gender || s.gender)));
        const females = sortStudents(studentsInGrade.filter((s: any) => isFemale(s.Gender || s.gender)));
        const unknowns = sortStudents(studentsInGrade.filter((s: any) => !isMale(s.Gender || s.gender) && !isFemale(s.Gender || s.gender)));

        const maleClasses: string[] = [];
        const femaleClasses: string[] = [];

        if (males.length && females.length) {
          // وزع الفصول حسب الاحتياج الفعلي بالسعة المتبقية
          let remainingMale = males.length;
          let remainingFemale = females.length;
          sortedClasses.forEach((cls: any) => {
            const cid = cls.Class_ID;
            const cap = baseCapacity.get(cid) || 0;
            if (remainingMale >= remainingFemale) {
              maleClasses.push(cid);
              remainingMale = Math.max(0, remainingMale - cap);
            } else {
              femaleClasses.push(cid);
              remainingFemale = Math.max(0, remainingFemale - cap);
            }
          });
          if (!maleClasses.length || !femaleClasses.length) {
            throw new Error('REDISTRIBUTION_NO_GENDER_CLASSES');
          }
          const maleCapacity = maleClasses.reduce((sum, cid) => sum + (baseCapacity.get(cid) || 0), 0);
          const femaleCapacity = femaleClasses.reduce((sum, cid) => sum + (baseCapacity.get(cid) || 0), 0);
          if (maleCapacity < males.length || femaleCapacity < females.length) {
            // إذا مجموع السعات لا يغطي أحد الجنسين، fallback للمختلط على هذا الصف فقط
            assignments.clear();
            const sorted = sortStudents(studentsInGrade);
            const targetClassIds = sortedClasses.map((c: any) => c.Class_ID);
            const mixedAssign = assignRoundRobin(sorted, targetClassIds, new Map(baseCapacity));
            mixedAssign.forEach((v, k) => assignments.set(k, v));
            return assignments;
          }
        } else if (males.length && !females.length) {
          maleClasses.push(...sortedClasses.map((c: any) => c.Class_ID));
        } else if (!males.length && females.length) {
          femaleClasses.push(...sortedClasses.map((c: any) => c.Class_ID));
        } else {
          // لا توجد بيانات نوع واضحة؛ fallback لمختلط
          const sorted = sortStudents(studentsInGrade);
          const targetClassIds = sortedClasses.map((c: any) => c.Class_ID);
          const mixedAssign = assignRoundRobin(sorted, targetClassIds, new Map(baseCapacity));
          mixedAssign.forEach((v, k) => assignments.set(k, v));
          return assignments;
        }

        try {
          const sharedCapacity = new Map(baseCapacity);
          const maleCapacity = maleClasses.reduce((sum, cid) => sum + (sharedCapacity.get(cid) || 0), 0);
          const femaleCapacity = femaleClasses.reduce((sum, cid) => sum + (sharedCapacity.get(cid) || 0), 0);
          if (unknowns.length) {
            const target = maleCapacity >= femaleCapacity ? males : females;
            target.push(...unknowns);
          }
          if (males.length) {
            const maleAssign = assignRoundRobin(males, maleClasses, sharedCapacity);
            maleAssign.forEach((v, k) => assignments.set(k, v));
          }
          if (females.length) {
            const femaleAssign = assignRoundRobin(females, femaleClasses, sharedCapacity);
            femaleAssign.forEach((v, k) => assignments.set(k, v));
          }
        } catch (err: any) {
          if (err?.message === 'REDISTRIBUTION_CAPACITY_EXCEEDED') {
            // fallback to mixed if gender split cannot satisfy capacity
            assignments.clear();
            const sorted = sortStudents(studentsInGrade);
            const targetClassIds = sortedClasses.map((c: any) => c.Class_ID);
            const mixedAssign = assignRoundRobin(sorted, targetClassIds, new Map(baseCapacity));
            mixedAssign.forEach((v, k) => assignments.set(k, v));
          } else {
            throw err;
          }
        }
      } else {
        const sorted = sortStudents(studentsInGrade);
        const targetClassIds = sortedClasses.map((c: any) => c.Class_ID);
        const mixedAssign = assignRoundRobin(sorted, targetClassIds, new Map(baseCapacity));
        mixedAssign.forEach((v, k) => assignments.set(k, v));
      }

      return assignments;
    };

    const activeYearId = getActiveYearId();
    const gradeIdsToProcess = (() => {
      const normalizeId = (v: any) => (v ?? '').toString().trim();
      if (gradeId && gradeId !== 'ALL_GRADES') return [gradeId];
      const byGrade = new Set<string>();
      (snapshot.classes || []).forEach((c: any) => {
        if (activeYearId && (c.Year_ID || c.Academic_Year_ID) && (c.Year_ID || c.Academic_Year_ID) !== activeYearId) return;
        if (c.Grade_ID) byGrade.add(normalizeId(c.Grade_ID));
      });
      (snapshot.students || []).forEach((s: any) => {
        if (activeYearId && (s.Year_ID || s.Academic_Year_ID) && (s.Year_ID || s.Academic_Year_ID) !== activeYearId) return;
        if (s.Grade_ID) byGrade.add(normalizeId(s.Grade_ID));
      });
      return Array.from(byGrade);
    })();

    if (!gradeIdsToProcess.length) {
      throw new Error('REDISTRIBUTION_EMPTY_RESULT');
    }

    const assignments = new Map<string, string>();
    let processedAny = false;
    let capacityError: Error | null = null;
    gradeIdsToProcess.forEach((gid) => {
      try {
        const gradeAssignments = planRedistribution(gid);
        if (gradeAssignments.size === 0) return;
        processedAny = true;
        gradeAssignments.forEach((v, k) => assignments.set(k, v));
      } catch (err: any) {
        const msg = err?.message || '';
        if (msg === 'REDISTRIBUTION_EMPTY_RESULT' || msg === 'REDISTRIBUTION_NO_CLASSES') {
          return; // تخطى الصفوف الخالية أو بلا فصول
        }
        if (msg === 'REDISTRIBUTION_CAPACITY_EXCEEDED') {
          capacityError = err;
          return;
        }
        throw err;
      }
    });

    if (capacityError) {
      throw capacityError;
    }
    if (!processedAny) {
      throw new Error('REDISTRIBUTION_EMPTY_RESULT');
    }

    setRedistributingStudentsFlag(true);
    setRedistributionState?.(true);
    try {
      setDb((prev: any) => {
      const redistributed = (prev.students || []).map((s: any) => {
        const studentKey = getStudentKey(s);
        if (!assignments.has(studentKey)) return s;
        return { ...s, Class_ID: assignments.get(studentKey) };
      });
        return { ...prev, students: redistributed };
      });
    } finally {
      setTimeout(() => {
        setRedistributingStudentsFlag(false);
        setRedistributionState?.(false);
      }, 0);
    }
  }
});

// Dev-only helper for manual checks
export const __devCheckClassDeleteGuards = (db: any, classId: string, redistributeToId?: string) => {
  const classStudents = (db?.students || []).filter((s: any) => s.Class_ID === classId);
  if (classStudents.length === 0) return { ok: true, reason: 'EMPTY_CLASS' };
  const studentIds = classStudents.map((s: any) => s.Student_ID);
  const hasFinancial = (db?.receipts || []).some((r: any) => r.Student_ID && studentIds.includes(r.Student_ID));
  if (hasFinancial) return { ok: false, errorCode: 'CLASS_DELETE_BLOCKED_FINANCIAL' };
  if (!redistributeToId) return { ok: false, errorCode: 'CLASS_DELETE_BLOCKED_HAS_STUDENTS_NEEDS_REDISTRIBUTION' };
  const targetExists = (db?.classes || []).some((c: any) => c.Class_ID === redistributeToId);
  if (!targetExists) return { ok: false, errorCode: 'CLASS_DELETE_BLOCKED_HAS_STUDENTS_NEEDS_REDISTRIBUTION' };
  return { ok: true, reason: 'REDISTRIBUTED' };
};
