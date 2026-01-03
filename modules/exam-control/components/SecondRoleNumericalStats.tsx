
import React, { useState, useMemo } from 'react';
import { ArrowRight, AlertTriangle, Printer, FileDown, Loader2, FileSpreadsheet } from 'lucide-react';
import { Student, Subject, GradesDatabase, GradeLevel, GRADE_LABELS } from '../examControl.types';
import { db } from '../services/db';
import { exportUtils } from '../services/exportUtils';

interface Props {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
  onBack: () => void;
}

const SecondRoleNumericalStats: React.FC<Props> = ({ students, subjects, grades, onBack }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | 'all'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const schoolInfo = db.getSchoolInfo();

  const failStats = useMemo(() => {
    const gradesList = selectedGrade === 'all' ? (Object.keys(GRADE_LABELS) as GradeLevel[]) : [selectedGrade];
    const certConfig = db.getCertConfig();
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;

    return gradesList.map(g => {
      const gradeStudents = students.filter(s => s.gradeLevel === g);
      const gradeSubjects = subjects.filter(sub => sub.gradeLevels?.includes(g) && sub.isBasic);
      
      const subjectFailCounts: Record<string, number> = {};
      gradeSubjects.forEach(s => subjectFailCounts[s.name] = 0);

      gradeStudents.forEach(st => {
        gradeSubjects.forEach(sub => {
          const rec = grades[st.id]?.[sub.id];
          const t1_total = (rec?.term1?.work || 0) + (rec?.term1?.practical || 0) + (rec?.term1?.exam || 0);
          const t2_total = (rec?.term2?.work || 0) + (rec?.term2?.practical || 0) + (rec?.term2?.exam || 0);
          const annualAvg = (t1_total + t2_total) / 2;
          
          const isFailed = (rec?.term1?.exam === -1 || rec?.term2?.exam === -1) ||
                           (annualAvg < sub.maxScore * PASS_THRESHOLD) ||
                           ((rec?.term2?.exam || 0) < sub.examScore * EXAM_THRESHOLD);
          
          if (isFailed) subjectFailCounts[sub.name]++;
        });
      });

      return { label: GRADE_LABELS[g], counts: subjectFailCounts, subjects: gradeSubjects.map(s => s.name) };
    });
  }, [students, subjects, grades, selectedGrade]);

  const handleExportPDF = () => {
    setIsExporting(true);
    exportUtils.exportToPDF('second-role-numerical-area', 'إحصاء_عددي_دور_ثاني').then(() => setIsExporting(false));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ArrowRight size={20} /></button>
          <h2 className="text-xl font-bold text-gray-800">إحصاء عددي بمواد الدور الثاني</h2>
        </div>
        <div className="flex gap-2">
          <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value as any)} className="border rounded-lg px-3 py-1.5 text-sm font-bold"><option value="all">كل الصفوف</option>{(Object.keys(GRADE_LABELS) as GradeLevel[]).map(g => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}</select>
          <button onClick={() => exportUtils.exportTableToExcel('second-role-table-all', 'إحصاء_عددي_الدور_الثاني')} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 font-bold flex items-center gap-2"><FileSpreadsheet size={18}/> Excel</button>
          <button onClick={handleExportPDF} disabled={isExporting} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg border border-red-200 font-bold flex items-center gap-2">
              {isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>} PDF
          </button>
          <button onClick={() => exportUtils.print()} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Printer size={18}/> طباعة</button>
        </div>
      </div>

      <div id="second-role-numerical-area" className="bg-white p-10 rounded border-2 border-black overflow-x-auto min-w-max text-black font-sans" dir="rtl">
          <div className="text-center mb-8 border-b-2 border-black pb-4">
              <h1 className="text-2xl font-black mb-1">{schoolInfo.schoolName}</h1>
              <h2 className="text-xl font-bold underline underline-offset-8">إحصاء عددي بأعداد ومواد الدور الثاني</h2>
              <p className="text-md mt-2 font-bold">بيان إجمالي للطلاب الذين لهم حق دخول الدور الثاني في كل مادة</p>
          </div>
          <div id="second-role-table-all">
              {failStats.map((fs, idx) => (
                <div key={idx} className="mb-10 break-inside-avoid">
                  <h3 className="bg-slate-800 text-white px-6 py-2 rounded-t-lg font-black text-lg w-fit">{fs.label}</h3>
                  <table className="w-full text-center border-collapse border-2 border-black">
                    <thead>
                      <tr className="bg-gray-100 font-black h-12">
                        {fs.subjects.map((sub, i) => <th key={i} className="border-2 border-black p-2">{sub}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="font-black text-2xl h-20">
                        {fs.subjects.map((sub, i) => <td key={i} className="border-2 border-black p-2 text-red-600">{fs.counts[sub] || 0}</td>)}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
          <div className="mt-12 flex justify-between items-end px-4 font-black text-[13px]">
              <div className="text-center w-44"><p className="mb-10">مسئول الحاسب</p><p className="border-t border-black pt-1">{schoolInfo.itSpecialist || '.................'}</p></div>
              <div className="text-center w-44"><p className="mb-10">رئيس الكنترول</p><p className="border-t border-black pt-1">{schoolInfo.controlHead || '.................'}</p></div>
              <div className="text-center w-44"><p className="mb-10">وكيل المدرسة</p><p className="border-t border-black pt-1">{schoolInfo.agentName || '.................'}</p></div>
              <div className="text-center w-44"><p className="mb-10">المدير التنفيذى</p><p className="border-t border-black pt-1">{schoolInfo.managerName || '.................'}</p></div>
          </div>
      </div>
    </div>
  );
};
export default SecondRoleNumericalStats;
