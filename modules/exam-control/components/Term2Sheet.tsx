import React, { useMemo } from 'react';
import { Student, Subject, GradeLevel, GRADE_LABELS, SchoolInfo, GradeDescriptor } from '../examControl.types';
import { db } from '../services/db';

interface Term2SheetProps {
  students: Student[];
  subjects: Subject[];
  grades: any;
  filterGrade: GradeLevel | 'all';
  filterClass: string;
  schoolInfo: SchoolInfo;
  descriptors: GradeDescriptor[];
  layout?: 'default' | 'a3';
  resultView?: 'scores' | 'colors' | 'evaluations' | 'success';
}

const Term2Sheet: React.FC<Term2SheetProps> = ({
  students,
  subjects,
  grades,
  filterGrade,
  filterClass,
  schoolInfo,
  descriptors,
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
      let totalScore = 0;
      let minTotal = 0;

      relevantSubjects.forEach((sub) => {
        const record = stGrades[sub.id]?.term2;
        const safeVal = (v: any) => (v === undefined || v === -1 ? 0 : v);
        const examVal = record?.exam;
        const total = safeVal(record?.work) + safeVal(record?.practical) + safeVal(examVal);

        let failed = false;
        let reason = '';

        if (isRemedialGrade) {
          if (total < sub.maxScore * 0.5) {
            failed = true;
            reason = 'دون المستوى';
          }
        } else {
          if (sub.examScore > 0 && examVal === -1) {
            failed = true;
            reason = 'غياب';
          } else if (sub.examScore > 0 && safeVal(examVal) < sub.examScore * EXAM_THRESHOLD) {
            failed = true;
            reason = 'تحريري';
          } else if (total < sub.minScore / 2) {
            failed = true;
            reason = 'رسوب';
          }
        }

        if (failed && sub.isBasic) {
          failedSubjects.push(sub.name);
          failureReasons[sub.name] = reason;
        }

        if (sub.isAddedToTotal) {
          totalScore += total;
          minTotal += sub.minScore / 2;
        }
      });

      if (!isRemedialGrade && minTotal > 0 && totalScore < minTotal) {
        if (!failedSubjects.includes('المجموع العام')) {
          failedSubjects.push('المجموع العام');
          failureReasons['المجموع العام'] = 'دون الحد';
        }
      }

      calculated[student.id] = {
        status: failedSubjects.length > 0 ? (isRemedialGrade ? 'Remedial' : 'Fail') : 'Pass',
        failedSubjects,
        failureReasons
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

  const safeVal = (v: any) => (v === undefined || v === -1 ? 0 : v);

  const fmt = (v: any) => {
    if (v === -1) return <span className="text-red-600 font-black">غ</span>;
    if (v === 0 || v === undefined || v === null) return '';
    return v;
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
  const totalCols = allSubjects.reduce((acc, sub) => acc + getSubColsCount(sub), 0);
  const splitTarget = Math.ceil(totalCols / 2);
  const subjectSplit = useMemo(() => {
    if (layout !== 'a3') {
      return { first: allSubjects, second: [] as Subject[] };
    }
    let acc = 0;
    const first: Subject[] = [];
    const second: Subject[] = [];
    allSubjects.forEach((sub) => {
      const cols = getSubColsCount(sub);
      if (acc < splitTarget || first.length === 0) {
        first.push(sub);
        acc += cols;
      } else {
        second.push(sub);
      }
    });
    return { first, second };
  }, [allSubjects, splitTarget, layout]);

  const renderHeader = (subjectsList: Subject[], includeStudentColumns: boolean) => (
    <thead>
      <tr className="bg-slate-200">
        {includeStudentColumns && (
          <>
            <th rowSpan={3} className="w-8">م</th>
            <th rowSpan={3} className="min-w-[140px]">اسم الطالب</th>
            <th rowSpan={3} className="w-12">جلوس</th>
          </>
        )}
        {subjectsList.filter((sub) => sub.isAddedToTotal).length > 0 && (
          <th
            colSpan={subjectsList
              .filter((sub) => sub.isAddedToTotal)
              .reduce((acc, s) => acc + getSubColsCount(s), 0)}
            className="bg-blue-100/50 py-1 border-2 border-black"
          >
            المواد الأساسية
          </th>
        )}
        {subjectsList.filter((sub) => !sub.isAddedToTotal).length > 0 && (
          <th
            colSpan={subjectsList
              .filter((sub) => !sub.isAddedToTotal)
              .reduce((acc, s) => acc + getSubColsCount(s), 0)}
            className="bg-green-100/50 py-1 border-2 border-black"
          >
            مواد لا تضاف للمجموع
          </th>
        )}
        {includeStudentColumns && <th rowSpan={3} className="w-28 border-2 border-black">الحالة</th>}
      </tr>
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
            <th className="w-7">أعمال</th>
            {sub.practicalScore > 0 && <th className="w-7">عملي</th>}
            {sub.examScore > 0 && <th className="w-7">تحريري</th>}
            <th className="bg-emerald-100 font-black w-9">جملة</th>
          </React.Fragment>
        ))}
      </tr>
    </thead>
  );

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
              {subjectsList.map((sub) => {
                const rec = grades[student.id]?.[sub.id]?.term2;
                const total = safeVal(rec?.work) + safeVal(rec?.practical) + safeVal(rec?.exam);
                const isSubFail = !res.status.includes('Pass') && res.failedSubjects.includes(sub.name);
                const percent = sub.maxScore > 0 ? (total / sub.maxScore) * 100 : 0;
                const descriptor = getDescriptor(percent);
                const totalCellClass =
                  resultView === 'scores'
                    ? `font-black bg-emerald-100/50 ${isSubFail ? 'text-red-600' : ''}`
                    : `font-black ${isSubFail ? 'text-red-600' : ''}`;
                const totalCellStyle =
                  resultView === 'colors' && descriptor ? { backgroundColor: descriptor.color } : undefined;
                const renderTotalValue = () => {
                  if (resultView === 'scores') return total || '';
                  if (resultView === 'evaluations') return descriptor?.label || '';
                  if (resultView === 'success') return isSubFail ? 'لم يجتز' : 'اجتاز';
                  return '';
                };
                return (
                  <React.Fragment key={sub.id}>
                    <td>{resultView === 'scores' ? fmt(rec?.work) : ''}</td>
                    {sub.practicalScore > 0 && <td>{resultView === 'scores' ? fmt(rec?.practical) : ''}</td>}
                    {sub.examScore > 0 && <td>{resultView === 'scores' ? fmt(rec?.exam) : ''}</td>}
                    <td className={totalCellClass} style={totalCellStyle}>
                      {renderTotalValue()}
                    </td>
                  </React.Fragment>
                );
              })}
              {includeStudentColumns && (
                <td className={`p-0.5 leading-tight ${res.status === 'Pass' ? 'text-green-700' : 'text-red-700'}`}>
                  <span className="font-black text-[9px]">
                    {res.status === 'Pass' ? 'ناجح' : res.status === 'Remedial' ? 'علاجي' : 'دور ثان'}
                  </span>
                </td>
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
                  <td></td>
                  {sub.practicalScore > 0 && <td></td>}
                  {sub.examScore > 0 && <td></td>}
                  <td></td>
                </React.Fragment>
              ))}
              {includeStudentColumns && <td></td>}
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
            <div className="official-sheet-page" id={pIdx === 0 ? 'term2-sheet-print-area' : undefined}>
              <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-2">
                <div className="text-[10px] font-bold leading-tight">
                  <p>إدارة: {schoolInfo.educationalAdministration}</p>
                  <p>مدرسة: {schoolInfo.schoolName}</p>
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-black">شيت رصد درجات الفصل الدراسي الثاني</h2>
                  <p className="text-xs font-bold text-slate-700">
                    {schoolInfo.academicYear} | الصف: {filterGrade === 'all' ? 'الكل' : GRADE_LABELS[filterGrade]}
                  </p>
                </div>
                <div className="text-[10px] font-bold text-left">
                  <p>صفحة: {pIdx + 1}</p>
                  <p>الفصل: {filterClass === 'all' ? 'الكل' : filterClass}</p>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <table className="official-table text-[10px]">
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
                  <div className="text-[10px] font-bold leading-tight">
                    <p>إدارة: {schoolInfo.educationalAdministration}</p>
                    <p>مدرسة: {schoolInfo.schoolName}</p>
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl font-black">شيت رصد درجات الفصل الدراسي الثاني</h2>
                    <p className="text-xs font-bold text-slate-700">
                      {schoolInfo.academicYear} | الصف: {filterGrade === 'all' ? 'الكل' : GRADE_LABELS[filterGrade]}
                    </p>
                  </div>
                  <div className="text-[10px] font-bold text-left">
                    <p>صفحة: {pIdx + 1} (استكمال)</p>
                    <p>الفصل: {filterClass === 'all' ? 'الكل' : filterClass}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden">
                  <table className="official-table text-[10px]">
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

export default Term2Sheet;
