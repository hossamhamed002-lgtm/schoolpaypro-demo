
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
type StatRow = {
    gradeLabel: string;
    registered: StatCell;
    present: StatCell;
    absent: StatCell;
    passed: StatCell;
    failed: StatCell;
    percentage: number;
};

const PrimaryTermOfficialStats: React.FC<Props> = ({ students, subjects, grades, onBack }) => {
  const [isExporting, setIsExporting] = useState(false);
  const schoolInfo = db.getSchoolInfo();
  const certConfig = db.getCertConfig();

  const primaryGrades: GradeLevel[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

  const stats = useMemo(() => {
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;

    return primaryGrades.map(g => {
        const row: StatRow = {
            gradeLabel: GRADE_LABELS[g].replace('الصف ', '').replace(' الابتدائي', ''),
            registered: { boys: 0, girls: 0, total: 0 }, present: { boys: 0, girls: 0, total: 0 },
            absent: { boys: 0, girls: 0, total: 0 }, passed: { boys: 0, girls: 0, total: 0 },
            failed: { boys: 0, girls: 0, total: 0 }, percentage: 0
        };

        const gradeStudents = students.filter(s => s.gradeLevel === g);
        const gradeSubjects = subjects.filter(s => s.gradeLevels?.includes(g) && s.isBasic);

        gradeStudents.forEach(student => {
            const isBoy = student.gender === 'ذكر';
            const stGrades = grades[student.id] || {};
            row.registered.total++; if (isBoy) row.registered.boys++; else row.registered.girls++;
            let isAbsent = false, isFailed = false, hasExamData = false;

            gradeSubjects.forEach(sub => {
                const rec = stGrades[sub.id]?.term1;
                const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
                const total = safeVal(rec?.work) + safeVal(rec?.practical) + safeVal(rec?.exam);
                if (rec?.exam !== undefined) hasExamData = true;
                if (sub.examScore > 0 && rec?.exam === -1) isAbsent = true;

                if (g === 'p1' || g === 'p2') { if (total < sub.maxScore * 0.5) isFailed = true; } 
                else { const examVal = safeVal(rec?.exam); const passedWritten = (sub.examScore === 0) || (examVal >= sub.examScore * EXAM_THRESHOLD); if (!passedWritten || total < sub.maxScore * PASS_THRESHOLD) isFailed = true; }
            });

            if (isAbsent || !hasExamData) {
                row.absent.total++; if (isBoy) row.absent.boys++; else row.absent.girls++;
                row.failed.total++; if (isBoy) row.failed.boys++; else row.failed.girls++;
            } else {
                row.present.total++; if (isBoy) row.present.boys++; else row.present.girls++;
                if (isFailed) { row.failed.total++; if (isBoy) row.failed.boys++; else row.failed.girls++; } 
                else { row.passed.total++; if (isBoy) row.passed.boys++; else row.passed.girls++; }
            }
        });
        row.percentage = row.present.total > 0 ? (row.passed.total / row.present.total) * 100 : 0;
        return row;
    });
  }, [students, subjects, grades, certConfig]);

  const handleExportPDF = () => {
    setIsExporting(true);
    exportUtils.exportToPDF('primary-term-report-container', 'إحصاء_نصف_العام_ابتدائي').then(() => setIsExporting(false));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border no-print">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ArrowRight size={20} /></button>
          <h2 className="text-xl font-bold">إحصاء نتيجة نصف العام (المرحلة الابتدائية)</h2>
        </div>
        <div className="flex gap-2">
            <button onClick={() => exportUtils.exportTableToExcel('primary-term-table', 'إحصاء_نصف_العام_ابتدائي')} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 font-bold flex items-center gap-2"><FileSpreadsheet size={18}/> Excel</button>
            <button onClick={handleExportPDF} disabled={isExporting} className="bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200 font-bold flex items-center gap-2">{isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>} PDF</button>
            <button onClick={() => exportUtils.print()} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Printer size={18}/> طباعة</button>
        </div>
      </div>

      <div id="primary-term-report-container" className="bg-white p-8 rounded border-2 border-black overflow-x-auto min-w-max text-black">
          <div className="text-center mb-6 border-b-2 border-black pb-4">
              <h1 className="text-2xl font-black mb-1">{schoolInfo.schoolName}</h1>
              <h2 className="text-xl font-bold underline">إحصاء بنتيجة نصف العام لطلاب المرحلة الابتدائية</h2>
              <p className="text-md mt-2 font-bold">العام الدراسي {schoolInfo.academicYear}</p>
          </div>
          <table id="primary-term-table" className="w-full text-center border-collapse border-2 border-black font-bold text-[13px]">
              <thead>
                  <tr className="bg-gray-100 h-12">
                      <th rowSpan={2} className="border-2 border-black p-2 bg-gray-200 w-[120px]">الصف</th>
                      <th colSpan={3} className="border-2 border-black p-1">مقيد</th><th colSpan={3} className="border-2 border-black p-1">حاضر</th><th colSpan={3} className="border-2 border-black p-1">غائب</th><th colSpan={3} className="border-2 border-black p-1">ناجح</th><th colSpan={3} className="border-2 border-black p-1 text-red-700">لم يجتز (راسب)</th><th rowSpan={2} className="border-2 border-black p-2 bg-gray-200 w-[110px]">النسبة %</th>
                  </tr>
                  <tr className="text-[11px] bg-white">
                      {Array.from({length: 5}).map((_, i) => (<React.Fragment key={i}><th className="border-2 border-black p-1">بنين</th><th className="border-2 border-black p-1">بنات</th><th className="border-2 border-black p-1 bg-gray-50">جملة</th></React.Fragment>))}
                  </tr>
              </thead>
              <tbody>
                  {stats.map((row, idx) => (
                      <tr key={idx} className="h-12 hover:bg-gray-50 transition-colors">
                          <td className="border-2 border-black bg-gray-50 font-black">الصف {row.gradeLabel}</td>
                          <td className="border-2 border-black">{row.registered.boys}</td><td className="border-2 border-black">{row.registered.girls}</td><td className="border-2 border-black bg-gray-50">{row.registered.total}</td>
                          <td className="border-2 border-black">{row.present.boys}</td><td className="border-2 border-black">{row.present.girls}</td><td className="border-2 border-black bg-gray-50">{row.present.total}</td>
                          <td className="border-2 border-black text-red-600">{row.absent.boys}</td><td className="border-2 border-black text-red-600">{row.absent.girls}</td><td className="border-2 border-black bg-gray-50 text-red-600">{row.absent.total}</td>
                          <td className="border-2 border-black">{row.passed.boys}</td><td className="border-2 border-black">{row.passed.girls}</td><td className="border-2 border-black bg-gray-50">{row.passed.total}</td>
                          <td className="border-2 border-black text-red-600">{row.failed.boys}</td><td className="border-2 border-black text-red-600">{row.failed.girls}</td><td className="border-2 border-black bg-gray-50 text-red-600">{row.failed.total}</td>
                          <td className="border-2 border-black font-black text-lg bg-white">{row.percentage.toFixed(1)}%</td>
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
export default PrimaryTermOfficialStats;
