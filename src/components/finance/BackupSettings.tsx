import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Cloud,
  HardDrive,
  RefreshCw,
  History,
  AlertTriangle,
  CheckCircle,
  Download
} from 'lucide-react';

type BackupRecord = {
  id: string;
  date: string;
  size: string;
  location: 'Local' | 'Cloud';
  status: 'Success' | 'Failed';
};

const mockHistory: BackupRecord[] = [
  { id: 'bk-1', date: '2025-10-20 02:18', size: '12 MB', location: 'Cloud', status: 'Success' },
  { id: 'bk-2', date: '2025-10-19 01:00', size: '11 MB', location: 'Local', status: 'Success' },
  { id: 'bk-3', date: '2025-10-18 22:04', size: '10 MB', location: 'Cloud', status: 'Failed' }
];

const BackupSettings: React.FC = () => {
  const [autoBackup, setAutoBackup] = useState(true);
  const [frequency, setFrequency] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [time, setTime] = useState('02:00');
  const [retention, setRetention] = useState(7);
  const [destination, setDestination] = useState<'Local' | 'Cloud'>('Cloud');
  const [connected, setConnected] = useState(false);
  const [history, setHistory] = useState<BackupRecord[]>(mockHistory);
  const [isBackingUp, setBackingUp] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleBackupNow = () => {
    setBackingUp(true);
    setProgress(0);
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
    }
    progressTimerRef.current = setInterval(() => {
      setProgress((current) => {
        const next = current + 20;
        if (next >= 100) {
          if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
          }
          setBackingUp(false);
          const timestamp = new Date().toLocaleString('en-GB', { hour12: false });
          setHistory((prev) => [
            { id: `bk-${Date.now()}`, date: timestamp, size: `${(Math.random() * 6 + 9).toFixed(1)} MB`, location: destination, status: 'Success' },
            ...prev
          ]);
          setToast('Backup created successfully.');
          return 100;
        }
        return next;
      });
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  const connectDrive = () => setConnected(true);

  const destinationSummary = useMemo(() => {
    if (destination === 'Cloud') {
      return connected ? 'متصل بـ Google Drive' : 'ستتطلب النسخ السحابي صلاحية Drive.';
    }
    return 'يتم حفظ النسخ في الخادم المحلي.';
  }, [connected, destination]);

  const statuses = {
    Success: 'bg-emerald-50 text-emerald-700',
    Failed: 'bg-rose-50 text-rose-700'
  };

  return (
    <div className="space-y-6">

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 text-slate-900">
            <Cloud size={24} className="text-indigo-500" />
            <div>
              <h2 className="text-xl font-black">إعدادات النسخ الاحتياطي</h2>
              <p className="text-sm text-slate-500">احفظ بيانات المدرسة واستعدها بسهولة.</p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">التكرار</label>
              <label className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">الوقت</label>
              <label className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">الاحتفاظ</label>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <select
                value={frequency}
                onChange={(event) => setFrequency(event.target.value as 'Daily' | 'Weekly' | 'Monthly')}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500"
              >
                <option value="Daily">يومي</option>
                <option value="Weekly">أسبوعي</option>
                <option value="Monthly">شهري</option>
              </select>
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500"
              />
              <input
                type="number"
                min={1}
                value={retention}
                onChange={(event) => setRetention(Number(event.target.value))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <HardDrive size={16} />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoBackup}
                  onChange={(event) => setAutoBackup(event.target.checked)}
                  className="accent-indigo-600"
                />
                النسخ التلقائي مفعّل
              </label>
              <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">{destinationSummary}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setDestination('Local')}
                  className={`rounded-2xl border px-4 py-2 text-sm font-black uppercase tracking-[0.3em] transition ${
                    destination === 'Local'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  التخزين المحلي
                </button>
                <button
                  onClick={() => setDestination('Cloud')}
                  className={`rounded-2xl border px-4 py-2 text-sm font-black uppercase tracking-[0.3em] transition ${
                    destination === 'Cloud'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Google Drive
                </button>
              </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col text-sm text-slate-500">
                <span className="font-bold text-slate-900">{destination === 'Cloud' ? 'وجهة السحابة' : 'الأرشيف المحلي'}</span>
                <span>{destinationSummary}</span>
              </div>
              <button
                onClick={connectDrive}
                className="inline-flex items-center gap-2 rounded-2xl border border-indigo-600 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-indigo-700 transition hover:bg-indigo-50"
              >
                <History size={14} />
                {connected ? 'متصل بـ Google Drive' : 'اتصال بـ Google Drive'}
              </button>
            </div>
          </div>
        </section>
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between text-sm font-black uppercase tracking-[0.3em] text-slate-400">
            <span>التحكم اليدوي</span>
            <span>{isBackingUp ? 'يعمل الآن…' : 'خامل'}</span>
          </div>
          <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
              <button
                onClick={handleBackupNow}
                disabled={isBackingUp}
                className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black uppercase tracking-[0.3em] text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500 disabled:opacity-60"
              >
                <RefreshCw size={16} className="inline-block" />
                <span className="mr-2">{isBackingUp ? 'جارٍ المعالجة…' : 'إنشاء نسخة الآن'}</span>
              </button>
              <div className="flex-1 text-right text-xs text-slate-500">
                التالي مجدول: {frequency === 'Daily' ? 'يومي' : frequency === 'Weekly' ? 'أسبوعي' : 'شهري'} في {time}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-3">
              <div className="h-2 overflow-hidden rounded-full bg-white">
                <div
                  style={{ width: `${progress}%` }}
                  className="h-2 rounded-full bg-indigo-500 transition-all duration-300"
                />
              </div>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.3em] text-slate-500">{progress}% مكتمل</p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">السجل</h3>
          <span className="text-xs uppercase tracking-[0.3em] text-slate-400">الاحتفاظ: {retention} نسخة</span>
        </div>
        <div className="mt-6 space-y-3">
          {history.map((item) => (
            <article key={item.id} className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50/70 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">التاريخ</p>
                <p className="text-sm font-black text-slate-900">{item.date}</p>
                <p className="text-xs text-slate-500">
                  الحجم: {item.size} · الوجهة: {item.location}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em]">
                <span className={`${statuses[item.status]} rounded-full px-3 py-1`}>
                  {item.status === 'Success' ? 'ناجح' : 'فشل'}
                </span>
                <button className="flex items-center gap-1 rounded-2xl border border-slate-300 px-3 py-1 text-slate-600">
                  <Download size={14} />
                  تنزيل
                </button>
                <button className="flex items-center gap-1 rounded-2xl border border-rose-200 px-3 py-1 text-rose-600">
                  <AlertTriangle size={12} />
                  استرجاع
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-2xl">
          <CheckCircle size={16} className="text-emerald-300" />
          {toast}
          <button className="text-xs underline" onClick={() => setToast(null)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
};

const DownloadIcon = () => <Download size={14} />;

export default BackupSettings;
