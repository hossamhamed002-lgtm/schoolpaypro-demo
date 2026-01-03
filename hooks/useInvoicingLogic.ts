import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccounts } from './useAccountsLogic';
import { useFeeConfiguration } from './useFeeConfiguration';
import { useStore } from '../store';
import { Invoice, InvoiceItem } from '../src/types/invoicing.types';
import { GradeFeeStructure, AppliedDiscount, DiscountCategory, DiscountType, FeeHead } from '../src/types/finance.types';

const STORAGE_KEY = 'SCHOOL_INVOICING_RECORDS';

const safeParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const loadInvoices = (): Invoice[] => {
  if (typeof window === 'undefined') return [];
  return safeParse<Invoice[]>(window.localStorage.getItem(STORAGE_KEY)) ?? [];
};

interface InvoicePreview {
  studentId: string;
  studentName: string;
  gradeId: string;
  gradeName: string;
  items: InvoiceItem[];
  totalAmount: number;
  skipped?: boolean;
  reason?: string;
  appliedDiscounts?: AppliedDiscount[];
}

export const useInvoicing = () => {
  const store = useStore();
  const { accounts, postTransactions, findByCode } = useAccounts();
  const { feeHeads, gradeFeeStructures } = useFeeConfiguration();

  const [invoices, setInvoices] = useState<Invoice[]>(() => loadInvoices());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  }, [invoices]);

  const normalizeId = (value?: string | number | null) => String(value ?? '').trim();
  const normalizeName = (value?: string | number | null) => normalizeId(value).toLowerCase();

  const gradeStructuresByGrade = useMemo(() => {
    const map = new Map<string, GradeFeeStructure>();
    gradeFeeStructures.forEach((structure) => {
      if (structure.academicYearId === store.workingYearId) {
        map.set(normalizeId(structure.gradeId), structure);
      }
    });
    return map;
  }, [gradeFeeStructures, store.workingYearId]);

  const legacyStructuresByGrade = useMemo(() => {
    const map = new Map<string, GradeFeeStructure>();
    const yearId = store.workingYearId;
    if (!yearId) return map;

    const resolveRevenueAccountId = (incomeAccId?: string) => {
      if (!incomeAccId) return '';
      const direct = accounts.find((account) => account.id === incomeAccId);
      if (direct) return direct.id;
      const byCode = findByCode(incomeAccId);
      return byCode?.id ?? '';
    };

    const gradeNameById = new Map(
      (store.grades || []).map((grade: any) => [normalizeId(grade.Grade_ID), normalizeName(grade.Grade_Name)])
    );
    const gradeIdByName = new Map(
      (store.grades || []).map((grade: any) => [normalizeName(grade.Grade_Name), normalizeId(grade.Grade_ID)])
    );
    const classByKey = new Map<string, any>();
    (store.classes || []).forEach((klass: any) => {
      const idKey = normalizeId(klass.Class_ID);
      const nameKey = normalizeName(klass.Class_Name);
      if (idKey) classByKey.set(idKey, klass);
      if (nameKey) classByKey.set(nameKey, klass);
    });

    const upsertStructure = (key: string, item: GradeFeeItem) => {
      if (!key) return;
      const existing = map.get(key) || {
        id: `LEGACY-${yearId}-${key}`,
        academicYearId: yearId,
        gradeId: key,
        items: [],
        totalAmount: 0
      };
      existing.items.push(item);
      existing.totalAmount = existing.items.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      map.set(key, existing);
    };

    (store.feeStructure || [])
      .filter((structure: any) => normalizeId(structure.Academic_Year_ID) === normalizeId(yearId))
      .forEach((structure: any) => {
        let gradeIdKey = normalizeId(structure.Grade_ID);
        let gradeNameKey = normalizeName(structure.Grade_Name) || gradeNameById.get(gradeIdKey) || '';
        if (!gradeIdKey && gradeNameKey && gradeIdByName.has(gradeNameKey)) {
          gradeIdKey = gradeIdByName.get(gradeNameKey) || '';
        }
        if (!gradeIdKey && !gradeNameKey) {
          const classIdKey = normalizeId(structure.Class_ID) || normalizeId(structure.ClassId);
          const classNameKey = normalizeName(structure.Class_Name) || normalizeName(structure.className);
          const klass = classByKey.get(classIdKey) || classByKey.get(classNameKey);
          if (klass) {
            gradeIdKey = normalizeId(klass.Grade_ID);
            gradeNameKey = gradeNameById.get(gradeIdKey) || '';
          }
        }
        if (!gradeIdKey && !gradeNameKey) return;
        const feeIdKey = normalizeId(structure.Fee_ID);
        if (!feeIdKey) return;
        const feeItem = (store.feeItems || []).find(
          (item: any) => normalizeId(item.Fee_ID) === feeIdKey
        );
        const revenueAccountId = feeItem
          ? resolveRevenueAccountId(feeItem.Income_Acc_ID) || normalizeId(feeItem.Income_Acc_ID)
          : '';
        const item: GradeFeeItem = {
          feeHeadId: feeIdKey,
          amount: Number(structure.Amount || 0),
          revenueAccountId
        };
        if (gradeIdKey) upsertStructure(gradeIdKey, item);
        if (gradeNameKey) upsertStructure(gradeNameKey, item);
      });

    return map;
  }, [
    store.feeStructure,
    store.feeItems,
    store.grades,
    store.classes,
    store.workingYearId,
    accounts,
    findByCode
  ]);

  const feeHeadMap = useMemo(() => new Map(feeHeads.map((head) => [head.id, head])), [feeHeads]);

  const applyDiscounts = useCallback(
    (items: InvoiceItem[], discounts: AppliedDiscount[] = []) => {
      return items.map((item) => {
        let remaining = item.amount;
        const applicable = discounts.filter((disc) => disc.feeHeadId === item.feeHeadId);
        const applied: AppliedDiscount[] = [];
        for (const disc of applicable) {
          const current = { ...disc };
          let deduction = 0;
          if (disc.category === DiscountCategory.FULL_EXEMPTION) {
            deduction = remaining;
            remaining = 0;
          } else if (disc.type === DiscountType.PERCENTAGE) {
            deduction = (disc.value / 100) * remaining;
            deduction = Math.min(deduction, remaining);
          } else {
            deduction = Math.min(disc.value, remaining);
          }
          current.calculatedAmount = Number(deduction.toFixed(2));
          remaining = Number(Math.max(remaining - deduction, 0).toFixed(2));
          applied.push(current);
          if (remaining <= 0) break;
        }
        return {
          ...item,
          amount: remaining,
          appliedDiscounts: applied.map((disc) => disc.feeHeadId)
        };
      });
    },
    []
  );

  const postedInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) => invoice.academicYearId === store.workingYearId && invoice.isPosted && !invoice.isVoided
      ),
    [invoices, store.workingYearId]
  );

  const previewBatchInvoicing = useCallback(
    (gradeId: string): InvoicePreview[] => {
      const gradeKey = normalizeId(gradeId);
      const gradeNameKey = normalizeName(
        store.grades.find((grade) => normalizeId(grade.Grade_ID) === gradeKey)?.Grade_Name || ''
      );
      const structure =
        gradeStructuresByGrade.get(gradeKey) ||
        legacyStructuresByGrade.get(gradeKey) ||
        (gradeNameKey ? legacyStructuresByGrade.get(gradeNameKey) : undefined);
      if (!structure || !structure.items.length) {
        return [];
      }
      const tuitionHeadIds = new Set(structure.items.map((item) => item.feeHeadId));
      const buildItems = (): InvoiceItem[] =>
        structure.items.map((item) => {
          const head = feeHeads.find((entry) => entry.id === item.feeHeadId);
          const revenueAccountId = head?.linkedRevenueAccountId || item.revenueAccountId || '';
          return {
            feeHeadId: head?.id || item.feeHeadId,
            amount: item.amount,
            revenueAccountId
          };
        });

      const classByKey = new Map<string, any>();
      (store.classes || []).forEach((klass: any) => {
        const idKey = normalizeId(klass.Class_ID);
        const nameKey = normalizeName(klass.Class_Name);
        if (idKey) classByKey.set(idKey, klass);
        if (nameKey) classByKey.set(nameKey, klass);
      });
      const resolveStudentGradeId = (student: any) => {
        const direct = normalizeId(student.Grade_ID || student.GradeId || student.gradeId);
        if (direct) return direct;
        const classId = normalizeId(student.Class_ID || student.ClassId || student.classId);
        const className = normalizeName(student.Class_Name || student.className);
        const classKey = classId || className;
        if (!classKey) return '';
        return normalizeId(classByKey.get(classKey)?.Grade_ID);
      };
      const resolveStudentYearId = (student: any) => {
        const direct = normalizeId(student.Academic_Year_ID || student.Year_ID);
        if (direct) return direct;
        const classId = normalizeId(student.Class_ID || student.ClassId || student.classId);
        const className = normalizeName(student.Class_Name || student.className);
        const classKey = classId || className;
        return normalizeId(classByKey.get(classKey)?.Academic_Year_ID || classByKey.get(classKey)?.Year_ID);
      };
      const workingYear = normalizeId(store.workingYearId);
      const students = (store.students || []).filter((student: any) => {
        if (resolveStudentGradeId(student) !== gradeKey) return false;
        if (!workingYear) return true;
        const studentYear = resolveStudentYearId(student);
        return !studentYear || studentYear === workingYear;
      });

      return students.map((student: any) => {
        const studentName = student.Name_Ar || student.Name_En || '—';
        const hasPosted = postedInvoices.some(
          (invoice) =>
            invoice.studentId === student.Student_Global_ID &&
            invoice.items.some((item) => tuitionHeadIds.has(item.feeHeadId))
        );

        const invoiceItems = buildItems();
        const totalAmount = invoiceItems.reduce((sum, item) => sum + item.amount, 0);

        return {
          studentId: student.Student_Global_ID,
          studentName,
          gradeId,
          gradeName:
            store.grades.find((grade) => normalizeId(grade.Grade_ID) === gradeKey)?.Grade_Name || '',
          items: invoiceItems,
          totalAmount,
          skipped: hasPosted,
          reason: hasPosted ? 'Existing tuition invoice detected' : undefined
        };
      });
    },
    [
      gradeStructuresByGrade,
      legacyStructuresByGrade,
      feeHeads,
      postedInvoices,
      store.classes,
      store.grades,
      store.students,
      store.workingYearId
    ]
  );

  const postInvoiceJournal = useCallback(
    (invoiceBatch: Invoice[]) => {
      const receivableAccount = findByCode('1103');
      if (!receivableAccount) {
        throw new Error('Student receivable account (1103) is missing.');
      }

      const totalReceivable = invoiceBatch.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
      const creditMap = new Map<string, number>();
      invoiceBatch.forEach((invoice) => {
        invoice.items.forEach((item) => {
          creditMap.set(item.revenueAccountId, (creditMap.get(item.revenueAccountId) ?? 0) + item.amount);
        });
      });

      const entries = [{ accountId: receivableAccount.id, amount: totalReceivable }];
      creditMap.forEach((amount, accountId) => {
        entries.push({ accountId, amount: -amount });
      });
      postTransactions(entries);
    },
    [findByCode, postTransactions]
  );

  const generateAndPostInvoices = useCallback(
    (previewList: InvoicePreview[]) => {
      const filtered = previewList.filter((preview) => !preview.skipped);
      if (!filtered.length) return [];

      const lastSerial = invoices.reduce((max, invoice) => Math.max(max, invoice.serial), 0);
      const today = new Date().toISOString();
      const newInvoices: Invoice[] = filtered.map((preview, index) => {
        const discountedItems = applyDiscounts(preview.items, preview.appliedDiscounts);
        const totalAmount = discountedItems.reduce((sum, item) => sum + item.amount, 0);
        return {
          id: `INV-${Date.now()}-${preview.studentId}-${index}`,
          serial: lastSerial + index + 1,
          studentId: preview.studentId,
          studentName: preview.studentName,
          gradeId: preview.gradeId,
          gradeName: preview.gradeName,
          academicYearId: store.workingYearId,
          dueDate: today,
          items: discountedItems,
          totalAmount,
          isPosted: true,
          isVoided: false,
          voidReason: undefined,
          voidDate: undefined
        };
      });

      postInvoiceJournal(newInvoices);
      setInvoices((prev) => [...prev, ...newInvoices]);
      return newInvoices;
    },
    [invoices, postInvoiceJournal, store.workingYearId]
  );

  const generateInvoices = useCallback(
    (previewList: InvoicePreview[]) => {
      const filtered = previewList.filter((preview) => !preview.skipped);
      if (!filtered.length) return [];

      const lastSerial = invoices.reduce((max, invoice) => Math.max(max, invoice.serial), 0);
      const today = new Date().toISOString();
      const newInvoices: Invoice[] = filtered.map((preview, index) => {
        const discountedItems = applyDiscounts(preview.items, preview.appliedDiscounts);
        const totalAmount = discountedItems.reduce((sum, item) => sum + item.amount, 0);
        return {
          id: `INV-${Date.now()}-${preview.studentId}-${index}`,
          serial: lastSerial + index + 1,
          studentId: preview.studentId,
          studentName: preview.studentName,
          gradeId: preview.gradeId,
          gradeName: preview.gradeName,
          academicYearId: store.workingYearId,
          dueDate: today,
          items: discountedItems,
          totalAmount,
          isPosted: true,
          isVoided: false,
          voidReason: undefined,
          voidDate: undefined
        };
      });

      setInvoices((prev) => [...prev, ...newInvoices]);
      return newInvoices;
    },
    [applyDiscounts, invoices, store.workingYearId]
  );

  const updateInvoice = useCallback((invoiceId: string, payload: Partial<Invoice>) => {
    setInvoices((prev) =>
      prev.map((invoice) => {
        if (invoice.id !== invoiceId) return invoice;
        const items = payload.items ?? invoice.items;
        const totalAmount = payload.totalAmount ?? items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        return {
          ...invoice,
          ...payload,
          items,
          totalAmount
        };
      })
    );
  }, []);

  const getStudentBalance = useCallback(
    (studentId: string) => {
      const invoiceTotal = invoices
        .filter((invoice) => invoice.studentId === studentId && invoice.isPosted)
        .reduce((sum, invoice) => sum + invoice.totalAmount, 0);
      const receipts = (store.receipts || []).filter((receipt: any) => receipt.Enroll_ID === studentId);
      const receiptTotal = receipts.reduce((sum: number, receipt: any) => sum + Number(receipt.Amount_Paid ?? 0), 0);
      return Number((invoiceTotal - receiptTotal).toFixed(2));
    },
    [invoices, store.receipts]
  );

  const voidInvoice = useCallback(
    (invoiceId: string, reason: string) => {
      const invoice = invoices.find((item) => item.id === invoiceId);
      if (!invoice) throw new Error('Invoice not found.');
      if (invoice.isVoided) throw new Error('Invoice already voided.');

      const receivable = findByCode('1103');
      if (!receivable) throw new Error('Student receivable account is missing.');

      const totalPaid = (store.receipts || [])
        .filter((receipt: any) => receipt.Enroll_ID === invoice.studentId)
        .reduce((sum: number, receipt: any) => sum + Number(receipt.Amount_Paid ?? 0), 0);

      const reversalCredits = new Map<string, number>();
      invoice.items.forEach((item) => {
        reversalCredits.set(item.revenueAccountId, (reversalCredits.get(item.revenueAccountId) ?? 0) + item.amount);
      });

      const description = `Void Invoice #${invoice.serial} - Reason: ${reason}`;
      const entries = [{ accountId: receivable.id, amount: -invoice.totalAmount, description }];
      reversalCredits.forEach((amount, accountId) => {
        entries.push({ accountId, amount, description });
      });

      postTransactions(entries);

      setInvoices((prev) =>
        prev.map((item) =>
          item.id === invoiceId
            ? {
                ...item,
                isVoided: true,
                voidReason: reason,
                voidDate: new Date().toISOString(),
                isPosted: false
              }
            : item
        )
      );

      return {
        warning: totalPaid > 0 ? 'يحتوي الحساب على إيصالات سداد، يرجى مراجعة الدفعات قبل الإلغاء.' : undefined
      };
    },
    [invoices, findByCode, postTransactions, store.receipts]
  );

  return {
    invoices,
    previewBatchInvoicing,
    generateAndPostInvoices,
    generateInvoices,
    updateInvoice,
    getStudentBalance,
    voidInvoice
  };
};
