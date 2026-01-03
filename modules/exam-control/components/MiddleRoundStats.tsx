
import React, { useMemo, useState } from 'react';
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

const MiddleRoundStats: React.FC<Props> = ({ students, subjects, grades, onBack }) => {
  const [isExporting, setIsExporting] = useState(false);
  const schoolInfo = db.getSchoolInfo();

  const roundStats = useMemo(() => {
    const gradesList = ['m1', 'm2', 'm3'] as GradeLevel[];
    const certConfig = db.getCertConfig();
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;
    
    return gradesList.map(g => {
        const gradeStudents = students.filter(s => s.gradeLevel === g);
        const gradeSubjects = subjects.filter(s => s.gradeLevels?.includes(g) && s.isBasic);
        let round1_pass = 0, round2_needs = 0;
        gradeStudents.forEach(st => {
            let isFailed = false;
            gradeSubjects.forEach(sub => {
                const rec = grades[st.id]?.[sub.id], safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
                const t1 = safeVal(rec?.term1?.work)+safeVal(rec?.term1?.practical)+safeVal(rec?.term1?.exam), t2 = safeVal(rec?.term2?.work)+safeVal(rec?.term2?.practical)+safeVal(rec?.term2?.exam);
                if (rec?.term1?.exam === -1 || rec?.term2?.exam === -1 || (t1+t2)/2 < sub.maxScore * PASS_THRESHOLD || (sub.examScore > 0 && safeVal(rec?.term2?.exam) < sub.examScore * EXAM_THRESHOLD)) isFailed = true;
            });
            if (!isFailed) round1_pass++; else round2_needs++;
        });
        return { label: GRADE_LABELS[g], total: gradeStudents.length, r1_pass: round1_pass, r2_needs: round2_needs };
    });
  }, [students, subjects, grades]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border no-print">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ArrowRight size={20} /></button>
          <h2 className="text-xl font-bold text-gray-800">إحصاء الدورين (إعدادي)</h2>
        </div>
        <div className="flex gap-2">
            <button onClick={() => exportUtils.exportTableToExcel('middle-round-table', 'إحصاء_الدورين_إعدادي')} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 font-bold flex items-center gap-2"><FileSpreadsheet size={18}/> Excel</button>
            <button onClick={() => { setIsExporting(true); exportUtils.exportToPDF('middle-round-report-area', 'إحصاء_الدورين_إعدادي').then(() => setIsExporting(false)); }} className="bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200 font-bold flex items-center gap-2">{isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>} PDF</button>
            <button onClick={() => exportUtils.print('middle-round-report-area')} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Printer size={18}/> طباعة</button>
        </div>
      </div>
      <div id="middle-round-report-area" className="bg-white p-12 rounded border-2 border-black text-black font-sans" dir="rtl">
          <div className="text-center mb-10 border-b-2 border-black pb-4">
              <h1 className="text-2xl font-black mb-1">{schoolInfo.schoolName}</h1>
              <h2 className="text-xl font-bold underline">موقف الدورين الأول والثاني (المرحلة الإعدادية)</h2>
              <p className="mt-2">العام الدراسي {schoolInfo.academicYear}</p>
          </div>
          <table id="middle-round-table" className="w-full text-center border-collapse border-2 border-black font-bold">
              <thead className="bg-gray-100">
                  <tr className="h-12">
                      <th className="border-2 border-black p-3">الصف الدراسي</th>
                      <th className="border-2 border-black p-3">إجمالي المقيد</th>
                      <th className="border-2 border-black p-3 text-green-700">ناجح دور أول</th>
                      <th className="border-2 border-black p-3 text-red-600">له دور ثان</th>
                  </tr>
              </thead>
              <tbody>
                  {roundStats.map((s, i) => (
                      <tr key={i} className="h-14 hover:bg-gray-50">
                          <td className="border border-black p-2 font-black">{s.label}</td>
                          <td className="border border-black p-2 font-mono">{s.total}</td>
                          <td className="border border-black p-2 text-green-700 font-mono">{s.r1_pass}</td>
                          <td className="border border-black p-2 text-red-600 font-mono">{s.r2_needs}</td>
                      </tr>
                  ))}
              </tbody>
          </table>
          <div className="mt-20 flex justify-between items-end px-4 font-black text-[13px] text-black">
              <div className="text-center w-44"><p className="mb-10">مسئول الحاسب</p><p className="border-t border-black pt-1">{schoolInfo.itSpecialist || '.................'}</p></div>
              <div className="text-center w-44"><p className="mb-10">رئيس الكنترول</p><p className="border-t border-black pt-1">{schoolInfo.controlHead || '.................'}</p></div>
              <div className="text-center w-44"><p className="mb-10">وكيل المدرسة</p><p className="border-t border-black pt-1">{schoolInfo.agentName || '.................'}</p></div>
              <div className="text-center w-44"><p className="mb-10">المدير التنفيذى</p><p className="border-t border-black pt-1">{schoolInfo.managerName || '.................'}</p></div>
          </div>
      </div>
    </div>
  );
};
export default MiddleRoundStats;
