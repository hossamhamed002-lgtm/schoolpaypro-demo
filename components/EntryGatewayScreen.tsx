import React from 'react';
import { KeyRound, RefreshCw, School } from 'lucide-react';

type Props = {
  onCurrent: () => void;
  onNew: () => void;
  onRenew: () => void;
};

const Card: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}> = ({ icon, title, subtitle, onClick }) => (
  <button
    onClick={onClick}
    className="group bg-white border border-slate-100 rounded-3xl shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 p-6 text-right flex flex-col h-full"
  >
    <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 shadow-inner">
      {icon}
    </div>
    <div className="text-lg font-black text-slate-900">{title}</div>
    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{subtitle}</p>
  </button>
);

const EntryGatewayScreen: React.FC<Props> = ({ onCurrent, onNew, onRenew }) => (
  <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center px-4 py-10" dir="rtl">
    <div className="w-full max-w-5xl grid gap-8">
      <header className="text-center space-y-2">
        <div className="text-3xl font-black text-slate-900">School Pay Pro</div>
        <div className="text-sm text-slate-600">ابدأ باختيار المسار المناسب</div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          icon={<KeyRound size={28} />}
          title="مشترك حالي"
          subtitle="أدخل كود الترخيص ثم انتقل لتسجيل الدخول."
          onClick={onCurrent}
        />
        <Card
          icon={<School size={28} />}
          title="مشترك جديد"
          subtitle="اطلب كود ترخيص جديد عبر واتساب أو البريد."
          onClick={onNew}
        />
        <Card
          icon={<RefreshCw size={28} />}
          title="تجديد الترخيص"
          subtitle="أدخل كود التجديد أو تواصل مع الدعم للتجديد."
          onClick={onRenew}
        />
      </div>
      <div className="flex justify-center">
        <button
          onClick={() => { window.location.href = 'https://schoolpaypro-demo.vercel.app/demo'; }}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-semibold shadow hover:shadow-lg hover:-translate-y-0.5 transition"
        >
          <span className="text-lg">🧪</span>
          <span>تجربة النسخة التجريبية</span>
        </button>
      </div>
    </div>
  </div>
);

export default EntryGatewayScreen;
