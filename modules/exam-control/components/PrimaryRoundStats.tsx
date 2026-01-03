
import React, { useMemo, useState } from 'react';
import { ArrowRight, Printer, FileDown, Loader2, FileSpreadsheet } from 'lucide-react';
import { Student, Subject, GradesDatabase, GradeLevel, GRADE_LABELS, SchoolInfo } from '../examControl.types';
import { db } from '../services/db';
import { exportUtils } from '../services/exportUtils';

interface Props {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
  onBack: () => void;
}

type StatCell = { boys: number; girls: number; total: number };
interface GradeStatRow {
    label: string;
    registered: StatCell;
    present: StatCell;
    absent: StatCell;
    passedR1: StatCell;
    passedCombined: StatCell;
    failed: StatCell;
    percentage: number;
}

const PrimaryRoundStats: React.FC<Props> = ({ students, subjects, grades, onBack }) => {
  const [isExporting, setIsExporting] = useState(false);
  const schoolInfo = db.getSchoolInfo();
  const certConfig = db.getCertConfig();

  const stats = useMemo(() => {
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;
    return (['p3', 'p4', 'p5', 'p6'] as GradeLevel[]).map(g => {
        const row: GradeStatRow = { label: GRADE_LABELS[g].replace('الصف ', '').replace(' الابتدائي', ''), registered: { boys: 0, girls: 0, total: 0 }, present: { boys: 0, girls: 0, total: 0 }, absent: { boys: 0, girls: 0, total: 0 }, passedR1: { boys: 0, girls: 0, total: 0 }, passedCombined: { boys: 0, girls: 0, total: 0 }, failed: { boys: 0, girls: 0, total: 0 }, percentage: 0 };
        const gradeStudents = students.filter(s => s.gradeLevel === g);
        const gradeSubjects = subjects.filter(s => s.gradeLevels?.includes(g) && s.isBasic);
        
        gradeStudents.forEach(student => {
            const isBoy = student.gender === 'ذكر', stGrades = grades[student.id] || {};
            row.registered.total++; if (isBoy) row.registered.boys++; else row.registered.girls++;
            
            let failedR1 = false, failedFinal = false, attendedAny = false;
            let subjectsToRetake: string[] = [];

            gradeSubjects.forEach(sub => {
                const rec = stGrades[sub.id], safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
                const t1 = safeVal(rec?.term1?.work)+safeVal(rec?.term1?.practical)+safeVal(rec?.term1?.exam);
                const t2 = safeVal(rec?.term2?.work)+safeVal(rec?.term2?.practical)+safeVal(rec?.term2?.exam);
                
                if (rec?.term1?.exam !== -1 || rec?.term2?.exam !== -1) attendedAny = true;
                
                const subFailedR1 = (sub.examScore > 0 && (rec?.term1?.exam === -1 || rec?.term2?.exam === -1)) ||
                                   (safeVal(rec?.term2?.exam) < sub.examScore * EXAM_THRESHOLD) || 
                                   ((t1+t2)/2 < sub.maxScore * PASS_THRESHOLD);

                if (subFailedR1) {
                    failedR1 = true;
                    subjectsToRetake.push(sub.id);
                }
            });

            // فحص الدور الثاني
            if (failedR1) {
                let hasR2Fail = false;
                subjectsToRetake.forEach(subId => {
                    const sub = subjects.find(s => s.id === subId);
                    const r2Rec = stGrades[subId]?.secondRole;
                    if (!r2Rec || r2Rec.exam === -1 || r2Rec.exam < (sub?.minScore || 0)) {
                        hasR2Fail = true;
                    }
                });
                if (hasR2Fail) failedFinal = true;
            }

            if (!attendedAny) { 
                row.absent.total++; if (isBoy) row.absent.boys++; else row.absent.girls++; 
                row.failed.total++; if (isBoy) row.failed.boys++; else row.failed.girls++; 
            } else { 
                row.present.total++; if (isBoy) row.present.boys++; else row.present.girls++; 
                if (!failedR1) { 
                    row.passedR1.total++; if (isBoy) row.passedR1.boys++; else row.passedR1.girls++; 
                    row.passedCombined.total++; if (isBoy) row.passedCombined.boys++; else row.passedCombined.girls++; 
                } else if (!failedFinal) { 
                    row.passedCombined.total++; if (isBoy) row.passedCombined.boys++; else row.passedCombined.girls++; 
                } else { 
                    row.failed.total++; if (isBoy) row.failed.boys++; else row.failed.girls++; 
                } 
            }
        });
        row.percentage = row.present.total > 0 ? (row.passedCombined.total / row.present.total) * 100 : 0;
        return row;
    });
  }, [students, subjects, grades, certConfig]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border no-print">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ArrowRight size={20} /></button>
          <h2 className="text-xl font-bold text-gray-800">إحصاء الدورين (ابتدائي)</h2>
        </div>
        <div className="flex gap-2">
            <button onClick={() => exportUtils.exportTableToExcel('primary-round-table', 'إحصاء_الدورين_ابتدائي')} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 font-bold flex items-center gap-2"><FileSpreadsheet size={18}/> Excel</button>
            <button onClick={() => { setIsExporting(true); exportUtils.exportToPDF('primary-round-report-area', 'إحصاء_الدورين_ابتدائي').then(() => setIsExporting(false)); }} className="bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200 font-bold flex items-center gap-2">{isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>} PDF</button>
            <button onClick={() => exportUtils.print('primary-round-report-area')} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Printer size={18}/> طباعة</button>
        </div>
      </div>

      <div id="primary-round-report-area" className="bg-white p-8 rounded border-2 border-black overflow-x-auto min-w-max text-black font-sans" dir="rtl">
          <div className="text-center mb-6 border-b-2 border-black pb-4">
              <h1 className="text-2xl font-black mb-1">{schoolInfo.schoolName}</h1>
              <h2 className="text-xl font-bold underline">بيان إحصائي مجمع لنتائج الدورين للعام الدراسي {schoolInfo.academicYear} (3-6 ابتدائي)</h2>
          </div>
          <table id="primary-round-table" className="w-full text-center border-collapse border-2 border-black font-bold text-[11px]">
              <thead>
                  <tr className="bg-gray-100 h-12">
                      <th rowSpan={2} className="border-2 border-black p-2 bg-gray-200 w-[120px]">الصف</th>
                      <th colSpan={3} className="border-2 border-black p-1 bg-yellow-50">مقيدون</th><th colSpan={3} className="border-2 border-black p-1">حاضرون</th><th colSpan={3} className="border-2 border-black p-1">غائبون</th><th colSpan={3} className="border-2 border-black p-1">ناجحون (د1)</th><th colSpan={3} className="border-2 border-black p-1 bg-emerald-50">إجمالي الناجحين</th><th colSpan={3} className="border-2 border-black p-1 text-red-700 bg-red-50">راسبون وباقون للإعادة</th><th rowSpan={2} className="border-2 border-black p-2 bg-gray-200 w-[110px]">النسبة</th>
                  </tr>
                  <tr className="bg-white text-[10px]">
                      {Array.from({length: 6}).map((_, i) => (<React.Fragment key={i}><th className="border-2 border-black p-1">بنين</th><th className="border-2 border-black p-1">بنات</th><th className="border-2 border-black p-1 bg-gray-50">جملة</th></React.Fragment>))}
                  </tr>
              </thead>
              <tbody>
                  {stats.map((row, idx) => (
                      <tr key={idx} className="h-14 hover:bg-gray-50">
                          <td className="border-2 border-black bg-gray-50 font-black">{row.label}</td>
                          <td className="border-2 border-black">{row.registered.boys}</td><td className="border-2 border-black">{row.registered.girls}</td><td className="border-2 border-black bg-gray-50">{row.registered.total}</td>
                          <td className="border-2 border-black">{row.present.boys}</td><td className="border-2 border-black">{row.present.girls}</td><td className="border-2 border-black bg-gray-50">{row.present.total}</td>
                          <td className="border-2 border-black text-red-600">{row.absent.boys}</td><td className="border-2 border-black text-red-600">{row.absent.girls}</td><td className="border-2 border-black bg-gray-50 text-red-600">{row.absent.total}</td>
                          <td className="border-2 border-black">{row.passedR1.boys}</td><td className="border-2 border-black">{row.passedR1.girls}</td><td className="border-2 border-black bg-gray-50">{row.passedR1.total}</td>
                          <td className="border-2 border-black text-blue-700 font-black">{row.passedCombined.boys}</td><td className="border-2 border-black text-blue-700 font-black">{row.passedCombined.girls}</td><td className="border-2 border-black bg-emerald-50 font-black text-blue-800">{row.passedCombined.total}</td>
                          <td className="border-2 border-black text-red-600">{row.failed.boys}</td><td className="border-2 border-black text-red-600">{row.failed.girls}</td><td className="border-2 border-black bg-red-50 text-red-700 font-black">{row.failed.total}</td>
                          <td className="border-2 border-black font-black bg-white">%{row.percentage.toFixed(1)}</td>
                      </tr>
                  ))}
              </tbody>
          </table>
          <div className="mt-12 flex justify-between items-end px-4 font-black text-[13px] text-black">
              <div className="text-center w-44"><p className="mb-10">مسئول الحاسب</p><p className="border-t border-black pt-1">{schoolInfo.itSpecialist || '.................'}</p></div>
              <div className="text-center w-44"><p className="mb-10">رئيس الكنترول</p><p className="border-t border-black pt-1">{schoolInfo.controlHead || '.................'}</p></div>
              <div className="text-center w-44"><p className="mb-10">وكيل المدرسة</p><p className="border-t border-black pt-1">{schoolInfo.agentName || '.................'}</p></div>
              <div className="text-center w-44"><p className="mb-10">المدير التنفيذى</p><p className="border-t border-black pt-1">{schoolInfo.managerName || '.................'}</p></div>
          </div>
      </div>
    </div>
  );
};
export default PrimaryRoundStats;
