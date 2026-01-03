// src/guards/appMode.ts

export type AppMode = 'desktop' | 'demo';

let cachedMode: AppMode | null = null;

export function isDemoMode(): boolean {
  return detectMode() === 'demo';
}

export function detectMode(): AppMode {
  if (cachedMode) return cachedMode;

  // ✅ Safe default
  let mode: AppMode = 'desktop';

  // 1️⃣ ENV (Vite / Vercel)
  try {
    // Rollup-safe access
    const meta = typeof import !== 'undefined' ? import.meta : null;
    const env = meta && (meta as any).env;
    if (env && env.VITE_APP_MODE === 'demo') {
      mode = 'demo';
    }
  } catch {
    /* ignore */
  }

  // 2️⃣ Hostname check (ONLY inside function)
  if (mode !== 'demo') {
    try {
      if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (
          host.includes('vercel.app') ||
          host.includes('github.io') ||
          host.includes('demo')
        ) {
          mode = 'demo';
        }
      }
    } catch {
      /* ignore */
    }
  }

  cachedMode = mode;
  return mode;
}