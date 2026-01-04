import { isDemoMode } from '../src/guards/appMode';
import { generateLicenseKey, normalizeLicenseKey, verifyLicenseKey } from './licenseKeyFactory';
import { saveLicense } from './licenseStorage';
import getHWID from './hwid';
import { LicenseKeyPayload, LicenseKeyStatus, LicensePayload } from './types';
import { signLicensePayload } from './licenseFactory';
import { loadLicense } from './licenseStorage';
import { getNodeFs, getNodeOs, getNodePath, isNodeRuntime } from './runtime';

const STORAGE_KEY = 'EDULOGIC_PROGRAMMER_LICENSE_KEYS_V1';
const IS_DEV = Boolean((import.meta as any).env?.DEV);
const devLog = (...args: any[]) => {
  if (IS_DEV) console.info(...args);
};

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
  const normalized = { ...payload, license_key: normalizeLicenseKey(payload.license_key) };
  const list = readStore();
  if (list.some((k) => normalizeLicenseKey(k.license_key) === normalized.license_key)) {
    const next = list.map((k) => (normalizeLicenseKey(k.license_key) === normalized.license_key ? normalized : k));
    writeStore(next);
    return normalized;
  }
  writeStore([...list, normalized]);
  return normalized;
};

const LOCAL_LICENSE_KEY = '__EDULOGIC_LICENSE_V1';
const LOCAL_LICENSE_KEY_ALT = 'EDULOGIC_LICENSE_V1';

const clearPersistedLicense = () => {
  try {
    localStorage.removeItem(LOCAL_LICENSE_KEY);
    localStorage.removeItem(LOCAL_LICENSE_KEY_ALT);
  } catch {
    // ignore
  }
  if (isNodeRuntime) {
    const fs = getNodeFs();
    const os = getNodeOs();
    const path = getNodePath();
    if (fs && os && path) {
      try {
        const filePath = path.join(os.homedir(), '.edulogic_license_v1');
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // ignore
      }
    }
  }
};

const persistIssuedKey = (payload: LicenseKeyPayload): { persisted: boolean; count: number } => {
  const hwid = getHWID();
  const vault = loadLicense();
  const issued = vault?.issued_keys || [];
  const nextIssued = [
    ...issued.filter((k) => normalizeLicenseKey(k.license_key) !== normalizeLicenseKey(payload.license_key)),
    payload
  ];
  const base: LicensePayload = vault && vault.status === 'key_vault'
    ? vault
    : {
        school_uid: vault?.school_uid || payload.school_uid || 'unbound',
        device_fingerprint: vault?.device_fingerprint || hwid,
        license_type: payload.license_type === 'trial-extension' ? 'trial' : 'paid',
        start_date: payload.issued_at || new Date().toISOString(),
        end_date: payload.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        expires_at: payload.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'key_vault',
        last_verified_at: new Date().toISOString(),
        signature: ''
      };
  const vaultPayload: LicensePayload = {
    ...base,
    status: 'key_vault',
    issued_keys: nextIssued,
    last_verified_at: new Date().toISOString()
  };
  vaultPayload.signature = signLicensePayload({
    school_uid: vaultPayload.school_uid,
    device_fingerprint: vaultPayload.device_fingerprint,
    license_type: vaultPayload.license_type,
    start_date: vaultPayload.start_date,
    end_date: vaultPayload.end_date,
    last_verified_at: vaultPayload.last_verified_at || ''
  });
  clearPersistedLicense();
  const persisted = saveLicense(vaultPayload);
  if (IS_DEV) {
    console.info('[LICENSE][VAULT][WRITE]', {
      ok: persisted,
      keys: nextIssued.length,
      latest: payload.license_key
    });
  }
  return { persisted, count: nextIssued.length };
};

export const createAndStoreLicenseKey = (input: Parameters<typeof generateLicenseKey>[0]) => {
  const payload = generateLicenseKey(input);
  saveLicenseKey(payload);
  try {
    const { count } = persistIssuedKey(payload);
    devLog('[LICENSE][GEN]', {
      key: payload.license_key,
      sig: payload.signature?.slice(0, 12),
      school_uid: payload.school_uid,
      expires_at: payload.expires_at,
      vault_keys: count
    });
  } catch {
    // best-effort only
  }
  return payload;
};

export const revokeLicenseKey = (license_key: string) => {
  const target = normalizeLicenseKey(license_key);
  const list = readStore();
  const next = list.map((k) => (normalizeLicenseKey(k.license_key) === target ? { ...k, revoked: true } : k));
  writeStore(next);
  return next.find((k) => normalizeLicenseKey(k.license_key) === target) || null;
};

export const findLicenseKey = (license_key: string) =>
  readStore().find((k) => normalizeLicenseKey(k.license_key) === normalizeLicenseKey(license_key)) || null;

export const findLicenseKeyByCode = (license_key: string) => {
  const target = normalizeLicenseKey(license_key);
  if (!target) return null;
  return readStore().find((k) => normalizeLicenseKey(k.license_key) === target) || null;
};

export const markLicenseKeyActivated = (license_key: string) => {
  const target = normalizeLicenseKey(license_key);
  const list = readStore();
  const exists = list.some((k) => normalizeLicenseKey(k.license_key) === target);
  return exists ? list.find((k) => normalizeLicenseKey(k.license_key) === target) || null : null;
};

type ActivationResult =
  | { ok: true; license: LicensePayload; key: LicenseKeyPayload }
  | { ok: false; error: string };

export const activateLicenseKey = (
  payload: LicenseKeyPayload,
  options: { school_uid: string; school_name?: string; hwid?: string; isProgrammerDevice?: boolean; allowProgrammerBypass?: boolean; isHostEnvironment?: boolean; isFirstRun?: boolean } // programmer devices blocked by default
): ActivationResult => {
  const hwid = options.hwid || getHWID();
  const normalizedKey = normalizeLicenseKey(payload.license_key);
  devLog('[LICENSE][ACTIVATE][START]', {
    key: normalizedKey,
    school_uid: payload.school_uid,
    expires_at: payload.expires_at,
    signature: payload.signature?.slice(0, 12)
  });

  const programmerFlag = (() => {
    try {
      return localStorage.getItem('EDULOGIC_PROGRAMMER_CREDENTIALS_V1') || localStorage.getItem('EDULOGIC_PROGRAMMER_CONTEXT_V1');
    } catch {
      return null;
    }
  })();

  const programmerDevice = options.isProgrammerDevice ?? !!programmerFlag;
  const allowProgrammerActivate =
    programmerDevice &&
    (options.allowProgrammerBypass || isDemoMode() || options.isHostEnvironment || options.isFirstRun);

  if (programmerDevice && !allowProgrammerActivate) {
    devLog('[LICENSE][ACTIVATE][BLOCK] programmer device');
    return { ok: false, error: 'PROGRAMMER_DEVICE_BLOCKED' };
  }

  if (!verifyLicenseKey(payload.license_key, payload)) {
    devLog('[LICENSE][ACTIVATE][FAIL] signature mismatch');
    return { ok: false, error: 'INVALID_SIGNATURE' };
  }

  if (payload.revoked) return { ok: false, error: 'KEY_REVOKED' };
  if (payload.activated && payload.bound_hwid && payload.bound_hwid !== hwid) {
    return { ok: false, error: 'KEY_ALREADY_USED' };
  }
  const now = new Date();
  if (new Date(payload.expires_at).getTime() < now.getTime()) {
    devLog('[LICENSE][ACTIVATE][FAIL] expired');
    return { ok: false, error: 'KEY_EXPIRED' };
  }
  if (payload.activated) {
    devLog('[LICENSE][ACTIVATE][FAIL] already activated');
    return { ok: false, error: 'KEY_ALREADY_ACTIVATED' };
  }

  const start = now.toISOString();
  const parsedExpiry = payload.expires_at ? new Date(payload.expires_at) : null;
  const expiryDate = parsedExpiry && !Number.isNaN(parsedExpiry.getTime())
    ? parsedExpiry
    : new Date(now.getTime() + Math.max(1, payload.duration_days) * 24 * 60 * 60 * 1000);
  const end = expiryDate.toISOString();
  const vault = loadLicense();
  const issuedKeys = vault?.issued_keys || [];
  const mergedKeys = (() => {
    const others = issuedKeys.filter((k) => normalizeLicenseKey(k.license_key) !== normalizeLicenseKey(payload.license_key));
    return [
      ...others,
      payload
    ];
  })();
  const license: LicensePayload = {
    school_uid: options.school_uid,
    device_fingerprint: hwid,
    license_type: payload.license_type === 'paid' ? 'paid' : 'trial',
    start_date: start,
    end_date: end,
    expires_at: end,
    license_key: payload.license_key,
    issued_keys: mergedKeys,
    last_verified_at: start,
    signature: ''
  };
  license.signature = signLicensePayload({ ...license });

  clearPersistedLicense();
  const saved = saveLicense(license);
  if (!saved) {
    devLog('[LICENSE][ACTIVATE][FAIL] save failed');
    return { ok: false, error: 'LICENSE_SAVE_FAILED' };
  }

  const updatedKey = markLicenseKeyActivated(payload.license_key);

  return { ok: true, license, key: updatedKey || payload };
};
