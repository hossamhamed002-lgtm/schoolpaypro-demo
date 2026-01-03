import { extendLicense, getLicense } from './licenseStore';

export const renewLicense = (licenseId: string, durationMs: number, invoiceId?: string) => {
  const lic = getLicense(licenseId);
  if (!lic) throw new Error('LICENSE_NOT_FOUND');
  return extendLicense(licenseId, durationMs, { invoiceId });
};
