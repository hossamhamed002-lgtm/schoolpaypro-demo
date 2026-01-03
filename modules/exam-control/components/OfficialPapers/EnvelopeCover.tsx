
import React from 'react';
import { SchoolInfo, GradeLevel, GRADE_LABELS } from '../../examControl.types';

interface Props {
  schoolInfo: SchoolInfo;
  selectedGrade: GradeLevel;
  selectedTerm: string;
}

const EnvelopeCover: React.FC<Props> = ({ schoolInfo, selectedGrade, selectedTerm }) => {
  return (
    <div id="exam-print-root" data-exam-print-preview className="p-[20mm] bg-white text-black font-sans border-[6px] border-double border-black h-full flex flex-col">
      <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4 text-black">
        <div className="w-1/3 text-right font-bold text-xs space-y-1">
          <p>إدارة: {schoolInfo.educationalAdministration}</p>
          <p>مدرسة: {schoolInfo.schoolName}</p>
        </div>
        <div className="w-1/3 text-center">
          <h1 className="text-xl font-black underline mb-1">مظروف أسئلة امتحان</h1>
          <p className="text-xs font-bold">العام الدراسي: {schoolInfo.academicYear}</p>
        </div>
        <div className="w-1/3 text-left">
          {schoolInfo.logo && <img src={schoolInfo.logo} className="h-16 w-16 object-contain mr-auto" alt="logo" />}
        </div>
      </div>

      <div className="mt-12 space-y-12 text-2xl font-black flex-1">
        <div className="grid grid-cols-2 gap-10">
          <div className="p-4 border-2 border-black">الصف: {GRADE_LABELS[selectedGrade]}</div>
          <div className="p-4 border-2 border-black">المادة: .................................</div>
        </div>
        <div className="grid grid-cols-2 gap-10">
          <div className="p-4 border-2 border-black">اليوم: .................................</div>
          <div className="p-4 border-2 border-black">التاريخ:     /    /  202</div>
        </div>
        <div className="p-6 border-4 border-black text-center text-4xl bg-gray-50">
          عدد المظاريف: ( ....... ) مظروف
        </div>
        <div className="grid grid-cols-2 gap-10">
          <div className="p-4 border-2 border-black">عدد الأوراق: ...............</div>
          <div className="p-4 border-2 border-black">الفترة: .....................</div>
        </div>
      </div>
      <div className="mt-20 flex justify-between px-10 text-xl font-bold">
        <p>توقيع عضو الكنترول</p>
        <p>رئيس اللجنة</p>
      </div>
    </div>
  );
};

export default EnvelopeCover;
