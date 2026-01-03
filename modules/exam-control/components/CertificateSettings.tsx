
import React, { useState, useEffect } from 'react';
import { Save, X, Image as ImageIcon, CheckSquare, Square } from 'lucide-react';
import { CertificateConfig } from '../examControl.types';
import { db } from '../services/db';

interface CertificateSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: CertificateConfig) => void;
}

const CertificateSettings: React.FC<CertificateSettingsProps> = ({ isOpen, onClose, onSave }) => {
  const [config, setConfig] = useState<CertificateConfig>(db.getCertConfig());

  useEffect(() => {
    if (isOpen) {
      setConfig(db.getCertConfig());
    }
  }, [isOpen]);

  const handleChange = (field: keyof CertificateConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        alert("حجم الصورة كبير جداً (أقصى حد 500KB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('logo', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.saveCertConfig(config);
    onSave(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[95vh] flex flex-col border border-gray-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white">
          <h3 className="font-bold text-xl text-gray-800">إعدادات الشهادة</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition p-1">
            <X size={24} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSave} className="p-8 overflow-y-auto custom-scrollbar space-y-8 bg-white">
          
          {/* Top Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-1">
               <label className="block text-sm font-bold text-gray-700 mb-1">اسم المدرسة</label>
               <input 
                type="text" 
                value={config.schoolName} 
                onChange={(e) => handleChange('schoolName', e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 outline-none focus:border-blue-400 transition"
               />
            </div>
            <div className="space-y-1">
               <label className="block text-sm font-bold text-gray-700 mb-1">عنوان الشهادة</label>
               <input 
                type="text" 
                value={config.examTitle} 
                onChange={(e) => handleChange('examTitle', e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 outline-none focus:border-blue-400 transition"
               />
            </div>
            <div className="space-y-1">
               <label className="block text-sm font-bold text-gray-700 mb-1">توقيع (يمين)</label>
               <input 
                type="text" 
                value={config.footerRight} 
                onChange={(e) => handleChange('footerRight', e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 outline-none focus:border-blue-400 transition"
               />
            </div>
            <div className="space-y-1">
               <label className="block text-sm font-bold text-gray-700 mb-1">توقيع (يسار)</label>
               <input 
                type="text" 
                value={config.footerLeft} 
                onChange={(e) => handleChange('footerLeft', e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 bg-gray-50 outline-none focus:border-blue-400 transition"
               />
            </div>
          </div>

          {/* Result Phrases Section */}
          <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100 space-y-6">
            <h4 className="font-bold text-lg text-gray-800 text-center mb-4">نصوص النتيجة (اختر أو اكتب)</h4>
            
            {/* Term 1 Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-xs font-bold text-blue-600 mb-1 text-right">عبارة النجاح (ترم 1)</label>
                <select 
                  value={config.term1SuccessText} 
                  onChange={(e) => handleChange('term1SuccessText', e.target.value)} 
                  className="w-full border border-gray-200 rounded p-2.5 text-sm bg-white outline-none"
                >
                  <option value="ناجح في الفصل الدراسي الأول">ناجح في الفصل الدراسي الأول</option>
                  <option value="اجتاز المستوى المطلوب">اجتاز المستوى المطلوب</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-red-600 mb-1 text-right">عبارة الرسوب (ترم 1)</label>
                <input 
                  type="text"
                  value={config.term1FailText} 
                  onChange={(e) => handleChange('term1FailText', e.target.value)} 
                  className="w-full border border-gray-200 rounded p-2.5 text-sm bg-white outline-none"
                  placeholder="دون المستوى في الفصل الدراسي الأول"
                />
              </div>
            </div>

            {/* Term 2 Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-xs font-bold text-blue-600 mb-1 text-right">عبارة النجاح (ترم 2)</label>
                <input 
                  type="text"
                  value={config.term2SuccessText} 
                  onChange={(e) => handleChange('term2SuccessText', e.target.value)} 
                  className="w-full border border-gray-200 rounded p-2.5 text-sm bg-white outline-none"
                  placeholder="ناجح في الفصل الدراسي الثاني"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-red-600 mb-1 text-right">عبارة الرسوب (ترم 2)</label>
                <input 
                  type="text"
                  value={config.term2FailText} 
                  onChange={(e) => handleChange('term2FailText', e.target.value)} 
                  className="w-full border border-gray-200 rounded p-2.5 text-sm bg-white outline-none"
                  placeholder="دون المستوى في الفصل الدراسي الثاني"
                />
              </div>
            </div>

            {/* Annual Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-xs font-bold text-blue-600 mb-1 text-right">عبارة النجاح (عام)</label>
                <select 
                  value={config.annualSuccessText} 
                  onChange={(e) => handleChange('annualSuccessText', e.target.value)} 
                  className="w-full border border-gray-200 rounded p-2.5 text-sm bg-white outline-none font-bold"
                >
                  <option value="ناجح ومنقول للصف التالي">ناجح ومنقول للصف التالي</option>
                  <option value="اجتاز بنجاح">اجتاز بنجاح</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-red-600 mb-1 text-right">عبارة الرسوب (عام)</label>
                <input 
                  type="text"
                  value={config.annualFailText} 
                  onChange={(e) => handleChange('annualFailText', e.target.value)} 
                  className="w-full border border-gray-200 rounded p-2.5 text-sm bg-white outline-none"
                  placeholder="راسب (له دور ثان)"
                />
              </div>
            </div>
          </div>

          {/* Options and Checkboxes Grid */}
          <div className="bg-white border rounded-xl p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer group justify-end">
                    <span className="text-sm font-bold text-gray-700">إظهار الشعار</span>
                    <input type="checkbox" checked={config.showLogo} onChange={(e) => handleChange('showLogo', e.target.checked)} className="hidden" />
                    {config.showLogo ? <CheckSquare className="text-blue-600" /> : <Square className="text-gray-300" />}
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group justify-end">
                    <span className="text-sm font-bold text-gray-700">إظهار الألوان (أحمر/أزرق..)</span>
                    <input type="checkbox" checked={config.showColors} onChange={(e) => handleChange('showColors', e.target.checked)} className="hidden" />
                    {config.showColors ? <CheckSquare className="text-blue-600" /> : <Square className="text-gray-300" />}
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group justify-end">
                    <span className="text-sm font-bold text-gray-700">إظهار ترتيب الطالب</span>
                    <input type="checkbox" checked={config.showRank} onChange={(e) => handleChange('showRank', e.target.checked)} className="hidden" />
                    {config.showRank ? <CheckSquare className="text-blue-600" /> : <Square className="text-gray-300" />}
                  </label>
                </div>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer group justify-end">
                    <span className="text-sm font-bold text-gray-700">إظهار التقديرات (ممتاز/جيد..)</span>
                    <input type="checkbox" checked={config.showEstimates} onChange={(e) => handleChange('showEstimates', e.target.checked)} className="hidden" />
                    {config.showEstimates ? <CheckSquare className="text-blue-600" /> : <Square className="text-gray-300" />}
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group justify-end">
                    <span className="text-sm font-bold text-gray-700">إظهار تفاصيل الدرجات (أعمال سنة + تحريري)</span>
                    <input type="checkbox" checked={config.showDetailedScores} onChange={(e) => handleChange('showDetailedScores', e.target.checked)} className="hidden" />
                    {config.showDetailedScores ? <CheckSquare className="text-blue-600" /> : <Square className="text-gray-300" />}
                  </label>
                </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
               <label className="flex items-center gap-3 cursor-pointer group justify-end text-blue-700">
                  <span className="text-sm font-black">تفعيل الدرجات الفعلية للشهادة (تحويل الدرجات للنهاية العظمى المحددة للشهادة)</span>
                  <input type="checkbox" checked={config.useScaledScore} onChange={(e) => handleChange('useScaledScore', e.target.checked)} className="hidden" />
                  {config.useScaledScore ? <CheckSquare className="text-blue-700" /> : <Square className="text-blue-200" />}
               </label>
            </div>
          </div>

          {/* Logo Upload Section */}
          <div className="flex flex-row-reverse items-center justify-between p-4 bg-gray-50/30 rounded-xl border border-dashed border-gray-200">
            <div className="flex flex-row-reverse items-center gap-4">
              <label className="block text-sm font-bold text-gray-700">تغيير الشعار</label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-1.5 rounded-lg border border-blue-200 text-sm font-bold hover:bg-blue-100 transition">
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  تحميل صورة
                </label>
              </div>
            </div>
            <div className="w-16 h-16 bg-white rounded border flex items-center justify-center overflow-hidden">
               {config.logo ? <img src={config.logo} className="w-full h-full object-contain" alt="preview" /> : <ImageIcon className="text-gray-200" size={24}/>}
            </div>
          </div>

        </form>

        {/* Footer Action */}
        <div className="px-8 py-6 bg-white border-t flex justify-start">
          <button 
            onClick={handleFormSave} 
            className="px-10 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center gap-2"
          >
            <Save size={20} /> حفظ الإعدادات
          </button>
        </div>
      </div>
    </div>
  );
};

export default CertificateSettings;
