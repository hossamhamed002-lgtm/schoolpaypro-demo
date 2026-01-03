import { useCallback, useEffect, useState } from 'react';
import { Account, AccountLevel, AccountType } from '../types/accounts.types';
import { useAccounts } from './useAccountsLogic';
import { isModuleActive } from '../../storageGate';
import { load as loadData, save as saveData, StorageScope } from '../storage/dataLayer';

const STORAGE_KEY = 'SCHOOL_TREASURY_ACCOUNTS';

export type TreasuryType = 'Bank' | 'CashSafe';

export interface TreasuryAccount {
  id: string;
  name: string;
  type: TreasuryType;
  accountNumber?: string;
  currency: string;
  balance: number;
  glAccountId: string;
  glCode: string;
  schoolAccountName: string;
  bankName?: string;
  iban?: string;
  accountType: string;
  openingDate: string;
  isActive: boolean;
}

const defaultFolders: Record<TreasuryType, { name: string }> = {
  Bank: { name: 'البنوك' },
  CashSafe: { name: 'الخزينة' }
};

// This consumer relies exclusively on useAccounts for hierarchy enforcement and code generation.
// No duplicate folder or suffix logic is introduced here.

const safeParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const loadInitial = (): TreasuryAccount[] => {
  if (typeof window === 'undefined') return [];
  const stored = loadData<TreasuryAccount[] | null>(StorageScope.FINANCE_DATA, STORAGE_KEY, null);
  return stored ?? [];
};

export const useTreasuryLogic = () => {
  const { accounts, addAccount, getNextCode, findByCode, updateAccount, deleteAccount } = useAccounts();
  const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>(loadInitial);

  useEffect(() => {
    if (typeof window === 'undefined' || !isModuleActive('finance')) return;
    saveData(StorageScope.FINANCE_DATA, STORAGE_KEY, treasuryAccounts);
  }, [treasuryAccounts]);

  const ensureParentFolder = useCallback(
    (type: TreasuryType): Account => {
      const folderDef = defaultFolders[type];
      const currentAssets = findByCode('11');
      if (!currentAssets) {
        throw new Error('Current Assets folder not found in COA.');
      }

      const existing = accounts.find(
        (acc) => acc.parentId === currentAssets.id && acc.name.trim() === folderDef.name
      );
      if (existing) return existing;

      const newParentId = crypto.randomUUID ? crypto.randomUUID() : `ACC-${Date.now()}`;
      const account: Account = {
        id: newParentId,
        code: getNextCode(currentAssets.id),
        name: folderDef.name,
        type: AccountType.ASSET,
        level: Math.min(currentAssets.level + 1, AccountLevel.LEAF),
        parentId: currentAssets.id,
        isMain: true,
        balance: 0
      };
      addAccount(account);
      return account;
    },
    [addAccount, accounts, findByCode, getNextCode]
  );

  const addTreasuryAccount = useCallback(
    (payload: {
      name: string;
      type: TreasuryType;
      accountNumber?: string;
      currency?: string;
      balance: number;
      schoolAccountName: string;
      bankName?: string;
      iban?: string;
      accountType: string;
      openingDate: string;
      isActive?: boolean;
    }) => {
      const parent = ensureParentFolder(payload.type);
      const glCode = getNextCode(parent.id);
      // GL code generation is delegated to the unified hook to prevent duplicate suffix logic.
      if (!glCode) {
        throw new Error('Unable to generate a GL code for the new account.');
      }
      const glId = crypto.randomUUID ? crypto.randomUUID() : `GL-${Date.now()}`;
      addAccount({
        id: glId,
        code: glCode,
        name: payload.name,
        type: AccountType.ASSET,
        level: Math.min(parent.level + 1, AccountLevel.LEAF),
        parentId: parent.id,
        isMain: false,
        balance: payload.balance
      });

      const entry: TreasuryAccount = {
        id: crypto.randomUUID ? crypto.randomUUID() : `TRE-${Date.now()}`,
        name: payload.name,
        type: payload.type,
        accountNumber: payload.accountNumber,
        currency: payload.currency ?? 'EGP',
        balance: payload.balance,
        glAccountId: glId,
        glCode,
        schoolAccountName: payload.schoolAccountName,
        bankName: payload.bankName,
        iban: payload.iban,
        accountType: payload.accountType,
        openingDate: payload.openingDate,
        isActive: payload.isActive ?? true
      };
      setTreasuryAccounts((prev) => [...prev, entry]);
      return entry;
    },
    [ensureParentFolder, addAccount, getNextCode]
  );

  const updateTreasuryAccount = useCallback(
    (payload: {
      id: string;
      name: string;
      accountNumber?: string;
      balance: number;
      schoolAccountName: string;
      bankName?: string;
      iban?: string;
      accountType: string;
      openingDate: string;
      isActive: boolean;
    }) => {
      const existing = treasuryAccounts.find((entry) => entry.id === payload.id);
      if (!existing) {
        throw new Error('الحساب غير موجود.');
      }
      updateAccount(existing.glAccountId, {
        name: payload.name,
        balance: payload.balance
      });
      setTreasuryAccounts((prev) =>
        prev.map((entry) =>
          entry.id === payload.id
            ? {
                ...entry,
                name: payload.name,
                accountNumber: payload.accountNumber,
                balance: payload.balance,
                schoolAccountName: payload.schoolAccountName,
                bankName: payload.bankName,
                iban: payload.iban,
                accountType: payload.accountType,
                openingDate: payload.openingDate,
                isActive: payload.isActive
              }
            : entry
        )
      );
      return { ...existing, ...payload };
    },
    [treasuryAccounts, updateAccount]
  );

  const deleteTreasuryAccount = useCallback(
    (id: string) => {
      const existing = treasuryAccounts.find((entry) => entry.id === id);
      if (!existing) {
        throw new Error('الحساب غير موجود.');
      }
      deleteAccount(existing.glAccountId);
      setTreasuryAccounts((prev) => prev.filter((entry) => entry.id !== id));
    },
    [treasuryAccounts, deleteAccount]
  );

  return {
    treasuryAccounts,
    addTreasuryAccount,
    updateTreasuryAccount,
    deleteTreasuryAccount
  };
};
