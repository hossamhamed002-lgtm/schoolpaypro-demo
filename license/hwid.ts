import { isDemoMode } from '../src/guards/appMode';
import { getNodeCrypto, getNodeFs, getNodeOs, getNodePath, isNodeRuntime } from './runtime';

const nodeCrypto = getNodeCrypto();
const nodeFs = getNodeFs();
const nodeOs = getNodeOs();
const nodePath = getNodePath();

const CACHE_KEY = 'EDULOGIC_DEVICE_FINGERPRINT_V1';
const CACHE_FILENAME = '.edulogic_device_fingerprint';

let cached: string | null = null;

const fallbackHash = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
};

const hashFingerprint = (source: string) => {
  if (nodeCrypto?.createHash) {
    try {
      return nodeCrypto.createHash('sha256').update(source).digest('hex');
    } catch {
      // ignore and use fallback
    }
  }
  return fallbackHash(source);
};

const getCacheFilePath = () => {
  if (!isNodeRuntime || !nodeOs || !nodePath) return null;
  try {
    const home = nodeOs.homedir();
    if (!home) return null;
    return nodePath.join(home, CACHE_FILENAME);
  } catch {
    return null;
  }
};

const getLocalStorage = () => {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // ignore
  }
  return null;
};

const readPersisted = (): string | null => {
  if (isDemoMode()) return null;
  const storage = getLocalStorage();
  if (storage) {
    const stored = storage.getItem(CACHE_KEY);
    if (stored) return stored;
  }
  const filePath = getCacheFilePath();
  if (filePath && nodeFs?.existsSync(filePath)) {
    try {
      return nodeFs.readFileSync(filePath, 'utf8').trim() || null;
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
      storage.setItem(CACHE_KEY, value);
    } catch {
      // ignore write failures to keep offline-first flow
    }
  }
  const filePath = getCacheFilePath();
  if (filePath && nodeFs) {
    try {
      nodeFs.writeFileSync(filePath, value, { encoding: 'utf8' });
    } catch {
      // ignore write failures
    }
  }
};

const readMachineId = () => {
  if (!isNodeRuntime || !nodeFs || !nodePath) return '';
  const candidates = [
    '/etc/machine-id',
    '/var/lib/dbus/machine-id'
  ];

  if (typeof process !== 'undefined' && process.platform === 'win32') {
    const programData = process.env.PROGRAMDATA || 'C:\\ProgramData';
    candidates.push(nodePath.join(programData, 'edulogic.machine.id'));
  }

  for (const candidate of candidates) {
    try {
      if (nodeFs.existsSync(candidate)) {
        const raw = nodeFs.readFileSync(candidate, 'utf8').trim();
        if (raw) return raw;
      }
    } catch {
      // best-effort; keep looking
    }
  }
  return '';
};

const readDiskIdentifier = () => {
  if (!isNodeRuntime || !nodeFs || !nodePath) return '';
  try {
    const rootPath = typeof process !== 'undefined' && process.platform === 'win32'
      ? `${process.cwd().split(nodePath.sep)[0]}${nodePath.sep}`
      : '/';
    const stat = nodeFs.statSync(rootPath);
    return `${stat.dev}-${stat.ino || ''}-${stat.mode}`;
  } catch {
    return '';
  }
};

const buildFingerprintSource = () => {
  const cpuInfo = (() => {
    try {
      const cpus = nodeOs?.cpus?.() || [];
      return cpus.map((c) => `${c.model}-${c.speed}-${c.times.user}-${c.times.sys}`).join('|');
    } catch {
      return 'cpu-unknown';
    }
  })();

  const platformInfo = (() => {
    try {
      const platform = nodeOs?.platform?.() || 'unknown';
      const arch = nodeOs?.arch?.() || 'na';
      return `${platform}-${arch}`;
    } catch {
      return 'platform-unknown';
    }
  })();

  const machineId = readMachineId();
  const diskId = readDiskIdentifier();
  const host = (() => {
    try {
      return nodeOs?.hostname?.() || 'host-unknown';
    } catch {
      return 'host-unknown';
    }
  })();

  return [cpuInfo, platformInfo, machineId, diskId, host].filter(Boolean).join('::');
};

export const getHWID = (): string => {
  if (isDemoMode()) return 'demo-hwid';
  if (cached) return cached;
  const stored = readPersisted();
  if (stored) {
    cached = stored;
    return stored;
  }
  const source = buildFingerprintSource();
  const fingerprint = hashFingerprint(source);
  persist(fingerprint);
  cached = fingerprint;
  return fingerprint;
};

export default getHWID;
