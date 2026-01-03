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

const HighAchievers65Stats: React.FC<Props> = ({ students, subjects, grades, onBack }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | 'all'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const schoolInfo = db.getSchoolInfo();

  const achievers = useMemo(() => {
    const gradesList = selectedGrade === 'all' ? (Object.keys(GRADE_LABELS) as GradeLevel[]) : [selectedGrade];
    
    return gradesList.map(g => {
      const gradeStudents = students.filter(s => s.gradeLevel === g);
      const basicSubjects = subjects.filter(sub => sub.gradeLevels?.includes(g) && sub.isAddedToTotal);
      const maxTotal = basicSubjects.reduce((acc, sub) => acc + sub.maxScore, 0);

      const highAchievers = gradeStudents.filter(st => {
        let total = 0;
        basicSubjects.forEach(sub => {
          const rec = grades[st.id]?.[sub.id];
          const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
          total += ((safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam)) + (safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam))) / 2;
        });
        const percent = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
        return percent >= 65;
      });

      return { label: GRADE_LABELS[g], total: gradeStudents.length, achievers: highAchievers.length, percent: gradeStudents.length > 0 ? (highAchievers.length / gradeStudents.length) * 100 : 0 };
    });
  }, [students, subjects, grades, selectedGrade]);

  const handleExportPDF = () => {
    setIsExporting(true);
    exportUtils.exportToPDF('achievers-report-container', 'إحصاء_المتميزين_65_بالمائة', 'portrait').then(() => setIsExporting(false));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><ArrowRight size={20} /></button>
          <h2 className="text-xl font-bold text-gray-800">إحصاء الطلاب الحاصلين على 65% فأكثر</h2>
        </div>
        <div className="flex gap-2">
          <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value as any)} className="border rounded-lg px-3 py-1.5 text-sm font-bold"><option value="all">كل الصفوف</option>{(Object.keys(GRADE_LABELS) as GradeLevel[]).map(g => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}</select>
          <button onClick={() => exportUtils.exportTableToExcel('achievers-table', 'إحصاء_المتميزين_65')} className="bg-emerald-50 text-emerald-700 p-2 rounded-lg border border-emerald-200"><FileSpreadsheet size={18}/></button>
          <button onClick={handleExportPDF} className="bg-red-50 text-red-700 p-2 rounded-lg border border-red-200">{isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>}</button>
          <button onClick={() => exportUtils.print('achievers-report-container')} className="bg-slate-800 text-white p-2 rounded-lg"><Printer size={18}/></button>
        </div>
      </div>

      <div id="achievers-report-container" className="bg-white p-10 rounded-2xl border-2 border-black text-black">
          <div className="text-center mb-10 border-b-2 border-black pb-6">
              <h1 className="text-3xl font-black mb-2">{schoolInfo.schoolName}</h1>
              <h2 className="text-2xl font-bold underline mb-2">إحصاء الطلاب الحاصلين على نسبة 65% فأكثر من المجموع الكلي</h2>
              <p className="text-lg">العام الدراسي {schoolInfo.academicYear}</p>
          </div>
          <table id="achievers-table" className="w-full text-center border-collapse border-2 border-black">
              <thead><tr className="bg-gray-200 text-lg"><th className="border-2 border-black p-4">الصف الدراسي</th><th className="border-2 border-black p-4">عدد الطلاب</th><th className="border-2 border-black p-4">عدد الحاصلين على 65% فأكثر</th><th className="border-2 border-black p-4 bg-gray-300">النسبة</th></tr></thead>
              <tbody className="text-lg">
                  {achievers.map((a, i) => (
                      <tr key={i} className="font-bold h-14">
                          <td className="border border-black p-2 text-right pr-6">{a.label}</td><td className="border border-black p-2">{a.total}</td><td className="border border-black p-2">{a.achievers}</td><td className="border border-black p-2 font-black">{a.percent.toFixed(1)}%</td>
                      </tr>
                  ))}
              </tbody>
              <tfoot>
                  <tr className="bg-gray-100 font-black h-16">
                      <td className="border-2 border-black p-4 text-left pl-10">الإجمالــــــــــــي:</td>
                      <td className="border-2 border-black p-4">{achievers.reduce((acc, c) => acc + c.total, 0)}</td>
                      <td className="border-2 border-black p-4">{achievers.reduce((acc, c) => acc + c.achievers, 0)}</td>
                      <td className="border-2 border-black p-4 bg-gray-200">{((achievers.reduce((acc, c) => acc + c.achievers, 0) / achievers.reduce((acc, c) => acc + c.total, 0)) * 100).toFixed(1)}%</td>
                  </tr>
              </tfoot>
          </table>
      </div>
    </div>
  );
};
export default HighAchievers65Stats;