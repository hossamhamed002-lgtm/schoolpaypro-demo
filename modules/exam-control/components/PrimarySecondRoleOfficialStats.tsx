
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
    success: StatCell;
    combinedSuccess: StatCell;
    failed: StatCell;
    percent: number;
};

const PrimarySecondRoleOfficialStats: React.FC<Props> = ({ students, subjects, grades, onBack }) => {
  const [isExporting, setIsExporting] = useState(false);
  const schoolInfo = db.getSchoolInfo();
  const certConfig = db.getCertConfig();

  const primaryGrades: GradeLevel[] = ['p3', 'p4', 'p5', 'p6'];

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
            combinedSuccess: { boys: 0, girls: 0, total: 0 },
            failed: { boys: 0, girls: 0, total: 0 },
            percent: 0
        };

        const gradeStudents = students.filter(s => s.gradeLevel === g);
        const gradeSubjects = subjects.filter(s => s.gradeLevels?.includes(g) && s.isBasic);

        gradeStudents.forEach(student => {
            const isBoy = student.gender === 'ذكر';
            const stGrades = grades[student.id] || {};
            
            let failedRound1 = false;
            gradeSubjects.forEach(sub => {
                const rec = stGrades[sub.id];
                const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
                const t1 = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
                const t2 = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
                const annualAvg = (t1 + t2) / 2;
                const t2_exam = safeVal(rec?.term2?.exam);
                const passedWritten = (sub.examScore === 0) || (t2_exam >= sub.examScore * EXAM_THRESHOLD);
                if (sub.examScore > 0 && (rec?.term1?.exam === -1 || rec?.term2?.exam === -1)) failedRound1 = true;
                else if (!passedWritten || annualAvg < sub.maxScore * PASS_THRESHOLD) failedRound1 = true;
            });

            if (failedRound1) {
                row.registered.total++; if (isBoy) row.registered.boys++; else row.registered.girls++;
                let attendedR2 = false, failedR2 = false;
                gradeSubjects.forEach(sub => {
                    const rec = stGrades[sub.id];
                    if (rec?.secondRole) {
                        attendedR2 = true;
                        if (rec.secondRole.exam === -1 || rec.secondRole.exam < sub.maxScore * 0.5) failedR2 = true;
                    } else failedR2 = true;
                });
                if (attendedR2) {
                    row.present.total++; if (isBoy) row.present.boys++; else row.present.girls++;
                    if (!failedR2) {
                        row.success.total++; if (isBoy) row.success.boys++; else row.success.girls++;
                    } else {
                        row.failed.total++; if (isBoy) row.failed.boys++; else row.failed.girls++;
                    }
                } else {
                    row.absent.total++; if (isBoy) row.absent.boys++; else row.absent.girls++;
                    row.failed.total++; if (isBoy) row.failed.boys++; else row.failed.girls++;
                }
            }
        });
        row.percent = row.registered.total > 0 ? (row.success.total / row.registered.total) * 100 : 0;
        return row;
    });
  }, [students, subjects, grades, certConfig]);

  const handleExportPDF = () => {
    setIsExporting(true);
    exportUtils.exportToPDF('primary-second-role-stats-area', 'إحصاء_الدور_الثاني_ابتدائي').then(() => setIsExporting(false));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border no-print">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ArrowRight size={20} /></button>
          <h2 className="text-xl font-bold">إحصاء نتيجة الدور الثاني (الابتدائي)</h2>
        </div>
        <div className="flex gap-2">
            <button onClick={() => exportUtils.exportTableToExcel('primary-second-role-table', 'إحصاء_الدور_الثاني_ابتدائي')} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 font-bold flex items-center gap-2"><FileSpreadsheet size={18}/> Excel</button>
            <button onClick={handleExportPDF} disabled={isExporting} className="bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200 font-bold flex items-center gap-2">{isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>} PDF</button>
            <button onClick={() => exportUtils.print()} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Printer size={18}/> طباعة</button>
        </div>
      </div>

      <div id="primary-second-role-stats-area" className="bg-white p-10 rounded border-2 border-black overflow-x-auto min-w-max text-black font-sans shadow-none" dir="rtl">
          <div className="text-center mb-8 border-b-2 border-black pb-4">
              <h1 className="text-2xl font-black mb-1">{schoolInfo.schoolName}</h1>
              <h2 className="text-xl font-bold underline decoration-4 underline-offset-8">إحصاء نتيجة الدور الثاني ( الثالث والرابع والخامس والسادس )</h2>
              <p className="text-md mt-4 font-bold">العام الدراسي {schoolInfo.academicYear}</p>
          </div>
          <table id="primary-second-role-table" className="w-full text-center border-collapse border-2 border-black font-bold text-[13px]">
              <thead>
                  <tr className="bg-gray-100 h-14">
                      <th rowSpan={2} className="border-2 border-black p-2 bg-gray-200 w-[150px]">الصف</th>
                      <th colSpan={3} className="border-2 border-black p-2 bg-yellow-50">مقيدون</th>
                      <th colSpan={3} className="border-2 border-black p-2 bg-blue-50">حاضرون</th>
                      <th colSpan={3} className="border-2 border-black p-2 bg-gray-50">غائبون</th>
                      <th colSpan={3} className="border-2 border-black p-2 bg-green-50 text-emerald-800">ناجحون</th>
                      <th colSpan={3} className="border-2 border-black p-2 bg-red-50 text-red-800">راسبون</th>
                      <th rowSpan={2} className="border-2 border-black p-4 w-[110px] bg-gray-200">النسبة المئوية %</th>
                  </tr>
                  <tr className="text-[11px] bg-white h-10">
                      {/* Generate sub headers for 5 categories (Registered to Failed) */}
                      {[...Array(5)].map((_, i) => (
                          <React.Fragment key={i}>
                              <th className="border-2 border-black p-1 w-10">بنون</th>
                              <th className="border-2 border-black p-1 w-10">بنات</th>
                              <th className="border-2 border-black p-1 w-12 bg-gray-100/50">جملة</th>
                          </React.Fragment>
                      ))}
                  </tr>
              </thead>
              <tbody>
                  {stats.map((row, idx) => (
                      <tr key={idx} className="h-14 text-[15px] hover:bg-gray-50 transition-colors">
                          <td className="border-2 border-black bg-gray-50 font-black">{row.gradeLabel}</td>
                          
                          {/* Registered */}
                          <td className="border-2 border-black">{row.registered.boys}</td>
                          <td className="border-2 border-black">{row.registered.girls}</td>
                          <td className="border-2 border-black bg-yellow-50/30">{row.registered.total}</td>

                          {/* Present */}
                          <td className="border-2 border-black">{row.present.boys}</td>
                          <td className="border-2 border-black">{row.present.girls}</td>
                          <td className="border-2 border-black bg-blue-50/30">{row.present.total}</td>

                          {/* Absent */}
                          <td className="border-2 border-black text-red-600">{row.absent.boys}</td>
                          <td className="border-2 border-black text-red-600">{row.absent.girls}</td>
                          <td className="border-2 border-black bg-gray-50/30 text-red-700">{row.absent.total}</td>

                          {/* Success */}
                          <td className="border-2 border-black text-emerald-700">{row.success.boys}</td>
                          <td className="border-2 border-black text-emerald-700">{row.success.girls}</td>
                          <td className="border-2 border-black bg-green-50/30 text-emerald-800">{row.success.total}</td>

                          {/* Failed */}
                          <td className="border-2 border-black text-red-600">{row.failed.boys}</td>
                          <td className="border-2 border-black text-red-600">{row.failed.girls}</td>
                          <td className="border-2 border-black bg-red-50/30 text-red-700">{row.failed.total}</td>

                          {/* Percentage (Leftmost) */}
                          <td className="border-2 border-black font-black bg-white text-lg">%{row.percent.toFixed(1)}</td>
                      </tr>
                  ))}
              </tbody>
          </table>
          <div className="mt-16 flex justify-between items-end px-4 font-black text-[13px] text-black">
              <div className="text-center w-44"><p className="mb-14">مسئول الحاسب</p><p className="border-t-2 border-black pt-1">{schoolInfo.itSpecialist || '.................'}</p></div>
              <div className="text-center w-44"><p className="mb-14">رئيس الكنترول</p><p className="border-t-2 border-black pt-1">{schoolInfo.controlHead || '.................'}</p></div>
              <div className="text-center w-44"><p className="mb-14">وكيل المدرسة</p><p className="border-t-2 border-black pt-1">{schoolInfo.agentName || '.................'}</p></div>
              <div className="text-center w-44"><p className="mb-14">المدير التنفيذى</p><p className="border-t-2 border-black pt-1">{schoolInfo.managerName || '.................'}</p></div>
          </div>
          <div className="mt-10 pt-4 border-t border-dashed border-gray-300 text-[10px] text-gray-400 font-mono tracking-widest text-left">
              - PRIMARY SECOND ROLE OFFICIAL STATISTICS
          </div>
      </div>
    </div>
  );
};
export default PrimarySecondRoleOfficialStats;
