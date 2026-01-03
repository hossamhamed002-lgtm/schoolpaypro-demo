
import React from 'react';
import { SchoolInfo, GradeLevel, GRADE_LABELS, Subject, Teacher, CorrectionCommittee } from '../../examControl.types';
import { db } from '../../services/db';

interface Props {
  schoolInfo: SchoolInfo;
  selectedGrade: GradeLevel;
  selectedTerm: 'term1' | 'term2';
  selectedSubjectId: string;
}

const SubjectCorrectionForm: React.FC<Props> = ({ schoolInfo, selectedGrade, selectedTerm, selectedSubjectId }) => {
  const allSubjects = db.getSubjects();
  const currentSubject = allSubjects.find(s => s.id === selectedSubjectId);
  const teachers = db.getTeachers();
  const correctionData = db.getCorrectionCommittees().find(
    c => c.subjectId === selectedSubjectId && c.gradeLevel === selectedGrade && c.term === selectedTerm
  );

  const committeeNames: string[] = [];
  if (correctionData) {
    if (correctionData.headTeacherId) {
      const head = teachers.find(t => t.id === correctionData.headTeacherId);
      if (head) committeeNames.push(`${head.name} (رئيس اللجنة)`);
    }
    correctionData.memberIds.forEach(id => {
      const member = teachers.find(t => t.id === id);
      if (member) committeeNames.push(member.name);
    });
  }

  const totalRows = Math.max(12, committeeNames.length);

  if (!selectedSubjectId) {
    return (
      <div className="p-20 text-center text-gray-400 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
        <p className="text-xl font-bold">يرجى اختيار المادة من القائمة أعلاه لعرض كشف التصحيح</p>
      </div>
    );
  }

  return (
    <div id="exam-print-root" data-exam-print-preview className="p-[15mm] bg-white text-black font-sans border-[1px] border-gray-300 shadow-lg min-h-[296mm] flex flex-col" dir="rtl">
      <div className="flex justify-between items-start mb-6">
          <div className="text-right font-bold text-xs space-y-1">
              <p>مديرية التربية والتعليم بـ {schoolInfo.governorate || '........'}</p>
              <p>إدارة {schoolInfo.educationalAdministration || '........'} التعليمية</p>
              <p>مدرسة {schoolInfo.schoolName || '........'}</p>
          </div>
          <div className="w-24 h-20 flex items-center justify-center">
              {schoolInfo.logo && <img src={schoolInfo.logo} className="max-h-full max-w-full object-contain" alt="logo" />}
          </div>
      </div>

      <div className="text-center mb-8">
          <h1 className="text-3xl font-black mb-2 leading-tight">لجنة تصحيح مادة <span className="underline decoration-dotted px-2">{currentSubject?.name || '........'}</span> للصف <span className="underline decoration-dotted px-2">{GRADE_LABELS[selectedGrade].replace('الصف ', '')}</span></h1>
          <p className="text-xl font-bold">العام الدراسى {schoolInfo.academicYear} م</p>
      </div>

      <table className="w-full border-collapse border-[3px] border-black text-center font-bold text-lg flex-1 table-auto">
          <thead>
              <tr className="bg-gray-200">
                  <th className="border-[3px] border-black w-16 py-3">م</th>
                  <th className="border-[3px] border-black px-6">الاســــــــم</th>
                  <th className="border-[3px] border-black w-64">التوقيــــــــع</th>
              </tr>
          </thead>
          <tbody>
              {[...Array(totalRows)].map((_, i) => (
                  <tr key={i} className="min-h-[12mm] border-b border-black">
                      <td className="border-2 border-black font-mono py-2">{i + 1}</td>
                      <td className="border-2 border-black text-right pr-6 py-2 leading-tight">
                          {committeeNames[i] || ''}
                      </td>
                      <td className="border-2 border-black"></td>
                  </tr>
              ))}
          </tbody>
      </table>

      <div className="mt-10 flex justify-between items-end px-12 mb-4">
          <div className="text-center w-64">
              <p className="text-md font-black underline underline-offset-4 mb-12">رئيس الكنترول</p>
              <p className="text-slate-800 font-bold">{schoolInfo.controlHead || '........'}</p>
          </div>
          <div className="text-center w-64">
              <p className="text-md font-black underline underline-offset-4 mb-12">يعتمد مدير المدرسة</p>
              <p className="text-slate-800 font-bold">{schoolInfo.managerName || '........'}</p>
          </div>
      </div>

      <div className="mt-auto pt-2 border-t border-dashed border-gray-200 text-[7px] text-gray-400 font-mono tracking-widest text-left opacity-30 uppercase">
          - SUBJECT CORRECTION COMMITTEE FORM
      </div>
    </div>
  );
};

export default SubjectCorrectionForm;
