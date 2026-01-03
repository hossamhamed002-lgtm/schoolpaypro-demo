
import React from 'react';
import { SchoolInfo } from '../../examControl.types';

interface Props {
  schoolInfo: SchoolInfo;
}

const ControlRoomMinute: React.FC<Props> = ({ schoolInfo }) => {
  const renderOpeningMinute = () => (
    <div className="flex-1 flex flex-col p-4 bg-white relative">
      {/* الهيدر العلوي */}
      <div className="flex justify-between items-start mb-4">
        <div className="w-1/3 flex justify-start">
           <div className="flex flex-col items-center">
              {schoolInfo.logo && <img src={schoolInfo.logo} className="h-12 object-contain" alt="logo" />}
           </div>
        </div>
        <div className="w-1/3 text-center">
            <span className="text-2xl font-black block mt-1">1</span>
        </div>
        <div className="w-1/3 text-right font-bold text-[13px] space-y-1">
          <p>إدارة {schoolInfo.educationalAdministration || '........'} التعليمية</p>
          <p>مدرسة {schoolInfo.schoolName || '........'}</p>
        </div>
      </div>

      {/* العنوان */}
      <div className="text-center mb-4">
        <h2 className="text-xl font-black underline underline-offset-4">محضر فتح حجرة الكنترول</h2>
      </div>

      {/* نص المحضر */}
      <div className="space-y-3 text-base font-black leading-relaxed text-right mb-4">
        <p>إنه في يوم <span className="px-6 border-b border-black border-dotted">................</span> الموافق <span className="px-4 border-b border-black border-dotted">    /    / 202</span> م وفي تمام الساعة <span className="px-6 border-b border-black border-dotted">................</span></p>
        <p>تم فتح حجرة الكنترول وتم تسلمها من النوبتجي بالمدرسة / <span className="px-10 border-b border-black border-dotted">........................................</span></p>
        <p className="pr-12">بعد معاينة الحجرة ووجدت الأقفال سليمة وهذا إقرار منا بذلك،،</p>
        <p className="pr-20">وتحرر هذا المحضر منا بذلك،،</p>
      </div>

      {/* جدول التوقيعات الفرعي */}
      <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
              <p className="font-black mb-4">الأعضاء</p>
              <div className="space-y-4">
                  <p className="border-b border-black border-dotted h-4"></p>
                  <p className="border-b border-black border-dotted h-4"></p>
                  <p className="border-b border-black border-dotted h-4"></p>
              </div>
          </div>
          <div className="text-center">
              <p className="font-black mb-4">التوقيع</p>
              <div className="space-y-4">
                  <p className="border-b border-black border-dotted h-4"></p>
                  <p className="border-b border-black border-dotted h-4"></p>
                  <p className="border-b border-black border-dotted h-4"></p>
              </div>
          </div>
          <div className="text-center flex flex-col items-center">
              <p className="font-black mb-4">النوبتجي</p>
              <div className="w-full border-b border-black border-dotted h-4 mt-8"></div>
          </div>
      </div>

      {/* التوقيعات الرئيسية */}
      <div className="flex justify-between items-end px-12 mt-4">
          <div className="text-center">
              <p className="text-base font-black mb-8">رئيس الكنترول</p>
          </div>
          <div className="text-center">
              <p className="text-base font-black mb-8">مدير المدرسة</p>
          </div>
      </div>
    </div>
  );

  const renderClosingMinute = () => (
    <div className="flex-1 flex flex-col p-4 bg-white relative border-t border-dashed border-slate-300">
      {/* الهيدر العلوي */}
      <div className="flex justify-between items-start mb-4">
        <div className="w-1/3 flex justify-start">
           <div className="flex flex-col items-center">
              {schoolInfo.logo && <img src={schoolInfo.logo} className="h-12 object-contain" alt="logo" />}
           </div>
        </div>
        <div className="w-1/3"></div>
        <div className="w-1/3 text-right font-bold text-[13px] space-y-1">
          <p>إدارة {schoolInfo.educationalAdministration || '........'} التعليمية</p>
          <p>مدرسة {schoolInfo.schoolName || '........'}</p>
        </div>
      </div>

      {/* العنوان */}
      <div className="text-center mb-4">
        <h2 className="text-xl font-black underline underline-offset-4">محضر غلق حجرة الكنترول</h2>
      </div>

      {/* نص المحضر */}
      <div className="space-y-3 text-base font-black leading-relaxed text-right mb-4">
        <p>إنه في يوم <span className="px-6 border-b border-black border-dotted">................</span> الموافق <span className="px-4 border-b border-black border-dotted">    /    / 202</span> م وفي تمام الساعة <span className="px-6 border-b border-black border-dotted">................</span></p>
        <p>تم غلق حجرة الكنترول وتم تسلمها إلى النوبتجي بالمدرسة / <span className="px-10 border-b border-black border-dotted">........................................</span></p>
        <p className="px-4">للمحافظة عليها وقد تم توقيعه على هذا المحضر تعهداً منه بالمحافظة عليها</p>
        <p className="pr-12">وسلامتها وسلامة الأختام طوال فترة حراسته</p>
        <p className="pr-24">وتحرر هذا المحضر منا بذلك،،</p>
      </div>

      {/* جدول التوقيعات الفرعي */}
      <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
              <p className="font-black mb-4">الأعضاء</p>
              <div className="space-y-4">
                  <p className="border-b border-black border-dotted h-4"></p>
                  <p className="border-b border-black border-dotted h-4"></p>
                  <p className="border-b border-black border-dotted h-4"></p>
              </div>
          </div>
          <div className="text-center">
              <p className="font-black mb-4">التوقيع</p>
              <div className="space-y-4">
                  <p className="border-b border-black border-dotted h-4"></p>
                  <p className="border-b border-black border-dotted h-4"></p>
                  <p className="border-b border-black border-dotted h-4"></p>
              </div>
          </div>
          <div className="text-center flex flex-col items-center">
              <p className="font-black mb-4">النوبتجي</p>
              <div className="w-full border-b border-black border-dotted h-4 mt-8"></div>
          </div>
      </div>

      {/* التوقيعات الرئيسية */}
      <div className="flex justify-between items-end px-12 mt-4">
          <div className="text-center">
              <p className="text-base font-black mb-8">رئيس الكنترول</p>
          </div>
          <div className="text-center">
              <p className="text-base font-black mb-8">مدير المدرسة</p>
          </div>
      </div>
    </div>
  );

  return (
    <div id="exam-print-root" data-exam-print-preview className="w-[210mm] min-h-[297mm] bg-white flex flex-col font-sans text-black" dir="rtl">
      {renderOpeningMinute()}
      {renderClosingMinute()}
    </div>
  );
};

export default ControlRoomMinute;
