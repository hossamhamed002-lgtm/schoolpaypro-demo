import React, { useMemo, useState } from 'react';
import { HeartPulse, RefreshCcw, Download, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useSystemHealth } from '../../hooks/useSystemHealth';
import { getAuditLogs } from '../../src/stores/auditLogStore';

const statusBadge = (status: 'OK' | 'WARNING' | 'ERROR') => {
  const map: Record<string, string> = {
    OK: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    WARNING: 'bg-amber-50 text-amber-700 border border-amber-100',
    ERROR: 'bg-rose-50 text-rose-700 border border-rose-100'
  };
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${map[status]}`}>{status}</span>;
};

const SystemHealth: React.FC<{ store: any }> = ({ store }) => {
  const [trigger, setTrigger] = useState(Date.now());
  const { checks, summary } = useSystemHealth(store, trigger);

  const exportReport = () => {
    const blob = new Blob([JSON.stringify({ generatedAt: new Date().toISOString(), checks, summary }, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'system-health.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const healthColor = (s: 'OK' | 'WARNING' | 'ERROR') =>
    s === 'OK' ? 'text-emerald-600 bg-emerald-50' : s === 'WARNING' ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50';

  const criticalLogs = useMemo(() => {
    return getAuditLogs()
      .filter((l) => l.severity === 'HIGH')
      .slice(-5)
      .reverse();
  }, [trigger]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {checks.map((c) => (
          <div key={c.key} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-slate-900">{c.title}</p>
              {statusBadge(c.status)}
            </div>
            <p className={`text-xs font-bold ${healthColor(c.status)} px-2 py-1 rounded-lg inline-flex w-fit`}>
              {c.message}
            </p>
            <p className="text-[10px] text-slate-400">آخر فحص: {new Date(c.lastCheckedAt).toLocaleString('ar-EG')}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-600">نتيجة الفحص:</span>
          <span className="text-xs font-black text-emerald-600">OK: {summary.oks}</span>
          <span className="text-xs font-black text-amber-600">Warnings: {summary.warnings}</span>
          <span className="text-xs font-black text-rose-600">Errors: {summary.errors}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTrigger(Date.now())}
            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 inline-flex items-center gap-2"
          >
            <RefreshCcw size={16} /> إعادة الفحص
          </button>
          <button
            onClick={exportReport}
            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 inline-flex items-center gap-2"
          >
            <Download size={16} /> تصدير تقرير
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-lg font-black text-slate-900 mb-3">سجلات حرجة حديثة</h3>
        <div className="space-y-2">
          {criticalLogs.length === 0 && <p className="text-sm text-slate-400 font-bold">لا توجد سجلات حرجة</p>}
          {criticalLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 bg-rose-50/70 border border-rose-100 rounded-2xl px-4 py-3">
              <AlertTriangle className="text-rose-500 mt-1" size={16} />
              <div className="flex-1">
                <p className="text-sm font-black text-slate-900">{log.description || log.entity}</p>
                <p className="text-xs text-slate-500 font-bold">
                  {new Date(log.timestamp).toLocaleString('ar-EG')} · {log.username} · {log.schoolId}
                </p>
              </div>
              <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">{log.actionType}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
