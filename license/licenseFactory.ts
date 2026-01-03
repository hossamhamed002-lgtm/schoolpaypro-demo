import { LicensePayload, UnsignedLicensePayload } from './types';
import { licenseExists } from './licenseStorage';
import getHWID from './hwid';
import { getNodeCrypto, getNodeFs, getNodeOs, getNodePath, isNodeRuntime } from './runtime';

const nodeCrypto = getNodeCrypto();
const nodeFs = getNodeFs();
const nodeOs = getNodeOs();
const nodePath = getNodePath();

const APP_PRIVATE_KEY = 'EDULOGIC_APP_PRIVATE_KEY_MOCK__V1';
const TRIAL_FLAG_PREFIX = 'TRIAL_USED__';
const TRIAL_FLAG_FILE = '.edulogic_trial_flags';
const TRIAL_LENGTH_DAYS = 14;

const fallbackHash = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
};

const getTrialFlagPath = () => {
  if (!isNodeRuntime || !nodeOs || !nodePath) return null;
  try {
    const home = nodeOs.homedir();
    if (!home) return null;
    return nodePath.join(home, TRIAL_FLAG_FILE);
  } catch {
    return null;
  }
};

const getTrialKey = (hwid: string) => `${TRIAL_FLAG_PREFIX}${hwid}`;

const loadTrialFlags = (): Record<string, boolean> => {
  const filePath = getTrialFlagPath();
  if (filePath && nodeFs?.existsSync(filePath)) {
    try {
      const parsed = JSON.parse(nodeFs.readFileSync(filePath, 'utf8'));
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // ignore corrupt file; fall back to in-memory/localStorage
    }
  }
  return {};
};

const persistTrialFlags = (flags: Record<string, boolean>) => {
  const filePath = getTrialFlagPath();
  if (filePath && nodeFs) {
    try {
      nodeFs.writeFileSync(filePath, JSON.stringify(flags), { encoding: 'utf8' });
    } catch {
      // ignore
    }
  }
};

const hasTrialFlagInStorage = (key: string) => {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key) === '1';
    }
  } catch {
    // ignore
  }
  return false;
};

const setTrialFlagInStorage = (key: string) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, '1');
    }
  } catch {
    // ignore
  }
};

export const hasTrialBeenUsed = (hwid: string): boolean => {
  const key = getTrialKey(hwid);
  if (hasTrialFlagInStorage(key)) return true;
  const flags = loadTrialFlags();
  return !!flags[key];
};

export const markTrialUsed = (hwid: string) => {
  const key = getTrialKey(hwid);
  setTrialFlagInStorage(key);
  const flags = { ...loadTrialFlags(), [key]: true };
  persistTrialFlags(flags);
};

const buildSignable = (payload: UnsignedLicensePayload) => ({
  school_uid: payload.school_uid,
  device_fingerprint: payload.device_fingerprint,
  license_type: payload.license_type,
  start_date: payload.start_date,
  end_date: payload.end_date,
  last_verified_at: payload.last_verified_at || ''
});

const canonicalize = (payload: UnsignedLicensePayload) => JSON.stringify(buildSignable(payload));

export const signLicensePayload = (payload: UnsignedLicensePayload) => {
  if (nodeCrypto?.createHmac) {
    try {
      return nodeCrypto.createHmac('sha256', APP_PRIVATE_KEY).update(canonicalize(payload)).digest('hex');
    } catch {
      // ignore; fallback below
    }
  }
  return fallbackHash(`${APP_PRIVATE_KEY}::${canonicalize(payload)}`);
};

export const createTrialLicense = (school_uid: string, hwid: string): LicensePayload => {
  const deviceId = hwid || getHWID();
  if (hasTrialBeenUsed(deviceId)) {
    throw new Error('TRIAL_ALREADY_USED');
  }
  if (licenseExists()) {
    throw new Error('LICENSE_ALREADY_EXISTS');
  }
  const now = new Date();
  const end = new Date(now.getTime() + TRIAL_LENGTH_DAYS * 24 * 60 * 60 * 1000);
  const unsigned: UnsignedLicensePayload = {
    school_uid,
    device_fingerprint: deviceId,
    license_type: 'trial',
    start_date: now.toISOString(),
    end_date: end.toISOString(),
    last_verified_at: now.toISOString()
  };
  const signature = signLicensePayload(unsigned);
  const license: LicensePayload = { ...unsigned, signature };
  markTrialUsed(deviceId);
  return license;
};

export const createPaidLicense = (
  payloadFromAdmin: UnsignedLicensePayload & { signature?: string }
): LicensePayload => {
  const normalized: UnsignedLicensePayload = {
    ...payloadFromAdmin,
    license_type: payloadFromAdmin.license_type || 'paid',
    last_verified_at: payloadFromAdmin.last_verified_at || payloadFromAdmin.start_date
  };
  const signature = payloadFromAdmin.signature || signLicensePayload(normalized);
  return { ...normalized, signature };
};
