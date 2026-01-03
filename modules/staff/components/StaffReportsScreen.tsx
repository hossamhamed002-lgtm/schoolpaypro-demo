import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Printer, Settings as SettingsIcon } from 'lucide-react';
import { buildStaffAttendanceReport, buildStaffDataReport, formatAttendanceTotals } from '../services/staffReports.service';
import { buildStaffReportPrintConfig } from '../print/staffReportsAdapter';

type Props = {
  store: any;
  onBack?: () => void;
  openPrintPreview: (config: any) => void;
};

type ReportType = 'staffData' | 'staffAttendance';

const StaffReportsScreen: React.FC<Props> = ({ store, onBack, openPrintPreview }) => {
  const { employees = [], academicYears = [], currentYearId } = store || {};
  const [activeReport, setActiveReport] = useState<ReportType>('staffData');
  const [yearId, setYearId] = useState(currentYearId || (academicYears[0]?.id ?? ''));
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [settingsModal, setSettingsModal] = useState<{ open: boolean; reportId: ReportType }>({ open: false, reportId: 'staffData' });
  const SETTINGS_KEY = 'STAFF_REPORT_SETTINGS';

  const defaultSettings = {
    paperSize: 'A4',
    orientation: 'portrait',
    font: 'Cairo',
    fontSize: 12,
    lineHeight: 1.4
  };

  const loadSettings = (): Record<string, any> => {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const [reportSettings, setReportSettings] = useState<Record<string, any>>(() => loadSettings());

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(reportSettings));
    } catch {
      // ignore
    }
  }, [reportSettings]);

  const yearOptions = useMemo(() => academicYears || [], [academicYears]);

  const ensureSettings = (id: ReportType) => {
    if (!reportSettings[id]) {
      setReportSettings((prev) => ({ ...prev, [id]: defaultSettings }));
    }
    return reportSettings[id] || defaultSettings;
  };

  const reports = useMemo(() => ([
    {
      id: 'staffData' as ReportType,
      title: 'بيانات العاملين (العام الحالي)',
      mode: 'عمودي',
      description: 'جدول بيانات العاملين للعام الحالي',
      requires: 'year',
      settings: ensureSettings('staffData')
    },
    {
      id: 'staffAttendance' as ReportType,
      title: 'الحضور والانصراف (فترة)',
      mode: 'عمودي',
      description: 'تجميع حضور العاملين لفترة زمنية',
      requires: 'range',
      settings: ensureSettings('staffAttendance')
    }
  ]), [reportSettings]);

  const handlePreview = (reportId: ReportType) => {
    setActiveReport(reportId);
    if (reportId === 'staffData') {
      const rows = buildStaffDataReport(employees, yearId);
      setPreviewRows(rows);
      return;
    }
    if (!fromDate || !toDate) {
      alert('يرجى تحديد فترة صحيحة');
      return;
    }
    const rows = buildStaffAttendanceReport(employees, fromDate, toDate);
    setPreviewRows(rows);
  };

  const handlePrint = (reportId: ReportType) => {
    const settings = ensureSettings(reportId);
    if (reportId === 'staffData') {
      const rows = buildStaffDataReport(employees, yearId);
      const config = buildStaffReportPrintConfig({
        type: 'staffData',
        rows,
        yearLabel: yearOptions.find((y: any) => y.id === yearId)?.name || ''
      });
      openPrintPreview({ ...config, printOverrides: settings });
      return;
    }
    if (!fromDate || !toDate) {
      alert('يرجى تحديد فترة صحيحة');
      return;
    }
    const rows = buildStaffAttendanceReport(employees, fromDate, toDate);
    const config = buildStaffReportPrintConfig({
      type: 'staffAttendance',
      rows,
      from: fromDate,
      to: toDate
    });
    openPrintPreview({ ...config, printOverrides: settings });
  };

  useEffect(() => {
    // Auto-preview staffData on mount
    handlePreview('staffData');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderPreviewTable = () => {
    if (!previewRows.length) {
      return <div className="text-center text-slate-400 font-bold py-6">لا توجد بيانات للعرض</div>;
    }
    if (activeReport === 'staffData') {
      return (
        <div className="overflow-auto border rounded-2xl">
          <table className="min-w-[900px] w-full text-sm text-right">
            <thead className="bg-slate-50">
              <tr>
                {['اسم الموظف', 'الرقم القومي', 'تاريخ الميلاد', 'تاريخ التعيين', 'رقم الموبايل', 'الوظيفة', 'النوع', 'العنوان', 'رقم التأمينات'].map((c) => (
                  <th key={c} className="px-3 py-2 border-b text-slate-600 font-bold">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((r: any, idx: number) => (
                <tr key={idx} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.nationalId || '—'}</td>
                  <td className="px-3 py-2">{r.birthDate || '—'}</td>
                  <td className="px-3 py-2">{r.hireDate || '—'}</td>
                  <td className="px-3 py-2">{r.mobile || '—'}</td>
                  <td className="px-3 py-2">{r.jobTitle || '—'}</td>
                  <td className="px-3 py-2">{r.gender || '—'}</td>
                  <td className="px-3 py-2">{r.address || '—'}</td>
                  <td className="px-3 py-2">{r.insuranceNumber || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="overflow-auto border rounded-2xl">
        <table className="min-w-[700px] w-full text-sm text-right">
          <thead className="bg-slate-50">
            <tr>
              {['اسم الموظف', 'عدد أيام الحضور', 'إجمالي التأخير', 'إجمالي الانصراف المبكر', 'له استثناء؟'].map((c) => (
                <th key={c} className="px-3 py-2 border-b text-slate-600 font-bold">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((r: any, idx: number) => {
              const formatted = formatAttendanceTotals(r);
              return (
                <tr key={idx} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.presentDays}</td>
                  <td className="px-3 py-2">{formatted.totalLate}</td>
                  <td className="px-3 py-2">{formatted.totalEarlyLeave}</td>
                  <td className="px-3 py-2">{r.hasOverride ? 'نعم' : 'لا'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">تقارير شؤون العاملين</h2>
          <p className="text-xs text-slate-500">اختيار التقرير ثم المعاينة/الطباعة عبر المحرك الموحد.</p>
        </div>
        {onBack && (
          <button onClick={onBack} className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">رجوع</button>
        )}
      </div>

      <div className="bg-white border rounded-[2rem] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50">
          <h4 className="text-sm font-black text-slate-700">إعدادات وطباعة التقارير</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">التصميم</th>
                <th className="px-4 py-3">نوع الخط</th>
                <th className="px-4 py-3">حجم الخط</th>
                <th className="px-4 py-3">ارتفاع السطر</th>
                <th className="px-4 py-3">مقاس الورق</th>
                <th className="px-4 py-3">الوضع</th>
                <th className="px-4 py-3">اسم التقرير</th>
                <th className="px-4 py-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-[11px] font-black bg-slate-100 rounded-lg border border-slate-200">موحد</span>
                  </td>
                  <td className="px-4 py-3 font-mono">{r.settings.font || defaultSettings.font}</td>
                  <td className="px-4 py-3">{r.settings.fontSize || defaultSettings.fontSize}</td>
                  <td className="px-4 py-3">{r.settings.lineHeight || defaultSettings.lineHeight}</td>
                  <td className="px-4 py-3 uppercase">{(r.settings.paperSize || defaultSettings.paperSize)}</td>
                  <td className="px-4 py-3">{(r.settings.orientation || defaultSettings.orientation) === 'portrait' ? 'عمودي' : 'أفقي'}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{r.title}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        className="flex items-center gap-1 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-black hover:bg-emerald-100"
                        onClick={() => setSettingsModal({ open: true, reportId: r.id })}
                      >
                        <SettingsIcon size={14} /> إعدادات
                      </button>
                      <button
                        className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-black hover:bg-slate-100"
                        onClick={() => handlePreview(r.id)}
                      >
                        <Eye size={14} /> معاينة
                      </button>
                      <button
                        className="flex items-center gap-1 px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-black hover:bg-indigo-100"
                        onClick={() => handlePrint(r.id)}
                      >
                        <Printer size={14} /> طباعة
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-slate-700 mb-3">المعاينة</h4>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            {activeReport === 'staffData' ? (
              <label className="flex items-center gap-2">
                العام الدراسي:
                <select
                  value={yearId}
                  onChange={(e) => setYearId(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-1 text-sm"
                >
                  {yearOptions.map((y: any) => (
                    <option key={y.id} value={y.id}>{y.name || y.label || y.id}</option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label className="flex items-center gap-2">
                  من:
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-1 text-sm"
                  />
                </label>
                <label className="flex items-center gap-2">
                  إلى:
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-1 text-sm"
                  />
                </label>
              </>
            )}
            <button
              onClick={() => handlePreview(activeReport)}
              className="px-3 py-1 rounded-lg bg-slate-800 text-white text-xs font-black hover:bg-slate-900"
            >
              تحديث المعاينة
            </button>
          </div>
        </div>
        {renderPreviewTable()}
      </div>

      {settingsModal.open && (
        <div className="fixed inset-0 z-[300] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-4" dir="rtl">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-black text-slate-900">إعدادات الطباعة</h4>
                <p className="text-xs text-slate-500">تنطبق على هذا التقرير فقط.</p>
              </div>
              <button
                onClick={() => setSettingsModal({ open: false, reportId: settingsModal.reportId })}
                className="px-3 py-1 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800"
              >
                إغلاق
              </button>
            </div>
            {(() => {
              const current = ensureSettings(settingsModal.reportId);
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-sm font-bold text-slate-700 flex flex-col gap-1">
                    مقاس الورق
                    <select
                      value={current.paperSize}
                      onChange={(e) =>
                        setReportSettings((prev) => ({
                          ...prev,
                          [settingsModal.reportId]: { ...current, paperSize: e.target.value }
                        }))
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2"
                    >
                      <option value="A4">A4</option>
                      <option value="A3">A3</option>
                    </select>
                  </label>
                  <label className="text-sm font-bold text-slate-700 flex flex-col gap-1">
                    الوضع
                    <select
                      value={current.orientation}
                      onChange={(e) =>
                        setReportSettings((prev) => ({
                          ...prev,
                          [settingsModal.reportId]: { ...current, orientation: e.target.value }
                        }))
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2"
                    >
                      <option value="portrait">عمودي</option>
                      <option value="landscape">أفقي</option>
                    </select>
                  </label>
                  <label className="text-sm font-bold text-slate-700 flex flex-col gap-1">
                    نوع الخط
                    <select
                      value={current.font}
                      onChange={(e) =>
                        setReportSettings((prev) => ({
                          ...prev,
                          [settingsModal.reportId]: { ...current, font: e.target.value }
                        }))
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2"
                    >
                      <option value="Cairo">Cairo</option>
                      <option value="Roboto">Roboto</option>
                      <option value="Arial">Arial</option>
                    </select>
                  </label>
                  <label className="text-sm font-bold text-slate-700 flex flex-col gap-1">
                    حجم الخط
                    <input
                      type="number"
                      min={8}
                      value={current.fontSize}
                      onChange={(e) =>
                        setReportSettings((prev) => ({
                          ...prev,
                          [settingsModal.reportId]: { ...current, fontSize: Number(e.target.value) || current.fontSize }
                        }))
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2"
                    />
                  </label>
                  <label className="text-sm font-bold text-slate-700 flex flex-col gap-1">
                    ارتفاع السطر
                    <input
                      type="number"
                      step="0.1"
                      min={1}
                      value={current.lineHeight}
                      onChange={(e) =>
                        setReportSettings((prev) => ({
                          ...prev,
                          [settingsModal.reportId]: { ...current, lineHeight: Number(e.target.value) || current.lineHeight }
                        }))
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2"
                    />
                  </label>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffReportsScreen;
