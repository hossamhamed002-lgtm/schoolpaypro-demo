import React, { useMemo, useState } from 'react';
import { ActivationErrorReason } from '../../license/offlineActivation';
import { activateLicenseKey } from '../../license/licenseKeyStore';
import { normalizeLicenseKey } from '../../license/licenseKeyFactory';
import type { useStore as useStoreHook } from '../../store';
import { loadLicense } from '../../license/licenseStorage';

type StoreState = ReturnType<typeof useStoreHook>;

type Props = {
  store: StoreState;
};

type Status = 'idle' | 'loading' | 'success' | 'error';

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const mapError = (reason: ActivationErrorReason | string | null) => {
  switch (reason) {
    case 'invalid_signature':
    case 'corrupt_license':
    case 'school_mismatch':
    case 'trial_not_renewable':
      return {
        title: '❌ كود الترخيص غير صحيح',
        message: 'برجاء التأكد من الكود أو التواصل مع الدعم'
      };
    case 'hwid_mismatch':
      return {
        title: '⚠️ هذا الترخيص مُفعّل على جهاز آخر',
        message: 'لا يمكن استخدامه على أكثر من جهاز',
        cta: 'طلب نقل الترخيص'
      };
    case 'expired_license':
    case 'expired':
      return {
        title: '⛔ انتهت صلاحية الترخيص',
        message: '',
        cta: 'تجديد الاشتراك'
      };
    default:
      return {
        title: '❌ كود الترخيص غير صحيح',
        message: 'برجاء التأكد من الكود أو التواصل مع الدعم'
      };
  }
};

const LicenseActivationFullScreen: React.FC<Props> = ({ store }) => {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorReason, setErrorReason] = useState<ActivationErrorReason | string | null>(null);
  const [successExpiresAt, setSuccessExpiresAt] = useState<string | null>(null);

  const isAr = store.lang === 'ar';
  const expectedSchoolUid = store.activeSchool?.school_uid || '';

  const submitDisabled = !code.trim() || status === 'loading';

  const mapKeyActivationError = (error: string): ActivationErrorReason => {
    switch (error) {
      case 'KEY_EXPIRED':
        return 'expired_license';
      case 'KEY_REVOKED':
      case 'INVALID_SIGNATURE':
        return 'invalid_signature';
      case 'KEY_ALREADY_USED':
        return 'hwid_mismatch';
      case 'LICENSE_SAVE_FAILED':
        return 'corrupt_license';
      case 'PROGRAMMER_DEVICE_BLOCKED':
        return 'invalid_signature';
      default:
        return 'corrupt_license';
    }
  };

  const errorState = useMemo(() => {
    if (status !== 'error') return null;
    return mapError(errorReason);
  }, [status, errorReason]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setStatus('loading');
    setErrorReason(null);
    const licenseKey = normalizeLicenseKey(code);
    try {
      const vault = loadLicense();
      const storedKey = vault?.issued_keys?.find((k) => normalizeLicenseKey(k.license_key) === licenseKey) || null;
      if ((import.meta as any).env?.DEV) {
        console.info('[LICENSE][ACT][LOOKUP_FULL]', {
          input: licenseKey,
          found: !!storedKey,
          issued: vault?.issued_keys?.length || 0
        });
      }
      if (!storedKey) {
        setStatus('error');
        setErrorReason('invalid_signature');
        return;
      }
      if (storedKey.revoked) {
        setStatus('error');
        setErrorReason('invalid_signature');
        return;
      }
      const expiresAt = storedKey.expires_at ? new Date(storedKey.expires_at) : null;
      if (expiresAt && expiresAt.getTime() < Date.now()) {
        setStatus('error');
        setErrorReason('expired_license');
        return;
      }
      const targetSchoolUid = storedKey.school_uid || expectedSchoolUid || '';
      const isHostEnvironment = (() => {
        if (typeof window === 'undefined') return false;
        const host = window.location.hostname || '';
        const proto = window.location.protocol || '';
        return host === 'localhost'
          || host === '127.0.0.1'
          || host.endsWith('.vercel.app')
          || proto === 'file:';
      })();
      const isFirstRun = !store.activeSchool?.school_uid && !store.licenseGate?.license;
      const result = activateLicenseKey(storedKey, {
        school_uid: targetSchoolUid,
        isHostEnvironment,
        isFirstRun
      });
      if (result.ok) {
        setSuccessExpiresAt(result.license.expires_at || result.license.end_date || null);
        setStatus('success');
        store.refreshLicenseStatus?.();
        if (typeof (window as any).setEntryMode === 'function') {
          (window as any).setEntryMode(null);
        }
        if (typeof (window as any).onLicenseActivated === 'function') {
          (window as any).onLicenseActivated();
        }
        return;
      }
      setStatus('error');
      setErrorReason(mapKeyActivationError(result.error));
    } catch (err) {
      if ((import.meta as any).env?.DEV) {
        console.error('[LICENSE][ACT][ERROR_FULL]', err);
      }
      setStatus('error');
      setErrorReason('corrupt_license');
    }
  };

  const handleSuccessContinue = () => {
    setStatus('idle');
    setErrorReason(null);
    setSuccessExpiresAt(null);
    store.refreshLicenseStatus?.();
    if (typeof (window as any).setEntryMode === 'function') {
      (window as any).setEntryMode(null);
    }
  };

  const onRequestSupport = () => {
    try {
      window.open('https://wa.me/201094981227', '_blank', 'noopener');
    } catch {
      // ignore
    }
  };

  const onRequestTrial = () => {
    onRequestSupport();
  };

  const onRequestCode = () => {
    onRequestSupport();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8" dir="rtl">
      <div className="w-full max-w-3xl">
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={() => {
              if (typeof (window as any).setEntryMode === 'function') {
                (window as any).setEntryMode('gateway');
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow"
          >
            ← العودة
          </button>
        </div>
        <header className="text-center mb-8 space-y-2">
          <div className="text-3xl font-black text-slate-900">School Pay Pro</div>
          <div className="text-sm text-slate-600">البرنامج غير مُفعّل – برجاء إدخال كود الترخيص</div>
        </header>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">كود الترخيص</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                dir="rtl"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 tracking-[0.2em]"
                autoComplete="off"
                spellCheck={false}
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
                  تفعيل البرنامج
                </span>
              ) : (
                'تفعيل البرنامج'
              )}
            </button>
          </form>

          <div className="border-t border-slate-100" />

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onRequestCode}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold"
            >
              طلب كود ترخيص
            </button>
            <button
              type="button"
              onClick={onRequestTrial}
              className="text-slate-600 hover:text-indigo-700 text-sm font-semibold"
            >
              تجربة النسخة التجريبية
            </button>
          </div>

          {status === 'success' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-2 text-emerald-800">
              <div className="font-bold">✅ تم تفعيل البرنامج بنجاح</div>
              <div className="text-sm">
                الاشتراك ساري حتى: {formatDate(successExpiresAt) || '—'}
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSuccessContinue}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white text-xs font-bold px-3 py-2 hover:bg-emerald-700"
                >
                  الدخول إلى النظام
                </button>
              </div>
            </div>
          )}

          {status === 'error' && errorState && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 space-y-2 text-rose-800">
              <div className="font-bold">{errorState.title}</div>
              {errorState.message && <div className="text-sm">{errorState.message}</div>}
              {errorState.cta && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onRequestSupport}
                    className="inline-flex items-center gap-2 rounded-lg bg-rose-600 text-white text-xs font-bold px-3 py-2 hover:bg-rose-700"
                  >
                    {errorState.cta}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="mt-6 flex items-center justify-between text-xs text-slate-500">
          <span>© School Pay Pro</span>
          <button
            type="button"
            onClick={onRequestSupport}
            className="text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            تواصل مع الدعم
          </button>
        </footer>
      </div>
    </div>
  );
};

export default LicenseActivationFullScreen;
