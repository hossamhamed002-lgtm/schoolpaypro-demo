export type DeviceFingerprint = string;

const FP_STORAGE_PREFIX = 'DEVICE_FP__';

const getBrowserData = () => {
  if (typeof window === 'undefined') return 'server';
  const { navigator, screen } = window;
  const parts = [
    navigator.userAgent || '',
    navigator.platform || '',
    navigator.language || '',
    screen?.width || '',
    screen?.height || '',
    Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  ];
  return parts.join('|');
};

export const getCurrentFingerprint = (): DeviceFingerprint => {
  return btoa(unescape(encodeURIComponent(getBrowserData())));
};

export const getStoredFingerprint = (schoolCode: string, userId: string) => {
  const key = `${FP_STORAGE_PREFIX}${schoolCode}__${userId}`;
  return localStorage.getItem(key);
};

export const rememberFingerprint = (schoolCode: string, userId: string, fingerprint: DeviceFingerprint) => {
  const key = `${FP_STORAGE_PREFIX}${schoolCode}__${userId}`;
  localStorage.setItem(key, fingerprint);
};
