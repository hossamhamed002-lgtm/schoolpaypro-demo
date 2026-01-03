import React, { useState } from 'react';
import { Cpu, Settings, ChevronLeft, School, Database, Trash2, Shield, HeartPulse, Clock, BellRing, ActivitySquare, KeyRound } from 'lucide-react';
import SchoolsManager from './SchoolsManager';
import BackupManager from './BackupManager';
import DataPurgeManager from './DataPurgeManager';
import SecuritySettingsPanel from './SecuritySettingsPanel';
import SystemHealth from '../DeveloperPanel/SystemHealth';
import AuditLog from '../../src/pages/developer/AuditLog';
import SecurityAlerts from '../DeveloperPanel/SecurityAlerts';
import SystemHealthDashboard from '../DeveloperPanel/SystemHealthDashboard';
import LicenseManager from './LicenseManager';

type ProgrammerSubScreen = 'hub' | 'schools' | 'backup' | 'purge' | 'security' | 'health' | 'audit' | 'alerts' | 'healthdash' | 'license';

const ProgrammerView: React.FC<{ store: any }> = ({ store }) => {
  const { t, lang, isProgrammer } = store;
  const isRtl = lang === 'ar';
  const [activeScreen, setActiveScreen] = useState<ProgrammerSubScreen>('hub');

  if (!isProgrammer) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-20 text-center flex flex-col items-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-[2rem] flex items-center justify-center mb-8">
          <Cpu size={48} />
        </div>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{isRtl ? 'هذه الشاشة مخصصة للمبرمج فقط' : 'Programmer console only'}</h3>
        <p className="text-slate-500 font-medium mt-2 max-w-sm mx-auto">
          {isRtl ? 'لا تملك الصلاحيات اللازمة للوصول إلى لوحة المبرمج.' : 'You do not have access permissions.'}
        </p>
      </div>
    );
  }

  const hubCards = [
    { id: 'schools', label: isRtl ? 'إدارة المدارس' : 'Schools Management', icon: School, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'backup', label: isRtl ? 'النسخ الاحتياطي' : 'Backup Management', icon: Database, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'purge', label: isRtl ? 'إدارة حذف البيانات' : 'Data Purge', icon: Trash2, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'security', label: isRtl ? 'أمان الدخول' : 'Security', icon: Shield, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'license', label: isRtl ? 'مدير التراخيص' : 'License Manager', icon: KeyRound, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'health', label: isRtl ? 'حالة النظام' : 'System Health', icon: HeartPulse, color: 'text-teal-600', bg: 'bg-teal-50' },
    { id: 'audit', label: isRtl ? 'سجل الأحداث' : 'Audit Log', icon: Clock, color: 'text-slate-600', bg: 'bg-slate-100' },
    { id: 'alerts', label: isRtl ? 'التنبيهات الأمنية' : 'Security Alerts', icon: BellRing, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'healthdash', label: isRtl ? 'لوحة صحة النظام' : 'System Health Dashboard', icon: ActivitySquare, color: 'text-emerald-600', bg: 'bg-emerald-50' }
  ];

  const renderContent = () => {
    switch (activeScreen) {
      case 'schools':
        return <SchoolsManager store={store} />;
      case 'backup':
        return <BackupManager store={store} />;
      case 'purge':
        return <DataPurgeManager />;
      case 'security':
        return <SecuritySettingsPanel />;
      case 'health':
        return <SystemHealth store={store} />;
      case 'audit':
        return <AuditLog />;
      case 'alerts':
        return <SecurityAlerts />;
      case 'healthdash':
        return <SystemHealthDashboard store={store} />;
      case 'license':
        return <LicenseManager />;
      case 'hub':
        return (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {hubCards.map((card) => (
              <button
                key={card.id}
                onClick={() => setActiveScreen(card.id as ProgrammerSubScreen)}
                className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center text-center relative overflow-hidden aspect-square px-6 py-8"
              >
                <div className={`w-16 h-16 ${card.bg} ${card.color} rounded-2xl flex items-center justify-center mb-5 shadow-sm`}>
                  <card.icon size={30} />
                </div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">
                  {card.label}
                </h3>
              </button>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5 text-start">
          {activeScreen !== 'hub' && (
            <button
              onClick={() => setActiveScreen('hub')}
              className="p-4 bg-white border border-slate-100 text-slate-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm group"
            >
              <ChevronLeft size={24} className={`${isRtl ? 'rotate-180' : ''} group-hover:-translate-x-1 transition-transform`} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20">
                <Settings size={24} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{isRtl ? 'لوحة المبرمج' : 'Programmer Console'}</h2>
            </div>
            <p className="text-slate-500 text-sm font-medium mt-1 ps-1 flex items-center gap-2">
              {isRtl ? 'الرئيسية' : 'Main'}
              <span className="text-slate-300">/</span>
              <span className="text-indigo-600 font-bold">
                {activeScreen === 'hub' ? (isRtl ? 'لوحة المبرمج' : 'Programmer Console') : hubCards.find(c => c.id === activeScreen)?.label}
              </span>
            </p>
          </div>
        </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default ProgrammerView;
