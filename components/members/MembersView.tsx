
import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Signature, 
  History, 
  FileBarChart, 
  UserPlus,
  ArrowRight,
  GitGraph,
  BadgeCheck
} from 'lucide-react';
import StaffListTab from './StaffListTab';
import AccessPermissionsTab from './AccessPermissionsTab';
import OrgChartTab from './OrgChartTab';
import ReportPermissionsTab from './ReportPermissionsTab';
import AuditLogTab from './AuditLogTab';
import MemberReportsTab from './MemberReportsTab';
import JobTitlesScreen from '../staff/JobTitlesScreen';

type MemberScreen = 'hub' | 'staff' | 'access' | 'org_chart' | 'reports_perm' | 'audit' | 'reports' | 'job_titles';

const MembersView: React.FC<{ store: any }> = ({ store }) => {
  const { t, lang } = store;
  const isRtl = lang === 'ar';
  const [activeScreen, setActiveScreen] = useState<MemberScreen>('hub');

  const currentSubScreen = useMemo(() => {
    switch (activeScreen) {
      case 'staff': 
        return <StaffListTab store={store} onBack={() => setActiveScreen('hub')} />;
      
      case 'access': 
        return <AccessPermissionsTab store={store} onBack={() => setActiveScreen('hub')} />;

      case 'org_chart':
        return <OrgChartTab store={store} onBack={() => setActiveScreen('hub')} />;

      case 'reports_perm': 
        return <ReportPermissionsTab store={store} onBack={() => setActiveScreen('hub')} />;

      case 'audit': 
        return <AuditLogTab store={store} onBack={() => setActiveScreen('hub')} />;

      case 'reports': 
        return <MemberReportsTab store={store} onBack={() => setActiveScreen('hub')} />;
      
      case 'job_titles':
        return <JobTitlesScreen store={store} onBack={() => setActiveScreen('hub')} />;

      default:
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-start">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t.members}</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">{t.membersDesc}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { id: 'staff', title: t.staffList, desc: t.staffListDesc, icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50' },
                { id: 'job_titles', title: isRtl ? 'الوظائف / المسميات الوظيفية' : 'Job Titles', desc: isRtl ? 'إدارة المسميات والهيكل الوظيفي' : 'Manage job titles and structure', icon: BadgeCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { id: 'org_chart', title: t.orgChart, desc: t.orgChartDesc, icon: GitGraph, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { id: 'access', title: t.accessPermissions, desc: t.accessPermissionsDesc, icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { id: 'reports_perm', title: t.reportPermissions, desc: t.reportPermissionsDesc, icon: Signature, color: 'text-purple-600', bg: 'bg-purple-50' },
                { id: 'audit', title: t.auditLog, desc: t.auditLogDesc, icon: History, color: 'text-amber-600', bg: 'bg-amber-50' },
                { id: 'reports', title: t.memberReports, desc: t.memberReportsDesc, icon: FileBarChart, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => setActiveScreen(mod.id as MemberScreen)}
                  className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-start relative overflow-hidden"
                >
                  <div className={`absolute -top-10 -right-10 w-32 h-32 ${mod.bg} rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-2xl`}></div>
                  <div className={`w-16 h-16 ${mod.bg} ${mod.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                    <mod.icon size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">{mod.title}</h3>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed opacity-80 mb-6">{mod.desc}</p>
                  <div className="flex items-center gap-2 text-xs font-black text-indigo-600 tracking-widest uppercase">
                    <span>{t.overview}</span>
                    <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
    }
  }, [activeScreen, store, t, isRtl]);

  return currentSubScreen;
};

export default MembersView;
