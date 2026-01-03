import { useCallback, useEffect, useState } from 'react';
import { Account, AccountLevel, AccountType } from '../types/accounts.types';
import { useAccounts } from './useAccountsLogic';
import { isModuleActive } from '../../storageGate';
import { load as loadData, save as saveData, StorageScope } from '../storage/dataLayer';

const STORAGE_KEY = 'SCHOOL_SUPPLIERS_ACCOUNTS';

export interface SupplierAccount {
  id: string;
  name: string;
  balance: number;
  glAccountId: string;
  glCode: string;
  isActive: boolean;
  commercialRecord?: string;
  taxCard?: string;
  bankAccountNumber?: string;
  iban?: string;
  bankName?: string;
  address?: string;
  contactNumbers?: string;
  hasPreviousBalance: boolean;
}

const safeParse = (value: string | null): SupplierAccount[] | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as SupplierAccount[];
  } catch {
    return null;
  }
};

const loadInitial = (): SupplierAccount[] => {
  if (typeof window === 'undefined') return [];
  const stored = loadData<SupplierAccount[] | null>(StorageScope.FINANCE_DATA, STORAGE_KEY, null);
  return stored ?? [];
};

export const useSuppliersLogic = () => {
  const { accounts, addAccount, getNextCode, findByCode } = useAccounts();
  const [suppliers, setSuppliers] = useState<SupplierAccount[]>(loadInitial);

  useEffect(() => {
    if (typeof window === 'undefined' || !isModuleActive('finance')) return;
    saveData(StorageScope.FINANCE_DATA, STORAGE_KEY, suppliers);
  }, [suppliers]);

  const ensureSuppliersFolder = useCallback((): Account => {
    const liabilitiesRoot = findByCode('2');
    if (!liabilitiesRoot) {
      throw new Error('حساب الخصوم غير موجود في دليل الحسابات.');
    }
    const existing = accounts.find(
      (account) => account.parentId === liabilitiesRoot.id && account.name.trim() === 'موردون'
    );
    if (existing) return existing;

    const folderId = crypto.randomUUID ? crypto.randomUUID() : `ACC-${Date.now()}`;
    const folder: Account = {
      id: folderId,
      code: getNextCode(liabilitiesRoot.id),
      name: 'موردون',
      type: AccountType.LIABILITY,
      level: Math.min(liabilitiesRoot.level + 1, AccountLevel.BRANCH),
      parentId: liabilitiesRoot.id,
      isMain: true,
      balance: 0
    };
    addAccount(folder);
    return folder;
  }, [accounts, addAccount, findByCode, getNextCode]);

  const addSupplierAccount = useCallback(
    (payload: {
      name: string;
      balance: number;
      isActive?: boolean;
      commercialRecord?: string;
      taxCard?: string;
      bankAccountNumber?: string;
      iban?: string;
      bankName?: string;
      address?: string;
      contactNumbers?: string;
      hasPreviousBalance: boolean;
    }) => {
      const parent = ensureSuppliersFolder();
      const glCode = getNextCode(parent.id);
      if (!glCode) {
        throw new Error('تعذر توليد كود الحساب للمورد.');
      }
      const glId = crypto.randomUUID ? crypto.randomUUID() : `GL-${Date.now()}`;
      addAccount({
        id: glId,
        code: glCode,
        name: payload.name,
        type: AccountType.LIABILITY,
        level: Math.min(parent.level + 1, AccountLevel.LEAF),
        parentId: parent.id,
        isMain: false,
        balance: payload.balance
      });

      const entry: SupplierAccount = {
        id: crypto.randomUUID ? crypto.randomUUID() : `SUP-${Date.now()}`,
        name: payload.name,
        balance: payload.balance,
        glAccountId: glId,
        glCode,
        isActive: payload.isActive ?? true,
        commercialRecord: payload.commercialRecord,
        taxCard: payload.taxCard,
        bankAccountNumber: payload.bankAccountNumber,
        iban: payload.iban,
        bankName: payload.bankName,
        address: payload.address,
        contactNumbers: payload.contactNumbers,
        hasPreviousBalance: payload.hasPreviousBalance
      };
      setSuppliers((prev) => [...prev, entry]);
      return entry;
    },
    [addAccount, ensureSuppliersFolder, getNextCode]
  );

  return {
    suppliers,
    addSupplierAccount
  };
};
