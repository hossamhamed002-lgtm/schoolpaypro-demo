import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Timer, RefreshCcw } from 'lucide-react';

interface OtpPromptProps {
  sessionId: string;
  expiresAt: number;
  attemptsLeft: number;
  resendCooldown?: number;
  onVerify: (code: string) => Promise<{ ok: boolean; error?: string }>;
  onResend: () => Promise<{ ok: boolean; expiresAt?: number; error?: string }>;
  onCancel: () => void;
}

const OtpPrompt: React.FC<OtpPromptProps> = ({
  sessionId,
  expiresAt,
  attemptsLeft,
  resendCooldown = 60,
  onVerify,
  onResend,
  onCancel
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [remaining, setRemaining] = useState(Math.max(0, expiresAt - Date.now()));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(Math.max(0, expiresAt - Date.now()));
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.trim().length !== 6) {
      setError('أدخل الكود المكون من 6 أرقام');
      return;
    }
    const res = await onVerify(code.trim());
    if (!res.ok) setError(res.error || 'الكود غير صحيح');
  };

  const handleResend = async () => {
    setError('');
    setCooldown(resendCooldown);
    const res = await onResend();
    if (!res.ok) {
      setError(res.error || 'تعذر إعادة الإرسال');
    } else if (res.expiresAt) {
      setRemaining(Math.max(0, res.expiresAt - Date.now()));
    }
  };

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return (
    <div className="min-h-screen bg-slate-900/80 flex items-center justify-center p-4 fixed inset-0 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldCheck />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">رمز التحقق</p>
            <h3 className="text-lg font-black text-slate-900">تأكيد الدخول عبر OTP</h3>
            <p className="text-xs text-slate-500 font-bold">تم إرسال الكود عبر واتساب للجهاز الجديد</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold mb-4 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1 block">أدخل الكود</label>
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\\D/g, '').slice(0, 6))}
              className="w-full text-center tracking-[0.6em] text-2xl font-black p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="••••••"
            />
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold mt-2">
              <span>المحاولات المتبقية: {attemptsLeft}</span>
              <span className="flex items-center gap-1"><Timer size={14} /> {minutes}:{seconds.toString().padStart(2, '0')}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-black hover:bg-indigo-700 transition"
              disabled={remaining <= 0}
            >
              تحقق
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0}
              className="px-4 py-3 rounded-lg border border-slate-200 text-slate-700 font-bold flex items-center gap-2"
            >
              <RefreshCcw size={16} />
              {cooldown > 0 ? `إعادة خلال ${cooldown}s` : 'إعادة الإرسال'}
            </button>
          </div>
        </form>

        <button
          type="button"
          onClick={onCancel}
          className="w-full mt-3 text-center text-xs font-bold text-slate-400 hover:text-slate-600"
        >
          إلغاء والعودة لتسجيل الدخول
        </button>

        <p className="text-[11px] text-slate-400 font-bold mt-4 text-center">
          رقم الجلسة: {sessionId}
        </p>
      </div>
    </div>
  );
};

export default OtpPrompt;
