
import React, { useMemo } from 'react';
import { SchoolInfo, GradeLevel, GRADE_LABELS, Student, Subject } from '../../examControl.types';
import { db } from '../../services/db';

interface Props {
  schoolInfo: SchoolInfo;
  selectedGrade: GradeLevel;
  selectedTerm: 'term1' | 'term2';
  selectedClass: string;
}

const AnnualWorkSheet: React.FC<Props> = ({ schoolInfo, selectedGrade, selectedTerm, selectedClass }) => {
  const students = useMemo(() => {
    return db.getStudents().filter(s => 
      s.gradeLevel === selectedGrade && 
      (selectedClass === 'all' || s.classroom === selectedClass)
    ).sort((a, b) => (a.seatingNumber || 0) - (b.seatingNumber || 0));
  }, [selectedGrade, selectedClass]);

  const subjects = useMemo(() => {
    return db.getSubjects().filter(s => s.gradeLevels?.includes(selectedGrade));
  }, [selectedGrade]);

  const grades = db.getGrades();
  const termLabel = selectedTerm === 'term1' ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثاني';

  // حساب عرض أعمدة المواد بناءً على المساحة المتبقية (100% - 25% للاسم - 5% للمسلسل - 5% للفصل)
  const remainingWidth = 65;
  const subjectColumnWidth = subjects.length > 0 ? (remainingWidth / subjects.length) : 0;

  return (
    <div id="exam-print-root" data-exam-print-preview className="p-[5mm] bg-white text-black font-sans flex flex-col w-[210mm] min-h-[297mm] mx-auto" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 portrait !important; margin: 0 !important; }
          #exam-print-root { width: 100% !important; height: auto !important; padding: 10mm !important; border: none !important; }
          tr { page-break-inside: avoid !important; }
          td, th { white-space: nowrap !important; overflow: hidden; text-overflow: clip !important; }
        }
        .vertical-header-container {
          height: 70px; /* أقل قليلاً من 80 لترك مساحة للحواف */
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
        }
        .vertical-header-text {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          white-space: nowrap;
          font-size: 11px;
          line-height: 1;
          text-align: center;
        }
        /* تثبيت عرض الخلايا ومنع التمدد */
        table { table-layout: fixed !important; width: 100% !important; border-collapse: collapse !important; }
        .cell-content { width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      `}} />

      {/* الترويسة المسحوبة من بيانات المدرسة */}
      <div className="flex justify-between items-start mb-4">
        <div className="w-1/3 text-right font-black text-[12px] space-y-0.5">
          <p>محافظة: {schoolInfo.governorate || '................'}</p>
          <p>إدارة {schoolInfo.educationalAdministration || '................'} التعليمية</p>
          <p>مدرسة {schoolInfo.schoolName || '................'}</p>
        </div>
        
        <div className="flex-1 flex flex-col items-center">
            {schoolInfo.logo && <img src={schoolInfo.logo} className="h-14 object-contain mb-2" alt="logo" />}
            <h1 className="text-xl font-black border-b-2 border-black px-4 whitespace-nowrap">كشف درجات أعمال السنة</h1>
            <p className="text-xs font-bold mt-1">العام الدراسي {schoolInfo.academicYear} م</p>
        </div>

        <div className="w-1/3 text-left font-black text-[12px] space-y-0.5">
            <p>الصف: {GRADE_LABELS[selectedGrade].replace('الصف ', '')}</p>
            <p>{termLabel}</p>
            <p>الفصل: {selectedClass === 'all' ? 'كل الفصول' : selectedClass}</p>
        </div>
      </div>

      {/* الجدول مع التنسيق الثابت المطلوب */}
      <div className="flex-1 overflow-hidden">
      <table data-exam-print-table className="w-full border-collapse border-[2px] border-black text-center">
          <thead>
            {/* الصف الأول بارتفاع 80 بكسل */}
            <tr className="bg-gray-100 h-[80px]">
              <th className="border-[2px] border-black w-[5%] text-[10px]">م</th>
              <th className="border-[2px] border-black w-[25%] text-[12px] font-black px-1">الاســـــــــــــــــــــــــم</th>
              <th className="border-[2px] border-black w-[5%] text-[10px]">الفصل</th>
              {subjects.map(sub => (
                <th key={sub.id} style={{ width: `${subjectColumnWidth}%` }} className="border-[2px] border-black p-0">
                   <div className="vertical-header-container">
                      <span className="vertical-header-text font-black">{sub.name}</span>
                   </div>
                </th>
              ))}
            </tr>
            <tr className="bg-slate-200 h-8">
              <th colSpan={3} className="border-[2px] border-black text-[10px]">النهاية العظمى</th>
              {subjects.map(sub => (
                <th key={sub.id} className="border-[2px] border-black text-[11px] font-black">{sub.yearWork}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => (
              <tr key={student.id} className="h-8 border-b border-black">
                <td className="border border-black text-[11px]">{idx + 1}</td>
                <td className="border border-black text-right pr-2 font-black text-[11px]">
                  <div className="cell-content">{student.name}</div>
                </td>
                <td className="border border-black text-[10px]">{student.classroom}</td>
                {subjects.map(sub => {
                  const record = grades[student.id]?.[sub.id];
                  const termData = selectedTerm === 'term1' ? record?.term1 : record?.term2;
                  const value = termData?.work;
                  return (
                    <td key={sub.id} className="border border-black font-mono text-[12px] font-black">
                      {value === 0 || value === undefined ? '' : (value === -1 ? 'غ' : value)}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* صف التوقيعات لكل مادة في نهاية الجدول بارتفاع 40 بكسل */}
            <tr className="h-[40px] bg-gray-50 font-black text-[10px]">
              <td colSpan={3} className="border-[2px] border-black">توقيع مدرس المادة</td>
              {subjects.map(sub => (
                <td key={sub.id} className="border-[2px] border-black"></td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* التوقيعات الإدارية */}
      <div className="mt-6 flex justify-between items-end px-6 font-black text-[12px] no-break">
        <div className="text-center w-40 space-y-6">
          <p className="underline underline-offset-4 decoration-1">شئون الطلبة</p>
          <p className="font-normal text-gray-300 text-[10px]">........................</p>
        </div>
        <div className="text-center w-40 space-y-6">
          <p className="underline underline-offset-4 decoration-1">رئيس الكنترول</p>
          <p className="text-[11px]">{schoolInfo.controlHead || '........................'}</p>
        </div>
        <div className="text-center w-40 space-y-6">
          <p className="underline underline-offset-4 decoration-1">يعتمد مدير المدرسة</p>
          <p className="text-[11px]">{schoolInfo.managerName || '........................'}</p>
        </div>
      </div>
    </div>
  );
};

export default AnnualWorkSheet;
