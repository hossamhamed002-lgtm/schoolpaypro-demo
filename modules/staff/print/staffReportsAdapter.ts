import { StaffAttendanceRow, StaffDataRow, formatAttendanceTotals } from '../services/staffReports.service';

export type StaffReportType = 'staffData' | 'staffAttendance';

type StaffReportPayload =
  | { type: 'staffData'; rows: StaffDataRow[]; yearLabel: string }
  | { type: 'staffAttendance'; rows: StaffAttendanceRow[]; from: string; to: string };

export const buildStaffReportPrintConfig = (payload: StaffReportPayload) => {
  if (payload.type === 'staffData') {
    const columns = [
      'اسم الموظف',
      'الرقم القومي',
      'تاريخ الميلاد',
      'تاريخ التعيين',
      'رقم الموبايل',
      'الوظيفة',
      'النوع',
      'العنوان',
      'رقم التأمينات'
    ];
    const rows = payload.rows.map((r) => [
      r.name || '',
      r.nationalId || '',
      r.birthDate || '',
      r.hireDate || '',
      r.mobile || '',
      r.jobTitle || '',
      r.gender || '',
      r.address || '',
      r.insuranceNumber || ''
    ]);
    return {
      title: 'تقرير بيانات العاملين',
      subtitle: payload.yearLabel || '',
      table: { columns, rows }
    };
  }

  const columns = ['اسم الموظف', 'عدد أيام الحضور', 'إجمالي التأخير', 'إجمالي الانصراف المبكر', 'له استثناء؟'];
  const rows = payload.rows.map((r) => {
    const formatted = formatAttendanceTotals(r);
    return [
      r.name || '',
      String(r.presentDays || 0),
      formatted.totalLate || '00:00',
      formatted.totalEarlyLeave || '00:00',
      r.hasOverride ? 'نعم' : 'لا'
    ];
  });
  return {
    title: 'تقرير الحضور والانصراف للعاملين',
    subtitle: `من ${payload.from} إلى ${payload.to}`,
    table: { columns, rows }
  };
};

export default { buildStaffReportPrintConfig };
