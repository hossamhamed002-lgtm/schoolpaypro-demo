import { isDemoMode } from '../src/guards/appMode';
import { signLicensePayload, hasTrialBeenUsed } from './licenseFactory';
import { loadLicense, saveLicense, licenseExists } from './licenseStorage';
import { LicenseEnforcementResult, LicensePayload, LicenseValidationResult } from './types';
import getHWID from './hwid';
import { checkHwidBinding, LicenseBindingStatus } from '../src/license/hwidBinding';
import { validateInstallIntegrity, ensureInstallFingerprint } from './installFingerprint';

type EnforcementOptions = {
  expectedSchoolUid?: string;
  allowTrialFallback?: boolean;
  programmerBypass?: boolean;
  softEnforcement?: boolean;
};

let lastBindingStatus: LicenseBindingStatus | null = null;

export const getLastBindingStatus = () => lastBindingStatus;

const LICENSE_GRACE_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type EnforcementDecision = 'ALLOW' | 'LICENSE_EXPIRED' | 'HWID_MISMATCH';
type EnforcementContext = {
  expectedSchoolUid?: string;
  isProgrammer?: boolean;
  isDemo?: boolean;
};

const verifySignature = (license: LicensePayload) => {
  const { signature, ...unsigned } = license;
  return signature === signLicensePayload(unsigned);
};

const getExpiryDate = (license: LicensePayload) => {
  const end = new Date(license.expires_at || license.end_date);
  return Number.isNaN(end.getTime()) ? null : end;
};

const refreshLastVerified = (license: LicensePayload) => {
  const next: LicensePayload = { ...license, last_verified_at: new Date().toISOString(), last_checked_at: new Date().toISOString() };
  if (next.last_verified_at !== license.last_verified_at) {
    saveLicense(next, { allowUpdate: true });
  }
  return next;
};

export const validateLicense = (expectedSchoolUid?: string): LicenseValidationResult => {
  lastBindingStatus = checkHwidBinding();
  if (isDemoMode()) {
    return { status: 'valid', license: null, reason: 'demo_mode', trialAvailable: false };
  }
  const license = loadLicense();
  if (!license) {
    if (licenseExists()) {
      return { status: 'invalid', license: null, reason: 'corrupt_license', trialAvailable: false };
    }
    const hwid = getHWID();
    return {
      status: 'missing',
      license: null,
      trialAvailable: !hasTrialBeenUsed(hwid),
      reason: 'missing_license'
    };
  }

  if (!verifySignature(license)) {
    return { status: 'invalid', license, reason: 'bad_signature' };
  }

  if (license.status === 'key_vault') {
    return {
      status: 'missing',
      license: null,
      trialAvailable: !hasTrialBeenUsed(getHWID()),
      reason: 'missing_license'
    };
  }

  const hwid = getHWID();
  if (license.device_fingerprint !== hwid) {
    return { status: 'blocked', license, reason: 'hwid_mismatch' };
  }

  if (expectedSchoolUid && license.school_uid !== expectedSchoolUid) {
    return { status: 'invalid', license, reason: 'school_mismatch' };
  }

  if (license.last_verified_at) {
    const lastVerified = new Date(license.last_verified_at);
    const now = new Date();
    if (!Number.isNaN(lastVerified.getTime()) && now.getTime() < lastVerified.getTime()) {
      return { status: 'blocked', license, reason: 'clock_tamper' };
    }
  }

  if (license.last_checked_at) {
    const lastChecked = new Date(license.last_checked_at);
    if (!Number.isNaN(lastChecked.getTime()) && Date.now() < lastChecked.getTime()) {
      return { status: 'blocked', license, reason: 'clock_tamper' };
    }
  }

  const expiry = getExpiryDate(license);
  if (!expiry) {
    return { status: 'invalid', license, reason: 'corrupt_license' };
  }
  const now = Date.now();
  const expMs = expiry.getTime();
  const graceMs = expMs + LICENSE_GRACE_DAYS * MS_PER_DAY;
  if (now > graceMs) {
    return { status: 'blocked', license, reason: 'grace_expired' };
  }
  if (now > expMs) {
    const graceDaysLeft = Math.max(0, Math.ceil((graceMs - now) / MS_PER_DAY));
    return { status: 'expired', license, reason: 'grace', graceDaysLeft };
  }

  if (license.license_type === 'trial' && expMs < now) {
    return { status: 'expired', license, reason: 'expired' };
  }

  const refreshed = refreshLastVerified(license);
  if (refreshed.license_type === 'trial') {
    return { status: 'trial', license: refreshed };
  }
  return { status: 'valid', license: refreshed };
};

export const enforceLicense = (options?: EnforcementOptions): LicenseEnforcementResult => {
  if (isDemoMode()) {
    return {
      status: 'valid',
      allowed: true,
      license: null,
      reason: 'demo_mode',
      bypassed: true,
      isSoftLocked: false,
      activationRequired: false
    };
  }
  const hwid = getHWID();
  const validation = validateLicense(options?.expectedSchoolUid);

  if (options?.programmerBypass && validation.status !== 'valid' && validation.status !== 'trial') {
    return { ...validation, allowed: true, bypassed: true };
  }

  const allowed = validation.status === 'valid' || validation.status === 'trial';
  if (allowed) {
    return {
      ...validation,
      allowed: true,
      isSoftLocked: false,
      activationRequired: false
    };
  }

  const activationRequired = true;
  const reason = validation.reason || validation.status;
  return {
    ...validation,
    allowed: false,
    activationRequired,
    reason,
    isSoftLocked: false
  };
};

export const canCreateTrial = () => {
  if (isDemoMode()) return false;
  const hwid = getHWID();
  return !licenseExists() && !hasTrialBeenUsed(hwid);
};

export const enforceLicenseOrRedirect = (context?: EnforcementContext): EnforcementDecision => {
  if (context?.isProgrammer) return 'ALLOW';
  if (context?.isDemo || isDemoMode()) return 'ALLOW';

  const currentIfp = ensureInstallFingerprint();
  const license = loadLicense();

  if (license) {
    const integrity = validateInstallIntegrity(license.install_fingerprint || (license as any).ifp || null);
    if (integrity === 'CLONE_DETECTED') return 'HWID_MISMATCH';
    if (integrity === 'RESET_DETECTED') return 'LICENSE_EXPIRED';
    if (license.install_fingerprint && license.install_fingerprint !== currentIfp) {
      return 'LICENSE_EXPIRED';
    }
  } else {
    const integrity = validateInstallIntegrity(null);
    if (integrity === 'CLONE_DETECTED') return 'HWID_MISMATCH';
    if (integrity === 'RESET_DETECTED') return 'LICENSE_EXPIRED';
  }

  if (!license) return 'LICENSE_EXPIRED';

  if (context?.expectedSchoolUid && license.school_uid !== context.expectedSchoolUid) {
    return 'LICENSE_EXPIRED';
  }

  const status = (license.status || 'active').toString().toLowerCase();
  if (status !== 'active' && status !== 'activated') {
    return 'LICENSE_EXPIRED';
  }

  const expiryRaw = license.expires_at || license.end_date;
  if (expiryRaw) {
    const expiry = new Date(expiryRaw);
    if (Number.isNaN(expiry.getTime())) return 'LICENSE_EXPIRED';
    if (Date.now() > expiry.getTime()) return 'LICENSE_EXPIRED';
  }

  const boundHwid = (license as any).hwid || license.device_fingerprint;
  if (boundHwid && boundHwid !== getHWID()) {
    return 'HWID_MISMATCH';
  }

  return 'ALLOW';
};
