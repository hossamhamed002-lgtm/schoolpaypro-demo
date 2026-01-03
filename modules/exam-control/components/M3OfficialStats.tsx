
import React, { useMemo, useState } from 'react';
import { ArrowRight, Printer, FileDown, Loader2, Star, Calendar, LayoutGrid, ChevronLeft, ClipboardList, FileSpreadsheet } from 'lucide-react';
import { Student, Subject, GradesDatabase, SchoolInfo } from '../examControl.types';
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
    registered: StatCell;
    absent: StatCell;
    present: StatCell;
    lessThan50: StatCell;
    from50To75: StatCell;
    from75AndAbove: StatCell;
    percentage: number;
}
interface CombinedStatRow {
    registered: StatCell;
    present: StatCell;
    passedR1: StatCell;
    passedR2: StatCell;
    totalPassed: StatCell;
    failed: StatCell;
    percentage: number;
}

const M3OfficialStats: React.FC<Props> = ({ students, subjects, grades, onBack }) => {
  const [view, setView] = useState<'menu' | 'report'>('menu');
  const [selectedTerm, setSelectedTerm] = useState<'term1' | 'annual' | 'combined'>('annual');
  const [isExporting, setIsExporting] = useState(false);
  
  const schoolInfo = db.getSchoolInfo();
  const certConfig = db.getCertConfig();

  const stats = useMemo(() => {
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;

    const row: GradeStatRow = {
        registered: { boys: 0, girls: 0, total: 0 }, absent: { boys: 0, girls: 0, total: 0 },
        present: { boys: 0, girls: 0, total: 0 }, lessThan50: { boys: 0, girls: 0, total: 0 },
        from50To75: { boys: 0, girls: 0, total: 0 }, from75AndAbove: { boys: 0, girls: 0, total: 0 }, percentage: 0
    };

    const combinedRow: CombinedStatRow = {
        registered: { boys: 0, girls: 0, total: 0 }, present: { boys: 0, girls: 0, total: 0 },
        passedR1: { boys: 0, girls: 0, total: 0 }, passedR2: { boys: 0, girls: 0, total: 0 },
        totalPassed: { boys: 0, girls: 0, total: 0 }, failed: { boys: 0, girls: 0, total: 0 }, percentage: 0
    };

    const m3Students = students.filter(s => s.gradeLevel === 'm3');
    const m3Subjects = subjects.filter(s => s.gradeLevels?.includes('m3') && s.isAddedToTotal);
    const m3AllBasic = subjects.filter(s => s.gradeLevels?.includes('m3') && s.isBasic);
    const maxGrandTotal = m3Subjects.reduce((acc, sub) => acc + sub.maxScore, 0);

    m3Students.forEach(student => {
        const isBoy = student.gender === 'ذكر';
        const stGrades = grades[student.id] || {};
        
        if (selectedTerm === 'combined') {
            combinedRow.registered.total++;
            if (isBoy) combinedRow.registered.boys++; else combinedRow.registered.girls++;
            let attendedAny = false, failedR1 = false, passedR2 = false, attendedR2 = false;

            m3AllBasic.forEach(sub => {
                const rec = stGrades[sub.id];
                const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
                const t1 = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
                const t2 = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
                const annualAvg = (t1 + t2) / 2;
                if (rec?.term1?.exam !== -1 || rec?.term2?.exam !== -1) attendedAny = true;
                if (sub.examScore > 0 && (rec?.term1?.exam === -1 || rec?.term2?.exam === -1)) failedR1 = true;
                else if (safeVal(rec?.term2?.exam) < sub.examScore * EXAM_THRESHOLD || annualAvg < sub.maxScore * PASS_THRESHOLD) failedR1 = true;
            });

            if (failedR1) {
                let hasAnyFailInR2 = false;
                m3AllBasic.forEach(sub => {
                    const rec = stGrades[sub.id];
                    if (rec?.secondRole) { attendedR2 = true; if (rec.secondRole.exam === -1 || rec.secondRole.exam < sub.maxScore * 0.5) hasAnyFailInR2 = true; }
                    else hasAnyFailInR2 = true;
                });
                if (attendedR2 && !hasAnyFailInR2) passedR2 = true;
            }

            if (attendedAny) {
                combinedRow.present.total++; if (isBoy) combinedRow.present.boys++; else combinedRow.present.girls++;
                if (!failedR1) {
                    combinedRow.passedR1.total++; if (isBoy) combinedRow.passedR1.boys++; else combinedRow.passedR1.girls++;
                    combinedRow.totalPassed.total++; if (isBoy) combinedRow.totalPassed.boys++; else combinedRow.totalPassed.girls++;
                } else if (passedR2) {
                    combinedRow.passedR2.total++; if (isBoy) combinedRow.passedR2.boys++; else combinedRow.passedR2.girls++;
                    combinedRow.totalPassed.total++; if (isBoy) combinedRow.totalPassed.boys++; else combinedRow.totalPassed.girls++;
                } else {
                    combinedRow.failed.total++; if (isBoy) combinedRow.failed.boys++; else combinedRow.failed.girls++;
                }
            }
        } else {
            row.registered.total++; if (isBoy) row.registered.boys++; else row.registered.girls++;
            let isAbsent = false, totalScore = 0;
            m3Subjects.forEach(sub => {
                const rec = stGrades[sub.id];
                const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
                if (selectedTerm === 'term1') {
                    if (rec?.term1?.exam === -1) isAbsent = true;
                    totalScore += safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
                } else {
                    if (rec?.term1?.exam === -1 || rec?.term2?.exam === -1) isAbsent = true;
                    totalScore += ((safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam)) + (safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam))) / 2;
                }
            });

            if (isAbsent) {
                row.absent.total++; if (isBoy) row.absent.boys++; else row.absent.girls++;
            } else {
                row.present.total++; if (isBoy) row.present.boys++; else row.present.girls++;
                const percent = maxGrandTotal > 0 ? (totalScore / maxGrandTotal) * 100 : 0;
                if (percent < 50) { row.lessThan50.total++; if (isBoy) row.lessThan50.boys++; else row.lessThan50.girls++; }
                else if (percent < 75) { row.from50To75.total++; if (isBoy) row.from50To75.boys++; else row.from50To75.girls++; }
                else { row.from75AndAbove.total++; if (isBoy) row.from75AndAbove.boys++; else row.from75AndAbove.girls++; }
            }
        }
    });

    if (selectedTerm === 'combined') {
        combinedRow.percentage = combinedRow.present.total > 0 ? (combinedRow.totalPassed.total / combinedRow.present.total) * 100 : 0;
        return combinedRow;
    } else {
        const passedCount = row.from50To75.total + row.from75AndAbove.total;
        row.percentage = row.present.total > 0 ? (passedCount / row.present.total) * 100 : 0;
        return row;
    }
  }, [students, subjects, grades, selectedTerm, certConfig]);

  const handleExportPDF = () => {
    setIsExporting(true);
    exportUtils.exportToPDF('m3-report-container', `إحصاء_الثالث_الإعدادي_${selectedTerm}`).then(() => setIsExporting(false));
  };

  const handleExportExcel = () => {
    exportUtils.exportTableToExcel('m3-report-table', `إحصاء_الثالث_الإعدادي_${selectedTerm}`);
  };

  if (view === 'menu') {
      return (
        <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ArrowRight size={20} /></button>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Star className="text-yellow-600" size={24}/> إحصاء الشهادة الإعدادية</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto pt-10">
                {['term1', 'annual', 'combined'].map((t: any) => (
                    <div key={t} onClick={() => { setSelectedTerm(t); setView('report'); }} className="group cursor-pointer bg-white p-8 rounded-3xl border-2 border-transparent hover:border-blue-500 hover:shadow-2xl transition-all duration-300 flex flex-col items-center text-center space-y-6">
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner ${t === 'term1' ? 'bg-blue-50 text-blue-600' : t === 'annual' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                            {t === 'combined' ? <ClipboardList size={40}/> : t === 'term1' ? <Calendar size={40}/> : <LayoutGrid size={40}/>}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-800 mb-2">إحصاء الصف الثالث</h3>
                            <p className="text-md font-bold text-gray-500">{t === 'term1' ? 'الفصل الدراسي الأول' : t === 'annual' ? 'الفصل الدراسي الثاني' : 'إحصاء الدورين معاً (رسمي)'}</p>
                        </div>
                        <div className="text-blue-600 opacity-0 group-hover:opacity-100 flex items-center gap-2 font-black transition-opacity text-xs">عرض الإحصاء <ChevronLeft size={16}/></div>
                    </div>
                ))}
            </div>
        </div>
      );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('menu')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"><ArrowRight size={20} /></button>
          <h2 className="text-xl font-bold">إحصاء الثالث الإعدادي - {selectedTerm === 'combined' ? 'الدورين معاً' : selectedTerm === 'term1' ? 'الفصل الأول' : 'الفصل الثاني'}</h2>
        </div>
        <div className="flex gap-2">
            <button onClick={handleExportExcel} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 font-bold flex items-center gap-2">
                <FileSpreadsheet size={18}/> Excel
            </button>
            <button onClick={handleExportPDF} disabled={isExporting} className="bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200 font-bold flex items-center gap-2">
                {isExporting ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>} PDF
            </button>
            <button onClick={() => exportUtils.print()} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                <Printer size={18}/> طباعة
            </button>
        </div>
      </div>

      <div id="m3-report-container" className="bg-white p-10 rounded border-2 border-black overflow-x-auto min-w-max text-black font-sans" dir="rtl">
          <div className="flex justify-between items-start mb-6">
              <div className="w-[30%] text-right font-black text-lg space-y-1">
                  <p>إدارة {schoolInfo.educationalAdministration}</p>
                  <p>مدرسة {schoolInfo.schoolName}</p>
              </div>
              <div className="w-[40%] text-center">
                  {schoolInfo.logo && <img src={schoolInfo.logo} alt="Logo" className="h-20 mx-auto object-contain mb-2" />}
                  <h1 className="text-xl font-black underline underline-offset-4 mb-1">
                      بيان احصائى لنتيجة الصف الثالث الإعدادى - {selectedTerm === 'combined' ? 'الدورين معاً' : selectedTerm === 'term1' ? 'الفصل الدراسى الأول' : 'الفصل الدراسى الثانى'}
                  </h1>
                  <p className="text-lg font-bold">للعام الدراسى {schoolInfo.academicYear}م</p>
              </div>
              <div className="w-[30%]"></div>
          </div>

          <table id="m3-report-table" className="w-full text-center border-collapse border-2 border-black font-bold text-[12px]">
              {selectedTerm === 'combined' ? (
                  <>
                    <thead>
                        <tr className="bg-gray-100 h-12">
                            <th rowSpan={2} className="border-2 border-black p-1">م</th>
                            <th rowSpan={2} className="border-2 border-black p-2 min-w-[150px]">المدرسة</th>
                            <th colSpan={3} className="border-2 border-black p-1">متقدمون</th>
                            <th colSpan={3} className="border-2 border-black p-1">حاضرون</th>
                            <th colSpan={3} className="border-2 border-black p-1">ناجح دور اول</th>
                            <th colSpan={3} className="border-2 border-black p-1">ناجح دور ثان</th>
                            <th colSpan={3} className="border-2 border-black p-1 bg-gray-50">جملة الناجحين</th>
                            <th colSpan={3} className="border-2 border-black p-1 text-red-700">راسب</th>
                            <th rowSpan={2} className="border-2 border-black p-1 bg-gray-200 w-20">النسبة</th>
                        </tr>
                        <tr className="bg-white text-[10px]">
                            {Array.from({length: 6}).map((_, i) => (<React.Fragment key={i}><th className="border-2 border-black p-1">بنين</th><th className="border-2 border-black p-1">بنات</th><th className="border-2 border-black p-1 bg-gray-50">جملة</th></React.Fragment>))}
                        </tr>
                    </thead>
                    <tbody>
                        {(() => { const s = stats as CombinedStatRow; return (
                            <tr className="h-16 text-[14px]">
                                <td className="border-2 border-black">١</td>
                                <td className="border-2 border-black text-right px-4 font-black">{schoolInfo.schoolName}</td>
                                <td className="border-2 border-black">{s.registered.boys}</td><td className="border-2 border-black">{s.registered.girls}</td><td className="border-2 border-black bg-gray-50">{s.registered.total}</td>
                                <td className="border-2 border-black">{s.present.boys}</td><td className="border-2 border-black">{s.present.girls}</td><td className="border-2 border-black bg-gray-50">{s.present.total}</td>
                                <td className="border-2 border-black text-emerald-600">{s.passedR1.boys}</td><td className="border-2 border-black text-emerald-600">{s.passedR1.girls}</td><td className="border-2 border-black bg-emerald-50 text-emerald-700">{s.passedR1.total}</td>
                                <td className="border-2 border-black text-blue-600">{s.passedR2.boys}</td><td className="border-2 border-black text-blue-600">{s.passedR2.girls}</td><td className="border-2 border-black bg-blue-50 text-blue-700">{s.passedR2.total}</td>
                                <td className="border-2 border-black text-blue-800">{s.totalPassed.boys}</td><td className="border-2 border-black text-blue-800">{s.totalPassed.girls}</td><td className="border-2 border-black bg-indigo-50 text-indigo-900 font-black">{s.totalPassed.total}</td>
                                <td className="border-2 border-black text-red-600">{s.failed.boys}</td><td className="border-2 border-black text-red-600">{s.failed.girls}</td><td className="border-2 border-black bg-red-50 text-red-700">{s.failed.total}</td>
                                <td className="border-2 border-black font-black bg-white text-lg">%{s.percentage.toFixed(1)}</td>
                            </tr>
                        );})()}
                    </tbody>
                  </>
              ) : (
                  <>
                    <thead>
                        <tr className="bg-gray-100 h-12">
                            <th rowSpan={2} className="border-2 border-black p-1 w-10">م</th>
                            <th rowSpan={2} className="border-2 border-black p-2 min-w-[150px]">المدرسة</th>
                            <th colSpan={3} className="border-2 border-black p-1">مقيد</th>
                            <th colSpan={3} className="border-2 border-black p-1">غائب</th>
                            <th colSpan={3} className="border-2 border-black p-1">حاضر</th>
                            <th colSpan={3} className="border-2 border-black p-1 text-red-700">أقل من ٥٠</th>
                            <th colSpan={3} className="border-2 border-black p-1 text-blue-700">من ٥٠ إلى ٧٥</th>
                            <th colSpan={3} className="border-2 border-black p-1 text-emerald-800">من ٧٥ فأكثر</th>
                            <th rowSpan={2} className="border-2 border-black p-1 bg-gray-200 w-20">النسبة</th>
                        </tr>
                        <tr className="bg-white text-[10px]">
                            {Array.from({length: 6}).map((_, i) => (<React.Fragment key={i}><th className="border-2 border-black p-1">بنين</th><th className="border-2 border-black p-1">بنات</th><th className="border-2 border-black p-1 bg-gray-50">جملة</th></React.Fragment>))}
                        </tr>
                    </thead>
                    <tbody>
                        {(() => { const s = stats as GradeStatRow; return (
                            <tr className="h-16 text-[14px]">
                                <td className="border-2 border-black">١</td>
                                <td className="border-2 border-black text-right px-4 font-black">{schoolInfo.schoolName}</td>
                                <td className="border-2 border-black">{s.registered.boys}</td><td className="border-2 border-black">{s.registered.girls}</td><td className="border-2 border-black bg-gray-50">{s.registered.total}</td>
                                <td className="border-2 border-black text-red-600">{s.absent.boys}</td><td className="border-2 border-black text-red-600">{s.absent.girls}</td><td className="border-2 border-black bg-red-50 text-red-700">{s.absent.total}</td>
                                <td className="border-2 border-black">{s.present.boys}</td><td className="border-2 border-black">{s.present.girls}</td><td className="border-2 border-black bg-gray-50">{s.present.total}</td>
                                <td className="border-2 border-black text-red-600">{s.lessThan50.boys}</td><td className="border-2 border-black text-red-600">{s.lessThan50.girls}</td><td className="border-2 border-black bg-red-50 text-red-700">{s.lessThan50.total}</td>
                                <td className="border-2 border-black text-blue-700">{s.from50To75.boys}</td><td className="border-2 border-black text-blue-700">{s.from50To75.girls}</td><td className="border-2 border-black bg-blue-50 text-blue-800">{s.from50To75.total}</td>
                                <td className="border-2 border-black text-emerald-700">{s.from75AndAbove.boys}</td><td className="border-2 border-black text-emerald-700">{s.from75AndAbove.girls}</td><td className="border-2 border-black bg-emerald-50 text-emerald-800">{s.from75AndAbove.total}</td>
                                <td className="border-2 border-black font-black bg-white text-lg">%{s.percentage.toFixed(0)}</td>
                            </tr>
                        );})()}
                    </tbody>
                  </>
              )}
          </table>

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
export default M3OfficialStats;
