import React, { useMemo, useState } from 'react';
import { CalendarRange, Filter, Printer, Search } from 'lucide-react';
import ReportPrintWrapper from '../../ReportPrintWrapper';

type PrintSettings = {
  paperSize: string;
  orientation: string;
  font: string;
  fontSize: string;
  lineHeight: string;
  margin?: string;
};

interface ParentsOverdueReportProps {
  title: string;
  students: any[];
  invoices: any[];
  stages?: any[];
  grades?: any[];
  activeSchool?: any;
  activeYear?: any;
  workingYearId?: string;
  reportSettings: PrintSettings;
}

const ParentsOverdueReport: React.FC<ParentsOverdueReportProps> = ({
  title,
  students = [],
  invoices = [],
  stages = [],
  grades = [],
  activeSchool,
  activeYear,
  workingYearId,
  reportSettings
}) => {
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    stageId: '',
    gradeId: '',
    status: 'all',
    minDue: ''
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(reportSettings);

  const gradesById = useMemo(() => new Map((grades || []).map((g: any) => [String(g.Grade_ID || g.id), g])), [grades]);
  const stagesById = useMemo(() => new Map((stages || []).map((s: any) => [String(s.Stage_ID || s.id), s])), [stages]);

  const rows = useMemo(() => {
    const norm = (v: any) => (v === undefined || v === null ? '' : String(v).trim());
    const normLower = (v: any) => norm(v).toLowerCase();
    const { from, to, stageId, gradeId, status, minDue } = appliedFilters;
    const fromTime = from ? new Date(from).getTime() : null;
    const toTime = to ? new Date(to).getTime() : null;
    const minDueNum = Number(minDue || 0);
    const yearFilter = workingYearId || activeYear?.Year_ID || activeYear?.AcademicYear_ID || '';

    type Row = {
      parentId: string;
      parentName: string;
      mobile: string;
      childrenIds: string[];
      childrenCount: number;
      totalDue: number;
      totalPaid: number;
      balance: number;
      oldest: string;
      paymentStatus: 'متأخر' | 'منتظم';
    };
    const map = new Map<string, Row>();

    invoices.forEach((inv: any) => {
      const invDate = inv.Date || inv.date || inv.Invoice_Date || inv.createdAt;
      const invTime = invDate ? new Date(invDate).getTime() : null;
      if (fromTime && invTime && invTime < fromTime) return;
      if (toTime && invTime && invTime > toTime) return;
      const invYear = inv.Academic_Year_ID || inv.academicYearId || '';
      if (yearFilter && invYear && invYear !== yearFilter) return;
      const studentId = inv.Student_ID || inv.studentId || inv.StudentId || '';
      if (!studentId) return;

      const student = students.find(
        (s: any) =>
          String(s.Student_ID || s.Student_Global_ID || s.id) === String(studentId)
      );
      if (stageId && String(student?.Stage_ID || '') !== String(stageId)) return;
      if (gradeId && String(student?.Grade_ID || '') !== String(gradeId)) return;

      const parentObj =
        student?.Father ||
        student?.Guardian ||
        student?.Parent ||
        null;
      const parentId =
        parentObj?.Parent_ID ||
        student?.Parent_ID ||
        student?.Guardian_ID ||
        student?.GuardianId ||
        student?.Father_ID ||
        `P-${studentId}`;
      const parentName =
        parentObj?.Name ||
        student?.Guardian_Name ||
        student?.Father_Name ||
        'ولي أمر';
      const mobile =
        parentObj?.Mobile ||
        parentObj?.Phone ||
        student?.Guardian_Phone ||
        student?.Guardian_Mobile ||
        student?.Father_Mobile ||
        '';

      const due = Number(inv.Total || inv.total || inv.amount || 0);
      const paid = Number(inv.Paid || inv.paid || inv.collected || 0);
      const oldest = invDate ? new Date(invDate).toLocaleDateString() : '';

      const current = map.get(String(parentId)) || {
        parentId: String(parentId),
        parentName,
        mobile,
        childrenIds: [],
        childrenCount: 0,
        totalDue: 0,
        totalPaid: 0,
        balance: 0,
        oldest: '',
        paymentStatus: 'منتظم' as const
      };

      const childCode = student?.Student_Global_ID || student?.Student_ID || studentId;
      if (childCode && !current.childrenIds.includes(childCode)) current.childrenIds.push(childCode);
      current.childrenCount = current.childrenIds.length;
      current.totalDue += due;
      current.totalPaid += paid;
      current.balance = Number((current.totalDue - current.totalPaid).toFixed(2));
      if (!current.oldest && oldest) current.oldest = oldest;
      if (oldest) {
        const currTime = current.oldest ? new Date(current.oldest).getTime() : Infinity;
        const candTime = new Date(oldest).getTime();
        if (candTime < currTime) current.oldest = oldest;
      }
      current.paymentStatus = current.balance > 0 ? 'متأخر' : 'منتظم';
      map.set(String(parentId), current);
    });

    let list = Array.from(map.values());
    if (status === 'late') list = list.filter((r) => r.balance > 0);
    if (status === 'regular') list = list.filter((r) => r.balance <= 0);
    if (minDueNum > 0) list = list.filter((r) => r.balance >= minDueNum);
    list.sort((a, b) => b.balance - a.balance);
    return list;
  }, [appliedFilters, invoices, students, workingYearId, activeYear, gradesById, stagesById]);

  const totals = useMemo(() => {
    return rows.reduce(
      (agg, r) => {
        agg.due += r.totalDue;
        agg.paid += r.totalPaid;
        agg.balance += r.balance;
        return agg;
      },
      { due: 0, paid: 0, balance: 0 }
    );
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 no-print">
        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
          <Filter size={16} />
          <span>مرشحات تقرير أولياء الأمور المتأخرين في السداد</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAppliedFilters(filters)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-xs font-black"
          >
            <Search size={14} />
            تحديث التقرير
          </button>
          <button
            onClick={() => setShowPrintSettings(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={rows.length === 0}
            title={rows.length === 0 ? 'لا توجد بيانات للطباعة' : ''}
          >
            <Printer size={14} />
            طباعة
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 no-print">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <CalendarRange size={14} /> من تاريخ
          </label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <CalendarRange size={14} /> إلى تاريخ
          </label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">المرحلة</label>
          <select
            value={filters.stageId}
            onChange={(e) => setFilters((p) => ({ ...p, stageId: e.target.value, gradeId: '' }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
          >
            <option value="">الكل</option>
            {stages.map((s: any) => (
              <option key={s.Stage_ID || s.id} value={s.Stage_ID || s.id}>
                {s.Stage_Name || s.Name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">الصف</label>
          <select
            value={filters.gradeId}
            onChange={(e) => setFilters((p) => ({ ...p, gradeId: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
          >
            <option value="">الكل</option>
            {grades
              .filter((g: any) => !filters.stageId || String(g.Stage_ID) === String(filters.stageId))
              .map((g: any) => (
                <option key={g.Grade_ID || g.id} value={g.Grade_ID || g.id}>
                  {g.Grade_Name || g.Name}
                </option>
              ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">حالة السداد</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
          >
            <option value="all">الكل</option>
            <option value="late">متأخر</option>
            <option value="regular">منتظم</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">حد أدنى للمتأخر</label>
          <input
            type="number"
            value={filters.minDue}
            onChange={(e) => setFilters((p) => ({ ...p, minDue: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
            placeholder="مثال: 500"
          />
        </div>
      </div>

      <ReportPrintWrapper
        title={title}
        subtitle={activeYear?.AcademicYear_Name || activeYear?.Year_Name || ''}
        schoolName={activeSchool?.School_Name || activeSchool?.name}
        settings={{
          paperSize: reportSettings.paperSize,
          orientation: reportSettings.orientation,
          font: reportSettings.font,
          fontSize: reportSettings.fontSize,
          lineHeight: reportSettings.lineHeight
        }}
      >
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-black text-slate-900">تقرير أولياء الأمور المتأخرين في السداد</h3>
            <p className="text-sm text-slate-500 font-bold">
              {activeSchool?.School_Name || activeSchool?.name || 'المدرسة'} — {activeYear?.AcademicYear_Name || activeYear?.Year_Name || ''}
            </p>
          </div>
          <table className="w-full border-collapse border border-slate-300 text-sm" dir="rtl">
            <thead className="bg-slate-100">
              <tr>
                <th className="py-2 px-3 border border-slate-300 text-center">كود ولي الأمر</th>
                <th className="py-2 px-3 border border-slate-300 text-center">اسم ولي الأمر</th>
                <th className="py-2 px-3 border border-slate-300 text-center">رقم الموبايل</th>
                <th className="py-2 px-3 border border-slate-300 text-center">عدد الأبناء</th>
                <th className="py-2 px-3 border border-slate-300 text-center">إجمالي المستحقات</th>
                <th className="py-2 px-3 border border-slate-300 text-center">إجمالي المدفوع</th>
                <th className="py-2 px-3 border border-slate-300 text-center">إجمالي المتبقي</th>
                <th className="py-2 px-3 border border-slate-300 text-center">أقدم تاريخ مديونية</th>
                <th className="py-2 px-3 border border-slate-300 text-center">حالة السداد</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-4 px-3 text-center text-slate-500 font-bold">
                    لا توجد بيانات مديونية حسب الفلاتر الحالية
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.parentId} className="odd:bg-white even:bg-slate-50">
                    <td className="py-2 px-3 border border-slate-300 text-center font-black">{r.parentId}</td>
                    <td className="py-2 px-3 border border-slate-300 text-right font-black text-slate-800">{r.parentName}</td>
                    <td className="py-2 px-3 border border-slate-300 text-center">{r.mobile || '—'}</td>
                    <td className="py-2 px-3 border border-slate-300 text-center">{r.childrenCount}</td>
                    <td className="py-2 px-3 border border-slate-300 text-center text-amber-700 font-black">{r.totalDue.toFixed(2)}</td>
                    <td className="py-2 px-3 border border-slate-300 text-center text-emerald-700 font-black">{r.totalPaid.toFixed(2)}</td>
                    <td className="py-2 px-3 border border-slate-300 text-center text-rose-700 font-black">{r.balance.toFixed(2)}</td>
                    <td className="py-2 px-3 border border-slate-300 text-center">{r.oldest || '—'}</td>
                    <td className="py-2 px-3 border border-slate-300 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-[11px] font-black ${
                          r.paymentStatus === 'متأخر'
                            ? 'bg-rose-50 text-rose-600 border border-rose-100'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}
                      >
                        {r.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-black">
                  <td className="py-2 px-3 border border-slate-300 text-center" colSpan={4}>الإجمالي</td>
                  <td className="py-2 px-3 border border-slate-300 text-center text-amber-700">{totals.due.toFixed(2)}</td>
                  <td className="py-2 px-3 border border-slate-300 text-center text-emerald-700">{totals.paid.toFixed(2)}</td>
                  <td className="py-2 px-3 border border-slate-300 text-center text-rose-700">{totals.balance.toFixed(2)}</td>
                  <td className="py-2 px-3 border border-slate-300 text-center" colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>

          <div className="grid grid-cols-2 gap-6 pt-6 text-sm font-bold text-slate-700">
            <div className="text-right">مسؤول الحسابات</div>
            <div className="text-left">مدير المدرسة</div>
          </div>
        </div>
      </ReportPrintWrapper>

      {showPrintSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-4xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h4 className="text-lg font-black text-slate-800">إعدادات الطباعة</h4>
              <button
                onClick={() => setShowPrintSettings(false)}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-500 font-bold hover:bg-slate-200"
              >
                إغلاق
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">مقاس الورق</label>
                <select
                  value={tempSettings.paperSize}
                  onChange={(e) => setTempSettings((p) => ({ ...p, paperSize: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                >
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="Letter">Letter</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">الاتجاه</label>
                <select
                  value={tempSettings.orientation}
                  onChange={(e) => setTempSettings((p) => ({ ...p, orientation: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                >
                  <option value="Portrait">طولي</option>
                  <option value="Landscape">عرضي</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">الهوامش (مم)</label>
                <input
                  type="number"
                  min={5}
                  max={25}
                  value={tempSettings.margin || '12'}
                  onChange={(e) => setTempSettings((p) => ({ ...p, margin: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">حجم الخط</label>
                <input
                  type="number"
                  min={9}
                  max={16}
                  value={tempSettings.fontSize}
                  onChange={(e) => setTempSettings((p) => ({ ...p, fontSize: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">ارتفاع السطر</label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  max={2}
                  value={tempSettings.lineHeight}
                  onChange={(e) => setTempSettings((p) => ({ ...p, lineHeight: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">نوع الخط</label>
                <select
                  value={tempSettings.font}
                  onChange={(e) => setTempSettings((p) => ({ ...p, font: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                >
                  <option value="Cairo">Cairo</option>
                  <option value="Tajawal">Tajawal</option>
                  <option value="Noto Kufi Arabic">Noto Kufi Arabic</option>
                </select>
              </div>
            </div>
            <div className="px-6 pb-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                <p className="font-black mb-2">معاينة مباشرة</p>
                <div
                  className="bg-white border border-dashed border-slate-200 rounded-xl p-3 overflow-auto"
                  style={{
                    fontFamily: tempSettings.font,
                    fontSize: `${tempSettings.fontSize}px`,
                    lineHeight: tempSettings.lineHeight
                  }}
                >
                  <p className="text-center font-black text-slate-800 mb-3">تقرير أولياء الأمور المتأخرين في السداد</p>
                  <table className="w-full border-collapse border border-slate-300 text-[11px]" dir="rtl">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="border border-slate-300 px-2 py-1">الاسم</th>
                        <th className="border border-slate-300 px-2 py-1">المتبقي</th>
                        <th className="border border-slate-300 px-2 py-1">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 3).map((r) => (
                        <tr key={r.parentId} className="odd:bg-white even:bg-slate-50">
                          <td className="border border-slate-300 px-2 py-1">{r.parentName}</td>
                          <td className="border border-slate-300 px-2 py-1">{r.balance.toFixed(2)}</td>
                          <td className="border border-slate-300 px-2 py-1">{r.paymentStatus}</td>
                        </tr>
                      ))}
                      {rows.length === 0 && (
                        <tr>
                          <td className="border border-slate-300 px-2 py-2 text-center text-slate-400" colSpan={3}>
                            لا توجد بيانات
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowPrintSettings(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    setShowPrintSettings(false);
                    setTimeout(() => window.print(), 50);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold"
                >
                  طباعة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentsOverdueReport;
