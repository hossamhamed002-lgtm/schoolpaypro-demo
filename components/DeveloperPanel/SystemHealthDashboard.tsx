import React, { useMemo, useState } from 'react';
import { HeartPulse, Database, Layers, FileSpreadsheet, BookOpen, Printer, HardDrive, RefreshCcw, AlertTriangle, Download } from 'lucide-react';
import { useSystemHealth } from '../../hooks/useSystemHealth';
import { getAuditLogs } from '../../src/stores/auditLogStore';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

const pieColors = ['#22c55e', '#f97316', '#3b82f6', '#ef4444', '#6366f1', '#0ea5e9'];

const SystemHealthDashboard: React.FC<{ store: any }> = ({ store }) => {
  const [trigger, setTrigger] = useState(Date.now());
  const { checks, summary } = useSystemHealth(store, trigger);

  const metrics = useMemo(() => summary.metrics, [summary.metrics]);

  const auditLogs = useMemo(() => getAuditLogs().slice(-50), [trigger]);

  const lineData = useMemo(() => {
    const buckets: Record<string, number> = {};
    auditLogs.forEach((log) => {
      const ts = new Date(log.timestamp);
      const key = `${ts.getHours()}:${String(ts.getMinutes()).padStart(2, '0')}`;
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.entries(buckets)
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [auditLogs]);

  const pieData = useMemo(() => {
    const buckets: Record<string, number> = {};
    auditLogs.forEach((log) => {
      if (log.severity === 'HIGH') {
        buckets[log.entity || 'System'] = (buckets[log.entity || 'System'] || 0) + 1;
      }
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [auditLogs]);

  const barData = useMemo(() => {
    return [
      { name: 'Invoices', value: store?.receipts?.length || 0 },
      { name: 'Receipts', value: store?.receipts?.length || 0 },
      { name: 'Journals', value: store?.journalEntries?.length || 0 }
    ];
  }, [store?.receipts, store?.journalEntries]);

  const cards = [
    { title: 'Database', icon: Database, status: 'OK', desc: 'Local storage', time: summary.lastCheckAt },
    { title: 'Store State', icon: Layers, status: summary.status, desc: 'Store hydration', time: summary.lastCheckAt },
    { title: 'Invoices Engine', icon: FileSpreadsheet, status: checks.find((c) => c.key === 'RECEIPTS_APPROVED')?.status || 'WARNING', desc: 'Receipts/Invoices', time: summary.lastCheckAt },
    { title: 'Journal Engine', icon: BookOpen, status: checks.find((c) => c.key === 'ACCOUNTS_BALANCE')?.status || 'WARNING', desc: 'Balance check', time: summary.lastCheckAt },
    { title: 'PrintEngine', icon: Printer, status: checks.find((c) => c.key === 'PRINT_ENGINE')?.status || 'WARNING', desc: 'Configs', time: summary.lastCheckAt },
    { title: 'Backup System', icon: HardDrive, status: checks.find((c) => c.key === 'BACKUP_STATUS')?.status || 'WARNING', desc: 'Auto backup', time: summary.lastCheckAt }
  ];

  const alerts = useMemo(() => {
    const list: { message: string; status: 'INFO' | 'WARN' | 'ERROR' }[] = [];
    const unbalanced = checks.find((c) => c.key === 'ACCOUNTS_BALANCE');
    const print = checks.find((c) => c.key === 'PRINT_ENGINE');
    const backup = checks.find((c) => c.key === 'BACKUP_STATUS');
    if (unbalanced && unbalanced.status === 'ERROR') list.push({ message: 'أكثر من 5 قيود غير موزونة', status: 'WARN' });
    if (print && print.status !== 'OK') list.push({ message: 'محرك الطباعة غير مفعّل', status: 'WARN' });
    if (backup && backup.status === 'ERROR') list.push({ message: 'لا توجد نسخة احتياطية خلال 24 ساعة', status: 'ERROR' });
    if ((store?.receipts || []).some((r: any) => r.Approved !== true && r.Is_Approved !== true)) {
      list.push({ message: 'فواتير غير معتمدة', status: 'INFO' });
    }
    return list;
  }, [checks, store?.receipts]);

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <HeartPulse />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">System Health Dashboard</h1>
          <p className="text-sm text-slate-500 font-bold">مراقبة حقيقية لحالة النظام وتشغيله</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setTrigger(Date.now())}
            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 inline-flex items-center gap-2"
          >
            <RefreshCcw size={16} /> إعادة الفحص
          </button>
          <button
            onClick={() => {
              const json = JSON.stringify({ checks, summary }, null, 2);
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'system-health-dashboard.json';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 inline-flex items-center gap-2"
          >
            <Download size={16} /> تصدير
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center">
              <card.icon size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-slate-900">{card.title}</p>
              <p className="text-[11px] text-slate-500 font-bold">{new Date(card.time).toLocaleTimeString('ar-EG')}</p>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                card.status === 'OK'
                  ? 'bg-emerald-50 text-emerald-700'
                  : card.status === 'WARNING'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {card.status}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 col-span-2">
          <h3 className="text-sm font-black text-slate-900 mb-3">الأحداث/الدقيقة</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
          <h3 className="text-sm font-black text-slate-900 mb-3">توزيع الأخطاء</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {pieData.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
        <h3 className="text-sm font-black text-slate-900 mb-3">استهلاك العمليات</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
        <h3 className="text-sm font-black text-slate-900 mb-3">تنبيهات</h3>
        <div className="flex flex-wrap gap-2">
          {!alerts.length && <span className="text-xs text-slate-400 font-bold">لا توجد تنبيهات</span>}
          {alerts.map((a, idx) => (
            <span
              key={idx}
              className={`px-3 py-1 rounded-full text-xs font-black inline-flex items-center gap-1 ${
                a.status === 'ERROR'
                  ? 'bg-rose-50 text-rose-700'
                  : a.status === 'WARN'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-slate-100 text-slate-700'
              }`}
              title={a.message}
            >
              <AlertTriangle size={14} /> {a.message}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
        <h3 className="text-sm font-black text-slate-900 mb-3">أحداث حديثة</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold">
              <tr>
                <th className="p-2 text-right">الحدث</th>
                <th className="p-2 text-right">المصدر</th>
                <th className="p-2 text-right">الحالة</th>
                <th className="p-2 text-right">الوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.slice(-20).reverse().map((log) => (
                <tr key={log.id}>
                  <td className="p-2 text-slate-800 font-bold">{log.description || log.entity}</td>
                  <td className="p-2 text-slate-600">{log.entity}</td>
                  <td className="p-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                        log.severity === 'HIGH'
                          ? 'bg-rose-50 text-rose-700'
                          : log.severity === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {log.severity}
                    </span>
                  </td>
                  <td className="p-2 text-slate-500">
                    {new Date(log.timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
              {!auditLogs.length && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-400 font-bold">
                    لا توجد أحداث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthDashboard;
