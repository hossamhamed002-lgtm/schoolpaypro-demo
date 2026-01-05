import { StorageAdapter } from './StorageAdapter';

export type AppMetaState = {
  firstRun: boolean;
  gatewaySeen: boolean;
  lastEntry?: 'gateway' | 'activation' | 'login' | 'programmer';
  createdAt: string;
  updatedAt: string;
};

const META_NAMESPACE = 'app';
const META_KEY = 'meta';
const isDev = (import.meta as any)?.env?.DEV;

const defaultMeta = (): AppMetaState => {
  const now = new Date().toISOString();
  return {
    firstRun: true,
    gatewaySeen: false,
    createdAt: now,
    updatedAt: now
  };
};

export const getAppMeta = (): AppMetaState => {
  const meta = StorageAdapter.get<AppMetaState>(META_NAMESPACE, META_KEY);
  if (meta) return meta;
  const fallback = defaultMeta();
  if (isDev) {
    // eslint-disable-next-line no-console
    console.info('[APP_META][FALLBACK] using default meta');
  }
  return fallback;
};

export const markGatewaySeen = () => {
  const current = getAppMeta();
  const next: AppMetaState = {
    ...current,
    firstRun: false,
    gatewaySeen: true,
    updatedAt: new Date().toISOString(),
    createdAt: current.createdAt || new Date().toISOString()
  };
  StorageAdapter.set<AppMetaState>(META_NAMESPACE, META_KEY, next);
  if (isDev) {
    // eslint-disable-next-line no-console
    console.info('[APP_META][UPDATE] gatewaySeen=true');
  }
};

export const setLastEntry = (mode: AppMetaState['lastEntry']) => {
  const current = getAppMeta();
  const next: AppMetaState = {
    ...current,
    firstRun: false,
    lastEntry: mode,
    updatedAt: new Date().toISOString(),
    createdAt: current.createdAt || new Date().toISOString()
  };
  StorageAdapter.set<AppMetaState>(META_NAMESPACE, META_KEY, next);
  if (isDev) {
    // eslint-disable-next-line no-console
    console.info('[APP_META][UPDATE] lastEntry', mode);
  }
};
