import React, { useState } from 'react';
import { MessageCircle, X, Shield } from 'lucide-react';

const SupportWidget: React.FC = () => {
  const [open, setOpen] = useState(false);

  const canned = [
    { title: 'استفسارات عامة', body: 'للاستفسارات العامة برجاء مراسلتنا، وسيتم الرد في أقرب وقت.' },
    { title: 'تجديد الاشتراك', body: 'لطلب تجديد الاشتراك أرسل رسالة: "طلب تجديد" مرفقًا باسم المدرسة.' },
    { title: 'الشكاوى والملاحظات', body: 'للشكاوى أو الملاحظات اكتب التفاصيل وسنقوم بالمتابعة.' }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[2000] no-print">
      {open && (
        <div className="mb-3 w-80 bg-white shadow-2xl border border-slate-200 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
            <div className="flex items-center gap-2">
              <Shield size={18} />
              <div className="text-sm font-black">مساعدة الذكاء الاصطناعي</div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="p-4 space-y-3 text-sm text-slate-700 max-h-80 overflow-y-auto">
            {canned.map((item) => (
              <div key={item.title} className="p-3 rounded-xl border border-slate-100 bg-slate-50">
                <p className="font-black text-slate-900 mb-1">{item.title}</p>
                <p className="text-slate-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
            <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-800 font-bold space-y-1">
              <p>للتواصل المباشر:</p>
              <p>واتساب: <span className="underline decoration-dotted">01094981227</span></p>
              <p>الإيميل المسجل: <span className="underline decoration-dotted">hossamhamed002@gmail.com</span></p>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((p) => !p)}
        className="h-12 w-12 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center hover:bg-slate-900 transition"
        title="مساعد الذكاء الاصطناعي"
      >
        <MessageCircle size={22} />
      </button>
    </div>
  );
};

export default SupportWidget;
