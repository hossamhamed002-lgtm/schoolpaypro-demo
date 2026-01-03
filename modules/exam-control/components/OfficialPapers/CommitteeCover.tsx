
import React, { useMemo } from 'react';
import { SchoolInfo, GradeLevel, GRADE_LABELS, ExamCommittee, Student } from '../../examControl.types';

interface Props {
  schoolInfo: SchoolInfo;
  selectedGrade: GradeLevel;
  selectedTerm: 'term1' | 'term2';
  committee: ExamCommittee | null;
  students: Student[];
}

const CommitteeCover: React.FC<Props> = ({ schoolInfo, selectedGrade, selectedTerm, committee, students }) => {
  
  const commStudents = useMemo(() => {
    if (!committee) return [];
    return students
      .filter(s => s.gradeLevel === selectedGrade && s.committeeId === committee.id && s.seatingNumber !== null)
      .sort((a, b) => (a.seatingNumber || 0) - (b.seatingNumber || 0));
  }, [committee, students, selectedGrade]);

  const stats = useMemo(() => {
    if (commStudents.length === 0) return { from: '-', to: '-', count: 0 };
    return {
      from: commStudents[0].seatingNumber,
      to: commStudents[commStudents.length - 1].seatingNumber,
      count: commStudents.length
    };
  }, [commStudents]);

  if (!committee) {
    return (
      <div className="p-20 text-center text-gray-400 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
        يرجى اختيار اللجنة من القائمة الجانبية في المعاينة
      </div>
    );
  }

  return (
    <div id="exam-print-root" data-exam-print-preview className="p-5 bg-white text-black font-sans flex flex-col h-full border-[1px] border-gray-100" dir="rtl">
      {/* Header Info */}
      <div className="flex justify-between items-start mb-8">
          <div className="text-right font-black text-[12px] space-y-0.5">
              <p>محافظة: {schoolInfo.governorate || '................'}</p>
              <p>إدارة: {schoolInfo.educationalAdministration || '................'}</p>
              <p>مدرسة: {schoolInfo.schoolName || '................'}</p>
          </div>
          <div>
            {schoolInfo.logo && <img src={schoolInfo.logo} className="h-16 w-16 object-contain" alt="logo" />}
          </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
          
          <h2 className="text-4xl font-black mb-2">
              امتحان {selectedTerm === 'term1' ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثاني'}
          </h2>

          <h3 className="text-3xl font-bold tracking-widest">
              {schoolInfo.academicYear.replace('-', ' / ')}
          </h3>

          <div className="py-2"></div>

          <h4 className="text-4xl font-black border-b-4 border-black pb-2 px-10">
              {GRADE_LABELS[selectedGrade]}
          </h4>

          <div className="py-4"></div>

          {/* Committee Info Grid */}
          <div className="w-full max-w-2xl space-y-8 text-3xl font-bold">
              <div className="flex items-center justify-center gap-4">
                  <span>لجنة رقم :</span>
                  <span className="flex items-center gap-2">
                      <span className="text-5xl font-black">(</span>
                      <span className="text-5xl font-black min-w-[60px]">{committee.name.replace(/\D/g, '') || committee.name}</span>
                      <span className="text-5xl font-black">)</span>
                  </span>
              </div>

              <div className="flex items-center justify-center gap-4">
                  <span>الدور :</span>
                  <span className="bg-gray-100 px-6 py-1.5 rounded-xl border-2 border-black font-black">
                      {selectedTerm === 'term1' ? 'الأول' : 'الثاني'}
                  </span>
              </div>

              <div className="flex items-center justify-center gap-4">
                  <span>مقر اللجنة فصل :</span>
                  <span className="flex items-center gap-2">
                      <span className="text-4xl font-black">(</span>
                      <span className="text-4xl font-black">{committee.location}</span>
                      <span className="text-4xl font-black">)</span>
                  </span>
              </div>

              <div className="flex items-center justify-center gap-4 pt-2">
                  <span>العدد :</span>
                  <span className="flex items-center gap-2">
                      <span className="text-4xl font-black">(</span>
                      <span className="text-4xl font-black">{stats.count}</span>
                      <span className="text-4xl font-black">)</span>
                  </span>
              </div>

              <div className="flex flex-col items-center gap-4 pt-6">
                  <div className="flex items-center gap-4 text-2xl">
                      <span>أرقام الجلوس من :</span>
                      <span className="flex items-center gap-2">
                        <span className="text-4xl font-black">(</span>
                        <span className="text-4xl font-black font-mono">{stats.from}</span>
                        <span className="text-4xl font-black">)</span>
                      </span>
                      <span className="mx-2">إلى</span>
                      <span className="flex items-center gap-2">
                        <span className="text-4xl font-black">(</span>
                        <span className="text-4xl font-black font-mono">{stats.to}</span>
                        <span className="text-4xl font-black">)</span>
                      </span>
                  </div>
              </div>
          </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-6 flex justify-between items-end px-10">
          <div className="text-center w-56 space-y-8">
              <p className="text-lg font-bold underline underline-offset-4">يعتمد مدير المدرسة</p>
              <p className="text-gray-400 font-normal text-sm">.................................</p>
          </div>
          <div className="text-center w-56 space-y-8">
              <p className="text-lg font-bold underline underline-offset-4">رئيس الكنترول</p>
              <p className="text-gray-400 font-normal text-sm">.................................</p>
          </div>
      </div>
    </div>
  );
};

export default CommitteeCover;
