
import React from 'react';
import { SchoolInfo, GradeLevel, GRADE_LABELS } from '../../examControl.types';

interface Props {
  schoolInfo: SchoolInfo;
  selectedGrade: GradeLevel;
}

const AbsentList: React.FC<Props> = ({ schoolInfo, selectedGrade }) => {
  return (
    <div id="exam-print-root" data-exam-print-preview className="p-[10mm] bg-white text-black font-sans border-2 border-black h-full flex flex-col">
      <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4 text-black">
        <div className="w-1/3 text-right font-bold text-xs space-y-1">
          <p>إدارة: {schoolInfo.educationalAdministration}</p>
          <p>مدرسة: {schoolInfo.schoolName}</p>
        </div>
        <div className="w-1/3 text-center">
          <h1 className="text-xl font-black underline mb-1">كشف غياب الطلاب في المادة</h1>
          <p className="text-xs font-bold">العام الدراسي: {schoolInfo.academicYear}</p>
        </div>
        <div className="w-1/3 text-left">
          {schoolInfo.logo && <img src={schoolInfo.logo} className="h-16 w-16 object-contain mr-auto" alt="logo" />}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4 font-bold text-sm">
        <p>المادة: .........................</p>
        <p>اليوم: .........................</p>
        <p>الصف: {GRADE_LABELS[selectedGrade]}</p>
        <p>التاريخ: .... / .... / 202</p>
      </div>
      <table className="w-full border-collapse border-2 border-black text-center font-bold text-sm flex-1">
        <thead className="bg-gray-100">
          <tr>
            <th className="border border-black p-2 w-12">م</th>
            <th className="border border-black p-2">اسم الطالب الغائب</th>
            <th className="border border-black p-2 w-32">رقم الجلوس</th>
            <th className="border border-black p-2 w-32">رقم اللجنة</th>
            <th className="border border-black p-2">السبب (إن وجد)</th>
          </tr>
        </thead>
        <tbody>
          {[...Array(15)].map((_, i) => (
            <tr key={i} className="h-10">
              <td className="border border-black">{i + 1}</td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-8 flex justify-between font-bold px-4">
        <p>مسئول الغياب: ...................</p>
        <p>رئيس اللجنة: ...................</p>
      </div>
    </div>
  );
};

export default AbsentList;
