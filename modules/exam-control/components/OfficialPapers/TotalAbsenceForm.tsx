
import React from 'react';
import { SchoolInfo, GradeLevel, GRADE_LABELS } from '../../examControl.types';

interface Props {
  schoolInfo: SchoolInfo;
  selectedGrade: GradeLevel;
  selectedTerm: string;
}

const TotalAbsenceForm: React.FC<Props> = ({ schoolInfo, selectedGrade, selectedTerm }) => {
  return (
    <div id="exam-print-root" data-exam-print-preview className="p-[10mm] bg-white text-black font-sans border-2 border-black h-full flex flex-col" dir="rtl">
      {/* الهيدر العلوي */}
      <div className="flex justify-between items-start mb-2">
          <div className="text-right font-bold text-[11px] space-y-1">
              <p>مديرية التربية والتعليم بـ {schoolInfo.governorate || '........'}</p>
              <p>إدارة {schoolInfo.educationalAdministration || '........'} التعليمية</p>
              <p>مدرسة {schoolInfo.schoolName || '........'}</p>
          </div>
          <div className="w-24 h-20 flex items-center justify-center">
              {schoolInfo.logo && <img src={schoolInfo.logo} className="max-h-full max-w-full object-contain" alt="logo" />}
          </div>
      </div>

      {/* العنوان والبيانات الأساسية */}
      <div className="text-center mb-6">
          <h1 className="text-3xl font-black mb-4 tracking-tighter">استمارة غياب إجمالى</h1>
          <div className="text-[14px] font-bold space-y-3">
              <p>لامتحان <span className="px-6 border-b border-black border-dotted">{selectedTerm === 'term1' ? 'نصف العام' : 'آخر العام'}</span> العام الدراسي <span className="px-4 border-b border-black border-dotted">{schoolInfo.academicYear}</span> م</p>
              <div className="flex justify-center gap-12 mt-2">
                  <p>المادة: <span className="px-12 border-b border-black border-dotted">........................</span></p>
                  <p>الفترة: <span className="px-8 border-b border-black border-dotted">........................</span></p>
                  <p>التاريخ: <span className="px-4">    /    / 202</span>م</p>
              </div>
              <p className="mt-2">الصف الدراسي: <span className="px-10 border-b border-black border-dotted">{GRADE_LABELS[selectedGrade]}</span></p>
          </div>
      </div>

      {/* الجدول الرئيسي - مطابق للصورة */}
      <table className="w-full border-collapse border-[2px] border-black text-center font-bold text-[13px] flex-1">
          <thead>
              <tr className="bg-gray-50">
                  <th rowSpan={2} className="border-2 border-black w-20">رقم اللجنة</th>
                  <th rowSpan={2} className="border-2 border-black px-6">اسم الطالب</th>
                  <th rowSpan={2} className="border-2 border-black w-28">رقم الجلوس</th>
                  <th colSpan={2} className="border-2 border-black w-48">توقيع الملاحظين</th>
                  <th rowSpan={2} className="border-2 border-black w-36">المراقب</th>
              </tr>
              <tr className="bg-gray-50">
                  <th className="border-2 border-black py-1">١</th>
                  <th className="border-2 border-black py-1">٢</th>
              </tr>
          </thead>
          <tbody>
              {[...Array(14)].map((_, i) => (
                  <tr key={i} className="h-11">
                      <td className="border-2 border-black"></td>
                      <td className="border border-black"></td>
                      <td className="border border-black"></td>
                      <td className="border border-black"></td>
                      <td className="border border-black"></td>
                      <td className="border-2 border-black"></td>
                  </tr>
              ))}
          </tbody>
      </table>

      {/* تذييل الاستمارة - التوقيعات */}
      <div className="mt-8 flex justify-between items-end px-12 mb-4">
          <div className="text-center w-64">
              <p className="text-md font-black underline underline-offset-4 mb-12">رئيس الكنترول</p>
              <p className="text-slate-800 font-bold">{schoolInfo.controlHead || '.................................'}</p>
          </div>
          <div className="text-center w-64">
              <p className="text-md font-black underline underline-offset-4 mb-12">يعتمد مدير المدرسة</p>
              <p className="text-slate-800 font-bold">{schoolInfo.managerName || '.................................'}</p>
          </div>
      </div>

      {/* نظام Eagle Eye */}
      <div className="mt-auto pt-2 border-t border-dashed border-gray-200 text-[7px] text-gray-400 font-mono tracking-[0.2em] text-left opacity-40 uppercase">
          - ABSENCE LOG FORM
      </div>
    </div>
  );
};

export default TotalAbsenceForm;
