import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, Copy, RefreshCw, ShieldX, CheckCircle2 } from 'lucide-react';
import {
  createAndStoreLicenseKey,
  listLicenseKeys,
  revokeLicenseKey
} from '../../license/licenseKeyStore';
import { exportLicenseKeyPayload } from '../../license/licenseKeyFactory';
import { LicenseKeyPayload, LicenseKeyStatus } from '../../license/types';
import type { useStore as useStoreHook } from '../../store';

type FormState = {
  school_uid: string;
  duration_days: number;
  license_type: 'paid' | 'trial-extension';
};

const defaultForm: FormState = {
  school_uid: '',
  duration_days: 30,
  license_type: 'paid'
};

const statusLabel = (status: LicenseKeyStatus) => {
  switch (status) {
    case 'activated': return 'Activated';
    case 'expired': return 'Expired';
    case 'revoked': return 'Revoked';
    default: return 'Unused';
  }
};

const LicenseManager: React.FC<{ store: ReturnType<typeof useStoreHook> }> = ({ store }) => {
  const schools = store?.schools || [];
  const [form, setForm] = useState<FormState>(defaultForm);
  const [keys, setKeys] = useState<LicenseKeyPayload[]>([]);
  const [message, setMessage] = useState<string>('');

  const refresh = () => setKeys(listLicenseKeys('all'));

  useEffect(() => {
    refresh();
  }, []);

  const onChange = (field: keyof FormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.school_uid || form.duration_days <= 0) return;
    const selected = schools.find((s: any) => s.school_uid === form.school_uid);
    if (!selected) return;
    const payload = createAndStoreLicenseKey({
      school_name: selected.Name || selected.school_name || 'School',
      school_code: selected.School_Code || selected.school_code || undefined,
      school_uid: selected.school_uid,
      duration_days: Number(form.duration_days),
      license_type: form.license_type
    });
    setMessage(`License key created: ${payload.license_key}`);
    setForm(defaultForm);
    refresh();
  };

  const copyText = (text: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text).catch(() => {});
    setMessage('Copied to clipboard');
  };

  const computeStatus = (item: LicenseKeyPayload): LicenseKeyStatus => {
    if (item.revoked) return 'revoked';
    if (item.activated) return 'activated';
    const expired = new Date(item.expires_at).getTime() < Date.now();
    if (expired) return 'expired';
    return 'unused';
  };

  const visibleKeys = useMemo(() => keys.map((k) => ({ ...k, status: computeStatus(k) })), [keys]);

  const revoke = (key: string) => {
    revokeLicenseKey(key);
    refresh();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <KeyRound size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Create License Key</h3>
            <p className="text-sm text-slate-500">Generate a signed key for a school/device</p>
          </div>
        </div>
        <form className="grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={handleCreate}>
          <div className="md:col-span-3">
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Choose School</label>
            <select
              value={form.school_uid}
              onChange={(e) => onChange('school_uid', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">Select school</option>
              {schools.map((s: any) => (
                <option key={s.school_uid} value={s.school_uid}>
                  {s.Name || s.school_name || 'School'} — {s.School_Code || s.school_code || 'N/A'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Duration (days)</label>
            <input
              type="number"
              min={1}
              value={form.duration_days}
              onChange={(e) => onChange('duration_days', Number(e.target.value))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">License type</label>
            <select
              value={form.license_type}
              onChange={(e) => onChange('license_type', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="paid">Paid</option>
              <option value="trial-extension">Trial extension</option>
            </select>
          </div>
          <div className="md:col-span-4 flex items-center justify-between gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold shadow-sm hover:bg-indigo-700"
            >
              <KeyRound size={16} /> Create key
            </button>
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-2 text-slate-500 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </form>
        {message && <div className="mt-4 text-sm font-semibold text-emerald-600">{message}</div>}
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl">
              <Copy size={18} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Generated Keys</h3>
              <p className="text-sm text-slate-500">Copy, export, or revoke keys</p>
            </div>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-3">Key</th>
                <th className="py-2 pr-3">School</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Duration</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Expires</th>
                <th className="py-2 pr-3">Bound</th>
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleKeys.map((item) => (
                <tr key={item.license_key} className="border-t border-slate-100">
                  <td className="py-3 pr-3 font-mono text-xs">{item.license_key}</td>
                  <td className="py-3 pr-3">
                    <div className="font-semibold text-slate-800">{item.school_name}</div>
                    <div className="text-[11px] text-slate-500">{item.school_code || '—'}</div>
                  </td>
                  <td className="py-3 pr-3 capitalize">{item.license_type === 'paid' ? 'Paid' : 'Trial extension'}</td>
                  <td className="py-3 pr-3">{item.duration_days} days</td>
                  <td className="py-3 pr-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold ${
                      item.status === 'activated' ? 'bg-emerald-50 text-emerald-700'
                        : item.status === 'expired' ? 'bg-amber-50 text-amber-700'
                        : item.status === 'revoked' ? 'bg-rose-50 text-rose-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {item.status === 'activated' && <CheckCircle2 size={12} />}
                      {statusLabel(item.status as LicenseKeyStatus)}
                    </span>
                  </td>
                  <td className="py-3 pr-3">{item.expires_at.slice(0, 10)}</td>
                  <td className="py-3 pr-3">
                    {item.bound_hwid ? (
                      <div className="text-[11px] text-slate-600 leading-tight">
                        <div>HWID: {item.bound_hwid.slice(0, 10)}...</div>
                        {item.school_code && <div>School: {item.school_code}</div>}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">Unbound</span>
                    )}
                  </td>
                  <td className="py-3 pr-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => copyText(item.license_key)}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold"
                    >
                      Copy key
                    </button>
                    <button
                      onClick={() => copyText(exportLicenseKeyPayload(item))}
                      className="text-slate-600 hover:text-slate-800 text-xs font-semibold"
                    >
                      Copy JSON
                    </button>
                    <button
                      disabled={item.status !== 'unused'}
                      onClick={() => revoke(item.license_key)}
                      className={`text-xs font-semibold inline-flex items-center gap-1 ${item.status !== 'unused'
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'text-rose-600 hover:text-rose-700'}`}
                    >
                      <ShieldX size={12} /> Revoke
                    </button>
                  </td>
                </tr>
              ))}
              {visibleKeys.length === 0 && (
                <tr>
                  <td className="py-6 text-center text-slate-400" colSpan={8}>No keys generated yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LicenseManager;
