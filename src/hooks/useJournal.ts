import { useCallback, useMemo, useState } from 'react';
import { JournalEntry, JournalLine } from '../types/journal.types';
import { useAccounts } from '../../hooks/useAccountsLogic';

const STORAGE_KEY = 'SCHOOL_JOURNAL_ENTRIES';

const normalizeStatus = (status?: string): JournalEntry['status'] => {
  switch ((status || '').toUpperCase()) {
    case 'DRAFT':
      return 'DRAFT';
    case 'POSTED':
      return 'POSTED';
    case 'APPROVED':
      return 'APPROVED';
    case 'REJECTED':
      return 'REJECTED';
    default:
      return 'DRAFT';
  }
};

const safeParse = (value: string | null): JournalEntry[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as JournalEntry[];
    return parsed.map((entry) => ({
      ...entry,
      status: normalizeStatus(entry.status),
      rejectionReason: entry.rejectionReason ?? (entry as any).rejectReason
    }));
  } catch {
    return [];
  }
};

const buildId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `JR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const clampAmount = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);

const normalizeLines = (lines: JournalLine[]) => {
  return lines.map((line) => ({
    ...line,
    debit: clampAmount(line.debit),
    credit: clampAmount(line.credit)
  }));
};

const calculateTotals = (lines: JournalLine[]) => {
  const totalDebit = lines.reduce((sum, line) => sum + clampAmount(line.debit), 0);
  const totalCredit = lines.reduce((sum, line) => sum + clampAmount(line.credit), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) <= 0.01;
  return { totalDebit, totalCredit, isBalanced };
};

export const useJournal = () => {
  const { postTransactions, accountMap } = useAccounts();
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    return safeParse(window.localStorage.getItem(STORAGE_KEY));
  });

  const persist = useCallback((next: JournalEntry[]) => {
    setEntries(next);
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addEntry = useCallback((entry: JournalEntry) => {
    const normalizedLines = normalizeLines(entry.lines || []);
    const totals = calculateTotals(normalizedLines);
    const baseStatus = entry.status || 'DRAFT';
    const status = entry.source !== 'manual' && baseStatus === 'DRAFT' ? 'POSTED' : baseStatus;
    const nextEntry: JournalEntry = {
      ...entry,
      id: entry.id || buildId(),
      createdAt: entry.createdAt || new Date().toISOString(),
      status,
      lines: normalizedLines,
      totalDebit: totals.totalDebit,
      totalCredit: totals.totalCredit,
      isBalanced: totals.isBalanced
    };
    persist([...entries, nextEntry]);
    return nextEntry;
  }, [entries, persist]);

  const updateEntry = useCallback((id: string, patch: Partial<JournalEntry>) => {
    persist(entries.map((entry) => {
      if (entry.id !== id) return entry;
      if (entry.status !== 'DRAFT') {
        throw new Error('لا يمكن تعديل قيد غير مسودة');
      }
      const mergedLines = patch.lines ? normalizeLines(patch.lines) : entry.lines;
      const totals = calculateTotals(mergedLines);
      return {
        ...entry,
        ...patch,
        lines: mergedLines,
        totalDebit: totals.totalDebit,
        totalCredit: totals.totalCredit,
        isBalanced: totals.isBalanced
      };
    }));
  }, [entries, persist]);

  const deleteEntry = useCallback((id: string) => {
    const entry = entries.find((item) => item.id === id);
    if (!entry) return;
    throw new Error('لا يمكن حذف أي قيد نهائيًا');
  }, [entries, persist]);

  const approveEntry = useCallback((id: string, approvedBy?: string) => {
    const entry = entries.find((item) => item.id === id);
    if (!entry) return;
    if (entry.status !== 'POSTED') {
      throw new Error('لا يمكن اعتماد قيد غير مرحل');
    }
    if (!entry.isBalanced) {
      throw new Error('القيد غير متوازن');
    }

    entry.lines.forEach((line) => {
      if (!accountMap.has(line.accountId)) {
        throw new Error('يوجد حساب غير موجود في دليل الحسابات');
      }
    });

    const transactions = entry.lines.map((line) => ({
      accountId: line.accountId,
      amount: clampAmount(line.debit) - clampAmount(line.credit),
      description: line.note || entry.description
    }));

    postTransactions(transactions);

    persist(entries.map((item) => (item.id === id ? {
      ...item,
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedBy: approvedBy || 'system',
      rejectionReason: undefined
    } : item)));
  }, [accountMap, entries, persist, postTransactions]);

  const rejectEntry = useCallback((id: string, reason?: string) => {
    persist(entries.map((entry) => {
      if (entry.id !== id) return entry;
      if (entry.status !== 'POSTED') throw new Error('لا يمكن رفض قيد غير مرحل');
      return { ...entry, status: 'REJECTED', rejectionReason: reason || 'رفض بدون سبب' };
    }));
  }, [entries, persist]);

  const project = useMemo(() => entries.slice(), [entries]);

  return {
    entries: project,
    addEntry,
    updateEntry,
    deleteEntry,
    approveEntry,
    rejectEntry
  };
};
