
import React, { useState } from 'react';
import { 
  FileBarChart, Printer, Eye, ChevronLeft, Users, 
  TrendingUp, ShieldCheck, PhoneCall, GitGraph, Search, 
  ArrowUpRight, Info
} from 'lucide-react';
import ReportPrintWrapper from '../ReportPrintWrapper';

interface MemberReportsTabProps {
  store: any;
  onBack: () => void;
}

const MemberReportsTab: React.FC<MemberReportsTabProps> = ({ store, onBack }) => {
  const { t, lang, activeSchool, students = [], employees = [], users = [], reportConfigs } = store;
  const isRtl = lang === 'ar';
  
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [settingsReportId, setSettingsReportId] = useState<string | null>(null);
  const defaultReportSettings = {
    paperSize: 'A4',
    orientation: 'Portrait',
    font: 'Cairo',
    fontSize: '12',
    lineHeight: '1.4'
  };
  const [reportSettings, setReportSettings] = useState(defaultReportSettings);

  const handlePrint = (reportId: string) => {
    setSelectedReportId(reportId);
  };

  const handlePreview = (reportId: string) => {
    setSelectedReportId(reportId);
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

  // تعريف التقارير المتاحة في هذا القسم
  const reports = [
    { 
      id: 'REP-MEM-POP', 
      title: t.reportPopGrowth, 
      desc: t.reportPopGrowthDesc, 
      icon: TrendingUp, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50' 
    },
    { 
      id: 'REP-MEM-ACCESS', 
      title: t.reportAccessMatrix, 
      desc: t.reportAccessMatrixDesc, 
      icon: ShieldCheck, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-50' 
    },
    { 
      id: 'REP-MEM-DIR', 
      title: t.reportEmergencyDir, 
      desc: t.reportEmergencyDirDesc, 
      icon: PhoneCall, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50' 
    },
    { 
      id: 'REP-MEM-DEPT', 
      title: t.reportDeptDistribution, 
      desc: t.reportDeptDistributionDesc, 
      icon: GitGraph, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50' 
    },
  ];

  const totalMembers = students.length + employees.length;
  const ratio = employees.length > 0 ? (students.length / employees.length).toFixed(1) : students.length;

  const currentConfig = reportConfigs.find((c: any) => c.Category_ID === 'members') || reportConfigs[0];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-start pb-10">
      
      {!selectedReportId ? (
        <>
          {/* Quick Stats Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
                <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
                   <Users size={24} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.totalPopulation}</p>
                   <p className="text-2xl font-black text-slate-800">{totalMembers.toLocaleString()}</p>
                </div>
             </div>
             <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
                <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
                   <TrendingUp size={24} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.studentTeacherRatio}</p>
                   <p className="text-2xl font-black text-slate-800">{ratio}:1</p>
                </div>
             </div>
             <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
                <div className="p-4 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20">
                   <ShieldCheck size={24} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.activeSystemUsers}</p>
                   <p className="text-2xl font-black text-slate-800">{users.filter((u:any)=>u.Is_Active).length}</p>
                </div>
             </div>
          </div>

          {/* Header Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-md border border-slate-50">
            <div className="flex items-center gap-5">
              <button 
                onClick={onBack} 
                className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all group shadow-sm"
              >
                <ChevronLeft size={24} className={`${isRtl ? 'rotate-180' : ''} group-hover:-translate-x-1 transition-transform`} />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-600/20">
                    <FileBarChart size={24} />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">{t.memberReports}</h3>
                </div>
                <p className="text-slate-500 text-sm font-medium mt-1 opacity-70 tracking-tight">{t.memberReportsDesc}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800">تقارير الأعضاء</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">إعدادات الطباعة والهوية البصرية للتقارير</p>
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
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-slate-400 font-bold">
                        {isRtl ? 'لا توجد تقارير متاحة' : 'No reports available'}
                      </td>
                    </tr>
                  ) : (
                    reports.map((report, index) => (
                      <tr key={report.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="px-4 py-3 text-center">
                          <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${report.bg} ${report.color}`}>
                            <report.icon size={18} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold">Cairo</td>
                        <td className="px-4 py-3 text-center font-mono">12</td>
                        <td className="px-4 py-3 text-center font-mono">1.4</td>
                        <td className="px-4 py-3 text-center font-semibold">A4</td>
                        <td className="px-4 py-3 text-center font-semibold">{isRtl ? 'عمودي' : 'Portrait'}</td>
                        <td className="px-4 py-3 text-start font-black text-slate-800">{report.title}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handlePrint(report.id)}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-[10px] font-black uppercase text-white"
                            >
                              <Printer size={14} /> {t.printReport}
                            </button>
                            <button
                              onClick={() => handlePreview(report.id)}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-600"
                            >
                              <Eye size={14} />
                              {isRtl ? 'معاينة' : 'Preview'}
                            </button>
                            <button
                              onClick={() => handleOpenSettings(report.id)}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-indigo-600"
                            >
                              <ShieldCheck size={14} />
                              {isRtl ? 'إعدادات' : 'Settings'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
             onClick={() => setSelectedReportId(null)}
             className="mb-8 flex items-center gap-3 bg-white px-6 py-3 rounded-2xl text-slate-400 font-black text-xs uppercase tracking-widest hover:text-indigo-600 transition-all border border-slate-100 shadow-sm"
           >
             <ChevronLeft size={18} className={isRtl ? 'rotate-180' : ''} />
             {isRtl ? 'العودة لقائمة التقارير' : 'Back to Reports List'}
           </button>

           <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden">
              <ReportPrintWrapper 
                reportTitle={reports.find(r => r.id === selectedReportId)?.title || ''}
                activeSchool={activeSchool}
                reportConfig={currentConfig}
                lang={lang}
                activeYearName={store?.activeYear?.Year_Name}
              >
                <div className="py-12 px-6">
                   {/* Report Content Mockup based on ID */}
                   {selectedReportId === 'REP-MEM-POP' && (
                     <div className="space-y-10">
                        <div className="grid grid-cols-2 gap-8 mb-10">
                           <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Student Population</p>
                              <p className="text-4xl font-black text-indigo-600">{students.length}</p>
                           </div>
                           <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Staff Population</p>
                              <p className="text-4xl font-black text-emerald-600">{employees.length}</p>
                           </div>
                        </div>
                        <table className="w-full border-collapse border border-slate-900">
                           <thead>
                              <tr className="bg-slate-900 text-white">
                                 <th className="p-3 border border-slate-900 text-start">Grade / Department</th>
                                 <th className="p-3 border border-slate-900 text-center">Count</th>
                                 <th className="p-3 border border-slate-900 text-center">Density %</th>
                              </tr>
                           </thead>
                           <tbody>
                              <tr className="font-bold">
                                 <td className="p-3 border border-slate-900">Primary Stage</td>
                                 <td className="p-3 border border-slate-900 text-center">{Math.floor(students.length * 0.6)}</td>
                                 <td className="p-3 border border-slate-900 text-center">60%</td>
                              </tr>
                              <tr className="font-bold">
                                 <td className="p-3 border border-slate-900">Preparatory Stage</td>
                                 <td className="p-3 border border-slate-900 text-center">{Math.floor(students.length * 0.4)}</td>
                                 <td className="p-3 border border-slate-900 text-center">40%</td>
                              </tr>
                           </tbody>
                        </table>
                     </div>
                   )}

                   {selectedReportId === 'REP-MEM-DIR' && (
                     <div className="space-y-6">
                        <table className="w-full border-collapse border border-slate-900">
                           <thead>
                              <tr className="bg-slate-900 text-white">
                                 <th className="p-3 border border-slate-900 text-start">Name</th>
                                 <th className="p-3 border border-slate-900 text-center">Role / Level</th>
                                 <th className="p-3 border border-slate-900 text-center">Emergency Contact</th>
                              </tr>
                           </thead>
                           <tbody>
                              {employees.slice(0, 10).map((emp: any) => (
                                <tr key={emp.Emp_ID} className="text-sm">
                                   <td className="p-3 border border-slate-900 font-bold">{emp.Name_Ar}</td>
                                   <td className="p-3 border border-slate-900 text-center uppercase text-[10px] font-black">{emp.Level}</td>
                                   <td className="p-3 border border-slate-900 text-center font-mono">{emp.Phone}</td>
                                </tr>
                              ))}
                           </tbody>
                        </table>
                        <p className="text-[10px] text-slate-400 italic text-center mt-4">* This directory is for internal emergency use only. Unauthorized sharing is prohibited.</p>
                     </div>
                   )}

                   {/* Add other report types here... */}
                   {!['REP-MEM-POP', 'REP-MEM-DIR'].includes(selectedReportId) && (
                     <div className="p-20 text-center opacity-20 italic flex flex-col items-center">
                        <Info size={48} className="mb-4" />
                        <p className="text-xl font-black">Data aggregation in progress...</p>
                     </div>
                   )}
                </div>
              </ReportPrintWrapper>
           </div>
        </div>
      )}
    </div>
  );
};

export default MemberReportsTab;
