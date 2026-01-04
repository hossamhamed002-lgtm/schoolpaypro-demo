import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, Copy, RefreshCw, ShieldX, CheckCircle2, CalendarDays, Info } from 'lucide-react';
import {
  createAndStoreLicenseKey,
  listLicenseKeys,
  revokeLicenseKey
} from '../../license/licenseKeyStore';
import { exportLicenseKeyPayload } from '../../license/licenseKeyFactory';
import { LicenseKeyPayload, LicenseKeyStatus } from '../../license/types';
import type { useStore as useStoreHook } from '../../store';
import { loadFromStorage } from '../../db_engine';
import { INITIAL_STATE } from '../../store';
import { saveToStorage } from '../../db_engine';

type DirectorySchool = {
  id: string;
  name: string;
  code: string;
  school_uid?: string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
};

type FormState = {
  school_uid: string;
  license_type: 'paid' | 'trial-extension';
};

const DIRECTORY_KEY = 'SchoolPay_Pro_Directory';
const UID_MAP_KEY = 'SCHOOL_UID_MAP_V1';
const defaultForm: FormState = {
  school_uid: '',
  license_type: 'paid'
};

const normalizeSchoolCode = (value: string) => (value || '').trim().toUpperCase();

const readUidMap = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(UID_MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const loadDirectory = (): DirectorySchool[] => {
  const raw = sessionStorage.getItem(DIRECTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const hydrateDirectory = (): DirectorySchool[] => {
  const directory = loadDirectory();
  const uidMap = readUidMap();
  const generated: Record<string, string> = {};

  const ensureUid = (scopedCode: string, snapshot: any, entryUid?: string) => {
    if (entryUid) return entryUid;
    const fromSnapshot = snapshot?.schools?.[0]?.school_uid;
    if (fromSnapshot) return fromSnapshot;
    if (uidMap[scopedCode]) return uidMap[scopedCode];
    if (generated[scopedCode]) return generated[scopedCode];
    const g: any = (typeof crypto !== 'undefined' && crypto) || (typeof window !== 'undefined' ? (window as any).crypto : null);
    const uid = g?.randomUUID ? g.randomUUID() : `sch-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
    generated[scopedCode] = uid;
    return uid;
  };

  const nextDirectory = directory.map((entry) => {
    const scopedCode = normalizeSchoolCode(entry.code);
    const snapshot = scopedCode ? loadFromStorage(INITIAL_STATE, scopedCode) : null;
    const school = snapshot?.schools?.[0];
    const schoolUid = ensureUid(scopedCode, snapshot, entry.school_uid);
    if (snapshot?.schools?.[0] && !snapshot.schools[0].school_uid && schoolUid) {
      const updated = { ...snapshot, schools: [{ ...snapshot.schools[0], school_uid: schoolUid }] };
      saveToStorage(updated, scopedCode);
    }
    return {
      id: entry.id || scopedCode || entry.name || '',
      name: entry.name || school?.Name || 'School',
      code: school?.School_Code || entry.code || scopedCode,
      school_uid: schoolUid,
      subscriptionStart: entry.subscriptionStart || school?.Subscription_Start || '',
      subscriptionEnd: entry.subscriptionEnd || school?.Subscription_End || ''
    };
  });

  // persist regenerated UIDs back to directory
  if (Object.keys(generated).length > 0) {
    const persisted = directory.map((entry) => {
      const scoped = normalizeSchoolCode(entry.code);
      const uid = generated[scoped] || entry.school_uid;
      return { ...entry, school_uid: uid };
    });
    try {
      sessionStorage.setItem(DIRECTORY_KEY, JSON.stringify(persisted));
    } catch {
      // ignore
    }
  }

  return nextDirectory;
};

const statusLabel = (status: LicenseKeyStatus) => {
  switch (status) {
    case 'activated': return 'Activated';
    case 'expired': return 'Expired';
    case 'revoked': return 'Revoked';
    default: return 'Unused';
  }
};

const LicenseManager: React.FC<{ store: ReturnType<typeof useStoreHook> }> = ({ store: _store }) => {
  const [schools, setSchools] = useState<DirectorySchool[]>(() => hydrateDirectory());
  const [form, setForm] = useState<FormState>(defaultForm);
  const [keys, setKeys] = useState<LicenseKeyPayload[]>([]);
  const [message, setMessage] = useState<string>('');

  const refresh = () => {
    setKeys(listLicenseKeys('all'));
    setSchools(hydrateDirectory());
  };

  useEffect(() => {
    refresh();
  }, []);

  const onChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectedSchool = useMemo(
    () => schools.find((s) => s.school_uid === form.school_uid) || null,
    [schools, form.school_uid]
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    const selected = selectedSchool;
    if (!selected) {
      setMessage('Select an existing school from subscribers.');
      return;
    }
    if (!selected.school_uid) {
      setMessage('School UID is missing. Open the school once to bind UID before issuing a license.');
      return;
    }
    const expiryRaw = selected.subscriptionEnd;
    const expiryDate = expiryRaw ? new Date(expiryRaw) : null;
    if (!expiryDate || Number.isNaN(expiryDate.getTime())) {
      setMessage('Subscription end date is missing or invalid for this school.');
      return;
    }
    const durationDays = Math.ceil((expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (durationDays <= 0) {
      setMessage('Subscription is expired. Update the subscriber plan before generating a license.');
      return;
    }
    const payload = createAndStoreLicenseKey({
      school_name: selected.name || 'School',
      school_code: selected.code,
      school_uid: selected.school_uid,
      duration_days: durationDays,
      license_type: form.license_type,
      expires_at: expiryDate.toISOString()
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
    const expiresAt = item.expires_at ? new Date(item.expires_at) : null;
    const expired = expiresAt ? expiresAt.getTime() < Date.now() : false;
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
            <p className="text-sm text-slate-500">Generate a signed key for a school/device (subscription dates pulled from subscribers)</p>
          </div>
        </div>
        <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={handleCreate}>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Choose School</label>
            <select
              value={form.school_uid}
              onChange={(e) => onChange('school_uid', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">Select school from subscribers</option>
              {schools.map((s) => (
                <option key={s.id} value={s.school_uid || ''} disabled={!s.school_uid}>
                  {s.name || 'School'} — {s.code || 'N/A'} {s.school_uid ? '' : '(UID missing)'}
                </option>
              ))}
            </select>
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
          {selectedSchool && (
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl text-indigo-600 shadow-sm">
                  <Info size={16} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">School</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedSchool.name}</p>
                  <p className="text-[11px] text-slate-500">{selectedSchool.code}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl text-amber-600 shadow-sm">
                  <CalendarDays size={16} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">Subscription Start</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedSchool.subscriptionStart || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl text-emerald-600 shadow-sm">
                  <CalendarDays size={16} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">Subscription End</p>
                  <p className="text-sm font-semibold text-slate-800">{selectedSchool.subscriptionEnd || '—'}</p>
                </div>
              </div>
            </div>
          )}
          <div className="md:col-span-3 flex items-center justify-between gap-3">
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
                  <td className="py-3 pr-3">{item.expires_at ? item.expires_at.slice(0, 10) : '—'}</td>
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
                  <td className="py-6 text-center text-slate-400" colSpan={7}>No keys generated yet.</td>
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
