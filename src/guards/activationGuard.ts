const INTENT_KEY = 'EDULOGIC_ACTIVATION_INTENT_V1';
const SHOWN_KEY = 'EDULOGIC_ACTIVATION_SHOWN_V1';

const safeSession = () => {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
};

export const rememberActivationIntent = () => {
  const storage = safeSession();
  if (!storage || typeof window === 'undefined') return;
  const path = window.location.pathname;
  storage.setItem(INTENT_KEY, path);
  storage.setItem(SHOWN_KEY, '1');
};

export const consumeActivationIntent = (): string | null => {
  const storage = safeSession();
  if (!storage) return null;
  const path = storage.getItem(INTENT_KEY);
  storage.removeItem(INTENT_KEY);
  storage.removeItem(SHOWN_KEY);
  return path;
};

export const hasActivationBeenShown = (): boolean => {
  const storage = safeSession();
  if (!storage) return false;
  return storage.getItem(SHOWN_KEY) === '1';
};
