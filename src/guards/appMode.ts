// src/guards/appMode.ts

export type AppMode = 'desktop' | 'demo' | 'production';

let cachedMode: AppMode | null = null;

export function detectAppMode(): AppMode {
  if (cachedMode) return cachedMode;

  // 1️⃣ Explicit env (Vercel / CI)
  try {
  const env = import.meta.env as any;
  if (env && env.VITE_APP_MODE === 'demo') {
    cachedMode = 'demo';
    return cachedMode;
  }
} catch {
  // ignore – build-safe
}

  // 2️⃣ Force demo on vercel.app (HARD RULE)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host.endsWith('.vercel.app')) {
      cachedMode = 'demo';
      return cachedMode;
    }
  }

  // 3️⃣ Default
  cachedMode = 'desktop';
  return cachedMode;
}

export function isDemoMode(): boolean {
  return detectAppMode() === 'demo';
}