import getHWID from '../license/hwid';
import { loadLicense, licenseExists } from '../license/licenseStorage';
import { signLicensePayload } from '../license/licenseFactory';
import { ensureInstallFingerprint, validateInstallIntegrity } from '../license/installFingerprint';
import { isDemoMode } from './guards/appMode';

type ReleaseCheckResult = {
  ok: boolean;
  fatal?: boolean;
  reason?: string;
};

type ReleaseContext = {
  expectedSchoolUid?: string;
  programmerHint?: boolean;
  allowTrials?: boolean;
};

const IS_DEV = !!((import.meta as any)?.env?.DEV);

const releaseLog = (...args: any[]) => {
  if (IS_DEV) {
    try {
      console.info('[RELEASE]', ...args);
    } catch {
      // ignore
    }
  }
};

let cachedResult: ReleaseCheckResult | null = null;

export const runReleaseVerification = (ctx?: ReleaseContext): ReleaseCheckResult => {
  if (cachedResult) return cachedResult;
  const programmerHint = !!ctx?.programmerHint;
  const inDemo = isDemoMode();

  // Programmer / demo bypass for verification fatality.
  if (programmerHint || inDemo) {
    const result: ReleaseCheckResult = { ok: true };
    cachedResult = result;
    return result;
  }

  const hwid = getHWID();
  if (!hwid) {
    const result: ReleaseCheckResult = { ok: false, fatal: true, reason: 'hwid_missing' };
    cachedResult = result;
    return result;
  }

  const ifp = ensureInstallFingerprint();
  const integrity = validateInstallIntegrity(null);
  if (integrity === 'CLONE_DETECTED') {
    const result: ReleaseCheckResult = { ok: false, fatal: true, reason: 'clone_detected' };
    cachedResult = result;
    return result;
  }
  if (integrity === 'RESET_DETECTED') {
    const result: ReleaseCheckResult = { ok: false, fatal: true, reason: 'reset_detected' };
    cachedResult = result;
    return result;
  }

  const license = loadLicense();
  if (!license) {
    const result: ReleaseCheckResult = { ok: !licenseExists(), fatal: false, reason: 'no_license' };
    cachedResult = result;
    return result;
  }

  // Signature check for tamper detection
  try {
    const { signature, ...unsigned } = license as any;
    const expectedSig = signLicensePayload(unsigned);
    if (signature !== expectedSig) {
      const result: ReleaseCheckResult = { ok: false, fatal: true, reason: 'license_tampered' };
      cachedResult = result;
      return result;
    }
  } catch {
    const result: ReleaseCheckResult = { ok: false, fatal: true, reason: 'license_invalid' };
    cachedResult = result;
    return result;
  }

  if (!license.school_uid) {
    const result: ReleaseCheckResult = { ok: false, fatal: true, reason: 'missing_school_uid' };
    cachedResult = result;
    return result;
  }
  if (ctx?.expectedSchoolUid && ctx.expectedSchoolUid !== license.school_uid) {
    const result: ReleaseCheckResult = { ok: false, fatal: true, reason: 'school_mismatch' };
    cachedResult = result;
    return result;
  }

  if (license.device_fingerprint && license.device_fingerprint !== hwid) {
    const result: ReleaseCheckResult = { ok: false, fatal: true, reason: 'hwid_mismatch' };
    cachedResult = result;
    return result;
  }

  const licenseIfp = (license as any).install_fingerprint || (license as any).ifp;
  if (licenseIfp && licenseIfp !== ifp) {
    const result: ReleaseCheckResult = { ok: false, fatal: true, reason: 'ifp_mismatch' };
    cachedResult = result;
    return result;
  }

  if (!ctx?.allowTrials && license.license_type === 'trial' && !inDemo) {
    const result: ReleaseCheckResult = { ok: false, fatal: true, reason: 'trial_forbidden' };
    cachedResult = result;
    return result;
  }

  releaseLog('Release verification passed');
  const result: ReleaseCheckResult = { ok: true };
  cachedResult = result;
  return result;
};

export type { ReleaseCheckResult };
