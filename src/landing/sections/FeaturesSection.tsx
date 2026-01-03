import React from 'react';

const features = [
  'شؤون الطلاب',
  'الحسابات والرسوم',
  'كنترول الامتحانات',
  'OCR + صوت',
  'تقارير احترافية',
  'نسخة مكتبية آمنة'
];

const FeaturesSection: React.FC = () => (
  <section className="bg-white px-6 py-16">
    <div className="max-w-5xl mx-auto text-start">
      <h2 className="text-2xl font-black text-slate-900 mb-6">المزايا الرئيسية</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {features.map((item) => (
          <div key={item} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 text-slate-800 font-bold">
            {item}
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
