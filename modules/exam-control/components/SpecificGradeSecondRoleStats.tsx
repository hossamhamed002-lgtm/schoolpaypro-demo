
import React, { useState, useMemo } from 'react';
import { ArrowRight, ClipboardCheck, Printer, FileDown, Loader2, FileSpreadsheet } from 'lucide-react';
import { Student, Subject, GradesDatabase, GradeLevel, GRADE_LABELS } from '../examControl.types';
import { db } from '../services/db';
import { exportUtils } from '../services/exportUtils';

interface Props {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
  onBack: () => void;
}

const SpecificGradeSecondRoleStats: React.FC<Props> = ({ students, subjects, grades, onBack }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('p4');
  const [isExporting, setIsExporting] = useState(false);
  const schoolInfo = db.getSchoolInfo();

  const failReport = useMemo(() => {
    const gradeStudents = students.filter(s => s.gradeLevel === selectedGrade);
    const gradeSubjects = subjects.filter(sub => sub.gradeLevels?.includes(selectedGrade) && sub.isBasic);
    const certConfig = db.getCertConfig();
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;

    const data = gradeSubjects.map(sub => {
      let count = 0;
      gradeStudents.forEach(st => {
        const rec = grades[st.id]?.[sub.id], safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
        const t1 = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
        const t2 = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
        const annualAvg = (t1 + t2) / 2;
        if (rec?.term1?.exam === -1 || rec?.term2?.exam === -1 || annualAvg < sub.maxScore * PASS_THRESHOLD || safeVal(rec?.term2?.exam) < sub.examScore * EXAM_THRESHOLD) count++;
      });
      return { name: sub.name, count };
    });
    return { grade: GRADE_LABELS[selectedGrade], totalStudents: gradeStudents.length, subjectsData: data };
  }, [students, subjects, grades, selectedGrade]);

  const handleExportPDF = () => {
    setIsExporting(true);
    exportUtils.exportToPDF('specific-fail-report-container', `إحصاء_دور_ثاني_${GRADE_LABELS[selectedGrade]}`).then(() => setIsExporting(false));
  };

  const handleExportExcel = () => {
      const flatData = failReport.subjectsData.map(s => ({ "المادة": s.name, "عدد الراسبين": s.count }));
      exportUtils.exportDataToExcel(flatData, `إحصاء_مواد_الدور_الثاني_${GRADE_LABELS[selectedGrade]}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ArrowRight size={20} /></button>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-gray-800">إحصاء مواد الدور الثاني (صف محدد)</h2>
            <p className="text-xs text-gray-400 font-bold">عرض عددي لعدد الطلاب الراسبين في كل مادة</p>
          </div>
        </div>
        <div className="flex gap-2">
          <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value as GradeLevel)} className="border rounded-lg px-3 py-1.5 text-sm font-bold bg-gray-50 text-blue-700 outline-none">{(Object.keys(GRADE_LABELS) as GradeLevel[]).map(g => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}</select>
          <button onClick={handleExportExcel} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 font-bold flex items-center gap-2 transition hover:bg-emerald-100"><FileSpreadsheet size={18}/> Excel</button>
          <button onClick={handleExportPDF} disabled={isExporting} className="bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200 font-bold flex items-center gap-2 transition hover:bg-red-100">
              {isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>} PDF
          </button>
          <button onClick={() => exportUtils.print('specific-fail-report-container')} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition hover:bg-gray-900 shadow-md"><Printer size={18}/> طباعة</button>
        </div>
      </div>

      <div id="specific-fail-report-container" className="bg-white p-12 rounded border-2 border-black text-black font-sans shadow-none" dir="rtl">
          <div className="flex justify-between items-start mb-8 border-b-4 border-double border-black pb-4">
              <div className="text-right space-y-1">
                  <p className="font-bold text-lg">{schoolInfo.educationalAdministration}</p>
                  <p className="font-bold text-lg">{schoolInfo.schoolName}</p>
              </div>
              <div className="text-center flex-1">
                  <h2 className="text-2xl font-black underline underline-offset-8 mb-4">إحصاء عددي بمواد الدور الثاني</h2>
                  <h3 className="text-xl font-bold bg-gray-100 inline-block px-6 py-1 rounded-full border border-black">{failReport.grade}</h3>
                  <p className="text-md font-bold mt-4">إجمالي المقيد بالصف: <span className="text-xl font-black">{failReport.totalStudents}</span> طالب</p>
              </div>
              <div className="w-24 text-left">
                  {schoolInfo.logo && <img src={schoolInfo.logo} className="h-20 w-20 object-contain mx-auto" alt="logo" />}
              </div>
          </div>

          <table className="w-full max-w-2xl mx-auto text-center border-collapse border-4 border-black font-bold mb-12">
              <thead>
                  <tr className="bg-gray-200 h-14 text-lg">
                      <th className="border-4 border-black p-2 w-20">م</th>
                      <th className="border-4 border-black p-2 text-right pr-6">المادة الدراسية</th>
                      <th className="border-4 border-black p-2 w-48">عدد الطلاب</th>
                  </tr>
              </thead>
              <tbody>
                  {failReport.subjectsData.map((s, i) => (
                      <tr key={i} className="h-14 text-xl hover:bg-gray-50 transition-colors">
                          <td className="border-4 border-black bg-gray-50">{i + 1}</td>
                          <td className="border-4 border-black text-right pr-6">{s.name}</td>
                          <td className={`border-4 border-black font-black ${s.count > 0 ? 'text-red-600 bg-red-50/30' : 'text-emerald-700'}`}>
                              {s.count}
                          </td>
                      </tr>
                  ))}
              </tbody>
              <tfoot>
                  <tr className="bg-gray-100 h-16 text-xl font-black">
                      <td colSpan={2} className="border-4 border-black text-left pl-10">إجمالي مواد الرسوب المسجلة</td>
                      <td className="border-4 border-black bg-white">
                          {failReport.subjectsData.reduce((acc, curr) => acc + curr.count, 0)}
                      </td>
                  </tr>
              </tfoot>
          </table>

          <div className="mt-12 flex justify-between items-end px-4 font-black text-[15px]">
              <div className="text-center w-48"><p className="mb-14">مسئول الحاسب</p><p className="border-t-2 border-black pt-1">{schoolInfo.itSpecialist || '.................'}</p></div>
              <div className="text-center w-48"><p className="mb-14">رئيس الكنترول</p><p className="border-t-2 border-black pt-1">{schoolInfo.controlHead || '.................'}</p></div>
              <div className="text-center w-48"><p className="mb-14">وكيل المدرسة</p><p className="border-t-2 border-black pt-1">{schoolInfo.agentName || '.................'}</p></div>
              <div className="text-center w-48"><p className="mb-14">المدير التنفيذى</p><p className="border-t-2 border-black pt-1">{schoolInfo.managerName || '.................'}</p></div>
          </div>

          <div className="mt-16 pt-4 border-t border-dashed border-gray-300 text-[10px] text-gray-400 font-mono tracking-widest text-left opacity-60 uppercase">
             - Numerical Subject Report
          </div>
      </div>
    </div>
  );
};
export default SpecificGradeSecondRoleStats;
