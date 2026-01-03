
import React, { useMemo } from 'react';
import { Printer, Award } from 'lucide-react';
import { Student, Subject, GradeLevel, GRADE_LABELS, SchoolInfo, GradeDescriptor, CertificateConfig } from '../examControl.types';

interface CertificatesProps {
  students: Student[];
  subjects: Subject[];
  grades: any;
  filterGrade: GradeLevel | 'all';
  schoolInfo: SchoolInfo;
  descriptors: GradeDescriptor[];
  config: CertificateConfig;
  sheetMode: 'term1' | 'term2' | 'annual';
}

const Certificates: React.FC<CertificatesProps> = ({ 
  students, subjects, grades, filterGrade, schoolInfo, descriptors, config, sheetMode 
}) => {
  
  // المنطق الحسابي الموحد للنتائج
  const results = useMemo(() => {
    const calculated: Record<string, any> = {};
    const PASS_THRESHOLD = config.minPassingPercent / 100;
    const EXAM_THRESHOLD = config.minExamPassingPercent / 100;

    const gradeStudents = students.filter(s => filterGrade === 'all' || s.gradeLevel === filterGrade);
    
    // حساب الترتيب والنسب المئوية داخلياً أولاً (دائماً بناءً على الدرجات الخام للدقة)
    const studentPerformance = gradeStudents.map(student => {
      const stGrades = grades[student.id] || {};
      const relevantSubjects = subjects.filter(sub => sub.gradeLevels?.includes(student.gradeLevel));
      
      let t1_grand = 0, t2_grand = 0, grand_max = 0;
      let failedSubjects: string[] = [];

      relevantSubjects.forEach(sub => {
        const rec = stGrades[sub.id] || {};
        const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
        const t1_s = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
        const t2_s = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);

        if (sub.isAddedToTotal) {
           t1_grand += t1_s;
           t2_grand += t2_s;
           grand_max += sub.maxScore;
        }

        // منطق الرسوب
        let total = sheetMode === 'term1' ? t1_s : (sheetMode === 'term2' ? t2_s : (t1_s + t2_s) / 2);
        if (sub.isBasic && total < sub.maxScore * PASS_THRESHOLD) failedSubjects.push(sub.name);
      });

      const finalScore = sheetMode === 'term1' ? t1_grand : (sheetMode === 'term2' ? t2_grand : (t1_grand + t2_grand) / 2);
      const percent = grand_max > 0 ? (finalScore / grand_max) * 100 : 0;

      return { id: student.id, score: finalScore, percent, failedCount: failedSubjects.length };
    });

    const sortedByScore = [...studentPerformance].sort((a, b) => b.percent - a.percent);
    
    gradeStudents.forEach(student => {
      const perf = studentPerformance.find(p => p.id === student.id);
      const rank = sortedByScore.findIndex(p => p.id === student.id) + 1;
      
      const stGrades = grades[student.id] || {};
      const relevantSubjects = subjects.filter(sub => sub.gradeLevels?.includes(student.gradeLevel));
      const isRemedialGrade = student.gradeLevel === 'p1' || student.gradeLevel === 'p2';

      let failedSubNames: string[] = [];
      relevantSubjects.forEach(sub => {
          const rec = stGrades[sub.id] || {};
          const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
          const isAbs = (v: any) => v === -1;

          const t1_s = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
          const t2_s = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
          
          let score = sheetMode === 'term1' ? t1_s : (sheetMode === 'term2' ? t2_s : (t1_s + t2_s) / 2);
          
          let failed = false;
          if (isRemedialGrade) {
              if (score < sub.maxScore * 0.5) failed = true;
          } else {
              if (sheetMode === 'annual') {
                  const t2_exam = safeVal(rec?.term2?.exam);
                  const passedWritten = (sub.examScore === 0) || (t2_exam >= sub.examScore * EXAM_THRESHOLD);
                  if (sub.examScore > 0 && (isAbs(rec?.term1?.exam) || isAbs(rec?.term2?.exam))) failed = true;
                  else if (!passedWritten) failed = true;
                  else if (score < sub.maxScore * PASS_THRESHOLD) failed = true;
              } else {
                  const termExam = sheetMode === 'term1' ? rec?.term1?.exam : rec?.term2?.exam;
                  if (sub.examScore > 0 && isAbs(termExam)) failed = true;
                  else if (sub.examScore > 0 && safeVal(termExam) < sub.examScore * EXAM_THRESHOLD) failed = true;
                  else if (score < sub.maxScore * PASS_THRESHOLD) failed = true;
              }
          }
          if (failed && sub.isBasic) failedSubNames.push(sub.name);
      });

      calculated[student.id] = {
          status: (failedSubNames.length > 0 || (perf?.percent || 0) < config.minPassingPercent) ? (isRemedialGrade ? 'Remedial' : 'Fail') : 'Pass',
          percent: perf?.percent || 0,
          totalScore: perf?.score || 0,
          maxTotal: relevantSubjects.filter(s => s.isAddedToTotal).reduce((acc, s) => acc + s.maxScore, 0),
          rank,
          failedSubNames
      };
    });

    return calculated;
  }, [students, subjects, grades, sheetMode, config]);

  // دالة جلب التقدير واللون من الإعدادات
  const getGradeInfo = (percent: number) => {
    const sorted = [...descriptors].sort((a, b) => b.minPercent - a.minPercent);
    const found = sorted.find(d => percent >= d.minPercent);
    return found || { label: 'دون المستوى', color: '#ef4444' };
  };

  // دالة تحويل الدرجة للدرجة الفعلية (Scaling)
  const scaleScore = (rawScore: number, rawMax: number, certMax?: number) => {
    if (!config.useScaledScore || !certMax || certMax === 0) return Math.round(rawScore * 10) / 10;
    return Math.round((rawScore / rawMax) * certMax * 10) / 10;
  };

  const filteredStudents = students
    .filter(s => filterGrade === 'all' || s.gradeLevel === filterGrade)
    .sort((a, b) => (a.seatingNumber || 0) - (b.seatingNumber || 0));

  const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;

  return (
    <div className="p-6 bg-gray-100 min-h-screen no-scrollbar" dir="rtl">
      {/* Tools Header */}
      <div className="flex justify-between items-center mb-8 no-print bg-white p-5 rounded-2xl shadow-sm border border-gray-200 sticky top-0 z-50">
        <div>
            <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                <Award size={28} className="text-blue-600" /> طباعة الشهادات الرسمية
            </h3>
            <p className="text-xs text-gray-500 mt-1 font-bold">الحالة: {sheetMode === 'annual' ? 'المتوسط السنوي العام' : sheetMode === 'term1' ? 'الفصل الدراسي الأول' : 'الفصل الدراسي الثاني'}</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => window.print()} 
                className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-900 transition shadow-lg"
            >
                <Printer size={20} /> طباعة الشهادات
            </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-12 items-center">
        {filteredStudents.map(student => {
          const res = results[student.id];
          const relevantSubjects = subjects.filter(s => s.gradeLevels?.includes(student.gradeLevel));
          const basicSubjects = relevantSubjects.filter(s => s.isAddedToTotal);
          const activitySubjects = relevantSubjects.filter(s => !s.isAddedToTotal);

          return (
            <div key={student.id} className="certificate-page bg-white w-[210mm] min-h-[296mm] p-[10mm] shadow-2xl flex flex-col break-after-page border-[1px] border-gray-200 relative overflow-hidden">
              
              {/* Header */}
              <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-4 relative z-10">
                 <div className="w-1/4">
                    {config.showLogo && (config.logo || schoolInfo.logo) && (
                        <img src={config.logo || schoolInfo.logo || ''} alt="logo" className="h-20 w-20 object-contain" />
                    )}
                 </div>
                 <div className="text-center flex-1">
                    <h1 className="text-3xl font-black text-slate-900 mb-1">{config.schoolName || schoolInfo.schoolName}</h1>
                    <h2 className="text-xl font-bold text-slate-700">{config.examTitle || 'شهادة نجاح الطالب'}</h2>
                    <p className="text-sm font-bold text-slate-500 mt-1">العام الدراسي {schoolInfo.academicYear}</p>
                 </div>
                 <div className="w-1/4"></div>
              </div>

              {/* Student Identity */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-12 px-4 py-6 text-[16px] font-bold text-slate-800 mb-2">
                 <div className="flex items-center gap-2">
                    <span className="text-slate-500 whitespace-nowrap">الاسم:</span>
                    <span className="border-b-2 border-dotted border-slate-300 flex-1 pb-0.5">{student.name}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-slate-500 whitespace-nowrap">الصف:</span>
                    <span className="border-b-2 border-dotted border-slate-300 flex-1 pb-0.5">{GRADE_LABELS[student.gradeLevel]}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-slate-500 whitespace-nowrap">الفصل:</span>
                    <span className="border-b-2 border-dotted border-slate-300 flex-1 pb-0.5">{student.classroom}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-slate-500 whitespace-nowrap">رقم الجلوس:</span>
                    <span className="border-b-2 border-dotted border-slate-300 flex-1 pb-0.5 font-mono">{student.seatingNumber}</span>
                 </div>
              </div>

              {/* Result Banner */}
              <div className="mx-auto w-[85%] bg-gray-50 border-2 border-gray-100 rounded-xl p-3 text-center mb-6 shadow-sm">
                 <h3 className="text-xl font-black">
                    النتيجة النهائية: 
                    <span className={`mr-3 px-4 py-1 rounded-lg ${res.status === 'Pass' ? 'text-blue-700 bg-blue-50' : 'text-red-700 bg-red-50'}`}>
                        {res.status === 'Pass' 
                            ? (sheetMode === 'annual' ? (config.annualSuccessText || 'ناجح ومنقول للصف التالي') : (sheetMode === 'term1' ? config.term1SuccessText : config.term2SuccessText)) 
                            : (sheetMode === 'annual' ? (config.annualFailText || 'راسب (له دور ثان)') : (sheetMode === 'term1' ? config.term1FailText : config.term2FailText))}
                    </span>
                 </h3>
              </div>

              {/* Basic Subjects Table */}
              <div className="mb-4">
                 <h4 className="font-black text-sm text-blue-800 mb-2 border-r-4 border-blue-600 pr-2">بيان درجات المواد الأساسية</h4>
                 <table className="w-full border-collapse border-2 border-black text-center font-bold text-[12px]">
                    <thead className="bg-slate-100">
                        <tr>
                            <th className="border border-black p-2 w-[35%]">المادة</th>
                            <th className="border border-black p-2">العظمى</th>
                            <th className="border border-black p-2">الصغرى</th>
                            {config.showDetailedScores && (
                                <>
                                    <th className="border border-black p-2">أ.سنة</th>
                                    <th className="border border-black p-2">تحريري</th>
                                </>
                            )}
                            <th className="border border-black p-2 bg-gray-200">الدرجة</th>
                            {config.showEstimates && <th className="border border-black p-2">التقدير العام</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {basicSubjects.map(sub => {
                            const rec = grades[student.id]?.[sub.id] || {};
                            const t1_s = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
                            const t2_s = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
                            
                            const rawScore = sheetMode === 'term1' ? t1_s : (sheetMode === 'term2' ? t2_s : (t1_s + t2_s) / 2);
                            const d = sheetMode === 'term1' ? rec?.term1 : rec?.term2;
                            
                            const isFailed = res.failedSubNames.includes(sub.name);
                            const percent = (rawScore / sub.maxScore) * 100;
                            const info = getGradeInfo(percent);

                            // الدرجة المعروضة (فعلية أو خام)
                            const displayedScore = scaleScore(rawScore, sub.maxScore, sub.certificateMax);
                            const displayedMax = config.useScaledScore ? (sub.certificateMax || sub.maxScore) : sub.maxScore;
                            const displayedMin = config.useScaledScore ? Math.round((sub.minScore / sub.maxScore) * (sub.certificateMax || sub.maxScore)) : sub.minScore;

                            return (
                                <tr key={sub.id} className="h-9">
                                    <td className="border border-black pr-2 text-right">{sub.name}</td>
                                    <td className="border border-black font-mono">{displayedMax}</td>
                                    <td className="border border-black font-mono">{displayedMin}</td>
                                    {config.showDetailedScores && (
                                        <>
                                            <td className="border border-black font-mono">{scaleScore(safeVal(d?.work) + safeVal(d?.practical), sub.yearWork + (sub.practicalScore||0), (sub.certificateMax||sub.maxScore) * ((sub.yearWork+(sub.practicalScore||0))/sub.maxScore))}</td>
                                            <td className="border border-black font-mono">{scaleScore(safeVal(d?.exam), sub.examScore, (sub.certificateMax||sub.maxScore) * (sub.examScore/sub.maxScore))}</td>
                                        </>
                                    )}
                                    <td className={`border border-black font-mono font-black text-sm ${isFailed && config.showColors ? 'bg-red-600 text-white' : ''}`}>
                                        {displayedScore}
                                    </td>
                                    {config.showEstimates && (
                                        <td className="border border-black font-bold text-[10px]" style={{ color: config.showColors && !isFailed ? info.color : 'inherit', backgroundColor: isFailed && config.showColors ? '#dc2626' : 'inherit' }}>
                                            {isFailed ? 'دون المستوى' : info.label}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                        {/* Total Row */}
                        <tr className="bg-gray-100 h-10 font-black text-[14px]">
                            <td className="border border-black pr-2 text-right">المجموع الكلي</td>
                            <td className="border border-black font-mono">
                                {config.useScaledScore ? basicSubjects.reduce((acc, s) => acc + (s.certificateMax || s.maxScore), 0) : res.maxTotal}
                            </td>
                            <td className="border border-black font-mono">
                                {config.useScaledScore ? Math.round(basicSubjects.reduce((acc, s) => acc + (s.certificateMax || s.maxScore), 0) * (config.minPassingPercent/100)) : Math.round(res.maxTotal * (config.minPassingPercent/100))}
                            </td>
                            {config.showDetailedScores && <td colSpan={2} className="border border-black italic text-[10px] text-gray-500">متوسط الدرجات</td>}
                            <td className={`border border-black font-mono text-lg ${res.percent < config.minPassingPercent && config.showColors ? 'bg-red-600 text-white' : ''}`}>
                                {config.useScaledScore ? Math.round((res.percent / 100) * basicSubjects.reduce((acc, s) => acc + (s.certificateMax || s.maxScore), 0) * 10) / 10 : res.totalScore}
                            </td>
                            {config.showEstimates && (
                                <td className={`border border-black ${res.percent < config.minPassingPercent && config.showColors ? 'bg-red-600 text-white' : ''}`} style={{ color: config.showColors && res.percent >= config.minPassingPercent ? getGradeInfo(res.percent).color : 'inherit' }}>
                                    {getGradeInfo(res.percent).label}
                                </td>
                            )}
                        </tr>
                        {/* Percentage & Rank */}
                        <tr className="bg-slate-50 h-8 font-bold">
                            <td className="border border-black pr-2 text-right">النسبة المئوية</td>
                            <td colSpan={config.showDetailedScores ? 4 : 2} className="border border-black text-blue-700 font-mono text-sm">{res.percent.toFixed(1)}%</td>
                            <td className="border border-black text-center bg-gray-200">الترتيب على الصف</td>
                            <td className="border border-black font-mono">{config.showRank ? res.rank : '-'}</td>
                        </tr>
                    </tbody>
                 </table>
              </div>

              {/* Activities Table */}
              {activitySubjects.length > 0 && (
                <div className="mb-6">
                    <h4 className="font-black text-sm text-emerald-800 mb-2 border-r-4 border-emerald-600 pr-2">مواد الأنشطة والتربية البدنية</h4>
                    <table className="w-full border-collapse border-2 border-black text-center font-bold text-[11px]">
                        <thead className="bg-emerald-50">
                            <tr>
                                <th className="border border-black p-1 w-[35%]">المادة</th>
                                <th className="border border-black p-1">النهاية العظمى</th>
                                <th className="border border-black p-1 bg-emerald-100">الدرجة الحاصل عليها</th>
                                <th className="border border-black p-1">التقدير</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activitySubjects.map(sub => {
                                const rec = grades[student.id]?.[sub.id] || {};
                                const t1_s = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
                                const t2_s = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
                                const rawScore = sheetMode === 'term1' ? t1_s : (sheetMode === 'term2' ? t2_s : (t1_s + t2_s) / 2);
                                
                                const isFailed = rawScore < sub.maxScore * 0.5;
                                const percent = (rawScore / sub.maxScore) * 100;
                                const info = getGradeInfo(percent);

                                return (
                                    <tr key={sub.id} className="h-8">
                                        <td className="border border-black pr-2 text-right">{sub.name}</td>
                                        <td className="border border-black font-mono text-[10px]">{config.useScaledScore ? (sub.certificateMax || sub.maxScore) : sub.maxScore}</td>
                                        <td className={`border border-black font-mono font-black ${isFailed && config.showColors ? 'bg-red-600 text-white' : ''}`}>
                                            {scaleScore(rawScore, sub.maxScore, sub.certificateMax)}
                                        </td>
                                        <td className="border border-black text-[9px]" style={{ color: config.showColors && !isFailed ? info.color : 'inherit', backgroundColor: isFailed && config.showColors ? '#dc2626' : 'inherit' }}>
                                            {isFailed ? 'دون المستوى' : info.label}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
              )}

              {/* Footer Legend */}
              <div className="mt-auto">
                 <div className="flex justify-center items-center gap-4 border-t-2 border-black pt-4 mb-8">
                    <span className="text-[10px] font-black text-gray-500 whitespace-nowrap">مفتاح التقديرات:</span>
                    <div className="flex flex-wrap justify-center gap-2">
                        {descriptors.sort((a,b) => b.minPercent - a.minPercent).map(d => (
                            <div key={d.id} className="flex items-center gap-1 bg-gray-50 border rounded-full px-2 py-0.5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                                <span className="text-[9px] font-bold text-gray-700">{d.label} (≥ {d.minPercent}%)</span>
                            </div>
                        ))}
                    </div>
                 </div>

                 {/* Signatures */}
                 <div className="grid grid-cols-2 text-center font-black text-lg pt-4">
                    <div className="space-y-12">
                        <p className="underline underline-offset-4 decoration-2">مدير المدرسة</p>
                        <p className="font-normal text-slate-400 text-xs">{config.footerRight || '.........................................'}</p>
                    </div>
                    <div className="space-y-12">
                        <p className="underline underline-offset-4 decoration-2">شئون الطلبة</p>
                        <p className="font-normal text-slate-400 text-xs">{config.footerLeft || '.........................................'}</p>
                    </div>
                 </div>
              </div>
              
              <div className="absolute bottom-2 left-4 text-[8px] text-gray-300 font-mono tracking-widest no-print">
                  - LICENSED FOR {schoolInfo.schoolName}
              </div>

            </div>
          );
        })}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .certificate-page { 
            box-shadow: none !important; 
            border: none !important; 
            margin: 0 !important;
            padding: 10mm !important;
            page-break-after: always;
            width: 210mm;
            height: 296mm;
          }
          @page { size: A4; margin: 0; }
        }
      `}} />
    </div>
  );
};

export default Certificates;
