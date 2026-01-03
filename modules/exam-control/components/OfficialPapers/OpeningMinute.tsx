
import React from 'react';
import { SchoolInfo, GradeLevel, GRADE_LABELS } from '../../examControl.types';
import { db } from '../../services/db';

interface Props {
  schoolInfo: SchoolInfo;
  selectedGrade: GradeLevel;
  selectedSubjectId?: string;
}

const OpeningMinute: React.FC<Props> = ({ schoolInfo, selectedGrade, selectedSubjectId }) => {
  const allSubjects = db.getSubjects();
  const currentSubject = allSubjects.find(s => s.id === selectedSubjectId);

  const renderHalf = (isTop: boolean) => (
    <div className={`flex-1 flex flex-col p-5 bg-white relative ${!isTop ? 'border-t-2 border-dashed border-gray-400' : ''}`}>
      {/* الهيدر العلوي */}
      <div className="flex justify-between items-start mb-4">
        <div className="w-1/3 text-right font-black text-[12px] space-y-0.5">
          <p>مديرية التربية والتعليم بـ {schoolInfo.governorate || '.......'}</p>
          <p>إدارة {schoolInfo.educationalAdministration || '.......'} التعليمية</p>
          <p>مدرسة {schoolInfo.schoolName || '.......'}</p>
        </div>
        <div className="w-1/3 flex justify-center">
          {schoolInfo.logo && <img src={schoolInfo.logo} className="h-16 object-contain" alt="logo" />}
        </div>
        <div className="w-1/3 text-left font-black text-xl">
          {isTop ? '١' : ''}
        </div>
      </div>

      <div className="w-full h-0.5 bg-black mb-6"></div>

      {/* محتوى المحضر */}
      <div className="text-center space-y-4 flex-1">
        <h2 className="text-xl font-black mb-2">
          محضر فتح مظروف مادة ( <span className="px-4 border-b border-black border-dotted">{currentSubject?.name || '................................'}</span> )
        </h2>

        <div className="space-y-4 text-lg font-black text-right leading-relaxed">
          <p>
            إنه في يوم <span className="px-8 border-b border-black border-dotted">...........................</span> 
            الموافق / <span className="px-8 border-b border-black border-dotted">...........................</span>
          </p>
          
          <p>
            في تمـام السـاعة ( <span className="px-6 border-b border-black border-dotted">................</span> ) 
            والدقيقـة ( <span className="px-6 border-b border-black border-dotted">................</span> )
          </p>

          <p>
            تم فتح مظروف مادة ( <span className="px-10 border-b border-black border-dotted">{currentSubject?.name || '................................'}</span> ) 
            للصف ( <span className="px-10 border-b border-black border-dotted">{GRADE_LABELS[selectedGrade].replace('الصف ', '')}</span> )
          </p>

          <p>
            وبه عدد ( <span className="px-8 border-b border-black border-dotted">................</span> ) ورقة . ووجدت الاختام سليمة والاوراق كافية
          </p>
        </div>
      </div>

      {/* التوقيعات */}
      <div className="mt-8 grid grid-cols-3 gap-4 text-center font-black text-md">
        <div className="space-y-2">
          <p className="underline underline-offset-4 mb-2">اللجنـــة</p>
          <div className="text-right pr-2 space-y-2 text-[13px]">
            <p>١- ....................................</p>
            <p>٢- ....................................</p>
            <p>٣- ....................................</p>
          </div>
        </div>
        <div className="flex flex-col justify-start">
          <p className="underline underline-offset-4 mb-8">مراقب أول اللجنة</p>
          <p className="text-[13px]">....................................</p>
        </div>
        <div className="flex flex-col justify-start">
          <p className="underline underline-offset-4 mb-8">رئيس اللجنة</p>
          <p className="text-[13px]">....................................</p>
        </div>
      </div>

      <div className="absolute bottom-1 left-2 opacity-10 text-[6px] font-mono select-none">
         - ENVELOPE OPENING MINUTE
      </div>
    </div>
  );

  return (
    <div id="exam-print-root" data-exam-print-preview className="w-[210mm] h-[297mm] bg-white flex flex-col font-sans text-black shadow-none border-0" dir="rtl">
      {renderHalf(true)}
      {renderHalf(false)}
    </div>
  );
};

export default OpeningMinute;
