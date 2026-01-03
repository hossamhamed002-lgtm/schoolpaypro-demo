import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Account, AccountType } from '../src/types/accounts.types';
import { getInitialSchoolAccounts } from '../src/utils/schoolAccountsSeed';
import { isModuleActive } from '../storageGate';
import { load as loadData, save as saveData, StorageScope } from '../src/storage/dataLayer';
import { useRedistributionGuard } from '../services/redistributionGuard';

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
  const isRedistributing = useRedistributionGuard();

  useEffect(() => {
    if (isRedistributing) return;
    setAccounts((prev) => {
      const byId = new Map<string, Account>();
      const byCode = new Map<string, Account>();
      prev.forEach((account) => {
        const existingById = byId.get(account.id);
        if (!existingById) {
          byId.set(account.id, account);
          return;
        }
        if (Math.abs(account.balance) > Math.abs(existingById.balance)) {
          byId.set(account.id, account);
        }
      });
      Array.from(byId.values()).forEach((account) => {
        const existingByCode = byCode.get(account.code);
        if (!existingByCode) {
          byCode.set(account.code, account);
          return;
        }
        if (Math.abs(account.balance) > Math.abs(existingByCode.balance)) {
          byCode.set(account.code, account);
        }
      });
      const next = Array.from(byCode.values());
      return next.length === prev.length ? prev : next;
    });
  }, [isRedistributing]);

  useEffect(() => {
    if (isRedistributing) return;
    setAccounts((prev) => {
      const hasRevenueRoot = prev.some(
        (account) => account.code === '4' && account.parentId === null
      );
      if (!hasRevenueRoot) return prev;

      const existingCodes = new Set(prev.map((account) => account.code));
      const additions: Account[] = [];
      const revenueRoot = prev.find((account) => account.code === '4' && account.parentId === null);
      if (!revenueRoot) return prev;

      if (!existingCodes.has('43')) {
        additions.push({
          id: 'ACC-43-TUITION-REVENUE',
          code: '43',
          name: 'ايرادات الرسوم الدراسيه',
          type: revenueRoot.type,
          level: 2,
          parentId: revenueRoot.id,
          isMain: true,
          balance: 0
        });
      }

      const parentId = additions.find((item) => item.code === '43')?.id
        ?? prev.find((item) => item.code === '43')?.id
        ?? null;
      if (!parentId) return prev;

      const childAccounts: Account[] = [
        { id: 'ACC-4301-TUITION', code: '4301', name: 'رسوم التعليم' },
        { id: 'ACC-4302-BOOKS', code: '4302', name: 'رسوم الكتب' },
        { id: 'ACC-4303-ACTIVITY', code: '4303', name: 'رسوم النشاط' },
        { id: 'ACC-4304-EXTRA', code: '4304', name: 'رسم اضافيه' },
        { id: 'ACC-4305-APPLICATION', code: '4305', name: 'رسوم ابلكيشن' },
        { id: 'ACC-4306-DISCOUNTS', code: '4306', name: 'الخصومات' }
      ];

      childAccounts.forEach((child) => {
        if (existingCodes.has(child.code)) return;
        additions.push({
          id: child.id,
          code: child.code,
          name: child.name,
          type: revenueRoot.type,
          level: 3,
          parentId,
          isMain: false,
          balance: 0
        });
      });

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
  }, [isRedistributing]);

  useEffect(() => {
    if (isRedistributing) return;
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
  }, [isRedistributing]);

  useEffect(() => {
    if (isRedistributing) return;
    if (typeof window === 'undefined' || !isModuleActive('finance')) return;
    const serialized = JSON.stringify(accounts);
    if (serializedRef.current === serialized) return;
    serializedRef.current = serialized;
    saveData(StorageScope.FINANCE_DATA, STORAGE_KEY, JSON.parse(serialized));
    window.dispatchEvent(new Event('coa-sync'));
  }, [accounts, isRedistributing]);

  useEffect(() => {
    if (isRedistributing) return;
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
  }, [isRedistributing]);

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

  const getAccountBySystemTag = useMemo(
    () => (tag: string) => accounts.find((acc) => acc.systemTag === tag) ?? null,
    [accounts]
  );

  const generateCodeWithType = useCallback(
    (type: Account['type'], parent?: Account | null) => {
      const normalized = typeof type === 'string' ? type.toUpperCase() : type;
      const prefix =
        normalized === 'ASSET' || normalized === AccountType.ASSET
          ? '1'
          : normalized === 'LIABILITY' || normalized === AccountType.LIABILITY
          ? '2'
          : normalized === 'EQUITY' || normalized === AccountType.EQUITY
          ? '3'
          : normalized === 'REVENUE' || normalized === AccountType.REVENUE
          ? '4'
          : '5';
      const siblings = accounts.filter((a) => (parent ? a.parentId === parent.id : a.code.startsWith(prefix)));
      const maxNumeric = siblings.reduce((max, a) => {
        const numeric = parseInt(a.code.replace(/\D/g, ''), 10);
        return Number.isNaN(numeric) ? max : Math.max(max, numeric);
      }, Number(prefix));
      return `${prefix}${(maxNumeric + 1).toString().padStart(3, '0')}`;
    },
    [accounts]
  );

  const createAccountIfNotExists = useCallback(
    ({
      name,
      type,
      parentId = null,
      level = 3,
      isSystem = true,
      systemTag
    }: {
      name: string;
      type: Account['type'];
      parentId?: string | null;
      level?: number;
      isSystem?: boolean;
      systemTag?: string;
    }) => {
      if (systemTag) {
        const tagged = accounts.find((acc) => acc.systemTag === systemTag);
        if (tagged) return tagged.id;
      }
      const existing = accounts.find((acc) => acc.name === name && acc.type === type);
      if (existing) return existing.id;
      const parent = parentId ? accountMap.get(parentId) ?? null : null;
      const code = generateCodeWithType(type, parent || undefined);
      const newAcc: Account = {
        id: `ACC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        code,
        name,
        type,
        level,
        parentId: parent ? parent.id : null,
        isMain: false,
        balance: 0,
        isSystem,
        systemTag,
        locked: false
      };
      setAccounts((prev) => [...prev, newAcc]);
      return newAcc.id;
    },
    [accounts, accountMap, generateCodeWithType]
  );

  const lockAccount = useCallback((accountId: string) => {
    setAccounts((prev) => prev.map((acc) => (acc.id === accountId ? { ...acc, locked: true } : acc)));
  }, []);

  const hasChildren = useCallback(
    (id: string) => accounts.some((account) => account.parentId === id),
    [accounts]
  );

  const addAccount = useCallback(
    (account: Account) => {
      if (accounts.some((item) => item.code === account.code)) {
        throw new Error('رمز الحساب موجود بالفعل.');
      }
      if (accounts.some((item) => item.id === account.id)) {
        throw new Error('معرف الحساب موجود بالفعل.');
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
    resetChartOfAccounts,
    createAccountIfNotExists,
    lockAccount,
    getAccountBySystemTag: getAccountBySystemTag as (tag: string) => Account | null
  };
};
