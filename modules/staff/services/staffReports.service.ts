import { AttendanceRecord } from '../../../src/hr/attendance/attendance.types';

export type StaffDataRow = {
  name: string;
  nationalId?: string;
  birthDate?: string;
  hireDate?: string;
  mobile?: string;
  jobTitle?: string;
  gender?: string;
  address?: string;
  insuranceNumber?: string;
};

export type StaffAttendanceRow = {
  name: string;
  presentDays: number;
  totalLateMinutes: number;
  totalEarlyLeaveMinutes: number;
  hasOverride: boolean;
};

const ATTENDANCE_STORAGE_KEY = 'hr_attendance_records_v1';
const OVERRIDES_STORAGE_KEY = 'hr_attendance_overrides_v1';

const loadAttendanceRecords = (): Record<string, AttendanceRecord> => {
  try {
    const stored = window.localStorage.getItem(ATTENDANCE_STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as Record<string, AttendanceRecord>;
  } catch {
    return {};
  }
};

const loadOverrides = (): Record<string, any> => {
  try {
    const stored = window.localStorage.getItem(OVERRIDES_STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as Record<string, any>;
  } catch {
    return {};
  }
};

const parseDate = (value: string) => new Date(`${value}T00:00:00`);

const isWithinRange = (date: string, from: string, to: string) => {
  if (!from || !to) return false;
  const d = parseDate(date).getTime();
  const f = parseDate(from).getTime();
  const t = parseDate(to).getTime();
  return d >= f && d <= t;
};

const formatMinutesToHHMM = (mins: number) => {
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const buildStaffDataReport = (employees: any[], academicYearId?: string): StaffDataRow[] => {
  // academicYearId is accepted for API symmetry; current data set is flat.
  return (employees || []).map((emp) => ({
    name: emp.Name_Ar || emp.name || '',
    nationalId: emp.National_ID || emp.NationalId || emp.nationalId,
    birthDate: emp.Birth_Date || emp.birthDate,
    hireDate: emp.Hire_Date || emp.hireDate,
    mobile: emp.Mobile || emp.Phone || emp.mobile,
    jobTitle: emp.Job_Title || emp.jobTitle,
    gender: emp.Gender || emp.gender,
    address: emp.Address || emp.address,
    insuranceNumber: emp.Insurance_Number || emp.insuranceNumber
  }));
};

export const buildStaffAttendanceReport = (employees: any[], fromDate: string, toDate: string): StaffAttendanceRow[] => {
  const records = loadAttendanceRecords();
  const overrides = loadOverrides();
  const rows: StaffAttendanceRow[] = [];

  employees.forEach((emp) => {
    const empId = emp.Emp_ID || emp.id;
    const empName = emp.Name_Ar || emp.name || '';
    const relevant = Object.values(records).filter(
      (rec) => rec.employeeId === empId && isWithinRange(rec.date, fromDate, toDate)
    );
    const presentDays = relevant.filter((rec) => rec.status === 'Present' || rec.status === 'Late').length;
    const totalLateMinutes = relevant.reduce((sum, rec) => sum + (rec.lateMinutes || 0), 0);
    const totalEarlyLeaveMinutes = relevant.reduce((sum, rec) => sum + (rec.earlyLeaveMinutes || 0), 0);
    const hasOverride = Boolean(overrides[empId]);
    rows.push({
      name: empName,
      presentDays,
      totalLateMinutes,
      totalEarlyLeaveMinutes,
      hasOverride
    });
  });

  // Presentation wants HH:MM format for totals; keep minutes for processing, format in adapter/UI.
  return rows;
};

export const formatAttendanceTotals = (row: StaffAttendanceRow) => ({
  ...row,
  totalLate: formatMinutesToHHMM(row.totalLateMinutes),
  totalEarlyLeave: formatMinutesToHHMM(row.totalEarlyLeaveMinutes)
});
