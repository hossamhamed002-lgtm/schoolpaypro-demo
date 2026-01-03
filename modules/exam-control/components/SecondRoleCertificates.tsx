
import React, { useState, useMemo } from 'react';
import { Printer } from 'lucide-react';
import { Student, Subject, GradesDatabase, GradeLevel, GRADE_LABELS } from '../examControl.types';
import { db } from '../services/db';

interface Props {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
}

const SecondRoleCertificates: React.FC<Props> = ({ students, subjects, grades }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('p3');
  const [searchTerm, setSearchTerm] = useState('');
  
  const schoolInfo = db.getSchoolInfo();
  const certConfig = db.getCertConfig();
  const validGrades = (Object.keys(GRADE_LABELS) as GradeLevel[]);

  const secondRoleList = useMemo(() => {
    const gradeSubjects = subjects.filter(s => s.gradeLevels?.includes(selectedGrade) && s.isBasic);
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;

    return students.filter(st => {
      if (st.gradeLevel !== selectedGrade) return false;
      const stGrades = grades[st.id] || {};
      let isR2Candidate = false;

      gradeSubjects.forEach(sub => {
        const rec = stGrades[sub.id];
        const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
        const isAbs = (rec?.term1?.exam === -1 || rec?.term2?.exam === -1);
        
        const t1_sum = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
        const t2_sum = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
        const annualAvg = (t1_sum + t2_sum) / 2;

        if (selectedGrade === 'p1' || selectedGrade === 'p2') {
             if (annualAvg < sub.maxScore * 0.5) isR2Candidate = true;
        } else {
             const t2_exam_val = safeVal(rec?.term2?.exam);
             const passedWritten = (sub.examScore === 0) || (t2_exam_val >= sub.examScore * EXAM_THRESHOLD);
             if (isAbs || !passedWritten || annualAvg < sub.maxScore * PASS_THRESHOLD) isR2Candidate = true;
        }
      });
      
      const matchesSearch = st.name.toLowerCase().includes(searchTerm.toLowerCase()) || st.seatingNumber?.toString().includes(searchTerm);
      return isR2Candidate && matchesSearch;
    }).sort((a, b) => (a.seatingNumber || 0) - (b.seatingNumber || 0));
  }, [students, grades, selectedGrade, subjects, certConfig, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex flex-wrap items-center gap-3">
            <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value as GradeLevel)} className="border rounded-lg p-2 font-bold text-blue-700 outline-none">
                {validGrades.map(g => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
            </select>
            <input type="text" placeholder="بحث باسم الطالب..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border rounded-lg p-2 text-sm outline-none focus:border-blue-400 w-64" />
        </div>
        <button onClick={() => window.print()} className="bg-purple-600 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 shadow-lg transition-all"><Printer size={18}/> طباعة كافة الإخطارات</button>
      </div>

      <div className="flex flex-col gap-20 items-center">
        {secondRoleList.map(st => {
           const stGrades = grades[st.id] || {};
           const allGradeSubjects = subjects.filter(s => s.gradeLevels?.includes(selectedGrade) && s.isBasic);
           
           return (
             <div key={st.id} className="certificate-r2 bg-white w-[210mm] min-h-[296mm] p-[15mm] border-[1px] border-gray-200 flex flex-col relative font-sans text-black">
                <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
                    <div className="text-right font-bold text-xs">
                        <p>{schoolInfo.educationalAdministration}</p>
                        <p>{schoolInfo.schoolName}</p>
                    </div>
                    <div className="text-center flex-1">
                        <h1 className="text-2xl font-black mb-1">{schoolInfo.schoolName}</h1>
                        <h2 className="text-lg font-bold underline underline-offset-4 decoration-2">إخطار بنتيجة امتحان الدور الثاني (بيان شامل)</h2>
                        <p className="text-sm mt-2 font-bold">العام الدراسي {schoolInfo.academicYear}</p>
                    </div>
                    <div className="w-20">
                        {schoolInfo.logo && <img src={schoolInfo.logo} className="h-16 w-16 object-contain" alt="logo" />}
                    </div>
                </div>

                <div className="border-2 border-black p-6 mb-8 text-xl font-bold space-y-4">
                    <div className="flex justify-between">
                        <p>اسم الطالب: <span className="border-b border-black px-4">{st.name}</span></p>
                        <p>رقم الجلوس: <span className="border-b border-black px-4 font-mono">{st.seatingNumber}</span></p>
                    </div>
                    <div className="flex justify-between">
                        <p>الصف: <span className="border-b border-black px-4">{GRADE_LABELS[selectedGrade]}</span></p>
                        <p>الفصل: <span className="border-b border-black px-4">{st.classroom}</span></p>
                    </div>
                </div>

                <h4 className="font-black text-lg mb-2 underline">بيان الدرجات النهائي (الدورين الأول والثاني):</h4>
                <table className="w-full border-collapse border-4 border-black text-center font-bold text-lg mb-10">
                    <thead className="bg-gray-50">
                        <tr className="h-12">
                            <th className="border-4 border-black p-1 w-[40%]">المادة</th>
                            <th className="border-4 border-black p-1">العظمى</th>
                            <th className="border-4 border-black p-1">الصغرى</th>
                            <th className="border-4 border-black p-1 bg-blue-50">الدرجة النهائية</th>
                            <th className="border-4 border-black p-1">الدور</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allGradeSubjects.map(sub => {
                            const rec = stGrades[sub.id];
                            const r2Rec = rec?.secondRole;
                            const rawR2Score = r2Rec?.exam;
                            const isAbsR2 = rawR2Score === -1;
                            const isExcused = r2Rec?.isExcused || false;
                            
                            const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
                            const t1_sum = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
                            const t2_sum = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
                            const annualAvg = (t1_sum + t2_sum) / 2;

                            let displayedScore: number | string = '-';
                            let roundLabel = '';
                            let isPassed = false;
                            let isR2Subject = false;

                            if (r2Rec !== undefined && rawR2Score !== undefined) {
                                isR2Subject = true;
                                roundLabel = 'الدور الثاني';
                                if (isAbsR2) {
                                    displayedScore = 'غ';
                                    isPassed = false;
                                } else {
                                    if (isExcused) {
                                        displayedScore = rawR2Score;
                                        isPassed = rawR2Score >= sub.minScore;
                                    } else {
                                        displayedScore = (rawR2Score as number) >= sub.minScore ? sub.minScore : rawR2Score;
                                        isPassed = (rawR2Score as number) >= sub.minScore;
                                    }
                                }
                            } else {
                                isR2Subject = false;
                                roundLabel = 'الدور الأول';
                                displayedScore = annualAvg;
                                isPassed = true;
                            }
                            
                            return (
                                <tr key={sub.id} className="h-14">
                                    <td className="border-4 border-black text-right pr-6">
                                        {sub.name}
                                        {isExcused && isR2Subject && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded mr-2 font-black border border-emerald-200">بعذر مقبول</span>}
                                        {!isExcused && isR2Subject && !isAbsR2 && (rawR2Score as number) > sub.minScore && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded mr-2 font-black border border-amber-200">درجة النجاح فقط</span>}
                                    </td>
                                    <td className="border-4 border-black font-mono">{sub.maxScore}</td>
                                    <td className="border-4 border-black font-mono">{sub.minScore}</td>
                                    <td className={`border-4 border-black font-mono font-black text-2xl relative ${!isR2Subject ? 'text-blue-800' : ''}`}>
                                        {displayedScore}
                                        {isR2Subject && !isExcused && !isAbsR2 && (rawR2Score as number) > sub.minScore && (
                                            <span className="absolute -top-1 left-1 text-[8px] text-gray-400 font-normal">({rawR2Score} → {sub.minScore})</span>
                                        )}
                                    </td>
                                    <td className={`border-4 border-black font-black text-sm ${isPassed ? 'text-emerald-700' : 'text-red-700 bg-red-50/10'}`}>
                                        {isPassed ? (
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span>ناجح</span>
                                                <span className="text-[9px] opacity-70">({roundLabel})</span>
                                            </div>
                                        ) : 'دون المستوى'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
             </div>
           );
        })}
      </div>
    </div>
  );
};

export default SecondRoleCertificates;
