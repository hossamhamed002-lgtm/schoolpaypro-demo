import { isDemoMode } from '../src/guards/appMode';
import { createTrialLicense, hasTrialBeenUsed, signLicensePayload } from './licenseFactory';
import { loadLicense, saveLicense, licenseExists } from './licenseStorage';
import { LicenseEnforcementResult, LicensePayload, LicenseValidationResult } from './types';
import getHWID from './hwid';

type EnforcementOptions = {
  expectedSchoolUid?: string;
  allowTrialFallback?: boolean;
  programmerBypass?: boolean;
};

const verifySignature = (license: LicensePayload) => {
  const { signature, ...unsigned } = license;
  return signature === signLicensePayload(unsigned);
};

const isExpired = (license: LicensePayload) => {
  const end = new Date(license.end_date);
  if (Number.isNaN(end.getTime())) return true;
  const today = new Date();
  return end.getTime() < today.getTime();
};

const refreshLastVerified = (license: LicensePayload) => {
  const next: LicensePayload = { ...license, last_verified_at: new Date().toISOString() };
  if (next.last_verified_at !== license.last_verified_at) {
    saveLicense(next, { allowUpdate: true });
  }
  return next;
};

export const validateLicense = (expectedSchoolUid?: string): LicenseValidationResult => {
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

  if (isExpired(license)) {
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
    return { status: 'valid', allowed: true, license: null, reason: 'demo_mode', bypassed: true };
  }
  const hwid = getHWID();
  const validation = validateLicense(options?.expectedSchoolUid);

  if (validation.status === 'missing' && options?.allowTrialFallback && !hasTrialBeenUsed(hwid)) {
    if (!options?.expectedSchoolUid) {
      return { ...validation, allowed: false, reason: 'missing_school_uid_for_trial' };
    }
    try {
      const trial = createTrialLicense(options.expectedSchoolUid, hwid);
      saveLicense(trial);
      return {
        status: 'trial',
        license: trial,
        allowed: true,
        generatedTrial: true,
        trialAvailable: false
      };
    } catch (err: any) {
      return { status: 'blocked', license: null, allowed: false, reason: err?.message || 'trial_creation_failed' };
    }
  }

  if (options?.programmerBypass && validation.status !== 'valid' && validation.status !== 'trial') {
    return { ...validation, allowed: true, bypassed: true };
  }

  const allowed = validation.status === 'valid' || validation.status === 'trial';
  return { ...validation, allowed };
};

export const canCreateTrial = () => {
  if (isDemoMode()) return false;
  const hwid = getHWID();
  return !licenseExists() && !hasTrialBeenUsed(hwid);
};
