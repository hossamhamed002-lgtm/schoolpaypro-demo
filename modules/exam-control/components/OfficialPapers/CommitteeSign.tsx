
import React from 'react';
import { SchoolInfo, GradeLevel, GRADE_LABELS } from '../../examControl.types';

interface Props {
  schoolInfo: SchoolInfo;
  selectedGrade: GradeLevel;
}

const CommitteeSign: React.FC<Props> = ({ schoolInfo, selectedGrade }) => {
  return (
    <div id="exam-print-root" data-exam-print-preview className="p-[20mm] bg-white text-black font-sans border-[10px] border-black flex flex-col items-center justify-center h-full">
      <div className="w-full flex flex-col items-center">
          {schoolInfo.logo && <img src={schoolInfo.logo} className="h-32 object-contain mb-6" alt="logo" />}
          <h1 className="text-5xl font-black mb-6 text-center">{schoolInfo.schoolName}</h1>
      </div>
      <div className="w-full h-1 bg-black mb-16"></div>
      <div className="text-center space-y-12">
        <div className="text-6xl font-bold">لجنـة رقـم</div>
        <div className="text-[180px] font-black border-[15px] border-black px-24 py-10 inline-block leading-none">١</div>
        <div className="text-4xl font-bold pt-10">مقر اللجنة: ...................................</div>
        <div className="text-4xl font-bold">الصف: {GRADE_LABELS[selectedGrade]}</div>
      </div>
    </div>
  );
};

export default CommitteeSign;
