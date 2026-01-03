import React from 'react';

const DemoSection: React.FC = () => (
  <section className="px-6 py-16 bg-gradient-to-r from-indigo-50 via-white to-amber-50">
    <div className="max-w-4xl mx-auto text-start space-y-4">
      <h2 className="text-2xl font-black text-slate-900">جرّب النسخة التجريبية الآن</h2>
      <p className="text-slate-600 font-medium leading-relaxed">
        جرّب البرنامج بكامل إمكانياته لمدة 24 ساعة – بدون تسجيل، بدون التزام. البيانات مؤقتة وتُحذف تلقائيًا بعد انتهاء التجربة.
      </p>
      <a
        href="https://schoolpaypro-demo.vercel.app/demo"
        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 shadow"
      >
        ابدأ التجربة الآن
      </a>
    </div>
  </section>
);

export default DemoSection;
