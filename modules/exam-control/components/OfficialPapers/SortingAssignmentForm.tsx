
import React from 'react';
import { SchoolInfo } from '../../examControl.types';

interface Props {
  schoolInfo: SchoolInfo;
}

const SortingAssignmentForm: React.FC<Props> = ({ schoolInfo }) => {
  return (
    <div id="exam-print-root" data-exam-print-preview className="p-5 bg-white text-black font-sans flex flex-col h-full border-[1px] border-gray-200" dir="rtl">
      {/* الترويسة الرسمية */}
      <div className="flex justify-between items-start mb-4">
          <div className="w-1/3">
             {schoolInfo.logo && <img src={schoolInfo.logo} className="h-16 object-contain" alt="logo" />}
          </div>
          <div className="w-1/3"></div>
          <div className="w-1/3 text-right font-bold text-[11px] space-y-0.5">
              <p>مديرية التربية والتعليم بـ {schoolInfo.governorate || '........'}</p>
              <p>إدارة {schoolInfo.educationalAdministration || '........'} التعليمية</p>
              <p>مدرسة {schoolInfo.schoolName || '........'}</p>
          </div>
      </div>

      {/* العنوان الرئيسي */}
      <div className="text-center mb-6">
          <h1 className="text-3xl font-black">أمر تكليف لفرز أوراق الإجابة</h1>
      </div>

      {/* نص التكليف */}
      <div className="space-y-4 text-lg font-bold leading-relaxed text-right mb-6 px-4">
          <p>
            قررت إدارة المدارس تكليف السادة الآتي أسمائهم بأعمال فرز وتجهيز أوراق إجابة 
            استمارة رقم [ <span className="px-6 border-b border-black border-dotted"></span> ] 
            للمرحلة <span className="px-10 border-b border-black border-dotted">................</span> 
            والتأكد من سلامتها وخلوها من أي عيوب.
          </p>
          <p className="pr-10">
            وذلك لامتحانات <span className="px-12 border-b border-black border-dotted">................</span> 
            العام الدراسي <span className="px-6 border-b border-black border-dotted">{schoolInfo.academicYear}</span> م
          </p>
      </div>

      {/* الجدول الرئيسي */}
      <div className="px-6 mb-6">
        <table className="w-full border-collapse border-[2px] border-black text-center font-bold text-md">
            <thead>
                <tr className="bg-gray-200 h-12">
                    <th className="border-[2px] border-black w-14 text-xl font-black">م</th>
                    <th className="border-[2px] border-black px-4 text-xl font-black">الاســــــــم</th>
                    <th className="border-[2px] border-black w-48 text-xl font-black">التوقيــــــــع</th>
                </tr>
            </thead>
            <tbody>
                {[...Array(10)].map((_, i) => (
                    <tr key={i} className="h-10">
                        <td className="border-2 border-black font-mono text-lg">{i + 1}</td>
                        <td className="border-2 border-black"></td>
                        <td className="border-2 border-black"></td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* التذييل */}
      <div className="text-center mb-10">
          <p className="text-lg font-black">وهذا تكليف بذلك</p>
      </div>

      <div className="mt-auto flex justify-between items-end px-4 mb-2">
          <div className="text-center w-56">
              <p className="text-md font-black mb-10">رئيس الكنترول</p>
              <p className="text-slate-800 font-bold text-sm">{schoolInfo.controlHead || '........'}</p>
          </div>
          <div className="text-center w-40">
              <p className="text-md font-black mb-10">يعتمد ......</p>
          </div>
          <div className="text-center w-56">
              <p className="text-md font-black mb-10">مدير المدارس</p>
              <p className="text-slate-800 font-bold text-sm">{schoolInfo.managerName || '........'}</p>
          </div>
      </div>

      <div className="mt-2 pt-1 border-t border-dashed border-gray-200 text-[7px] text-gray-400 font-mono tracking-widest text-left opacity-30 uppercase">
          - ANSWER SHEET SORTING ASSIGNMENT
      </div>
    </div>
  );
};

export default SortingAssignmentForm;
