import { useEffect, useMemo } from 'react';
import { useAccounts } from './useAccountsLogic';
import { AccountLevel, AccountType } from '../src/types/accounts.types';
import { useRedistributionGuard } from '../services/redistributionGuard';

const normalize = (value?: string) => (value || '').trim();

const buildStudentAccountId = (studentId: string) => `ACC-STU-${studentId}`;
const buildYearStudentAccountId = (yearId: string, studentId: string) => `ACC-STU-${yearId}-${studentId}`;
const STORAGE_KEY = 'SCHOOL_CATALOG_ACCOUNTS';

export const useStudentAccounts = (students: any[], yearId?: string, classes?: any[], years?: any[]) => {
  const { accounts, addAccount, getNextCode, findByCode, accountMap, updateAccount } = useAccounts();
  const isRedistributing = useRedistributionGuard();

  const parentAccount = useMemo(() => {
    const byCode = findByCode('13');
    if (byCode) return byCode;
    return accounts.find((account) => {
      const name = normalize(account.name);
      return name.includes('العملاء') && name.includes('اقساط');
    }) || null;
  }, [accounts, findByCode]);

  useEffect(() => {
    if (isRedistributing) return;
    if (!students || students.length === 0) return;

    if (!parentAccount) {
      const assetsRoot = findByCode('1');
      if (!assetsRoot) return;
      try {
        const code = getNextCode(assetsRoot.id);
        addAccount({
          id: 'ACC-13-OVERDUE-INSTALLMENTS',
          code,
          name: 'عملاء - أقساط متأخرة',
          type: assetsRoot.type || AccountType.ASSET,
          level: AccountLevel.BRANCH,
          parentId: assetsRoot.id,
          isMain: true,
          balance: 0
        });
      } catch {
        return;
      }
      return;
    }

    const storedAccounts = (() => {
      if (typeof window === 'undefined') return [] as { id: string }[];
      try {
        return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]') as { id: string }[];
      } catch {
        return [] as { id: string }[];
      }
    })();

    const classByKey = new Map<string, any>();
    (classes || []).forEach((klass: any) => {
      const idKey = String(klass.Class_ID || '').trim();
      const nameKey = String(klass.Class_Name || '').trim();
      if (idKey) classByKey.set(idKey, klass);
      if (nameKey) classByKey.set(nameKey, klass);
    });
    const yearNameById = new Map(
      (years || []).map((year: any) => [String(year.Year_ID || '').trim(), String(year.Year_Name || '').trim()])
    );

    const resolveStudentYearId = (student: any) => {
      const direct = String(student.Academic_Year_ID || student.Year_ID || '').trim();
      if (direct) return direct;
      const classId = String(student.Class_ID || student.ClassId || '').trim();
      const className = String(student.Class_Name || student.className || '').trim();
      const classKey = classId || className;
      const klass = classKey ? classByKey.get(classKey) : null;
      return String(klass?.Academic_Year_ID || klass?.Year_ID || '').trim();
    };

    const findExistingStudentAccount = (studentId: string) => {
      return accounts.find((account) => {
        if (account.id === buildStudentAccountId(studentId)) return true;
        if (account.id.includes(studentId)) return true;
        return normalize(account.name).includes(studentId);
      }) || null;
    };

    const studentsForYear = students.filter((student: any) => {
      const studentYearId = resolveStudentYearId(student);
      if (!studentYearId) return false;
      if (!yearId) return true;
      return studentYearId === String(yearId);
    });

    if (!studentsForYear.length) return;

    const ensureYearFolder = (studentYearId: string) => {
      const yearFolderId = `ACC-13-YEAR-${studentYearId}`;
      let yearFolder = accountMap.get(yearFolderId) || null;
      if (yearFolder) return yearFolder;
      const existingYearFolder = accounts.find(
        (account) => account.parentId === parentAccount.id && normalize(account.name).includes(studentYearId)
      );
      if (existingYearFolder) return existingYearFolder;
      const yearLabel = yearNameById.get(studentYearId) || studentYearId;
      try {
        const nextCode = getNextCode(parentAccount.id);
        addAccount({
          id: yearFolderId,
          code: nextCode,
          name: `عملاء أقساط متأخرة - ${yearLabel}`,
          type: parentAccount.type,
          level: AccountLevel.BRANCH,
          parentId: parentAccount.id,
          isMain: true,
          balance: 0
        });
        return {
          id: yearFolderId,
          type: parentAccount.type,
          level: AccountLevel.BRANCH,
          parentId: parentAccount.id,
          code: nextCode,
          name: `عملاء أقساط متأخرة - ${yearLabel}`,
          isMain: true,
          balance: 0
        };
      } catch {
        return null;
      }
    };

    const missingStudent = studentsForYear.find((student: any) => {
      const studentId = String(student.Student_Global_ID || student.Student_ID || student.studentId || '');
      if (!studentId) return false;
      const studentYearId = resolveStudentYearId(student);
      if (!studentYearId) return false;
      const accountId = buildYearStudentAccountId(studentYearId, studentId);
      if (accountMap.has(accountId) || storedAccounts.some((account) => account.id === accountId)) return false;
      const existingAccount = findExistingStudentAccount(studentId);
      return !existingAccount;
    });

    if (!missingStudent) return;

    const studentId = String(missingStudent.Student_Global_ID || missingStudent.Student_ID || missingStudent.studentId || '');
    if (!studentId) return;
    const studentYearId = resolveStudentYearId(missingStudent);
    if (!studentYearId) return;
    const yearFolder = ensureYearFolder(studentYearId);
    if (!yearFolder) return;

    const existingAccount = findExistingStudentAccount(studentId);
    if (existingAccount) {
      if (existingAccount.parentId !== yearFolder.id) {
        updateAccount(existingAccount.id, { parentId: yearFolder.id });
      }
      return;
    }

    const accountId = buildYearStudentAccountId(studentYearId, studentId);
    if (accountMap.has(accountId) || storedAccounts.some((account) => account.id === accountId)) return;

    const studentName = normalize(missingStudent.Name_Ar) || normalize(missingStudent.Name_En) || 'طالب';
    let nextCode = '';
    try {
      nextCode = getNextCode(yearFolder.id);
    } catch {
      return;
    }

    addAccount({
      id: accountId,
      code: nextCode,
      name: `الطالب: ${studentName} (${studentId})`,
      type: parentAccount.type,
      level: AccountLevel.LEAF,
      parentId: yearFolder.id,
      isMain: false,
      balance: 0
    });
  }, [students, yearId, classes, years, parentAccount, addAccount, getNextCode, findByCode, accountMap, accounts, updateAccount, isRedistributing]);
};
