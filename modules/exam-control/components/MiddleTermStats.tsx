
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
    present: StatCell;
    absent: StatCell;
    passed: StatCell;
    secondRole: StatCell;
    percentage: number;
}

const MiddleTermStats: React.FC<Props> = ({ students, subjects, grades, onBack }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | 'all_prep'>('all_prep');
  const [isExporting, setIsExporting] = useState(false);
  const schoolInfo = db.getSchoolInfo();
  const certConfig = db.getCertConfig();

  const statsData = useMemo(() => {
    const targetGrades = selectedGrade === 'all_prep' ? (['m1', 'm2'] as GradeLevel[]) : [selectedGrade as GradeLevel];
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;

    return targetGrades.map(g => {
        const gradeStudents = students.filter(s => s.gradeLevel === g);
        const gradeSubjects = subjects.filter(s => s.gradeLevels?.includes(g) && s.isBasic);
        const row: GradeStatRow = { label: GRADE_LABELS[g], registered: { boys: 0, girls: 0, total: 0 }, present: { boys: 0, girls: 0, total: 0 }, absent: { boys: 0, girls: 0, total: 0 }, passed: { boys: 0, girls: 0, total: 0 }, secondRole: { boys: 0, girls: 0, total: 0 }, percentage: 0 };

        gradeStudents.forEach(st => {
            const isBoy = st.gender === 'ذكر', stGrades = grades[st.id] || {};
            row.registered.total++; if (isBoy) row.registered.boys++; else row.registered.girls++;
            let isAbsent = false, hasFail = false;
            gradeSubjects.forEach(sub => {
                const rec = stGrades[sub.id], safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
                if (rec?.term1?.exam === -1 || rec?.term2?.exam === -1) isAbsent = true;
                const annualAvg = ((safeVal(rec?.term1?.work)+safeVal(rec?.term1?.practical)+safeVal(rec?.term1?.exam)) + (safeVal(rec?.term2?.work)+safeVal(rec?.term2?.practical)+safeVal(rec?.term2?.exam)))/2;
                if (!isAbsent && (annualAvg < sub.maxScore * PASS_THRESHOLD || (sub.examScore > 0 && safeVal(rec?.term2?.exam) < sub.examScore * EXAM_THRESHOLD))) hasFail = true;
            });
            if (isAbsent) { row.absent.total++; if (isBoy) row.absent.boys++; else row.absent.girls++; row.secondRole.total++; if (isBoy) row.secondRole.boys++; else row.secondRole.girls++; }
            else { row.present.total++; if (isBoy) row.present.boys++; else row.present.girls++; if (!hasFail) { row.passed.total++; if (isBoy) row.passed.boys++; else row.passed.girls++; } else { row.secondRole.total++; if (isBoy) row.secondRole.boys++; else row.secondRole.girls++; } }
        });
        row.percentage = row.present.total > 0 ? (row.passed.total / row.present.total) * 100 : 0;
        return row;
    });
  }, [students, subjects, grades, selectedGrade, certConfig]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border no-print">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ArrowRight size={20} /></button>
          <h2 className="text-xl font-bold text-gray-800">إحصاء الترمين (إعدادي)</h2>
        </div>
        <div className="flex gap-2">
            <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value as any)} className="border rounded px-3 py-1.5 font-bold text-blue-700 bg-gray-50 outline-none"><option value="all_prep">كل الصفوف</option><option value="m1">أولى إعدادي</option><option value="m2">ثانية إعدادي</option></select>
            <button onClick={() => exportUtils.exportTableToExcel('middle-term-table', 'إحصاء_الترمين_إعدادي')} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 font-bold flex items-center gap-2"><FileSpreadsheet size={18}/> Excel</button>
            <button onClick={() => { setIsExporting(true); exportUtils.exportToPDF('middle-term-report-area', 'إحصاء_الترمين_إعدادي').then(() => setIsExporting(false)); }} className="bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200 font-bold flex items-center gap-2">{isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>} PDF</button>
            <button onClick={() => exportUtils.print('middle-term-report-area')} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Printer size={18}/> طباعة</button>
        </div>
      </div>

      <div id="middle-term-report-area" className="bg-white p-10 rounded border-2 border-black overflow-x-auto min-w-max text-black font-sans" dir="rtl">
          <div className="text-center mb-10 border-b-2 border-black pb-4">
              <h1 className="text-3xl font-black mb-1">{schoolInfo.schoolName}</h1>
              <h2 className="text-2xl font-bold underline">إحصاء مجمع لنتائج العام الدراسي {schoolInfo.academicYear}</h2>
          </div>
          <table id="middle-term-table" className="w-full text-center border-collapse border-2 border-black font-bold text-[13px]">
              <thead>
                  <tr className="bg-gray-100 h-14">
                      <th rowSpan={2} className="border-2 border-black p-3 bg-gray-200 w-[150px]">الصف</th>
                      <th colSpan={3} className="border-2 border-black p-1 bg-gray-50">المقيد</th><th colSpan={3} className="border-2 border-black p-1">الحاضر</th><th colSpan={3} className="border-2 border-black p-1">الغائب</th><th colSpan={3} className="border-2 border-black p-1">الناجح</th><th colSpan={3} className="border-2 border-black p-1 text-red-700">الدور الثاني</th><th rowSpan={2} className="border-2 border-black p-2 bg-gray-200 w-[100px]">النسبة</th>
                  </tr>
                  <tr className="bg-white text-[10px]">
                      {Array.from({length: 5}).map((_, i) => (<React.Fragment key={i}><th className="border-2 border-black p-1">بنين</th><th className="border-2 border-black p-1">بنات</th><th className="border-2 border-black p-1 bg-gray-50">جملة</th></React.Fragment>))}
                  </tr>
              </thead>
              <tbody>
                  {statsData.map((s, i) => (
                      <tr key={i} className="h-16 text-[15px] hover:bg-gray-50">
                          <td className="border-2 border-black p-2 font-black bg-gray-50">{s.label}</td>
                          <td className="border-2 border-black">{s.registered.boys}</td><td className="border-2 border-black">{s.registered.girls}</td><td className="border-2 border-black bg-gray-100">{s.registered.total}</td>
                          <td className="border-2 border-black">{s.present.boys}</td><td className="border-2 border-black">{s.present.girls}</td><td className="border-2 border-black bg-gray-50">{s.present.total}</td>
                          <td className="border-2 border-black text-red-600">{s.absent.boys}</td><td className="border-2 border-black text-red-600">{s.absent.girls}</td><td className="border-2 border-black bg-red-50">{s.absent.total}</td>
                          <td className="border-2 border-black text-emerald-700">{s.passed.boys}</td><td className="border-2 border-black text-emerald-700">{s.passed.girls}</td><td className="border-2 border-black bg-emerald-50 text-emerald-800">{s.passed.total}</td>
                          <td className="border-2 border-black text-blue-700">{s.secondRole.boys}</td><td className="border-2 border-black text-blue-700">{s.secondRole.girls}</td><td className="border-2 border-black bg-blue-50 text-blue-800">{s.secondRole.total}</td>
                          <td className="border-2 border-black font-black bg-white">%{s.percentage.toFixed(1)}</td>
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
export default MiddleTermStats;
