export interface LeaveBalance {
  id: string;
  employeeId: string;
  year: string;
  casualLeaveBalance: number;
  annualLeaveBalance: number;
  sickLeaveBalance: number;
  childCareLeaveBalance: number;
  maternityLeaveBalance: number;
  lastUpdatedAt: string;
}

export type LeaveBalanceType = 'casual' | 'annual' | 'sick' | 'childCare' | 'maternity';
