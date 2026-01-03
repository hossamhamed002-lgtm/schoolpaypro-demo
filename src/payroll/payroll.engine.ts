import {
  AttendanceSummary,
  ApprovedLeave,
  LeaveBalances,
  PayrollInput,
  PayrollResult
} from './payroll.types';
import { calculateAbsenceDeduction, calculateDelayDeduction, resolveLeaveImpact } from './payroll.rules';
import { calculatePayrollSettingsImpact } from '../hr/payroll/payrollSettingsCalculator';
import { defaultPayrollSettings } from '../hr/payroll/payrollSettings.store';

const clampNonNegative = (value: number) => (value < 0 ? 0 : value);

const normalizeAttendance = (attendance?: AttendanceSummary): AttendanceSummary => {
  return {
    daysPresent: clampNonNegative(attendance?.daysPresent ?? 0),
    delaysMinutes: clampNonNegative(attendance?.delaysMinutes ?? 0),
    absences: clampNonNegative(attendance?.absences ?? 0),
    earlyLeaveMinutes: clampNonNegative(attendance?.earlyLeaveMinutes ?? 0),
    totalWorkingDays: attendance?.totalWorkingDays,
    absentDays: clampNonNegative(attendance?.absentDays ?? 0),
    lateMinutes: clampNonNegative(attendance?.lateMinutes ?? 0),
    overtimeHours: clampNonNegative(attendance?.overtimeHours ?? 0),
    leaveDaysExcluded: clampNonNegative(attendance?.leaveDaysExcluded ?? 0)
  };
};

const normalizeBalances = (balances?: LeaveBalances): LeaveBalances => {
  return {
    annualBalance: clampNonNegative(balances?.annualBalance ?? 0),
    casualBalance: clampNonNegative(balances?.casualBalance ?? 0)
  };
};

const normalizeLeaves = (leaves?: ApprovedLeave[]) => {
  return (leaves || []).map((leave) => ({
    ...leave,
    days: clampNonNegative(leave.days)
  }));
};

const calculateDailyRate = (baseSalary: number, workingDays: number) => {
  const divisor = workingDays > 0 ? workingDays : 30;
  return clampNonNegative(baseSalary) / divisor;
};

export const calculatePayroll = (input: PayrollInput): PayrollResult => {
  const baseSalary = clampNonNegative(input.baseSalary || 0);
  const incentives = clampNonNegative(input.incentives || 0);
  const allowances = clampNonNegative(input.allowances || 0);

  const attendance = normalizeAttendance(input.attendanceSummary);
  const balances = normalizeBalances(input.leaveBalances);
  const leaves = normalizeLeaves(input.approvedLeaves);

  const totalWorkingDays = clampNonNegative(
    attendance.totalWorkingDays ??
    (attendance.daysPresent + (attendance.absentDays || attendance.absences))
  );

  const dailyRate = calculateDailyRate(baseSalary, totalWorkingDays);
  const hourlyRate = dailyRate / 8;

  const lateMinutes = clampNonNegative(attendance.lateMinutes || attendance.delaysMinutes);
  const earlyLeaveMinutes = clampNonNegative(attendance.earlyLeaveMinutes || 0);
  const rawAbsentDays = clampNonNegative(attendance.absentDays || attendance.absences);
  const leaveDaysExcluded = clampNonNegative(attendance.leaveDaysExcluded || 0);
  const countedAbsenceDays = clampNonNegative(rawAbsentDays - leaveDaysExcluded);

  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let insuranceExemptLeaveDays = 0;
  let annualUsed = 0;
  let casualUsed = 0;

  const breakdown: Array<{ rule: string; amount: number; note?: string }> = [];

  leaves.forEach((leave) => {
    const impact = resolveLeaveImpact(leave, input.gender);
    paidLeaveDays += impact.paidDays;
    unpaidLeaveDays += impact.unpaidDays;
    if (!impact.insuranceCovered) {
      insuranceExemptLeaveDays += leave.days;
    }

    if (leave.leaveType === 'ANNUAL') annualUsed += leave.days;
    if (leave.leaveType === 'CASUAL') casualUsed += leave.days;
  });

  const annualExcess = clampNonNegative(annualUsed - balances.annualBalance);
  const casualExcess = clampNonNegative(casualUsed - balances.casualBalance);
  const excessUnpaid = annualExcess + casualExcess;

  if (excessUnpaid > 0) {
    unpaidLeaveDays += excessUnpaid;
    breakdown.push({
      rule: 'leave.balance.excess',
      amount: excessUnpaid * dailyRate,
      note: 'رصيد الإجازات غير كافٍ وتم احتساب الفرق كغياب غير مدفوع'
    });
  }

  const absenceDeduction = calculateAbsenceDeduction(countedAbsenceDays, dailyRate);
  const lateDeduction = calculateDelayDeduction(lateMinutes, hourlyRate);
  const earlyLeaveDeduction = calculateDelayDeduction(earlyLeaveMinutes, hourlyRate);
  const leaveDeduction = calculateAbsenceDeduction(unpaidLeaveDays, dailyRate);

  breakdown.push({ rule: 'attendance.absence', amount: absenceDeduction, note: 'خصم غياب غير مبرر' });
  breakdown.push({ rule: 'attendance.late', amount: lateDeduction, note: 'خصم التأخير' });
  breakdown.push({ rule: 'attendance.early', amount: earlyLeaveDeduction, note: 'خصم الانصراف المبكر' });
  breakdown.push({ rule: 'leave.deduction', amount: leaveDeduction, note: 'خصم إجازات غير مدفوعة' });

  const overtimeRate = clampNonNegative(input.overtimeRate ?? 0);
  const overtimeHours = clampNonNegative(attendance.overtimeHours ?? 0);
  const overtimeAmount = clampNonNegative(overtimeHours * overtimeRate);

  if (overtimeAmount > 0) {
    breakdown.push({ rule: 'attendance.overtime', amount: overtimeAmount, note: 'قيمة الساعات الإضافية' });
  }

  const grossSalary = baseSalary + incentives + allowances + overtimeAmount;

  const insuranceEligibleDays = clampNonNegative(totalWorkingDays - insuranceExemptLeaveDays);
  const insurableEarnings = input.insuranceEligible && totalWorkingDays > 0
    ? (grossSalary * insuranceEligibleDays / totalWorkingDays)
    : 0;

  const payrollSettings = input.payrollSettings ?? defaultPayrollSettings;
  const settingsImpact = calculatePayrollSettingsImpact({
    baseSalary,
    incentives,
    allowances: allowances + overtimeAmount,
    attendanceDeduction: absenceDeduction + lateDeduction + earlyLeaveDeduction,
    leaveDeduction,
    settings: payrollSettings,
    insurableEarnings,
    taxableEarnings: clampNonNegative(grossSalary - absenceDeduction - lateDeduction - earlyLeaveDeduction - leaveDeduction)
  });

  const deductionsTotal = clampNonNegative(
    absenceDeduction +
    lateDeduction +
    earlyLeaveDeduction +
    leaveDeduction +
    settingsImpact.insuranceEmployee +
    settingsImpact.taxDeduction +
    settingsImpact.emergencyFundDeduction
  );

  const netSalary = clampNonNegative(grossSalary - deductionsTotal);

  breakdown.push(...settingsImpact.breakdown);

  return {
    grossSalary,
    deductions: {
      absenceDeduction,
      delayDeduction: lateDeduction,
      leaveDeduction
    },
    insuranceEmployee: settingsImpact.insuranceEmployee,
    insuranceEmployer: settingsImpact.insuranceEmployer,
    netSalary,
    totalDeductions: deductionsTotal,
    countedAbsenceDays,
    totalLateMinutes: lateMinutes,
    earlyLeaveDeduction,
    overtimeAmount,
    breakdown
  };
};
