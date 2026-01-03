
import React, { useState, useMemo } from 'react';
import { Printer, FileSpreadsheet, FileText, ArrowRight, Info, CheckCircle2, XCircle } from 'lucide-react';
import { Student, Subject, GradesDatabase, GradeLevel, GRADE_LABELS, SchoolInfo } from '../examControl.types';
import { db } from '../services/db';
import { exportUtils } from '../services/exportUtils';

interface Props {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
}

const SecondRoleMasterSheet: React.FC<Props> = ({ students, subjects, grades }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('p3');
  const schoolInfo = db.getSchoolInfo();
  const certConfig = db.getCertConfig();
  const validGrades = (Object.keys(GRADE_LABELS) as GradeLevel[]);

  const gradeSubjects = useMemo(() => 
    subjects.filter(s => s.gradeLevels?.includes(selectedGrade) && s.isBasic),
    [subjects, selectedGrade]
  );

  const r2Data = useMemo(() => {
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;

    return students.filter(st => {
      if (st.gradeLevel !== selectedGrade) return false;
      const stGrades = grades[st.id] || {};
      let isR2Candidate = false;

      for (const sub of gradeSubjects) {
        const rec = stGrades[sub.id];
        const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
        const isAbs = (rec?.term1?.exam === -1 || rec?.term2?.exam === -1);
        const t1_sum = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
        const t2_sum = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
        const annualAvg = (t1_sum + t2_sum) / 2;

        if (selectedGrade === 'p1' || selectedGrade === 'p2') {
             if (annualAvg < sub.maxScore * 0.5) { isR2Candidate = true; break; }
        } else {
             const t2_exam_val = safeVal(rec?.term2?.exam);
             const passedWritten = (sub.examScore === 0) || (t2_exam_val >= sub.examScore * EXAM_THRESHOLD);
             if (isAbs || !passedWritten || annualAvg < sub.maxScore * PASS_THRESHOLD) { isR2Candidate = true; break; }
        }
      }
      return isR2Candidate;
    }).map(st => {
        const finalGrades: Record<string, { score: number | string, isR2: boolean, isPassed: boolean }> = {};
        let totalScore = 0;
        let hasAnyFail = false;

        gradeSubjects.forEach(sub => {
            const rec = grades[st.id]?.[sub.id];
            const r2Rec = rec?.secondRole;
            const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
            
            if (r2Rec !== undefined) {
                const rawR2 = r2Rec.exam;
                const isAbs = rawR2 === -1;
                const isExcused = r2Rec.isExcused || false;
                
                let effective: number | string = '-';
                let passed = false;

                if (isAbs) {
                    effective = 'غ';
                    passed = false;
                } else {
                    // شرط النجاح: الحصول على النهاية الصغرى
                    passed = rawR2 >= sub.minScore;
                    // الدرجة الممنوحة: الصغرى للناجح (إلا لو كان بعذر) أو الدرجة الفعلية للراسب
                    effective = isExcused ? rawR2 : (passed ? sub.minScore : rawR2);
                }

                finalGrades[sub.id] = { score: effective, isR2: true, isPassed: passed };
                if (!passed) hasAnyFail = true;
                if (sub.isAddedToTotal) totalScore += typeof effective === 'number' ? effective : 0;
            } else {
                const t1 = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
                const t2 = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
                const annualAvg = (t1 + t2) / 2;
                finalGrades[sub.id] = { score: annualAvg, isR2: false, isPassed: true };
                if (sub.isAddedToTotal) totalScore += annualAvg;
            }
        });

        return {
            student: st,
            finalGrades,
            totalScore,
            status: hasAnyFail ? 'باق للإعادة' : 'ناجح د2'
        };
    }).sort((a, b) => (a.student.seatingNumber || 0) - (b.student.seatingNumber || 0));
  }, [students, grades, selectedGrade, gradeSubjects, certConfig]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-gray-400">الصف الدراسي</span>
                <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value as GradeLevel)} className="border rounded-lg p-2 font-bold text-blue-700 bg-gray-50 outline-none">
                    {validGrades.map(g => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
                </select>
            </div>
            <div className="h-10 w-px bg-gray-200"></div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400">طلاب الدور الثاني</span>
                <span className="font-black text-xl text-slate-800">{r2Data.length}</span>
            </div>
        </div>
        <div className="flex gap-2">
            <button onClick={() => exportUtils.exportTableToExcel('r2-master-sheet-table', `شيت_الدور_الثاني_${GRADE_LABELS[selectedGrade]}`)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-700 transition shadow-md"><FileSpreadsheet size={18}/> Excel</button>
            <button onClick={() => exportUtils.print('r2-sheet-area', 'landscape')} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-900 transition shadow-md"><Printer size={18}/> طباعة الشيت</button>
        </div>
      </div>

      <div id="r2-sheet-area" className="bg-white p-10 rounded border-2 border-black overflow-x-auto min-w-max text-black font-sans shadow-none" dir="rtl">
          <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
              <div className="text-right font-bold text-xs space-y-1">
                  <p>{schoolInfo.educationalAdministration}</p>
                  <p>{schoolInfo.schoolName}</p>
              </div>
              <div className="text-center">
                  <h1 className="text-2xl font-black mb-1">شيت رصد درجات الدور الثاني (النتيجة النهائية)</h1>
                  <p className="text-sm font-bold">{GRADE_LABELS[selectedGrade]} | العام الدراسي {schoolInfo.academicYear}</p>
              </div>
              <div className="w-24 text-left">
                  {schoolInfo.logo && <img src={schoolInfo.logo} className="h-16 w-16 object-contain mx-auto" alt="logo" />}
              </div>
          </div>

          <table id="r2-master-sheet-table" className="w-full text-center border-collapse border-2 border-black font-bold text-[12px]">
              <thead>
                  <tr className="bg-gray-100 h-14">
                      <th className="border-2 border-black p-1 w-10">م</th>
                      <th className="border-2 border-black p-2 min-w-[200px]">اسم الطالب</th>
                      <th className="border-2 border-black p-1 w-20">الجلوس (د1)</th>
                      {gradeSubjects.map(sub => (
                          <th key={sub.id} className="border-2 border-black p-2 min-w-[100px]">
                              <div className="flex flex-col text-[10px]">
                                  <span>{sub.name}</span>
                                  <span className="text-[8px] opacity-60 font-normal">({sub.maxScore})</span>
                              </div>
                          </th>
                      ))}
                      <th className="border-2 border-black p-2 w-24 bg-blue-50">المجموع</th>
                      <th className="border-2 border-black p-2 w-32 bg-gray-200">القرار النهائي</th>
                  </tr>
              </thead>
              <tbody>
                  {r2Data.map((row, idx) => (
                      <tr key={row.student.id} className="h-12 hover:bg-gray-50 transition-colors">
                          <td className="border-2 border-black bg-gray-50">{idx + 1}</td>
                          <td className="border-2 border-black text-right pr-4 font-black">{row.student.name}</td>
                          <td className="border-2 border-black font-mono font-bold text-blue-700">{row.student.seatingNumber}</td>
                          
                          {gradeSubjects.map(sub => {
                              const item = row.finalGrades[sub.id];
                              const cellText = item?.score;
                              const isR2 = item?.isR2;
                              const isPassed = item?.isPassed;

                              return (
                                  <td key={sub.id} className={`border-2 border-black font-mono text-lg relative ${isR2 ? (isPassed ? 'bg-emerald-50/30' : 'bg-red-50 text-red-600') : 'text-gray-400'}`}>
                                      {cellText}
                                      {isR2 && isPassed && <CheckCircle2 size={10} className="absolute top-1 left-1 text-emerald-500 opacity-30" />}
                                      {isR2 && !isPassed && <XCircle size={10} className="absolute top-1 left-1 text-red-500 opacity-30" />}
                                  </td>
                              );
                          })}

                          <td className="border-2 border-black font-black text-xl bg-blue-50/30">{row.totalScore}</td>
                          <td className={`border-2 border-black font-black text-sm bg-gray-50 ${row.status === 'ناجح د2' ? 'text-emerald-700' : 'text-red-700'}`}>
                              {row.status}
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>

          <div className="mt-20 flex justify-between items-end px-10 font-black text-[14px]">
              <div className="text-center w-48"><p className="mb-14">رئيس الكنترول</p><p className="border-t-2 border-black pt-2">{schoolInfo.controlHead || '.................'}</p></div>
              <div className="text-center w-48"><p className="mb-14">مدير المدرسة</p><p className="border-t-2 border-black pt-2">{schoolInfo.managerName || '.................'}</p></div>
          </div>
      </div>
    </div>
  );
};

export default SecondRoleMasterSheet;
