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
import { isDemoMode } from './src/guards/appMode';

const BUY_URL = 'https://YOUR_DOMAIN_HERE/buy';

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
    if (isDemoMode()) {
      console.info('🧪 Demo Mode Active');
    }
  }, []);

  const DemoBadge = () => (
    isDemoMode() ? (
      <div
        className="fixed top-3 right-3 z-50 px-4 py-2 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 text-xs font-black shadow"
        title="Demo Mode"
      >
        نسخة تجريبية Demo – بعض الخصائص معطلة · Demo Mode
      </div>
    ) : null
  );

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

  if (!store.currentUser) {
    return (
      <>
        <SystemLogin
          onLogin={store.login}
          onVerifyOtp={store.verifyOtpCode}
          onResendOtp={store.resendOtpCode}
          onCancelOtp={store.cancelOtp}
          onProgrammerLogin={store.loginProgrammer}
          defaultSchoolCode={store.schoolCode}
        />
        <DemoBadge />
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
            <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
              <div className="max-w-[1600px] mx-auto">
                {renderActiveScreen}
              </div>
            </div>
            <div className="no-print px-6 pb-4 text-[11px] text-slate-500 font-bold flex justify-center gap-3">
              <span>© {new Date().getFullYear()} Eagle AI — جميع الحقوق محفوظة</span>
              {isDemoMode() && (
                <a
                  href={BUY_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 underline decoration-dotted"
                >
                  طلب النسخة الكاملة
                </a>
              )}
            </div>
          </main>
          <SupportWidget />
        </div>
      </AcademicYearProvider>
      <DemoBadge />
    </>
  );
};

export default App;
