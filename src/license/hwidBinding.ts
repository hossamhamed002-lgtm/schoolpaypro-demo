import { loadLicense } from '../../license/licenseStorage';
import { LicensePayload } from '../../license/types';
import getHWID from '../../license/hwid';

export interface LicenseBindingStatus {
  hwid: string;
  licenseId?: string;
  boundHwid?: string;
  status: 'unbound' | 'match' | 'mismatch';
}

const readLicense = (): LicensePayload | null => {
  try {
    return loadLicense();
  } catch {
    return null;
  }
};

export function checkHwidBinding(): LicenseBindingStatus {
  const hwid = getHWID();
  const license = readLicense();

  if (!license || !license.device_fingerprint) {
    return { hwid, status: 'unbound' };
  }

  const boundHwid = license.device_fingerprint;
  const status: LicenseBindingStatus['status'] = boundHwid === hwid ? 'match' : 'mismatch';
  const result: LicenseBindingStatus = {
    hwid,
    boundHwid,
    status
  };

  if ((import.meta as any)?.env?.DEV) {
    console.info('[HWID][SOFT-BIND]', result);
  }

  return result;
}
