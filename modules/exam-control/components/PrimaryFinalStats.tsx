
import React, { useMemo } from 'react';
import { ArrowRight, Printer, FileDown, Loader2 } from 'lucide-react';
import { Student, Subject, GradesDatabase, GradeLevel, GRADE_LABELS } from '../examControl.types';
import { db } from '../services/db';
// @ts-ignore
import html2pdf from 'html2pdf.js';

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
    success: StatCell;
    remedial: StatCell;
    percentage: number;
};

const PrimaryFinalStats: React.FC<Props> = ({ students, subjects, grades, onBack }) => {
  const [isExporting, setIsExporting] = React.useState(false);
  const schoolInfo = db.getSchoolInfo();
  const certConfig = db.getCertConfig();

  const primaryGrades: GradeLevel[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

  const stats = useMemo(() => {
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;

    return primaryGrades.map(g => {
        const row: StatRow = {
            gradeLabel: GRADE_LABELS[g].replace('الصف ', '').replace(' الابتدائي', ''),
            registered: { boys: 0, girls: 0, total: 0 },
            present: { boys: 0, girls: 0, total: 0 },
            absent: { boys: 0, girls: 0, total: 0 },
            success: { boys: 0, girls: 0, total: 0 },
            remedial: { boys: 0, girls: 0, total: 0 },
            percentage: 0
        };

        const gradeStudents = students.filter(s => s.gradeLevel === g);
        const gradeSubjects = subjects.filter(s => s.gradeLevels?.includes(g) && s.isBasic);

        gradeStudents.forEach(student => {
            const isBoy = student.gender === 'ذكر';
            const stGrades = grades[student.id] || {};
            row.registered.total++;
            if (isBoy) row.registered.boys++; else row.registered.girls++;
            let isAbsent = false;
            let isFailed = false;
            let hasExamData = false;

            gradeSubjects.forEach(sub => {
                const rec = stGrades[sub.id];
                const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
                const t1_total = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
                const t2_total = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
                const annualAvg = (t1_total + t2_total) / 2;
                if (rec?.term1?.exam !== undefined || rec?.term2?.exam !== undefined) hasExamData = true;
                if (sub.examScore > 0 && (rec?.term1?.exam === -1 || rec?.term2?.exam === -1)) isAbsent = true;
                if (g === 'p1' || g === 'p2') {
                    if (annualAvg < sub.maxScore * 0.5) isFailed = true;
                } else {
                    const t2_exam = safeVal(rec?.term2?.exam);
                    const passedWritten = (sub.examScore === 0) || (t2_exam >= sub.examScore * EXAM_THRESHOLD);
                    if (!passedWritten || annualAvg < sub.maxScore * PASS_THRESHOLD) isFailed = true;
                }
            });

            if (isAbsent || !hasExamData) {
                row.absent.total++; if (isBoy) row.absent.boys++; else row.absent.girls++;
                row.remedial.total++; if (isBoy) row.remedial.boys++; else row.remedial.girls++;
            } else {
                row.present.total++; if (isBoy) row.present.boys++; else row.present.girls++;
                if (isFailed) {
                    row.remedial.total++; if (isBoy) row.remedial.boys++; else row.remedial.girls++;
                } else {
                    row.success.total++; if (isBoy) row.success.boys++; else row.success.girls++;
                }
            }
        });
        row.percentage = row.present.total > 0 ? (row.success.total / row.present.total) * 100 : 0;
        return row;
    });
  }, [students, subjects, grades, certConfig]);

  const handleExportPDF = () => {
    const element = document.getElementById('primary-final-stats-area');
    if (!element) return;
    setIsExporting(true);
    html2pdf()
      .set({
        margin: 5,
        filename: `احصاء_الابتدائي.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          foreignObjectRendering: true,
          onclone: (doc: Document) => {
            const link = doc.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&display=swap';
            doc.head.appendChild(link);
            const style = doc.createElement('style');
            style.textContent = `
              * { font-family: 'Cairo', 'Noto Naskh Arabic', sans-serif !important; }
              html, body { direction: rtl; unicode-bidi: plaintext; }
            `;
            doc.head.appendChild(style);
          }
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const }
      })
      .from(element)
      .save()
      .then(() => setIsExporting(false));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border no-print">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ArrowRight size={20} /></button>
          <h2 className="text-xl font-bold">إحصاء نتيحة آخر العام (رسمي)</h2>
        </div>
        <div className="flex gap-2">
            <button onClick={handleExportPDF} disabled={isExporting} className="bg-white text-gray-800 px-4 py-2 rounded-lg border border-gray-300 font-bold flex items-center gap-2">
                {isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>} PDF
            </button>
            <button onClick={() => window.print()} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Printer size={18}/> طباعة</button>
        </div>
      </div>

      <div id="primary-final-stats-area" className="bg-white p-8 rounded shadow-sm border-2 border-black overflow-x-auto min-w-max text-black">
          <div className="text-center mb-6 border-b-2 border-black pb-4">
              <h1 className="text-2xl font-black mb-1">{schoolInfo.schoolName}</h1>
              <h2 className="text-xl font-bold underline">إحصاء نتيجة آخر العام لطلاب المرحلة الابتدائية</h2>
              <p className="text-md mt-2 font-bold">العام الدراسي {schoolInfo.academicYear}</p>
          </div>

          <table className="w-full text-center border-collapse border-2 border-black font-bold text-[13px]">
              <thead>
                  <tr className="bg-gray-100 h-12">
                      <th rowSpan={2} className="border-2 border-black p-2 bg-gray-200 w-[120px]">الصف</th>
                      <th colSpan={3} className="border-2 border-black p-1">المقيد</th>
                      <th colSpan={3} className="border-2 border-black p-1">الحاضر</th>
                      <th colSpan={3} className="border-2 border-black p-1">الغائب</th>
                      <th colSpan={3} className="border-2 border-black p-1">الناجح</th>
                      <th colSpan={3} className="border-2 border-black p-1">دور ثان</th>
                      <th rowSpan={2} className="border-2 border-black p-2 bg-gray-200 w-[100px]">النسبة %</th>
                  </tr>
                  <tr className="text-[11px] bg-white">
                      {Array.from({length: 5}).map((_, i) => (
                          <React.Fragment key={i}>
                              <th className="border-2 border-black p-1">بنين</th><th className="border-2 border-black p-1">بنات</th><th className="border-2 border-black p-1 bg-gray-100">جملة</th>
                          </React.Fragment>
                      ))}
                  </tr>
              </thead>
              <tbody>
                  {stats.map((row, idx) => (
                      <tr key={idx} className="h-12 hover:bg-gray-50">
                          <td className="border-2 border-black bg-gray-50 font-black">{row.gradeLabel}</td>
                          <td className="border-2 border-black">{row.registered.boys}</td><td className="border-2 border-black">{row.registered.girls}</td><td className="border-2 border-black bg-gray-100">{row.registered.total}</td>
                          <td className="border-2 border-black">{row.present.boys}</td><td className="border-2 border-black">{row.present.girls}</td><td className="border-2 border-black bg-gray-100">{row.present.total}</td>
                          <td className="border-2 border-black">{row.absent.boys}</td><td className="border-2 border-black">{row.absent.girls}</td><td className="border-2 border-black bg-gray-100">{row.absent.total}</td>
                          <td className="border-2 border-black">{row.success.boys}</td><td className="border-2 border-black">{row.success.girls}</td><td className="border-2 border-black bg-gray-100">{row.success.total}</td>
                          <td className="border-2 border-black">{row.remedial.boys}</td><td className="border-2 border-black">{row.remedial.girls}</td><td className="border-2 border-black bg-gray-100">{row.remedial.total}</td>
                          <td className="border-2 border-black bg-white font-black text-lg">{row.percentage.toFixed(1)}%</td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
    </div>
  );
};
export default PrimaryFinalStats;
