
import React, { useState, useMemo } from 'react';
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
    absent: StatCell;
    present: StatCell;
    failed: StatCell; 
    passedMedium: StatCell; 
    passedHigh: StatCell; 
    percentage: number;
}

const MiddleYearEndOfficialStats: React.FC<Props> = ({ students, subjects, grades, onBack }) => {
  const [selectedGrade] = useState<GradeLevel | 'all_prep'>('all_prep');
  const [isExporting, setIsExporting] = useState(false);
  const schoolInfo = db.getSchoolInfo();
  const certConfig = db.getCertConfig();

  const middleGradeLevels: GradeLevel[] = ['m1', 'm2'];

  const statsData = useMemo(() => {
    const targetGrades = selectedGrade === 'all_prep' ? middleGradeLevels : [selectedGrade as GradeLevel];
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;

    return targetGrades.map(g => {
        const gradeStudents = students.filter(s => s.gradeLevel === g);
        const gradeSubjects = subjects.filter(sub => sub.gradeLevels?.includes(g) && sub.isAddedToTotal);
        const maxTotal = gradeSubjects.reduce((acc, sub) => acc + sub.maxScore, 0);

        const row: GradeStatRow = {
            label: GRADE_LABELS[g], registered: { boys: 0, girls: 0, total: 0 },
            absent: { boys: 0, girls: 0, total: 0 }, present: { boys: 0, girls: 0, total: 0 },
            failed: { boys: 0, girls: 0, total: 0 }, passedMedium: { boys: 0, girls: 0, total: 0 },
            passedHigh: { boys: 0, girls: 0, total: 0 }, percentage: 0
        };

        gradeStudents.forEach(st => {
            const isBoy = st.gender === 'ذكر', stGrades = grades[st.id] || {};
            row.registered.total++; if (isBoy) row.registered.boys++; else row.registered.girls++;
            let isAbsent = false, totalYearScore = 0, hasFailInAnyBasic = false;
            
            gradeSubjects.forEach(sub => {
                const rec = stGrades[sub.id], safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
                if (rec?.term1?.exam === -1 || rec?.term2?.exam === -1) isAbsent = true;
                const t1 = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
                const t2 = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
                const annualAvg = (t1 + t2) / 2;
                totalYearScore += annualAvg;
                if ((sub.examScore > 0 && safeVal(rec?.term2?.exam) < sub.examScore * EXAM_THRESHOLD) || annualAvg < sub.maxScore * PASS_THRESHOLD) hasFailInAnyBasic = true;
            });

            if (isAbsent) {
                row.absent.total++; if (isBoy) row.absent.boys++; else row.absent.girls++;
                row.failed.total++; if (isBoy) row.failed.boys++; else row.failed.girls++;
            } else {
                row.present.total++; if (isBoy) row.present.boys++; else row.present.girls++;
                const percent = maxTotal > 0 ? (totalYearScore / maxTotal) * 100 : 0;
                if (hasFailInAnyBasic || percent < certConfig.minPassingPercent) { row.failed.total++; if (isBoy) row.failed.boys++; else row.failed.girls++; } 
                else if (percent < 65) { row.passedMedium.total++; if (isBoy) row.passedMedium.boys++; else row.passedMedium.girls++; } 
                else { row.passedHigh.total++; if (isBoy) row.passedHigh.boys++; else row.passedHigh.girls++; }
            }
        });
        row.percentage = row.present.total > 0 ? ((row.passedMedium.total + row.passedHigh.total) / row.present.total) * 100 : 0;
        return row;
    });
  }, [students, subjects, grades, selectedGrade, certConfig]);

  const handleExportPDF = () => {
    setIsExporting(true);
    exportUtils.exportToPDF('middle-year-report-container', 'إحصاء_اعدادي_آخر_العام').then(() => setIsExporting(false));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border no-print">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ArrowRight size={20} /></button>
          <h2 className="text-xl font-bold text-gray-800">إحصاء آخر العام (الإعدادي)</h2>
        </div>
        <div className="flex gap-2">
            <button onClick={() => exportUtils.exportTableToExcel('middle-year-table', 'إحصاء_اعدادي_آخر_العام')} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 font-bold flex items-center gap-2"><FileSpreadsheet size={18}/> Excel</button>
            <button onClick={handleExportPDF} disabled={isExporting} className="bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200 font-bold flex items-center gap-2">
                {isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>} PDF
            </button>
            <button onClick={() => exportUtils.print()} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Printer size={18}/> طباعة</button>
        </div>
      </div>

      <div id="middle-year-report-container" className="bg-white p-10 rounded border-2 border-black overflow-x-auto min-w-max text-black" dir="rtl">
          <div className="text-center mb-8 border-b-2 border-black pb-4">
              <h1 className="text-3xl font-black mb-1">{schoolInfo.schoolName}</h1>
              <h2 className="text-2xl font-bold underline underline-offset-8">إحصاء نتيجة آخر العام للعام الدراسي {schoolInfo.academicYear}</h2>
              {selectedGrade !== 'all_prep' && <h3 className="text-xl font-bold mt-2">{GRADE_LABELS[selectedGrade as GradeLevel]}</h3>}
          </div>
          <table id="middle-year-table" className="w-full text-center border-collapse border-2 border-black font-bold text-[13px]">
              <thead>
                  <tr className="bg-gray-100 h-14">
                      <th rowSpan={2} className="border-2 border-black p-2 bg-gray-200 w-[150px]">الصف</th>
                      <th colSpan={3} className="border-2 border-black p-1 bg-gray-50">مقيد</th><th colSpan={3} className="border-2 border-black p-1">حاضر</th><th colSpan={3} className="border-2 border-black p-1">غائب</th><th colSpan={3} className="border-2 border-black p-1">من ٦٥ فأكثر</th><th colSpan={3} className="border-2 border-black p-1">من ٥٠ لـ ٦٥</th><th colSpan={3} className="border-2 border-black p-1 text-red-700">أقل من ٥٠</th><th rowSpan={2} className="border-2 border-black p-2 w-[100px] bg-gray-200">النسبة</th>
                  </tr>
                  <tr className="bg-white text-[11px]">
                      {Array.from({length: 6}).map((_, i) => (<React.Fragment key={i}><th className="border-2 border-black p-1">بنون</th><th className="border-2 border-black p-1">بنات</th><th className="border-2 border-black p-1 bg-gray-50">جملة</th></React.Fragment>))}
                  </tr>
              </thead>
              <tbody>
                  {statsData.map((row, idx) => (
                      <tr key={idx} className="h-16 text-[15px] hover:bg-gray-50 transition-colors">
                          <td className="border-2 border-black bg-gray-50 font-black">{row.label}</td>
                          <td className="border-2 border-black">{row.registered.boys}</td><td className="border-2 border-black">{row.registered.girls}</td><td className="border-2 border-black bg-gray-100">{row.registered.total}</td>
                          <td className="border-2 border-black">{row.present.boys}</td><td className="border-2 border-black">{row.present.girls}</td><td className="border-2 border-black bg-gray-100">{row.present.total}</td>
                          <td className="border-2 border-black text-red-600">{row.absent.boys}</td><td className="border-2 border-black text-red-600">{row.absent.girls}</td><td className="border-2 border-black bg-red-50 text-red-700">{row.absent.total}</td>
                          <td className="border-2 border-black text-emerald-700">{row.passedHigh.boys}</td><td className="border-2 border-black text-emerald-700">{row.passedHigh.girls}</td><td className="border-2 border-black bg-emerald-50 text-emerald-800">{row.passedHigh.total}</td>
                          <td className="border-2 border-black text-blue-700">{row.passedMedium.boys}</td><td className="border-2 border-black text-blue-700">{row.passedMedium.girls}</td><td className="border-2 border-black bg-blue-50 text-blue-800">{row.passedMedium.total}</td>
                          <td className="border-2 border-black text-red-600">{row.failed.boys}</td><td className="border-2 border-black text-red-600">{row.failed.girls}</td><td className="border-2 border-black bg-red-50 text-red-700">{row.failed.total}</td>
                          <td className="border-2 border-black font-black bg-white text-lg">%{row.percentage.toFixed(1)}</td>
                      </tr>
                  ))}
              </tbody>
          </table>

          <div className="mt-20 flex justify-between items-end px-4 font-black text-xl">
              <div className="text-center w-44"><p className="mb-14">مسئول الحاسب</p><p className="border-t border-black pt-1">{schoolInfo.itSpecialist || '.................'}</p></div>
              <div className="text-center w-44"><p className="mb-14">رئيس الكنترول</p><p className="border-t border-black pt-1">{schoolInfo.controlHead || '.................'}</p></div>
              <div className="text-center w-44"><p className="mb-14">وكيل المدرسة</p><p className="border-t border-black pt-1">{schoolInfo.agentName || '.................'}</p></div>
              <div className="text-center w-44"><p className="mb-14">المدير التنفيذى</p><p className="border-t border-black pt-1">{schoolInfo.managerName || '.................'}</p></div>
          </div>
      </div>
    </div>
  );
};
export default MiddleYearEndOfficialStats;
