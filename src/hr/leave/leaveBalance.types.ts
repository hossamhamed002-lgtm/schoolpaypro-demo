export interface LeaveBalance {
  employeeId: string;
  academicYearId: string;
  leaveTypeId: string;
  totalAllowed: number;
  used: number;
  remaining: number;
  manuallyAdjusted: boolean;
}
