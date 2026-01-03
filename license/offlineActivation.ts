import { LicensePayload, UnsignedLicensePayload } from './types';
import { signLicensePayload } from './licenseFactory';
import { saveLicense } from './licenseStorage';
import getHWID from './hwid';

export type ActivationErrorReason =
  | 'invalid_signature'
  | 'expired_license'
  | 'hwid_mismatch'
  | 'school_mismatch'
  | 'corrupt_license';

export type OfflineActivationResult =
  | { ok: true; license: LicensePayload }
  | { ok: false; reason: ActivationErrorReason };

const decodeLicenseKey = (raw: string): LicensePayload | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  const tryParse = (value: string) => {
    try {
      return JSON.parse(value) as LicensePayload;
    } catch {
      return null;
    }
  };
  const parsedDirect = tryParse(trimmed);
  if (parsedDirect) return parsedDirect;
  try {
    const decoded = typeof Buffer !== 'undefined'
      ? Buffer.from(trimmed, 'base64').toString('utf8')
      : atob(trimmed);
    return tryParse(decoded);
  } catch {
    return null;
  }
};

const verifySignature = (payload: LicensePayload) => {
  const { signature, ...unsigned } = payload as LicensePayload & { signature: string };
  const expected = signLicensePayload(unsigned as UnsignedLicensePayload);
  return signature === expected;
};

export const activateOfflineLicense = (
  licenseKey: string,
  expectedSchoolUid: string
): OfflineActivationResult => {
  const payload = decodeLicenseKey(licenseKey);
  if (!payload) {
    return { ok: false, reason: 'corrupt_license' };
  }
  if (!payload.signature || !verifySignature(payload)) {
    return { ok: false, reason: 'invalid_signature' };
  }
  const hwid = getHWID();
  if (!payload.device_fingerprint || payload.device_fingerprint !== hwid) {
    return { ok: false, reason: 'hwid_mismatch' };
  }
  if (!payload.school_uid || payload.school_uid !== expectedSchoolUid) {
    return { ok: false, reason: 'school_mismatch' };
  }
  const endDate = new Date(payload.end_date);
  if (!payload.end_date || Number.isNaN(endDate.getTime())) {
    return { ok: false, reason: 'corrupt_license' };
  }
  if (endDate.getTime() < Date.now()) {
    return { ok: false, reason: 'expired_license' };
  }
  if (!payload.start_date || Number.isNaN(new Date(payload.start_date).getTime())) {
    return { ok: false, reason: 'corrupt_license' };
  }

  const saved = saveLicense(payload, { allowUpdate: true });
  if (!saved) {
    return { ok: false, reason: 'corrupt_license' };
  }

  return { ok: true, license: payload };
};
