
import React from 'react';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Wallet, 
  BookOpen, 
  Users,
  Briefcase,
  Package,
  MessageCircle,
  ClipboardCheck,
  Wand2,
  LogOut
} from 'lucide-react';

// خريطة للأيقونات المتاحة
const IconMap: Record<string, any> = {
  LayoutDashboard,
  GraduationCap,
  Wallet,
  BookOpen,
  Users,
  Briefcase,
  Package,
  MessageCircle,
  ClipboardCheck,
  Wand2
};

// يجب أن يتطابق مع النوع في App.tsx
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

interface SidebarProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  t: any;
  modules: Array<{ id: string; icon: string; labelKey: string; descKey: string }>;
  onLogout: () => void;
  user?: {
    Username?: string;
    User_Name?: string;
    Full_Name?: string;
    Name?: string;
    Email?: string;
    email?: string;
  };
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, t, modules, onLogout, user }) => {
  const displayName =
    user?.Full_Name ||
    user?.User_Name ||
    user?.Name ||
    user?.Username ||
    'المستخدم الحالي';
  const displayEmail = user?.Email || user?.email || user?.Username || '—';
  const avatarSeed = encodeURIComponent(displayName || 'user');

  return (
    <aside className="w-72 bg-slate-900 text-white flex flex-col h-full shadow-2xl z-20 flex-shrink-0">
      <div className="p-6 border-b border-slate-800 flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-600/30">
          S
        </div>
        <div className="text-start">
          <h1 className="font-bold text-xl leading-tight tracking-tight">SchoolPay Pro</h1>
          <p className="text-[10px] text-indigo-200 font-black tracking-wide">إدارة ذكية… تعليم بلا فوضى</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {modules.map((module) => {
          const Icon = IconMap[module.icon] || Package;
          return (
            <button
              key={module.id}
              onClick={() => setActiveTab(module.id as TabId)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                activeTab === module.id 
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 translate-x-1' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <Icon size={22} className={`${activeTab === module.id ? 'text-white' : 'text-slate-500 group-hover:text-white'} transition-colors`} />
              <div className="text-start">
                <span className="block text-sm font-bold">{t[module.labelKey]}</span>
                <span className="block text-[10px] opacity-60 uppercase tracking-tighter">{t[module.descKey]}</span>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-slate-600">
             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`} alt="Avatar" />
          </div>
          <div className="flex-1 min-w-0 text-start">
            <p className="text-sm font-bold truncate">{displayName}</p>
            <p className="text-[10px] text-slate-500 truncate">{displayEmail}</p>
          </div>
        </div>
        <button
          onClick={() => {
            const ok = window.confirm('هل تريد تسجيل الخروج؟');
            if (ok) onLogout();
          }}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-2.5 text-sm font-black text-slate-200 hover:bg-rose-600 hover:border-rose-600 transition-colors"
        >
          <LogOut size={16} /> تسجيل خروج
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
