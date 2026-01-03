import { isDemoMode, isDemoExpired } from './src/guards/appMode';
import { getDemoSession } from './src/demo/demoSession';
import { load as loadData, save as saveData, StorageScope } from './src/storage/dataLayer';

// المفتاح الثابت والنهائي - لن يتغير أبداً لضمان الاستقرار
export const DB_KEY = 'EDULOGIC_ULTRA_PERSISTENT_DB';
const UID_MAP_KEY = 'SCHOOL_UID_MAP_V1';

const buildScopedKey = (key: string, namespace?: string) =>
  namespace ? `${key}__${namespace}` : key;

// البحث في كافة المفاتيح التي قد تكون البيانات مخزنة بها من إصدارات سابقة
const SEARCH_KEYS = [
  'EDULOGIC_MASTER_DB_V2',
  'EDULOGIC_MASTER_DB',
  'EDULOGIC_VAULT',
  'EDULOGIC_DB'
];

const mergeDeep = (target: any, source: any) => {
  if (!source) return target;
  const output = { ...target };
  
  Object.keys(source).forEach(key => {
    if (Array.isArray(source[key])) {
      // إذا كانت المصفوفة في التخزين تحتوي بيانات، لا تستبدلها أبداً ببيانات الكود الفارغة
      if (source[key].length > 0) {
        output[key] = source[key];
      } else if (!output[key]) {
        output[key] = [];
      }
    } else if (source[key] !== null && typeof source[key] === 'object') {
      output[key] = mergeDeep(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  });
  return output;
};

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

const getUidForNamespace = (code?: string): string | null => {
  if (!code) return null;
  const map = readUidMap();
  return map[code] || null;
};

export const saveToStorage = (data: any, namespace?: string) => {
  const demoRuntime = isDemoMode() && !!getDemoSession() && !isDemoExpired();
  if (isDemoMode() && isDemoExpired()) throw new Error('DEMO_EXPIRED_READ_ONLY');
  if (demoRuntime) return true;
  if (isDemoMode()) return true;
  try {
    const scopedKey = buildScopedKey(DB_KEY, namespace);
    const saved = saveData(StorageScope.SCHOOL_DATA, scopedKey, data);
    if (saved) {
      const serializedData = typeof data === 'string' ? data : JSON.stringify(data);
      sessionStorage.setItem(buildScopedKey(DB_KEY + '_SESSION_BACKUP', namespace), serializedData);
      const uid = getUidForNamespace(namespace);
      if (uid) {
        const uidKey = buildScopedKey(DB_KEY, uid);
        saveData(StorageScope.SCHOOL_DATA, uidKey, data);
        sessionStorage.setItem(buildScopedKey(DB_KEY + '_SESSION_BACKUP', uid), serializedData);
      }
    }
    return saved;
  } catch (e) {
    return false;
  }
};


export const loadFromStorageKey = <T>(key: string, fallback: T, namespace?: string): T =>
  (() => {
    if (isDemoMode()) return fallback;
    const uid = getUidForNamespace(namespace);
    if (uid) {
      const uidScoped = loadData<T | null>(StorageScope.SCHOOL_DATA, buildScopedKey(key, uid), null);
      if (uidScoped !== null && uidScoped !== undefined) return uidScoped;
    }
    return loadData(StorageScope.SCHOOL_DATA, buildScopedKey(key, namespace), fallback);
  })();

export const saveToStorageKey = (key: string, data: unknown, namespace?: string) => {
  const demoRuntime = isDemoMode() && !!getDemoSession() && !isDemoExpired();
  if (isDemoMode() && isDemoExpired()) throw new Error('DEMO_EXPIRED_READ_ONLY');
  if (demoRuntime) return true;
  if (isDemoMode()) return true;
  try {
    saveData(StorageScope.SCHOOL_DATA, buildScopedKey(key, namespace), data);
    const uid = getUidForNamespace(namespace);
    if (uid) {
      saveData(StorageScope.SCHOOL_DATA, buildScopedKey(key, uid), data);
    }
  } catch {
    // Ignore write failures (quota, serialization).
  }
};

export const loadFromStorage = (initialState: any, namespace?: string) => {
  if (isDemoMode()) return initialState;
  const scopedKey = buildScopedKey(DB_KEY, namespace);
  const uid = getUidForNamespace(namespace);

  const tryLoad = (key: string, scope: string | undefined) =>
    loadData<any | null>(StorageScope.SCHOOL_DATA, buildScopedKey(key, scope), null);

  let saved: any = null;

  if (uid) {
    saved = tryLoad(DB_KEY, uid);
    if (!saved) {
      for (const key of SEARCH_KEYS) {
        const legacyUid = tryLoad(key, uid);
        if (legacyUid) {
          saved = legacyUid;
          break;
        }
      }
    }
    if (!saved) {
      const backupUid = sessionStorage.getItem(buildScopedKey(DB_KEY + '_SESSION_BACKUP', uid));
      if (backupUid) {
        try {
          saved = JSON.parse(backupUid);
        } catch {
          saved = null;
        }
      }
    }
  }

  if (!saved) {
    saved = tryLoad(DB_KEY, namespace);
  }

  if (!saved) {
    for (const key of SEARCH_KEYS) {
      const legacy = tryLoad(key, namespace);
      if (legacy) {
        saved = legacy;
        saveData(StorageScope.SCHOOL_DATA, scopedKey, legacy);
        break;
      }
    }
  }

  if (!saved) {
    const backup = sessionStorage.getItem(buildScopedKey(DB_KEY + '_SESSION_BACKUP', namespace));
    if (backup) {
      try {
        saved = JSON.parse(backup);
      } catch {
        saved = null;
      }
    }
  }

  if (!saved) return initialState;

  try {
    return mergeDeep(initialState, saved);
  } catch (e) {
    return initialState;
  }
};

export const getSchoolLogoByCode = (schoolCode: string) => {
  const normalized = schoolCode.trim().toUpperCase();
  if (!normalized) return null;
  const scoped = loadFromStorage({ schools: [] }, normalized);
  const school = scoped.schools?.[0];
  return school?.Logo || null;
};
export const exportDatabase = (data: any) => {
  const demoRuntime = isDemoMode() && !!getDemoSession() && !isDemoExpired();
  if (isDemoMode() && isDemoExpired()) throw new Error('DEMO_EXPIRED_READ_ONLY');
  if (demoRuntime) {
    return;
  }
  if (isDemoMode()) {
    return;
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `edulogic_backup_${date}.json`;
  link.click();
};

export const importDatabase = (file: File): Promise<any> => {
  const demoRuntime = isDemoMode() && !!getDemoSession() && !isDemoExpired();
  if (isDemoMode() && isDemoExpired()) throw new Error('DEMO_EXPIRED_READ_ONLY');
  if (demoRuntime) {
    return Promise.resolve({});
  }
  if (isDemoMode()) {
    return Promise.resolve({});
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.schools) resolve(data);
        else reject("Invalid Data");
      } catch (err) {
        reject("Parse Error");
      }
    };
    reader.readAsText(file);
  });
};
