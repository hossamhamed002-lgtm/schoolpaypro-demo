
import React, { useState, useMemo } from 'react';
import { ArrowRight, Printer, FileDown, Loader2, LayoutGrid, Calendar } from 'lucide-react';
import { Student, Subject, GradesDatabase, GRADE_LABELS } from '../examControl.types';
import { db } from '../services/db';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface Props {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
  onBack: () => void;
}

type StatCell = { boys: number; girls: number; total: number };

interface GradeStat {
    label: string;
    registered: StatCell;
    success: StatCell;
    fail: StatCell;
    processedCount: number;
}

const Primary1And2Stats: React.FC<Props> = ({ students, subjects, grades, onBack }) => {
  const [viewMode, setViewMode] = useState<'term1' | 'yearly'>('yearly');
  const [isExporting, setIsExporting] = useState(false);
  const schoolInfo = db.getSchoolInfo();

  const stats = useMemo(() => {
    const gradesToProcess = ['p1', 'p2'] as const;
    
    return gradesToProcess.map(g => {
        const gradeStudents = students.filter(s => s.gradeLevel === g);
        const gradeSubjects = subjects.filter(s => s.gradeLevels?.includes(g) && s.isBasic);
        
        const row: GradeStat = {
            label: GRADE_LABELS[g],
            registered: { boys: 0, girls: 0, total: 0 },
            success: { boys: 0, girls: 0, total: 0 },
            fail: { boys: 0, girls: 0, total: 0 },
            processedCount: 0
        };

        gradeStudents.forEach(st => {
            const isBoy = st.gender === 'ذكر';
            row.registered.total++;
            if (isBoy) row.registered.boys++; else row.registered.girls++;

            const stGrades = grades[st.id];
            let isFailed = false;
            let hasData = false;

            if (stGrades) {
                gradeSubjects.forEach(sub => {
                    const rec = stGrades[sub.id];
                    if (!rec) return;

                    const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
                    const t1_total = safeVal(rec.term1?.work) + safeVal(rec.term1?.practical) + safeVal(rec.term1?.exam);
                    const t2_total = safeVal(rec.term2?.work) + safeVal(rec.term2?.practical) + safeVal(rec.term2?.exam);

                    if (viewMode === 'term1') {
                        if (rec.term1) hasData = true;
                        if (t1_total < sub.maxScore * 0.5) isFailed = true;
                    } else {
                        if (rec.term1 || rec.term2) hasData = true;
                        const annualAvg = (t1_total + t2_total) / 2;
                        if (annualAvg < sub.maxScore * 0.5) isFailed = true;
                    }
                });
            }

            if (hasData) {
                row.processedCount++;
                if (isFailed) {
                    row.fail.total++;
                    if (isBoy) row.fail.boys++; else row.fail.girls++;
                } else {
                    row.success.total++;
                    if (isBoy) row.success.boys++; else row.success.girls++;
                }
            }
        });

        return row;
    });
  }, [students, subjects, grades, viewMode]);

  const totals = useMemo(() => {
      const t = {
          registered: { boys: 0, girls: 0, total: 0 },
          success: { boys: 0, girls: 0, total: 0 },
          fail: { boys: 0, girls: 0, total: 0 },
          processedCount: 0
      };
      stats.forEach(s => {
          t.registered.boys += s.registered.boys; t.registered.girls += s.registered.girls; t.registered.total += s.registered.total;
          t.success.boys += s.success.boys; t.success.girls += s.success.girls; t.success.total += s.success.total;
          t.fail.boys += s.fail.boys; t.fail.girls += s.fail.girls; t.fail.total += s.fail.total;
          t.processedCount += s.processedCount;
      });
      return t;
  }, [stats]);

  const handleExportPDF = () => {
    const element = document.getElementById('p12-area');
    if (!element) return;
    setIsExporting(true);
    const fileName = viewMode === 'term1' ? 'احصاء_صفوف_اولى_نصف_عام' : 'احصاء_صفوف_اولى_اخر_عام';
    
    const opt = {
        margin: 10,
        filename: `${fileName}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          foreignObjectRendering: true,
          onclone: (doc: Document) => {
            const link = doc.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&display=swap';
            doc.head.appendChild(link);
            const style = doc.createElement('style');
            style.textContent = `
              * { font-family: 'Cairo', 'Noto Naskh Arabic', sans-serif !important; }
              html, body { direction: rtl; unicode-bidi: plaintext; }
            `;
            doc.head.appendChild(style);
          }
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const }
    };
    
    html2pdf().set(opt).from(element).save().then(() => setIsExporting(false));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ArrowRight size={20} /></button>
          <h2 className="text-xl font-bold text-gray-800">إحصاء الصفوف الأولى</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-gray-100 p-1 rounded-lg border">
                <button 
                    onClick={() => setViewMode('term1')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${viewMode === 'term1' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Calendar size={14}/> نصف العام
                </button>
                <button 
                    onClick={() => setViewMode('yearly')}
                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${viewMode === 'yearly' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <LayoutGrid size={14}/> آخر العام
                </button>
            </div>

            <div className="flex gap-2 border-r pr-3 mr-1">
                <button 
                    onClick={handleExportPDF} 
                    disabled={isExporting}
                    className="bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 font-bold flex items-center gap-2 text-sm hover:bg-gray-50 transition"
                >
                    {isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>} تصدير PDF
                </button>
                <button 
                    onClick={() => window.print()} 
                    className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm hover:bg-gray-900 transition"
                >
                    <Printer size={18}/> طباعة
                </button>
            </div>
        </div>
      </div>

      <div id="p12-area" className="bg-white p-8 rounded shadow-sm border border-gray-200 overflow-x-auto min-w-max">
          <div className="text-center mb-8 border-b-2 border-black pb-4">
              <h1 className="text-2xl font-black mb-1 text-black">{schoolInfo.schoolName}</h1>
              <h2 className="text-xl font-bold underline underline-offset-8 text-black">
                  إحصاء نتائج طلاب الصف الأول والثاني الابتدائي ({viewMode === 'term1' ? 'نصف العام' : 'آخر العام'})
              </h2>
              <p className="text-md mt-3 font-bold text-black">العام الدراسي {schoolInfo.academicYear}</p>
          </div>

          <table className="w-full text-center border-collapse border-2 border-black font-bold text-black text-sm">
              <thead>
                  <tr className="bg-gray-100 h-12">
                      <th rowSpan={2} className="border-2 border-black p-2 w-[140px]">الصف الدراسي</th>
                      <th colSpan={3} className="border-2 border-black p-1 bg-gray-50">إجمالي المقيد</th>
                      <th colSpan={3} className="border-2 border-black p-1">اجتاز (ناجح)</th>
                      <th colSpan={3} className="border-2 border-black p-1">لم يجتز (برنامج علاجي)</th>
                      <th rowSpan={2} className="border-2 border-black p-2 bg-gray-100 w-[110px]">النسبة %</th>
                  </tr>
                  <tr className="bg-white text-[11px]">
                      <th className="border-2 border-black p-1">بنين</th>
                      <th className="border-2 border-black p-1">بنات</th>
                      <th className="border-2 border-black p-1 bg-gray-100">جملة</th>
                      
                      <th className="border-2 border-black p-1">بنين</th>
                      <th className="border-2 border-black p-1">بنات</th>
                      <th className="border-2 border-black p-1 bg-gray-50">جملة</th>
                      
                      <th className="border-2 border-black p-1">بنين</th>
                      <th className="border-2 border-black p-1">بنات</th>
                      <th className="border-2 border-black p-1 bg-gray-50">جملة</th>
                  </tr>
              </thead>
              <tbody>
                  {stats.map((s, i) => (
                      <tr key={i} className="h-14 hover:bg-gray-50 transition-colors">
                          <td className="border-2 border-black p-2 font-black bg-gray-50">{s.label}</td>
                          <td className="border-2 border-black">{s.registered.boys}</td>
                          <td className="border-2 border-black">{s.registered.girls}</td>
                          <td className="border-2 border-black bg-gray-100">{s.registered.total}</td>
                          <td className="border-2 border-black">{s.success.boys}</td>
                          <td className="border-2 border-black">{s.success.girls}</td>
                          <td className="border-2 border-black bg-gray-50">{s.success.total}</td>
                          <td className="border-2 border-black">{s.fail.boys}</td>
                          <td className="border-2 border-black">{s.fail.girls}</td>
                          <td className="border-2 border-black bg-gray-50">{s.fail.total}</td>
                          <td className="border-2 border-black font-black text-lg bg-white">
                              {s.processedCount > 0 ? ((s.success.total / s.processedCount) * 100).toFixed(1) : '0.0'}%
                          </td>
                      </tr>
                  ))}
              </tbody>
              <tfoot>
                  <tr className="bg-gray-100 font-black h-16 text-md">
                      <td className="border-2 border-black text-center">الإجمالــــــــــــي</td>
                      <td className="border-2 border-black">{totals.registered.boys}</td>
                      <td className="border-2 border-black">{totals.registered.girls}</td>
                      <td className="border-2 border-black bg-white">{totals.registered.total}</td>
                      <td className="border-2 border-black">{totals.success.boys}</td>
                      <td className="border-2 border-black">{totals.success.girls}</td>
                      <td className="border-2 border-black bg-white">{totals.success.total}</td>
                      <td className="border-2 border-black">{totals.fail.boys}</td>
                      <td className="border-2 border-black">{totals.fail.girls}</td>
                      <td className="border-2 border-black bg-white">{totals.fail.total}</td>
                      <td className="border-2 border-black bg-white text-xl">
                          {totals.processedCount > 0 
                            ? ((totals.success.total / totals.processedCount) * 100).toFixed(1)
                            : '0.0'}%
                      </td>
                  </tr>
              </tfoot>
          </table>
      </div>
    </div>
  );
};

export default Primary1And2Stats;
