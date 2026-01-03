export type PayrollLeaveType = 'ANNUAL' | 'CASUAL' | 'SICK' | 'CHILD_CARE' | 'MATERNITY';

export interface AttendanceSummary {
  daysPresent: number;
  delaysMinutes: number;
  absences: number;
  earlyLeaveMinutes?: number;
  totalWorkingDays?: number;
  absentDays?: number;
  lateMinutes?: number;
  overtimeHours?: number;
  leaveDaysExcluded?: number;
}

export interface ApprovedLeave {
  leaveType: PayrollLeaveType;
  days: number;
  decisionApplied?: boolean; // used for sick leave insurance decision
}

export interface LeaveBalances {
  annualBalance: number;
  casualBalance: number;
}

export interface PayrollInput {
  employeeId: string;
  gender: 'Male' | 'Female';
  baseSalary: number;
  incentives: number;
  allowances: number;
  attendanceSummary: AttendanceSummary;
  approvedLeaves: ApprovedLeave[];
  leaveBalances: LeaveBalances;
  insuranceEligible: boolean;
  payrollSettings?: import('../hr/payroll/payrollSettings.types').PayrollSettings;
  overtimeRate?: number;
}

export interface LeaveImpact {
  paidDays: number;
  unpaidDays: number;
  insuranceCovered: boolean;
}

export interface PayrollResult {
  grossSalary: number;
  deductions: {
    absenceDeduction: number;
    delayDeduction: number;
    leaveDeduction: number;
  };
  insuranceEmployee: number;
  insuranceEmployer: number;
  netSalary: number;
  totalDeductions: number;
  countedAbsenceDays: number;
  totalLateMinutes: number;
  earlyLeaveDeduction: number;
  overtimeAmount: number;
  breakdown: Array<{ rule: string; amount: number; note?: string }>;
}
