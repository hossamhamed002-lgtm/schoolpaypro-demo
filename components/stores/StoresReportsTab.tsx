
import React, { useState } from 'react';
import { FileBarChart, Printer, Eye, ShieldCheck, ChevronLeft } from 'lucide-react';
import ReportPrintWrapper from '../ReportPrintWrapper';

const StoresReportsTab: React.FC<{ store: any }> = ({ store }) => {
  const { t, lang, reportConfigs, activeSchool } = store;
  const isRtl = lang === 'ar';
  
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [settingsReportId, setSettingsReportId] = useState<string | null>(null);
  const defaultReportSettings = {
    paperSize: 'A4',
    orientation: 'Portrait',
    font: 'Cairo',
    fontSize: '12',
    lineHeight: '1.4'
  };
  const [reportSettings, setReportSettings] = useState(defaultReportSettings);
  // سحب إعدادات موديول المخازن حصرياً
  const storesConfig = reportConfigs.find((c: any) => c.Category_ID === 'stores');

  const handlePrint = (reportId: string) => {
    setSelectedReport(reportId);
    setTimeout(() => {
       alert(isRtl ? 'جاري تجهيز تقرير المخزن للطباعة...' : 'Preparing store report for printing...');
    }, 100);
  };

  const handlePreview = (reportId: string) => {
    setSelectedReport(reportId);
  };

  const loadReportSettings = (reportId: string) => {
    if (typeof window === 'undefined') return defaultReportSettings;
    try {
      const raw = window.localStorage.getItem('REPORT_SETTINGS');
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed[reportId] || defaultReportSettings;
    } catch {
      return defaultReportSettings;
    }
  };

  const handleOpenSettings = (reportId: string) => {
    setReportSettings(loadReportSettings(reportId));
    setSettingsReportId(reportId);
  };

  const handleSaveSettings = () => {
    if (!settingsReportId || typeof window === 'undefined') {
      setSettingsReportId(null);
      return;
    }
    try {
      const raw = window.localStorage.getItem('REPORT_SETTINGS');
      const parsed = raw ? JSON.parse(raw) : {};
      parsed[settingsReportId] = reportSettings;
      window.localStorage.setItem('REPORT_SETTINGS', JSON.stringify(parsed));
    } catch {
      // ignore storage errors
    }
    setSettingsReportId(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-start">
      {!selectedReport ? (
        <>
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800">تقارير المخازن</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">إعدادات الطباعة والتنسيق لتقارير المخزون</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-600 text-[11px] font-black uppercase">
                  <tr>
                    <th className="px-4 py-3 text-center">تصميم</th>
                    <th className="px-4 py-3 text-center">نوع الخط</th>
                    <th className="px-4 py-3 text-center">حجم الخط</th>
                    <th className="px-4 py-3 text-center">ارتفاع السطر</th>
                    <th className="px-4 py-3 text-center">مقاس الورق</th>
                    <th className="px-4 py-3 text-center">الوضع</th>
                    <th className="px-4 py-3 text-start">اسم التقرير</th>
                    <th className="px-4 py-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {storesConfig?.Available_Reports?.length ? (
                    storesConfig.Available_Reports.map((report: any, index: number) => (
                      <tr key={report.Report_ID} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                            <FileBarChart size={18} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold">Cairo</td>
                        <td className="px-4 py-3 text-center font-mono">12</td>
                        <td className="px-4 py-3 text-center font-mono">1.4</td>
                        <td className="px-4 py-3 text-center font-semibold">A4</td>
                        <td className="px-4 py-3 text-center font-semibold">{isRtl ? 'عمودي' : 'Portrait'}</td>
                        <td className="px-4 py-3 text-start font-black text-slate-800">
                          {isRtl ? report.Title_Ar : report.Title_En}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handlePrint(report.Report_ID)}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-[10px] font-black uppercase text-white"
                            >
                              <Printer size={14} /> {t.printReport}
                            </button>
                            <button
                              onClick={() => handlePreview(report.Report_ID)}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-600"
                            >
                              <Eye size={14} />
                              {isRtl ? 'معاينة' : 'Preview'}
                            </button>
                            <button
                              onClick={() => handleOpenSettings(report.Report_ID)}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-purple-600"
                            >
                              <ShieldCheck size={14} />
                              {isRtl ? 'إعدادات' : 'Settings'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-slate-400 font-bold">
                        {isRtl ? 'لا توجد تقارير متاحة' : 'No reports available'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-8 bg-purple-50 rounded-[2.5rem] border border-purple-100 flex items-center gap-6">
             <div className="w-12 h-12 bg-white text-purple-600 rounded-2xl flex items-center justify-center shadow-sm">
                <ShieldCheck size={24} />
             </div>
             <div>
                <h4 className="font-black text-slate-800 tracking-tight">{isRtl ? 'تقارير معتمدة' : 'Authorized Reports'}</h4>
                <p className="text-[10px] text-purple-700 font-bold opacity-70 mt-1 uppercase tracking-widest">
                  {isRtl ? 'تخضع هذه التقارير لسلسلة توقيعات موديول المخازن (أمين المخزن - مدير المشتريات).' : 'These reports follow the Stores signature chain (Store Keeper - Purchasing Manager).'}
                </p>
             </div>
          </div>
          {settingsReportId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6">
              <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-100">
                <div className="flex items-center justify-between border-b border-slate-100 p-5">
                  <div>
                    <h4 className="text-lg font-black text-slate-800">{isRtl ? 'إعدادات التقرير' : 'Report Settings'}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {isRtl ? 'تحكم سريع في شكل الطباعة لهذا التقرير' : 'Quick print layout controls'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSettingsReportId(null)}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-700"
                  >
                    ×
                  </button>
                </div>
                <div className="p-6 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">{isRtl ? 'مقاس الورق' : 'Paper Size'}</label>
                    <select
                      value={reportSettings.paperSize}
                      onChange={(event) =>
                        setReportSettings((prev) => ({ ...prev, paperSize: event.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      <option>A4</option>
                      <option>A3</option>
                      <option>Letter</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">{isRtl ? 'الوضع' : 'Orientation'}</label>
                    <select
                      value={reportSettings.orientation}
                      onChange={(event) =>
                        setReportSettings((prev) => ({ ...prev, orientation: event.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      <option value="Portrait">{isRtl ? 'عمودي' : 'Portrait'}</option>
                      <option value="Landscape">{isRtl ? 'أفقي' : 'Landscape'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">{isRtl ? 'نوع الخط' : 'Font'}</label>
                    <select
                      value={reportSettings.font}
                      onChange={(event) =>
                        setReportSettings((prev) => ({ ...prev, font: event.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      <option>Cairo</option>
                      <option>IBM Plex Sans</option>
                      <option>Tahoma</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">{isRtl ? 'حجم الخط' : 'Font Size'}</label>
                    <select
                      value={reportSettings.fontSize}
                      onChange={(event) =>
                        setReportSettings((prev) => ({ ...prev, fontSize: event.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      <option>11</option>
                      <option>12</option>
                      <option>13</option>
                      <option>14</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-500">{isRtl ? 'ارتفاع السطر' : 'Line Height'}</label>
                    <select
                      value={reportSettings.lineHeight}
                      onChange={(event) =>
                        setReportSettings((prev) => ({ ...prev, lineHeight: event.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      <option>1.2</option>
                      <option>1.4</option>
                      <option>1.6</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-5">
                  <button
                    onClick={() => setSettingsReportId(null)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600"
                  >
                    {isRtl ? 'إغلاق' : 'Close'}
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black text-white"
                  >
                    {isRtl ? 'حفظ الإعدادات' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="animate-in zoom-in-95 duration-500">
           <button 
             onClick={() => setSelectedReport(null)}
             className="mb-8 flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-purple-600 transition-colors"
           >
             &larr; {isRtl ? 'العودة لتقارير المخازن' : 'Back to Stores Reports'}
           </button>

           <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
              <ReportPrintWrapper 
                reportTitle={isRtl ? storesConfig.Available_Reports.find((r:any)=>r.Report_ID===selectedReport).Title_Ar : storesConfig.Available_Reports.find((r:any)=>r.Report_ID===selectedReport).Title_En}
                activeSchool={activeSchool}
                reportConfig={storesConfig}
                lang={lang}
                activeYearName={store?.activeYear?.Year_Name}
              >
                <div className="py-10 text-center space-y-6">
                   <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center mb-8">
                      <span className="text-xs font-black text-slate-400 uppercase">{isRtl ? 'كود التقرير:' : 'REF:'} STR-RPT-2025</span>
                      <span className="text-xs font-black text-slate-400 uppercase">{isRtl ? 'التصنيف: مخازن' : 'CAT: STORES'}</span>
                   </div>
                   
                   <table className="w-full border-collapse border border-slate-900">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="py-3 px-4 text-start font-black text-xs border border-slate-900">Item Code</th>
                          <th className="py-3 px-4 text-start font-black text-xs border border-slate-900">Description</th>
                          <th className="py-3 px-4 text-center font-black text-xs border border-slate-900">Current Qty</th>
                          <th className="py-3 px-4 text-center font-black text-xs border border-slate-900">Condition</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1,2,3].map(i => (
                          <tr key={i} className="text-sm font-bold">
                            <td className="py-4 px-4 border border-slate-900 font-mono">STK-TAB-12</td>
                            <td className="py-4 px-4 border border-slate-900">Tablet Education Pro v2</td>
                            <td className="py-4 px-4 border border-slate-900 text-center">45</td>
                            <td className="py-4 px-4 border border-slate-900 text-center">Good</td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
              </ReportPrintWrapper>
           </div>
        </div>
      )}
    </div>
  );
};

export default StoresReportsTab;
