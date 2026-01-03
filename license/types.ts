export type LicenseType = 'trial' | 'paid';

export interface LicensePayload {
  school_uid: string;
  device_fingerprint: string;
  install_fingerprint?: string;
  license_type: LicenseType;
  start_date: string;
  end_date: string;
  expires_at?: string;
  activated_at?: string;
  renewed_at?: string;
  status?: 'activated' | 'issued';
  last_verified_at?: string;
  last_checked_at?: string;
  signature: string;
}

export type LicenseStatus = 'valid' | 'expired' | 'invalid' | 'trial' | 'blocked' | 'missing' | 'error';

export interface LicenseValidationResult {
  status: LicenseStatus;
  license?: LicensePayload | null;
  reason?: string;
  trialAvailable?: boolean;
}

export interface LicenseEnforcementResult extends LicenseValidationResult {
  allowed: boolean;
  bypassed?: boolean;
  generatedTrial?: boolean;
  softBlocked?: boolean;
  isSoftLocked?: boolean;
  activationRequired?: boolean;
  graceDaysLeft?: number;
}

export type UnsignedLicensePayload = Omit<LicensePayload, 'signature'>;

export type LicenseKeyType = 'paid' | 'trial-extension';

export interface LicenseKeyPayload {
  license_key: string;
  school_name: string;
  school_code?: string;
  school_uid?: string;
  license_type: LicenseKeyType;
  duration_days: number;
  max_devices: number;
  issued_at: string;
  expires_at: string;
  issued_by: 'PROGRAMMER';
  activated: boolean;
  activated_at?: string;
  bound_hwid?: string;
  signature: string;
  revoked?: boolean;
}

export type LicenseKeyStatus = 'unused' | 'activated' | 'expired' | 'revoked';
