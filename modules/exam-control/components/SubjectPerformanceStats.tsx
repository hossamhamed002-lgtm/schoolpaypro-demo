
import React, { useState, useMemo } from 'react';
import { ArrowRight, BookOpen, Printer, FileDown, Loader2, FileSpreadsheet } from 'lucide-react';
import { Student, Subject, GradesDatabase, GradeLevel, GRADE_LABELS } from '../examControl.types';
import { db } from '../services/db';
import { exportUtils } from '../services/exportUtils';

interface Props {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
  onBack: () => void;
}

const SubjectPerformanceStats: React.FC<Props> = ({ students, subjects, grades, onBack }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('p4');
  const [selectedTerm, setSelectedTerm] = useState<'term1' | 'term2'>('term1');
  const [isExporting, setIsExporting] = useState(false);
  const schoolInfo = db.getSchoolInfo();

  const stats = useMemo(() => {
    const gradeStudents = students.filter(s => s.gradeLevel === selectedGrade);
    const gradeSubjects = subjects.filter(sub => sub.gradeLevels?.includes(selectedGrade));
    const certConfig = db.getCertConfig();
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;

    return gradeSubjects.map(sub => {
      let registered = gradeStudents.length;
      let present = 0;
      let absent = 0;
      let success = 0;
      let fail = 0;

      gradeStudents.forEach(st => {
        const rec = grades[st.id]?.[sub.id];
        const termData = selectedTerm === 'term1' ? rec?.term1 : rec?.term2;
        const examVal = termData?.exam;
        
        if (examVal === -1) {
          absent++;
        } else {
          present++;
          const score = (termData?.work || 0) + (termData?.practical || 0) + (termData?.exam || 0);
          const isPassed = sub.examScore > 0 
            ? (score >= sub.maxScore * PASS_THRESHOLD && (examVal || 0) >= sub.examScore * EXAM_THRESHOLD)
            : (score >= sub.maxScore * PASS_THRESHOLD);
          
          if (isPassed) success++; else fail++;
        }
      });

      return {
        subject: sub.name,
        registered, present, absent, success, fail,
        percent: present > 0 ? (success / present) * 100 : 0
      };
    });
  }, [students, subjects, grades, selectedGrade, selectedTerm]);

  const handleExportPDF = () => {
    setIsExporting(true);
    exportUtils.exportToPDF('subject-stats-area', `إحصاء_المواد_${GRADE_LABELS[selectedGrade]}`, 'landscape').then(() => setIsExporting(false));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ArrowRight size={20} /></button>
          <h2 className="text-xl font-bold text-gray-800">إحصاء تحليلي للمواد</h2>
        </div>
        <div className="flex gap-2">
          <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value as GradeLevel)} className="border rounded-lg px-3 py-1.5 text-sm font-bold">{(Object.keys(GRADE_LABELS) as GradeLevel[]).map(g => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}</select>
          <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value as any)} className="border rounded-lg px-3 py-1.5 text-sm font-bold"><option value="term1">الترم الأول</option><option value="term2">الترم الثاني</option></select>
          <button onClick={() => exportUtils.exportTableToExcel('subject-stats-table', `إحصاء_تحليلي_${GRADE_LABELS[selectedGrade]}`)} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 font-bold flex items-center gap-2"><FileSpreadsheet size={18}/> Excel</button>
          <button onClick={handleExportPDF} disabled={isExporting} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg border border-red-200 font-bold flex items-center gap-2">{isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>} PDF</button>
          <button onClick={() => exportUtils.print('subject-stats-area', 'landscape')} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Printer size={18}/> طباعة</button>
        </div>
      </div>

      <div id="subject-stats-area" className="bg-white p-8 rounded-2xl border-2 border-black overflow-hidden text-black font-sans" dir="rtl">
          <div className="text-center mb-8 border-b-2 border-black pb-4">
              <h1 className="text-2xl font-black mb-1">{schoolInfo.schoolName}</h1>
              <h2 className="text-xl font-bold underline underline-offset-8">إحصاء تحليلي لنتائج المواد الدراسية</h2>
              <p className="text-md mt-2 font-bold">{GRADE_LABELS[selectedGrade]} - {selectedTerm === 'term1' ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثاني'}</p>
          </div>
          <table id="subject-stats-table" className="w-full text-center border-collapse border-2 border-black font-bold text-[14px]">
              <thead className="bg-gray-100">
                  <tr className="h-12">
                      <th className="border-2 border-black p-2 w-12">م</th>
                      <th className="border-2 border-black p-2 text-right">المادة</th>
                      <th className="border-2 border-black p-2">المقيد</th>
                      <th className="border-2 border-black p-2">الحاضر</th>
                      <th className="border-2 border-black p-2">الغائب</th>
                      <th className="border-2 border-black p-2 bg-green-50">الناجح</th>
                      <th className="border-2 border-black p-2 bg-red-50">الراسب</th>
                      <th className="border-2 border-black p-2 bg-gray-200 font-black">النسبة %</th>
                  </tr>
              </thead>
              <tbody>
                  {stats.map((s, i) => (
                      <tr key={i} className="h-12 hover:bg-gray-50 transition-colors">
                          <td className="border-2 border-black">{i+1}</td>
                          <td className="border-2 border-black text-right px-4 font-black">{s.subject}</td>
                          <td className="border-2 border-black">{s.registered}</td>
                          <td className="border-2 border-black">{s.present}</td>
                          <td className="border-2 border-black text-red-600">{s.absent}</td>
                          <td className="border-2 border-black text-emerald-700">{s.success}</td>
                          <td className="border-2 border-black text-red-600">{s.fail}</td>
                          <td className="border-2 border-black font-black bg-white text-lg">%{s.percent.toFixed(1)}</td>
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
export default SubjectPerformanceStats;
