export type LeaveBalanceType = 'casual' | 'annual' | 'sick' | 'childcare' | 'maternity';

export interface LeaveBalanceRecord {
  employeeId: string;
  academicYearId: string;
  leaveType: LeaveBalanceType;
  totalAllowedDays: number;
  usedDays: number;
  remainingDays: number;
  carryOverAllowed: boolean;
  autoCalculated: boolean;
}
