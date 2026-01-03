import { getCurrentFingerprint, getStoredFingerprint, rememberFingerprint } from './deviceFingerprint';
import { createOtpSession, refreshOtp, verifyOtp } from './otpService';
import { sendOtpWhatsApp } from './whatsappNotifier';
import { sendEmailOtp } from './emailNotifier';
import { getSecuritySettings } from './securitySettings';

interface GuardUser {
  User_ID: string;
  Username: string;
  Phone?: string;
  Email?: string;
}

export const checkDeviceAndMaybeOtp = (schoolCode: string, user: GuardUser) => {
  const settings = getSecuritySettings();
  if (!settings.enableDeviceCheck || !settings.enableOtp) {
    return { trusted: true };
  }
  // إذا لم يتوفر رقم هاتف ولا بريد، نتجاوز خطوة الـ OTP حتى لا تتعطل عملية الدخول
  if (!user.Phone && !user.Email) {
    return { trusted: true };
  }
  const fingerprint = getCurrentFingerprint();
  const stored = getStoredFingerprint(schoolCode, user.User_ID);
  if (stored && stored === fingerprint) {
    return { trusted: true };
  }
  const { session, code } = createOtpSession(schoolCode, user.User_ID, fingerprint, settings.otpExpiryMinutes);
  if (user.Phone) {
    sendOtpWhatsApp(user.Phone, code);
  }
  if (user.Email) {
    sendEmailOtp(user.Email, code);
  }
  return {
    trusted: false,
    session: {
      id: session.id,
      expiresAt: session.expiresAt,
      attemptsLeft: settings.maxOtpAttempts,
      fingerprint
    }
  };
};

export const verifyOtpAndTrust = (schoolCode: string, sessionId: string, code: string, userId: string) => {
  const settings = getSecuritySettings();
  const result = verifyOtp(schoolCode, sessionId, code, settings.maxOtpAttempts);
  if (result.ok && result.session) {
    rememberFingerprint(schoolCode, userId, result.session.fingerprint);
  }
  return result;
};

export const resendOtpForSession = (schoolCode: string, sessionId: string, phone?: string, email?: string) => {
  const settings = getSecuritySettings();
  const refreshed = refreshOtp(schoolCode, sessionId, settings.otpExpiryMinutes);
  if (!refreshed) return null;
  if (phone) sendOtpWhatsApp(phone, refreshed.code);
  if (email) sendEmailOtp(email, refreshed.code);
  return refreshed.session;
};
