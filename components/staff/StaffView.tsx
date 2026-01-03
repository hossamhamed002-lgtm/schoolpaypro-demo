import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  FileText,
  CalendarDays,
  ClipboardList,
  Clock,
  CreditCard,
  Settings,
  ChevronLeft,
  Briefcase,
  Info,
  BarChart3,
  Printer
} from 'lucide-react';
import EmployeesListScreen from './EmployeesListScreen';
import LeaveBalancesScreen from './LeaveBalancesScreen';
import LeaveRequestsScreen from './LeaveRequestsScreen';
import StaffPlaceholderScreen from './StaffPlaceholderScreen';
import PayrollReviewScreen from './PayrollReviewScreen';
import StaffSettingsScreen from './StaffSettingsScreen';
import AttendanceScreen from './AttendanceScreen';
import StaffReportsScreen from '../../modules/staff/components/StaffReportsScreen';
import ReportPrintWrapper from '../ReportPrintWrapper';

type StaffSubScreen = 'hub' | 'employees' | 'leaveBalances' | 'leaveRequests' | 'files' | 'attendance' | 'payroll' | 'settings' | 'reports';

const StaffView: React.FC<{ store: any }> = ({ store }) => {
  const { t, lang } = store;
  const isRtl = lang === 'ar';
  const [activeScreen, setActiveScreen] = useState<StaffSubScreen>('hub');
  const [printConfig, setPrintConfig] = useState<any | null>(null);

  useEffect(() => {
    sessionStorage.setItem('MODULE_ACTIVE__hr', 'true');
    return () => {
      sessionStorage.removeItem('MODULE_ACTIVE__hr');
    };
  }, []);

  const hubCards = useMemo(() => ([
    { id: 'employees', label: isRtl ? 'الموظفون' : 'Employees', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'leaveBalances', label: isRtl ? 'أرصدة الإجازات' : 'Leave Balances', icon: CalendarDays, color: 'text-sky-600', bg: 'bg-sky-50' },
    { id: 'leaveRequests', label: isRtl ? 'طلبات الإجازات' : 'Leave Requests', icon: ClipboardList, color: 'text-violet-600', bg: 'bg-violet-50' },
    { id: 'files', label: isRtl ? 'ملفات الموظفين' : 'Employee Files', icon: FileText, color: 'text-rose-500', bg: 'bg-rose-50' },
    { id: 'attendance', label: isRtl ? 'الحضور والانصراف' : 'Attendance', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'payroll', label: isRtl ? 'الرواتب' : 'Payroll', icon: CreditCard, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'reports', label: isRtl ? 'تقارير شؤون العاملين' : 'Staff Reports', icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'settings', label: isRtl ? 'إعدادات شؤون العاملين' : 'Staff Settings', icon: Settings, color: 'text-slate-600', bg: 'bg-slate-100' }
  ]), [isRtl]);

  const activeLabel = useMemo(() => {
    if (activeScreen === 'hub') return isRtl ? 'شؤون العاملين' : 'Staff Affairs';
    return hubCards.find((card) => card.id === activeScreen)?.label || '';
  }, [activeScreen, hubCards, isRtl]);

  const handleCardClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const targetId = event.currentTarget.dataset.id as StaffSubScreen;
    if (!targetId) return;
    setActiveScreen(targetId);
  }, []);

  const handleBackToHub = useCallback(() => {
    setActiveScreen('hub');
  }, []);

  const renderHub = useCallback(() => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {hubCards.map((card) => (
        <button
          key={card.id}
          data-id={card.id}
          onClick={handleCardClick}
          className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col items-center justify-center text-center relative overflow-hidden h-64"
        >
          <div className={`absolute -top-10 -right-10 w-32 h-32 ${card.bg} rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-700 blur-3xl`}></div>
          <div className={`w-20 h-20 ${card.bg} ${card.color} rounded-[2rem] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm`}>
            <card.icon size={36} />
          </div>
          <h3 className="text-lg font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
            {card.label}
          </h3>
        </button>
      ))}
    </div>
  ), [handleCardClick, hubCards]);

  const renderContent = useCallback(() => {
    switch (activeScreen) {
      case 'employees':
        return <EmployeesListScreen store={store} onBack={handleBackToHub} />;
      case 'leaveBalances':
        return <LeaveBalancesScreen store={store} onBack={handleBackToHub} />;
      case 'leaveRequests':
        return <LeaveRequestsScreen store={store} onBack={handleBackToHub} />;
      case 'files':
        return (
          <StaffPlaceholderScreen
            title={isRtl ? 'ملفات الموظفين' : 'Employee Files'}
            description={isRtl ? 'هذه الصفحة قيد التفعيل لعرض ملفات الموظفين.' : 'This page will be activated to manage employee files.'}
            onBack={handleBackToHub}
            isRtl={isRtl}
          />
        );
      case 'attendance':
        return <AttendanceScreen store={store} onBack={handleBackToHub} />;
      case 'payroll':
        return <PayrollReviewScreen store={store} onBack={handleBackToHub} />;
      case 'reports':
        return (
          <StaffReportsScreen
            store={store}
            onBack={handleBackToHub}
            openPrintPreview={(config) => setPrintConfig(config)}
          />
        );
      case 'settings':
        return <StaffSettingsScreen store={store} onBack={handleBackToHub} />;
      default:
        return renderHub();
    }
  }, [activeScreen, handleBackToHub, isRtl, renderHub, store]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5 text-start">
          {activeScreen !== 'hub' && (
            <button
              onClick={handleBackToHub}
              className="p-4 bg-white border border-slate-100 text-slate-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm group"
            >
              <ChevronLeft size={24} className={`${isRtl ? 'rotate-180' : ''} group-hover:-translate-x-1 transition-transform`} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20">
                <Briefcase size={24} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t.staff}</h2>
            </div>
            <p className="text-slate-500 text-sm font-medium mt-1 ps-1 flex items-center gap-2">
              {isRtl ? 'الرئيسية' : 'Main'}
              <span className="text-slate-300">/</span>
              <span className="text-indigo-600 font-bold">{activeLabel}</span>
            </p>
          </div>
        </div>
      </div>

      {activeScreen === 'hub' && (
        <div className="bg-amber-50 border border-amber-100 p-6 rounded-[1.5rem] flex items-start gap-4 text-start animate-in slide-in-from-top-2 duration-700">
          <div className="p-2 bg-white rounded-xl shadow-sm">
            <Info size={20} className="text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-black text-amber-900 leading-tight">
              {isRtl ? 'هذه القائمة تحتوي على أوامر تخص شؤون العاملين فقط (الموظفون - ملفات الموظفين).' : 'This menu contains commands specific to Staff Affairs only.'}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4">
        {renderContent()}
      </div>

      {printConfig && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto p-6 space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Printer size={18} className="text-indigo-600" />
                {printConfig.title || 'معاينة الطباعة'}
              </h3>
              <button
                onClick={() => setPrintConfig(null)}
                className="px-3 py-1 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800"
              >
                إغلاق
              </button>
            </div>
            <div className="border rounded-2xl overflow-hidden">
              <ReportPrintWrapper
                reportTitle={printConfig.title}
                activeSchool={store.activeSchool}
                lang={isRtl ? 'ar' : 'en'}
                activeYearName={store.activeYear?.Year_Name || store.activeYear?.AcademicYear_Name || store.activeYear?.Name}
                printOverrides={printConfig.printOverrides || { paperSize: 'A4', orientation: 'portrait' }}
              >
                <div className="space-y-4">
                  {printConfig.subtitle && (
                    <p className="text-center text-sm font-bold text-slate-700">{printConfig.subtitle}</p>
                  )}
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          {printConfig.table?.columns?.map((c: string) => (
                            <th key={c} className="px-3 py-2 text-right font-bold text-slate-700 border-b">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(printConfig.table?.rows || []).map((row: any[], idx: number) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-3 py-2 text-right text-slate-800 border-b">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </ReportPrintWrapper>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700"
              >
                طباعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffView;
