
import React, { useMemo } from 'react';
import { SchoolInfo, GradeLevel, GRADE_LABELS, Teacher, ExamCommittee, ObservationAssignment, ExamScheduleItem } from '../../examControl.types';
import { db } from '../../services/db';

interface Props {
  schoolInfo: SchoolInfo;
  selectedGrade: GradeLevel;
  selectedTerm: 'term1' | 'term2';
}

const ObserversDistribution: React.FC<Props> = ({ schoolInfo, selectedGrade, selectedTerm }) => {
  const schedule = db.getExamSchedule(selectedGrade, selectedTerm);
  const committees = db.getCommittees().filter(c => c.gradeLevel === selectedGrade);
  const assignments = db.getObservationAssignments().filter(a => a.term === selectedTerm);
  const teachers = db.getTeachers();
  const students = db.getStudents();

  const getStudentCount = (committeeId: string) => {
    return students.filter(s => s.committeeId === committeeId && s.gradeLevel === selectedGrade).length;
  };

  if (schedule.length === 0) {
    return (
      <div className="p-20 text-center text-gray-400 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
        <p className="text-xl font-bold">لم يتم العثور على جدول امتحانات لهذا الصف</p>
        <p className="text-sm mt-2 text-gray-500 italic">يرجى ضبط جدول الامتحانات في قسم "الكنترول" أولاً</p>
      </div>
    );
  }

  return (
    <div id="exam-print-root" data-exam-print-preview className="space-y-12 bg-gray-50 p-4 no-print-bg" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          tr { page-break-inside: avoid !important; }
          .print-container { height: auto !important; min-height: 296mm !important; }
          td, th { white-space: nowrap !important; }
        }
        table { table-layout: auto !important; width: 100% !important; }
        td, th { white-space: nowrap !important; overflow: hidden; }
      `}} />
      {schedule.map((exam, examIdx) => (
        <div key={exam.id} className="p-[10mm] bg-white text-black font-sans flex flex-col print-container border-[1px] border-gray-300 shadow-lg break-after-page">
          
          <div className="flex justify-between items-start mb-6">
              <div className="text-right font-black text-xs space-y-1">
                  <p>مديرية التربية والتعليم بـ {schoolInfo.governorate || '........'}</p>
                  <p>إدارة {schoolInfo.educationalAdministration || '........'} التعليمية</p>
                  <p>لجنة {schoolInfo.schoolName || '........'}</p>
              </div>
              <div className="text-center flex-1">
                {schoolInfo.logo && <img src={schoolInfo.logo} className="h-16 mx-auto mb-2 object-contain" alt="logo" />}
                <h1 className="text-xl font-black underline underline-offset-4 decoration-2 whitespace-nowrap">جدول توزيع الملاحظين لامتحان {selectedTerm === 'term1' ? 'نصف العام' : 'آخر العام'}</h1>
              </div>
              <div className="w-40 text-left font-bold text-xs">
                <p>العام الدراسي: {schoolInfo.academicYear}</p>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm font-black border-2 border-black p-3 bg-gray-50">
             <div className="flex justify-between">
                <span className="whitespace-nowrap">اليوم: <span className="font-normal underline decoration-dotted">{exam.day}</span></span>
                <span className="whitespace-nowrap">الموافق: <span className="font-normal underline decoration-dotted">{exam.date}</span></span>
             </div>
             <div className="flex justify-between pr-4">
                <span className="whitespace-nowrap">المادة: <span className="text-lg text-blue-800">{exam.subjectName}</span></span>
                <span className="whitespace-nowrap">الفترة: <span className="font-normal border-b border-black px-4">............</span></span>
             </div>
          </div>

          <div className="overflow-x-auto">
            <table data-exam-print-table className="w-full border-collapse border-2 border-black text-center font-bold text-[11px]">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="border-2 border-black px-2 py-2">اللجنة</th>
                        <th className="border-2 border-black px-4">المقر</th>
                        <th className="border-2 border-black px-4">الصف</th>
                        <th className="border-2 border-black px-2">العدد</th>
                        <th className="border-2 border-black px-6">اسم الملاحظ</th>
                        <th className="border-2 border-black px-4">التوقيع</th>
                        <th className="border-2 border-black px-6">اسم المراقب</th>
                        <th className="border-2 border-black px-4">التوقيع</th>
                    </tr>
                </thead>
                <tbody>
                    {committees.map((comm) => {
                        const assignment = assignments.find(a => a.scheduleId === exam.id && a.committeeId === comm.id);
                        
                        return (
                          <React.Fragment key={comm.id}>
                            <tr className="min-h-[10mm]">
                                <td rowSpan={2} className="border-2 border-black bg-gray-50 font-black text-sm px-2">{comm.name.replace(/\D/g, '') || comm.name}</td>
                                <td rowSpan={2} className="border-2 border-black leading-tight py-1 px-3">{comm.location}</td>
                                <td rowSpan={2} className="border-2 border-black leading-tight py-1 px-3">{GRADE_LABELS[selectedGrade].replace('الصف ', '')}</td>
                                <td rowSpan={2} className="border-2 border-black font-mono px-2">{getStudentCount(comm.id)}</td>
                                <td className="border border-black text-right pr-4 text-[12px] py-2 leading-tight">
                                  {teachers.find(t => t.id === assignment?.observerIds[0])?.name || '......................................'}
                                </td>
                                <td className="border border-black"></td>
                                <td rowSpan={2} className="border-2 border-black px-6"></td>
                                <td rowSpan={2} className="border-2 border-black px-4"></td>
                            </tr>
                            <tr className="min-h-[10mm]">
                                <td className="border border-black text-right pr-4 text-[12px] py-2 leading-tight">
                                  {teachers.find(t => t.id === assignment?.observerIds[1])?.name || '......................................'}
                                </td>
                                <td className="border border-black"></td>
                            </tr>
                          </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
          </div>

          <div className="mt-auto pt-8 flex justify-between items-end px-10">
              <div className="text-center w-64">
                  <p className="text-sm font-bold underline underline-offset-4 mb-10">مسئول شئون الطلبة</p>
                  <p className="text-gray-300 font-normal">.................................</p>
              </div>
              <div className="text-center w-64">
                  <p className="text-sm font-bold underline underline-offset-4 mb-10">رئيس اللجنة</p>
                  <p className="text-gray-300 font-normal">.................................</p>
              </div>
          </div>

          <div className="mt-4 pt-2 border-t border-dashed border-gray-200 text-[8px] text-gray-400 font-mono tracking-widest text-left opacity-30">
              {examIdx + 1} / {schedule.length} 
          </div>
        </div>
      ))}
    </div>
  );
};

export default ObserversDistribution;
