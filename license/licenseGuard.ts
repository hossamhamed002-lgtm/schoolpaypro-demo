import { isDemoMode } from '../src/guards/appMode';
import { createTrialLicense, hasTrialBeenUsed, signLicensePayload } from './licenseFactory';
import { loadLicense, saveLicense, licenseExists } from './licenseStorage';
import { LicenseEnforcementResult, LicensePayload, LicenseValidationResult } from './types';
import getHWID from './hwid';
import { checkHwidBinding, LicenseBindingStatus } from '../src/license/hwidBinding';

type EnforcementOptions = {
  expectedSchoolUid?: string;
  allowTrialFallback?: boolean;
  programmerBypass?: boolean;
  softEnforcement?: boolean;
};

let lastBindingStatus: LicenseBindingStatus | null = null;

export const getLastBindingStatus = () => lastBindingStatus;

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

  const softReason = (() => {
    if (validation.status === 'expired') return 'expired';
    if (validation.reason === 'hwid_mismatch') return 'hwid_mismatch';
    if (validation.reason === 'school_mismatch') return 'school_mismatch';
    return null;
  })();
  const softEligible = softReason && options?.softEnforcement !== false && !options?.programmerBypass;

  if (softEligible) {
    if ((import.meta as any).env?.DEV) {
      const label = softReason === 'expired'
        ? '[LICENSE][SOFT] expired \u2192 read-only'
        : softReason === 'hwid_mismatch'
          ? '[LICENSE][SOFT] hwid mismatch detected'
          : '[LICENSE][SOFT] school mismatch detected';
      console.info(label);
    }
    return {
      ...validation,
      allowed: true,
      softBlocked: true,
      isSoftLocked: true,
      activationRequired: false,
      reason: softReason || validation.reason
    };
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

  const activationRequired = validation.status === 'missing' || validation.status === 'invalid';
  const reason = activationRequired ? 'missing' : validation.reason || validation.status;
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
