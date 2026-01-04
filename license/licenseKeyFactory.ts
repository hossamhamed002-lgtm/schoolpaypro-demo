import { getNodeCrypto, isNodeRuntime } from './runtime';
import { LicenseKeyPayload, LicenseKeyType } from './types';

const nodeCrypto = getNodeCrypto();
const APP_PRIVATE_KEY = 'EDULOGIC_APP_PRIVATE_KEY_MOCK__V1';

const fallbackHash = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
};

export const normalizeLicenseKey = (value: string) =>
  (value || '').replace(/[\s\u200B\u200C\u200D\u00A0]+/g, '').toUpperCase();

const randomBlock = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = nodeCrypto?.randomBytes ? nodeCrypto.randomBytes(4) : undefined;
  const picks = bytes ? Array.from(bytes) : Array.from({ length: 4 }, () => Math.floor(Math.random() * alphabet.length));
  return picks.map((b) => alphabet[b % alphabet.length]).join('');
};

const generateKeyString = () => [randomBlock(), randomBlock(), randomBlock(), randomBlock()].join('-');

const canonicalizeKey = (payload: Omit<LicenseKeyPayload, 'signature'>) => JSON.stringify({
  license_key: payload.license_key,
  school_name: payload.school_name,
  school_code: payload.school_code || '',
  school_uid: payload.school_uid || '',
  license_type: payload.license_type,
  duration_days: payload.duration_days,
  max_devices: payload.max_devices,
  issued_at: payload.issued_at,
  expires_at: payload.expires_at,
  issued_by: payload.issued_by,
  activated: payload.activated,
  activated_at: payload.activated_at || '',
  bound_hwid: payload.bound_hwid || '',
  revoked: payload.revoked || false
});

const signKeyPayload = (payload: Omit<LicenseKeyPayload, 'signature'>) => {
  if (nodeCrypto?.createHmac) {
    try {
      return nodeCrypto.createHmac('sha256', APP_PRIVATE_KEY).update(canonicalizeKey(payload)).digest('hex');
    } catch {
      // ignore and fallback
    }
  }
  return fallbackHash(`${APP_PRIVATE_KEY}::${canonicalizeKey(payload)}`);
};

export type GenerateLicenseKeyInput = {
  school_name: string;
  school_code?: string;
  school_uid?: string;
  license_type: LicenseKeyType;
  duration_days: number;
  max_devices?: number;
  license_key?: string;
  expires_at?: string;
};

export const generateLicenseKey = (input: GenerateLicenseKeyInput): LicenseKeyPayload => {
  const now = new Date();
  const parsedExpiry = input.expires_at ? new Date(input.expires_at) : null;
  const expires = parsedExpiry && !Number.isNaN(parsedExpiry.getTime())
    ? parsedExpiry
    : new Date(now.getTime() + Math.max(1, input.duration_days) * 24 * 60 * 60 * 1000);
  const durationDays = Math.max(1, Math.ceil((expires.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
  const licenseKey = normalizeLicenseKey(input.license_key || generateKeyString());
  const base: Omit<LicenseKeyPayload, 'signature'> = {
    license_key: licenseKey,
    school_name: input.school_name,
    school_code: input.school_code,
    school_uid: input.school_uid,
    license_type: input.license_type,
    duration_days: durationDays,
    max_devices: input.max_devices || 1,
    issued_at: now.toISOString(),
    expires_at: expires.toISOString(),
    issued_by: 'PROGRAMMER',
    activated: false,
    revoked: false
  };
  const signature = signKeyPayload(base);
  return { ...base, signature };
};

export const resignLicenseKey = (payload: LicenseKeyPayload): LicenseKeyPayload => {
  const { signature: _old, ...unsigned } = payload;
  const signature = signKeyPayload(unsigned as Omit<LicenseKeyPayload, 'signature'>);
  return { ...unsigned, signature };
};

export const verifyLicenseKey = (key: string, payload: LicenseKeyPayload) => {
  if (!payload || payload.license_key !== key) return false;
  const { signature, ...unsigned } = payload;
  const expected = signKeyPayload(unsigned);
  return signature === expected;
};

export const exportLicenseKeyPayload = (payload: LicenseKeyPayload) =>
  JSON.stringify(payload, null, 2);

export const APP_KEY_SIGNATURE = APP_PRIVATE_KEY;
