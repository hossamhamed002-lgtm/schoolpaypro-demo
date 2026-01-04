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
import LandingPage from './src/landing/LandingPage';
import AdminLicensesPage from './src/admin/AdminLicensesPage';
import { BUY_URL } from './src/config/links';
import { getLastBindingStatus } from './license/licenseGuard';
import type { LicenseBindingStatus } from './src/license/hwidBinding';
import LicenseActivationFullScreen from './components/license/LicenseActivationFullScreen';
import LicenseStatusBadge from './components/license/LicenseStatusBadge';
import { rememberActivationIntent, hasActivationBeenShown } from './src/guards/activationGuard';
import { runReleaseVerification } from './src/releaseVerifier';
import RenewalScreen from './components/license/RenewalScreen';
import LicenseBlockedScreen from './components/license/LicenseBlockedScreen';
import EntryGatewayScreen from './components/EntryGatewayScreen';
import { licenseExists } from './license/licenseStorage';

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
  const programmerHint = (() => {
    try {
      return !!localStorage.getItem('EDULOGIC_PROGRAMMER_USER_V1');
    } catch {
      return false;
    }
  })();
  const isDesktopEnvLocal = React.useCallback(() => {
    if (typeof window === 'undefined') return false;
    const w = window as any;
    const ua = (navigator?.userAgent || '').toLowerCase();
    const isElectron = !!w.process?.versions?.electron || !!w.process?.type;
    const isHosted = typeof window.location?.hostname === 'string' && window.location.hostname.includes('vercel.app');
    const isMobileUA = ua.includes('mobile');
    return isElectron || (!isHosted && !isMobileUA);
  }, []);
  const [renewalMode, setRenewalMode] = React.useState(false);
  const [entryMode, setEntryMode] = React.useState<'gateway' | 'activate' | 'new' | 'renew' | null>(null);
  const [programmerShortcut, setProgrammerShortcut] = React.useState(false);
  const [skipGatewayOnce, setSkipGatewayOnce] = React.useState(false);
  const releaseCheck = React.useMemo(() => runReleaseVerification({ programmerHint, allowTrials: false }), [programmerHint]);
  const store = useStore();
  const { t } = store;
  const [bindingStatus, setBindingStatus] = useState<LicenseBindingStatus | null>(null);
  const [showHwidWarning, setShowHwidWarning] = useState(false);
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
    if ((import.meta as any)?.env?.DEV && isDemoMode()) {
      console.info('🧪 Demo Mode Active');
    }
  }, []);

  React.useEffect(() => {
    (window as any).setEntryMode = (mode: typeof entryMode) => setEntryMode(mode);
    (window as any).onLicenseActivated = () => setSkipGatewayOnce(true);
    return () => {
      if ((window as any).setEntryMode === setEntryMode) {
        delete (window as any).setEntryMode;
      }
      if ((window as any).onLicenseActivated) {
        delete (window as any).onLicenseActivated;
      }
    };
  }, []);

  React.useEffect(() => {
    if (store.licenseStatus?.allowed && entryMode) {
      setEntryMode(null);
    }
  }, [store.licenseStatus?.allowed, entryMode]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isDesktopEnvLocal() || isDemoMode() || store.isProgrammer) return;
      const key = (e.key || '').toLowerCase();
      const modPrimary = e.ctrlKey || e.metaKey;
      const modSecondary = e.shiftKey || e.altKey;
      if (key === 'p' && modPrimary && modSecondary) {
        setEntryMode(null);
        setRenewalMode(false);
        setProgrammerShortcut(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [store, isDesktopEnvLocal]);

  React.useEffect(() => {
    if (store.currentUser) {
      setProgrammerShortcut(false);
    }
    if (store.currentUser || store.activeSchool) {
      setSkipGatewayOnce(false);
    }
  }, [store.currentUser]);

  const softBlockCopy = React.useMemo(() => {
    if (!store.isSoftBlocked) return null;
    const isAr = store.lang === 'ar';
    const reason = store.softBlockReason || 'expired';
    if (reason === 'hwid_mismatch') {
      return isAr
        ? '⚠️ الترخيص مرتبط بجهاز آخر — تم تفعيل وضع القراءة فقط'
        : '⚠️ License bound to another device — read-only mode enabled';
    }
    if (reason === 'school_mismatch') {
      return isAr
        ? '⚠️ الترخيص غير مرتبط بهذه المدرسة — تم تفعيل وضع القراءة فقط'
        : '⚠️ License not bound to this school — read-only mode enabled';
    }
    if (reason === 'grace_expired') {
      return isAr
        ? '⚠️ انتهت فترة السماح — الرجاء تجديد الترخيص'
        : '⚠️ Grace period ended — please renew the license';
    }
    return isAr
      ? '⚠️ انتهت صلاحية الترخيص — يمكنك تصفح النظام لكن لا يمكنك التعديل'
      : '⚠️ License expired — read-only mode enabled';
  }, [store.isSoftBlocked, store.lang, store.softBlockReason]);

  const graceCopy = React.useMemo(() => {
    const reason = store.licenseStatus?.reason;
    if (reason !== 'grace') return null;
    const isAr = store.lang === 'ar';
    const days = store.licenseStatus?.graceDaysLeft ?? 0;
    return isAr
      ? `⚠️ الترخيص منتهي — متبقي ${days} يوم${days === 1 ? '' : days <= 10 ? 'ًا' : ''} للتجديد`
      : `⚠️ License expired — ${days} day(s) left in grace period`;
  }, [store.lang, store.licenseStatus]);

  const pathIsDemo = typeof window !== 'undefined' && window.location.pathname.startsWith('/demo');
  const pathIsAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  const hasStoredLicense = React.useMemo(() => {
    try {
      return licenseExists();
    } catch {
      return false;
    }
  }, []);
  const activationReason = store.licenseStatus?.reason || store.licenseStatus?.status;
  const shouldShowActivation =
    !!(
      !pathIsAdmin
      && !isDemoMode()
      && !store.isProgrammer
      && store.licenseStatus
      && (
        store.licenseStatus.activationRequired
        || store.licenseStatus.allowed === false
      )
      && ['expired', 'hwid_mismatch', 'missing_license', 'missing', 'missing_school_uid'].includes(String(activationReason))
      && !skipGatewayOnce
    ) || (!!releaseCheck?.fatal && !store.isProgrammer);
  const shouldShowRenewal = shouldShowActivation && (renewalMode || store.licenseStatus?.status === 'expired' || store.licenseStatus?.reason === 'expired');
  const shouldHardBlock = !!(
    store.licenseStatus
    && store.licenseStatus.allowed === false
    && !store.isProgrammer
    && !isDemoMode()
  );
  const shouldShowGateway = !store.isProgrammer
    && !store.currentUser
    && !pathIsAdmin
    && !isDemoMode()
    && (!store.licenseStatus || store.licenseStatus.allowed === false || store.licenseStatus.status === 'missing')
    && !hasStoredLicense
    && !skipGatewayOnce;

  const DemoBadge = () => (
    isDemoMode() ? (
      <div
        className="fixed top-3 right-3 z-50 px-4 py-2 rounded-xl bg-amber-100 border border-amber-200 text-amber-800 text-xs font-black shadow"
        title="Demo Mode"
      >
        نسخة تجريبية – البيانات مؤقتة وستُحذف تلقائيًا
      </div>
    ) : null
  );

  const HwidWarning = () => {
    if (isDemoMode() || !showHwidWarning || !bindingStatus || bindingStatus.status !== 'mismatch') {
      return null;
    }
    const isProgrammer = store.isProgrammer;
    return (
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-2xl px-4">
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg shadow p-3 text-sm">
          <div className="font-bold">⚠️ هذا الترخيص مُفعل على جهاز آخر</div>
          <div className="text-xs mt-1 text-amber-700">
            يمكنك المتابعة مؤقتًا، لكن قد يتم تقييد الاستخدام لاحقًا
          </div>
          {isProgrammer && (
            <div className="mt-2 text-[11px] leading-tight space-y-1">
              <div>
                HWID الحالي:{' '}
                <code className="font-mono break-all">{bindingStatus.hwid}</code>
              </div>
              {bindingStatus.boundHwid ? (
                <div>
                  HWID المرتبط بالترخيص:{' '}
                  <code className="font-mono break-all">{bindingStatus.boundHwid}</code>
                </div>
              ) : null}
              <div className="font-semibold">الحالة: mismatch</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const SoftBlockBanner = () => {
    if (!softBlockCopy || !store.currentUser) return null;
    return (
      <div className="fixed top-0 left-0 right-0 z-[60]">
        <div className="mx-auto max-w-5xl px-4 py-3 bg-amber-50 border-b border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow">
          <div className="text-sm font-semibold leading-snug">{softBlockCopy}</div>
          <a
            href={BUY_URL || 'https://wa.me/201094981227'}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600 text-white shadow hover:bg-emerald-700 transition-colors"
          >
            {store.lang === 'ar' ? 'تجديد الترخيص' : 'Renew license'}
          </a>
        </div>
      </div>
    );
  };

  const GraceBanner = () => {
    if (!graceCopy || !store.currentUser) return null;
    return (
      <div className="fixed top-0 left-0 right-0 z-[55]">
        <div className="mx-auto max-w-5xl px-4 py-3 bg-yellow-50 border-b border-yellow-200 text-yellow-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow">
          <div className="text-sm font-semibold leading-snug">{graceCopy}</div>
          <a
            href={BUY_URL || 'https://wa.me/201094981227'}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg bg-indigo-600 text-white shadow hover:bg-indigo-700 transition-colors"
          >
            {store.lang === 'ar' ? 'تجديد الترخيص' : 'Renew license'}
          </a>
        </div>
      </div>
    );
  };

  React.useEffect(() => {
    if (isDemoMode()) {
      return;
    }
    const status = getLastBindingStatus?.();
    if (!status || status.status !== 'mismatch') {
      return;
    }
    setBindingStatus(status);
    if (typeof window === 'undefined') {
      return;
    }
    const warned = sessionStorage.getItem('EDULOGIC_HWID_WARNED_V1');
    if (!warned) {
      setShowHwidWarning(true);
      sessionStorage.setItem('EDULOGIC_HWID_WARNED_V1', '1');
    }
  }, [store.currentUser]);

  React.useEffect(() => {
    if (shouldShowActivation && !hasActivationBeenShown()) {
      rememberActivationIntent();
    }
  }, [shouldShowActivation]);

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

  if (isDemoMode() && !pathIsDemo) {
    return <LandingPage />;
  }

  if (pathIsAdmin) {
    return <AdminLicensesPage />;
  }

  if (!store.currentUser && programmerShortcut) {
    return (
      <SystemLogin
        onLogin={store.login}
        onVerifyOtp={store.verifyOtpCode}
        onResendOtp={store.resendOtpCode}
        onCancelOtp={store.cancelOtp}
        onProgrammerLogin={store.loginProgrammer}
        defaultSchoolCode={store.schoolCode}
        defaultProgrammerOpen
      />
    );
  }

  if (!store.currentUser && shouldShowGateway) {
    if (entryMode === 'activate') {
      return (
        <>
          <button
            type="button"
            onClick={() => setEntryMode('gateway')}
            className="fixed top-4 left-4 z-50 px-4 py-2 rounded-xl bg-white/80 border border-slate-200 text-slate-700 text-sm font-bold shadow"
          >
            ← العودة
          </button>
          <LicenseActivationFullScreen store={store} />
        </>
      );
    }
    if (entryMode === 'renew') {
      return (
        <>
          <button
            type="button"
            onClick={() => setEntryMode('gateway')}
            className="fixed top-4 left-4 z-50 px-4 py-2 rounded-xl bg-white/80 border border-slate-200 text-slate-700 text-sm font-bold shadow"
          >
            ← العودة
          </button>
          <RenewalScreen store={store} onClose={() => setEntryMode('gateway')} />
        </>
      );
    }
    if (entryMode === 'new') {
      return (
        <>
          <button
            type="button"
            onClick={() => setEntryMode('gateway')}
            className="fixed top-4 left-4 z-50 px-4 py-2 rounded-xl bg-white/80 border border-slate-200 text-slate-700 text-sm font-bold shadow"
          >
            ← العودة
          </button>
          <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10" dir="rtl">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 max-w-2xl space-y-4 text-center">
              <div className="text-2xl font-black text-slate-900">طلب كود ترخيص جديد</div>
              <p className="text-sm text-slate-600">تواصل معنا للحصول على كود ترخيص جديد.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <a href="https://wa.me/201094981227" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow hover:bg-indigo-700">WhatsApp</a>
                <a href="mailto:hossamhamed002@gmail.com?subject=License%20Request%20-%20SchoolPay%20Pro" className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:border-indigo-300 hover:text-indigo-800">Email</a>
                <button type="button" onClick={() => setEntryMode('gateway')} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-slate-500 text-sm font-bold hover:text-slate-700">العودة</button>
              </div>
            </div>
          </div>
        </>
      );
    }
    return (
      <EntryGatewayScreen
        onCurrent={() => setEntryMode('activate')}
        onNew={() => setEntryMode('new')}
        onRenew={() => setEntryMode('renew')}
        onDemo={() => {
          window.location.href = 'https://schoolpaypro-demo.vercel.app/demo';
        }}
      />
    );
  }

  if (!store.currentUser && shouldShowActivation) {
    return (
      <>
        {shouldShowRenewal ? (
          <RenewalScreen store={store} onClose={() => setRenewalMode(false)} />
        ) : (
          <LicenseActivationFullScreen store={store} />
        )}
        <DemoBadge />
        <HwidWarning />
        <GraceBanner />
      </>
    );
  }

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
        <HwidWarning />
        <GraceBanner />
        <SoftBlockBanner />
        {isDemoMode() && (
          <a
            className="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black shadow hover:bg-indigo-700"
            href="https://wa.me/201094981227?text=%D9%85%D8%B1%D8%AD%D8%A8%D9%8B%D8%A7%D8%8C%20%D8%A3%D9%86%D8%A7%20%D9%85%D9%87%D8%AA%D9%85%20%D8%A8%D8%B4%D8%B1%D8%A7%D8%A1%20%D9%86%D8%B3%D8%AE%D8%A9%20SchoolPay%20Pro%20%D9%88%D8%B4%D8%A7%D9%87%D8%AF%D8%AA%20%D8%A7%D9%84%D9%86%D8%B3%D8%AE%D8%A9%20%D8%A7%D9%84%D8%AA%D8%AC%D8%B1%D9%8A%D8%A8%D9%8A%D8%A9."
            target="_blank"
            rel="noreferrer"
          >
            {store.lang === 'ar' ? 'طلب النسخة الكاملة' : 'Request Full Version'}
          </a>
        )}
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
        <div
          className="flex h-screen bg-slate-50 transition-all duration-300 overflow-hidden"
          style={(store.isSoftBlocked || graceCopy) ? { paddingTop: '64px' } : undefined}
        >
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
            <div className="no-print px-6 pt-2 flex justify-end">
              {!store.isProgrammer && store.currentUser ? (
                <LicenseStatusBadge status={store.licenseStatus} onRenew={() => setRenewalMode(true)} />
              ) : null}
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
              <div className="max-w-[1600px] mx-auto">
                {renderActiveScreen}
              </div>
            </div>
            <div className="no-print px-6 pb-4 text-[11px] text-slate-500 font-bold flex justify-center gap-3">
              <span>© {new Date().getFullYear()} Eagle AI — جميع الحقوق محفوظة</span>
              {isDemoMode() && (
                <a
                  href={BUY_URL || 'https://wa.me/201094981227?text=مرحبا%20اريد%20شراء%20SchoolPay%20Pro'}
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
      <HwidWarning />
      <GraceBanner />
      <SoftBlockBanner />
      {isDemoMode() && (
        <a
          className="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black shadow hover:bg-indigo-700"
          href={BUY_URL || 'https://wa.me/201094981227?text=مرحبا%20اريد%20شراء%20SchoolPay%20Pro'}
          target="_blank"
          rel="noreferrer"
        >
          {store.lang === 'ar' ? 'طلب النسخة الكاملة' : 'Request Full Version'}
        </a>
      )}
    </>
  );
};

export default App;
