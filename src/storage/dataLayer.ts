import { isDemoMode } from '../guards/appMode';

export enum StorageScope {
  SCHOOL_DATA = 'SCHOOL_DATA',
  FINANCE_DATA = 'FINANCE_DATA',
  HR_DATA = 'HR_DATA',
  EXAM_DATA = 'EXAM_DATA',
  SETTINGS = 'SETTINGS',
  CACHE_ONLY = 'CACHE_ONLY'
}

export interface StorageDriver {
  load<T>(scope: StorageScope, key: string, fallback: T, namespace?: string): T;
  save(scope: StorageScope, key: string, value: unknown, namespace?: string): boolean;
  remove(scope: StorageScope, key: string, namespace?: string): void;
  clearScope(scope: StorageScope, namespace?: string): void;
}

const MB = 1024 * 1024;

const isBlobLike = (value: unknown) => {
  if (typeof Blob === 'undefined') return false;
  return value instanceof Blob || (typeof File !== 'undefined' && value instanceof File);
};

const stringifyValue = (value: unknown): string | null => {
  if (isBlobLike(value)) return null;
  try {
    return typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return null;
  }
};

const isWithinLimit = (serialized: string) => {
  const size = new TextEncoder().encode(serialized).length;
  return size <= MB;
};

const buildKey = (scope: StorageScope, key: string, namespace?: string) => {
  const baseKey = namespace ? `${key}__${namespace}` : key;
  return {
    primary: `${scope}__${baseKey}`,
    legacy: baseKey
  };
};

class LocalStorageDriver implements StorageDriver {
  load<T>(scope: StorageScope, key: string, fallback: T, namespace?: string): T {
    if (typeof window === 'undefined') return fallback;
    const { primary, legacy } = buildKey(scope, key, namespace);
    const raw = window.localStorage.getItem(primary) ?? window.localStorage.getItem(legacy);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  save(scope: StorageScope, key: string, value: unknown, namespace?: string): boolean {
    if (isDemoMode()) {
      console.info('[DEMO] Persistence blocked');
      return true;
    }
    if (typeof window === 'undefined') return false;
    const serialized = stringifyValue(value);
    if (!serialized || !isWithinLimit(serialized)) return false;
    const { primary } = buildKey(scope, key, namespace);
    try {
      window.localStorage.setItem(primary, serialized);
      return true;
    } catch {
      return false;
    }
  }

  remove(scope: StorageScope, key: string, namespace?: string): void {
    if (isDemoMode()) {
      console.info('[DEMO] Remove blocked');
      return;
    }
    if (typeof window === 'undefined') return;
    const { primary, legacy } = buildKey(scope, key, namespace);
    window.localStorage.removeItem(primary);
    window.localStorage.removeItem(legacy);
  }

  clearScope(scope: StorageScope): void {
    if (isDemoMode()) {
      console.info('[DEMO] Clear blocked');
      return;
    }
    if (typeof window === 'undefined') return;
    const prefix = `${scope}__`;
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => window.localStorage.removeItem(k));
  }
}

const driver: StorageDriver = new LocalStorageDriver();

export const load = <T>(scope: StorageScope, key: string, fallback: T, namespace?: string) =>
  driver.load(scope, key, fallback, namespace);

export const save = (scope: StorageScope, key: string, value: unknown, namespace?: string) =>
  driver.save(scope, key, value, namespace);

export const remove = (scope: StorageScope, key: string, namespace?: string) =>
  driver.remove(scope, key, namespace);

export const clearScope = (scope: StorageScope, namespace?: string) =>
  driver.clearScope(scope, namespace);
