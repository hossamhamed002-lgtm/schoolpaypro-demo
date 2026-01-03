import { LeaveBalanceType } from './leaveBalances.types';

export interface LeaveTransaction {
  id: string;
  employeeId: string;
  year: string;
  leaveType: LeaveBalanceType;
  days: number;
  createdAt: string;
  source: 'attendance' | 'manual';
}
