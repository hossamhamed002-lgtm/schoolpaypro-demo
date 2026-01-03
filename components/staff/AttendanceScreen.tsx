import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { buildDailyAttendanceRecord } from '../../src/hr/attendance/attendanceEngine';
import { AttendanceRecord, AttendanceStatus } from '../../src/hr/attendance/attendance.types';
import { LeaveRecord } from '../../src/hr/leave/leaveRecord.types';
import * as XLSX from 'xlsx';
import { ATTENDANCE_POLICY } from '../../src/hr/attendance/attendancePolicy';
import { AttendancePolicy } from '../../src/hr/attendance/attendance.types';

interface AttendanceScreenProps {
  store: any;
  onBack: () => void;
}

const buildKey = (employeeId: string, date: string) => `${employeeId}::${date}`;
const ATTENDANCE_STORAGE_KEY = 'hr_attendance_records_v1';
const POLICY_STORAGE_KEY = 'hr_attendance_policy_v1';
const OVERRIDES_STORAGE_KEY = 'hr_attendance_overrides_v1';

const loadAttendanceRecords = () => {
  try {
    const stored = window.localStorage.getItem(ATTENDANCE_STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Record<string, AttendanceRecord>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const saveAttendanceRecords = (records: Record<string, AttendanceRecord>) => {
  try {
    window.localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore storage errors
  }
};

const loadPolicy = (): AttendancePolicy => {
  try {
    const stored = window.localStorage.getItem(POLICY_STORAGE_KEY);
    if (!stored) return ATTENDANCE_POLICY;
    const parsed = JSON.parse(stored) as AttendancePolicy;
    return {
      WORK_START: parsed.WORK_START || ATTENDANCE_POLICY.WORK_START,
      WORK_END: parsed.WORK_END || ATTENDANCE_POLICY.WORK_END,
      LATE_GRACE_MINUTES: parsed.LATE_GRACE_MINUTES ?? ATTENDANCE_POLICY.LATE_GRACE_MINUTES
    };
  } catch {
    return ATTENDANCE_POLICY;
  }
};

const savePolicy = (policy: AttendancePolicy) => {
  try {
    window.localStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify(policy));
  } catch {
    // ignore
  }
};

const loadOverrides = (): Record<string, AttendancePolicy> => {
  try {
    const stored = window.localStorage.getItem(OVERRIDES_STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Record<string, AttendancePolicy>;
    return parsed || {};
  } catch {
    return {};
  }
};

const saveOverrides = (overrides: Record<string, AttendancePolicy>) => {
  try {
    window.localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore
  }
};

const getDatesBetween = (start: string, end: string) => {
  if (!start || !end) return [] as string[];
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return [];
  if (endDate < startDate) return [];
  const dates: string[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

const statusStyles: Record<AttendanceStatus, string> = {
  Present: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  Late: 'text-amber-600 bg-amber-50 border-amber-100',
  Absent: 'text-rose-600 bg-rose-50 border-rose-100',
  OnLeave: 'text-blue-600 bg-blue-50 border-blue-100',
  Holiday: 'text-slate-500 bg-slate-100 border-slate-200'
};

const AttendanceScreen: React.FC<AttendanceScreenProps> = ({ store, onBack }) => {
  const { lang, employees = [] } = store;
  const isRtl = lang === 'ar';
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>(() => loadAttendanceRecords());
  const [importing, setImporting] = useState(false);
  const [policy, setPolicy] = useState<AttendancePolicy>(() => loadPolicy());
  const [overrides, setOverrides] = useState<Record<string, AttendancePolicy>>(() => loadOverrides());
  const [overrideForm, setOverrideForm] = useState<{ empId: string; workStart: string; workEnd: string; grace: number }>({
    empId: '',
    workStart: ATTENDANCE_POLICY.WORK_START,
    workEnd: ATTENDANCE_POLICY.WORK_END,
    grace: ATTENDANCE_POLICY.LATE_GRACE_MINUTES
  });

  useEffect(() => {
    saveAttendanceRecords(records);
  }, [records]);

  useEffect(() => {
    savePolicy(policy);
  }, [policy]);

  useEffect(() => {
    saveOverrides(overrides);
  }, [overrides]);

  const leaveRecords = useMemo<LeaveRecord[]>(() => {
    return (store.leaveRecords || store.leaveRequests || []) as LeaveRecord[];
  }, [store.leaveRecords, store.leaveRequests]);

  const dates = useMemo(() => getDatesBetween(startDate, endDate), [startDate, endDate]);

  const resolvePolicyForEmployee = useCallback((employeeId: string): AttendancePolicy => {
    return overrides[employeeId] || policy;
  }, [overrides, policy]);

  const getRecord = useCallback((employeeId: string, date: string) => {
    const key = buildKey(employeeId, date);
    const existing = records[key];
    if (existing) return existing;
    const empPolicy = resolvePolicyForEmployee(employeeId);
    return buildDailyAttendanceRecord({
      employeeId,
      date,
      checkInTime: null,
      checkOutTime: null,
      notes: '',
      leaveRecords,
      policy: empPolicy
    });
  }, [leaveRecords, records, resolvePolicyForEmployee]);

  const updateRecord = useCallback((employeeId: string, date: string, patch: Partial<AttendanceRecord>) => {
    const key = buildKey(employeeId, date);
    const empPolicy = resolvePolicyForEmployee(employeeId);
    const current = records[key] || buildDailyAttendanceRecord({
      employeeId,
      date,
      checkInTime: null,
      checkOutTime: null,
      notes: '',
      leaveRecords,
      policy: empPolicy
    });

    const next = buildDailyAttendanceRecord({
      employeeId,
      date,
      checkInTime: patch.checkInTime ?? current.checkInTime,
      checkOutTime: patch.checkOutTime ?? current.checkOutTime,
      notes: patch.notes ?? current.notes,
      leaveRecords,
      policy: empPolicy
    });

    setRecords((prev) => ({ ...prev, [key]: next }));
  }, [leaveRecords, records, resolvePolicyForEmployee]);

  const buildExportRows = () => {
    const rows: any[] = [];
    employees.forEach((employee: any) => {
      dates.forEach((date) => {
        const record = getRecord(employee.Emp_ID, date);
        rows.push({
          Emp_ID: employee.Emp_ID,
          Employee_Name: employee.Name_Ar,
          Date: date,
          Check_In: record.checkInTime || '00:00',
          Check_Out: record.checkOutTime || '00:00',
          Status: record.status,
          Late_Minutes: record.lateMinutes || 0,
          Early_Leave_Minutes: record.earlyLeaveMinutes || 0,
          Notes: record.notes || ''
        });
      });
    });
    return rows;
  };

  const parseExcelTime = (val: any): string | null => {
    if (typeof val === 'number') {
      // Excel time as fraction of day
      const totalMinutes = Math.round(val * 24 * 60);
      const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
      const mm = String(totalMinutes % 60).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed;
      if (/^\d{4}$/.test(trimmed)) return `${trimmed.slice(0, 2)}:${trimmed.slice(2)}`;
    }
    return null;
  };

  const exportToExcel = () => {
    const rows = buildExportRows();
    const sheet = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Attendance');
    XLSX.writeFile(wb, `attendance_${startDate}_to_${endDate}.xlsx`);
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any>(sheet);
      rows.forEach((row) => {
        const empId = row.Emp_ID || row.employeeId || row.Employee_ID;
        const date = row.Date || row.date;
        if (!empId || !date) return;
        const checkInRaw = row.Check_In || row.checkIn || row.check_in || '';
        const checkOutRaw = row.Check_Out || row.checkOut || row.check_out || '';
        const checkIn = parseExcelTime(checkInRaw);
        const checkOut = parseExcelTime(checkOutRaw);
        const status = row.Status as AttendanceStatus | undefined;
        const notes = row.Notes || row.notes || '';
        updateRecord(String(empId), String(date).slice(0, 10), {
          checkInTime: checkIn || null,
          checkOutTime: checkOut || null,
          status: status && statusStyles[status] ? status : undefined,
          notes
        });
      });
    } catch (e) {
      console.error('Import failed', e);
      alert(isRtl ? 'تعذر استيراد الملف. تحقق من الصيغة.' : 'Import failed. Please check file format.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-start">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all">
            <ChevronLeft size={20} className={isRtl ? 'rotate-180' : ''} />
          </button>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{isRtl ? 'الحضور والانصراف' : 'Attendance & Departure'}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{isRtl ? 'تسجيل يومي للموظفين' : 'Daily employee attendance'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold text-slate-500">
            {isRtl ? 'من تاريخ' : 'From'}
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.currentTarget.value)}
              className="block bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1"
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            {isRtl ? 'ساعة الحضور' : 'Work start'}
            <input
              type="time"
              value={policy.WORK_START}
              onChange={(e) => setPolicy((p) => ({ ...p, WORK_START: e.target.value || ATTENDANCE_POLICY.WORK_START }))}
              className="block bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1"
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            {isRtl ? 'ساعة الانصراف' : 'Work end'}
            <input
              type="time"
              value={policy.WORK_END}
              onChange={(e) => setPolicy((p) => ({ ...p, WORK_END: e.target.value || ATTENDANCE_POLICY.WORK_END }))}
              className="block bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1"
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            {isRtl ? 'دقائق السماح' : 'Grace (min)'}
            <input
              type="number"
              min={0}
              value={policy.LATE_GRACE_MINUTES}
              onChange={(e) => setPolicy((p) => ({ ...p, LATE_GRACE_MINUTES: Number(e.target.value) || 0 }))}
              className="block bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1 w-24"
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            {isRtl ? 'إلى تاريخ' : 'To'}
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.currentTarget.value)}
              className="block bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1"
            />
          </label>
          <button
            onClick={exportToExcel}
            className="px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-black hover:bg-emerald-100"
          >
            {isRtl ? 'تحميل نموذج اكسيل' : 'Export Excel'}
          </button>
          <label className="px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-black hover:bg-indigo-100 cursor-pointer">
            {importing ? (isRtl ? 'جاري الاستيراد...' : 'Importing...') : (isRtl ? 'استيراد ملف حضور' : 'Import Attendance')}
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = '';
              }}
              disabled={importing}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold text-slate-500">
            {isRtl ? 'استثناء موظف' : 'Employee override'}
            <select
              value={overrideForm.empId}
              onChange={(e) => setOverrideForm((f) => ({ ...f, empId: e.target.value }))}
              className="block bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1 min-w-[200px]"
            >
              <option value="">{isRtl ? 'اختر الموظف' : 'Select employee'}</option>
              {employees.map((emp: any) => (
                <option key={emp.Emp_ID} value={emp.Emp_ID}>{emp.Name_Ar}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500">
            {isRtl ? 'حضور خاص' : 'Start override'}
            <input
              type="time"
              value={overrideForm.workStart}
              onChange={(e) => setOverrideForm((f) => ({ ...f, workStart: e.target.value }))}
              className="block bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1"
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            {isRtl ? 'انصراف خاص' : 'End override'}
            <input
              type="time"
              value={overrideForm.workEnd}
              onChange={(e) => setOverrideForm((f) => ({ ...f, workEnd: e.target.value }))}
              className="block bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1"
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            {isRtl ? 'سماح خاص (دقائق)' : 'Grace override'}
            <input
              type="number"
              min={0}
              value={overrideForm.grace}
              onChange={(e) => setOverrideForm((f) => ({ ...f, grace: Number(e.target.value) || 0 }))}
              className="block bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1 w-24"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              if (!overrideForm.empId) return;
              setOverrides((prev) => ({
                ...prev,
                [overrideForm.empId]: {
                  WORK_START: overrideForm.workStart || policy.WORK_START,
                  WORK_END: overrideForm.workEnd || policy.WORK_END,
                  LATE_GRACE_MINUTES: overrideForm.grace
                }
              }));
            }}
            className="px-4 py-2 mt-5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-black hover:bg-amber-100"
          >
            {isRtl ? 'حفظ استثناء' : 'Save override'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!overrideForm.empId) return;
              setOverrides((prev) => {
                const next = { ...prev };
                delete next[overrideForm.empId];
                return next;
              });
            }}
            className="px-4 py-2 mt-5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-black hover:bg-rose-100"
          >
            {isRtl ? 'إزالة الاستثناء' : 'Remove override'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الموظف' : 'Employee'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'التاريخ' : 'Date'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'دخول' : 'Check-In'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'خروج' : 'Check-Out'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الحالة' : 'Status'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'تأخير (دقيقة)' : 'Late (min)'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'انصراف مبكر' : 'Early Leave'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'ملاحظات' : 'Notes'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.flatMap((employee: any) => (
                dates.map((date) => {
                  const record = getRecord(employee.Emp_ID, date);
                  const isOnLeave = record.status === 'OnLeave';

                  return (
                    <tr key={buildKey(employee.Emp_ID, date)} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-700">{employee.Name_Ar}</td>
                      <td className="px-4 py-3 text-slate-600">{date}</td>
                      <td className="px-4 py-3">
                        <input
                          type="time"
                          value={record.checkInTime || ''}
                          onChange={(event) => updateRecord(employee.Emp_ID, date, { checkInTime: event.currentTarget.value })}
                          disabled={isOnLeave}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="time"
                          value={record.checkOutTime || ''}
                          onChange={(event) => updateRecord(employee.Emp_ID, date, { checkOutTime: event.currentTarget.value })}
                          disabled={isOnLeave}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 text-[10px] font-black rounded-lg border ${statusStyles[record.status]}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{record.lateMinutes}</td>
                      <td className="px-4 py-3 text-slate-600">{record.earlyLeaveMinutes}</td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={record.notes || ''}
                          onChange={(event) => updateRecord(employee.Emp_ID, date, { notes: event.currentTarget.value })}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold w-full"
                        />
                      </td>
                    </tr>
                  );
                })
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceScreen;
