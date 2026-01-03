import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccounts } from './useAccountsLogic';
import { useStore } from '../store';
import { AccountType } from '../src/types/accounts.types';
import { Grade } from '../types';
import {
  FeeHead,
  FeeHeadType,
  GradeFeeItem,
  GradeFeeStructure
} from '../src/types/finance.types';

const FEE_HEADS_KEY = 'SCHOOL_COA_FEE_HEADS';
const FEE_STRUCTURES_KEY = 'SCHOOL_COA_FEE_STRUCTURES';

const safeParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const loadState = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  const stored = safeParse<T[]>(window.localStorage.getItem(key));
  return (stored && stored.length ? stored : fallback) as T;
};

export const useFeeConfiguration = () => {
  const store = useStore();
  const { accounts } = useAccounts();
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>(() => loadState<FeeHead[]>(FEE_HEADS_KEY, []));
  const [gradeFeeStructures, setGradeFeeStructures] = useState<GradeFeeStructure[]>(() =>
    loadState<GradeFeeStructure[]>(FEE_STRUCTURES_KEY, [])
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(FEE_HEADS_KEY, JSON.stringify(feeHeads));
  }, [feeHeads]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(FEE_STRUCTURES_KEY, JSON.stringify(gradeFeeStructures));
  }, [gradeFeeStructures]);

  const calculateStructureTotal = useCallback((items: GradeFeeItem[]) => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  }, []);

  const validateRevenueAccount = useCallback(
    (linkedRevenueAccountId: string) => {
      const account = accounts.find((item) => item.id === linkedRevenueAccountId);
      if (!account || account.type !== AccountType.REVENUE) {
        throw new Error('linkedRevenueAccountId must reference a revenue leaf account.');
      }
    },
    [accounts]
  );

  const addFeeHead = useCallback(
    (head: FeeHead) => {
      if (feeHeads.some((item) => item.id === head.id)) {
        throw new Error('هذا الرسم موجود مسبقاً.');
      }
      validateRevenueAccount(head.linkedRevenueAccountId);
      setFeeHeads((prev) => [...prev, head]);
    },
    [feeHeads, validateRevenueAccount]
  );

  const updateGradeStructure = useCallback(
    (structureId: string, updater: (structure: GradeFeeStructure) => GradeFeeStructure) => {
      setGradeFeeStructures((prev) =>
        prev.map((structure) => (structure.id === structureId ? updater(structure) : structure))
      );
    },
    []
  );

  const addGradeFeeItem = useCallback(
    (structureId: string, item: GradeFeeItem) => {
      let duplicate = false;
      updateGradeStructure(structureId, (structure) => {
        if (structure.items.some((entry) => entry.feeHeadId === item.feeHeadId)) {
          duplicate = true;
          return structure;
        }
        const updatedItems = [...structure.items, item];
        return {
          ...structure,
          items: updatedItems,
          totalAmount: calculateStructureTotal(updatedItems)
        };
      });
      if (duplicate) {
        throw new Error('تم إضافة هذا البند لهذا الصف مسبقاً.');
      }
    },
    [calculateStructureTotal, updateGradeStructure]
  );

  const updateGradeFeeItemAmount = useCallback(
    (structureId: string, feeHeadId: string, amount: number) => {
      updateGradeStructure(structureId, (structure) => {
        const updatedItems = structure.items.map((item) =>
          item.feeHeadId === feeHeadId ? { ...item, amount } : item
        );
        return {
          ...structure,
          items: updatedItems,
          totalAmount: calculateStructureTotal(updatedItems)
        };
      });
    },
    [calculateStructureTotal, updateGradeStructure]
  );

  const updateGradeFeeItem = useCallback(
    (structureId: string, feeHeadId: string, payload: Partial<GradeFeeItem>) => {
      updateGradeStructure(structureId, (structure) => {
        const updatedItems = structure.items.map((item) =>
          item.feeHeadId === feeHeadId ? { ...item, ...payload } : item
        );
        return {
          ...structure,
          items: updatedItems,
          totalAmount: calculateStructureTotal(updatedItems)
        };
      });
    },
    [calculateStructureTotal, updateGradeStructure]
  );

  const deleteGradeFeeItem = useCallback(
    (structureId: string, feeHeadId: string) => {
      updateGradeStructure(structureId, (structure) => {
        const filteredItems = structure.items.filter((item) => item.feeHeadId !== feeHeadId);
        return {
          ...structure,
          items: filteredItems,
          totalAmount: calculateStructureTotal(filteredItems)
        };
      });
    },
    [calculateStructureTotal, updateGradeStructure]
  );

  const initializeYearFees = useCallback(
    (yearId: string) => {
      const gradesForYear = (store.allGrades || []).filter((grade: Grade) => {
        const gradeYear = grade.Academic_Year_ID || grade.Year_ID || '';
        return gradeYear === yearId;
      });

      if (!gradesForYear.length) return;

      setGradeFeeStructures((prev) => {
        const existingForYear = prev.filter((structure) => structure.academicYearId === yearId);
        const otherYears = prev.filter((structure) => structure.academicYearId !== yearId);
        const structuresForYear = [...existingForYear];

        gradesForYear.forEach((grade) => {
          const alreadyExists = structuresForYear.some(
            (structure) => structure.gradeId === grade.Grade_ID
          );
          if (!alreadyExists) {
            structuresForYear.push({
              id: `GFS-${yearId}-${grade.Grade_ID}`,
              academicYearId: yearId,
              gradeId: grade.Grade_ID,
              items: [],
              totalAmount: 0
            });
          }
        });

        return [...otherYears, ...structuresForYear];
      });
    },
    [store.allGrades]
  );

  const feeStructuresByGrade = useMemo(
    () =>
      gradeFeeStructures.reduce<Record<string, GradeFeeStructure>>((acc, structure) => {
        acc[`${structure.academicYearId}:${structure.gradeId}`] = structure;
        return acc;
      }, {}),
    [gradeFeeStructures]
  );

  return {
    feeHeads,
    gradeFeeStructures,
    feeStructuresByGrade,
    initializeYearFees,
    addFeeHead,
    addGradeFeeItem,
    updateGradeFeeItemAmount,
    updateGradeFeeItem,
    deleteGradeFeeItem,
    calculateStructureTotal
  };
};
