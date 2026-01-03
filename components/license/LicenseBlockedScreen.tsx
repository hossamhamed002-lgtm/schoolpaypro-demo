import React from 'react';
import type { useStore as useStoreHook } from '../../store';

type StoreState = ReturnType<typeof useStoreHook>;

type Props = {
  store: StoreState;
  onRenew?: () => void;
};

const LicenseBlockedScreen: React.FC<Props> = ({ store, onRenew }) => {
  const schoolName = store.activeSchool?.Name || 'School Pay Pro';
  const expiry = store.licenseStatus?.license?.expires_at || store.licenseStatus?.license?.end_date || '';
  const formattedExpiry = expiry
    ? new Date(expiry).toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'غير متاح';

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10" dir="rtl">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-rose-100 p-8 space-y-6 text-center">
        <div className="text-3xl font-black text-rose-700">❌ انتهت صلاحية الترخيص أو الترخيص غير صالح</div>
        <div className="text-sm text-slate-600">
          اسم المدرسة: <span className="font-bold text-slate-800">{schoolName}</span>
        </div>
        <div className="text-sm text-slate-600">
          تاريخ الانتهاء: <span className="font-bold text-slate-800">{formattedExpiry}</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <button
            type="button"
            onClick={onRenew}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow hover:bg-indigo-700"
          >
            🔁 تجديد الترخيص
          </button>
          <a
            href="https://wa.me/201094981227"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:border-indigo-300 hover:text-indigo-800"
          >
            💬 التواصل مع الدعم (WhatsApp)
          </a>
          <a
            href="mailto:hossamhamed002@gmail.com?subject=Support%20Request%20-%20License"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:border-indigo-300 hover:text-indigo-800"
          >
            البريد الإلكتروني
          </a>
        </div>
      </div>
    </div>
  );
};

export default LicenseBlockedScreen;
