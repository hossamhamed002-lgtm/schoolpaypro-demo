import { getNodeFs, getNodeOs, getNodePath, isNodeRuntime } from './runtime';

const LOCAL_KEY = 'EDULOGIC_IFP_PRIMARY_V1';
const FILE_NAME = '.edulogic_ifp_v1';

const nodeFs = getNodeFs();
const nodeOs = getNodeOs();
const nodePath = getNodePath();

const getFilePath = () => {
  if (!isNodeRuntime || !nodeOs || !nodePath) return null;
  try {
    const home = nodeOs.homedir();
    if (!home) return null;
    return nodePath.join(home, FILE_NAME);
  } catch {
    return null;
  }
};

const readLocal = () => {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(LOCAL_KEY);
  } catch {
    return null;
  }
};

const writeLocal = (value: string) => {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LOCAL_KEY, value);
  } catch {
    // ignore
  }
};

const readSecondary = () => {
  const filePath = getFilePath();
  if (filePath && nodeFs?.existsSync(filePath)) {
    try {
      const val = nodeFs.readFileSync(filePath, 'utf8');
      return val || null;
    } catch {
      return null;
    }
  }
  return null;
};

const writeSecondary = (value: string) => {
  const filePath = getFilePath();
  if (!filePath || !nodeFs) return;
  try {
    nodeFs.writeFileSync(filePath, value, { encoding: 'utf8' });
  } catch {
    // ignore
  }
};

const randomFingerprint = () => {
  const fallback = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      return fallback;
    }
  }
  return fallback;
};

export type InstallIntegrityResult = 'OK' | 'RESET_DETECTED' | 'CLONE_DETECTED';

export const ensureInstallFingerprint = (): string => {
  const primary = readLocal();
  const secondary = readSecondary();
  if (primary && secondary) {
    if (primary !== secondary) {
      // keep primary as source of truth
      writeSecondary(primary);
      return primary;
    }
    return primary;
  }
  if (primary && !secondary) {
    writeSecondary(primary);
    return primary;
  }
  if (!primary && secondary) {
    writeLocal(secondary);
    return secondary;
  }
  const fresh = randomFingerprint();
  writeLocal(fresh);
  writeSecondary(fresh);
  return fresh;
};

export const validateInstallIntegrity = (licenseIfp?: string | null): InstallIntegrityResult => {
  const ifp = ensureInstallFingerprint();
  const secondary = readSecondary();
  const primary = readLocal();

  if (primary && secondary && primary !== secondary) {
    return 'CLONE_DETECTED';
  }

  if (licenseIfp && licenseIfp !== ifp) {
    return 'RESET_DETECTED';
  }

  return 'OK';
};

export const getCurrentInstallFingerprint = () => ensureInstallFingerprint();
