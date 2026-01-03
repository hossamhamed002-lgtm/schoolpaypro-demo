
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
    passedSecondRole: StatCell;
    passedFullYear: StatCell;
    failed: StatCell;
};

const MiddleSecondRoleOfficialStats: React.FC<Props> = ({ students, subjects, grades, onBack }) => {
  const [isExporting, setIsExporting] = useState(false);
  const schoolInfo = db.getSchoolInfo();
  const certConfig = db.getCertConfig();

  const middleGrades: GradeLevel[] = ['m1', 'm2'];

  const stats = useMemo(() => {
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;

    return middleGrades.map(g => {
        const row: StatRow = {
            gradeLabel: GRADE_LABELS[g],
            registered: { boys: 0, girls: 0, total: 0 },
            present: { boys: 0, girls: 0, total: 0 },
            absent: { boys: 0, girls: 0, total: 0 },
            passedSecondRole: { boys: 0, girls: 0, total: 0 },
            passedFullYear: { boys: 0, girls: 0, total: 0 },
            failed: { boys: 0, girls: 0, total: 0 }
        };

        const gradeStudents = students.filter(s => s.gradeLevel === g);
        const gradeSubjects = subjects.filter(s => s.gradeLevels?.includes(g) && s.isBasic);

        gradeStudents.forEach(student => {
            const isBoy = student.gender === 'ذكر';
            const stGrades = grades[student.id] || {};
            
            let failedRound1 = false;
            let passedRound1 = true;
            let attendedSecondRole = false;
            let passedAfterSecondRole = false;

            gradeSubjects.forEach(sub => {
                const rec = stGrades[sub.id];
                const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
                const t1 = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
                const t2 = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
                const annualAvg = (t1 + t2) / 2;
                const t2_exam = safeVal(rec?.term2?.exam);
                const passedWritten = (sub.examScore === 0) || (t2_exam >= sub.examScore * EXAM_THRESHOLD);

                if (sub.examScore > 0 && (rec?.term1?.exam === -1 || rec?.term2?.exam === -1)) {
                    failedRound1 = true; passedRound1 = false;
                } else if (!passedWritten || annualAvg < sub.maxScore * PASS_THRESHOLD) {
                    failedRound1 = true; passedRound1 = false;
                }
            });

            if (failedRound1) {
                row.registered.total++; if (isBoy) row.registered.boys++; else row.registered.girls++;
                let hasAbsenceInR2 = false;
                let failedInR2 = false;
                gradeSubjects.forEach(sub => {
                    const rec = stGrades[sub.id];
                    if (rec?.secondRole) {
                        attendedSecondRole = true;
                        if (rec.secondRole.exam === -1) hasAbsenceInR2 = true;
                        if (rec.secondRole.exam < sub.maxScore * 0.5) failedInR2 = true;
                    }
                });

                if (attendedSecondRole) {
                    if (hasAbsenceInR2) {
                        row.absent.total++; if (isBoy) row.absent.boys++; else row.absent.girls++;
                        row.failed.total++; if (isBoy) row.failed.boys++; else row.failed.girls++;
                    } else {
                        row.present.total++; if (isBoy) row.present.boys++; else row.present.girls++;
                        if (!failedInR2) {
                            passedAfterSecondRole = true;
                            row.passedSecondRole.total++; if (isBoy) row.passedSecondRole.boys++; else row.passedSecondRole.girls++;
                        } else {
                            row.failed.total++; if (isBoy) row.failed.boys++; else row.failed.girls++;
                        }
                    }
                } else {
                    row.absent.total++; if (isBoy) row.absent.boys++; else row.absent.girls++;
                    row.failed.total++; if (isBoy) row.failed.boys++; else row.failed.girls++;
                }
            }
            if (passedRound1 || passedAfterSecondRole) {
                row.passedFullYear.total++; if (isBoy) row.passedFullYear.boys++; else row.passedFullYear.girls++;
            }
        });
        return row;
    });
  }, [students, subjects, grades, certConfig]);

  const handleExportPDF = () => {
    setIsExporting(true);
    exportUtils.exportToPDF('middle-second-role-stats-area', 'إحصاء_الدور_الثاني_اعدادي').then(() => setIsExporting(false));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border no-print">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ArrowRight size={20} /></button>
          <h2 className="text-xl font-bold">إحصاء نتيجة الدور الثاني (الإعدادي)</h2>
        </div>
        <div className="flex gap-2">
            <button onClick={() => exportUtils.exportTableToExcel('middle-second-role-table', 'إحصاء_الدور_الثاني_اعدادي')} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 font-bold flex items-center gap-2"><FileSpreadsheet size={18}/> Excel</button>
            <button onClick={handleExportPDF} disabled={isExporting} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg border border-red-200 font-bold flex items-center gap-2">
                {isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>} PDF
            </button>
            <button onClick={() => exportUtils.print()} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Printer size={18}/> طباعة</button>
        </div>
      </div>

      <div id="middle-second-role-stats-area" className="bg-white p-10 rounded border-2 border-black overflow-x-auto min-w-max text-black font-sans shadow-none" dir="rtl">
          <div className="text-center mb-6 border-b-2 border-black pb-4">
              <h1 className="text-2xl font-black mb-1">إحصاء نتيجة الدور الثاني للصفين (الأول والثاني الإعدادي)</h1>
              <p className="text-lg font-bold">للعام الدراسي {schoolInfo.academicYear} - مدرسة {schoolInfo.schoolName}</p>
          </div>

          <table id="middle-second-role-table" className="w-full text-center border-collapse border-2 border-black font-bold text-[13px]">
              <thead>
                  <tr className="bg-gray-100 h-14">
                      <th rowSpan={2} className="border-2 border-black p-2 bg-gray-200 w-[150px]">الصف</th>
                      <th colSpan={3} className="border-2 border-black p-2 bg-yellow-50">مقيدون</th>
                      <th colSpan={3} className="border-2 border-black p-2 bg-blue-50">حاضرون</th>
                      <th colSpan={3} className="border-2 border-black p-2 bg-gray-50">غائبون</th>
                      <th colSpan={3} className="border-2 border-black p-2 bg-green-50">ناجحون (ملحق)</th>
                      <th colSpan={3} className="border-2 border-black p-2 bg-emerald-50">ناجح الدورين معاً</th>
                      <th colSpan={3} className="border-2 border-black p-2 bg-red-50">راسبون</th>
                      <th rowSpan={2} className="border-2 border-black p-4 w-[110px] bg-gray-200">النسبة %</th>
                  </tr>
                  <tr className="text-[11px] bg-white h-10">
                      {/* Generate sub headers for 6 categories (Registered to Failed) */}
                      {[...Array(6)].map((_, i) => (
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
                      <tr key={idx} className="h-16 text-[15px] hover:bg-gray-50 transition-colors">
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

                          {/* Passed Second Role (R2 Only) */}
                          <td className="border-2 border-black text-emerald-700">{row.passedSecondRole.boys}</td>
                          <td className="border-2 border-black text-emerald-700">{row.passedSecondRole.girls}</td>
                          <td className="border-2 border-black bg-green-50/30 text-emerald-800">{row.passedSecondRole.total}</td>

                          {/* Passed Full Year (R1 + R2) */}
                          <td className="border-2 border-black text-blue-700">{row.passedFullYear.boys}</td>
                          <td className="border-2 border-black text-blue-700">{row.passedFullYear.girls}</td>
                          <td className="border-2 border-black bg-blue-50/30 text-blue-800 font-black">{row.passedFullYear.total}</td>

                          {/* Failed */}
                          <td className="border-2 border-black text-red-600">{row.failed.boys}</td>
                          <td className="border-2 border-black text-red-600">{row.failed.girls}</td>
                          <td className="border-2 border-black bg-red-50/30 text-red-700">{row.failed.total}</td>

                          {/* Percentage (Leftmost) */}
                          <td className="border-2 border-black font-black bg-white text-lg">
                              {row.registered.total > 0 ? `%${Math.round((row.passedSecondRole.total / row.registered.total) * 100)}` : '0%'}
                          </td>
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
          <div className="mt-10 pt-4 border-t border-dashed border-gray-300 text-[10px] text-gray-400 font-mono tracking-widest text-left">
             - MIDDLE SECOND ROLE OFFICIAL STATISTICS
          </div>
      </div>
    </div>
  );
};
export default MiddleSecondRoleOfficialStats;
