
import React, { useRef, useState, useEffect } from 'react';
import { DatabaseBackup, Upload, Clock, FolderOpen, ShieldCheck, Loader2, Save, HardDrive, Download, Zap, AlertCircle } from 'lucide-react';
import { db } from '../services/db';

interface DataBackupProps {
  onRefresh: () => void;
}

const DataBackup: React.FC<DataBackupProps> = ({ onRefresh }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [backupPath, setBackupPath] = useState<string>(localStorage.getItem('app_auto_backup_path') || '');
  const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState<boolean>(localStorage.getItem('app_auto_backup_enabled') === 'true');
  const [lastAutoBackupTime, setLastAutoBackupTime] = useState<string>(localStorage.getItem('app_last_auto_backup_time') || 'لم يتم بعد');
  const [isProcessing, setIsProcessing] = useState(false);
  const [nextBackupCountdown, setNextBackupCountdown] = useState<number>(180); 
  
  const isElectron = typeof window !== 'undefined' && (window as any).ipcRenderer !== undefined;

  useEffect(() => {
    let timer: any;
    if (isAutoBackupEnabled && backupPath && isElectron) {
      timer = setInterval(() => {
        setNextBackupCountdown(prev => {
            if (prev <= 1) {
                performAutoBackup();
                return 180;
            }
            return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isAutoBackupEnabled, backupPath, isElectron]);

  const performAutoBackup = async (isManual = false) => {
    const ipc = (window as any).ipcRenderer;
    if (!ipc) return;
    if (!backupPath) { if (isManual) handleSelectPath(); return; }

    try {
      setIsProcessing(true);
      const data = db.createBackup();
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `EagleEye_Backup_${isManual ? 'Manual' : 'Auto'}_${timestamp}.json`;
      const separator = backupPath.includes('/') ? '/' : '\\';
      const fullPath = backupPath.endsWith(separator) ? `${backupPath}${fileName}` : `${backupPath}${separator}${fileName}`;

      const result = await ipc.invoke('save-backup-to-path', { filePath: fullPath, content: data });
      if (result.success) {
        const timeStr = now.toLocaleTimeString('ar-EG');
        setLastAutoBackupTime(timeStr);
        localStorage.setItem('app_last_auto_backup_time', timeStr);
        if (isManual) alert("✅ تم حفظ النسخة بنجاح.");
      }
    } catch (err) { console.error(err); } finally { setIsProcessing(false); }
  };

  const handleSelectPath = async () => {
    const ipc = (window as any).ipcRenderer;
    if (!ipc) return;
    try {
        const path = await ipc.invoke('select-directory');
        if (path) {
          setBackupPath(path);
          localStorage.setItem('app_auto_backup_path', path);
          if (!isAutoBackupEnabled) {
            setIsAutoBackupEnabled(true);
            localStorage.setItem('app_auto_backup_enabled', 'true');
          }
        }
    } catch (error) { console.error(error); }
  };

  const handleDownloadManual = () => {
    const jsonString = db.createBackup();
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EagleEye_Backup_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("تحذير: استعادة نسخة سيمسح البيانات الحالية تماماً. هل تريد المتابعة؟")) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (db.restoreBackup(json)) {
          alert("تمت الاستعادة بنجاح!");
          onRefresh();
          window.location.reload();
        }
      } catch { alert("ملف غير صالح."); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in pb-10">
      {/* عنوان مختصر جداً */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${isAutoBackupEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                <DatabaseBackup size={32} />
            </div>
            <div>
                <h2 className="text-xl font-black text-gray-800">إدارة التزامين والنسخ</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${isAutoBackupEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                    <span className="text-xs font-bold text-gray-500">
                        {isAutoBackupEnabled ? `النسخ القادم خلال ${Math.floor(nextBackupCountdown / 60)}:${(nextBackupCountdown % 60).toString().padStart(2, '0')}` : 'الحماية التلقائية معطلة'}
                    </span>
                </div>
            </div>
        </div>
        <button 
            onClick={() => performAutoBackup(true)}
            disabled={!isElectron || isProcessing || !backupPath}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-30"
        >
            {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <ShieldCheck size={18}/>}
            حفظ نسخة فورية
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* إعدادات الموقع */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-5">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-3">
                <HardDrive size={20} className="text-blue-600"/> إعدادات الويندوز
            </h3>
            
            <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">مسار الحفظ التلقائي</label>
                <div className="flex gap-2">
                    <div 
                        onClick={handleSelectPath}
                        className={`flex-1 border-2 border-dashed rounded-xl px-4 py-3 text-xs font-mono truncate cursor-pointer transition-all ${!backupPath ? 'text-gray-400 bg-gray-50' : 'text-blue-600 bg-blue-50 border-blue-100'}`}
                    >
                        {backupPath || (isElectron ? 'اضغط لتحديد المجلد...' : 'متاح في نسخة الويندوز')}
                    </div>
                    <button onClick={handleSelectPath} disabled={!isElectron} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 disabled:opacity-30"><FolderOpen size={20}/></button>
                </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border">
                <span className="text-xs font-bold text-gray-600">تفعيل النسخ كل 3 دقائق</span>
                <button 
                    onClick={() => {
                        const newVal = !isAutoBackupEnabled;
                        setIsAutoBackupEnabled(newVal);
                        localStorage.setItem('app_auto_backup_enabled', newVal.toString());
                    }}
                    disabled={!isElectron || !backupPath}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${isAutoBackupEnabled ? 'bg-emerald-500' : 'bg-gray-300'} ${!isElectron ? 'opacity-20' : ''}`}
                >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isAutoBackupEnabled ? '-translate-x-6' : 'translate-x-0'}`}></div>
                </button>
            </div>
            
            <div className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                <Clock size={12}/> آخر نسخ تلقائي: {lastAutoBackupTime}
            </div>
        </div>

        {/* النسخ اليدوي */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-5">
            <h3 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-3">
                <Save size={20} className="text-slate-600"/> نسخ يدوي واستيراد
            </h3>

            <div className="grid grid-cols-1 gap-3">
                <button onClick={handleDownloadManual} className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 py-3 rounded-xl font-bold border border-slate-200 flex items-center justify-center gap-3 transition">
                    <Download size={18} /> تحميل نسخة JSON
                </button>

                <label className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-3 cursor-pointer transition shadow-lg">
                    <Upload size={18} className="text-emerald-400"/> استيراد ملف خارجي
                    <input type="file" ref={fileInputRef} onChange={handleRestore} className="hidden" accept=".json" />
                </label>
            </div>
            <p className="text-[10px] text-gray-400 text-center font-bold">يمكنك نقل هذا الملف بين أي جهاز كمبيوتر آخر بسهولة.</p>
        </div>
      </div>

      {/* تنبيه بسيط للمتصفح فقط */}
      {!isElectron && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-800">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-xs font-bold leading-relaxed">أنت تستخدم وضع المتصفح. النسخ التلقائي واختيار المجلدات ميزة حصرية لمستخدمي "نسخة الويندوز المثبتة".</p>
        </div>
      )}
    </div>
  );
};

export default DataBackup;
