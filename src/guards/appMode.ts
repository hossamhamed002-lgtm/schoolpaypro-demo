let _cachedDemoMode: boolean | null = null;

export function isDemoMode(): boolean {
  if (_cachedDemoMode !== null) return _cachedDemoMode;

  const envMode = ((import.meta as any)?.env?.VITE_APP_MODE || '').toString().toLowerCase();
  if (envMode === 'demo') {
    _cachedDemoMode = true;
    return true;
  }

  const host = typeof window !== 'undefined' && window.location ? window.location.hostname.toLowerCase() : '';
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

  if (typeof window !== 'undefined') {
    alert(text);
  }
}

export function applyDemoPersistenceGuards() {
  if (!isDemoMode()) return;
  console.info('[DEMO MODE] Persistence guards enabled');
}
