export type OtpStatus = 'PENDING' | 'USED' | 'EXPIRED';

export interface OtpSession {
  id: string;
  userId: string;
  schoolCode: string;
  fingerprint: string;
  otpHash: string;
  expiresAt: number;
  status: OtpStatus;
  attempts: number;
}

const OTP_KEY = (schoolCode: string) => `OTP_SESSIONS__${schoolCode}`;

const hashOtp = (code: string) => {
  // بسيط ومؤقت، يكفي للتجربة بدون مكتبات إضافية
  return btoa(`otp-${code}-pepper`);
};

const genId = () => {
  if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }
  return `otp-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
};

const loadSessions = (schoolCode: string): OtpSession[] => {
  try {
    const raw = localStorage.getItem(OTP_KEY(schoolCode));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveSessions = (schoolCode: string, sessions: OtpSession[]) => {
  localStorage.setItem(OTP_KEY(schoolCode), JSON.stringify(sessions));
};

export const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const createOtpSession = (
  schoolCode: string,
  userId: string,
  fingerprint: string,
  expiryMinutes: number
) => {
  const code = generateOtp();
  const session: OtpSession = {
    id: genId(),
    userId,
    schoolCode,
    fingerprint,
    otpHash: hashOtp(code),
    expiresAt: Date.now() + expiryMinutes * 60 * 1000,
    status: 'PENDING',
    attempts: 0
  };
  const sessions = loadSessions(schoolCode);
  sessions.push(session);
  saveSessions(schoolCode, sessions);
  return { session, code };
};

export const markSessionExpired = (schoolCode: string, sessionId: string) => {
  const sessions = loadSessions(schoolCode).map((s) =>
    s.id === sessionId ? { ...s, status: 'EXPIRED' } : s
  );
  saveSessions(schoolCode, sessions);
};

export const verifyOtp = (schoolCode: string, sessionId: string, code: string, maxAttempts: number) => {
  const sessions = loadSessions(schoolCode);
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return { ok: false, error: 'جلسة غير موجودة' };
  const session = sessions[idx];
  if (session.status !== 'PENDING') return { ok: false, error: 'الجلسة غير صالحة' };
  if (Date.now() > session.expiresAt) {
    sessions[idx] = { ...session, status: 'EXPIRED' };
    saveSessions(schoolCode, sessions);
    return { ok: false, error: 'انتهت صلاحية الكود' };
  }
  if (session.attempts >= maxAttempts) {
    sessions[idx] = { ...session, status: 'EXPIRED' };
    saveSessions(schoolCode, sessions);
    return { ok: false, error: 'تم تجاوز المحاولات المتاحة' };
  }
  const matches = session.otpHash === hashOtp(code);
  const nextAttempts = session.attempts + 1;
  sessions[idx] = {
    ...session,
    attempts: nextAttempts,
    status: matches ? 'USED' : session.status
  };
  saveSessions(schoolCode, sessions);
  return matches
    ? { ok: true, session: sessions[idx] }
    : { ok: false, error: 'الكود غير صحيح', attemptsLeft: Math.max(0, maxAttempts - nextAttempts) };
};

export const refreshOtp = (schoolCode: string, sessionId: string, expiryMinutes: number) => {
  const sessions = loadSessions(schoolCode);
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return null;
  const code = generateOtp();
  sessions[idx] = {
    ...sessions[idx],
    otpHash: hashOtp(code),
    expiresAt: Date.now() + expiryMinutes * 60 * 1000,
    status: 'PENDING',
    attempts: 0
  };
  saveSessions(schoolCode, sessions);
  return { session: sessions[idx], code };
};

export const clearOtpSessions = (schoolCode: string) => {
  saveSessions(schoolCode, []);
};
