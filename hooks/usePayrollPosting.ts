import { useCallback } from 'react';
import { useAccounts } from './useAccountsLogic';
import { PayrollPosting } from '../src/hr/payroll/payrollPosting.types';

const STORAGE_KEY = 'hr_payroll_postings_v1';

type PayrollRow = {
  employeeId: string;
  grossSalary: number;
  incentives: number;
  allowances: number;
  absencesDeduction: number;
  latenessDeduction: number;
  insuranceEmployee: number;
  insuranceEmployer: number;
  tax: number;
  emergencyFund: number;
  netSalary: number;
  approved: boolean;
  basicSalary: number;
};

type AccountCodes = {
  salaryExpense?: string;
  incentivesExpense?: string;
  allowancesExpense?: string;
  employerInsuranceExpense?: string;
  employeeInsurancePayable?: string;
  taxPayable?: string;
  emergencyFundPayable?: string;
  cashOrBank?: string;
};

const safeParse = (value: string | null): PayrollPosting[] => {
  if (!value) return [];
  try {
    return JSON.parse(value) as PayrollPosting[];
  } catch {
    return [];
  }
};

const buildPostingId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `PAYROLL-POST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeAmount = (value: number) => Number((value || 0).toFixed(2));

const resolveAccountByName = (accounts: ReturnType<typeof useAccounts>['accounts'], patterns: string[]) => {
  const lowerPatterns = patterns.map((pattern) => pattern.toLowerCase());
  return accounts.find((account) => lowerPatterns.some((pattern) => account.name.toLowerCase().includes(pattern))) || null;
};

export const usePayrollPosting = () => {
  const { accounts, findByCode, postTransactions } = useAccounts();

  const isMonthPosted = useCallback((month: number, year: number) => {
    const existing = safeParse(window.localStorage.getItem(STORAGE_KEY));
    return existing.some((posting) => posting.payrollMonth === month && posting.payrollYear === year && posting.status === 'Posted');
  }, []);

  const resolveAccountId = useCallback((code: string | undefined, patterns: string[]) => {
    if (code) {
      const account = findByCode(code);
      if (!account) throw new Error('حساب غير موجود في دليل الحسابات');
      return account.id;
    }
    const account = resolveAccountByName(accounts, patterns);
    if (!account) throw new Error('تعذر العثور على الحساب في دليل الحسابات');
    return account.id;
  }, [accounts, findByCode]);

  const postPayroll = useCallback((payload: {
    payrollMonth: number;
    payrollYear: number;
    postedBy: string;
    rows: PayrollRow[];
    accountCodes?: AccountCodes;
  }) => {
    const { payrollMonth, payrollYear, postedBy, rows, accountCodes } = payload;

    if (isMonthPosted(payrollMonth, payrollYear)) {
      throw new Error('تم ترحيل هذا الشهر مسبقًا');
    }

    const approvedRows = rows.filter((row) => row.approved);
    if (!approvedRows.length) {
      throw new Error('لا توجد صفوف معتمدة للترحيل');
    }

    const totals = approvedRows.reduce((acc, row) => {
      acc.basicSalary += row.basicSalary;
      acc.incentives += row.incentives;
      acc.allowances += row.allowances;
      acc.employerInsurance += row.insuranceEmployer;
      acc.employeeInsurance += row.insuranceEmployee;
      acc.taxes += row.tax;
      acc.emergencyFund += row.emergencyFund;
      acc.netSalary += row.netSalary;
      return acc;
    }, {
      basicSalary: 0,
      incentives: 0,
      allowances: 0,
      employerInsurance: 0,
      employeeInsurance: 0,
      taxes: 0,
      emergencyFund: 0,
      netSalary: 0
    });

    const salaryExpenseId = resolveAccountId(accountCodes?.salaryExpense, ['مصروف رواتب', 'رواتب']);
    const incentivesExpenseId = resolveAccountId(accountCodes?.incentivesExpense, ['حوافز']);
    const allowancesExpenseId = resolveAccountId(accountCodes?.allowancesExpense, ['بدلات']);
    const employerInsuranceExpenseId = resolveAccountId(accountCodes?.employerInsuranceExpense, ['تأمينات جهة العمل', 'تأمينات صاحب العمل']);

    const employeeInsurancePayableId = resolveAccountId(accountCodes?.employeeInsurancePayable, ['تأمينات موظف', 'تأمينات الموظفين']);
    const taxPayableId = resolveAccountId(accountCodes?.taxPayable, ['ضرائب']);
    const emergencyFundPayableId = resolveAccountId(accountCodes?.emergencyFundPayable, ['صندوق طوارئ', 'الطوارئ']);
    const cashOrBankId = resolveAccountId(accountCodes?.cashOrBank, ['خزينة', 'بنك']);

    const entries = [
      { accountId: salaryExpenseId, amount: normalizeAmount(totals.basicSalary), description: 'مصروف الرواتب' },
      { accountId: incentivesExpenseId, amount: normalizeAmount(totals.incentives), description: 'مصروف الحوافز' },
      { accountId: allowancesExpenseId, amount: normalizeAmount(totals.allowances), description: 'مصروف البدلات' },
      { accountId: employerInsuranceExpenseId, amount: normalizeAmount(totals.employerInsurance), description: 'مصروف تأمينات جهة العمل' },
      { accountId: employeeInsurancePayableId, amount: normalizeAmount(-totals.employeeInsurance), description: 'تأمينات الموظفين' },
      { accountId: taxPayableId, amount: normalizeAmount(-totals.taxes), description: 'ضرائب' },
      { accountId: emergencyFundPayableId, amount: normalizeAmount(-totals.emergencyFund), description: 'صندوق الطوارئ' },
      { accountId: cashOrBankId, amount: normalizeAmount(-totals.netSalary), description: 'صافي الرواتب' }
    ].filter((entry) => entry.amount !== 0);

    const debitTotal = entries.filter((entry) => entry.amount > 0).reduce((sum, entry) => sum + entry.amount, 0);
    const creditTotal = entries.filter((entry) => entry.amount < 0).reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

    if (Number(debitTotal.toFixed(2)) !== Number(creditTotal.toFixed(2))) {
      throw new Error('القيد المحاسبي غير متوازن');
    }

    postTransactions(entries);

    const posting: PayrollPosting = {
      id: buildPostingId(),
      payrollMonth,
      payrollYear,
      journalEntryId: buildPostingId(),
      postedAt: new Date().toISOString(),
      postedBy,
      status: 'Posted'
    };

    const existing = safeParse(window.localStorage.getItem(STORAGE_KEY));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, posting]));

    return posting;
  }, [accounts, isMonthPosted, postTransactions, resolveAccountId]);

  return {
    postPayroll,
    isMonthPosted
  };
};
