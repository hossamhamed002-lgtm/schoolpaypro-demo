
import React, { useState, useMemo } from 'react';
import { 
  History, Search, Filter, Printer, Download, Eye, 
  ChevronLeft, Monitor, User, Calendar, Hash, Globe,
  ArrowUpDown, AlertCircle, FileSpreadsheet, CheckCircle2,
  Terminal, Activity, Clock, ShieldAlert, X
} from 'lucide-react';
import { AuditEntry } from '../../types';

interface AuditLogTabProps {
  store: any;
  onBack: () => void;
}

const AuditLogTab: React.FC<AuditLogTabProps> = ({ store, onBack }) => {
  const { t, lang, auditLogs = [] } = store; 
  const isRtl = lang === 'ar';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'add' | 'edit' | 'delete' | 'system'>('all');
  const [selectedLog, setSelectedLog] = useState<AuditEntry | null>(null);

  // قائمة بأسماء المبرمجين أو الحسابات التقنية التي يجب استثناؤها من العرض
  const developerUsernames = ['programmer', 'developer', 'master_dev'];

  const filteredLogs = useMemo(() => {
    if (!Array.isArray(auditLogs)) return [];
    
    return auditLogs.filter((log: AuditEntry) => {
      // استثناء سجلات المبرمج من العرض
      if (developerUsernames.includes(log.Username?.toLowerCase())) return false;

      const matchesSearch = 
        (log.Username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.Log_ID || '').includes(searchTerm) ||
        (isRtl ? (log.Action_Ar || '') : (log.Action_En || '')).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (isRtl ? (log.Page_Name_Ar || '') : (log.Page_Name_En || '')).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || log.Action_Type === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [auditLogs, searchTerm, filterType, isRtl]);

  const getActionStyles = (type: string) => {
    switch(type) {
      case 'add': return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', icon: CheckCircle2 };
      case 'edit': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', icon: Activity };
      case 'delete': return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', icon: ShieldAlert };
      case 'system': return { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', icon: Terminal };
      default: return { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100', icon: Clock };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-start pb-10">
      {/* Dynamic Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         {[
           { label: isRtl ? 'إجمالي الحركات المعروضة' : 'Visible Entries', value: filteredLogs.length, color: 'text-slate-900', bg: 'bg-white' },
           { label: isRtl ? 'إضافات النظام' : 'Added Records', value: filteredLogs.filter((l:any) => l.Action_Type === 'add').length, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
           { label: isRtl ? 'تعديلات البيانات' : 'Data Updates', value: filteredLogs.filter((l:any) => l.Action_Type === 'edit').length, color: 'text-amber-600', bg: 'bg-amber-50/50' },
           { label: isRtl ? 'عمليات الحذف' : 'Deletions', value: filteredLogs.filter((l:any) => l.Action_Type === 'delete').length, color: 'text-red-600', bg: 'bg-red-50/50' },
         ].map((stat, i) => (
           <div key={i} className={`p-6 rounded-[2rem] border border-slate-100 shadow-sm ${stat.bg}`}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
           </div>
         ))}
      </div>

      {/* Control Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-md border border-slate-50">
        <div className="flex items-center gap-5">
          <button 
            onClick={onBack} 
            className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all group shadow-sm"
          >
            <ChevronLeft size={24} className={`${isRtl ? 'rotate-180' : ''} group-hover:-translate-x-1 transition-transform`} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20">
                <History size={24} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{t.auditLog}</h3>
            </div>
            <p className="text-slate-500 text-sm font-medium mt-1 opacity-70 tracking-tight">{t.auditLogDesc}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 border border-slate-200">
             {['all', 'add', 'edit', 'delete', 'system'].map(type => (
               <button 
                 key={type}
                 onClick={() => setFilterType(type as any)} 
                 className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${filterType === type ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 {isRtl ? (type === 'all' ? 'الكل' : type === 'add' ? 'إضافة' : type === 'edit' ? 'تعديل' : type === 'delete' ? 'حذف' : 'نظام') : type}
               </button>
             ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center bg-slate-50/30">
          <div className="relative flex-1 w-full">
            <Search className={`absolute inset-y-0 ${isRtl ? 'right-5' : 'left-5'} my-auto text-slate-300`} size={20} />
            <input 
              type="text" 
              placeholder={isRtl ? 'ابحث في السجلات الحية...' : 'Search live audit records...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${isRtl ? 'pr-14 pl-6' : 'pl-14 pr-6'} py-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse min-w-[1100px]">
            <thead className="bg-slate-900 text-white uppercase tracking-[0.2em] text-[10px] font-black">
              <tr>
                <th className="px-8 py-6 text-center w-24">Log ID</th>
                <th className="px-8 py-6">{isRtl ? 'المستخدم' : 'Initiator'}</th>
                <th className="px-8 py-6">{isRtl ? 'التاريخ والوقت' : 'Timestamp'}</th>
                <th className="px-8 py-6">{isRtl ? 'الموقع' : 'Location'}</th>
                <th className="px-8 py-6">{isRtl ? 'العملية المنفذة' : 'Action Performed'}</th>
                <th className="px-8 py-6 text-center">{isRtl ? 'IP' : 'Network IP'}</th>
                <th className="px-8 py-6 text-center">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-40 text-center">
                    <div className="flex flex-col items-center opacity-30 italic">
                       <AlertCircle size={80} className="mb-4 text-slate-200" />
                       <p className="text-2xl font-black text-slate-400">{isRtl ? 'لا توجد حركات مسجلة' : 'No audit entries found'}</p>
                       <p className="text-xs font-bold text-slate-300 mt-2">قم بإجراء عمليات داخل النظام لتظهر السجلات هنا تلقائياً</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log: AuditEntry) => {
                  const style = getActionStyles(log.Action_Type);
                  const ActionIcon = style.icon;
                  return (
                    <tr key={log.Log_ID} className="hover:bg-indigo-50/40 transition-all group cursor-pointer" onClick={() => setSelectedLog(log)}>
                      <td className="px-8 py-5 text-center font-mono text-[11px] font-black text-slate-300 group-hover:text-indigo-600 transition-colors tracking-widest">#{log.Log_ID}</td>
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 p-0.5 border border-white shadow-sm ring-1 ring-slate-100 overflow-hidden text-center flex items-center justify-center">
                               {log.User_ID ? <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${log.User_ID}`} alt="" /> : <User size={16} />}
                            </div>
                            <div>
                               <p className="text-sm font-black text-slate-800 leading-none">{log.Username}</p>
                               <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-tight">System User</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-slate-600">{log.Timestamp}</td>
                      <td className="px-8 py-5">
                         <span className="text-xs font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{isRtl ? log.Page_Name_Ar : log.Page_Name_En}</span>
                      </td>
                      <td className="px-8 py-5">
                         <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                            <ActionIcon size={14} />
                            <span className="text-xs font-black leading-none">{isRtl ? log.Action_Ar : log.Action_En}</span>
                         </div>
                      </td>
                      <td className="px-8 py-5 text-center font-mono text-xs font-bold text-slate-400">{log.IP_Address}</td>
                      <td className="px-8 py-5 text-center">
                         <div className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye size={16} />
                         </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[120] p-4 animate-in fade-in duration-300" onClick={() => setSelectedLog(null)}>
           <div className="bg-white rounded-[3.5rem] w-full max-w-3xl shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden relative" onClick={e => e.stopPropagation()}>
              <div className="p-12 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center shadow-2xl ring-8 ring-slate-100">
                       <Terminal size={36} />
                    </div>
                    <div>
                       <h3 className="text-3xl font-black text-slate-900 tracking-tight">{isRtl ? 'تحليل العملية' : 'Operational Audit'}</h3>
                       <p className="text-xs text-indigo-600 font-black uppercase tracking-[0.3em] mt-1">Transaction Protocol #{selectedLog.Log_ID}</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedLog(null)} className="p-5 hover:bg-red-50 hover:text-red-500 rounded-[1.5rem] text-slate-400 transition-all"><X size={32} /></button>
              </div>

              <div className="p-12 space-y-10">
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                      { icon: User, label: isRtl ? 'المنفذ' : 'Initiator', val: selectedLog.Username },
                      { icon: Clock, label: isRtl ? 'الوقت' : 'Time', val: selectedLog.Timestamp },
                      { icon: Globe, label: isRtl ? 'العنوان' : 'IP Node', val: selectedLog.IP_Address },
                      { icon: Monitor, label: isRtl ? 'الموقع' : 'Target', val: isRtl ? selectedLog.Page_Name_Ar : selectedLog.Page_Name_En },
                    ].map((item, i) => (
                      <div key={i} className="space-y-2">
                         <div className="flex items-center gap-2 text-slate-400">
                            <item.icon size={12} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                         </div>
                         <p className="text-sm font-black text-slate-800">{item.val}</p>
                      </div>
                    ))}
                 </div>

                 <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-inner">
                    <div className="space-y-4">
                       <h5 className="text-emerald-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                          <Activity size={14} />
                          {isRtl ? 'تفاصيل السجل' : 'Log Details'}
                       </h5>
                       <div className="font-mono text-indigo-300 text-sm leading-relaxed overflow-x-auto">
                          {selectedLog.Details ? (
                            <pre className="whitespace-pre-wrap">{JSON.stringify(JSON.parse(selectedLog.Details), null, 2)}</pre>
                          ) : (
                            <span className="opacity-40 italic">-- NO EXTENDED DATA ATTACHED --</span>
                          )}
                       </div>
                    </div>
                 </div>

                 <button onClick={() => setSelectedLog(null)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all">{isRtl ? 'إغلاق' : 'Close'}</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogTab;
