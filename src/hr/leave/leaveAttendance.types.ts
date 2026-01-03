export type LeaveAttendanceStatus = 'SICK_LEAVE' | 'MATERNITY_LEAVE' | 'CHILDCARE_LEAVE' | 'CASUAL_LEAVE' | 'ANNUAL_LEAVE';

export interface LeaveAttendanceEntry {
  id: string;
  employeeId: string;
  date: string;
  status: LeaveAttendanceStatus;
  leaveId: string;
  paidDays: boolean;
  insuranceCovered: boolean;
  countsAsAbsent: boolean;
}
