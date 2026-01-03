let _cachedDemoMode: boolean | null = null;
let _cachedDemoExpired: boolean | null = null;
const IS_DEV = !!((import.meta as any)?.env?.DEV);
const FINAL_LICENSE_LOCK = (import.meta as any)?.env?.VITE_FINAL_LICENSE_LOCK === 'true' || (import.meta as any)?.env?.VITE_FINAL_LICENSE_LOCK === true;

export function isDemoMode(): boolean {
  if (_cachedDemoMode !== null) return _cachedDemoMode;

  if (FINAL_LICENSE_LOCK) {
    _cachedDemoMode = false;
    return false;
  }

  const envMode = ((import.meta as any)?.env?.VITE_APP_MODE || '').toString().toLowerCase();
  if (envMode === 'demo') {
    _cachedDemoMode = true;
    return true;
  }

  const host = typeof window !== 'undefined' && window.location ? window.location.hostname.toLowerCase() : '';
  if (!host || host === 'localhost' || host.startsWith('127.') || host.startsWith('0.0.0.0')) {
    _cachedDemoMode = false;
    return false;
  }
  if (host.includes('vercel.app') || host.includes('demo')) {
    _cachedDemoMode = true;
    return true;
  }

  _cachedDemoMode = false;
  return false;
}

let demoToastShown = false;

export function showDemoToast(message?: string) {
  if (demoToastShown) return;
  demoToastShown = true;

  const text =
    message ||
    '⚠️ وضع العرض التجريبي (Demo): لا يمكن حفظ أو تعديل البيانات';

  if (typeof window !== 'undefined' && IS_DEV) {
    alert(text);
  }
}

export function applyDemoPersistenceGuards() {
  if (!isDemoMode()) return;
  console.info('[DEMO MODE] Persistence guards enabled');
}

export function isDemoExpired(): boolean {
  if (!isDemoMode()) return false;

  if (_cachedDemoExpired !== null) return _cachedDemoExpired;

  try {
    const storage = typeof window !== 'undefined' ? window.sessionStorage : null;
    if (!storage) {
      _cachedDemoExpired = true;
      return true;
    }
    const raw = storage.getItem('EDULOGIC_DEMO_SESSION_V1');
    if (!raw) {
      _cachedDemoExpired = true;
      return true;
    }
    const parsed = JSON.parse(raw) as { startedAt?: number; expiresAt?: number };
    if (!parsed || typeof parsed.expiresAt !== 'number') {
      storage.removeItem('EDULOGIC_DEMO_SESSION_V1');
      _cachedDemoExpired = true;
      return true;
    }
    _cachedDemoExpired = Date.now() > parsed.expiresAt;
    return _cachedDemoExpired;
  } catch {
    _cachedDemoExpired = true;
    return true;
  }
}
