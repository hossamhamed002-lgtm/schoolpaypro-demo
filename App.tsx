
import React, { useState, useMemo } from 'react';
import { useStore } from './store';
import { AcademicYearProvider } from './contexts/AcademicYearContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import StudentView from './components/students/StudentView';
import FinanceView from './components/finance/FinanceView';
import AcademicView from './components/academic/AcademicView';
import MembersView from './components/members/MembersView';
import StaffView from './components/staff/StaffView';
import StoresView from './components/stores/StoresView';
import WhatsAppSender from './components/WhatsAppSender';
import ExamControlView from './components/examControl/ExamControlView';
import ProgrammerView from './components/programmer/ProgrammerView';
import SystemLogin from './components/SystemLogin';
import useAutoBackup from './hooks/useAutoBackup';
import SupportWidget from './components/SupportWidget';
import { setModuleActive } from './storageGate';

type TabId =
  | 'dashboard'
  | 'academic'
  | 'members'
  | 'students'
  | 'staff'
  | 'finance'
  | 'communications'
  | 'stores'
  | 'examControl'
  | 'programmer';

const App: React.FC = () => {
  const store = useStore();
  const { t } = store;
  const demoMode = store.demoMode;
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const enableLazyFonts = React.useCallback(() => {
    const link = document.getElementById('lazy-fonts') as HTMLLinkElement | null;
    if (link && link.disabled) {
      link.disabled = false;
    }
  }, []);

  React.useEffect(() => {
    if (store.currentUser) {
      enableLazyFonts();
    }
  }, [enableLazyFonts, store.currentUser]);

  React.useEffect(() => {
    if (!demoMode) return;
    const timer = setTimeout(() => {
      alert('انتهت الجلسة التجريبية، سيتم إعادة تحميل الصفحة');
      window.location.reload();
    }, 30 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [demoMode]);

  React.useEffect(() => {
    if (store.setHrSyncEnabled) {
      store.setHrSyncEnabled(activeTab === 'staff');
      return () => store.setHrSyncEnabled(false);
    }
    return;
  }, [activeTab, store]);

  React.useEffect(() => {
    setModuleActive('finance', activeTab === 'finance');
    setModuleActive('hr', activeTab === 'staff');
    setModuleActive('examControl', activeTab === 'examControl');
    return () => {
      setModuleActive('finance', false);
      setModuleActive('hr', false);
      setModuleActive('examControl', false);
    };
  }, [activeTab]);

  useAutoBackup(store.schoolCode, store.activeYear?.Year_ID || store.workingYearId, !!store.currentUser);

  const availableModuleIds = useMemo(() => store.availableModules.map((m: any) => m.id), [store.availableModules]);

  React.useEffect(() => {
    if (!availableModuleIds.includes(activeTab)) {
      setActiveTab((availableModuleIds[0] as TabId) || 'dashboard');
    }
  }, [activeTab, availableModuleIds]);

  const renderActiveScreen = useMemo(() => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView store={store} setActiveTab={setActiveTab} />;
      case 'academic':  return <AcademicView store={store} />;
      case 'members':   return <MembersView store={store} />;
      case 'students':  return <StudentView store={store} />;
      case 'staff':     return <StaffView store={store} />;
      case 'finance':   return <FinanceView store={store} />;
      case 'communications': return <WhatsAppSender />;
      case 'stores':    return <StoresView store={store} />;
      case 'examControl': return <ExamControlView store={store} />;
      case 'programmer': return <ProgrammerView store={store} />;
      default:          return <DashboardView store={store} setActiveTab={setActiveTab} />;
    }
  }, [activeTab, store]);

  const DemoWatermark = () => (
    demoMode ? (
      <div className="fixed left-4 bottom-4 text-xs font-black text-slate-700 opacity-60 pointer-events-none select-none z-50">
        Demo Version – SchoolPayPro
      </div>
    ) : null
  );

  if (!store.currentUser) {
    return (
      <>
        <SystemLogin
          onLogin={store.login}
          onVerifyOtp={store.verifyOtpCode}
          onResendOtp={store.resendOtpCode}
          onCancelOtp={store.cancelOtp}
          onProgrammerLogin={store.loginProgrammer}
          onDemoLogin={store.loginAsDemoSchool}
          defaultSchoolCode={store.schoolCode}
        />
        <DemoWatermark />
      </>
    );
  }

  return (
    <>
      <AcademicYearProvider
        years={store.years}
        selectedYearId={store.workingYearId}
        setSelectedYearId={store.setActiveYearId}
      >
        <div className="flex h-screen bg-slate-50 transition-all duration-300 overflow-hidden">
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            t={t}
            modules={store.availableModules}
            onLogout={store.logout}
            user={store.currentUser}
          />
          <main className="flex-1 flex flex-col min-w-0 h-full">
            <Header store={store} />
            {demoMode && (
              <div className="no-print mx-6 mt-4 mb-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="text-sm font-black text-amber-800">🟡 نسخة تجريبية – Demo Version</div>
                  <div className="text-xs font-bold text-amber-700">البيانات غير محفوظة</div>
                </div>
                <a
                  href="mailto:hossamhamed002@gmail.com"
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-black rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow"
                >
                  🔵 اشترِ النسخة الكاملة
                </a>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
              <div className="max-w-[1600px] mx-auto">
                {renderActiveScreen}
              </div>
            </div>
            <div className="no-print px-6 pb-4 text-[11px] text-slate-500 font-bold flex justify-center">
              © {new Date().getFullYear()} Eagle AI — جميع الحقوق محفوظة
            </div>
          </main>
          <SupportWidget />
        </div>
      </AcademicYearProvider>
      <DemoWatermark />
    </>
  );
};

export default App;
