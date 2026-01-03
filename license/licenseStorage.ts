import { isDemoMode } from '../src/guards/appMode';
import { LicensePayload } from './types';
import getHWID from './hwid';
import { getNodeCrypto, getNodeFs, getNodeOs, getNodePath, isNodeRuntime } from './runtime';

const nodeCrypto = getNodeCrypto();
const nodeFs = getNodeFs();
const nodeOs = getNodeOs();
const nodePath = getNodePath();

const STORAGE_KEY = '__EDULOGIC_LICENSE_V1';
const STORAGE_FILENAME = '.edulogic_license_v1';
const AES_ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

const getLocalStorage = () => {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // ignore
  }
  return null;
};

const getFilePath = () => {
  if (!isNodeRuntime || !nodeOs || !nodePath) return null;
  try {
    const home = nodeOs.homedir();
    if (!home) return null;
    return nodePath.join(home, STORAGE_FILENAME);
  } catch {
    return null;
  }
};

const encodeBase64 = (value: string) => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf8').toString('base64');
  }
  if (typeof btoa !== 'undefined') {
    return btoa(unescape(encodeURIComponent(value)));
  }
  return value;
};

const decodeBase64 = (value: string) => {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('utf8');
  }
  if (typeof atob !== 'undefined') {
    return decodeURIComponent(escape(atob(value)));
  }
  return value;
};

const readPersisted = (): string | null => {
  if (isDemoMode()) return null;
  const storage = getLocalStorage();
  if (storage) {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) return raw;
  }
  const filePath = getFilePath();
  if (filePath && nodeFs?.existsSync(filePath)) {
    try {
      return nodeFs.readFileSync(filePath, 'utf8');
    } catch {
      return null;
    }
  }
  return null;
};

const persist = (value: string) => {
  if (isDemoMode()) return;
  const storage = getLocalStorage();
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore quota errors to keep offline flow alive
    }
  }
  const filePath = getFilePath();
  if (filePath && nodeFs) {
    try {
      nodeFs.writeFileSync(filePath, value, { encoding: 'utf8' });
    } catch {
      // ignore write failures
    }
  }
};

const deriveKey = (hwid: string) => {
  if (nodeCrypto?.createHash) {
    return nodeCrypto.createHash('sha256').update(`EDULOGIC_LICENSE_SALT::${hwid}`).digest();
  }
  const fallback = encodeBase64(`EDULOGIC_LICENSE_SALT::${hwid}`).slice(0, 32);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(fallback.padEnd(32, '0')).subarray(0, 32);
  }
  return fallback;
};

const encryptPayload = (payload: LicensePayload, hwid: string) => {
  if (nodeCrypto?.createCipheriv && nodeCrypto?.randomBytes) {
    try {
      const iv = nodeCrypto.randomBytes(IV_LENGTH);
      const key = deriveKey(hwid);
      const normalizedKey = typeof key === 'string'
        ? Buffer.from(key.padEnd(32, '0')).subarray(0, 32)
        : key;
      const cipher = nodeCrypto.createCipheriv(AES_ALGO, normalizedKey, iv);
      const serialized = Buffer.from(JSON.stringify(payload), 'utf8');
      const encrypted = Buffer.concat([cipher.update(serialized), cipher.final()]);
      const tag = cipher.getAuthTag();
      return Buffer.concat([iv, tag, encrypted]).toString('base64');
    } catch {
      // fall through to lightweight encoding
    }
  }
  return encodeBase64(JSON.stringify(payload));
};

const decryptPayload = (encrypted: string, hwid: string): LicensePayload | null => {
  if (nodeCrypto?.createDecipheriv) {
    try {
      const buffer = Buffer.from(encrypted, 'base64');
      const iv = buffer.subarray(0, IV_LENGTH);
      const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
      const data = buffer.subarray(IV_LENGTH + TAG_LENGTH);
      const key = deriveKey(hwid);
      const normalizedKey = typeof key === 'string'
        ? Buffer.from(key.padEnd(32, '0')).subarray(0, 32)
        : key;
      const decipher = nodeCrypto.createDecipheriv(AES_ALGO, normalizedKey, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
      return JSON.parse(decrypted.toString('utf8')) as LicensePayload;
    } catch {
      // fallback below
    }
  }
  try {
    const decoded = decodeBase64(encrypted);
    return JSON.parse(decoded) as LicensePayload;
  } catch {
    return null;
  }
};

export const licenseExists = () => !!readPersisted();

export const loadLicense = (): LicensePayload | null => {
  const raw = readPersisted();
  if (!raw) return null;
  return decryptPayload(raw, getHWID());
};

export const saveLicense = (
  payload: LicensePayload,
  options?: { allowUpdate?: boolean }
): boolean => {
  if (licenseExists() && !options?.allowUpdate) return false;
  const encrypted = encryptPayload(payload, getHWID());
  persist(encrypted);
  return true;
};
