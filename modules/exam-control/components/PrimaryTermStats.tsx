
import React, { useMemo, useState } from 'react';
import { ArrowRight, Printer, FileDown, Loader2, FileSpreadsheet } from 'lucide-react';
import { Student, Subject, GradesDatabase, GradeLevel, GRADE_LABELS } from '../examControl.types';
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
    t1Success: StatCell;
    t2Success: StatCell;
    annualSuccess: StatCell;
    secondRole: StatCell;
}

const PrimaryTermStats: React.FC<Props> = ({ students, subjects, grades, onBack }) => {
  const [isExporting, setIsExporting] = useState(false);
  const schoolInfo = db.getSchoolInfo();
  const certConfig = db.getCertConfig();

  const termStats = useMemo(() => {
    const gradesList = ['p3', 'p4', 'p5', 'p6'] as GradeLevel[];
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;
    
    return gradesList.map(g => {
        const gradeStudents = students.filter(s => s.gradeLevel === g);
        const gradeSubjects = subjects.filter(s => s.gradeLevels?.includes(g) && s.isBasic);
        
        const row: GradeStatRow = {
            label: GRADE_LABELS[g], registered: { boys: 0, girls: 0, total: 0 },
            t1Success: { boys: 0, girls: 0, total: 0 }, t2Success: { boys: 0, girls: 0, total: 0 },
            annualSuccess: { boys: 0, girls: 0, total: 0 }, secondRole: { boys: 0, girls: 0, total: 0 }
        };

        gradeStudents.forEach(st => {
            const isBoy = st.gender === 'ذكر', stGrades = grades[st.id] || {};
            row.registered.total++; if (isBoy) row.registered.boys++; else row.registered.girls++;
            let t1Fail = false, t2Fail = false, annualFail = false, hasAnyData = false;

            gradeSubjects.forEach(sub => {
                const rec = stGrades[sub.id]; if (!rec) return;
                hasAnyData = true;
                const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
                const t1_score = safeVal(rec.term1?.work) + safeVal(rec.term1?.practical) + safeVal(rec.term1?.exam);
                const t2_score = safeVal(rec.term2?.work) + safeVal(rec.term2?.practical) + safeVal(rec.term2?.exam);
                if (rec.term1?.exam === -1 || t1_score < sub.maxScore * PASS_THRESHOLD) t1Fail = true;
                if (rec.term2?.exam === -1 || t2_score < sub.maxScore * PASS_THRESHOLD) t2Fail = true;
                if (rec.term1?.exam === -1 || rec.term2?.exam === -1 || annualFail || ((t1_score + t2_score)/2) < sub.maxScore * PASS_THRESHOLD || (sub.examScore > 0 && safeVal(rec.term2?.exam) < sub.examScore * EXAM_THRESHOLD)) annualFail = true;
            });

            if (hasAnyData) {
                if (!t1Fail) { row.t1Success.total++; if (isBoy) row.t1Success.boys++; else row.t1Success.girls++; }
                if (!t2Fail) { row.t2Success.total++; if (isBoy) row.t2Success.boys++; else row.t2Success.girls++; }
                if (!annualFail) { row.annualSuccess.total++; if (isBoy) row.annualSuccess.boys++; else row.annualSuccess.girls++; }
                else { row.secondRole.total++; if (isBoy) row.secondRole.boys++; else row.secondRole.girls++; }
            }
        });
        return row;
    });
  }, [students, subjects, grades, certConfig]);

  const totals = useMemo(() => {
    const t = { registered: { boys: 0, girls: 0, total: 0 }, t1Success: { boys: 0, girls: 0, total: 0 }, t2Success: { boys: 0, girls: 0, total: 0 }, annualSuccess: { boys: 0, girls: 0, total: 0 }, secondRole: { boys: 0, girls: 0, total: 0 } };
    termStats.forEach(s => {
        t.registered.total += s.registered.total; t.t1Success.total += s.t1Success.total; t.t2Success.total += s.t2Success.total; t.annualSuccess.total += s.annualSuccess.total; t.secondRole.total += s.secondRole.total;
    });
    return t;
  }, [termStats]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border no-print">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ArrowRight size={20} /></button>
          <h2 className="text-xl font-bold text-gray-800">إحصاء الترمين (ابتدائي)</h2>
        </div>
        <div className="flex gap-2">
            <button onClick={() => exportUtils.exportTableToExcel('primary-term-table', 'إحصاء_الترمين_ابتدائي')} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 font-bold flex items-center gap-2"><FileSpreadsheet size={18}/> Excel</button>
            <button onClick={() => { setIsExporting(true); exportUtils.exportToPDF('primary-term-area', 'إحصاء_الترمين_ابتدائي').then(() => setIsExporting(false)); }} className="bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200 font-bold flex items-center gap-2">{isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>} PDF</button>
            <button onClick={() => exportUtils.print('primary-term-area', 'landscape')} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Printer size={18}/> طباعة</button>
        </div>
      </div>

      <div id="primary-term-area" className="bg-white p-8 rounded border-2 border-black overflow-x-auto min-w-max text-black" dir="rtl">
          <div className="text-center mb-6 border-b-2 border-black pb-4">
              <h1 className="text-2xl font-black mb-1">{schoolInfo.schoolName}</h1>
              <h2 className="text-xl font-bold underline">إحصاء نتائج الترمين معاً (المرحلة الابتدائية)</h2>
              <p className="text-md mt-2 font-bold">العام الدراسي {schoolInfo.academicYear}</p>
          </div>
          <table id="primary-term-table" className="w-full text-center border-collapse border-2 border-black font-bold text-[11px]">
              <thead>
                  <tr className="bg-gray-100 h-12">
                      <th rowSpan={2} className="border-2 border-black p-2 bg-gray-200 w-[110px]">الصف</th>
                      <th colSpan={3} className="border-2 border-black p-1 bg-gray-50">المقيد</th><th colSpan={3} className="border-2 border-black p-1">ناجح (ت1)</th><th colSpan={3} className="border-2 border-black p-1">ناجح (ت2)</th><th colSpan={3} className="border-2 border-black p-1 bg-gray-50">ناجح (عام)</th><th colSpan={3} className="border-2 border-black p-1 text-red-700">دور ثان</th><th rowSpan={2} className="border-2 border-black p-2 bg-gray-200 w-[70px]">النسبة %</th>
                  </tr>
                  <tr className="bg-white text-[10px]">
                      {Array.from({length: 5}).map((_, i) => (<React.Fragment key={i}><th className="border-2 border-black p-1">بنين</th><th className="border-2 border-black p-1">بنات</th><th className="border-2 border-black p-1 bg-gray-50">جملة</th></React.Fragment>))}
                  </tr>
              </thead>
              <tbody>
                  {termStats.map((s, i) => (
                      <tr key={i} className="h-10 hover:bg-gray-50">
                          <td className="border-2 border-black p-1 bg-gray-50 font-black">{s.label}</td>
                          <td className="border-2 border-black">{s.registered.boys}</td><td className="border-2 border-black">{s.registered.girls}</td><td className="border-2 border-black bg-gray-100">{s.registered.total}</td>
                          <td className="border-2 border-black">{s.t1Success.boys}</td><td className="border-2 border-black">{s.t1Success.girls}</td><td className="border-2 border-black bg-gray-50">{s.t1Success.total}</td>
                          <td className="border-2 border-black">{s.t2Success.boys}</td><td className="border-2 border-black">{s.t2Success.girls}</td><td className="border-2 border-black bg-gray-50">{s.t2Success.total}</td>
                          <td className="border-2 border-black text-blue-700">{s.annualSuccess.boys}</td><td className="border-2 border-black text-blue-700">{s.annualSuccess.girls}</td><td className="border-2 border-black bg-gray-100 font-black text-blue-800">{s.annualSuccess.total}</td>
                          <td className="border-2 border-black text-red-600">{s.secondRole.boys}</td><td className="border-2 border-black text-red-600">{s.secondRole.girls}</td><td className="border-2 border-black bg-red-50 text-red-700">{s.secondRole.total}</td>
                          <td className="border-2 border-black font-black bg-white">{s.registered.total > 0 ? ((s.annualSuccess.total / s.registered.total) * 100).toFixed(1) : '0.0'}%</td>
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
export default PrimaryTermStats;
