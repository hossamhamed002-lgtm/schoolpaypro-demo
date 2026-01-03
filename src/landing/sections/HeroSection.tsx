import React from 'react';

const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-slate-50 px-6 py-16 md:py-24">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-5 text-start">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">SchoolPay Pro</p>
          <h1 className="text-3xl md:text-4xl font-black leading-snug text-slate-900">
            SchoolPay Pro<br />نظام إدارة المدارس المتكامل
          </h1>
          <p className="text-slate-600 font-medium text-lg leading-relaxed">
            إدارة الطلاب، الحسابات، الكنترول، شؤون العاملين…<br />
            في برنامج واحد – بدون تعقيد
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://schoolpaypro-demo.vercel.app/demo"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 shadow"
            >
              ▶️ جرّب النسخة التجريبية
            </a>
            <a
              href="https://wa.me/201094981227"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-50 text-emerald-700 font-black text-sm border border-emerald-100 hover:bg-emerald-100"
            >
              💬 تواصل واتساب
            </a>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-white shadow-xl shadow-indigo-100/30 p-8 text-start">
          <h3 className="text-lg font-black text-slate-900 mb-2">لماذا SchoolPay Pro؟</h3>
          <p className="text-slate-600 font-medium leading-relaxed">
            منصة واحدة لتشغيل المدرسة رقميًا: حضور وغياب، رسوم وحسابات، كنترول الامتحانات، تقارير جاهزة، ودعم للنسخة المكتبية الآمنة.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm font-bold text-slate-700">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">⚡ جاهز للنشر</div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">🔒 نسخة مكتبية آمنة</div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">📊 تقارير فورية</div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">🎧 دعم تقني سريع</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
