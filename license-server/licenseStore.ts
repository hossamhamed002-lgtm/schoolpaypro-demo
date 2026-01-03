export type LicenseStatus = 'active' | 'expired' | 'revoked';

export type LicenseRecord = {
  licenseId: string;
  schoolName: string;
  schoolUid: string;
  planId: string;
  hwid: string;
  issuedAt: number;
  expiresAt: number;
  status: LicenseStatus;
  renewals: { at: number; invoiceId?: string }[];
  payload?: any;
};

const store: Record<string, LicenseRecord> = {};

export const upsertLicense = (license: LicenseRecord) => {
  store[license.licenseId] = license;
  return license;
};

export const getLicense = (id: string) => store[id] || null;

export const listLicenses = () => Object.values(store);

export const revokeLicense = (id: string) => {
  const lic = store[id];
  if (!lic) return null;
  lic.status = 'revoked';
  return lic;
};

export const extendLicense = (id: string, additionalMs: number, meta?: { invoiceId?: string }) => {
  const lic = store[id];
  if (!lic) return null;
  lic.expiresAt += additionalMs;
  lic.status = 'active';
  lic.renewals.push({ at: Date.now(), invoiceId: meta?.invoiceId });
  return lic;
};
