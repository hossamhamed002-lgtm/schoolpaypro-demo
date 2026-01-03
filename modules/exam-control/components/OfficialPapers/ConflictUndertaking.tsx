
import React from 'react';
import { SchoolInfo } from '../../examControl.types';

interface Props {
  schoolInfo: SchoolInfo;
}

const ConflictUndertaking: React.FC<Props> = ({ schoolInfo }) => {
  return (
    <div id="exam-print-root" data-exam-print-preview className="p-[10mm] bg-white text-black font-sans flex flex-col h-full border border-gray-200" dir="rtl">
      
      {/* الجزء العلوي - مطابق للصورة */}
      <div className="flex justify-between items-start mb-6">
          <div className="text-right font-bold text-sm space-y-1">
              <p>مديرية التربية والتعليم بـ {schoolInfo.governorate || '........'}</p>
              <p>إدارة {schoolInfo.educationalAdministration || '........'} التعليمية</p>
              <p>مدرسة {schoolInfo.schoolName || '........'}</p>
          </div>
          <div className="w-32 h-20 flex items-center justify-center">
              {schoolInfo.logo ? (
                  <img src={schoolInfo.logo} className="max-h-full max-w-full object-contain" alt="logo" />
              ) : (
                  <div className="text-[10px] text-gray-300 border border-dashed p-2">مكان الشعار</div>
              )}
          </div>
      </div>

      {/* العنوان الرئيسي */}
      <div className="text-center mb-4">
          <h1 className="text-2xl font-black underline underline-offset-8 decoration-2">إقرارات العاملين باللجنة</h1>
      </div>

      {/* نص الإقرار المقتبس من الصورة */}
      <div className="mb-6 px-2 text-right">
          <p className="text-[13px] font-black leading-relaxed">
              نقر نحن الموقعين أدناه والعاملين بمدرسة <span className="underline px-2">{schoolInfo.schoolName || '................................'}</span> 
              أثناء امتحانات <span className="px-4 border-b border-black">................................</span> 
              للعام الدراسي <span className="px-2 border-b border-black">20 / 20</span> م 
              بأننا لسنا محرومين من أعمال الامتحانات ولا يوجد لدينا أقارب من الدرجة الأولى وحتى الدرجة الرابعة 
              وفي حاله ثبوت عكس ذلك نتحمل المسئولية القانونية لذلك.
          </p>
      </div>

      {/* الجدول الرئيسي - مطابق للصورة */}
      <table className="w-full border-collapse border-2 border-black text-center font-bold text-[12px] flex-1">
          <thead>
              <tr className="bg-gray-200">
                  <th rowSpan={2} className="border-2 border-black w-8">م</th>
                  <th rowSpan={2} className="border-2 border-black px-2">الاسم</th>
                  <th rowSpan={2} className="border-2 border-black px-2 w-32">الوظيفة</th>
                  <th colSpan={2} className="border-2 border-black w-24">درجة القرابة</th>
                  <th rowSpan={2} className="border-2 border-black px-2 w-32">التوقيع</th>
                  <th rowSpan={2} className="border-2 border-black px-2 w-48">ملاحظات</th>
              </tr>
              <tr className="bg-gray-200">
                  <th className="border-2 border-black w-12 py-1">نعم</th>
                  <th className="border-2 border-black w-12 py-1">لا</th>
              </tr>
          </thead>
          <tbody>
              {[...Array(16)].map((_, i) => (
                  <tr key={i} className="h-10">
                      <td className="border-2 border-black font-mono text-[10px]">{i + 1}</td>
                      <td className="border border-black"></td>
                      <td className="border border-black"></td>
                      <td className="border border-black"></td>
                      <td className="border border-black"></td>
                      <td className="border border-black"></td>
                      <td className="border border-black"></td>
                  </tr>
              ))}
          </tbody>
      </table>

      {/* التوقيع النهائي */}
      <div className="mt-6 flex justify-between items-end px-10">
          <div className="text-center w-64">
              <p className="text-sm font-bold underline underline-offset-4 mb-8">يعتمد مدير المدرسة</p>
              <p className="text-gray-300 font-normal">.................................</p>
          </div>
          <div className="text-center w-64">
              <p className="text-sm font-bold underline underline-offset-4 mb-8">رئيس اللجنة</p>
              <p className="text-gray-300 font-normal">.................................</p>
          </div>
      </div>

      {/* تذييل الصفحة */}
      <div className="mt-4 pt-2 border-t border-dashed border-gray-200 text-[8px] text-gray-400 font-mono tracking-widest text-left opacity-50 uppercase">
          - STAFF DECLARATION FORM
      </div>
    </div>
  );
};

export default ConflictUndertaking;
