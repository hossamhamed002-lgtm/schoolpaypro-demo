// src/guards/appMode.ts

let _cachedDemoMode: boolean | null = null;

/* -------------------------------------------
   Demo Mode Detection
-------------------------------------------- */

export function isDemoMode(): boolean {
  if (_cachedDemoMode !== null) return _cachedDemoMode;

  try {
    const meta: any =
      typeof import.meta !== 'undefined' ? import.meta : null;

    const env = meta && meta.env ? meta.env : {};

    if (env.VITE_APP_MODE === 'demo') {
      _cachedDemoMode = true;
      return true;
    }
  } catch {
    // ignore
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (
      host.includes('vercel.app') ||
      host.includes('demo') ||
      host.includes('preview')
    ) {
      _cachedDemoMode = true;
      return true;
    }
  }

  _cachedDemoMode = false;
  return false;
}

/* -------------------------------------------
   Demo Toast
-------------------------------------------- */

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

/* -------------------------------------------
   Demo Persistence Guard (المهم)
-------------------------------------------- */

export function applyDemoPersistenceGuards() {
  if (!isDemoMode()) return;

  console.info('[DEMO MODE] Persistence guards enabled');

  // هنا لاحقًا:
  // - تعطيل save
  // - تعطيل delete
  // - تعطيل export
  // (الربط تم بالفعل في dataLayer / store)
}

