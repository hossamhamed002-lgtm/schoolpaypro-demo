
import React from 'react';
import { SchoolInfo, GradeLevel } from '../../examControl.types';

interface Props {
  schoolInfo: SchoolInfo;
  selectedGrade: GradeLevel;
  selectedTerm: string;
}

const IndividualAbsenceForm: React.FC<Props> = ({ schoolInfo, selectedTerm }) => {
  const termLabel = selectedTerm === 'term1' ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثاني';

  const renderHalf = (isTop: boolean) => (
    <div className={`flex-1 flex flex-col p-8 bg-white relative ${!isTop ? 'border-t-2 border-dashed border-gray-400' : ''}`}>
      {/* الهيدر العلوي */}
      <div className="flex justify-between items-start mb-6">
        <div className="w-1/3 text-right font-bold text-[10px] space-y-0.5">
          <p>مديرية التربية والتعليم بـ {schoolInfo.governorate || '........'}</p>
          <p>إدارة {schoolInfo.educationalAdministration || '........'} التعليمية</p>
          <p>مدرسة {schoolInfo.schoolName || '........'}</p>
        </div>
        <div className="w-1/3 flex justify-center">
          {schoolInfo.logo && <img src={schoolInfo.logo} className="h-16 object-contain" alt="logo" />}
        </div>
        <div className="w-1/3 text-left">
           {/* دائرة الرقم السري */}
           <div className="flex flex-col items-center">
              <span className="text-sm font-black mb-1">الرقم السرى</span>
              <div className="w-20 h-14 border-2 border-black rounded-[50%] flex items-center justify-center"></div>
           </div>
        </div>
      </div>

      {/* العنوان والبيانات الأساسية (الفصل والعام) */}
      <div className="text-center mb-8">
        <h2 className="text-xl font-black flex flex-col items-center justify-center gap-2">
          <span>إستمارة غياب إمتحان ( {termLabel} )</span>
          <span>العام الدراسى ( {schoolInfo.academicYear} ) م</span>
        </h2>
      </div>

      {/* حقول البيانات - فارغة تماماً للتعبئة اليدوية */}
      <div className="space-y-6 text-sm font-black">
        <div className="flex items-center gap-2">
          <span>الصف :</span>
          <span className="flex-1 border-b border-black border-dotted h-5 flex items-end px-2">..................................................................</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span>المادة :</span>
          <span className="flex-1 border-b border-black border-dotted h-5">..................................................................</span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <span>اليوم :</span>
            <span className="flex-1 border-b border-black border-dotted h-5">........................</span>
          </div>
          <div className="flex items-center gap-2">
            <span>الموافق :</span>
            <span className="flex-1 border-b border-black border-dotted h-5 text-center">   /   / ٢٠٢ م</span>
          </div>
          <div className="flex items-center gap-2">
            <span>الفترة :</span>
            <span className="flex-1 border-b border-black border-dotted h-5">........................</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="flex items-center gap-2">
            <span>إسم التلميذ الغائب :</span>
            <span className="flex-1 border-b border-black border-dotted h-5">............................................</span>
          </div>
          <div className="flex items-center gap-2">
            <span>رقم الجلوس :</span>
            <span className="flex-1 border-b border-black border-dotted h-5 font-mono">........................</span>
          </div>
        </div>

        {/* التوقيعات */}
        <div className="grid grid-cols-2 gap-10 pt-4">
          <div className="space-y-4">
            <p className="underline decoration-1 underline-offset-4">توقيع الملاحظين :</p>
            <div className="pr-6 space-y-4">
               <div className="flex items-center gap-2">
                 <span>١-</span>
                 <span className="flex-1 border-b border-black border-dotted h-5"></span>
               </div>
               <div className="flex items-center gap-2">
                 <span>٢-</span>
                 <span className="flex-1 border-b border-black border-dotted h-5"></span>
               </div>
            </div>
          </div>
          <div className="flex flex-col justify-end pb-1">
             <div className="flex items-center gap-2">
               <span className="underline decoration-1 underline-offset-4">توقيع المراقب :</span>
               <span className="flex-1 border-b border-black border-dotted h-5"></span>
             </div>
          </div>
        </div>
      </div>

      {/* ماركة النظام */}
      <div className="absolute bottom-2 left-4 opacity-20 text-[6px] font-mono select-none">
         - BLANK INDIVIDUAL ABSENCE FORM
      </div>
    </div>
  );

  return (
    <div id="exam-print-root" data-exam-print-preview className="w-[210mm] h-[297mm] bg-white flex flex-col font-sans text-black" dir="rtl">
      {renderHalf(true)}
      {renderHalf(false)}
    </div>
  );
};

export default IndividualAbsenceForm;
