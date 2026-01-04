import React, { useMemo, useState } from 'react';
import { ActivationErrorReason } from '../../license/offlineActivation';
import { activateLicenseKey } from '../../license/licenseKeyStore';
import { normalizeLicenseKey } from '../../license/licenseKeyFactory';
import type { useStore as useStoreHook } from '../../store';
import { BUY_URL } from '../../src/config/links';
import { consumeActivationIntent } from '../../src/guards/activationGuard';
import { loadLicense } from '../../license/licenseStorage';

type StoreState = ReturnType<typeof useStoreHook>;
type Props = { store: StoreState };

const errorCopy: Record<ActivationErrorReason, { ar: string; en: string }> = {
  invalid_signature: {
    ar: 'توقيع الترخيص غير صحيح.',
    en: 'License signature is invalid.'
  },
  expired_license: {
    ar: 'انتهت صلاحية الترخيص.',
    en: 'License has expired.'
  },
  hwid_mismatch: {
    ar: 'هذا الترخيص غير مرتبط بهذا الجهاز.',
    en: 'This license is bound to a different device.'
  },
  school_mismatch: {
    ar: 'الترخيص غير مرتبط بهذه المدرسة.',
    en: 'License does not belong to this school.'
  },
  corrupt_license: {
    ar: 'ملف الترخيص تالف أو غير قابل للقراءة.',
    en: 'License file is corrupted or unreadable.'
  },
  trial_not_renewable: {
    ar: 'لا يمكن تجديد ترخيص تجريبي. الرجاء استخدام ترخيص مدفوع.',
    en: 'Trial licenses cannot be renewed. Please use a paid license.'
  }
};

const LicenseActivationScreen: React.FC<Props> = ({ store }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorReason, setErrorReason] = useState<ActivationErrorReason | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const isAr = store.lang === 'ar';
  const expectedSchoolUid = store.activeSchool?.school_uid || '';

  const errorText = useMemo(() => {
    if (!errorReason) return '';
    return isAr ? errorCopy[errorReason].ar : errorCopy[errorReason].en;
  }, [errorReason, isAr]);

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

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('processing');
    setErrorReason(null);
    setSuccessMessage('');
    const normalizedKey = normalizeLicenseKey(licenseKey);
    try {
      const vault = loadLicense();
      const storedKey = vault?.issued_keys?.find((k) => normalizeLicenseKey(k.license_key) === normalizedKey) || null;
      if ((import.meta as any).env?.DEV) {
        console.info('[LICENSE][ACT][LOOKUP]', { input: normalizedKey, found: !!storedKey, issued: vault?.issued_keys?.length || 0 });
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
      if (!result.ok) {
        setStatus('error');
        setErrorReason(mapKeyActivationError(result.error));
        return;
      }
      setStatus('success');
      setSuccessMessage(isAr ? 'تم تفعيل الترخيص بنجاح.' : 'License activated successfully.');
      store.refreshLicenseStatus?.();
      if (typeof (window as any).setEntryMode === 'function') {
        (window as any).setEntryMode(null);
      }
      if (typeof (window as any).onLicenseActivated === 'function') {
        (window as any).onLicenseActivated();
      }
      const intent = consumeActivationIntent();
      if (intent && typeof window !== 'undefined' && window.location.pathname !== intent) {
        window.history.replaceState(null, '', intent);
      }
    } catch (err) {
      if ((import.meta as any).env?.DEV) {
        console.error('[LICENSE][ACT][ERROR]', err);
      }
      setStatus('error');
      setErrorReason('corrupt_license');
    }
  };

  const whatsappHref =
    BUY_URL ||
    'https://wa.me/201094981227?text=%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%AA%D9%81%D8%B9%D9%8A%D9%84%20%D8%B1%D8%AE%D8%B5%D8%A9%20SchoolPay%20Pro';
  const emailHref = 'mailto:sales@eagleai.co?subject=SchoolPay%20Pro%20Activation%20Request';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-2xl border border-slate-100 p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900">
            {isAr ? 'تفعيل النسخة الكاملة' : 'Activate Full Version'}
          </h1>
          <p className="text-sm text-slate-600">
            {isAr
              ? 'أدخل مفتاح الترخيص الذي استلمته لتفعيل النسخة الكاملة دون إنترنت.'
              : 'Enter the license key you received to activate the full version offline.'}
          </p>
          {store.activeSchool?.Name && (
            <p className="text-xs text-slate-500">
              {isAr ? 'المدرسة:' : 'School:'} <span className="font-semibold">{store.activeSchool.Name}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleActivate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              {isAr ? 'مفتاح الترخيص' : 'License Key'}
            </label>
            <textarea
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              rows={4}
              placeholder={isAr ? 'الصق مفتاح الترخيص هنا' : 'Paste your license key here'}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <button
            type="submit"
            disabled={!licenseKey.trim() || status === 'processing'}
            className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-indigo-600 text-white text-sm font-bold px-4 py-3 shadow hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {status === 'processing'
              ? isAr ? 'جاري التفعيل...' : 'Activating...'
              : isAr ? 'تفعيل الترخيص' : 'Activate License'}
          </button>
        </form>

        {status === 'success' && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 text-sm font-semibold">
            {successMessage}
          </div>
        )}

        {status === 'error' && errorText && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-800 px-4 py-3 text-sm font-semibold">
            {errorText}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between border-t border-slate-100 pt-4">
          <div className="text-xs text-slate-500">
            {isAr
              ? 'تحتاج مساعدة؟ تواصل معنا لطلب نسخة كاملة.'
              : 'Need help? Reach out to request a full license.'}
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow hover:bg-emerald-700"
            >
              {isAr ? 'طلب نسخة كاملة عبر واتساب' : 'Request via WhatsApp'}
            </a>
            <a
              href={emailHref}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold hover:border-indigo-300 hover:text-indigo-700"
            >
              {isAr ? 'مراسلة عبر البريد' : 'Email us'}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicenseActivationScreen;
