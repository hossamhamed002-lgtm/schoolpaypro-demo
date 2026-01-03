import crypto from 'crypto';

export type HWIDSource = 'desktop' | 'web';

const HWID_STORAGE_KEY = 'EDULOGIC_HWID_V1';

const getLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const hashSha256 = (input: string): string => {
  try {
    return crypto.createHash('sha256').update(input).digest('hex');
  } catch {
    // Browser fallback using Web Crypto
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      return window.crypto.subtle.digest('SHA-256', data).then((buf) => {
        const bytes = Array.from(new Uint8Array(buf));
        return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
      }) as unknown as string; // hashed synchronously below via node path; here best-effort
    }
    return input;
  }
};

const hashSync = (input: string): string => {
  if (typeof window === 'undefined') {
    return hashSha256(input);
  }
  if (crypto && typeof crypto.createHash === 'function') {
    return hashSha256(input);
  }
  // Web-only synchronous fallback using simple hash (non-cryptographic) if SubtleCrypto promise path can't be used synchronously
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16);
};

const collectDesktopFingerprint = (): Record<string, string> => {
  try {
    const os = require('os') as typeof import('os');
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');

    const platform = os.platform();
    const release = os.release();
    const arch = os.arch();
    const totalMem = String(os.totalmem());
    const cpus = os.cpus?.() || [];
    const cpuModel = cpus[0]?.model || '';
    const cpuCount = String(cpus.length);
    let diskId = '';
    try {
      const rootStat = fs.statSync(path.sep);
      diskId = `${rootStat.dev || ''}-${rootStat.ino || ''}`;
    } catch {
      diskId = '';
    }
    const host = os.hostname ? os.hostname() : '';

    return {
      platform,
      release,
      arch,
      totalMem,
      cpuModel,
      cpuCount,
      diskId,
      host
    };
  } catch {
    return {};
  }
};

const collectWebFingerprint = (): Record<string, string> => {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return {};
  return {
    userAgent: navigator.userAgent || '',
    platform: navigator.platform || '',
    language: navigator.language || '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    screen: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    cores: typeof navigator.hardwareConcurrency === 'number' ? String(navigator.hardwareConcurrency) : ''
  };
};

const detectSource = (): HWIDSource => {
  if (typeof window === 'undefined') return 'desktop';
  return 'web';
};

export function getRawHWIDFingerprint(): Record<string, string> {
  const source = detectSource();
  return source === 'desktop' ? collectDesktopFingerprint() : collectWebFingerprint();
}

export function getHWIDSource(): HWIDSource {
  return detectSource();
}

export function getHWID(): string {
  const storage = getLocalStorage();
  if (storage) {
    try {
      const cached = storage.getItem(HWID_STORAGE_KEY);
      if (cached) return cached;
    } catch {
      // ignore
    }
  }

  const fingerprint = getRawHWIDFingerprint();
  const source = detectSource();
  const serialized = Object.entries(fingerprint)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}:${v}`)
    .join('|');

  const hwid = hashSync(`${source}|${serialized}|EDULOGIC_HWID_SALT`);

  if (storage) {
    try {
      storage.setItem(HWID_STORAGE_KEY, hwid);
    } catch {
      // ignore
    }
  }

  if ((import.meta as any)?.env?.DEV) {
    console.info('[HWID]', { source, hwid, fingerprint });
  }

  return hwid;
}
