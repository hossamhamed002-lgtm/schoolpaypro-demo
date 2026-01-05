import { isDemoMode } from '../guards/appMode';

const PREFIX = 'SPP';

const buildKey = (namespace: string, key: string) => {
  const suffix = isDemoMode() ? ':demo' : '';
  return `${PREFIX}:${namespace}:${key}${suffix}`;
};

const isDev = (import.meta as any)?.env?.DEV;

const safeParse = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const StorageAdapter = {
  get<T>(namespace: string, key: string): T | null {
    if (typeof localStorage === 'undefined') return null;
    return safeParse<T>(localStorage.getItem(buildKey(namespace, key)));
  },

  set<T>(namespace: string, key: string, value: T): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(buildKey(namespace, key), JSON.stringify(value));
    } catch {
      // ignore write errors silently
    }
  },

  remove(namespace: string, key: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(buildKey(namespace, key));
    } catch {
      // ignore
    }
  },

  clear(namespace: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const prefix = `${PREFIX}:${namespace}:`;
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith(prefix)) localStorage.removeItem(k);
      });
    } catch {
      // ignore
    }
  },

  readSafe<T>(namespace: string, key: string, fallback: T): T {
    const value = this.get<T>(namespace, key);
    if (value === null) {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.info('[STORAGE][FALLBACK]', namespace, key);
      }
      return fallback;
    }
    return value;
  }
};
