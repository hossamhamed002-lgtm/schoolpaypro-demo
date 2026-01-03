import { useCallback, useEffect, useMemo, useState } from 'react';
import { LeaveBalance, LeaveBalanceType } from '../src/hr/leave/leaveBalances.types';
import { LeaveTransaction } from '../src/hr/leave/leaveTransactions.types';
import { isGenderEligibleForLeave, resolveEmployeeGender, resolveLeavePolicy } from '../src/hr/leave/leavePolicy';

interface LeaveBalancesOptions {
  employees: Array<{ Emp_ID: string; National_ID?: string | null; Gender?: string | null }>;
  academicYearId: string;
  yearsOfServiceByEmployee?: Record<string, number>;
  annualBalanceOverrides?: Record<string, number>;
  eligibleForMaternityByEmployee?: Record<string, boolean>;
}

interface LeaveBalanceUpdate {
  casualLeaveBalance?: number;
  annualLeaveBalance?: number;
  sickLeaveBalance?: number;
  childCareLeaveBalance?: number;
  maternityLeaveBalance?: number;
}

interface LeaveUsageResult {
  ok: boolean;
  error?: string;
}

interface LeaveBalancesResult {
  leaveBalances: LeaveBalance[];
  leaveTransactions: LeaveTransaction[];
  getEmployeeLeaveBalance: (employeeId: string) => LeaveBalance | null;
  adjustLeaveBalance: (employeeId: string, update: LeaveBalanceUpdate) => void;
  isBalanceLocked: (employeeId: string) => boolean;
  setBalanceLock: (employeeId: string, locked: boolean) => void;
  isLeaveTypeEligible: (employeeId: string, leaveType: LeaveBalanceType) => boolean;
  getLeavePolicyForEmployee: (employeeId: string, leaveType: LeaveBalanceType) => ReturnType<typeof resolveLeavePolicy>;
  applyLeaveUsage: (employeeId: string, leaveType: LeaveBalanceType, days: number, source?: LeaveTransaction['source'], approved?: boolean) => LeaveUsageResult;
}

const buildBalanceKey = (employeeId: string, year: string) => `${employeeId}::${year}`;

const buildLeaveId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `LEAVE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const balanceTypeToPolicy = (leaveType: LeaveBalanceType) => {
  switch (leaveType) {
    case 'casual':
      return 'CASUAL';
    case 'annual':
      return 'ANNUAL';
    case 'sick':
      return 'SICK';
    case 'childCare':
      return 'CHILD_CARE';
    case 'maternity':
      return 'MATERNITY';
    default:
      return 'ANNUAL';
  }
};

const resolvePolicyForEmployee = (
  employeeId: string,
  leaveType: LeaveBalanceType,
  options: LeaveBalancesOptions,
  employeeGender?: 'Male' | 'Female' | null
) => {
  const policyId = balanceTypeToPolicy(leaveType);
  return resolveLeavePolicy(policyId, {
    employeeGender,
    yearsOfService: options.yearsOfServiceByEmployee?.[employeeId],
    annualOverride: options.annualBalanceOverrides?.[employeeId]
  });
};

const buildLeaveBalance = (
  employeeId: string,
  year: string,
  options: LeaveBalancesOptions,
  employeeGender?: 'Male' | 'Female' | null
): LeaveBalance => {
  const casualPolicy = resolvePolicyForEmployee(employeeId, 'casual', options, employeeGender);
  const annualPolicy = resolvePolicyForEmployee(employeeId, 'annual', options, employeeGender);
  const sickPolicy = resolvePolicyForEmployee(employeeId, 'sick', options, employeeGender);
  const childCarePolicy = resolvePolicyForEmployee(employeeId, 'childCare', options, employeeGender);
  const maternityPolicy = resolvePolicyForEmployee(employeeId, 'maternity', options, employeeGender);

  const casualBalance = isGenderEligibleForLeave(casualPolicy, employeeGender) ? casualPolicy.maxDaysPerYear : 0;
  const annualBalance = isGenderEligibleForLeave(annualPolicy, employeeGender) ? annualPolicy.maxDaysPerYear : 0;
  const sickBalance = isGenderEligibleForLeave(sickPolicy, employeeGender) ? sickPolicy.maxDaysPerYear : 0;
  const childCareBalance = isGenderEligibleForLeave(childCarePolicy, employeeGender) ? childCarePolicy.maxDaysPerYear : 0;
  const maternityAllowedByPolicy = isGenderEligibleForLeave(maternityPolicy, employeeGender);
  const maternityAllowedByOverride = options.eligibleForMaternityByEmployee ? Boolean(options.eligibleForMaternityByEmployee[employeeId]) : true;
  const maternityBalance = (maternityAllowedByPolicy && maternityAllowedByOverride) ? maternityPolicy.maxDaysPerYear : 0;

  return {
    id: buildLeaveId(),
    employeeId,
    year,
    casualLeaveBalance: casualBalance,
    annualLeaveBalance: annualBalance,
    sickLeaveBalance: sickBalance,
    childCareLeaveBalance: childCareBalance,
    maternityLeaveBalance: maternityBalance,
    lastUpdatedAt: new Date().toISOString()
  };
};

const useLeaveBalances = (options: LeaveBalancesOptions): LeaveBalancesResult => {
  const { employees, academicYearId } = options;
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveTransactions, setLeaveTransactions] = useState<LeaveTransaction[]>([]);
  const [lockedBalances, setLockedBalances] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLeaveBalances((prev) => {
      const existingByKey = new Map(prev.map((balance) => [buildBalanceKey(balance.employeeId, balance.year), balance]));
      const updated: LeaveBalance[] = [...prev];

      employees.forEach((employee) => {
        const key = buildBalanceKey(employee.Emp_ID, academicYearId);
        if (existingByKey.has(key)) return;
        const employeeGender = resolveEmployeeGender(employee);
        updated.push(buildLeaveBalance(employee.Emp_ID, academicYearId, options, employeeGender));
      });

      return updated;
    });
  }, [
    academicYearId,
    employees,
    options.annualBalanceOverrides,
    options.eligibleForMaternityByEmployee,
    options.yearsOfServiceByEmployee
  ]);

  const leaveBalanceByEmployee = useMemo(() => {
    return new Map(leaveBalances.map((balance) => [buildBalanceKey(balance.employeeId, balance.year), balance]));
  }, [leaveBalances]);

  const getEmployeeLeaveBalance = useCallback((employeeId: string) => {
    const key = buildBalanceKey(employeeId, academicYearId);
    return leaveBalanceByEmployee.get(key) || null;
  }, [academicYearId, leaveBalanceByEmployee]);

  const adjustLeaveBalance = useCallback((employeeId: string, update: LeaveBalanceUpdate) => {
    const key = buildBalanceKey(employeeId, academicYearId);
    if (lockedBalances[key]) {
      throw new Error('تم إقفال الرصيد ولا يمكن تعديله');
    }

    setLeaveBalances((prev) => prev.map((balance) => {
      if (balance.employeeId !== employeeId || balance.year !== academicYearId) return balance;
      const next = {
        ...balance,
        ...update,
        lastUpdatedAt: new Date().toISOString()
      } as LeaveBalance;
      return next;
    }));
  }, [academicYearId, lockedBalances]);

  const isBalanceLocked = useCallback((employeeId: string) => {
    const key = buildBalanceKey(employeeId, academicYearId);
    return Boolean(lockedBalances[key]);
  }, [academicYearId, lockedBalances]);

  const setBalanceLock = useCallback((employeeId: string, locked: boolean) => {
    const key = buildBalanceKey(employeeId, academicYearId);
    setLockedBalances((prev) => ({ ...prev, [key]: locked }));
  }, [academicYearId]);

  const getEmployeeGender = useCallback((employeeId: string) => {
    const employee = employees.find((item) => item.Emp_ID === employeeId);
    return resolveEmployeeGender(employee);
  }, [employees]);

  const isLeaveTypeEligible = useCallback((employeeId: string, leaveType: LeaveBalanceType) => {
    const gender = getEmployeeGender(employeeId);
    const policy = resolvePolicyForEmployee(employeeId, leaveType, options, gender);
    if (!isGenderEligibleForLeave(policy, gender)) return false;
    if (leaveType === 'maternity' && options.eligibleForMaternityByEmployee) {
      return Boolean(options.eligibleForMaternityByEmployee[employeeId]);
    }
    return true;
  }, [getEmployeeGender, options]);

  const getLeavePolicyForEmployee = useCallback((employeeId: string, leaveType: LeaveBalanceType) => {
    return resolvePolicyForEmployee(employeeId, leaveType, options, getEmployeeGender(employeeId));
  }, [getEmployeeGender, options]);

  const getUsedDaysByType = useCallback((employeeId: string, leaveType: LeaveBalanceType) => {
    return leaveTransactions
      .filter((transaction) => transaction.employeeId === employeeId && transaction.year === academicYearId && transaction.leaveType === leaveType)
      .reduce((sum, transaction) => sum + transaction.days, 0);
  }, [academicYearId, leaveTransactions]);

  const applyLeaveUsage = useCallback((employeeId: string, leaveType: LeaveBalanceType, days: number, source: LeaveTransaction['source'] = 'attendance', approved = false): LeaveUsageResult => {
    const record = getEmployeeLeaveBalance(employeeId);
    if (!record) {
      return { ok: false, error: 'لم يتم العثور على رصيد الإجازات لهذا الموظف' };
    }

    if (!isLeaveTypeEligible(employeeId, leaveType)) {
      return { ok: false, error: 'نوع الإجازة غير متاح لهذا الموظف' };
    }

    const policy = getLeavePolicyForEmployee(employeeId, leaveType);
    if (leaveType === 'annual' && !approved) {
      return { ok: false, error: 'إجازة اعتيادية تتطلب موافقة قبل الخصم' };
    }

    const usedDays = getUsedDaysByType(employeeId, leaveType);
    if (policy.maxDaysPerYear > 0 && (usedDays + days) > policy.maxDaysPerYear) {
      return { ok: false, error: 'تجاوز الحد القانوني للإجازة' };
    }

    const currentValue = (() => {
      switch (leaveType) {
        case 'casual':
          return record.casualLeaveBalance;
        case 'annual':
          return record.annualLeaveBalance;
        case 'sick':
          return record.sickLeaveBalance;
        case 'childCare':
          return record.childCareLeaveBalance;
        case 'maternity':
          return record.maternityLeaveBalance;
        default:
          return 0;
      }
    })();

    if (currentValue - days < 0) {
      return { ok: false, error: 'رصيد الإجازة غير كافٍ' };
    }

    adjustLeaveBalance(employeeId, {
      [`${leaveType}LeaveBalance`]: currentValue - days
    } as LeaveBalanceUpdate);

    setLeaveTransactions((prev) => ([
      ...prev,
      {
        id: buildLeaveId(),
        employeeId,
        year: academicYearId,
        leaveType,
        days,
        createdAt: new Date().toISOString(),
        source
      }
    ]));

    return { ok: true };
  }, [academicYearId, adjustLeaveBalance, getEmployeeLeaveBalance, getLeavePolicyForEmployee, getUsedDaysByType, isLeaveTypeEligible]);

  return {
    leaveBalances,
    leaveTransactions,
    getEmployeeLeaveBalance,
    adjustLeaveBalance,
    isBalanceLocked,
    setBalanceLock,
    isLeaveTypeEligible,
    getLeavePolicyForEmployee,
    applyLeaveUsage
  };
};

export default useLeaveBalances;

// Integration point:
// - Attendance module should call applyLeaveUsage when marking a leave day.
