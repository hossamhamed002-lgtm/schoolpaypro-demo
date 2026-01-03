
import React, { useState, useMemo } from 'react';
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
    absent: StatCell;
    present: StatCell;
    lessThan50: StatCell;
    from50To65: StatCell;
    from65AndAbove: StatCell;
    percentage: number;
}

const MiddleTermOfficialStats: React.FC<Props> = ({ students, subjects, grades, onBack }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | 'all_prep'>('all_prep');
  const [isExporting, setIsExporting] = useState(false);
  const schoolInfo = db.getSchoolInfo();
  const certConfig = db.getCertConfig();

  const middleGradeLevels: GradeLevel[] = ['m1', 'm2'];

  const statsData = useMemo(() => {
    const targetGrades = selectedGrade === 'all_prep' ? middleGradeLevels : [selectedGrade as GradeLevel];
    
    return targetGrades.map(g => {
        const gradeStudents = students.filter(s => s.gradeLevel === g);
        const gradeSubjects = subjects.filter(sub => sub.gradeLevels?.includes(g) && sub.isAddedToTotal);
        const maxTotal = gradeSubjects.reduce((acc, sub) => acc + sub.maxScore, 0);

        const row: GradeStatRow = {
            label: GRADE_LABELS[g],
            registered: { boys: 0, girls: 0, total: 0 },
            absent: { boys: 0, girls: 0, total: 0 },
            present: { boys: 0, girls: 0, total: 0 },
            lessThan50: { boys: 0, girls: 0, total: 0 },
            from50To65: { boys: 0, girls: 0, total: 0 },
            from65AndAbove: { boys: 0, girls: 0, total: 0 },
            percentage: 0
        };

        gradeStudents.forEach(st => {
            const isBoy = st.gender === 'ذكر';
            const stGrades = grades[st.id] || {};
            row.registered.total++; if (isBoy) row.registered.boys++; else row.registered.girls++;
            let isAbsent = true;
            let totalScore = 0;
            gradeSubjects.forEach(sub => {
                const rec = stGrades[sub.id]?.term1;
                const examVal = rec?.exam;
                if (examVal !== undefined && examVal !== -1) isAbsent = false;
                const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
                totalScore += safeVal(rec?.work) + safeVal(rec?.practical) + (examVal === -1 ? 0 : safeVal(examVal));
            });

            if (isAbsent) {
                row.absent.total++; if (isBoy) row.absent.boys++; else row.absent.girls++;
            } else {
                row.present.total++; if (isBoy) row.present.boys++; else row.present.girls++;
                const percent = maxTotal > 0 ? (totalScore / maxTotal) * 100 : 0;
                if (percent < 50) {
                    row.lessThan50.total++; if (isBoy) row.lessThan50.boys++; else row.lessThan50.girls++;
                } else if (percent < 65) {
                    row.from50To65.total++; if (isBoy) row.from50To65.boys++; else row.from50To65.girls++;
                } else {
                    row.from65AndAbove.total++; if (isBoy) row.from65AndAbove.boys++; else row.from65AndAbove.girls++;
                }
            }
        });
        row.percentage = row.present.total > 0 ? ((row.from50To65.total + row.from65AndAbove.total) / row.present.total) * 100 : 0;
        return row;
    });
  }, [students, subjects, grades, selectedGrade, certConfig]);

  const handleExportPDF = () => {
    setIsExporting(true);
    exportUtils.exportToPDF('middle-term-area', 'إحصاء_اعدادي_نصف_العام').then(() => setIsExporting(false));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border no-print">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ArrowRight size={20} /></button>
          <h2 className="text-xl font-bold">إحصاء نصف العام (الإعدادي)</h2>
        </div>
        <div className="flex gap-2">
            <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value as any)} className="border rounded px-3 py-1.5 font-bold text-blue-700 bg-gray-50 outline-none">
                <option value="all_prep">كل الصفوف (الأول والثاني)</option>
                <option value="m1">أولى إعدادي</option>
                <option value="m2">ثانية إعدادي</option>
            </select>
            <button onClick={() => exportUtils.exportTableToExcel('middle-term-table', 'إحصاء_اعدادي_نصف_العام')} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 font-bold flex items-center gap-2"><FileSpreadsheet size={18}/> Excel</button>
            <button onClick={handleExportPDF} disabled={isExporting} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg border border-red-200 font-bold flex items-center gap-2">
                {isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>} PDF
            </button>
            <button onClick={() => exportUtils.print('middle-term-area', 'landscape')} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Printer size={18}/> طباعة</button>
        </div>
      </div>

      <div id="middle-term-area" className="bg-white p-10 rounded border-2 border-black overflow-x-auto min-w-max text-black font-sans" dir="rtl">
          <div className="text-center mb-8 border-b-2 border-black pb-4">
              <h1 className="text-3xl font-black mb-1">{schoolInfo.schoolName}</h1>
              <h2 className="text-2xl font-bold underline underline-offset-8 text-black">إحصاء بنتيجة نصف العام للعام الدراسي {schoolInfo.academicYear}</h2>
              {selectedGrade !== 'all_prep' && <h3 className="text-xl font-bold mt-2 text-black">{GRADE_LABELS[selectedGrade as GradeLevel]}</h3>}
          </div>

          <table id="middle-term-table" className="w-full text-center border-collapse border-2 border-black font-bold text-[13px]">
              <thead>
                  <tr className="bg-gray-100 h-14">
                      <th rowSpan={2} className="border-2 border-black p-2 bg-gray-200 w-[150px]">الصف</th>
                      <th colSpan={3} className="border-2 border-black p-1 bg-gray-50">مقيد</th>
                      <th colSpan={3} className="border-2 border-black p-1">حاضر</th>
                      <th colSpan={3} className="border-2 border-black p-1">غائب</th>
                      <th colSpan={3} className="border-2 border-black p-1 text-emerald-800">من ٦٥ فأكثر</th>
                      <th colSpan={3} className="border-2 border-black p-1 text-blue-700">من ٥٠ إلى أقل من ٦٥</th>
                      <th colSpan={3} className="border-2 border-black p-1 text-red-700">أقل من ٥٠ (راسب)</th>
                      <th rowSpan={2} className="border-2 border-black p-2 w-[100px] bg-gray-200">النسبة %</th>
                  </tr>
                  <tr className="bg-white text-[10px]">
                      {Array.from({length: 6}).map((_, i) => (
                          <React.Fragment key={i}>
                              <th className="border-2 border-black p-1">بنين</th><th className="border-2 border-black p-1">بنات</th><th className="border-2 border-black p-1 bg-gray-50">جملة</th>
                          </React.Fragment>
                      ))}
                  </tr>
              </thead>
              <tbody>
                  {statsData.map((row, idx) => (
                      <tr key={idx} className="h-16 text-[15px] hover:bg-gray-50 transition-colors">
                          <td className="border-2 border-black bg-gray-50 font-black">{row.label}</td>
                          <td className="border-2 border-black">{row.registered.boys}</td><td className="border-2 border-black">{row.registered.girls}</td><td className="border-2 border-black bg-gray-100">{row.registered.total}</td>
                          <td className="border-2 border-black">{row.present.boys}</td><td className="border-2 border-black">{row.present.girls}</td><td className="border-2 border-black bg-gray-50">{row.present.total}</td>
                          <td className="border-2 border-black text-red-600">{row.absent.boys}</td><td className="border-2 border-black text-red-600">{row.absent.girls}</td><td className="border-2 border-black bg-red-50 text-red-700">{row.absent.total}</td>
                          <td className="border-2 border-black text-emerald-700">{row.from65AndAbove.boys}</td><td className="border-2 border-black text-emerald-700">{row.from65AndAbove.girls}</td><td className="border-2 border-black bg-emerald-50 text-emerald-800 font-black">{row.from65AndAbove.total}</td>
                          <td className="border-2 border-black text-blue-700">{row.from50To65.boys}</td><td className="border-2 border-black text-blue-700">{row.from50To65.girls}</td><td className="border-2 border-black bg-blue-50 text-blue-800 font-black">{row.from50To65.total}</td>
                          <td className="border-2 border-black text-red-600">{row.lessThan50.boys}</td><td className="border-2 border-black text-red-600">{row.lessThan50.girls}</td><td className="border-2 border-black bg-red-50 text-red-700 font-black">{row.lessThan50.total}</td>
                          <td className="border-2 border-black font-black bg-white text-lg">%{row.percentage.toFixed(1)}</td>
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
export default MiddleTermOfficialStats;
