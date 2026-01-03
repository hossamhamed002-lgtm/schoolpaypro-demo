export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'OnLeave' | 'Holiday';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: AttendanceStatus;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  notes?: string;
  leaveTypeId?: string;
}

export interface AttendanceSummary {
  employeeId: string;
  month: number;
  totalAbsentDays: number;
  totalLateMinutes: number;
  totalEarlyLeaveMinutes: number;
  presentDays: number;
  leaveDays: number;
}

export interface AttendancePolicy {
  WORK_START: string;
  WORK_END: string;
  LATE_GRACE_MINUTES: number;
}
