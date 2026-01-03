import React, { useMemo } from 'react';
import { Student, Subject, GradeLevel, GRADE_LABELS, SchoolInfo, GradeDescriptor } from '../examControl.types';
import { db } from '../services/db';

interface AnnualSheetProps {
  students: Student[];
  subjects: Subject[];
  grades: any;
  filterGrade: GradeLevel | 'all';
  filterClass: string;
  schoolInfo: SchoolInfo;
  descriptors: GradeDescriptor[];
  viewMode?: 'detailed' | 'simple';
  layout?: 'default' | 'a3';
  resultView?: 'scores' | 'colors' | 'evaluations' | 'success';
}

const AnnualSheet: React.FC<AnnualSheetProps> = ({
  students,
  subjects,
  grades,
  filterGrade,
  filterClass,
  schoolInfo,
  descriptors,
  viewMode = 'simple',
  layout = 'default',
  resultView = 'scores'
}) => {
  const certConfig = db.getCertConfig();

  const results = useMemo(() => {
    const calculated: Record<string, any> = {};
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;

    students.forEach((student) => {
      const stGrades = grades[student.id] || {};
      const relevantSubjects = subjects.filter((sub) => sub.gradeLevels?.includes(student.gradeLevel));
      const isRemedialGrade = student.gradeLevel === 'p1' || student.gradeLevel === 'p2';

      let failedSubjects: string[] = [];
      let failureReasons: Record<string, string> = {};
      let grand_total_added = 0;
      let grand_min_added = 0;

      relevantSubjects.forEach((sub) => {
        const record = stGrades[sub.id];
        const safeVal = (v: any) => (v === undefined || v === -1 ? 0 : v);
        const isAbs = (v: any) => v === -1;

        const t1_sum = safeVal(record?.term1?.work) + safeVal(record?.term1?.practical) + safeVal(record?.term1?.exam);
        const t2_sum = safeVal(record?.term2?.work) + safeVal(record?.term2?.practical) + safeVal(record?.term2?.exam);
        const annualAvg = (t1_sum + t2_sum) / 2;

        let failed = false;
        let reason = '';

        if (isRemedialGrade) {
          if (annualAvg < sub.maxScore * 0.5) {
            failed = true;
            reason = 'دون المستوى';
          }
        } else {
          const t2_exam_score = safeVal(record?.term2?.exam);
          const passedWritten = sub.examScore === 0 || t2_exam_score >= sub.examScore * EXAM_THRESHOLD;

          if (sub.examScore > 0 && (isAbs(record?.term1?.exam) || isAbs(record?.term2?.exam))) {
            failed = true;
            reason = 'غياب';
          } else if (!passedWritten) {
            failed = true;
            reason = 'تحريري ت2';
          } else if (annualAvg < sub.minScore) {
            failed = true;
            reason = 'دون الصغرى';
          }
        }

        if (failed && sub.isBasic) {
          failedSubjects.push(sub.name);
          failureReasons[sub.name] = reason;
        }

        if (sub.isAddedToTotal) {
          grand_total_added += annualAvg;
          grand_min_added += sub.minScore;
        }
      });

      if (!isRemedialGrade && grand_min_added > 0 && grand_total_added < grand_min_added) {
        if (!failedSubjects.includes('المجموع العام')) {
          failedSubjects.push('المجموع العام');
          failureReasons['المجموع العام'] = 'دون المجموع';
        }
      }

      calculated[student.id] = {
        status: failedSubjects.length > 0 ? (isRemedialGrade ? 'Remedial' : 'Fail') : 'Pass',
        failedSubjects,
        failureReasons,
        totalScore: grand_total_added,
        maxTotal: relevantSubjects.filter((s) => s.isAddedToTotal).reduce((acc, s) => acc + s.maxScore, 0)
      };
    });
    return calculated;
  }, [students, subjects, grades, certConfig]);

  const filteredStudents = students
    .filter(
      (s) =>
        (filterGrade === 'all' || s.gradeLevel === filterGrade) &&
        (filterClass === 'all' || s.classroom === filterClass)
    )
    .sort((a, b) => (a.seatingNumber || 999999) - (b.seatingNumber || 999999));

  const studentsPerPage = 20;
  const pages = [] as Student[][];
  for (let i = 0; i < filteredStudents.length; i += studentsPerPage) {
    pages.push(filteredStudents.slice(i, i + studentsPerPage));
  }

  const currentGrade = filterGrade === 'all' ? 'p1' : filterGrade;
  const addedSubjects = subjects.filter(
    (sub) => sub.gradeLevels?.includes(currentGrade as GradeLevel) && sub.isAddedToTotal
  );
  const nonAddedSubjects = subjects.filter(
    (sub) => sub.gradeLevels?.includes(currentGrade as GradeLevel) && !sub.isAddedToTotal
  );

  const getSubColsCount = (sub: Subject) => {
    let count = 2;
    if (sub.practicalScore > 0) count += 1;
    if (sub.examScore > 0) count += 1;
    return count;
  };

  const getColsForView = (sub: Subject) => (viewMode === 'detailed' ? getSubColsCount(sub) : 1);

  const safeVal = (v: any) => (v === undefined || v === -1 ? 0 : v);

  const fmt = (v: any) => {
    if (v === -1) return <span className="text-red-600 font-black">غ</span>;
    if (v === 0 || v === undefined || v === null) return '';
    return v.toString();
  };

  const sortedDescriptors = useMemo(
    () => [...descriptors].sort((a, b) => a.minPercent - b.minPercent),
    [descriptors]
  );

  const getDescriptor = (percent: number) => {
    if (sortedDescriptors.length === 0) return null;
    let match = sortedDescriptors[0];
    sortedDescriptors.forEach((desc) => {
      if (percent >= desc.minPercent) match = desc;
    });
    return match;
  };

  const allSubjects = addedSubjects.concat(nonAddedSubjects);
  const totalCols = allSubjects.reduce((acc, sub) => acc + getColsForView(sub), 0);
  const splitTarget = Math.ceil(totalCols / 2);
  const subjectSplit = useMemo(() => {
    if (layout !== 'a3') {
      return { first: allSubjects, second: [] as Subject[] };
    }
    let acc = 0;
    const first: Subject[] = [];
    const second: Subject[] = [];
    allSubjects.forEach((sub) => {
      const cols = getColsForView(sub);
      if (acc < splitTarget || first.length === 0) {
        first.push(sub);
        acc += cols;
      } else {
        second.push(sub);
      }
    });
    return { first, second };
  }, [allSubjects, splitTarget, layout, viewMode]);

  const renderHeader = (subjectsList: Subject[], includeStudentColumns: boolean) => (
    <thead>
      <tr className="bg-slate-200 font-black">
        {includeStudentColumns && (
          <>
            <th rowSpan={viewMode === 'detailed' ? 3 : 2} className="w-8">م</th>
            <th rowSpan={viewMode === 'detailed' ? 3 : 2} className="min-w-[130px]">اسم الطالب</th>
            <th rowSpan={viewMode === 'detailed' ? 3 : 2} className="w-12">جلوس</th>
          </>
        )}
        {subjectsList.filter((sub) => sub.isAddedToTotal).length > 0 && (
          <th
            colSpan={viewMode === 'detailed' ? subjectsList.filter((sub) => sub.isAddedToTotal).reduce((acc, s) => acc + getSubColsCount(s), 0) : subjectsList.filter((sub) => sub.isAddedToTotal).length}
            className="bg-blue-100/50 py-1"
          >
            متوسط المواد الأساسية
          </th>
        )}
        {subjectsList.filter((sub) => !sub.isAddedToTotal).length > 0 && (
          <th
            colSpan={viewMode === 'detailed' ? subjectsList.filter((sub) => !sub.isAddedToTotal).reduce((acc, s) => acc + getSubColsCount(s), 0) : subjectsList.filter((sub) => !sub.isAddedToTotal).length}
            className="bg-green-100/50 py-1"
          >
            مواد إضافية
          </th>
        )}
        {includeStudentColumns && (
          <>
            <th rowSpan={viewMode === 'detailed' ? 3 : 2} className="w-16 bg-slate-300">المجموع</th>
            <th rowSpan={viewMode === 'detailed' ? 3 : 2} className="w-28">النتيجة</th>
          </>
        )}
      </tr>
      {viewMode === 'detailed' ? (
        <>
          <tr className="bg-slate-50 font-bold">
            {subjectsList.map((sub) => (
              <th key={sub.id} colSpan={getSubColsCount(sub)}>
                {sub.name}
              </th>
            ))}
          </tr>
          <tr className="bg-white text-[8px]">
            {subjectsList.map((sub) => (
              <React.Fragment key={sub.id}>
                <th>أعمال</th>
                {sub.practicalScore > 0 && <th>عملي</th>}
                {sub.examScore > 0 && <th>تحريري</th>}
                <th className="bg-yellow-100 font-bold">سنوي</th>
              </React.Fragment>
            ))}
          </tr>
        </>
      ) : (
        <tr className="bg-slate-50 font-bold">
          {subjectsList.map((sub) => (
            <th key={sub.id}>{sub.name}</th>
          ))}
        </tr>
      )}
    </thead>
  );

  const renderSubjectCells = (student: Student, subjectsList: Subject[]) => {
    const stGrades = grades[student.id] || {};
    const res = results[student.id];
    return subjectsList.map((sub) => {
      const rec = stGrades[sub.id];
      const t1w = safeVal(rec?.term1?.work);
      const t1p = safeVal(rec?.term1?.practical);
      const t1e = safeVal(rec?.term1?.exam);
      const t2w = safeVal(rec?.term2?.work);
      const t2p = safeVal(rec?.term2?.practical);
      const t2e = safeVal(rec?.term2?.exam);

      const avgTotal = ((t1w + t1p + t1e) + (t2w + t2p + t2e)) / 2;
      const isSubFailed = res.failedSubjects.includes(sub.name);
      const percent = sub.maxScore > 0 ? (avgTotal / sub.maxScore) * 100 : 0;
      const descriptor = getDescriptor(percent);
      const totalCellClass =
        resultView === 'scores'
          ? `font-black bg-yellow-100/50 ${isSubFailed ? 'text-red-600' : ''}`
          : `font-black ${isSubFailed ? 'text-red-600' : ''}`;
      const totalCellStyle =
        resultView === 'colors' && descriptor ? { backgroundColor: descriptor.color } : undefined;
      const renderTotalValue = () => {
        if (resultView === 'scores') return fmt(avgTotal);
        if (resultView === 'evaluations') return descriptor?.label || '';
        if (resultView === 'success') return isSubFailed ? 'لم يجتز' : 'اجتاز';
        return '';
      };

      if (viewMode === 'detailed') {
        return (
          <React.Fragment key={sub.id}>
            <td>{resultView === 'scores' ? fmt((t1w + t2w) / 2) : ''}</td>
            {sub.practicalScore > 0 && (
              <td>{resultView === 'scores' ? fmt((t1p + t2p) / 2) : ''}</td>
            )}
            <td>{resultView === 'scores' ? fmt((t1e + t2e) / 2) : ''}</td>
            <td className={totalCellClass} style={totalCellStyle}>
              {renderTotalValue()}
            </td>
          </React.Fragment>
        );
      }

      return (
        <td key={sub.id} className={totalCellClass} style={totalCellStyle}>
          {renderTotalValue()}
        </td>
      );
    });
  };

  const renderBody = (pageStudents: Student[], subjectsList: Subject[], includeStudentColumns: boolean, offset: number) => (
    <tbody>
      {pageStudents.map((student, idx) => {
        const res = results[student.id];
        return (
          <React.Fragment key={`${student.id}-${includeStudentColumns ? 'main' : 'cont'}`}>
            <tr className="h-7 hover:bg-slate-50 odd:bg-white even:bg-slate-50/30">
              {includeStudentColumns && (
                <>
                  <td>{offset + idx + 1}</td>
                  <td className="text-right px-2 font-bold whitespace-nowrap">{student.name}</td>
                  <td className="font-mono font-bold text-blue-700">{student.seatingNumber}</td>
                </>
              )}
              {renderSubjectCells(student, subjectsList)}
              {includeStudentColumns && (
                <>
                  <td className="bg-slate-300 font-black">{res.totalScore || ''}</td>
                  <td className={`p-0.5 leading-tight ${res.status === 'Pass' ? 'text-green-700' : 'text-red-700'}`}>
                    <span className="font-black text-[9px]">
                      {res.status === 'Pass' ? 'ناجح' : res.status === 'Remedial' ? 'علاجي' : 'دور ثان'}
                    </span>
                  </td>
                </>
              )}
            </tr>
            <tr className="h-7">
              {includeStudentColumns && (
                <>
                  <td></td>
                  <td className="text-right px-2 font-bold whitespace-nowrap"></td>
                  <td></td>
                </>
              )}
              {subjectsList.map((sub) => (
                <React.Fragment key={`${sub.id}-second`}>
                  {viewMode === 'detailed' ? (
                    <>
                      <td></td>
                      {sub.practicalScore > 0 && <td></td>}
                      <td></td>
                      <td></td>
                    </>
                  ) : (
                    <td></td>
                  )}
                </React.Fragment>
              ))}
              {includeStudentColumns && (
                <>
                  <td></td>
                  <td></td>
                </>
              )}
            </tr>
          </React.Fragment>
        );
      })}
    </tbody>
  );

  const pageSize = layout === 'a3' ? 'A3 landscape' : 'A4 landscape';
  const pageWidth = layout === 'a3' ? '404mm' : '287mm';
  const pageHeight = layout === 'a3' ? '281mm' : '200mm';

  return (
    <div className="bg-gray-100 p-4 min-h-screen no-print-bg">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page { size: ${pageSize}; margin: 5mm !important; }
          body { background: white !important; }
          .official-sheet-page {
            page-break-after: always !important;
            width: ${pageWidth} !important;
            height: ${pageHeight} !important;
            padding: 8mm !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
            display: flex;
            flex-direction: column;
          }
        }
        .official-sheet-page {
          width: ${pageWidth}; background: white; padding: 10mm;
          margin: 0 auto 20mm auto; box-shadow: 0 0 20px rgba(0,0,0,0.15);
          direction: rtl; font-family: 'Cairo', sans-serif;
        }
        .official-table { border-collapse: collapse; width: 100%; border: 2.5px solid black; }
        .official-table th, .official-table td { border: 1.2px solid black; text-align: center; }
      `
        }}
      />

      {pages.length === 0 ? (
        <div className="official-sheet-page flex items-center justify-center">
          <p className="text-2xl font-bold text-gray-300">لا توجد بيانات للعرض</p>
        </div>
      ) : (
        pages.map((pageStudents, pIdx) => (
          <React.Fragment key={pIdx}>
            <div className="official-sheet-page" id={pIdx === 0 ? 'annual-sheet-print-area' : undefined}>
              <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
                <div className="text-[10px] font-bold w-1/3">
                  <p>إدارة: {schoolInfo.educationalAdministration}</p>
                  <p>مدرسة: {schoolInfo.schoolName}</p>
                </div>
                <div className="text-center w-1/3">
                  <h2 className="text-xl font-black">شيت الرصد المجمع (السنوي)</h2>
                  <p className="text-xs font-bold text-slate-800">
                    {schoolInfo.academicYear} | {filterGrade === 'all' ? 'الكل' : GRADE_LABELS[filterGrade]}
                  </p>
                </div>
                <div className="text-[10px] font-bold text-left w-1/3">
                  <p>صفحة: {pIdx + 1}</p>
                  <p>الفصل: {filterClass === 'all' ? 'الكل' : filterClass}</p>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <table className="official-table text-[9px]">
                  {renderHeader(subjectSplit.first, true)}
                  {renderBody(pageStudents, subjectSplit.first, true, pIdx * studentsPerPage)}
                </table>
              </div>

              <div className="mt-6 grid grid-cols-4 gap-4 text-center font-black text-[11px] border-t-2 border-black pt-4">
                <div className="flex flex-col gap-8">
                  <span>كتبه / .................</span>
                </div>
                <div className="flex flex-col gap-8">
                  <span>املاه / .................</span>
                </div>
                <div className="flex flex-col gap-8">
                  <span>راجعه / .................</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="underline">يعتمد مدير المدرسة</span>
                  <span className="text-[9px] text-slate-700">{schoolInfo.managerName}</span>
                </div>
              </div>
            </div>

            {layout === 'a3' && subjectSplit.second.length > 0 && (
              <div className="official-sheet-page">
                <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
                  <div className="text-[10px] font-bold w-1/3">
                    <p>إدارة: {schoolInfo.educationalAdministration}</p>
                    <p>مدرسة: {schoolInfo.schoolName}</p>
                  </div>
                  <div className="text-center w-1/3">
                    <h2 className="text-xl font-black">شيت الرصد المجمع (السنوي)</h2>
                    <p className="text-xs font-bold text-slate-800">
                      {schoolInfo.academicYear} | {filterGrade === 'all' ? 'الكل' : GRADE_LABELS[filterGrade]}
                    </p>
                  </div>
                  <div className="text-[10px] font-bold text-left w-1/3">
                    <p>صفحة: {pIdx + 1} (استكمال)</p>
                    <p>الفصل: {filterClass === 'all' ? 'الكل' : filterClass}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden">
                  <table className="official-table text-[9px]">
                    {renderHeader(subjectSplit.second, false)}
                    {renderBody(pageStudents, subjectSplit.second, false, pIdx * studentsPerPage)}
                  </table>
                </div>
              </div>
            )}
          </React.Fragment>
        ))
      )}
    </div>
  );
};

export default AnnualSheet;
