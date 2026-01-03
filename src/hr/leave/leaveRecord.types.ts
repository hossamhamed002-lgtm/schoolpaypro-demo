export type LeaveRecordStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRecord {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  academicYearId: string;
  status: LeaveRecordStatus;
  notes: string | null;
  createdAt: string;
}
