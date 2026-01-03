const MODE = (import.meta.env.VITE_APP_MODE || 'desktop') as 'demo' | 'desktop';

export const APP_MODE = MODE;
export const isDemo = () => APP_MODE === 'demo';
export const isDesktop = () => APP_MODE === 'desktop';
