import React, { useMemo, useState } from 'react';
import { renewOfflineLicense, ActivationErrorReason } from '../../license/offlineActivation';
import type { useStore as useStoreHook } from '../../store';

type StoreState = ReturnType<typeof useStoreHook>;

type Props = {
  store: StoreState;
  onClose?: () => void;
};

type Status = 'idle' | 'loading' | 'success' | 'error';

const mapError = (reason: ActivationErrorReason | string | null) => {
  switch (reason) {
    case 'invalid_signature':
    case 'corrupt_license':
    case 'trial_not_renewable':
      return { title: '❌ كود غير صالح', message: 'برجاء التأكد من كود التجديد.' };
    case 'school_mismatch':
      return { title: '⛔ الكود لا يخص هذه المدرسة', message: 'استخدم كود تجديد خاص بنفس المدرسة.' };
    case 'hwid_mismatch':
      return { title: '⛔ هذا الترخيص مربوط بجهاز آخر', message: 'لا يمكن استخدامه على جهاز مختلف.' };
    default:
      return { title: '❌ كود غير صالح', message: 'برجاء التأكد من كود التجديد.' };
  }
};

const RenewalScreen: React.FC<Props> = ({ store, onClose }) => {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorReason, setErrorReason] = useState<ActivationErrorReason | string | null>(null);

  const expectedSchoolUid = store.activeSchool?.school_uid || '';
  const submitDisabled = !code.trim() || status === 'loading';
  const isAr = store.lang === 'ar';

  const errorState = useMemo(() => {
    if (status !== 'error') return null;
    return mapError(errorReason);
  }, [status, errorReason]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expectedSchoolUid || !code.trim()) return;
    setStatus('loading');
    setErrorReason(null);
    const normalized = code.replace(/\s+/g, '').toUpperCase();
    const result = renewOfflineLicense(normalized, expectedSchoolUid);
    if (result.ok) {
      setStatus('success');
      store.refreshLicenseStatus?.();
      return;
    }
    setStatus('error');
    setErrorReason(result.reason);
  };

  const onRequestSupport = () => {
    try {
      window.open('https://wa.me/201094981227', '_blank', 'noopener');
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8" dir="rtl">
      <div className="w-full max-w-3xl">
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow"
          >
            ← العودة
          </button>
        </div>
        <header className="text-center mb-8 space-y-2">
          <div className="text-3xl font-black text-slate-900">🔁 تجديد ترخيص School Pay Pro</div>
          <div className="text-sm text-slate-600">الترخيص منتهي. برجاء إدخال كود التجديد.</div>
        </header>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">كود التجديد</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                dir="rtl"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 tracking-[0.2em]"
              />
            </div>

            <button
              type="submit"
              disabled={submitDisabled}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white text-sm font-bold px-4 py-3 shadow hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {status === 'loading' ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  تجديد الآن
                </span>
              ) : (
                'تجديد الآن'
              )}
            </button>
          </form>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-2">
            <button
              type="button"
              onClick={onRequestSupport}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold"
            >
              طلب كود التجديد
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 text-sm font-semibold"
            >
              {isAr ? 'العودة' : 'Back'}
            </button>
          </div>

          {status === 'success' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 font-bold text-sm">
              ✅ تم تجديد الترخيص بنجاح
            </div>
          )}

          {status === 'error' && errorState && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 space-y-1">
              <div className="font-bold">{errorState.title}</div>
              <div className="text-sm">{errorState.message}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RenewalScreen;
