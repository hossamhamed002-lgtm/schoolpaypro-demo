
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, GraduationCap, Settings, FileText, FileSpreadsheet, LockKeyhole, Building2, DatabaseBackup, X, Repeat, BarChart3, Code2, LogOut, UserCog, CalendarClock, Pin, PinOff, StickyNote, PlusCircle, UserCheck, FileStack } from 'lucide-react';
import { Tab, User, PERMISSIONS, ROLE_LABELS } from '../examControl.types';
import { db } from '../services/db';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  isOpen: boolean; 
  onClose: () => void;
  currentUser: User;
  onLogout: () => void;
  currentYear: string;
  onYearChange: (year: string) => void;
  isPinned: boolean;
  onTogglePin: () => void;
  showYearPicker?: boolean;
  showLogout?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    activeTab, setActiveTab, isOpen, onClose, currentUser, onLogout, currentYear, onYearChange,
    isPinned, onTogglePin, showYearPicker = true, showLogout = true
}) => {
  const schoolInfo = db.getSchoolInfo();
  const [isHovered, setIsHovered] = useState(false);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [isAddYearModalOpen, setIsAddYearModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');

  const isExpanded = isPinned || isHovered;

  useEffect(() => {
      if (!showYearPicker) return;
      setAcademicYears(db.getAcademicYears());
  }, [showYearPicker]);

  const handleConfirmAddYear = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!newYearInput) { setIsAddYearModalOpen(false); return; }
      const regex = /^(\d{4})\s*[-–]\s*(\d{4})$/;
      const match = newYearInput.trim().match(regex);
      if (match) {
          const formatted = `${match[1]} - ${match[2]}`;
          if (academicYears.includes(formatted)) { onYearChange(formatted); setIsAddYearModalOpen(false); return; }
          const updated = db.addAcademicYear(formatted);
          setAcademicYears(updated);
          onYearChange(formatted);
          setIsAddYearModalOpen(false);
      }
  };

  const menuItems = [
    { id: Tab.DASHBOARD, label: 'الرئيسية', icon: LayoutDashboard },
    { id: Tab.SCHOOL_DATA, label: 'بيانات المدرسة', icon: Building2 },
    { id: Tab.STUDENTS, label: 'إدارة الطلاب', icon: Users },
    { id: Tab.SETTINGS, label: 'المواد والدرجات', icon: Settings },
    { id: Tab.CONTROL, label: 'الكنترول وأرقام الجلوس', icon: LockKeyhole },
    { id: Tab.OBSERVERS, label: 'الملاحظين والتصحيح', icon: UserCheck },
    { id: Tab.GRADING, label: 'رصد الدرجات', icon: GraduationCap },
    { id: Tab.SHEETS, label: 'الشيت', icon: FileSpreadsheet },
    { id: Tab.REPORTS, label: 'الشهادات والتقدير', icon: FileText },
    { id: Tab.STATISTICS, label: 'الإحصاءات', icon: BarChart3 },
    { id: Tab.OFFICIAL_PAPERS, label: 'ورقيات ومطبوعات', icon: FileStack },
    { id: Tab.SECOND_ROLE, label: 'الدور الثاني', icon: Repeat },
    { id: Tab.NOTES, label: 'الملاحظات', icon: StickyNote },
    { id: Tab.BACKUP, label: 'النسخ الاحتياطي', icon: DatabaseBackup },
    { id: Tab.USERS, label: 'المستخدمين', icon: UserCog },
  ];

  const allowedTabs = PERMISSIONS[currentUser.role] || [];
  const visibleItems = menuItems.filter(item => allowedTabs.includes(item.id) || (currentUser.role === 'admin' && item.id === Tab.USERS));

  return (
    <>
        {isOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={onClose} />}
        <aside className={`fixed right-0 top-0 h-full bg-slate-900 text-white shadow-2xl z-40 transition-all duration-300 ease-in-out flex flex-col overflow-hidden ${isOpen ? 'translate-x-0 w-64' : 'translate-x-full md:translate-x-0'} md:w-${isExpanded ? '64' : '20'}`} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        <div className={`p-4 flex items-center justify-between border-b border-slate-700 h-20 transition-all ${isExpanded ? 'px-6' : 'px-2 justify-center'}`}>
            <div className="flex items-center gap-3 overflow-hidden">
                <div className={`w-10 h-10 bg-white rounded-full p-1 flex-shrink-0 flex items-center justify-center transition-all ${isExpanded ? '' : 'mx-auto'}`}>
                    {schoolInfo.logo ? <img src={schoolInfo.logo} alt="Logo" className="w-full h-full object-contain" /> : <img src="./eagle-icon.svg" alt="Eagle" className="w-full h-full object-contain" />}
                </div>
                <div className={`transition-opacity duration-200 ${isExpanded ? 'opacity-100 min-w-[120px]' : 'opacity-0 hidden'}`}>
                    <h1 className="font-bold text-sm leading-tight truncate">{schoolInfo.schoolName || '  school pay pro'}</h1>
                    <p className="text-[10px] text-slate-400">الإصدار المجاني 2.1</p>
                </div>
            </div>
            {isExpanded && <button onClick={onTogglePin} className="hidden md:flex text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition">{isPinned ? <Pin size={18} className="fill-current" /> : <PinOff size={18} />}</button>}
        </div>

        {isExpanded && showYearPicker && (
            <div className="px-4 pt-4 pb-2 relative">
                <div className="flex justify-between items-center mb-1 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><CalendarClock size={10} /> السنة الدراسية</span>
                    <button onClick={() => setIsAddYearModalOpen(true)} className="text-emerald-400 hover:text-emerald-200 transition bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-800">
                        <PlusCircle size={10} /> <span className="text-[9px]">جديد</span>
                    </button>
                </div>
                <select value={currentYear} onChange={(e) => onYearChange(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg p-2 outline-none">
                    {academicYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
                {isAddYearModalOpen && (
                    <div className="absolute top-0 left-0 w-full h-full bg-slate-900/95 z-50 flex flex-col items-center justify-center p-4 rounded-lg border border-slate-700">
                        <form onSubmit={handleConfirmAddYear} className="w-full space-y-2">
                            <input type="text" value={newYearInput} onChange={(e) => setNewYearInput(e.target.value)} placeholder="2025 - 2026" className="w-full bg-slate-800 text-white text-sm rounded p-2 text-center" autoFocus />
                            <div className="flex gap-2 w-full"><button type="submit" className="flex-1 bg-blue-600 py-1 rounded text-xs font-bold">حفظ</button><button type="button" onClick={() => setIsAddYearModalOpen(false)} className="flex-1 bg-slate-700 py-1 rounded text-xs">إلغاء</button></div>
                        </form>
                    </div>
                )}
            </div>
        )}
        
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto custom-scrollbar">
            {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
                <button key={item.id} onClick={() => { setActiveTab(item.id); onClose(); }} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-300 hover:bg-slate-800 hover:text-white'} ${isExpanded ? '' : 'justify-center'}`} title={!isExpanded ? item.label : ''}>
                <Icon size={22} className="flex-shrink-0" />
                {isExpanded && <span className="font-medium truncate">{item.label}</span>}
                </button>
            );
            })}
        </nav>

        <div className="p-4 border-t border-slate-700 bg-slate-900">
            {showLogout && (
              <button onClick={onLogout} className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:bg-red-900/20 hover:text-red-300 transition mb-4 ${isExpanded ? '' : 'justify-center'}`} title={!isExpanded ? 'خروج' : ''}>
                  <LogOut size={20} className="flex-shrink-0" /> {isExpanded && <span className="truncate">خروج</span>}
              </button>
            )}
            {isExpanded && <div className="bg-slate-800 rounded-lg p-4"><div className="mb-3 border-b border-slate-700 pb-3"><p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Code2 size={12}/> تصميم وتطوير</p><p className="text-sm font-bold text-white">محمود بسيونى</p></div><p className="text-xs font-mono text-slate-300 uppercase">Free Version</p></div>}
        </div>
        </aside>
    </>
  );
};

export default Sidebar;
