import { LeaveRecord } from '../leave/leaveRecord.types';
import { ATTENDANCE_POLICY } from './attendancePolicy';
import { AttendanceRecord, AttendanceStatus, AttendanceSummary } from './attendance.types';

import { AttendancePolicy } from './attendance.types';

interface BuildAttendanceInput {
  employeeId: string;
  date: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  notes?: string;
  leaveRecords?: LeaveRecord[];
  policy?: AttendancePolicy;
}

const parseTimeToMinutes = (time?: string | null) => {
  if (!time) return null;
  const match = time.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const buildAttendanceId = (employeeId: string, date: string) => {
  return `ATT-${employeeId}-${date}`;
};

const findApprovedLeaveForDate = (employeeId: string, date: string, leaveRecords: LeaveRecord[]) => {
  return leaveRecords.find((record) => {
    if (record.employeeId !== employeeId) return false;
    if (record.status !== 'approved') return false;
    return date >= record.startDate && date <= record.endDate;
  });
};

const resolveStatus = (hasLeave: boolean, checkInMinutes: number | null, lateMinutes: number) => {
  if (hasLeave) return 'OnLeave' as AttendanceStatus;
  if (checkInMinutes === null) return 'Absent' as AttendanceStatus;
  if (lateMinutes > 0) return 'Late' as AttendanceStatus;
  return 'Present' as AttendanceStatus;
};

export const buildDailyAttendanceRecord = (input: BuildAttendanceInput): AttendanceRecord => {
  const policy = input.policy || ATTENDANCE_POLICY;
  const leaveRecords = input.leaveRecords || [];
  const approvedLeave = findApprovedLeaveForDate(input.employeeId, input.date, leaveRecords);

  if (approvedLeave) {
    return {
      id: buildAttendanceId(input.employeeId, input.date),
      employeeId: input.employeeId,
      date: input.date,
      checkInTime: input.checkInTime ?? null,
      checkOutTime: input.checkOutTime ?? null,
      status: 'OnLeave',
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      notes: input.notes,
      leaveTypeId: approvedLeave.leaveTypeId
    };
  }

  const checkInMinutes = parseTimeToMinutes(input.checkInTime);
  const checkOutMinutes = parseTimeToMinutes(input.checkOutTime);
  const workStartMinutes = parseTimeToMinutes(policy.WORK_START) ?? 0;
  const workEndMinutes = parseTimeToMinutes(policy.WORK_END) ?? 0;
  const graceStart = workStartMinutes + policy.LATE_GRACE_MINUTES;

  if (checkInMinutes === null && checkOutMinutes === null) {
    return {
      id: buildAttendanceId(input.employeeId, input.date),
      employeeId: input.employeeId,
      date: input.date,
      checkInTime: input.checkInTime ?? null,
      checkOutTime: input.checkOutTime ?? null,
      status: 'Absent',
      lateMinutes: 0,
      earlyLeaveMinutes: 0,
      notes: input.notes
    };
  }

  const lateMinutes = checkInMinutes !== null && checkInMinutes > graceStart
    ? checkInMinutes - workStartMinutes
    : 0;

  const earlyLeaveMinutes = checkOutMinutes !== null && checkOutMinutes < workEndMinutes
    ? workEndMinutes - checkOutMinutes
    : 0;

  return {
    id: buildAttendanceId(input.employeeId, input.date),
    employeeId: input.employeeId,
    date: input.date,
    checkInTime: input.checkInTime ?? null,
    checkOutTime: input.checkOutTime ?? null,
    status: resolveStatus(false, checkInMinutes, lateMinutes),
    lateMinutes,
    earlyLeaveMinutes,
    notes: input.notes
  };
};

export const buildMonthlyAttendanceSummary = (
  employeeId: string,
  month: number,
  records: AttendanceRecord[]
): AttendanceSummary => {
  const monthPrefix = month.toString().padStart(2, '0');
  const relevantRecords = records.filter((record) => record.employeeId === employeeId && record.date.slice(5, 7) === monthPrefix);

  let totalAbsentDays = 0;
  let totalLateMinutes = 0;
  let totalEarlyLeaveMinutes = 0;
  let presentDays = 0;
  let leaveDays = 0;

  for (const record of relevantRecords) {
    if (record.status === 'Absent') totalAbsentDays += 1;
    if (record.status === 'Present' || record.status === 'Late') presentDays += 1;
    if (record.status === 'OnLeave') leaveDays += 1;
    totalLateMinutes += record.lateMinutes;
    totalEarlyLeaveMinutes += record.earlyLeaveMinutes;
  }

  return {
    employeeId,
    month,
    totalAbsentDays,
    totalLateMinutes,
    totalEarlyLeaveMinutes,
    presentDays,
    leaveDays
  };
};

export const getAttendanceSummary = (
  employeeId: string,
  month: number,
  year: number,
  records: AttendanceRecord[]
) => {
  const summary = buildMonthlyAttendanceSummary(employeeId, month, records.filter((record) => record.date.startsWith(`${year}-`)));
  return {
    totalAbsentDays: summary.totalAbsentDays,
    totalLateMinutes: summary.totalLateMinutes,
    totalEarlyLeaveMinutes: summary.totalEarlyLeaveMinutes,
    presentDays: summary.presentDays,
    leaveDays: summary.leaveDays
  };
};
