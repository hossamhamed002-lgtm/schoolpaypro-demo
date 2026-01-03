export interface SecuritySettings {
  enableDeviceCheck: boolean;
  enableOtp: boolean;
  otpExpiryMinutes: number;
  otpResendCooldown: number;
  maxOtpAttempts: number;
}

const SETTINGS_KEY = 'SECURITY_SETTINGS_GLOBAL';

const defaults: SecuritySettings = {
  enableDeviceCheck: true,
  enableOtp: true,
  otpExpiryMinutes: 5,
  otpResendCooldown: 60,
  maxOtpAttempts: 3
};

export const getSecuritySettings = (): SecuritySettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
};

export const saveSecuritySettings = (settings: Partial<SecuritySettings>) => {
  const merged = { ...getSecuritySettings(), ...settings };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
};
