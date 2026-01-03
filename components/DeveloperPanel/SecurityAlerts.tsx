import React, { useMemo } from 'react';
import { AlertTriangle, ShieldAlert, Clock } from 'lucide-react';
import { getAuditLogs } from '../../src/stores/auditLogStore';

const SecurityAlerts: React.FC = () => {
  const alerts = useMemo(() => {
    const logs = getAuditLogs().filter((l) => l.severity === 'HIGH');
    return logs.slice(-20).reverse();
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <ShieldAlert />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">التنبيهات الأمنية</h1>
          <p className="text-sm text-slate-500 font-bold">عرض آخر التنبيهات الحرجة (قراءة فقط)</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
        {alerts.length === 0 && (
          <div className="text-center text-slate-400 font-bold py-10">لا توجد تنبيهات حرجة</div>
        )}
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-start gap-3 bg-rose-50/70 border border-rose-100 rounded-2xl px-4 py-3">
              <AlertTriangle className="text-rose-500 mt-1" size={18} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-rose-700">{a.actionType}</span>
                  <span className="text-xs text-slate-500 font-bold">{a.entity}</span>
                </div>
                <p className="text-sm text-slate-700 font-bold">{a.description}</p>
                <p className="text-xs text-slate-500 font-bold mt-1 flex items-center gap-2">
                  <Clock size={14} /> {new Date(a.timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })} · {a.username} · {a.schoolId}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SecurityAlerts;
