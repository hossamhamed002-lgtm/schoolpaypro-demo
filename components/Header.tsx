
import React, { useRef } from 'react';
import { Building2, Calendar, Languages, ShieldCheck, Download, Upload, CheckCircle2, CloudUpload, ArrowLeftCircle } from 'lucide-react';

interface HeaderProps {
  store: any;
}

const Header: React.FC<HeaderProps> = ({ store }) => {
  const { t, toggleLang, activeYear, years, setActiveYearId, exportData, importData, lang, isSaved, activeSchool, programmerMode, exitProgrammerMode, demoMode } = store;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isRtl = lang === 'ar';

  const handleImportClick = () => {
    if (demoMode) {
      alert(isRtl ? 'متاح في النسخة الكاملة فقط' : 'Available in the full version only');
      return;
    }
    fileInputRef.current?.click();
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (demoMode) return;
    if (e.target.files?.[0]) importData(e.target.files[0]);
  };

  const saveBadge = demoMode
    ? { label: isRtl ? 'وضع تجريبي' : 'Demo Mode', className: 'bg-amber-50 border-amber-100 text-amber-700', icon: <ShieldCheck size={12} /> }
    : { label: isSaved ? (isRtl ? 'تم الحفظ' : 'Saved') : (isRtl ? 'جاري التأمين...' : 'Securing...'), className: isSaved ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600 animate-pulse', icon: isSaved ? <CheckCircle2 size={12} /> : <CloudUpload size={12} /> };

  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 sticky top-0 shadow-sm">
      <div className="flex items-center gap-5">
        <div className="p-3 bg-slate-50 rounded-xl">
          <Building2 className="text-indigo-600" size={24} />
        </div>
        <div className="text-start">
          <h2 className="text-lg font-black text-slate-800">{activeSchool?.Name || t.schoolName}</h2>
          <div className="flex items-center gap-4 mt-0.5">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-indigo-500" />
              <span className="text-xs font-bold text-slate-500">
                {t.currentYear}: <span className="text-indigo-600">{activeYear?.Year_Name}</span>
              </span>
            </div>
            {/* مؤشر الحفظ اللحظي - تم استبدال CloudCheck بـ CheckCircle2 */}
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border ${saveBadge.className}`}>
               {saveBadge.icon}
               <span className="text-[9px] font-black uppercase tracking-tighter">
                 {saveBadge.label}
               </span>
            </div>
          </div>
        </div>
      </div>

        <div className="flex items-center gap-4">
        {programmerMode && (
          <button
            onClick={exitProgrammerMode}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 text-xs font-black hover:bg-rose-100 transition"
          >
            <ArrowLeftCircle size={18} />
            {isRtl ? 'عودة للمبرمج' : 'Back to Programmer'}
          </button>
        )}
        {/* Data Vault Controls */}
        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100 me-2">
           <button 
             onClick={demoMode ? () => alert(isRtl ? 'متاح في النسخة الكاملة فقط' : 'Available in the full version only') : exportData}
             className={`p-2 hover:bg-white rounded-xl transition-all flex items-center gap-2 px-3 group ${demoMode ? 'text-slate-400 cursor-not-allowed' : 'text-emerald-600'}`}
             title={demoMode ? 'متاح في النسخة الكاملة' : (isRtl ? "تنزيل الخزنة" : "Download Vault")}
           >
             <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
             <span className="text-[10px] font-black uppercase hidden md:block">{isRtl ? 'الخزنة' : 'Vault'}</span>
           </button>
           <button 
             onClick={handleImportClick}
             className={`p-2 hover:bg-white rounded-xl transition-all flex items-center gap-2 px-3 group ${demoMode ? 'text-slate-400 cursor-not-allowed' : 'text-amber-600'}`}
             title={demoMode ? 'متاح في النسخة الكاملة' : (isRtl ? "رفع نسخة سابقة" : "Restore Backup")}
           >
             <Upload size={18} className="group-hover:-translate-y-0.5 transition-transform" />
             <span className="text-[10px] font-black uppercase hidden md:block">{isRtl ? 'استعادة' : 'Restore'}</span>
           </button>
           <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
        </div>

        <button 
          onClick={toggleLang}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all text-xs font-black text-indigo-700 border border-indigo-100"
        >
          <Languages size={18} />
          {t.langName}
        </button>
        <div className="h-8 w-px bg-slate-200"></div>
        <div className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest">
          {isRtl ? `عرض: ${activeYear?.Year_Name || '---'}` : `Viewing: ${activeYear?.Year_Name || '---'}`}
        </div>
        <select 
          value={activeYear?.Year_ID}
          onChange={(e) => setActiveYearId(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
        >
          {years.map((y: any) => (
            <option key={y.Year_ID} value={y.Year_ID}>{y.Year_Name}</option>
          ))}
        </select>
      </div>
    </header>
  );
};

export default Header;
