
import React, { useEffect, useState } from 'react';
import { Settings, ScrollText, FolderTree, Banknote, BarChart3, ShieldCheck, Cloud, Truck, FileText, Users, Wallet, CreditCard } from 'lucide-react';
import FinanceReportsTab from './FinanceReportsTab';
import Receipts from './Receipts';
import DailyJournal from '../accounts/DailyJournal';
import ChartOfAccounts from '../ChartOfAccounts';
import StudentInvoicing from './StudentInvoicing';
import FeesAccrual from './FeesAccrual';
import FeeConfiguration from './FeeConfiguration';
import BankAccountsList from '../../src/components/finance/BankAccountsList';
import BackupSettings from '../../src/components/finance/BackupSettings';
import SuppliersTab from '../accounting/SuppliersTab';
import StudentFinancialAffairs from '../students/StudentFinancialAffairs';
import DisbursementVouchers from './DisbursementVouchers';
import Cheques from './Cheques';
import FinancialEntries from './FinancialEntries';
import FinancialYearClose from './FinancialYearClose';
import { isFinancialYearClosed } from '../../src/utils/financialYearClose';

const moduleCards = [
  {
    id: 'config',
    title: 'إعدادات الرسوم',
    desc: 'تعريف بنود الرسوم وتسعير الصفوف الدراسية.',
    icon: Settings
  },
  {
    id: 'billing',
    title: 'استحقاق الرسوم',
    desc: 'إنشاء الفواتير وإدارة ديون الطلاب.',
    icon: ScrollText
  },
  {
    id: 'coa',
    title: 'دليل الحسابات',
    desc: 'إدارة الأصول والخصوم وحسابات الإيرادات.',
    icon: FolderTree
  },
  {
    id: 'treasury',
    title: 'الخزينة والبنوك',
    desc: 'ربط حسابات البنوك والخزائن تلقائياً.',
    icon: ShieldCheck
  },
  {
    id: 'suppliers',
    title: 'الموردون',
    desc: 'إدارة الموردين وربطهم بدليل الحسابات.',
    icon: Truck
  },
  {
    id: 'receipts',
    title: 'سندات القبض',
    desc: 'تحصيل المدفوعات وإدارة الخزينة (قريباً).',
    icon: Banknote
  },
  {
    id: 'disbursements',
    title: 'سندات الصرف',
    desc: 'تسجيل عمليات الصرف ومراجعة المصروفات.',
    icon: Wallet
  },
  {
    id: 'cheques',
    title: 'الشيكات',
    desc: 'إدارة الشيكات الصادرة والواردة.',
    icon: CreditCard
  },
  {
    id: 'student_financial_affairs',
    title: 'الشؤون المالية للطلاب',
    desc: 'متابعة الاستحقاقات، السداد، والمتبقي لكل طالب.',
    icon: Users
  },
  {
    id: 'reports',
    title: 'التقارير',
    desc: 'البيانات المالية والتقارير اليومية.',
    icon: BarChart3
  },
  {
    id: 'year_close',
    title: 'إغلاق العام المالي',
    desc: 'فحص الجاهزية وإغلاق السنة المالية وترحيل الأرصدة.',
    icon: ShieldCheck
  },
  {
    id: 'journal',
    title: 'قيود اليومية',
    desc: 'إدارة قيود اليومية اليومية والاعتماد.',
    icon: FileText
  },
  {
    id: 'financial_entries',
    title: 'القيود المالية',
    desc: 'عرض القيود المالية وحالاتها.',
    icon: ScrollText
  }
];

const ModuleHeader: React.FC<{ title: string; icon: React.ComponentType<any>; onBack: () => void; locked?: boolean }> = ({
  title,
  icon: Icon,
  onBack,
  locked
}) => (
  <div className="flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Finance</p>
      <h3 className="text-xl font-black text-slate-900">{title}</h3>
      <p className="text-[11px] text-slate-500">Finance › {title}</p>
      {locked && (
        <span className="inline-flex items-center gap-2 mt-2 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-black">
          🔒 العام المالي مغلق
        </span>
      )}
    </div>
      <div className="flex items-center gap-3">
        <Icon size={26} className="text-indigo-600" />
        <button
          onClick={onBack}
          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-slate-600"
        >
          رجوع
        </button>
      </div>
  </div>
);

const FinanceView: React.FC<{ store: any }> = ({ store }) => {
  useEffect(() => {
    sessionStorage.setItem('FINANCE_MODULE_OPEN', 'true');
    sessionStorage.setItem('MODULE_ACTIVE__finance', 'true');
    if (store.setFinanceSyncEnabled) store.setFinanceSyncEnabled(true);
    return () => {
      sessionStorage.removeItem('FINANCE_MODULE_OPEN');
      sessionStorage.removeItem('MODULE_ACTIVE__finance');
      if (store.setFinanceSyncEnabled) store.setFinanceSyncEnabled(false);
    };
  }, [store]);

  const [currentView, setCurrentView] = useState<
    | 'dashboard'
    | 'coa'
    | 'fee_config'
    | 'invoicing'
    | 'receipts'
    | 'disbursements'
    | 'cheques'
    | 'student_financial_affairs'
    | 'reports'
    | 'treasury'
    | 'suppliers'
    | 'financial_entries'
    | 'year_close'
  >('dashboard');
  const schoolCode =
    (store.activeSchool?.School_Code || store.activeSchool?.Code || store.activeSchool?.ID || store.activeSchool?.id || 'SCHOOL').toString();
  const yearId =
    store.workingYearId || store.activeYear?.Year_ID || store.activeYear?.AcademicYear_ID || store.activeYear?.id || 'YEAR';
  const isClosed = isFinancialYearClosed(schoolCode, yearId);

  const renderModule = () => {
    switch (currentView) {
      case 'fee_config':
        return (
          <div className="space-y-4">
            <ModuleHeader title="تكوين المصروفات" icon={Settings} onBack={() => setCurrentView('dashboard')} locked={isClosed} />
            <FeeConfiguration />
          </div>
        );
      case 'invoicing':
        return (
          <div className="space-y-4">
            <ModuleHeader title="استحقاق الرسوم" icon={ScrollText} onBack={() => setCurrentView('dashboard')} locked={isClosed} />
            <FeesAccrual />
          </div>
        );
      case 'coa':
        return (
          <div className="space-y-4">
            <ModuleHeader title="دليل الحسابات" icon={FolderTree} onBack={() => setCurrentView('dashboard')} locked={isClosed} />
            <ChartOfAccounts />
          </div>
        );
      case 'treasury':
        return (
          <div className="space-y-4">
            <ModuleHeader title="إدارة الخزينة" icon={ShieldCheck} onBack={() => setCurrentView('dashboard')} locked={isClosed} />
            <BankAccountsList />
          </div>
        );
      case 'suppliers':
        return (
          <div className="space-y-4">
            <ModuleHeader title="الموردون" icon={Truck} onBack={() => setCurrentView('dashboard')} locked={isClosed} />
            <SuppliersTab />
          </div>
        );
      case 'receipts':
        return (
          <div className="space-y-4">
            <ModuleHeader title="سندات القبض" icon={Banknote} onBack={() => setCurrentView('dashboard')} locked={isClosed} />
            <Receipts />
          </div>
        );
      case 'disbursements':
        return (
          <div className="space-y-4">
            <ModuleHeader title="سندات الصرف" icon={Wallet} onBack={() => setCurrentView('dashboard')} locked={isClosed} />
            <DisbursementVouchers />
          </div>
        );
      case 'cheques':
        return (
          <div className="space-y-4">
            <ModuleHeader title="الشيكات" icon={CreditCard} onBack={() => setCurrentView('dashboard')} locked={isClosed} />
            <Cheques />
          </div>
        );
      case 'student_financial_affairs':
        return (
          <div className="space-y-4">
            <ModuleHeader title="الشؤون المالية للطلاب" icon={Users} onBack={() => setCurrentView('dashboard')} locked={isClosed} />
            <StudentFinancialAffairs />
          </div>
        );
      case 'reports': 
        return (
          <div className="space-y-4">
            <ModuleHeader title="التقارير المالية" icon={BarChart3} onBack={() => setCurrentView('dashboard')} locked={isClosed} />
            <FinanceReportsTab store={store} />
          </div>
        );
      case 'financial_entries':
        return (
          <div className="space-y-4">
            <ModuleHeader title="القيود المالية" icon={ScrollText} onBack={() => setCurrentView('dashboard')} locked={isClosed} />
            <FinancialEntries />
          </div>
        );
      case 'year_close':
        return (
          <div className="space-y-4">
            <ModuleHeader title="إغلاق العام المالي" icon={ShieldCheck} onBack={() => setCurrentView('dashboard')} locked={isClosed} />
            <FinancialYearClose store={store} />
          </div>
        );
      default:
        return (
          <div>
            <div className="overflow-x-auto py-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 min-w-[900px]">
                {moduleCards.map((card) => {
                  const Icon = card.icon;
                  let iconColor = 'text-indigo-600 bg-indigo-100';
                  if (card.id === 'billing') iconColor = 'text-emerald-600 bg-emerald-100';
                  if (card.id === 'coa') iconColor = 'text-sky-600 bg-sky-100';
                  if (card.id === 'treasury') iconColor = 'text-teal-600 bg-teal-100';
                  if (card.id === 'receipts') iconColor = 'text-purple-600 bg-purple-100';
                  if (card.id === 'disbursements') iconColor = 'text-amber-600 bg-amber-100';
                  if (card.id === 'cheques') iconColor = 'text-violet-600 bg-violet-100';
                  if (card.id === 'reports') iconColor = 'text-slate-600 bg-slate-200';
                  return (
                    <button
                      key={card.id}
                      onClick={() => {
                        if (card.id === 'config') setCurrentView('fee_config');
                        else if (card.id === 'billing') setCurrentView('invoicing');
                        else setCurrentView(card.id as any);
                      }}
                      className="group relative flex flex-col items-center gap-3 rounded-3xl border border-transparent bg-white px-6 py-8 text-center shadow-lg transition duration-200 hover:border-indigo-200 hover:shadow-2xl hover:-translate-y-1 focus-visible:outline focus-visible:outline-indigo-500"
                    >
                      <span className={`flex h-16 w-16 items-center justify-center rounded-2xl ${iconColor}`}>
                        <Icon size={28} />
                      </span>
                      <h3 className="text-base font-black text-slate-900">{card.title}</h3>
                      <p className="text-xs text-slate-500">{card.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
    }
  };

  return <div className="space-y-8 p-2 md:p-4">{renderModule()}</div>;
};

export default FinanceView;
