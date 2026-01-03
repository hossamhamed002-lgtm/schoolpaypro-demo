import React, { useMemo } from 'react';
import { loadLicense } from '../../license/licenseStorage';
import { LicenseEnforcementResult } from '../../license/types';

type Props = {
  status?: LicenseEnforcementResult | null;
};

const statusMap: Record<string, { text: string; bg: string; color: string; dot: string }> = {
  active: { text: '🟢 مرخّص – النسخة كاملة', bg: 'bg-emerald-50', color: 'text-emerald-800', dot: 'bg-emerald-500' },
  trial: { text: '🟡 نسخة تجريبية', bg: 'bg-amber-50', color: 'text-amber-800', dot: 'bg-amber-500' },
  expired: { text: '🔴 انتهت صلاحية الترخيص', bg: 'bg-rose-50', color: 'text-rose-800', dot: 'bg-rose-500' },
  blocked: { text: '⛔ الترخيص موقوف', bg: 'bg-rose-50', color: 'text-rose-800', dot: 'bg-rose-500' }
};

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

type BadgeProps = Props & { onRenew?: () => void };

const LicenseStatusBadge: React.FC<BadgeProps> = ({ status, onRenew }) => {
  const storedLicense = useMemo(() => loadLicense(), []);
  const effectiveStatus = useMemo(() => {
    if (status?.status === 'valid') return 'active';
    if (status?.status === 'trial') return 'trial';
    if (status?.status === 'expired') return 'expired';
    if (status?.status === 'blocked') return 'blocked';
    if (storedLicense?.license_type === 'trial') return 'trial';
    if (storedLicense) return 'active';
    return '';
  }, [status, storedLicense]);

  if (!effectiveStatus) return null;
  const cfg = statusMap[effectiveStatus] || statusMap.expired;
  const expiry = status?.license?.expires_at || status?.license?.end_date || storedLicense?.expires_at || storedLicense?.end_date;

  const showRenew = effectiveStatus === 'expired' && typeof onRenew === 'function';

  return (
    <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl border ${cfg.bg} ${cfg.color} border-white/40 shadow-sm`}>
      <div className={`h-3 w-3 rounded-full ${cfg.dot} shadow-inner`} />
      <div className="flex flex-col leading-tight">
        <div className="text-sm font-bold">{cfg.text}</div>
        <div className="text-[11px] text-slate-600">School Pay Pro{expiry ? ` — ينتهي في ${formatDate(expiry)}` : ''}</div>
      </div>
      {showRenew ? (
        <button
          type="button"
          onClick={onRenew}
          className="ml-2 text-xs font-bold text-indigo-700 hover:text-indigo-900"
        >
          تجديد الترخيص
        </button>
      ) : null}
    </div>
  );
};

export default LicenseStatusBadge;
