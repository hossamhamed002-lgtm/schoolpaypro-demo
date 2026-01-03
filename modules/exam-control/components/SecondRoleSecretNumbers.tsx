
import React, { useState, useMemo } from 'react';
import { Lock, Printer, AlertCircle, Users, CheckCircle2 } from 'lucide-react';
import { Student, Subject, GradesDatabase, GradeLevel, GRADE_LABELS } from '../examControl.types';
import { db } from '../services/db';
import { exportUtils } from '../services/exportUtils';

interface Props {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
}

const SecondRoleSecretNumbers: React.FC<Props> = ({ students, subjects, grades }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('p3');
  const schoolInfo = db.getSchoolInfo();
  const certConfig = db.getCertConfig();
  const validGrades = (Object.keys(GRADE_LABELS) as GradeLevel[]);

  const targetStudents = useMemo(() => {
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;
    const gradeSubjects = subjects.filter(s => s.gradeLevels?.includes(selectedGrade) && s.isBasic);

    if (gradeSubjects.length === 0) return [];

    return students.filter(st => {
      if (st.gradeLevel !== selectedGrade) return false;
      const stGrades = grades[st.id] || {};
      let hasFail = false;
      for (const sub of gradeSubjects) {
        const rec = stGrades[sub.id];
        const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
        const isAbs = rec?.term1?.exam === -1 || rec?.term2?.exam === -1;
        const t1_sum = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
        const t2_sum = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
        const annualAvg = (t1_sum + t2_sum) / 2;
        if (selectedGrade === 'p1' || selectedGrade === 'p2') { if (annualAvg < sub.maxScore * 0.5) { hasFail = true; break; } }
        else { const passedWritten = (sub.examScore === 0) || (safeVal(rec?.term2?.exam) >= sub.examScore * EXAM_THRESHOLD); if (isAbs || !passedWritten || annualAvg < sub.maxScore * PASS_THRESHOLD) { hasFail = true; break; } }
      }
      return hasFail;
    }).sort((a, b) => (a.seatingNumber || 0) - (b.seatingNumber || 0));
  }, [students, grades, selectedGrade, subjects, certConfig]);

  const stats = useMemo(() => {
      const generated = targetStudents.filter(s => s.secretNumberSecondRole !== null).length;
      return { total: targetStudents.length, generated };
  }, [targetStudents]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col lg:flex-row justify-between items-center gap-6 no-print">
        <div className="flex items-center gap-6">
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-gray-400">الصف الدراسي</label>
                <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value as GradeLevel)} className="border rounded-lg p-2 font-bold text-blue-700 bg-gray-50 outline-none">
                    {validGrades.map(g => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
                </select>
            </div>
            <div className="h-10 w-px bg-gray-200"></div>
            <div className="flex gap-4">
                <div className="text-center"><p className="text-[10px] font-bold text-gray-400 uppercase">بانتظار السري</p><p className="font-black text-xl text-amber-600">{targetStudents.length - stats.generated}</p></div>
                <div className="text-center"><p className="text-[10px] font-bold text-gray-400 uppercase">تم توليدهم</p><p className="font-black text-xl text-green-600">{stats.generated}</p></div>
            </div>
        </div>

        <div className="flex gap-3">
            <button onClick={() => exportUtils.print('r2-secret-area')} className="bg-gray-800 text-white px-10 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-900 transition"><Printer size={20}/> طباعة الكشف</button>
        </div>
      </div>

      <div className="bg-white overflow-auto border rounded-xl shadow-inner">
          <div id="r2-secret-area" className="bg-white p-12 min-h-screen text-black" dir="rtl">
              <div className="text-center mb-8 border-b-2 border-black pb-4">
                  <h1 className="text-2xl font-black mb-1">{schoolInfo.schoolName}</h1>
                  <h2 className="text-xl font-bold underline mb-2">كشف الأرقام السرية لطلاب الدور الثاني (داخلي)</h2>
                  <p className="font-bold text-gray-700">{GRADE_LABELS[selectedGrade]} | {schoolInfo.academicYear}</p>
              </div>

              <table className="w-full text-center border-collapse border-2 border-black font-bold">
                  <thead>
                      <tr className="bg-gray-100 h-12">
                          <th className="border-2 border-black p-2 w-16">م</th>
                          <th className="border-2 border-black p-2 text-right pr-6">اسم الطالب</th>
                          <th className="border-2 border-black p-2 w-32">رقم الجلوس (د1)</th>
                          <th className="border-2 border-black p-2 w-48 bg-indigo-50 text-indigo-900">الرقم السري (د2)</th>
                      </tr>
                  </thead>
                  <tbody>
                      {targetStudents.map((st, idx) => (
                          <tr key={st.id} className="h-12 hover:bg-gray-50 border-b border-black/10">
                              <td className="border-2 border-black">{idx + 1}</td>
                              <td className="border-2 border-black text-right pr-6 font-black">{st.name}</td>
                              <td className="border-2 border-black font-mono text-lg">{st.seatingNumber}</td>
                              <td className="border-2 border-black font-mono text-2xl text-indigo-800 bg-indigo-50/10">{st.secretNumberSecondRole || '-'}</td>
                          </tr>
                      ))}
                      {targetStudents.length === 0 && (
                          <tr><td colSpan={4} className="p-20 text-center text-gray-400 font-bold italic">لا يوجد طلاب مرحلون للعرض في هذا الصف</td></tr>
                      )}
                  </tbody>
              </table>

              <div className="mt-12 flex justify-between items-end px-10 font-black">
                  <div className="text-center"><p className="mb-14">رئيس الكنترول</p><p className="border-t-2 border-black pt-1">.........................</p></div>
                  <div className="text-center"><p className="mb-14">مدير المدرسة</p><p className="border-t-2 border-black pt-1">.........................</p></div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default SecondRoleSecretNumbers;