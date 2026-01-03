import React, { useMemo } from 'react';
import { loadLicense } from '../../license/licenseStorage';
import getHWID from '../../license/hwid';

const statusConfig = {
  active: { label: 'مفعّل', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  trial: { label: 'نسخة تجريبية', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  expired: { label: 'منتهي', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  invalid: { label: 'غير صالح', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  missing: { label: 'غير مُفعّل', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' }
} as const;

type StatusKey = keyof typeof statusConfig;

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const daysLeft = (expiresAt?: string | null) => {
  if (!expiresAt) return null;
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return null;
  const diff = d.getTime() - Date.now();
  if (diff < 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const shortenUid = (uid?: string | null) => {
  if (!uid) return '—';
  return uid.length <= 8 ? uid : `${uid.slice(0, 4)}…${uid.slice(-4)}`;
};

const LicenseStatusCard: React.FC = () => {
  const hwid = useMemo(() => getHWID(), []);
  const license = useMemo(() => loadLicense(), []);

  const status: StatusKey = (() => {
    if (!license) return 'missing';
    if (license.license_type === 'trial') return 'trial';
    const expiresAt = license.expires_at || license.end_date;
    if (expiresAt) {
      const d = new Date(expiresAt);
      if (!Number.isNaN(d.getTime()) && d.getTime() < Date.now()) return 'expired';
    }
    return 'active';
  })();

  const matched = license?.device_fingerprint ? license.device_fingerprint === hwid : null;
  const cfg = statusConfig[status];

  const remaining = status === 'active' || status === 'trial' ? daysLeft(license?.expires_at || license?.end_date) : null;

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-4 sm:p-5 space-y-3`} dir="rtl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-white/80 border border-white shadow-inner flex items-center justify-center text-indigo-600">
          🔑
        </div>
        <div>
          <div className="text-sm font-bold text-slate-500">School Pay Pro</div>
          <div className={`text-lg font-black ${cfg.color}`}>{cfg.label}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
        <div className="flex justify-between">
          <span className="font-semibold text-slate-600">تاريخ التفعيل</span>
          <span className="font-bold">{formatDate(license?.activated_at || license?.start_date)}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold text-slate-600">تاريخ الانتهاء</span>
          <span className="font-bold">{formatDate(license?.expires_at || license?.end_date)}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold text-slate-600">الأيام المتبقية</span>
          <span className="font-bold">{remaining !== null && remaining !== undefined ? remaining : '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold text-slate-600">الجهاز المرتبط</span>
          <span className={`font-bold ${matched === false ? 'text-rose-700' : 'text-emerald-700'}`}>
            {matched === null ? '—' : matched ? 'متطابق' : 'غير متطابق'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold text-slate-600">School UID</span>
          <span className="font-mono text-xs font-bold text-slate-700">{shortenUid(license?.school_uid)}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold text-slate-600">نوع الترخيص</span>
          <span className="font-bold">{license?.license_type === 'trial' ? 'نسخة تجريبية' : license ? 'مدفوع' : '—'}</span>
        </div>
      </div>

      {status === 'missing' && (
        <div className="text-xs text-slate-500">
          لم يتم تفعيل الترخيص بعد. برجاء إدخال كود الترخيص أو التواصل مع الدعم.
        </div>
      )}
    </div>
  );
};

export default LicenseStatusCard;
