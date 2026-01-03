
import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  X, 
  Shield, 
  Key, 
  Lock, 
  Unlock, 
  LayoutDashboard, 
  BookOpen, 
  Wallet, 
  GraduationCap, 
  MessageCircle,
  ClipboardCheck,
  Users, 
  Briefcase,
  ChevronLeft,
  UserCircle2,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AppUser, UserRole } from '../../types';

interface AccessPermissionsTabProps {
  store: any;
  onBack: () => void;
}

const AccessPermissionsTab: React.FC<AccessPermissionsTabProps> = ({ store, onBack }) => {
  const { t, lang, users, employees, updateUserPermissions } = store;
  const isRtl = lang === 'ar';
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(users[0]?.User_ID || null);
  const [searchTerm, setSearchTerm] = useState('');

  // جلب بيانات المستخدم المختار
  const selectedUser = useMemo(() => 
    users.find((u: AppUser) => u.User_ID === selectedUserId)
  , [users, selectedUserId]);

  const availableModules = [
    { id: 'dashboard', icon: LayoutDashboard, label: t.moduleDashboard },
    { id: 'academic', icon: BookOpen, label: t.moduleAcademic },
    { id: 'finance', icon: Wallet, label: t.moduleFinance },
    { id: 'students', icon: GraduationCap, label: t.moduleStudents },
    { id: 'examControl', icon: ClipboardCheck, label: t.moduleExamControl },
    { id: 'communications', icon: MessageCircle, label: t.moduleCommunications },
    { id: 'members', icon: UserCircle2, label: t.moduleMembers },
    { id: 'staff', icon: Briefcase, label: t.moduleHR }
  ];

  // تصفية المستخدمين بناءً على البحث
  const filteredUsers = useMemo(() => {
    return users.filter((u: AppUser) => {
      const emp = employees.find((e: any) => e.Emp_ID === u.Emp_ID);
      return (
        u.Username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp?.Name_Ar.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp?.Name_En.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [users, employees, searchTerm]);

  const handleTogglePermission = (moduleId: string) => {
    if (!selectedUser) return;
    const current = selectedUser.Permissions || [];
    const updated = current.includes(moduleId) 
      ? current.filter(id => id !== moduleId) 
      : [...current, moduleId];
    
    updateUserPermissions(selectedUser.User_ID, { Permissions: updated });
  };

  const handleUpdateField = (field: string, value: any) => {
    if (!selectedUser) return;
    updateUserPermissions(selectedUser.User_ID, { [field]: value });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-start">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm">
            <ChevronLeft size={20} className={isRtl ? 'rotate-180' : ''} />
          </button>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{t.accessPermissions}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {users.length} {isRtl ? 'حساب نظام متاح' : 'system accounts available'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 items-center gap-2">
            <ShieldCheck size={14} />
            {isRtl ? 'إدارة أمنية مركزية' : 'Centralized Security'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-280px)] min-h-[600px]">
        
        {/* Sidebar: User Selection List */}
        <div className="lg:col-span-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
           <div className="p-6 border-b border-slate-50 space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{isRtl ? 'قائمة المستخدمين' : 'Active Users'}</h4>
              <div className="relative">
                <Search className={`absolute inset-y-0 ${isRtl ? 'right-4' : 'left-4'} my-auto text-slate-300`} size={16} />
                <input 
                  type="text" 
                  placeholder={isRtl ? 'بحث باسم المستخدم...' : 'Search users...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full ${isRtl ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all`}
                />
              </div>
           </div>
           
           <div className="flex-1 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
             {filteredUsers.length === 0 ? (
               <div className="p-12 text-center flex flex-col items-center opacity-30 italic">
                  <AlertCircle size={32} className="mb-2" />
                  <p className="text-xs font-bold">{isRtl ? 'لا توجد نتائج' : 'No results found'}</p>
               </div>
             ) : (
               filteredUsers.map((user: AppUser) => {
                 const emp = employees.find((e: any) => e.Emp_ID === user.Emp_ID);
                 const isSelected = selectedUserId === user.User_ID;
                 return (
                   <button 
                      key={user.User_ID}
                      onClick={() => setSelectedUserId(user.User_ID)}
                      className={`w-full flex items-center gap-4 p-5 text-start transition-all ${isSelected ? 'bg-indigo-50/50 border-r-4 border-indigo-600' : 'hover:bg-slate-50'}`}
                   >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-sm ${isSelected ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-100 text-slate-300'}`}>
                        {emp?.Name_Ar?.charAt(0) || user.Username.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-black truncate ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>{emp?.Name_Ar || user.Username}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">@{user.Username}</span>
                           <div className={`w-1 h-1 rounded-full ${user.Is_Active ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                        </div>
                      </div>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 shadow-glow"></div>}
                   </button>
                 );
               })
             )}
           </div>
        </div>

        {/* Permission Editor Area */}
        <div className="lg:col-span-2 h-full">
          {selectedUser ? (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 h-full flex flex-col animate-in slide-in-from-bottom-4 duration-500">
               
               {/* User Profile Header */}
               <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10 shrink-0">
                  <div className="flex items-center gap-5 text-start">
                    <div className="relative group">
                      <div className="w-20 h-20 bg-slate-100 text-slate-300 rounded-[2rem] flex items-center justify-center shadow-xl ring-4 ring-white overflow-hidden">
                         <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.Emp_ID}`} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 p-2 bg-indigo-600 text-white rounded-xl shadow-lg border-2 border-white">
                         <Shield size={14} />
                      </div>
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                         {employees.find((e: any) => e.Emp_ID === selectedUser.Emp_ID)?.Name_Ar || selectedUser.Username}
                       </h3>
                       <div className="flex items-center gap-4 mt-1.5">
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100 flex items-center gap-1.5">
                             <UserCircle2 size={12} />
                             {selectedUser.Role}
                          </span>
                          <span className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${selectedUser.Is_Active ? 'text-emerald-500' : 'text-rose-500'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${selectedUser.Is_Active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-rose-500'}`}></div>
                            {selectedUser.Is_Active ? t.activeUser : t.suspendedUser}
                          </span>
                       </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                     <button 
                        onClick={() => handleUpdateField('Is_Active', !selectedUser.Is_Active)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${selectedUser.Is_Active ? 'bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white'}`}
                     >
                       {selectedUser.Is_Active ? <Lock size={16} /> : <Unlock size={16} />}
                       {selectedUser.Is_Active ? (isRtl ? 'تعطيل الحساب' : 'Suspend Account') : (isRtl ? 'تفعيل الحساب' : 'Activate Account')}
                     </button>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-12">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Security Info Form */}
                    <div className="space-y-8">
                      <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                        <Key size={18} className="text-indigo-400" />
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{isRtl ? 'بيانات الأمان والدخول' : 'Access Credentials'}</h5>
                      </div>
                      
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ps-1">{t.username}</label>
                            <div className="relative group">
                               <div className="absolute inset-y-0 left-5 my-auto flex items-center text-slate-300 font-black">@</div>
                               <input 
                                  type="text" 
                                  value={selectedUser.Username}
                                  onChange={e => handleUpdateField('Username', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-200 transition-all shadow-inner"
                               />
                            </div>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ps-1">{t.password}</label>
                            <div className="relative group">
                               <Key size={18} className="absolute inset-y-0 left-5 my-auto text-slate-300" />
                               <input 
                                  type="text" 
                                  value={selectedUser.Password_Hash}
                                  onChange={e => handleUpdateField('Password_Hash', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-6 py-4 font-mono font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-200 transition-all shadow-inner"
                               />
                            </div>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ps-1">{t.userRole}</label>
                            <div className="relative">
                               <select 
                                  value={selectedUser.Role}
                                  onChange={e => handleUpdateField('Role', e.target.value as UserRole)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-black text-sm outline-none appearance-none cursor-pointer focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                               >
                                  {Object.values(UserRole).map(role => (
                                    <option key={role} value={role}>{role}</option>
                                  ))}
                               </select>
                               <div className="absolute inset-y-0 right-5 my-auto flex items-center pointer-events-none text-slate-400">
                                  <Shield size={16} />
                               </div>
                            </div>
                         </div>
                      </div>
                    </div>

                    {/* Permissions Matrix */}
                    <div className="space-y-8">
                      <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                        <CheckCircle2 size={18} className="text-emerald-400" />
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{isRtl ? 'مصفوفة الوصول للأقسام' : 'Module Authorization Matrix'}</h5>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                         {availableModules.map(module => {
                           const hasAccess = selectedUser.Permissions?.includes(module.id);
                           return (
                             <button 
                               key={module.id}
                               onClick={() => handleTogglePermission(module.id)}
                               className={`flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 group/module ${hasAccess ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300 hover:bg-white'}`}
                             >
                               <div className="flex items-center gap-4">
                                  <div className={`p-2.5 rounded-xl transition-all ${hasAccess ? 'bg-white/20' : 'bg-slate-200/50 group-hover/module:bg-indigo-50 group-hover/module:text-indigo-600'}`}>
                                    <module.icon size={20} />
                                  </div>
                                  <span className="text-sm font-black tracking-tight">{module.label}</span>
                               </div>
                               <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${hasAccess ? 'bg-white border-white' : 'bg-transparent border-slate-200'}`}>
                                  {hasAccess ? (
                                    <CheckCircle2 size={16} className="text-indigo-600" />
                                  ) : (
                                    <div className="w-2 h-2 rounded-full bg-slate-100 group-hover/module:bg-slate-200"></div>
                                  )}
                               </div>
                             </button>
                           );
                         })}
                      </div>
                    </div>
                 </div>
               </div>

               {/* Footer Info */}
               <div className="mt-8 pt-6 border-t border-slate-50 flex items-center gap-3 text-slate-400 bg-slate-50/30 p-4 rounded-2xl shrink-0">
                  <ShieldCheck size={16} className="text-indigo-400" />
                  <p className="text-[10px] font-bold italic">
                    {isRtl ? 'ملاحظة: الصلاحيات الممنوحة تطبق فورياً عند قيام المستخدم بتسجيل الدخول مرة أخرى أو تحديث الصفحة.' : 'Note: Granted permissions apply immediately upon the next user login or page refresh.'}
                  </p>
               </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 p-20 text-center opacity-40 italic">
               <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                 <Shield size={64} className="text-slate-200" />
               </div>
               <p className="text-xl font-black text-slate-400 tracking-tight">{isRtl ? 'اختر مستخدماً من القائمة لإدارة صلاحياته الأمنية' : 'Select an authorized user to manage their security profile'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccessPermissionsTab;
