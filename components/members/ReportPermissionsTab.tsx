
import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, FileBarChart, Signature, ShieldCheck, Users, 
  Lock, Unlock, Printer, FileCheck2, Stamp, ArrowDown, 
  Plus, Trash2, AlignRight, AlignCenter, AlignLeft, Eye, Save,
  Info, Package, LayoutDashboard, BookOpen, Wallet, Briefcase, GraduationCap,
  FileText, CheckCircle2, AlertCircle, ClipboardCheck
} from 'lucide-react';
import { ReportConfig, SignatureStep, ReportDefinition, UserRole } from '../../types';
import { SYSTEM_MODULES } from '../../store';

interface ReportPermissionsTabProps {
  store: any;
  onBack: () => void;
}

const IconMap: Record<string, any> = {
  LayoutDashboard,
  GraduationCap,
  Wallet,
  BookOpen,
  Users,
  Briefcase,
  Package,
  FileBarChart,
  ClipboardCheck
};

const ReportPermissionsTab: React.FC<ReportPermissionsTabProps> = ({ store, onBack }) => {
  const { t, lang, reportConfigs, jobTitles, updateReportConfig } = store;
  const isRtl = lang === 'ar';
  
  const [activeTab, setActiveTab] = useState<'reports' | 'signatures'>('signatures');
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    reportConfigs[0]?.Category_ID || 'finance'
  );

  const selectedConfig = useMemo(() => 
    reportConfigs.find((c: ReportConfig) => c.Category_ID === selectedCategoryId)
  , [reportConfigs, selectedCategoryId]);

  const handleUpdateSignature = (stepId: string, data: Partial<SignatureStep>) => {
    if (!selectedConfig) return;
    const newChain = selectedConfig.Signature_Chain.map(s => 
      s.Step_ID === stepId ? { ...s, ...data } : s
    );
    updateReportConfig(selectedCategoryId, { Signature_Chain: newChain });
  };

  const handleAddSignature = () => {
    if (!selectedConfig) return;
    const newStep: SignatureStep = {
      Step_ID: `STP-${Date.now()}`,
      Job_ID: jobTitles[0]?.Job_ID || '',
      Display_Title_Ar: 'مسمى جديد',
      Display_Title_En: 'New Title',
      Alignment: 'center',
      Is_Stamp_Required: false
    };
    updateReportConfig(selectedCategoryId, { 
      Signature_Chain: [...selectedConfig.Signature_Chain, newStep] 
    });
  };

  const handleRemoveSignature = (stepId: string) => {
    if (!selectedConfig) return;
    const newChain = selectedConfig.Signature_Chain.filter(s => s.Step_ID !== stepId);
    updateReportConfig(selectedCategoryId, { Signature_Chain: newChain });
  };

  const handleToggleReportRole = (reportId: string, role: UserRole) => {
    if (!selectedConfig) return;
    const newReports = selectedConfig.Available_Reports.map(rep => {
      if (rep.Report_ID === reportId) {
        const roles = rep.Allowed_Roles.includes(role)
          ? rep.Allowed_Roles.filter(r => r !== role)
          : [...rep.Allowed_Roles, role];
        return { ...rep, Allowed_Roles: roles };
      }
      return rep;
    });
    updateReportConfig(selectedCategoryId, { Available_Reports: newReports });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-start">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-purple-50 hover:text-purple-600 transition-all">
            <ChevronLeft size={20} className={isRtl ? 'rotate-180' : ''} />
          </button>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{t.reportPermissions}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.reportPermissionsDesc}</p>
          </div>
        </div>
        
        <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'reports' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ShieldCheck size={16} />
            {t.tabReportAccess}
          </button>
          <button 
            onClick={() => setActiveTab('signatures')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'signatures' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Signature size={16} />
            {t.tabSignatureMgt}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[700px] overflow-hidden flex flex-col lg:flex-row">
        {/* Sidebar Categories */}
        <div className="lg:w-80 bg-slate-50/50 border-e border-slate-100 p-8 space-y-6">
           <div className="text-start">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ps-2">{t.reportCategory}</h4>
              <div className="space-y-2">
                 {reportConfigs.map((cfg: ReportConfig) => {
                   const systemModule = SYSTEM_MODULES.find(m => m.id === cfg.Category_ID);
                   const Icon = IconMap[systemModule?.icon || 'FileBarChart'];
                   return (
                    <button 
                      key={cfg.Category_ID} 
                      onClick={() => setSelectedCategoryId(cfg.Category_ID)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-start relative overflow-hidden ${selectedCategoryId === cfg.Category_ID ? 'bg-white shadow-xl shadow-purple-600/5 border-purple-200 text-purple-600 ring-1 ring-purple-100' : 'text-slate-500 hover:bg-slate-100 border-transparent'}`}
                    >
                       <div className={`p-2 rounded-lg z-10 ${selectedCategoryId === cfg.Category_ID ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'bg-slate-100 text-slate-400'}`}>
                          <Icon size={18} />
                       </div>
                       <span className="text-sm font-black tracking-tight leading-tight z-10">{isRtl ? cfg.Category_Name_Ar : cfg.Category_Name_En}</span>
                    </button>
                   )
                 })}
              </div>
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 lg:p-12">
          {activeTab === 'reports' ? (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
               <div className="text-start mb-8">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">{t.tabReportAccess}</h3>
                  <p className="text-sm text-slate-400 font-medium">تحديد التقارير المسموح برؤيتها وطباعتها لكل دور وظيفي</p>
               </div>

               <div className="grid grid-cols-1 gap-6">
                  {selectedConfig?.Available_Reports.map((report: ReportDefinition) => (
                    <div key={report.Report_ID} className="bg-slate-50 border border-slate-100 rounded-3xl p-6">
                       <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                             <div className="p-3 bg-white text-purple-600 rounded-xl shadow-sm">
                                <FileText size={20} />
                             </div>
                             <div>
                                <h4 className="font-black text-slate-800 leading-tight">{isRtl ? report.Title_Ar : report.Title_En}</h4>
                                <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase mt-0.5">{report.Report_ID}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                             <ShieldCheck size={12} /> Live Security
                          </div>
                       </div>

                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.values(UserRole).map((role) => {
                            const isAllowed = report.Allowed_Roles.includes(role);
                            return (
                              <button 
                                key={role}
                                onClick={() => handleToggleReportRole(report.Report_ID, role)}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isAllowed ? 'bg-white border-purple-200 text-purple-600 shadow-sm' : 'bg-slate-100/50 border-transparent text-slate-400 opacity-60'}`}
                              >
                                 <span className="text-[10px] font-black uppercase tracking-tight">{role}</span>
                                 {isAllowed ? <Unlock size={14} /> : <Lock size={14} />}
                              </button>
                            );
                          })}
                       </div>
                    </div>
                  ))}
                  {selectedConfig?.Available_Reports.length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center opacity-30 italic">
                      <FileBarChart size={64} className="mb-4 text-slate-200" />
                      <p className="text-lg font-bold">{isRtl ? 'لا توجد تقارير متاحة لهذه الفئة' : 'No reports available for this category'}</p>
                    </div>
                  )}
               </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
               <div className="flex items-center justify-between mb-8">
                  <div className="text-start">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                       <Stamp className="text-purple-600" size={32} />
                       {isRtl ? `سلسلة تواقيع ${selectedConfig?.Category_Name_Ar || ''}` : `${selectedConfig?.Category_Name_En || ''} Signatures`}
                    </h3>
                    <p className="text-sm text-slate-400 font-medium mt-1">ترتيب الاعتمادات والتواقيع التي ستظهر في أسفل التقارير</p>
                  </div>
                  <button 
                    onClick={handleAddSignature}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-900/10 hover:bg-purple-600 transition-all"
                  >
                    <Plus size={18} /> {isRtl ? 'إضافة توقيع' : 'Add Signature'}
                  </button>
               </div>

               <div className="grid grid-cols-1 xl:grid-cols-5 gap-12">
                  <div className="xl:col-span-3 space-y-4">
                    {selectedConfig?.Signature_Chain.length === 0 ? (
                      <div className="bg-slate-50 border-2 border-dashed border-slate-100 rounded-[2rem] p-20 text-center opacity-40">
                        <Signature size={48} className="mx-auto mb-4 text-slate-300" />
                        <p className="font-bold">{isRtl ? 'لم يتم تعريف أي تواقيع بعد' : 'No signatures defined yet'}</p>
                      </div>
                    ) : (
                      selectedConfig?.Signature_Chain.map((step, idx) => (
                        <div key={step.Step_ID} className="bg-slate-50 border border-slate-100 rounded-3xl p-6 group relative">
                           <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black">STEP {idx+1}</span>
                                <button 
                                  onClick={() => handleRemoveSignature(step.Step_ID)}
                                  className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                              <div className="flex p-1 bg-white border border-slate-100 rounded-lg">
                                 <button onClick={() => handleUpdateSignature(step.Step_ID, { Alignment: 'right' })} className={`p-1.5 rounded-md ${step.Alignment === 'right' ? 'bg-purple-100 text-purple-600' : 'text-slate-300'}`} title={isRtl ? 'يمين' : 'Right'}><AlignRight size={14} /></button>
                                 <button onClick={() => handleUpdateSignature(step.Step_ID, { Alignment: 'center' })} className={`p-1.5 rounded-md ${step.Alignment === 'center' ? 'bg-purple-100 text-purple-600' : 'text-slate-300'}`} title={isRtl ? 'توسيط' : 'Center'}><AlignCenter size={14} /></button>
                                 <button onClick={() => handleUpdateSignature(step.Step_ID, { Alignment: 'left' })} className={`p-1.5 rounded-md ${step.Alignment === 'left' ? 'bg-purple-100 text-purple-600' : 'text-slate-300'}`} title={isRtl ? 'يسار' : 'Left'}><AlignLeft size={14} /></button>
                              </div>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2 text-start">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'المسمى النصي' : 'Display Title'}</label>
                                 <div className="grid grid-cols-2 gap-2">
                                   <input 
                                     type="text" 
                                     placeholder="عربي"
                                     value={step.Display_Title_Ar}
                                     onChange={e => handleUpdateSignature(step.Step_ID, { Display_Title_Ar: e.target.value })}
                                     className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-purple-500/20"
                                   />
                                   <input 
                                     type="text" 
                                     placeholder="English"
                                     value={step.Display_Title_En}
                                     onChange={e => handleUpdateSignature(step.Step_ID, { Display_Title_En: e.target.value })}
                                     className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-purple-500/20"
                                   />
                                 </div>
                              </div>
                              <div className="space-y-2 text-start">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'الدور الوظيفي المسؤول' : 'Responsible Role'}</label>
                                 <select 
                                   value={step.Job_ID}
                                   onChange={e => handleUpdateSignature(step.Step_ID, { Job_ID: e.target.value })}
                                   className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-purple-500/20"
                                 >
                                    <option value="">{isRtl ? '-- اختر دوراً --' : '-- Select Role --'}</option>
                                    {jobTitles.map((j: any) => <option key={j.Job_ID} value={j.Job_ID}>{isRtl ? j.Title_Ar : j.Title_En}</option>)}
                                 </select>
                              </div>
                           </div>
                           <div className="mt-4 flex items-center gap-2">
                              <input 
                                type="checkbox" 
                                checked={step.Is_Stamp_Required} 
                                onChange={e => handleUpdateSignature(step.Step_ID, { Is_Stamp_Required: e.target.checked })}
                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                              />
                              <label className="text-[10px] font-bold text-slate-500">{isRtl ? 'يتطلب ختم رسمي' : 'Official Stamp Required'}</label>
                           </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="xl:col-span-2 space-y-6">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-6">Visual Paper Preview</h4>
                       <div className="bg-white rounded-xl h-80 flex flex-col p-4 shadow-inner relative overflow-hidden">
                          {/* Header Preview */}
                          <div className="flex justify-between border-b border-slate-100 pb-2 mb-2">
                             <div className="space-y-0.5">
                                <div className="w-12 h-1 bg-slate-200 rounded"></div>
                                <div className="w-8 h-1 bg-slate-200 rounded"></div>
                             </div>
                             <div className="w-10 h-10 bg-slate-50 rounded border border-slate-100 flex items-center justify-center text-[6px] text-slate-300">LOGO</div>
                          </div>
                          <div className="flex-1 bg-slate-50/50 rounded flex flex-col items-center justify-center p-4">
                             <div className="w-20 h-3 bg-purple-100 rounded-full mb-1"></div>
                             <div className="w-40 h-1.5 bg-slate-200 rounded-full mb-4"></div>
                             <div className="w-full space-y-1">
                                <div className="w-full h-1 bg-slate-100 rounded"></div>
                                <div className="w-3/4 h-1 bg-slate-100 rounded"></div>
                             </div>
                          </div>
                          {/* Footer Preview (Signatures arranged by alignment) */}
                          <div className="flex justify-between pt-2 border-t border-slate-100 min-h-[40px] items-end">
                             <div className="flex flex-col items-start gap-1 flex-1">
                                {selectedConfig?.Signature_Chain.filter(s => s.Alignment === 'left').map(s => (
                                  <div key={s.Step_ID} className="flex flex-col items-center">
                                    <div className="w-8 h-0.5 bg-slate-400 mb-0.5"></div>
                                    <div className="w-10 h-1 bg-slate-100 rounded"></div>
                                  </div>
                                ))}
                             </div>
                             <div className="flex flex-col items-center gap-1 flex-1">
                                {selectedConfig?.Signature_Chain.filter(s => s.Alignment === 'center').map(s => (
                                  <div key={s.Step_ID} className="flex flex-col items-center">
                                    <div className="w-8 h-0.5 bg-slate-400 mb-0.5"></div>
                                    <div className="w-10 h-1 bg-slate-100 rounded"></div>
                                  </div>
                                ))}
                             </div>
                             <div className="flex flex-col items-end gap-1 flex-1">
                                {selectedConfig?.Signature_Chain.filter(s => s.Alignment === 'right').map(s => (
                                  <div key={s.Step_ID} className="flex flex-col items-center">
                                    <div className="w-8 h-0.5 bg-slate-400 mb-0.5"></div>
                                    <div className="w-10 h-1 bg-slate-100 rounded"></div>
                                  </div>
                                ))}
                             </div>
                          </div>
                       </div>
                       <div className="mt-6 flex items-start gap-3 opacity-60">
                         <Info size={14} className="text-purple-400 shrink-0 mt-0.5" />
                         <p className="text-[9px] font-bold leading-tight">سلسلة التواقيع تظهر آلياً في أسفل كافة تقارير هذه الفئة عند الطباعة، ويتم توزيعها بناءً على المحاذاة (يمين، وسط، يسار).</p>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportPermissionsTab;
