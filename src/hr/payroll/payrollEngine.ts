export type LeaveTypeId = 'ANNUAL' | 'CASUAL' | 'SICK' | 'CHILD_CARE' | 'MATERNITY' | 'UNPAID';

export interface EmployeePayrollInput {
  employeeId: string;
  gender: 'Male' | 'Female';
  monthlyGrossSalary: number;
  dailyWage?: number;
}

export interface AttendanceSummary {
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  delayMinutes: number;
  delayDeductionAmount?: number;
}

export interface LeaveUsageSummary {
  annualDays: number;
  casualDays: number;
  sickDays: number;
  maternityDays: number;
  childCareDays: number;
  unpaidDays: number;
  annualBalance: number;
  casualBalance: number;
}

export interface PayrollMonthContext {
  month: number;
  year: number;
}

export interface PayrollCalculationResult {
  employeeId: string;
  totalWorkingDays: number;
  paidDays: number;
  unpaidDays: number;
  grossSalary: number;
  deductions: {
    absenceDeduction: number;
    delayDeduction: number;
  };
  insuranceFlags: {
    appliesInsurance: boolean;
  };
  netPayBeforeTax: number;
}

export interface PayrollCalculationInput {
  employee: EmployeePayrollInput;
  attendance: AttendanceSummary;
  leaveUsage: LeaveUsageSummary;
  context: PayrollMonthContext;
}

const clampToNonNegative = (value: number) => (value < 0 ? 0 : value);

const resolveDailyWage = (employee: EmployeePayrollInput, attendance: AttendanceSummary) => {
  if (employee.dailyWage && employee.dailyWage > 0) return employee.dailyWage;
  const divisor = attendance.totalWorkingDays > 0 ? attendance.totalWorkingDays : 30;
  return employee.monthlyGrossSalary / divisor;
};

const resolveDelayDeduction = (attendance: AttendanceSummary, dailyWage: number) => {
  if (attendance.delayDeductionAmount !== undefined) return attendance.delayDeductionAmount;
  if (attendance.totalWorkingDays <= 0) return 0;
  const dailyMinutes = 8 * 60;
  const hourlyRate = dailyWage / 8;
  return clampToNonNegative((attendance.delayMinutes / 60) * hourlyRate);
};

const normalizeLeaveUsage = (leaveUsage: LeaveUsageSummary) => {
  const annualUsed = clampToNonNegative(leaveUsage.annualDays);
  const casualUsed = clampToNonNegative(leaveUsage.casualDays);
  const sickUsed = clampToNonNegative(leaveUsage.sickDays);
  const maternityUsed = clampToNonNegative(leaveUsage.maternityDays);
  const childCareUsed = clampToNonNegative(leaveUsage.childCareDays);
  const unpaidUsed = clampToNonNegative(leaveUsage.unpaidDays);

  const annualBalance = clampToNonNegative(leaveUsage.annualBalance);
  const casualBalance = clampToNonNegative(leaveUsage.casualBalance);

  const annualPaid = Math.min(annualUsed, annualBalance);
  const casualPaid = Math.min(casualUsed, casualBalance);
  const annualExcess = clampToNonNegative(annualUsed - annualBalance);
  const casualExcess = clampToNonNegative(casualUsed - casualBalance);

  return {
    annualPaid,
    casualPaid,
    annualExcess,
    casualExcess,
    sickUsed,
    maternityUsed,
    childCareUsed,
    unpaidUsed
  };
};

export const calculateMonthlyPayroll = (input: PayrollCalculationInput): PayrollCalculationResult => {
  const { employee, attendance, leaveUsage } = input;

  if (employee.gender === 'Male' && (leaveUsage.maternityDays > 0 || leaveUsage.childCareDays > 0)) {
    throw new Error('إجازات الوضع أو رعاية الطفل غير مسموحة للذكور');
  }

  const dailyWage = resolveDailyWage(employee, attendance);
  const delayDeduction = resolveDelayDeduction(attendance, dailyWage);

  const normalizedLeaves = normalizeLeaveUsage(leaveUsage);

  const unpaidDueToLeaveExcess = normalizedLeaves.annualExcess + normalizedLeaves.casualExcess;
  const unpaidLeaveDays = normalizedLeaves.sickUsed + normalizedLeaves.maternityUsed + normalizedLeaves.childCareUsed + normalizedLeaves.unpaidUsed + unpaidDueToLeaveExcess;

  const totalWorkingDays = clampToNonNegative(attendance.totalWorkingDays);
  const unexcusedAbsenceDays = clampToNonNegative(attendance.absentDays);
  const unpaidDays = clampToNonNegative(unpaidLeaveDays + unexcusedAbsenceDays);

  const paidDays = clampToNonNegative(totalWorkingDays - unpaidDays);
  const absenceDeduction = clampToNonNegative(unpaidDays * dailyWage);

  const grossSalary = employee.monthlyGrossSalary;
  const netPayBeforeTax = clampToNonNegative(grossSalary - absenceDeduction - delayDeduction);

  return {
    employeeId: employee.employeeId,
    totalWorkingDays,
    paidDays,
    unpaidDays,
    grossSalary,
    deductions: {
      absenceDeduction,
      delayDeduction
    },
    insuranceFlags: {
      appliesInsurance: normalizedLeaves.childCareUsed <= 0
    },
    netPayBeforeTax
  };
};
