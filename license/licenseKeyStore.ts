import { isDemoMode } from '../src/guards/appMode';
import { generateLicenseKey, verifyLicenseKey } from './licenseKeyFactory';
import { saveLicense } from './licenseStorage';
import getHWID from './hwid';
import { LicenseKeyPayload, LicenseKeyStatus, LicensePayload } from './types';
import { signLicensePayload } from './licenseFactory';

const STORAGE_KEY = 'EDULOGIC_PROGRAMMER_LICENSE_KEYS_V1';

type FilterStatus = LicenseKeyStatus | 'all';

const readStore = (): LicenseKeyPayload[] => {
  if (isDemoMode()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeStore = (list: LicenseKeyPayload[]) => {
  if (isDemoMode()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // best-effort only
  }
};

export const listLicenseKeys = (status: FilterStatus = 'all') => {
  const list = readStore();
  const now = Date.now();
  const filtered = list.filter((item) => {
    if (status === 'all') return true;
    if (status === 'revoked') return !!item.revoked;
    if (status === 'activated') return item.activated === true;
    const expired = new Date(item.expires_at).getTime() < now;
    if (status === 'expired') return expired && !item.activated && !item.revoked;
    if (status === 'unused') return !expired && !item.activated && !item.revoked;
    return true;
  });
  return filtered.sort((a, b) => (b.issued_at || '').localeCompare(a.issued_at || ''));
};

export const saveLicenseKey = (payload: LicenseKeyPayload) => {
  const list = readStore();
  if (list.some((k) => k.license_key === payload.license_key)) {
    const next = list.map((k) => (k.license_key === payload.license_key ? payload : k));
    writeStore(next);
    return payload;
  }
  writeStore([...list, payload]);
  return payload;
};

export const createAndStoreLicenseKey = (input: Parameters<typeof generateLicenseKey>[0]) => {
  const payload = generateLicenseKey(input);
  saveLicenseKey(payload);
  return payload;
};

export const revokeLicenseKey = (license_key: string) => {
  const list = readStore();
  const next = list.map((k) => (k.license_key === license_key ? { ...k, revoked: true } : k));
  writeStore(next);
  return next.find((k) => k.license_key === license_key) || null;
};

export const findLicenseKey = (license_key: string) =>
  readStore().find((k) => k.license_key === license_key) || null;

export const markLicenseKeyActivated = (
  license_key: string,
  params: { hwid: string; school_uid: string; activated_at?: string }
) => {
  const list = readStore();
  let updated: LicenseKeyPayload | null = null;
  const next = list.map((k) => {
    if (k.license_key !== license_key) return k;
    if (k.activated && k.bound_hwid && k.bound_hwid !== params.hwid) return k;
    updated = {
      ...k,
      activated: true,
      activated_at: params.activated_at || new Date().toISOString(),
      bound_hwid: params.hwid,
      school_code: k.school_code,
      revoked: k.revoked
    };
    return updated;
  });
  if (updated) writeStore(next);
  return updated;
};

type ActivationResult =
  | { ok: true; license: LicensePayload; key: LicenseKeyPayload }
  | { ok: false; error: string };

export const activateLicenseKey = (
  payload: LicenseKeyPayload,
  options: { school_uid: string; school_name?: string; hwid?: string; isProgrammerDevice?: boolean; allowProgrammerBypass?: boolean } // programmer devices blocked by default
): ActivationResult => {
  const hwid = options.hwid || getHWID();

  const programmerFlag = (() => {
    try {
      return localStorage.getItem('EDULOGIC_PROGRAMMER_CREDENTIALS_V1') || localStorage.getItem('EDULOGIC_PROGRAMMER_CONTEXT_V1');
    } catch {
      return null;
    }
  })();

  const programmerDevice = options.isProgrammerDevice ?? !!programmerFlag;

  if (programmerDevice && !options.allowProgrammerBypass) {
    return { ok: false, error: 'PROGRAMMER_DEVICE_BLOCKED' };
  }

  if (!verifyLicenseKey(payload.license_key, payload)) {
    return { ok: false, error: 'INVALID_SIGNATURE' };
  }

  if (payload.revoked) return { ok: false, error: 'KEY_REVOKED' };
  if (payload.activated && payload.bound_hwid && payload.bound_hwid !== hwid) {
    return { ok: false, error: 'KEY_ALREADY_USED' };
  }
  const now = new Date();
  if (new Date(payload.expires_at).getTime() < now.getTime()) {
    return { ok: false, error: 'KEY_EXPIRED' };
  }
  if (payload.activated) {
    return { ok: false, error: 'KEY_ALREADY_ACTIVATED' };
  }

  const start = now.toISOString();
  const end = new Date(now.getTime() + Math.max(1, payload.duration_days) * 24 * 60 * 60 * 1000).toISOString();
  const license: LicensePayload = {
    school_uid: options.school_uid,
    device_fingerprint: hwid,
    license_type: payload.license_type === 'paid' ? 'paid' : 'trial',
    start_date: start,
    end_date: end,
    last_verified_at: start,
    signature: ''
  };
  license.signature = signLicensePayload({ ...license });

  const saved = saveLicense(license, { allowUpdate: true });
  if (!saved) {
    return { ok: false, error: 'LICENSE_SAVE_FAILED' };
  }

  const updatedKey = markLicenseKeyActivated(payload.license_key, {
    hwid,
    school_uid: options.school_uid,
    activated_at: start
  });

  return { ok: true, license, key: updatedKey || payload };
};
