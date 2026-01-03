import React from 'react';

const PricingSection: React.FC = () => (
  <section className="px-6 py-16 bg-white">
    <div className="max-w-4xl mx-auto text-start">
      <h2 className="text-2xl font-black text-slate-900 mb-6">الأسعار</h2>
      <div className="rounded-3xl border border-slate-100 bg-slate-50 p-6 shadow-sm">
        <h3 className="text-xl font-black text-slate-900 mb-2">تواصل لمعرفة السعر</h3>
        <p className="text-slate-600 font-medium mb-4">
          نساعدك في اختيار الخطة الأنسب لحجم المدرسة واحتياجاتك.
        </p>
        <a
          href="https://wa.me/201094981227"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-700"
        >
          طلب النسخة الكاملة
        </a>
        {/* TODO: Stripe Checkout integration (Phase 6) */}
      </div>
    </div>
  </section>
);

export default PricingSection;
