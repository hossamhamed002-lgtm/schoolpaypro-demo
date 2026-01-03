import React, { useEffect, useMemo, useState } from 'react';
import { LogIn, AlertCircle, User, Mail } from 'lucide-react';
import eagleAiLogo from '../src/assets/eagleai-logo.png';
import schoolPayLogo from '../src/assets/schoolpay-logo.png';
import { getSchoolLogoByCode } from '../db_engine';
import OtpPrompt from './security/OtpPrompt';
import { getSecuritySettings } from '../security/securitySettings';
import { isDemoMode } from '../src/guards/appMode';

const BUY_URL = 'https://YOUR_DOMAIN_HERE/buy';
const WHATSAPP_URL = 'https://wa.me/201XXXXXXXXX';

interface SystemLoginProps {
  onLogin: (
    schoolCode: string,
    username: string,
    password: string
  ) => { ok: boolean; error?: string; otpRequired?: boolean; sessionId?: string; expiresAt?: number; attemptsLeft?: number };
  onVerifyOtp: (sessionId: string, code: string) => Promise<{ ok: boolean; error?: string; attemptsLeft?: number }>;
  onResendOtp: (sessionId: string) => Promise<{ ok: boolean; expiresAt?: number; error?: string }>;
  onCancelOtp: () => void;
  onProgrammerLogin: (username: string) => { ok: boolean; error?: string };
  onDemoLogin?: () => { ok: boolean; error?: string };
  defaultSchoolCode?: string;
}

const SystemLogin: React.FC<SystemLoginProps> = ({
  onLogin,
  onVerifyOtp,
  onResendOtp,
  onCancelOtp,
  onProgrammerLogin,
  onDemoLogin,
  defaultSchoolCode = ''
}) => {
  const [schoolCode, setSchoolCode] = useState(defaultSchoolCode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [programmerOpen, setProgrammerOpen] = useState(false);
  const [programmerUser, setProgrammerUser] = useState('');
  const [programmerPass, setProgrammerPass] = useState('');
  const [programmerError, setProgrammerError] = useState('');
  const [otpStep, setOtpStep] = useState<{ sessionId: string; expiresAt: number; attemptsLeft: number } | null>(null);
  const otpSettings = getSecuritySettings();
  const PROGRAMMER_KEY = 'EDULOGIC_PROGRAMMER_CREDENTIALS_V1';
  const demoMode = isDemoMode();
  const handleQuickFill = () => {
    setSchoolCode('SCH-001');
    setUsername('demo');
    setPassword('demo');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (demoMode) {
      onDemoLogin?.();
      return;
    }
    const result = onLogin(schoolCode, username, password);
    if (result.otpRequired && result.sessionId && result.expiresAt) {
      setOtpStep({ sessionId: result.sessionId, expiresAt: result.expiresAt, attemptsLeft: result.attemptsLeft || otpSettings.maxOtpAttempts });
      return;
    }
    if (!result.ok) setError(result.error || 'بيانات الدخول غير صحيحة');
  };

  useEffect(() => {
    const logo = getSchoolLogoByCode(schoolCode);
    setSchoolLogo(logo);
  }, [schoolCode]);

  const year = new Date().getFullYear();
  const programmerExists = useMemo(() => !!localStorage.getItem(PROGRAMMER_KEY), []);

  const handleProgrammerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProgrammerError('');
    const user = programmerUser.trim();
    const pass = programmerPass.trim();
    if (!user || !pass) {
      setProgrammerError('اسم المستخدم وكلمة المرور مطلوبان.');
      return;
    }

    const raw = localStorage.getItem(PROGRAMMER_KEY);
    if (!raw) {
      localStorage.setItem(PROGRAMMER_KEY, JSON.stringify({ user, pass }));
      onProgrammerLogin(user);
      return;
    }

    try {
      const saved = JSON.parse(raw);
      if (saved.user === user && saved.pass === pass) {
        onProgrammerLogin(user);
        return;
      }
    } catch {
      // ignore
    }
    setProgrammerError('بيانات المبرمج غير صحيحة.');
  };

  const handleOtpVerify = async (code: string) => {
    if (!otpStep) return { ok: false, error: 'لا توجد جلسة' };
    const res = await onVerifyOtp(otpStep.sessionId, code);
    if (!res.ok && res.attemptsLeft !== undefined) {
      setOtpStep({ ...otpStep, attemptsLeft: res.attemptsLeft });
    }
    if (!res.ok) return res;
    setOtpStep(null);
    return res;
  };

  const handleOtpResend = async () => {
    if (!otpStep) return { ok: false, error: 'لا توجد جلسة' };
    const res = await onResendOtp(otpStep.sessionId);
    if (res.ok && res.expiresAt) {
      setOtpStep({ ...otpStep, expiresAt: res.expiresAt });
    }
    return res;
  };

  const cancelOtp = () => {
    onCancelOtp();
    setOtpStep(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      <div
        className="absolute inset-0 opacity-10 bg-no-repeat pointer-events-none"
        style={{ backgroundImage: `url(${eagleAiLogo})`, backgroundPosition: 'right 8% bottom 6%', backgroundSize: '38%' }}
      />
      <div className="bg-white/95 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 relative z-10">
        {demoMode && (
          <div className="bg-amber-100 text-amber-800 text-center text-xs font-black py-3 px-4 border-b border-amber-200">
            <div className="text-sm font-black">نسخة تجريبية (Demo)</div>
            <div className="text-[11px] font-bold">هذه النسخة للعرض فقط — لن يتم حفظ أي بيانات.</div>
          </div>
        )}
        <div className="bg-indigo-900 p-8 text-center text-white relative">
          <div className="flex items-center justify-center gap-3 mx-auto mb-4">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden">
              <img src={schoolPayLogo} alt="SchoolPay Pro" className="h-16 w-16 object-contain" />
            </div>
            {schoolLogo && (
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden">
                <img src={schoolLogo} alt="School Logo" className="h-16 w-16 object-contain" />
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold mb-1">SchoolPay Pro</h1>
          <p className="text-indigo-200 text-sm">إدارة ذكية… تعليم بلا فوضى</p>
        </div>

        <div className="p-8">
          {demoMode && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-start">
              <div className="text-sm font-black text-amber-800 flex items-center gap-2">
                <span>🟡 نسخة تجريبية (Demo)</span>
              </div>
              <p className="text-xs font-bold text-amber-700 mt-1">هذه النسخة للعرض فقط — لن يتم حفظ أي بيانات.</p>
              <div className="mt-3 rounded-lg border border-amber-200 bg-white/70 p-3">
                <div className="text-[12px] font-black text-amber-800 mb-2">بيانات دخول تجريبية</div>
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="px-4 py-2 rounded-lg bg-amber-600 text-white font-black text-xs hover:bg-amber-700 transition"
                >
                  تعبئة تلقائية
                </button>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100 font-bold">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">كود المدرسة</label>
              <div className="relative">
                <input
                  type="text"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  placeholder="مثال: SCH-001"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  placeholder="أدخل اسم المستخدم"
                />
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                placeholder="********"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
            >
              <LogIn size={20} /> تسجيل الدخول
            </button>

            {demoMode && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => window.open(BUY_URL, '_blank')}
                  className="w-full bg-emerald-600 text-white py-3 rounded-lg font-black hover:bg-emerald-700 transition"
                >
                  اطلب النسخة الكاملة
                </button>
                <button
                  type="button"
                  onClick={() => window.open(WHATSAPP_URL, '_blank')}
                  className="w-full bg-white text-emerald-700 border border-emerald-200 py-3 rounded-lg font-black hover:bg-emerald-50 transition"
                >
                  تواصل واتساب
                </button>
                <p className="text-[11px] font-bold text-slate-500 text-center">
                  يمكنك تجربة الواجهة والتنقل، لكن الحفظ والتصدير معطّل في الديمو.
                </p>
              </div>
            )}
          </form>

          <div className="mt-8 border-t border-slate-200 pt-4 text-center">
            <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-600" dir="ltr">
              <div className="flex items-center gap-2">
                <img src={schoolPayLogo} alt="SchoolPay Pro" className="h-6 w-6 object-contain" />
                <span className="text-[10px] font-black text-slate-700">SchoolPay Pro</span>
              </div>
              <div className="flex items-center gap-3">
                <img src={eagleAiLogo} alt="EagleAI" className="h-6 w-6 object-contain" />
                <span>© {year} EagleAI - Software Soluation</span>
              </div>
            </div>
            {!demoMode && (
              <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-slate-600">
                <button
                  type="button"
                  onClick={() => setProgrammerOpen(true)}
                  className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800"
                  title="لوحة المبرمج"
                >
                  <span className="text-[10px] font-black">لوحة المبرمج</span>
                </button>
                <a
                  href="mailto:hossamhamed002@gmail.com"
                  className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  <Mail size={14} />
                  hossamhamed002@gmail.com
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {programmerOpen && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4 z-20">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 p-6 text-start">
            <h3 className="text-lg font-black text-slate-800 mb-1">تسجيل دخول المبرمج</h3>
            <p className="text-[10px] text-slate-400 font-bold mb-4">
              {programmerExists ? 'ادخل بيانات المبرمج' : 'سجّل بيانات المبرمج لأول مرة'}
            </p>

            {programmerError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100 font-bold mb-4">
                <AlertCircle size={16} className="shrink-0" />
                <span>{programmerError}</span>
              </div>
            )}

            <form onSubmit={handleProgrammerSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
                <input
                  type="text"
                  value={programmerUser}
                  onChange={(e) => setProgrammerUser(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  placeholder="اسم المبرمج"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
                <input
                  type="password"
                  value={programmerPass}
                  onChange={(e) => setProgrammerPass(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  placeholder="********"
                />
              </div>
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setProgrammerOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-500 font-bold"
                >
                  إغلاق
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-bold"
                >
                  دخول المبرمج
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {otpStep && (
        <OtpPrompt
          sessionId={otpStep.sessionId}
          expiresAt={otpStep.expiresAt}
          attemptsLeft={otpStep.attemptsLeft}
          resendCooldown={otpSettings.otpResendCooldown}
          onVerify={handleOtpVerify}
          onResend={handleOtpResend}
          onCancel={cancelOtp}
        />
      )}
    </div>
  );
};

export default SystemLogin;
