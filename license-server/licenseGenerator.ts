import crypto from 'crypto';
import { LICENSE_PLANS } from '../license/plans';

type LicensePayload = {
  licenseId: string;
  planId: string;
  schoolName: string;
  schoolUid: string;
  hwid: string;
  issuedAt: number;
  expiresAt: number;
  signature: string;
};

const SECRET = process.env.LICENSE_SIGNING_SECRET || 'CHANGE_ME_SECRET';

const signPayload = (payload: Omit<LicensePayload, 'signature'>) => {
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
};

export const generateLicense = (input: {
  planId: string;
  schoolName: string;
  schoolUid: string;
  hwid: string;
}): LicensePayload => {
  const plan = LICENSE_PLANS.find((p) => p.id === input.planId);
  if (!plan) {
    throw new Error('INVALID_PLAN');
  }

  const now = Date.now();
  const expiresAt = now + plan.durationMonths * 30 * 24 * 60 * 60 * 1000;
  const payload: Omit<LicensePayload, 'signature'> = {
    licenseId: `LIC-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now()}`,
    planId: plan.id,
    schoolName: input.schoolName,
    schoolUid: input.schoolUid,
    hwid: input.hwid,
    issuedAt: now,
    expiresAt
  };

  const signature = signPayload(payload);
  return { ...payload, signature };
};

export const verifyLicense = (license: LicensePayload): boolean => {
  const { signature, ...unsigned } = license;
  const expected = signPayload(unsigned);
  return expected === signature;
};
