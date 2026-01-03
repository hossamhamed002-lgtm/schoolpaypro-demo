
import React from 'react';
import { SchoolInfo, GradeLevel, GRADE_LABELS } from '../../examControl.types';

interface Props {
  schoolInfo: SchoolInfo;
  selectedGrade: GradeLevel;
  selectedTerm: string;
  selectedSubjectId: string;
}

const SubjectCorrectionMinute: React.FC<Props> = ({ schoolInfo }) => {
  const renderHalf = (isTop: boolean) => (
    <div className={`flex-1 flex flex-col p-5 bg-white relative ${!isTop ? 'border-t-2 border-dashed border-gray-400' : ''}`}>
      {/* الهيدر العلوي */}
      <div className="flex justify-between items-start mb-4">
        <div className="w-1/3 text-right font-bold text-[10px] space-y-0.5">
          <p>إدارة {schoolInfo.educationalAdministration || '........'} التعليمية</p>
          <p>مدرسة {schoolInfo.schoolName || '........'}</p>
        </div>
        <div className="w-1/3 flex justify-center">
          {schoolInfo.logo && <img src={schoolInfo.logo} className="h-14 object-contain" alt="logo" />}
        </div>
        <div className="w-1/3 text-left font-black text-xl">
          {isTop ? '١' : ''}
        </div>
      </div>

      {/* العناوين والبيانات - فارغة للتعبئة اليدوية */}
      <div className="flex justify-between items-center mb-6 font-black text-sm">
        <div className="flex-1 space-y-4 text-right">
           <p>أمتـحان: <span className="px-12 border-b border-black border-dotted">................................</span></p>
           <p>محضر تصحيح مادة: <span className="px-12 border-b border-black border-dotted">................................</span></p>
        </div>
        <div className="flex-1 space-y-4 text-left">
           <p>التاريـخ: <span className="px-6">    /    / 202</span> م</p>
           <p>للصـف: <span className="px-12 border-b border-black border-dotted">................................</span></p>
        </div>
      </div>

      {/* الجدول الرئيسي */}
      <table className="w-full border-collapse border-[2px] border-black text-center font-bold text-[11px] flex-1">
        <thead>
          <tr className="bg-gray-100 h-10">
            <th className="border-[2px] border-black p-1 w-20">رقم السؤال</th>
            <th className="border-[2px] border-black p-1">اسم المصحح</th>
            <th className="border-[2px] border-black p-1 w-24">توقيعه</th>
            <th className="border-[2px] border-black p-1">اسم المراجع الفني</th>
            <th className="border-[2px] border-black p-1 w-24">توقيعه</th>
          </tr>
        </thead>
        <tbody>
          {[...Array(8)].map((_, i) => (
            <tr key={i} className="h-10">
              <td className="border-[2px] border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* التذييل داخل النصف */}
      <div className="mt-4 flex justify-between font-black text-[10px]">
         <p>جمع جزئيات الورقة: ....................................................</p>
         <p>الجمع الكلى للورقة: ....................................................</p>
      </div>

      <div className="absolute bottom-1 left-2 opacity-10 text-[5px] font-mono select-none">
         - BLANK CORRECTION FORM
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

export default SubjectCorrectionMinute;
