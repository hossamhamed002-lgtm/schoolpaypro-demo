import { useCallback, useEffect, useMemo, useState } from 'react';
import { isGenderEligibleForLeave, resolveEmployeeGender, resolveLeavePolicy } from '../src/hr/leave/leavePolicy';
import { LeaveAttendanceEntry, LeaveAttendanceStatus } from '../src/hr/leave/leaveAttendance.types';

export type LeaveTypeId = 'ANNUAL' | 'CASUAL' | 'SICK' | 'CHILD_CARE' | 'MATERNITY' | 'UNPAID';
export type LeavePaidBy = 'SCHOOL' | 'EMPLOYEE';

export interface LeaveEntity {
  id: string;
  employeeId: string;
  leaveType: LeaveTypeId;
  startDate: string;
  endDate: string;
  totalDays: number;
  approved: boolean;
  affectsSalary: boolean;
  affectsInsurance: boolean;
  paidBy: LeavePaidBy;
  insuranceDecisionApplied?: boolean;
  notes?: string;
  academicYearId: string;
}

export interface LeaveBalance {
  employeeId: string;
  annualBalance: number;
  casualBalance: number;
  sickUsed: number;
  childCareUsed: number;
  maternityUsed: number;
}

interface LeaveManagementOptions {
  employees: Array<{ Emp_ID: string; National_ID?: string | null; Gender?: string | null }>;
  academicYearId: string;
  getAnnualBalanceByServiceYears?: (employeeId: string) => number;
  annualBalanceOverrides?: Record<string, number>;
}

interface LeaveImpactSummary {
  deductedDays: number;
  deductedAmount: number;
  insuranceIncludedDays: number;
  insuranceExcludedDays: number;
}

interface AttendanceStatusResult {
  status: 'ABSENT' | 'LEAVE';
  leaveId?: string;
}

interface LeaveManagementResult {
  leaveBalances: LeaveBalance[];
  leaveRecords: LeaveEntity[];
  leaveAttendanceEntries: LeaveAttendanceEntry[];
  addLeaveRecord: (payload: Omit<LeaveEntity, 'id' | 'approved' | 'affectsSalary' | 'affectsInsurance' | 'paidBy'>) => LeaveEntity;
  approveLeave: (leaveId: string) => void;
  rejectLeave: (leaveId: string) => void;
  getEmployeeLeaveSummary: (employeeId: string) => { employeeId: string; academicYearId: string; balances: LeaveBalance; leaves: LeaveEntity[] };
  resolveAttendanceStatus: (employeeId: string, date: string, currentStatus: 'ABSENT' | 'LEAVE') => AttendanceStatusResult;
  calculateEmployeeLeaveImpact: (employeeId: string, month: number, year: number) => LeaveImpactSummary;
}

const resolvePolicyForEmployee = (
  leaveType: LeaveTypeId,
  employeeId: string,
  options: LeaveManagementOptions,
  employeeGender?: 'Male' | 'Female' | null
) => {
  const annualOverride = options.annualBalanceOverrides?.[employeeId]
    ?? (options.getAnnualBalanceByServiceYears ? options.getAnnualBalanceByServiceYears(employeeId) : undefined);

  return resolveLeavePolicy(leaveType, {
    employeeGender,
    annualOverride
  });
};

const buildLeaveId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `LEAVE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const parseDate = (value: string) => new Date(`${value}T00:00:00`);

const isDateWithinRange = (date: string, start: string, end: string) => {
  const target = parseDate(date).getTime();
  return target >= parseDate(start).getTime() && target <= parseDate(end).getTime();
};

const countOverlapDays = (start: string, end: string, month: number, year: number) => {
  const rangeStart = parseDate(start);
  const rangeEnd = parseDate(end);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  const startDate = rangeStart > monthStart ? rangeStart : monthStart;
  const endDate = rangeEnd < monthEnd ? rangeEnd : monthEnd;

  if (startDate > endDate) return 0;

  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

const listDatesBetween = (start: string, end: string) => {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  const dates: string[] = [];
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return dates;
  if (endDate < startDate) return dates;
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

const leaveTypeToAttendanceStatus = (leaveType: LeaveTypeId): LeaveAttendanceStatus => {
  switch (leaveType) {
    case 'SICK':
      return 'SICK_LEAVE';
    case 'MATERNITY':
      return 'MATERNITY_LEAVE';
    case 'CHILD_CARE':
      return 'CHILDCARE_LEAVE';
    case 'CASUAL':
      return 'CASUAL_LEAVE';
    case 'ANNUAL':
    default:
      return 'ANNUAL_LEAVE';
  }
};

const initializeBalances = (
  employees: Array<{ Emp_ID: string; National_ID?: string | null; Gender?: string | null }>,
  options: LeaveManagementOptions
): LeaveBalance[] => {
  return employees.map((employee) => {
    const employeeGender = resolveEmployeeGender(employee);
    const annualPolicy = resolvePolicyForEmployee('ANNUAL', employee.Emp_ID, options, employeeGender);
    const casualPolicy = resolvePolicyForEmployee('CASUAL', employee.Emp_ID, options, employeeGender);
    return {
      employeeId: employee.Emp_ID,
      annualBalance: isGenderEligibleForLeave(annualPolicy, employeeGender) ? annualPolicy.maxDaysPerYear : 0,
      casualBalance: isGenderEligibleForLeave(casualPolicy, employeeGender) ? casualPolicy.maxDaysPerYear : 0,
      sickUsed: 0,
      childCareUsed: 0,
      maternityUsed: 0
    };
  });
};

const useLeaveManagement = (options: LeaveManagementOptions): LeaveManagementResult => {
  const { employees, academicYearId } = options;
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>(() => initializeBalances(employees, options));
  const [leaveRecords, setLeaveRecords] = useState<LeaveEntity[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem('hr_leave_records_v1');
      if (!stored) return [];
      const parsed = JSON.parse(stored) as LeaveEntity[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [leaveAttendanceEntries, setLeaveAttendanceEntries] = useState<LeaveAttendanceEntry[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('hr_leave_records_v1', JSON.stringify(leaveRecords));
    } catch {
      // ignore storage errors
    }
  }, [leaveRecords]);

  const balanceByEmployee = useMemo(() => {
    return new Map(leaveBalances.map((balance) => [balance.employeeId, balance]));
  }, [leaveBalances]);

  const ensureBalance = useCallback((employeeId: string) => {
    if (balanceByEmployee.has(employeeId)) return;
    const employee = employees.find((item) => item.Emp_ID === employeeId);
    setLeaveBalances((prev) => [...prev, ...initializeBalances([employee || { Emp_ID: employeeId }], options)]);
  }, [balanceByEmployee, employees, options]);

  const getApprovedLeavesForEmployee = useCallback((employeeId: string) => {
    return leaveRecords.filter((leave) => leave.employeeId === employeeId && leave.academicYearId === academicYearId && leave.approved);
  }, [academicYearId, leaveRecords]);

  const getApprovedLeaveTotals = useCallback((employeeId: string) => {
    const approved = getApprovedLeavesForEmployee(employeeId);
    return approved.reduce((totals, leave) => {
      totals[leave.leaveType] = (totals[leave.leaveType] || 0) + leave.totalDays;
      return totals;
    }, {} as Record<LeaveTypeId, number>);
  }, [getApprovedLeavesForEmployee]);

  const getAllLeaveTotals = useCallback((employeeId: string) => {
    const all = leaveRecords.filter((leave) => leave.employeeId === employeeId && leave.academicYearId === academicYearId);
    return all.reduce((totals, leave) => {
      totals[leave.leaveType] = (totals[leave.leaveType] || 0) + leave.totalDays;
      return totals;
    }, {} as Record<LeaveTypeId, number>);
  }, [academicYearId, leaveRecords]);

  const addLeaveRecord = useCallback((payload: Omit<LeaveEntity, 'id' | 'approved' | 'affectsSalary' | 'affectsInsurance' | 'paidBy'>) => {
    ensureBalance(payload.employeeId);
    const employee = employees.find((item) => item.Emp_ID === payload.employeeId);
    const employeeGender = resolveEmployeeGender(employee);
    const policy = resolvePolicyForEmployee(payload.leaveType, payload.employeeId, options, employeeGender);
    if (!isGenderEligibleForLeave(policy, employeeGender)) {
      throw new Error('نوع الإجازة غير متاح لهذا الموظف');
    }

    const existingTotals = getAllLeaveTotals(payload.employeeId);
    const usedTotal = existingTotals[payload.leaveType] || 0;
    if (policy.maxDaysPerYear > 0 && (usedTotal + payload.totalDays) > policy.maxDaysPerYear) {
      throw new Error('تجاوز الحد القانوني للإجازة');
    }
    if (policy.hasMaxDuration && policy.maxDaysPerRequest && payload.totalDays > policy.maxDaysPerRequest) {
      throw new Error('عدد الأيام يتجاوز الحد المسموح للطلب');
    }

    const balance = balanceByEmployee.get(payload.employeeId);
    if (balance) {
      if (payload.leaveType === 'ANNUAL' && payload.totalDays > balance.annualBalance) {
        throw new Error('رصيد الإجازة الاعتيادية غير كافٍ');
      }
      if (payload.leaveType === 'CASUAL' && payload.totalDays > balance.casualBalance) {
        throw new Error('رصيد الإجازة العارضة غير كافٍ');
      }
    }

    const record: LeaveEntity = {
      ...payload,
      id: buildLeaveId(),
      approved: false,
      affectsSalary: policy.affectsSalary,
      affectsInsurance: policy.affectsInsurance,
      paidBy: policy.paidBy,
      insuranceDecisionApplied: payload.leaveType === 'SICK'
        ? (payload.insuranceDecisionApplied ?? true)
        : undefined
    };
    setLeaveRecords((prev) => [...prev, record]);
    return record;
  }, [balanceByEmployee, employees, ensureBalance, getAllLeaveTotals, options]);

  const approveLeave = useCallback((leaveId: string) => {
    const record = leaveRecords.find((leave) => leave.id === leaveId);
    if (!record) return;

    ensureBalance(record.employeeId);

    const totals = getApprovedLeaveTotals(record.employeeId);
    const employee = employees.find((item) => item.Emp_ID === record.employeeId);
    const employeeGender = resolveEmployeeGender(employee);
    const policy = resolvePolicyForEmployee(record.leaveType, record.employeeId, options, employeeGender);

    if (!isGenderEligibleForLeave(policy, employeeGender)) {
      throw new Error('نوع الإجازة غير متاح لهذا الموظف');
    }

    const balance = balanceByEmployee.get(record.employeeId);
    if (!balance) return;

    const usedTotal = totals[record.leaveType] || 0;
    if (policy.maxDaysPerYear > 0 && (usedTotal + record.totalDays) > policy.maxDaysPerYear) {
      throw new Error('تجاوز الحد القانوني للإجازة');
    }
    if (policy.hasMaxDuration && policy.maxDaysPerRequest && record.totalDays > policy.maxDaysPerRequest) {
      throw new Error('عدد الأيام يتجاوز الحد المسموح للطلب');
    }

    if (record.leaveType === 'ANNUAL' && (usedTotal + record.totalDays) > balance.annualBalance) {
      throw new Error('رصيد الإجازة الاعتيادية غير كافٍ');
    }

    if (record.leaveType === 'CASUAL' && (usedTotal + record.totalDays) > balance.casualBalance) {
      throw new Error('رصيد الإجازة العارضة غير كافٍ');
    }

    setLeaveRecords((prev) => prev.map((leave) =>
      leave.id === leaveId ? { ...leave, approved: true } : leave
    ));

    if (policy.affectsAttendance) {
      const attendanceEntries = listDatesBetween(record.startDate, record.endDate).map((date) => ({
        id: buildLeaveId(),
        employeeId: record.employeeId,
        date,
        status: leaveTypeToAttendanceStatus(record.leaveType),
        leaveId: record.id,
        paidDays: policy.isPaid,
        insuranceCovered: record.leaveType === 'SICK'
          ? Boolean(record.insuranceDecisionApplied)
          : policy.countsForInsurance,
        countsAsAbsent: policy.countsAsAbsent
      }));

      setLeaveAttendanceEntries((prev) => {
        const existingKeys = new Set(prev.map((entry) => `${entry.leaveId}::${entry.date}`));
        const nextEntries = attendanceEntries.filter((entry) => !existingKeys.has(`${entry.leaveId}::${entry.date}`));
        return [...prev, ...nextEntries];
      });
    }

    setLeaveBalances((prev) => prev.map((item) => {
      if (item.employeeId !== record.employeeId) return item;
      return {
        ...item,
        annualBalance: record.leaveType === 'ANNUAL' ? Math.max(0, item.annualBalance - record.totalDays) : item.annualBalance,
        casualBalance: record.leaveType === 'CASUAL' ? Math.max(0, item.casualBalance - record.totalDays) : item.casualBalance,
        sickUsed: record.leaveType === 'SICK' ? item.sickUsed + record.totalDays : item.sickUsed,
        childCareUsed: record.leaveType === 'CHILD_CARE' ? item.childCareUsed + record.totalDays : item.childCareUsed,
        maternityUsed: record.leaveType === 'MATERNITY' ? item.maternityUsed + record.totalDays : item.maternityUsed
      };
    }));
  }, [balanceByEmployee, employees, ensureBalance, getApprovedLeaveTotals, leaveRecords, options]);

  const rejectLeave = useCallback((leaveId: string) => {
    setLeaveRecords((prev) => prev.map((leave) =>
      leave.id === leaveId ? { ...leave, approved: false } : leave
    ));
  }, []);

  const getEmployeeLeaveSummary = useCallback((employeeId: string) => {
    ensureBalance(employeeId);
    const balance = balanceByEmployee.get(employeeId) || initializeBalances([{ Emp_ID: employeeId }], options)[0];
    const leaves = leaveRecords.filter((leave) => leave.employeeId === employeeId && leave.academicYearId === academicYearId);
    return { employeeId, academicYearId, balances: balance, leaves };
  }, [academicYearId, balanceByEmployee, ensureBalance, leaveRecords, options]);

  const resolveAttendanceStatus = useCallback((employeeId: string, date: string, currentStatus: 'ABSENT' | 'LEAVE') => {
    if (currentStatus !== 'ABSENT') return { status: currentStatus };
    const approved = leaveRecords.find((leave) =>
      leave.employeeId === employeeId &&
      leave.academicYearId === academicYearId &&
      leave.approved &&
      isDateWithinRange(date, leave.startDate, leave.endDate)
    );
    if (!approved) return { status: 'ABSENT' };
    return { status: 'LEAVE', leaveId: approved.id };
  }, [academicYearId, leaveRecords]);

  const calculateEmployeeLeaveImpact = useCallback((employeeId: string, month: number, year: number): LeaveImpactSummary => {
    const approvedLeaves = leaveRecords.filter((leave) =>
      leave.employeeId === employeeId &&
      leave.approved &&
      leave.academicYearId === academicYearId
    );

    let deductedDays = 0;
    let insuranceIncludedDays = 0;
    let insuranceExcludedDays = 0;

    approvedLeaves.forEach((leave) => {
      const overlapDays = countOverlapDays(leave.startDate, leave.endDate, month, year);
      if (overlapDays <= 0) return;

      if (leave.affectsSalary) {
        deductedDays += overlapDays;
      }

      if (leave.affectsInsurance) {
        insuranceExcludedDays += overlapDays;
      } else {
        insuranceIncludedDays += overlapDays;
      }
    });

    return {
      deductedDays,
      deductedAmount: 0,
      insuranceIncludedDays,
      insuranceExcludedDays
    };
  }, [academicYearId, leaveRecords]);

  return {
    leaveBalances,
    leaveRecords,
    leaveAttendanceEntries,
    addLeaveRecord,
    approveLeave,
    rejectLeave,
    getEmployeeLeaveSummary,
    resolveAttendanceStatus,
    calculateEmployeeLeaveImpact
  };
};

export default useLeaveManagement;

// Integration points:
// - Attendance screen should call resolveAttendanceStatus when an employee is absent.
// - Payroll screen should call calculateEmployeeLeaveImpact for approved leave deductions.
// - Salary logic should rely on affectsSalary / affectsInsurance and paidBy flags.
