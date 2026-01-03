
import React, { useState, useMemo } from 'react';
import { ArrowRight, Printer, FileDown, Loader2, FileSpreadsheet, FileWarning, Search } from 'lucide-react';
import { Student, Subject, GradesDatabase, GradeLevel, GRADE_LABELS } from '../examControl.types';
import { db } from '../services/db';
import { exportUtils } from '../services/exportUtils';

interface Props {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
  onBack: () => void;
}

const SubjectFailureAnalytical: React.FC<Props> = ({ students, subjects, grades, onBack }) => {
  const [selectedTerm, setSelectedTerm] = useState<'term1' | 'term2' | 'annual'>('annual');
  const [isExporting, setIsExporting] = useState(false);
  const schoolInfo = db.getSchoolInfo();
  const certConfig = db.getCertConfig();

  // الحصول على كافة المواد الأساسية الفريدة لجميع الصفوف
  const allUniqueBasicSubjects = useMemo(() => {
    const unique = new Set<string>();
    subjects.forEach(s => {
      if (s.isBasic) unique.add(s.name);
    });
    return Array.from(unique).sort();
  }, [subjects]);

  const stats = useMemo(() => {
    const gradesList = Object.keys(GRADE_LABELS) as GradeLevel[];
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;

    return gradesList.map(g => {
      const gradeStudents = students.filter(s => s.gradeLevel === g);
      if (gradeStudents.length === 0) return null;

      const gradeSubjects = subjects.filter(sub => sub.gradeLevels?.includes(g) && sub.isBasic);
      const isRemedialGrade = g === 'p1' || g === 'p2';

      const subjectFailCounts: Record<string, number> = {};
      allUniqueBasicSubjects.forEach(name => subjectFailCounts[name] = -1); // -1 يعني المادة غير مقررة على هذا الصف

      gradeSubjects.forEach(sub => {
        let failCount = 0;
        gradeStudents.forEach(st => {
          const rec = grades[st.id]?.[sub.id];
          const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
          const isAbs = (v: any) => v === -1;

          let isFailed = false;

          if (selectedTerm === 'term1' || selectedTerm === 'term2') {
            const d = selectedTerm === 'term1' ? rec?.term1 : rec?.term2;
            const total = safeVal(d?.work) + safeVal(d?.practical) + safeVal(d?.exam);
            
            if (isRemedialGrade) {
              if (total < sub.maxScore * 0.5) isFailed = true;
            } else {
              if (sub.examScore > 0 && isAbs(d?.exam)) isFailed = true;
              else if (sub.examScore > 0 && safeVal(d?.exam) < sub.examScore * EXAM_THRESHOLD) isFailed = true;
              else if (total < sub.maxScore * PASS_THRESHOLD) isFailed = true;
            }
          } else {
            // سنوي
            const t1 = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
            const t2 = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
            const annualAvg = (t1 + t2) / 2;

            if (isRemedialGrade) {
              if (annualAvg < sub.maxScore * 0.5) isFailed = true;
            } else {
              if (sub.examScore > 0 && (isAbs(rec?.term1?.exam) || isAbs(rec?.term2?.exam))) isFailed = true;
              else {
                const t2_exam = safeVal(rec?.term2?.exam);
                const passedWritten = (sub.examScore === 0) || (t2_exam >= sub.examScore * EXAM_THRESHOLD);
                if (!passedWritten || annualAvg < sub.maxScore * PASS_THRESHOLD) isFailed = true;
              }
            }
          }

          if (isFailed) failCount++;
        });
        subjectFailCounts[sub.name] = failCount;
      });

      return { label: GRADE_LABELS[g], counts: subjectFailCounts, totalStudents: gradeStudents.length };
    }).filter(Boolean);
  }, [students, subjects, grades, selectedTerm, allUniqueBasicSubjects, certConfig]);

  const handleExportPDF = () => {
    setIsExporting(true);
    exportUtils.exportToPDF('failure-analytical-area', 'إحصاء_تحليلي_مواد_الرسوب', 'landscape').then(() => setIsExporting(false));
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ArrowRight size={20} /></button>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-gray-800">إحصاء تحليلي لمواد الرسوب والدور الثاني</h2>
            <p className="text-[10px] text-gray-400 font-bold">عرض أعداد الطلاب الذين لم يجتازوا كل مادة حسب الصف</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex bg-blue-50 p-1 rounded-lg border border-blue-100">
            {[
              { id: 'term1', label: 'الترم الأول' },
              { id: 'term2', label: 'الترم الثاني' },
              { id: 'annual', label: 'المتوسط السنوي' }
            ].map((t: any) => (
              <button 
                key={t.id} 
                onClick={() => setSelectedTerm(t.id)} 
                className={`px-4 py-1.5 text-xs font-bold rounded transition ${selectedTerm === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-400 hover:text-blue-500'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={() => exportUtils.exportTableToExcel('failure-analytical-table', 'إحصاء_تحليلي_مواد_الرسوب')} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 font-bold flex items-center gap-2"><FileSpreadsheet size={18}/> Excel</button>
          <button onClick={handleExportPDF} disabled={isExporting} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg border border-red-200 font-bold flex items-center gap-2">
              {isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>} PDF
          </button>
          <button onClick={() => exportUtils.print('failure-analytical-area', 'landscape')} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Printer size={18}/> طباعة</button>
        </div>
      </div>

      <div id="failure-analytical-area" className="bg-white p-10 rounded-2xl border-2 border-black overflow-x-auto min-w-max text-black font-sans" dir="rtl">
          <div className="text-center mb-8 border-b-2 border-black pb-4">
              <h1 className="text-3xl font-black mb-1">{schoolInfo.schoolName}</h1>
              <h2 className="text-2xl font-bold underline underline-offset-8 text-black">بيان إحصائي تحليلي بأعداد الطلاب الذين لهم حق دخول الدور الثاني</h2>
              <p className="text-md mt-6 font-bold">
                الحالة: <span className="text-blue-700">{selectedTerm === 'annual' ? 'المتوسط السنوي العام' : selectedTerm === 'term1' ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثاني'}</span>
                {" | "} العام الدراسي {schoolInfo.academicYear}
              </p>
          </div>

          <table id="failure-analytical-table" className="w-full text-center border-collapse border-2 border-black font-bold text-[13px]">
              <thead>
                  <tr className="bg-gray-100 h-14">
                      <th className="border-2 border-black p-2 bg-gray-200 w-[180px] text-lg">الصف الدراسي</th>
                      <th className="border-2 border-black p-2 bg-gray-50 w-24">إجمالي المقيد</th>
                      {allUniqueBasicSubjects.map((sub, i) => (
                          <th key={i} className="border-2 border-black p-2 min-w-[100px]">{sub}</th>
                      ))}
                  </tr>
              </thead>
              <tbody>
                  {stats.map((row: any, idx) => (
                      <tr key={idx} className="h-16 text-[15px] hover:bg-gray-50 transition-colors">
                          <td className="border-2 border-black bg-gray-50 font-black text-right pr-4">{row.label}</td>
                          <td className="border-2 border-black bg-gray-100 text-lg">{row.totalStudents}</td>
                          {allUniqueBasicSubjects.map((subName, i) => {
                              const count = row.counts[subName];
                              if (count === -1) return <td key={i} className="border-2 border-black bg-gray-200/30 text-gray-300 font-normal">-</td>;
                              return (
                                <td key={i} className={`border-2 border-black font-black text-xl ${count > 0 ? 'text-red-600 bg-red-50/30' : 'text-emerald-700'}`}>
                                    {count}
                                </td>
                              );
                          })}
                      </tr>
                  ))}
              </tbody>
          </table>

          <div className="mt-16 flex justify-between items-end px-10 font-black text-[14px]">
              <div className="text-center w-48"><p className="mb-14">مسئول الحاسب</p><p className="border-t-2 border-black pt-2">{schoolInfo.itSpecialist || '.................'}</p></div>
              <div className="text-center w-48"><p className="mb-14">رئيس الكنترول</p><p className="border-t-2 border-black pt-2">{schoolInfo.controlHead || '.................'}</p></div>
              <div className="text-center w-48"><p className="mb-14">وكيل المدرسة</p><p className="border-t-2 border-black pt-2">{schoolInfo.agentName || '.................'}</p></div>
              <div className="text-center w-48"><p className="mb-14">المدير التنفيذى</p><p className="border-t-2 border-black pt-2">{schoolInfo.managerName || '.................'}</p></div>
          </div>
          
          <div className="mt-10 pt-4 border-t border-dashed border-gray-300 text-[10px] text-gray-400 font-mono tracking-widest text-left">
              - SUBJECT FAILURE ANALYTICAL REPORT
          </div>
      </div>
    </div>
  );
};
export default SubjectFailureAnalytical;
