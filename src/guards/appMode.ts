export type AppMode = 'demo' | 'desktop';

export const APP_MODE: AppMode = (import.meta.env.VITE_APP_MODE === 'demo' ? 'demo' : 'desktop');

export const isDemoMode = () => APP_MODE === 'demo';

export const isDesktopMode = () => APP_MODE === 'desktop';

export const applyDemoPersistenceGuards = () => {
  if (!isDemoMode()) return;
  if (typeof window === 'undefined') return;

  const patchStorage = (storage: Storage | undefined | null, label: string) => {
    if (!storage) return;
    if ((storage as any).__demoPatched) return;
    const originalSetItem = storage.setItem?.bind(storage);
    const originalRemoveItem = storage.removeItem?.bind(storage);
    const originalClear = storage.clear?.bind(storage);

    storage.setItem = ((key: string, value: string) => {
      console.info('[DEMO] Persistence blocked', { key, via: label });
      return void 0;
    }) as typeof storage.setItem;

    storage.removeItem = ((key: string) => {
      console.info('[DEMO] Remove blocked', { key, via: label });
      return void 0;
    }) as typeof storage.removeItem;

    storage.clear = (() => {
      console.info('[DEMO] Clear storage blocked', { via: label });
      return void 0;
    }) as typeof storage.clear;

    (storage as any).__demoPatched = { originalSetItem, originalRemoveItem, originalClear };
  };

  patchStorage(window.localStorage, 'localStorage');
  patchStorage(window.sessionStorage, 'sessionStorage');

  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    const originalFetch = window.fetch.bind(window);
    window.fetch = ((...args) => {
      console.info('[DEMO] Network call blocked', { input: args[0], init: args[1] });
      const payload = JSON.stringify([]);
      return Promise.resolve(new Response(payload, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }) as typeof window.fetch;
    (window.fetch as any).__demoPatched = originalFetch;
  }
};
