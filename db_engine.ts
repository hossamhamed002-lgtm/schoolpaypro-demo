import { isDemoMode, showDemoToast } from './src/guards/appMode';
import { clearScope, load as loadData, save as saveData, StorageScope } from './src/storage/dataLayer';

// المفتاح الثابت والنهائي - لن يتغير أبداً لضمان الاستقرار
export const DB_KEY = 'EDULOGIC_ULTRA_PERSISTENT_DB';
const UID_MAP_KEY = 'SCHOOL_UID_MAP_V1';

const buildScopedKey = (key: string, namespace?: string) =>
  namespace ? `${key}__${namespace}` : key;
const DEMO_NAMESPACE = 'DEMO_DB_V1';
const DEMO_SESSION_KEY = 'DEMO_SESSION_ID';
const DEMO_EXPIRES_KEY = 'DEMO_EXPIRES_AT';
const DEMO_TTL_MS = 24 * 60 * 60 * 1000;

const ensureDemoNamespace = () => {
  if (!isDemoMode()) return null;
  try {
    const storage = localStorage;
    const now = Date.now();
    const storedNs = storage.getItem(DEMO_SESSION_KEY);
    const storedExp = Number(storage.getItem(DEMO_EXPIRES_KEY) || 0);
    const expired = !storedNs || !storedExp || storedExp < now;
    if (expired) {
      if (storedNs) {
        clearScope(StorageScope.SCHOOL_DATA, storedNs);
        clearScope(StorageScope.SETTINGS, storedNs);
      }
      const session = `${DEMO_NAMESPACE}_${Math.random().toString(36).slice(2, 8)}_${Date.now()}`;
      storage.setItem(DEMO_SESSION_KEY, session);
      storage.setItem(DEMO_EXPIRES_KEY, (now + DEMO_TTL_MS).toString());
      return session;
    }
    return storedNs;
  } catch {
    return DEMO_NAMESPACE;
  }
};

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
  const scopedNamespace = isDemoMode() ? ensureDemoNamespace() || DEMO_NAMESPACE : namespace;
  try {
    const scopedKey = buildScopedKey(DB_KEY, scopedNamespace);
    const saved = saveData(StorageScope.SCHOOL_DATA, scopedKey, data);
    if (saved) {
      const serializedData = typeof data === 'string' ? data : JSON.stringify(data);
      sessionStorage.setItem(buildScopedKey(DB_KEY + '_SESSION_BACKUP', scopedNamespace), serializedData);
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
    const uid = getUidForNamespace(namespace);
    if (uid) {
      const uidScoped = loadData<T | null>(StorageScope.SCHOOL_DATA, buildScopedKey(key, uid), null);
      if (uidScoped !== null && uidScoped !== undefined) return uidScoped;
    }
    return loadData(StorageScope.SCHOOL_DATA, buildScopedKey(key, namespace), fallback);
  })();

export const saveToStorageKey = (key: string, data: unknown, namespace?: string) => {
  const scopedNamespace = isDemoMode() ? ensureDemoNamespace() || DEMO_NAMESPACE : namespace;
  try {
    saveData(StorageScope.SCHOOL_DATA, buildScopedKey(key, scopedNamespace), data);
    const uid = getUidForNamespace(namespace);
    if (uid) {
      saveData(StorageScope.SCHOOL_DATA, buildScopedKey(key, uid), data);
    }
  } catch {
    // Ignore write failures (quota, serialization).
  }
};

export const loadFromStorage = (initialState: any, namespace?: string) => {
  const scopedNamespace = isDemoMode() ? ensureDemoNamespace() || DEMO_NAMESPACE : namespace;
  const scopedKey = buildScopedKey(DB_KEY, scopedNamespace);
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
    saved = tryLoad(DB_KEY, scopedNamespace);
  }

  if (!saved) {
    for (const key of SEARCH_KEYS) {
      const legacy = tryLoad(key, scopedNamespace);
      if (legacy) {
        saved = legacy;
        saveData(StorageScope.SCHOOL_DATA, scopedKey, legacy);
        break;
      }
    }
  }

  if (!saved) {
    const backup = sessionStorage.getItem(buildScopedKey(DB_KEY + '_SESSION_BACKUP', scopedNamespace));
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
  if (isDemoMode()) {
    console.info('[DEMO] Export blocked');
    showDemoToast('نسخة تجريبية – لا يتم حفظ أو تصدير البيانات');
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
  if (isDemoMode()) {
    console.info('[DEMO] Import blocked');
    showDemoToast('نسخة تجريبية – لا يتم حفظ أو تصدير البيانات');
    return Promise.reject('الاستعادة متاحة في النسخة الكاملة فقط');
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
