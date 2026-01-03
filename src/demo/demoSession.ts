const DEMO_DURATION_MS = 24 * 60 * 60 * 1000; // 24 ساعة
const DEMO_SESSION_KEY = 'EDULOGIC_DEMO_SESSION_V1';

export interface DemoSession {
  startedAt: number;
  expiresAt: number;
}

const getSessionStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export const getDemoSession = (): DemoSession | null => {
  const storage = getSessionStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(DEMO_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoSession;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.startedAt !== 'number' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      storage.removeItem(DEMO_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    storage.removeItem(DEMO_SESSION_KEY);
    return null;
  }
};

export const createDemoSession = (): DemoSession => {
  const existing = getDemoSession();
  if (existing) return existing;

  const now = Date.now();
  const session: DemoSession = {
    startedAt: now,
    expiresAt: now + DEMO_DURATION_MS
  };

  const storage = getSessionStorage();
  if (storage) {
    try {
      storage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    } catch {
      // ignore write errors
    }
  }

  return session;
};

export const isDemoExpired = (): boolean => {
  const session = getDemoSession();
  if (!session) return true;
  return Date.now() > session.expiresAt;
};

export const getRemainingDemoTime = (): number => {
  if (isDemoExpired()) return 0;
  const session = getDemoSession();
  if (!session) return 0;
  const remaining = session.expiresAt - Date.now();
  return remaining > 0 ? remaining : 0;
};

export const clearDemoSession = (): void => {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(DEMO_SESSION_KEY);
  } catch {
    // ignore
  }
};

export { DEMO_DURATION_MS, DEMO_SESSION_KEY };
