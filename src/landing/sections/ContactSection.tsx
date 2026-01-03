import React from 'react';

const ContactSection: React.FC = () => (
  <section className="px-6 py-16 bg-slate-900 text-white">
    <div className="max-w-4xl mx-auto text-start space-y-4">
      <h2 className="text-2xl font-black">تواصل معنا</h2>
      <p className="text-slate-200 font-medium">سيتم التواصل خلال 24 ساعة.</p>
      <div className="flex flex-wrap gap-3">
        <a
          href="https://wa.me/201094981227"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 text-white font-black text-sm hover:bg-emerald-600"
        >
          💬 تواصل واتساب
        </a>
        <a
          href="mailto:hossamhamed002@gmail.com"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-slate-900 font-black text-sm hover:bg-slate-100"
        >
          📧 hossamhamed002@gmail.com
        </a>
      </div>
    </div>
  </section>
);

export default ContactSection;
