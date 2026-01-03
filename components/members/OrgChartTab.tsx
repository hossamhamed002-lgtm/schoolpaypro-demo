
import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, GitGraph, Shield, Building2, UserCircle2, 
  Briefcase, GraduationCap, Wallet, Plus, Trash2, Edit3, X 
} from 'lucide-react';
import { JobTitle, UserRole } from '../../types';

interface OrgChartTabProps {
  store: any;
  onBack: () => void;
}

const OrgChartTab: React.FC<OrgChartTabProps> = ({ store, onBack }) => {
  const { t, lang, jobTitles, addJobTitle, updateJobTitle, deleteJobTitle, checkIntegrity } = store;
  const isRtl = lang === 'ar';

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Partial<JobTitle> | null>(null);

  const defaultOrgChart: JobTitle[] = [
    {
      Job_ID: 'ORG-ROOT-CHAIRMAN',
      Title_Ar: 'رئيس مجلس الإدارة',
      Title_En: 'Chairman',
      Parent_Job_ID: null,
      Default_Role: UserRole.ADMIN,
      Department: 'Executive'
    },
    {
      Job_ID: 'ORG-ROOT-PRINCIPAL',
      Title_Ar: 'مدير المدرسة',
      Title_En: 'School Principal',
      Parent_Job_ID: 'ORG-ROOT-CHAIRMAN',
      Default_Role: UserRole.ADMIN,
      Department: 'Executive'
    },
    {
      Job_ID: 'ORG-ACADEMIC-HEAD',
      Title_Ar: 'نائب المدير للشؤون الأكاديمية',
      Title_En: 'Academic Vice Principal',
      Parent_Job_ID: 'ORG-ROOT-PRINCIPAL',
      Default_Role: UserRole.TEACHER,
      Department: 'Academic'
    },
    {
      Job_ID: 'ORG-ACADEMIC-SUPERVISOR',
      Title_Ar: 'مشرف المواد',
      Title_En: 'Academic Supervisor',
      Parent_Job_ID: 'ORG-ACADEMIC-HEAD',
      Default_Role: UserRole.TEACHER,
      Department: 'Academic'
    },
    {
      Job_ID: 'ORG-ACADEMIC-TEACHER',
      Title_Ar: 'معلم',
      Title_En: 'Teacher',
      Parent_Job_ID: 'ORG-ACADEMIC-SUPERVISOR',
      Default_Role: UserRole.TEACHER,
      Department: 'Academic'
    },
    {
      Job_ID: 'ORG-FINANCE-HEAD',
      Title_Ar: 'مدير الشؤون المالية',
      Title_En: 'Finance Manager',
      Parent_Job_ID: 'ORG-ROOT-PRINCIPAL',
      Default_Role: UserRole.ACCOUNTANT,
      Department: 'Finance'
    },
    {
      Job_ID: 'ORG-FINANCE-ACCOUNTANT',
      Title_Ar: 'محاسب',
      Title_En: 'Accountant',
      Parent_Job_ID: 'ORG-FINANCE-HEAD',
      Default_Role: UserRole.ACCOUNTANT,
      Department: 'Finance'
    },
    {
      Job_ID: 'ORG-HR-HEAD',
      Title_Ar: 'مدير شؤون العاملين',
      Title_En: 'HR Manager',
      Parent_Job_ID: 'ORG-ROOT-PRINCIPAL',
      Default_Role: UserRole.HR_MANAGER,
      Department: 'HR'
    },
    {
      Job_ID: 'ORG-HR-OFFICER',
      Title_Ar: 'مسؤول شؤون العاملين',
      Title_En: 'HR Officer',
      Parent_Job_ID: 'ORG-HR-HEAD',
      Default_Role: UserRole.HR_MANAGER,
      Department: 'HR'
    },
    {
      Job_ID: 'ORG-ADMIN-HEAD',
      Title_Ar: 'مدير الشؤون الإدارية',
      Title_En: 'Operations Manager',
      Parent_Job_ID: 'ORG-ROOT-PRINCIPAL',
      Default_Role: UserRole.WORKER,
      Department: 'Executive'
    },
    {
      Job_ID: 'ORG-ADMIN-RECEPTION',
      Title_Ar: 'الاستقبال',
      Title_En: 'Reception',
      Parent_Job_ID: 'ORG-ADMIN-HEAD',
      Default_Role: UserRole.WORKER,
      Department: 'Executive'
    },
    {
      Job_ID: 'ORG-ADMIN-SECURITY',
      Title_Ar: 'الأمن',
      Title_En: 'Security',
      Parent_Job_ID: 'ORG-ADMIN-HEAD',
      Default_Role: UserRole.WORKER,
      Department: 'Executive'
    },
    {
      Job_ID: 'ORG-ADMIN-BUS',
      Title_Ar: 'مشرف النقل',
      Title_En: 'Transport Supervisor',
      Parent_Job_ID: 'ORG-ADMIN-HEAD',
      Default_Role: UserRole.WORKER,
      Department: 'Executive'
    }
  ];

  const hasCustomTitles = jobTitles.some((item) => (item.Title_Ar || item.Title_En));
  const isLegacySeedOnly = jobTitles.length === 2
    && jobTitles.some((item) => item.Job_ID === 'JOB-DIR')
    && jobTitles.some((item) => item.Job_ID === 'JOB-ACC');
  const isSeededView = jobTitles.length === 0 || !hasCustomTitles || isLegacySeedOnly;

  // بناء هيكل شجري من مصفوفة مسطحة
  const buildTree = (items: JobTitle[], parentId: string | null = null): any[] => {
    return items
      .filter(item => item.Parent_Job_ID === parentId)
      .map(item => ({
        ...item,
        children: buildTree(items, item.Job_ID)
      }));
  };

  const hierarchy = useMemo(() => {
    const source = isSeededView ? defaultOrgChart : jobTitles;
    return buildTree(source);
  }, [isSeededView, jobTitles]);

  const handleSaveJob = () => {
    if (!editingJob?.Title_Ar) return;
    if (editingJob.Job_ID) {
      updateJobTitle(editingJob.Job_ID, editingJob);
    } else {
      addJobTitle(editingJob);
    }
    setIsEditModalOpen(false);
    setEditingJob(null);
  };

  const getIcon = (dept: string) => {
    switch (dept) {
      case 'Executive': return Building2;
      case 'Academic': return GraduationCap;
      case 'Finance': return Wallet;
      case 'HR': return Briefcase;
      default: return UserCircle2;
    }
  };

  const getColor = (dept: string) => {
    switch (dept) {
      case 'Executive': return 'bg-slate-900';
      case 'Academic': return 'bg-indigo-600';
      case 'Finance': return 'bg-emerald-600';
      case 'HR': return 'bg-blue-600';
      default: return 'bg-slate-400';
    }
  };

  const Node = ({ item, level = 0 }: { item: any, level?: number }) => {
    const Icon = getIcon(item.Department);
    const color = getColor(item.Department);
    const canEdit = jobTitles.some((job: JobTitle) => job.Job_ID === item.Job_ID);
    const canDelete = canEdit && !checkIntegrity.isJobUsed(item.Job_ID);
    
    return (
      <div className="flex flex-col items-center">
        {level > 0 && <div className="h-8 w-px bg-slate-200"></div>}
        
        <div className="relative group w-40 sm:w-44 md:w-48 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className={`w-10 h-10 ${color} text-white rounded-xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
             <Icon size={20} />
          </div>
          <h4 className="text-sm font-black text-slate-800 leading-tight">{isRtl ? item.Title_Ar : item.Title_En}</h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{item.Department}</p>
          
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
             <button
               onClick={() => {
                 if (!canEdit) return;
                 setEditingJob(item);
                 setIsEditModalOpen(true);
               }}
               disabled={!canEdit}
               className={`p-1.5 bg-slate-50 rounded-lg ${canEdit ? 'text-slate-400 hover:text-indigo-600' : 'text-slate-300 cursor-not-allowed'}`}
             >
                <Edit3 size={12} />
             </button>
             <button
               onClick={() => {
                 if (!canDelete) return;
                 deleteJobTitle(item.Job_ID);
               }}
               disabled={!canDelete}
               className={`p-1.5 bg-slate-50 rounded-lg ${canDelete ? 'text-slate-400 hover:text-red-500' : 'text-slate-300 cursor-not-allowed'}`}
             >
                <Trash2 size={12} />
             </button>
          </div>
          
          {item.children.length > 0 && (
             <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
             </div>
          )}
        </div>

        {item.children.length > 0 && (
          <div className="flex flex-col items-center">
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex flex-wrap justify-center gap-6 md:gap-8 relative">
              {item.children.length > 1 && (
                 <div className="absolute top-0 left-0 right-0 h-px bg-slate-200 mx-auto" style={{ width: `calc(100% - ${192}px)` }}></div>
              )}
              {item.children.map((child: any) => (
                <Node key={child.Job_ID} item={child} level={level + 1} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-start">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all">
            <ChevronLeft size={20} className={isRtl ? 'rotate-180' : ''} />
          </button>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{t.orgChart}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.orgChartDesc}</p>
          </div>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => { setEditingJob({ Title_Ar: '', Title_En: '', Parent_Job_ID: null, Department: 'Academic', Default_Role: UserRole.TEACHER }); setIsEditModalOpen(true); }}
             className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black shadow-lg shadow-slate-900/10 flex items-center gap-2"
           >
             <Plus size={16} />
             {isRtl ? 'إضافة مسمى' : 'Add Title'}
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-20 overflow-auto custom-scrollbar min-h-[600px] flex justify-center">
        <div className="inline-block">
           {hierarchy.length > 0 ? (
             hierarchy.map(root => <Node key={root.Job_ID} item={root} />)
           ) : (
             <div className="text-center p-20 opacity-20 italic">لا توجد بيانات</div>
           )}
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4 text-start">
           <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl p-8 animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900">{isRtl ? 'تعديل مسمى وظيفي' : 'Edit Job Title'}</h3>
                <button onClick={() => setIsEditModalOpen(false)}><X className="text-slate-400" /></button>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">الاسم بالعربية</label>
                      <input type="text" value={editingJob?.Title_Ar} onChange={e => setEditingJob({...editingJob!, Title_Ar: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">Name (English)</label>
                      <input type="text" value={editingJob?.Title_En} onChange={e => setEditingJob({...editingJob!, Title_En: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold" />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{t.reportsTo}</label>
                   <select value={editingJob?.Parent_Job_ID || ''} onChange={e => setEditingJob({...editingJob!, Parent_Job_ID: e.target.value || null})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold">
                      <option value="">{isRtl ? '-- رئيس مجلس الإدارة --' : '-- Top Level --'}</option>
                      {(isSeededView ? defaultOrgChart : jobTitles).filter(j => j.Job_ID !== editingJob?.Job_ID).map(j => (
                        <option key={j.Job_ID} value={j.Job_ID}>{isRtl ? j.Title_Ar : j.Title_En}</option>
                      ))}
                   </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{t.department}</label>
                     <select value={editingJob?.Department} onChange={e => setEditingJob({...editingJob!, Department: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold">
                        <option value="Executive">Executive</option>
                        <option value="Academic">Academic</option>
                        <option value="Finance">Finance</option>
                        <option value="HR">HR</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{t.userRole}</label>
                     <select value={editingJob?.Default_Role} onChange={e => setEditingJob({...editingJob!, Default_Role: e.target.value as UserRole})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold">
                        {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                     </select>
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-400 font-black rounded-xl">{t.cancel}</button>
                  <button onClick={handleSaveJob} className="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg">{t.save}</button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default OrgChartTab;
