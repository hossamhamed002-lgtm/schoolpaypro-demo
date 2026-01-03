
import React, { useState, useMemo, useEffect } from 'react';
import { Printer, MoveHorizontal, Award, Trophy, AlertTriangle, FileText, BarChart3, Settings, LayoutList, List, Download } from 'lucide-react';
import { Student, Subject, GradesDatabase, CertificateConfig, GradeLevel, GRADE_LABELS, SchoolInfo, GradeDescriptor } from '../examControl.types';
import { db } from '../services/db';
import { exportUtils } from '../services/exportUtils';

import Term1Sheet from './Term1Sheet';
import Term2Sheet from './Term2Sheet';
import AnnualSheet from './AnnualSheet';
import Certificates from './Certificates';
import TopStudents from './TopStudents';
import FailureReport from './FailureReport';
import StudentStatement from './StudentStatement';
import SubjectStats from './SubjectStats';
import CertificateSettings from './CertificateSettings';

interface ReportsProps {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
  allowedReportIds?: string[];
  signatureChain?: Array<{
    Step_ID: string;
    Display_Title_Ar: string;
    Display_Title_En: string;
    Alignment?: 'left' | 'center' | 'right';
  }>;
  title?: string;
  hideSheetTab?: boolean;
  showReportTypeTabs?: boolean;
  initialReportType?: 'table' | 'certificates' | 'top' | 'fail' | 'stats' | 'statement';
  lockedReportType?: 'table' | 'certificates' | 'top' | 'fail' | 'stats' | 'statement';
}

const Reports: React.FC<ReportsProps> = ({
  students,
  subjects,
  grades,
  allowedReportIds = [],
  signatureChain = [],
  title = 'التقارير والنتائج',
  hideSheetTab = false,
  showReportTypeTabs = true,
  initialReportType = 'table',
  lockedReportType
}) => {
  const [reportType, setReportType] = useState<'table' | 'certificates' | 'top' | 'fail' | 'stats' | 'statement'>(
    lockedReportType || initialReportType
  );
  const isSheetOnly = lockedReportType === 'table' && !showReportTypeTabs;
  const [sheetStyle, setSheetStyle] = useState<'official' | 'a3'>('official');
  const [sheetBadge, setSheetBadge] = useState<'scores' | 'evaluations' | 'colors' | 'success'>('scores');
  const [sheetMode, setSheetMode] = useState<'term1' | 'term2' | 'annual'>('annual');
  const [annualViewMode, setAnnualViewMode] = useState<'detailed' | 'simple'>('simple');
  const [filterGrade, setFilterGrade] = useState<GradeLevel | 'all'>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [schoolInfo] = useState<SchoolInfo>(db.getSchoolInfo());
  const [certConfig, setCertConfig] = useState<CertificateConfig>(db.getCertConfig());
  const [descriptors] = useState<GradeDescriptor[]>(db.getGradeDescriptors());

  const reportTypeToId: Record<typeof reportType, string> = {
    table: 'EXM-RPT-SHEET',
    certificates: 'EXM-RPT-CERT',
    top: 'EXM-RPT-TOP',
    fail: 'EXM-RPT-FAIL',
    stats: 'EXM-RPT-STAT',
    statement: 'EXM-RPT-STATEMENT'
  };

  const isReportAllowed = (type: typeof reportType) => {
    if (!allowedReportIds || allowedReportIds.length === 0) return true;
    return allowedReportIds.includes(reportTypeToId[type]);
  };

  useEffect(() => {
    if (lockedReportType && reportType !== lockedReportType) {
      setReportType(lockedReportType);
      return;
    }
    if (lockedReportType) return;
    if (isReportAllowed(reportType)) return;
    const next = (Object.keys(reportTypeToId) as Array<typeof reportType>)
      .find((type) => isReportAllowed(type));
    if (next) setReportType(next);
  }, [allowedReportIds, reportType, lockedReportType]);

  useEffect(() => {
    if (reportType === 'table') {
      setPrintOrientation('landscape');
      return;
    }
    setPrintOrientation('portrait');
  }, [reportType, sheetStyle]);

  const results = useMemo(() => {
    const calculated: Record<string, any> = {};
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;

    students.forEach(student => {
      const stGrades = grades[student.id] || {};
      const relevantSubjects = subjects.filter(sub => sub.gradeLevels?.includes(student.gradeLevel));
      // البرنامج العلاجي للأول والثاني الابتدائي فقط حسب التحديث الأخير
      const isRemedialGrade = student.gradeLevel === 'p1' || student.gradeLevel === 'p2';
      
      let failedSubjects: string[] = [];
      let failureReasons: Record<string, string> = {};
      
      let t1_grand_added = 0;
      let t2_grand_added = 0;
      let grand_max_added = 0;

      relevantSubjects.forEach(sub => {
        const record = stGrades[sub.id];
        const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
        const isAbs = (v: any) => v === -1;
        
        const t1_sum = safeVal(record?.term1?.work) + safeVal(record?.term1?.practical) + safeVal(record?.term1?.exam);
        const t2_sum = safeVal(record?.term2?.work) + safeVal(record?.term2?.practical) + safeVal(record?.term2?.exam);

        let failed = false;
        let reason = "";

        if (sheetMode === 'term1' || sheetMode === 'term2') {
           const termData = sheetMode === 'term1' ? record?.term1 : record?.term2;
           const score = safeVal(termData?.work) + safeVal(termData?.practical) + safeVal(termData?.exam);
           
           if (isRemedialGrade) {
               if (score < sub.maxScore * 0.5) { failed = true; reason = "أقل من 50%"; }
           } else {
               if (sub.examScore > 0 && isAbs(termData?.exam)) { failed = true; reason = "غياب"; }
               else if (sub.examScore > 0 && safeVal(termData?.exam) < sub.examScore * EXAM_THRESHOLD) { failed = true; reason = `${certConfig.minExamPassingPercent}% تحريري`; }
               else if (score < sub.maxScore * PASS_THRESHOLD) { failed = true; reason = `${certConfig.minPassingPercent}% مجموع`; }
           }
        } else {
           // السنوي: المجموع يعتمد على المتوسط (ترم1 + ترم2) ÷ 2
           const annualAvg = (t1_sum + t2_sum) / 2;
           if (isRemedialGrade) {
               if (annualAvg < sub.maxScore * 0.5) { failed = true; reason = "أقل من 50%"; }
           } else {
               // التحقق من غياب أي من الترمين في التحريري
               if (sub.examScore > 0 && (isAbs(record?.term1?.exam) || isAbs(record?.term2?.exam))) {
                   failed = true; reason = "غياب";
               } else {
                   // شرط الـ 30% من ورقة امتحان الترم الثاني حصراً
                   const t2_exam_score = safeVal(record?.term2?.exam);
                   const passedWritten = (sub.examScore === 0) || (t2_exam_score >= sub.examScore * EXAM_THRESHOLD);
                   
                   if (!passedWritten) { failed = true; reason = `${certConfig.minExamPassingPercent}% تحريري ت2`; }
                   // شرط الـ 50% من المتوسط السنوي
                   else if (annualAvg < sub.maxScore * PASS_THRESHOLD) { failed = true; reason = `${certConfig.minPassingPercent}% متوسط سنوي`; }
               }
           }
        }
        
        if (failed && sub.isBasic) {
            failedSubjects.push(sub.name);
            failureReasons[sub.name] = reason;
        }

        if (sub.isAddedToTotal) {
            t1_grand_added += t1_sum;
            t2_grand_added += t2_sum;
            grand_max_added += sub.maxScore;
        }
      });

      let finalTotal = 0;
      if (sheetMode === 'term1') finalTotal = t1_grand_added;
      else if (sheetMode === 'term2') finalTotal = t2_grand_added;
      else finalTotal = (t1_grand_added + t2_grand_added) / 2;

      const percent = grand_max_added > 0 ? (finalTotal / grand_max_added) * 100 : 0;
      if (grand_max_added > 0 && percent < certConfig.minPassingPercent) {
          if (!failedSubjects.includes('المجموع العام')) {
              failedSubjects.push('المجموع العام');
              failureReasons['المجموع العام'] = `${certConfig.minPassingPercent}% كلي`;
          }
      }

      calculated[student.id] = {
        status: failedSubjects.length > 0 ? (isRemedialGrade ? 'Remedial' : 'Fail') : 'Pass',
        percent: Math.round(percent * 10) / 10,
        totalScore: Math.round(finalTotal * 10) / 10,
        maxTotal: grand_max_added,
        failedSubjects,
        failureReasons
      };
    });
    return calculated;
  }, [students, subjects, grades, sheetMode, certConfig]);

  const availableClasses = Array.from(new Set(students.filter(s => filterGrade === 'all' || s.gradeLevel === filterGrade).map(s => s.classroom))).sort();
  const hasSignatures = signatureChain.length > 0;
  const getPrintTarget = () => {
    if (reportType === 'table') {
      return { id: 'sheet-content-area', orientation: 'landscape' as const };
    }
    if (reportType === 'certificates') {
      return { id: 'certificates-print-area', orientation: 'portrait' as const };
    }
    if (reportType === 'top') {
      return { id: 'top-students-report', orientation: 'portrait' as const };
    }
    if (reportType === 'fail') {
      return { id: 'failure-report', orientation: 'portrait' as const };
    }
    if (reportType === 'statement') {
      return { id: 'student-statement-report', orientation: 'portrait' as const };
    }
    if (reportType === 'stats') {
      return { id: 'subject-stats-report', orientation: 'portrait' as const };
    }
    return null;
  };
  const handleExportPdf = () => {
    const target = getPrintTarget();
    if (!target) {
      return;
    }
    if (reportType === 'certificates') {
      exportUtils.print(target.id, printOrientation);
      return;
    }
    const fileLabel = reportType === 'table'
      ? `شيت_${sheetMode}`
      : reportType === 'certificates'
      ? `الشهادات_${sheetMode}`
      : 'تقرير';
    const format = reportType === 'table' && sheetStyle === 'a3' ? 'a3' : 'a4';
    exportUtils.exportToPDF(target.id, fileLabel, printOrientation, 5, format);
  };
  const handleSheetPrint = () => {
    const target = getPrintTarget();
    if (target) {
      const headerModel = {
        title: reportType === 'table' ? `شيت ${sheetMode}` : reportType === 'certificates' ? 'الشهادات' : 'تقرير',
        subtitle: sheetMode ? `النمط: ${sheetMode}` : undefined,
        metaRight: [
          `العام الدراسي: ${db.getSelectedYear() || ''}`,
          `المدرسة: ${db.getSchoolInfo().schoolName || ''}`
        ],
        metaLeft: [
          `نوع التقرير: ${reportType}`,
          `التاريخ: ${new Date().toLocaleDateString('ar-EG')}`
        ]
      };
      exportUtils.print(target.id, printOrientation, 5, headerModel);
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6">
      {isSheetOnly ? (
        <div className="space-y-4 no-print">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSheetPrint}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm"
              >
                <Printer size={16} /> طباعة
              </button>
              <button
                onClick={handleExportPdf}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm"
              >
                <Download size={16} /> تصدير PDF
              </button>
              <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600">
                <span className="text-lg">↓</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-blue-50 p-1 rounded-lg border border-blue-100 text-xs">
                <button onClick={() => setSheetMode('term1')} className={`px-3 py-1.5 font-bold rounded transition ${sheetMode === 'term1' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-400'}`}>نصف العام</button>
                <button onClick={() => setSheetMode('term2')} className={`px-3 py-1.5 font-bold rounded transition ${sheetMode === 'term2' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-400'}`}>آخر العام</button>
                <button onClick={() => setSheetMode('annual')} className={`px-3 py-1.5 font-bold rounded transition ${sheetMode === 'annual' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-400'}`}>المجمع</button>
              </div>

              <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border">
                <select className="border-0 bg-transparent text-sm font-bold text-blue-700 outline-none px-2 cursor-pointer" value={filterGrade} onChange={(e) => { setFilterGrade(e.target.value as any); setFilterClass('all'); }}>
                  <option value="all">كل الصفوف</option>
                  {(Object.keys(GRADE_LABELS) as GradeLevel[]).map(g => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
                </select>
                <div className="w-px h-4 bg-gray-300"></div>
                <select className="border-0 bg-transparent text-sm font-bold text-gray-600 outline-none px-2 cursor-pointer" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
                  <option value="all">كل الفصول</option>
                  {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800">نتائج وبيانات الرصد</h2>
                <span className="text-xs font-bold text-slate-400">استعراض وطباعة كشوف الدرجات المتنوعة</span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <MoveHorizontal size={18} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {[
                { id: 'success', label: 'اجتاز / لم يجتاز' },
                { id: 'colors', label: 'ألوان فقط' },
                { id: 'evaluations', label: 'تقييمات لفظية' },
                { id: 'scores', label: 'درجات فقط' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSheetBadge(item.id as typeof sheetBadge)}
                  className={`rounded-full border px-3 py-1.5 font-bold ${sheetBadge === item.id ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-slate-400">نمط عرض النتائج:</span>
              <button
                onClick={() => setSheetStyle('official')}
                className={`rounded-xl px-4 py-2 ${sheetStyle === 'official' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}
              >
                الشيت الرسمي
              </button>
              <button
                onClick={() => setSheetStyle('a3')}
                className={`rounded-xl px-4 py-2 ${sheetStyle === 'a3' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}
              >
                شيت ورقي (A3)
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-slate-400">اتجاه الطباعة:</span>
              <button
                onClick={() => setPrintOrientation('portrait')}
                className={`rounded-xl px-3 py-2 ${printOrientation === 'portrait' ? 'bg-slate-800 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}
              >
                رأسي
              </button>
              <button
                onClick={() => setPrintOrientation('landscape')}
                className={`rounded-xl px-3 py-2 ${printOrientation === 'landscape' ? 'bg-slate-800 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}
              >
                أفقي
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col xl:flex-row justify-between items-center gap-4 no-print bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 className="text-blue-600" /> {title}
          </h2>
          
          <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border">
                  <select className="border-0 bg-transparent text-sm font-bold text-blue-700 outline-none px-2 cursor-pointer" value={filterGrade} onChange={(e) => { setFilterGrade(e.target.value as any); setFilterClass('all'); }}>
                      <option value="all">كل الصفوف</option>
                      {(Object.keys(GRADE_LABELS) as GradeLevel[]).map(g => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
                  </select>
                  <div className="w-px h-4 bg-gray-300"></div>
                  <select className="border-0 bg-transparent text-sm font-bold text-gray-600 outline-none px-2 cursor-pointer" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
                      <option value="all">كل الفصول</option>
                      {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
              </div>
              
              {showReportTypeTabs && (
                <div className="bg-gray-100 p-1 rounded-lg flex overflow-x-auto text-xs">
                    {!hideSheetTab && isReportAllowed('table') && (
                      <button
                        onClick={() => !lockedReportType && setReportType('table')}
                        className={`px-3 py-2 rounded-md whitespace-nowrap flex items-center gap-2 ${reportType === 'table' ? 'bg-white shadow font-bold text-blue-700' : 'text-gray-600'}`}
                      >
                        <MoveHorizontal size={14} /> الشيت
                      </button>
                    )}
                    {isReportAllowed('certificates') && (
                      <button
                        onClick={() => !lockedReportType && setReportType('certificates')}
                        className={`px-3 py-2 rounded-md whitespace-nowrap flex items-center gap-2 ${reportType === 'certificates' ? 'bg-white shadow font-bold text-indigo-700' : 'text-gray-600'}`}
                      >
                        <Award size={14} /> الشهادات
                      </button>
                    )}
                    {isReportAllowed('top') && (
                      <button
                        onClick={() => !lockedReportType && setReportType('top')}
                        className={`px-3 py-2 rounded-md whitespace-nowrap flex items-center gap-2 ${reportType === 'top' ? 'bg-white shadow font-bold text-yellow-700' : 'text-gray-600'}`}
                      >
                        <Trophy size={14} /> الأوائل
                      </button>
                    )}
                    {isReportAllowed('fail') && (
                      <button
                        onClick={() => !lockedReportType && setReportType('fail')}
                        className={`px-3 py-2 rounded-md whitespace-nowrap flex items-center gap-2 ${reportType === 'fail' ? 'bg-white shadow font-bold text-red-700' : 'text-gray-600'}`}
                      >
                        <AlertTriangle size={14} /> الدور الثاني
                      </button>
                    )}
                    {isReportAllowed('statement') && (
                      <button
                        onClick={() => !lockedReportType && setReportType('statement')}
                        className={`px-3 py-2 rounded-md whitespace-nowrap flex items-center gap-2 ${reportType === 'statement' ? 'bg-white shadow font-bold text-purple-700' : 'text-gray-600'}`}
                      >
                        <FileText size={14} /> بيان درجات
                      </button>
                    )}
                </div>
              )}

              <div className="flex bg-blue-50 p-1 rounded-lg border border-blue-100 text-xs">
                  <button onClick={() => setSheetMode('term1')} className={`px-3 py-1.5 font-bold rounded transition ${sheetMode === 'term1' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-400'}`}>ترم 1</button>
                  <button onClick={() => setSheetMode('term2')} className={`px-3 py-1.5 font-bold rounded transition ${sheetMode === 'term2' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-400'}`}>ترم 2</button>
                  <button onClick={() => setSheetMode('annual')} className={`px-3 py-1.5 font-bold rounded transition ${sheetMode === 'annual' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-400'}`}>مجمع (سنوي)</button>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="text-slate-400">اتجاه الطباعة:</span>
                <button
                  onClick={() => setPrintOrientation('portrait')}
                  className={`rounded-lg px-3 py-2 ${printOrientation === 'portrait' ? 'bg-slate-800 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}
                >
                  رأسي
                </button>
                <button
                  onClick={() => setPrintOrientation('landscape')}
                  className={`rounded-lg px-3 py-2 ${printOrientation === 'landscape' ? 'bg-slate-800 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}
                >
                  أفقي
                </button>
              </div>

              {reportType === 'table' && sheetMode === 'annual' && (
                <div className="flex bg-orange-50 p-1 rounded-lg border border-orange-100 text-xs">
                    <button onClick={() => setAnnualViewMode('simple')} className={`px-3 py-1.5 font-bold rounded transition flex items-center gap-1 ${annualViewMode === 'simple' ? 'bg-white text-orange-700 shadow-sm' : 'text-orange-400'}`}><List size={14}/> مختصر</button>
                    <button onClick={() => setAnnualViewMode('detailed')} className={`px-3 py-1.5 font-bold rounded transition flex items-center gap-1 ${annualViewMode === 'detailed' ? 'bg-white text-orange-700 shadow-sm' : 'text-orange-400'}`}><LayoutList size={14}/> مفصل</button>
                </div>
              )}

              {isReportAllowed('certificates') && (
                <button onClick={() => setSettingsModalOpen(true)} className="p-2 bg-white text-gray-500 rounded-lg hover:bg-gray-100 transition border" title="إعدادات الشهادة"><Settings size={18} /></button>
              )}
              <button onClick={handleSheetPrint} className="bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-900 text-sm font-bold shadow-md transition"><Printer size={16} /> طباعة</button>
              <button onClick={handleExportPdf} className="bg-white text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 text-sm font-bold shadow-sm border border-gray-200 transition"><Download size={16} /> تصدير PDF</button>
          </div>
        </div>
      )}

      <div
        className={
          isSheetOnly && reportType === 'table' && sheetStyle === 'a3'
            ? 'rounded-3xl border border-gray-100 bg-slate-50 p-6 shadow-sm'
            : 'bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px]'
        }
      >
        {!isReportAllowed(reportType) && (
          <div className="p-10 text-center text-slate-400 font-bold">
            غير مصرح لك بعرض هذه التقارير
          </div>
        )}
        {reportType === 'table' && (
          <div
            className={
              isSheetOnly && sheetStyle === 'a3'
                ? 'rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden'
                : ''
            }
          >
            {isSheetOnly && sheetStyle === 'a3' && (
              <div className="h-4 bg-gradient-to-b from-gray-200 to-gray-100" />
            )}
            <div
              id={reportType === 'table' ? 'sheet-content-area' : undefined}
              data-export-root={reportType === 'table' ? true : undefined}
              data-export-type={reportType === 'table' ? 'exam' : undefined}
              data-report-id={reportType === 'table' ? 'results-sheet' : undefined}
              data-page-size={reportType === 'table' ? (sheetStyle === 'a3' ? 'A3' : 'A4') : undefined}
              data-orientation={reportType === 'table' ? printOrientation : undefined}
              data-school-name={reportType === 'table' ? (schoolInfo.schoolName || '') : undefined}
              data-academic-year={reportType === 'table' ? (schoolInfo.academicYear || '') : undefined}
              data-report-title={reportType === 'table' ? 'شيت الرصد' : undefined}
              data-report-badge={reportType === 'table' ? (sheetMode === 'term1' ? 'نصف العام' : sheetMode === 'term2' ? 'آخر العام' : 'المجمع') : undefined}
              className={isSheetOnly && sheetStyle === 'a3' ? 'p-6 overflow-auto' : ''}
            >
              {isSheetOnly && sheetStyle === 'a3' && (
                <div className="mb-6 border-b-2 border-black pb-4 text-sm font-bold text-slate-700" dir="rtl">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 text-xs">
                      <div>إدارة:</div>
                      <div>مدرسة: {schoolInfo.schoolName || '—'}</div>
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-black text-slate-900">
                        شيت الرصد الورقي {filterGrade !== 'all' ? GRADE_LABELS[filterGrade] : 'لكل الصفوف'}
                      </h3>
                      <p className="text-xs text-slate-600">
                        العام الدراسي {schoolInfo.academicYear || '—'} | {sheetMode === 'term1' ? 'نصف العام' : sheetMode === 'term2' ? 'آخر العام' : 'المجمع'}
                      </p>
                    </div>
                    <div className="text-xs text-slate-500">
                      <div>صفحة: 1</div>
                      <div>الفصل: {filterClass === 'all' ? 'الكل' : filterClass}</div>
                    </div>
                  </div>
                </div>
              )}
              {sheetMode === 'term1' && (
                <Term1Sheet
                  students={students}
                  subjects={subjects}
                  grades={grades}
                  filterGrade={filterGrade}
                  filterClass={filterClass}
                  schoolInfo={schoolInfo}
                  descriptors={descriptors}
                  layout={isSheetOnly && sheetStyle === 'a3' ? 'a3' : 'default'}
                  resultView={sheetBadge}
                />
              )}
              {sheetMode === 'term2' && (
                <Term2Sheet
                  students={students}
                  subjects={subjects}
                  grades={grades}
                  filterGrade={filterGrade}
                  filterClass={filterClass}
                  schoolInfo={schoolInfo}
                  descriptors={descriptors}
                  layout={isSheetOnly && sheetStyle === 'a3' ? 'a3' : 'default'}
                  resultView={sheetBadge}
                />
              )}
              {sheetMode === 'annual' && (
                <AnnualSheet
                  students={students}
                  subjects={subjects}
                  grades={grades}
                  filterGrade={filterGrade}
                  filterClass={filterClass}
                  schoolInfo={schoolInfo}
                  descriptors={descriptors}
                  viewMode={annualViewMode}
                  layout={isSheetOnly && sheetStyle === 'a3' ? 'a3' : 'default'}
                  resultView={sheetBadge}
                />
              )}
            </div>
          </div>
        )}
        {reportType === 'certificates' && isReportAllowed('certificates') && (
          <div
            id="certificates-print-area"
            data-export-root
            data-export-type="exam"
            data-report-id="certificates"
            data-page-size="A4"
            data-orientation={printOrientation}
            data-school-name={schoolInfo.schoolName || ''}
            data-academic-year={schoolInfo.academicYear || ''}
            data-report-title="الشهادات"
          >
            <Certificates
              students={students}
              subjects={subjects}
              grades={grades}
              filterGrade={filterGrade}
              schoolInfo={schoolInfo}
              descriptors={descriptors}
              config={certConfig}
              sheetMode={sheetMode}
            />
          </div>
        )}
        {reportType === 'top' && isReportAllowed('top') && (
          <div
            id="top-students-report"
            data-export-root
            data-export-type="exam"
            data-report-id="top-students"
            data-page-size="A4"
            data-orientation={printOrientation}
            data-school-name={schoolInfo.schoolName || ''}
            data-academic-year={schoolInfo.academicYear || ''}
            data-report-title="تقرير الأوائل"
          >
            <TopStudents
              students={students}
              subjects={subjects}
              grades={grades}
              results={results}
              filterGrade={filterGrade}
              sheetMode={sheetMode}
            />
          </div>
        )}
        {reportType === 'fail' && isReportAllowed('fail') && (
          <div
            id="failure-report"
            data-export-root
            data-export-type="exam"
            data-report-id="failure-report"
            data-page-size="A4"
            data-orientation={printOrientation}
            data-school-name={schoolInfo.schoolName || ''}
            data-academic-year={schoolInfo.academicYear || ''}
            data-report-title="كشف الرسوب"
          >
            <FailureReport
              students={students}
              subjects={subjects}
              grades={grades}
              results={results}
              filterGrade={filterGrade}
              filterClass={filterClass}
            />
          </div>
        )}
        {reportType === 'statement' && isReportAllowed('statement') && (
          <div
            id="student-statement-report"
            data-export-root
            data-export-type="exam"
            data-report-id="student-statement"
            data-page-size="A4"
            data-orientation={printOrientation}
            data-school-name={schoolInfo.schoolName || ''}
            data-academic-year={schoolInfo.academicYear || ''}
            data-report-title="بيان الدرجات"
          >
            <StudentStatement
              students={students}
              subjects={subjects}
              grades={grades}
              results={results}
              filterGrade={filterGrade}
              schoolInfo={schoolInfo}
              descriptors={descriptors}
            />
          </div>
        )}
        {reportType === 'stats' && isReportAllowed('stats') && (
          <div
            id="subject-stats-report"
            data-export-root
            data-export-type="exam"
            data-report-id="subject-stats"
            data-page-size="A4"
            data-orientation={printOrientation}
            data-school-name={schoolInfo.schoolName || ''}
            data-academic-year={schoolInfo.academicYear || ''}
            data-report-title="إحصاءات المواد"
          >
            <SubjectStats students={students} subjects={subjects} results={results} filterGrade={filterGrade} />
          </div>
        )}
        {hasSignatures && isReportAllowed(reportType) && (
          <div className="mt-10 px-8 pb-8 print:mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {signatureChain.map((step) => (
                <div
                  key={step.Step_ID}
                  className={`text-center ${step.Alignment === 'left' ? 'md:text-start' : step.Alignment === 'right' ? 'md:text-end' : ''}`}
                >
                  <p className="text-sm font-black text-slate-700">
                    {step.Display_Title_Ar || step.Display_Title_En}
                  </p>
                  <div className="mt-10 border-t border-slate-300"></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <CertificateSettings isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} onSave={(c) => setCertConfig(c)} />
    </div>
  );
};

export default Reports;
