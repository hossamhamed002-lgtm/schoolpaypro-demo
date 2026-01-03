
import React, { useState, useMemo } from 'react';
import { Printer, FileDown, ArrowRight, Loader2, FileSpreadsheet } from 'lucide-react';
import { Student, Subject, GradesDatabase, GradeLevel, GRADE_LABELS } from '../examControl.types';
import { db } from '../services/db';
import { exportUtils } from '../services/exportUtils';

interface GeneralStatisticsProps {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
  onBack: () => void;
}

type StatCategory = { boys: number; girls: number; total: number };
type GradeStatRow = {
  label: string;
  registered: StatCategory;
  present: StatCategory;
  absent: StatCategory;
  success: StatCategory;
  secondRole: StatCategory;
  totalPercentage: number;
};

const GeneralStatistics: React.FC<GeneralStatisticsProps> = ({ students, subjects, grades, onBack }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | 'all'>('all');
  const [selectedTerm, setSelectedTerm] = useState<'term1' | 'term2' | 'annual'>('annual');
  const schoolInfo = db.getSchoolInfo();
  const certConfig = db.getCertConfig();
  const [isExporting, setIsExporting] = useState(false);

  const statsData = useMemo(() => {
    const gradesList = selectedGrade === 'all' ? (Object.keys(GRADE_LABELS) as GradeLevel[]) : [selectedGrade];
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;

    return gradesList.map(g => {
      const targetStudents = students.filter(s => s.gradeLevel === g);
      const row: GradeStatRow = {
        label: GRADE_LABELS[g],
        registered: { boys: 0, girls: 0, total: 0 },
        present: { boys: 0, girls: 0, total: 0 },
        absent: { boys: 0, girls: 0, total: 0 },
        success: { boys: 0, girls: 0, total: 0 },
        secondRole: { boys: 0, girls: 0, total: 0 },
        totalPercentage: 0
      };

      targetStudents.forEach(st => {
        const isBoy = st.gender === 'ذكر';
        const stGrades = grades[st.id] || {};
        
        row.registered.total++;
        if (isBoy) row.registered.boys++; else row.registered.girls++;

        let isAbsentAll = true;
        let hasFail = false;
        const relevantSubjects = subjects.filter(s => s.gradeLevels?.includes(g));

        relevantSubjects.forEach(sub => {
          const rec = stGrades[sub.id];
          const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
          
          if (selectedTerm === 'annual') {
            if (rec?.term1?.exam !== -1 || rec?.term2?.exam !== -1) isAbsentAll = false;
            const t1 = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
            const t2 = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
            const avg = (t1 + t2) / 2;
            if (sub.isBasic && (avg < sub.maxScore * PASS_THRESHOLD || (sub.examScore > 0 && safeVal(rec?.term2?.exam) < sub.examScore * EXAM_THRESHOLD))) hasFail = true;
          } else {
            const d = selectedTerm === 'term1' ? rec?.term1 : rec?.term2;
            if (d?.exam !== -1) isAbsentAll = false;
            const total = safeVal(d?.work) + safeVal(d?.practical) + safeVal(d?.exam);
            if (sub.isBasic && (total < sub.maxScore * PASS_THRESHOLD || (sub.examScore > 0 && safeVal(d?.exam) < sub.examScore * EXAM_THRESHOLD))) hasFail = true;
          }
        });

        if (!isAbsentAll) {
          row.present.total++;
          if (isBoy) row.present.boys++; else row.present.girls++;
          
          if (!hasFail) {
            row.success.total++;
            if (isBoy) row.success.boys++; else row.success.girls++;
          } else {
            row.secondRole.total++;
            if (isBoy) row.secondRole.boys++; else row.secondRole.girls++;
          }
        } else {
          row.absent.total++;
          if (isBoy) row.absent.boys++; else row.absent.girls++;
          row.secondRole.total++;
          if (isBoy) row.secondRole.boys++; else row.secondRole.girls++;
        }
      });

      row.totalPercentage = row.present.total > 0 ? (row.success.total / row.present.total) * 100 : 0;
      return row;
    });
  }, [students, subjects, grades, selectedGrade, selectedTerm, certConfig]);

  const handleExportPDF = () => {
    setIsExporting(true);
    exportUtils.exportToPDF('stats-print-area', 'الإحصاء_العام_الرسمي', 'landscape').then(() => setIsExporting(false));
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ArrowRight size={20} /></button>
          <h2 className="text-xl font-bold text-gray-800">الإحصاء العام (النموذج المعتمد)</h2>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value as any)} className="border rounded-lg px-3 py-1.5 text-sm bg-gray-50 font-bold text-blue-700 outline-none">
            <option value="all">كل الصفوف</option>
            {(Object.keys(GRADE_LABELS) as GradeLevel[]).map(g => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
          </select>
          <div className="flex bg-blue-50 p-1 rounded-lg border border-blue-100">
            {['term1', 'term2', 'annual'].map((t: any) => (
              <button key={t} onClick={() => setSelectedTerm(t)} className={`px-4 py-1.5 text-xs font-bold rounded transition ${selectedTerm === t ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-400'}`}>
                {t === 'annual' ? 'متوسط العام' : t === 'term1' ? 'ترم 1' : 'ترم 2'}
              </button>
            ))}
          </div>
          <button onClick={() => exportUtils.exportTableToExcel('general-stats-table-official', 'إحصاء_عام_رسمي')} className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg border border-emerald-200 font-bold flex items-center gap-2"><FileSpreadsheet size={18} /> Excel</button>
          <button onClick={handleExportPDF} disabled={isExporting} className="bg-red-50 text-red-700 px-3 py-2 rounded-lg border border-red-200 font-bold flex items-center gap-2">{isExporting ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />} PDF</button>
          <button onClick={() => exportUtils.print('stats-print-area', 'landscape')} className="bg-gray-800 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-2"><Printer size={18} /> طباعة</button>
        </div>
      </div>

      <div id="stats-print-area" className="bg-white p-8 rounded-2xl border-2 border-black text-black font-sans" dir="rtl">
        <div className="text-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-black mb-1">{schoolInfo.schoolName}</h1>
          <h2 className="text-2xl font-bold underline underline-offset-8">إحصاء النتيجة العام (بنين / بنات / جملة)</h2>
          <p className="text-md mt-4 font-bold">للعام الدراسي {schoolInfo.academicYear}</p>
        </div>

        <table id="general-stats-table-official" className="w-full text-center border-collapse border-2 border-black font-bold text-[13px]">
          <thead>
            <tr className="bg-gray-100 h-14">
              <th rowSpan={2} className="border-2 border-black bg-gray-200 w-[180px] text-lg">الصف الدراسي</th>
              <th colSpan={3} className="border-2 border-black bg-yellow-50 py-2">مقيدون</th>
              <th colSpan={3} className="border-2 border-black bg-blue-50 py-2">حاضرون</th>
              <th colSpan={3} className="border-2 border-black bg-gray-50 py-2">غائبون</th>
              <th colSpan={3} className="border-2 border-black bg-green-50 py-2">ناجحون</th>
              <th colSpan={3} className="border-2 border-black bg-red-50 py-2">دور ثان (راسب)</th>
              <th rowSpan={2} className="border-2 border-black bg-indigo-50 py-2 w-32">النسبة المئوية %</th>
            </tr>
            <tr className="bg-white text-[11px] h-10">
              {[...Array(5)].map((_, i) => (
                <React.Fragment key={i}>
                  <th className="border-2 border-black w-12">بنون</th>
                  <th className="border-2 border-black w-12">بنات</th>
                  <th className="border-2 border-black w-14 bg-gray-100">جملة</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {statsData.map((row, idx) => (
              <tr key={idx} className="h-14 hover:bg-gray-50 transition-colors">
                <td className="border-2 border-black bg-gray-100 text-right pr-4 font-black text-sm">{row.label}</td>
                <td className="border-2 border-black">{row.registered.boys}</td>
                <td className="border-2 border-black">{row.registered.girls}</td>
                <td className="border-2 border-black bg-yellow-50/30 font-black">{row.registered.total}</td>
                <td className="border-2 border-black">{row.present.boys}</td>
                <td className="border-2 border-black">{row.present.girls}</td>
                <td className="border-2 border-black bg-blue-50/30 font-black">{row.present.total}</td>
                <td className="border-2 border-black text-red-600">{row.absent.boys}</td>
                <td className="border-2 border-black text-red-600">{row.absent.girls}</td>
                <td className="border-2 border-black bg-gray-100/50 text-red-700 font-black">{row.absent.total}</td>
                <td className="border-2 border-black text-emerald-700">{row.success.boys}</td>
                <td className="border-2 border-black text-emerald-700">{row.success.girls}</td>
                <td className="border-2 border-black bg-green-50 font-black text-emerald-800">{row.success.total}</td>
                <td className="border-2 border-black text-red-600">{row.secondRole.boys}</td>
                <td className="border-2 border-black text-red-600">{row.secondRole.girls}</td>
                <td className="border-2 border-black bg-red-50 font-black text-red-700">{row.secondRole.total}</td>
                <td className="border-2 border-black bg-indigo-50 font-black text-xl text-indigo-900">%{row.totalPercentage.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default GeneralStatistics;
