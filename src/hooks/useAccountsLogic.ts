import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Account } from '../types/accounts.types';
import { getInitialSchoolAccounts } from '../data/schoolAccountsSeed';
import { isModuleActive } from '../../storageGate';
import { load as loadData, save as saveData, StorageScope } from '../storage/dataLayer';

const STORAGE_KEY = 'SCHOOL_CATALOG_ACCOUNTS';

const safeParse = (value: string | null): Account[] | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as Account[];
  } catch {
    return null;
  }
};

export const useAccounts = () => {
  const serializedRef = useRef<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>(() => {
    if (typeof window === 'undefined') return getInitialSchoolAccounts();
    const stored = loadData<Account[] | null>(StorageScope.FINANCE_DATA, STORAGE_KEY, null);
    return stored ?? getInitialSchoolAccounts();
  });

  useEffect(() => {
    setAccounts((prev) => {
      const revenueRoot = prev.find((account) => account.code === '4' && account.parentId === null);
      if (!revenueRoot) return prev;

      const existingCodes = new Set(prev.map((account) => account.code));
      const additions: Account[] = [];

      const directRevenueAccounts: Account[] = [
        { id: 'ACC-44-UNIFORM-REVENUE', code: '44', name: 'إيرادات الزي المدرسي' },
        { id: 'ACC-45-BUS-REVENUE', code: '45', name: 'إيرادات الحافلات' },
        { id: 'ACC-46-CAFETERIA-REVENUE', code: '46', name: 'إيرادات المقصف' },
        { id: 'ACC-47-TRIPS-REVENUE', code: '47', name: 'إيرادات الرحلات' },
        { id: 'ACC-48-BANK-DEPOSITS-REVENUE', code: '48', name: 'إيرادات ودائع بنكية' },
        { id: 'ACC-49-MISC-REVENUE', code: '49', name: 'إيرادات متنوعة' },
        { id: 'ACC-50-SCRAP-REVENUE', code: '50', name: 'إيراد بيع خردة وأصول' },
        { id: 'ACC-51-WITHDRAWN-REVENUE', code: '51', name: 'إيراد طلاب سحبوا ومردودات' },
        { id: 'ACC-52-STORES-SALES', code: '52', name: 'مبيعات المخازن' }
      ];

      directRevenueAccounts.forEach((account) => {
        if (existingCodes.has(account.code)) return;
        additions.push({
          ...account,
          type: revenueRoot.type,
          level: 3,
          parentId: revenueRoot.id,
          isMain: false,
          balance: 0
        });
      });

      if (!additions.length) return prev;
      return [...prev, ...additions];
    });
  }, []);

  useEffect(() => {
    setAccounts((prev) => {
      let expensesRoot = prev.find((account) => account.id === 'ACC-ROOT-EXPENSES' || (account.code === '5' && account.parentId === null));
      const existingCodes = new Set(prev.map((account) => account.code));
      const additions: Account[] = [];

      if (!expensesRoot) {
        expensesRoot = {
          id: 'ACC-ROOT-EXPENSES',
          code: '5',
          name: 'المصروفات',
          type: 'EXPENSE' as any,
          level: 1,
          parentId: null,
          isMain: true,
          balance: 0
        };
        additions.push(expensesRoot);
      }

      const existingBranch =
        prev.find((account) => account.code === '510' && account.parentId === expensesRoot.id) ||
        prev.find((account) => account.code === '51' && account.parentId === expensesRoot.id);

      const tuitionExpenseBranch =
        existingBranch ||
        {
          id: 'ACC-510-TUITION-EXPENSES',
          code: '510',
          name: 'مصروفات الرسوم الدراسية',
          type: expensesRoot.type,
          level: 2,
          parentId: expensesRoot.id,
          isMain: true,
          balance: 0
        };

      if (!existingBranch && !existingCodes.has('510')) {
        additions.push(tuitionExpenseBranch);
      }

      const children = [
        { id: 'ACC-5101-EDU-SUPPLIES', code: '5101', name: 'مصروفات مستلزمات تعليم' },
        { id: 'ACC-5102-ACTIVITY-EXP', code: '5102', name: 'مصروفات النشاط' },
        { id: 'ACC-5103-BOOKS-EXP', code: '5103', name: 'مصروفات الكتب' },
        { id: 'ACC-5104-PRINTS-EXP', code: '5104', name: 'مصروفات المطبوعات' },
        { id: 'ACC-5105-OTHER-TUITION-EXP', code: '5105', name: 'مصروفات دراسية أخرى' }
      ];

      children.forEach((child) => {
        if (existingCodes.has(child.code)) return;
        additions.push({
          ...child,
          type: expensesRoot.type,
          level: 3,
          parentId: tuitionExpenseBranch.id,
          isMain: false,
          balance: 0
        });
      });

      if (!additions.length) return prev;
      return [...prev, ...additions];
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !isModuleActive('finance')) return;
    const serialized = JSON.stringify(accounts);
    if (serializedRef.current === serialized) return;
    serializedRef.current = serialized;
    saveData(StorageScope.FINANCE_DATA, STORAGE_KEY, accounts);
    window.dispatchEvent(new Event('coa-sync'));
  }, [accounts]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isModuleActive('finance')) return;
    const syncFromStorage = () => {
      const stored = loadData<Account[] | null>(StorageScope.FINANCE_DATA, STORAGE_KEY, null);
      const serializedStored = stored ? JSON.stringify(stored) : null;
      if (!stored || serializedRef.current === serializedStored) return;
      const parsed = stored;
      if (!parsed) return;
      serializedRef.current = serializedStored;
      setAccounts(parsed);
    };
    window.addEventListener('storage', syncFromStorage);
    window.addEventListener('coa-sync', syncFromStorage);
    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener('coa-sync', syncFromStorage);
    };
  }, []);

  const accountMap = useMemo(() => {
    const map = new Map<string, Account>();
    accounts.forEach((account) => map.set(account.id, account));
    return map;
  }, [accounts]);

  const accountByCode = useMemo(() => {
    const map = new Map<string, Account>();
    accounts.forEach((account) => map.set(account.code, account));
    return map;
  }, [accounts]);

  const hasChildren = useCallback(
    (id: string) => accounts.some((account) => account.parentId === id),
    [accounts]
  );

  const addAccount = useCallback(
    (account: Account) => {
      if (accounts.some((item) => item.code === account.code)) {
        throw new Error('رمز الحساب موجود بالفعل.');
      }
      if (account.parentId && !accountMap.has(account.parentId)) {
        throw new Error('الحساب الأب غير موجود.');
      }
      setAccounts((prev) => [...prev, account]);
    },
    [accounts, accountMap]
  );

  const deleteAccount = useCallback(
    (id: string) => {
      const account = accountMap.get(id);
      if (!account) {
        throw new Error('الحساب غير موجود.');
      }
      if (hasChildren(id)) {
        throw new Error('لا يمكن حذف حساب له حسابات فرعية.');
      }
      setAccounts((prev) => prev.filter((item) => item.id !== id));
    },
    [accountMap, hasChildren]
  );

  const getNextCode = useCallback(
    (parentId: string | null) => {
      if (!parentId) {
        throw new Error('معرف الحساب الأب مطلوب.');
      }
      const parent = accountMap.get(parentId);
      if (!parent) {
        throw new Error('الحساب الأب غير موجود.');
      }
      const prefix = parent.code;
      const children = accounts.filter((account) => account.parentId === parentId);
      if (!children.length) {
        return `${prefix}01`;
      }
      const suffixNumbers = children
        .map((child) => child.code.slice(prefix.length))
        .map((suffix) => Number.parseInt(suffix, 10))
        .filter((num) => !Number.isNaN(num));
      const nextValue = suffixNumbers.length ? Math.max(...suffixNumbers) + 1 : 1;
      const formatted = nextValue.toString().padStart(2, '0');
      return `${prefix}${formatted}`;
    },
    [accounts, accountMap]
  );

  const getAccountPath = useCallback(
    (id: string) => {
      const path: string[] = [];
      let cursor: string | null | undefined = id;
      while (cursor) {
        const account = accountMap.get(cursor);
        if (!account) break;
        path.unshift(account.name);
        cursor = account.parentId;
      }
      return path.join(' > ');
    },
    [accountMap]
  );

  const findByCode = useCallback(
    (code: string) => {
      return accountByCode.get(code) ?? null;
    },
    [accountByCode]
  );

  const postTransactions = useCallback(
    (entries: { accountId: string; amount: number; description?: string }[]) => {
      if (!entries.length) return;
      setAccounts((prev) =>
        prev.map((account) => {
          const delta = entries
            .filter((entry) => entry.accountId === account.id)
            .reduce((sum, entry) => sum + entry.amount, 0);
          if (!delta) return account;
          return {
            ...account,
            balance: Number((account.balance + delta).toFixed(2))
          };
        })
      );
    },
    []
  );

  const updateAccount = useCallback(
    (id: string, payload: Partial<Account>) => {
      if (payload.code) {
        const isDuplicate = accounts.some((account) => account.code === payload.code && account.id !== id);
        if (isDuplicate) throw new Error('رمز الحساب موجود بالفعل.');
      }
      setAccounts((prev) =>
        prev.map((account) => (account.id === id ? { ...account, ...payload } : account))
      );
    },
    [accounts]
  );

  const resetChartOfAccounts = useCallback(() => {
    setAccounts(getInitialSchoolAccounts());
  }, []);

  const project = useMemo(() => accounts.slice(), [accounts]);

  return {
    accounts: project,
    addAccount,
    updateAccount,
    deleteAccount,
    getNextCode,
    getAccountPath,
    findByCode,
    hasChildren,
    postTransactions,
    accountMap,
    resetChartOfAccounts
  };
};
