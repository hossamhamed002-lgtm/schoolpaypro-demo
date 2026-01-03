
import React from 'react';
import { Student, Subject, GradeLevel, GRADE_LABELS, SchoolInfo, GradeDescriptor } from '../examControl.types';

interface MasterSheetProps {
  students: Student[];
  subjects: Subject[];
  grades: any;
  results: any;
  filterGrade: GradeLevel | 'all';
  filterClass: string;
  sheetMode: 'term1' | 'term2' | 'annual';
  schoolInfo: SchoolInfo;
  descriptors: GradeDescriptor[];
}

const MasterSheet: React.FC<MasterSheetProps> = ({ 
  students, subjects, grades, results, filterGrade, filterClass, sheetMode, schoolInfo, descriptors 
}) => {
  
  const filteredStudents = students
    .filter(s => (filterGrade === 'all' || s.gradeLevel === filterGrade) && (filterClass === 'all' || s.classroom === filterClass))
    .sort((a, b) => (a.seatingNumber || 999999) - (b.seatingNumber || 999999));

  const activeSubjects = subjects.filter(sub => filterGrade === 'all' || (sub.gradeLevels && sub.gradeLevels.includes(filterGrade as GradeLevel)));
  const basicSubjects = activeSubjects.filter(s => s.isAddedToTotal);

  const safeVal = (v: number | undefined) => (v === undefined || v === -1) ? 0 : v;
  
  // دالة التنسيق: إخفاء الأصفار وعرض الغياب
  const fmt = (v: number | undefined) => {
    if (v === -1) return <span className="text-red-600 font-bold">غ</span>;
    if (v === 0 || v === undefined || v === null) return ""; // إخفاء الصفر
    return v;
  };

  const getDescriptor = (percent: number) => {
    const sorted = [...descriptors].sort((a,b) => b.minPercent - a.minPercent);
    return sorted.find(d => percent >= d.minPercent) || { label: '-', color: 'transparent' };
  };

  return (
    <div id="master-sheet-print-area" className="bg-white p-[5mm] min-h-screen" dir="rtl">
        <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-2">
            <div className="text-right space-y-0.5 w-1/3 text-[10px] font-bold">
                <p>إدارة: {schoolInfo.educationalAdministration}</p>
                <p>مدرسة: {schoolInfo.schoolName}</p>
                <p>الصف: {filterGrade === 'all' ? 'الكل' : GRADE_LABELS[filterGrade]}</p>
            </div>
            <div className="text-center w-1/3 flex flex-col items-center">
                <h2 className="text-lg font-black underline">شيت رصد الدرجات المجمع</h2>
                <p className="text-[10px] font-bold mt-0.5">
                    {sheetMode === 'annual' ? 'نتائج العام الدراسي' : sheetMode === 'term1' ? 'نتائج الفصل الدراسي الأول' : 'نتائج الفصل الدراسي الثاني'}
                </p>
                <p className="text-[9px]">{schoolInfo.academicYear}</p>
            </div>
            <div className="text-left w-1/3 text-[10px] font-bold">
                <p>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
                <p>الفصل: {filterClass === 'all' ? 'الكل' : filterClass}</p>
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-[8px] border-collapse border-2 border-black">
                <thead>
                    <tr className="bg-gray-100">
                        <th rowSpan={3} className="border border-black p-0.5 w-6 text-center">م</th>
                        <th rowSpan={3} className="border border-black p-0.5 min-w-[120px]">اسم الطالـــــب</th>
                        <th rowSpan={3} className="border border-black p-0.5 w-10 text-center">رقم الجلوس</th>
                        {basicSubjects.map(sub => (
                            <th key={sub.id} colSpan={sheetMode === 'annual' ? (sub.practicalScore > 0 ? 9 : 7) : (sub.practicalScore > 0 ? 4 : 3)} className="border border-black p-0.5 font-bold bg-gray-50 text-center">
                                {sub.name}
                            </th>
                        ))}
                        <th rowSpan={3} className="border border-black p-0.5 min-w-[100px] text-center">النتيجة / ملاحظات</th>
                    </tr>
                    <tr className="bg-white">
                        {basicSubjects.map(sub => (
                            sheetMode === 'annual' ? (
                                <React.Fragment key={`${sub.id}-l2`}>
                                    <th colSpan={sub.practicalScore > 0 ? 4 : 3} className="border border-black bg-blue-50/50 text-center text-[7px]">ت1</th>
                                    <th colSpan={sub.practicalScore > 0 ? 4 : 3} className="border border-black bg-green-50/50 text-center text-[7px]">ت2</th>
                                    <th className="border border-black font-bold text-center text-[7px]">المتوسط</th>
                                </React.Fragment>
                            ) : null
                        ))}
                    </tr>
                    <tr className="text-[7px] bg-white">
                        {basicSubjects.map(sub => {
                            const isP = sub.practicalScore > 0;
                            const getCols = (t: string) => [
                                <th key={`${sub.id}-${t}-w`} className="border border-black text-center">أعمال</th>,
                                isP && <th key={`${sub.id}-${t}-p`} className="border border-black text-center">عملي</th>,
                                <th key={`${sub.id}-${t}-e`} className="border border-black text-center">تحريري</th>,
                                <th key={`${sub.id}-${t}-s`} className="border border-black text-center font-bold">مجموع</th>
                            ].filter(Boolean);

                            if (sheetMode === 'annual') {
                                return (
                                    <React.Fragment key={`${sub.id}-l3`}>
                                        {getCols('ت1')}
                                        {getCols('ت2')}
                                        <th className="border border-black bg-yellow-50 text-center font-bold">سنوي</th>
                                    </React.Fragment>
                                );
                            }
                            return getCols(sheetMode === 'term1' ? 'ت1' : 'ت2');
                        })}
                    </tr>
                </thead>
                <tbody>
                    {filteredStudents.map((student, idx) => {
                        const res = results[student.id];
                        const stGrades = grades[student.id] || {};
                        return (
                            <tr key={student.id} className="text-center h-6 hover:bg-gray-50">
                                <td className="border border-black">{idx + 1}</td>
                                <td className="border border-black text-right px-1 font-bold whitespace-nowrap overflow-hidden text-ellipsis">{student.name}</td>
                                <td className="border border-black font-mono font-bold">{student.seatingNumber}</td>
                                {basicSubjects.map(sub => {
                                    const record = stGrades[sub.id];
                                    const t1t = safeVal(record?.term1?.work) + safeVal(record?.term1?.practical) + safeVal(record?.term1?.exam);
                                    const t2t = safeVal(record?.term2?.work) + safeVal(record?.term2?.practical) + safeVal(record?.term2?.exam);
                                    const isSubFailed = res?.failedSubjects.includes(sub.name);

                                    if (sheetMode === 'annual') {
                                        const avg = (t1t + t2t) / 2;
                                        const desc = getDescriptor((avg / sub.maxScore) * 100);
                                        const cellBg = isSubFailed ? (res.status === 'Remedial' ? '#fef3c7' : '#fee2e2') : (desc.color !== 'transparent' ? desc.color : 'transparent');
                                        return (
                                            <React.Fragment key={sub.id}>
                                                <td className="border border-black">{fmt(record?.term1?.work)}</td>
                                                {sub.practicalScore > 0 && <td className="border border-black">{fmt(record?.term1?.practical)}</td>}
                                                <td className="border border-black">{fmt(record?.term1?.exam)}</td>
                                                <td className="border border-black font-bold bg-blue-50/10">{fmt(t1t)}</td>
                                                <td className="border border-black">{fmt(record?.term2?.work)}</td>
                                                {sub.practicalScore > 0 && <td className="border border-black">{fmt(record?.term2?.practical)}</td>}
                                                <td className="border border-black">{fmt(record?.term2?.exam)}</td>
                                                <td className="border border-black font-bold bg-green-50/10">{fmt(t2t)}</td>
                                                <td className="border border-black font-black" style={{ backgroundColor: cellBg }}>{fmt(avg)}</td>
                                            </React.Fragment>
                                        );
                                    }
                                    const termData = sheetMode === 'term1' ? record?.term1 : record?.term2;
                                    const termTotal = sheetMode === 'term1' ? t1t : t2t;
                                    return (
                                        <React.Fragment key={sub.id}>
                                            <td className="border border-black">{fmt(termData?.work)}</td>
                                            {sub.practicalScore > 0 && <td className="border border-black">{fmt(termData?.practical)}</td>}
                                            <td className="border border-black">{fmt(termData?.exam)}</td>
                                            <td className={`border border-black font-bold ${isSubFailed ? 'bg-red-50 text-red-600' : 'bg-gray-50'}`}>{fmt(termTotal)}</td>
                                        </React.Fragment>
                                    );
                                })}
                                <td className={`border border-black p-0.5 font-bold text-[7px] ${res?.status === 'Fail' ? 'bg-red-50 text-red-700' : res?.status === 'Remedial' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-50 text-green-700'}`}>
                                    {res?.status === 'Pass' ? 'ناجح' : (
                                        <div className="flex flex-col gap-0.5 leading-tight">
                                            <span className="font-black text-[8px]">{res?.status === 'Remedial' ? 'برنامج علاجي' : 'دور ثان'}</span>
                                            {res?.failedSubjects.map((s: string, i: number) => <span key={i} className="font-normal opacity-90 text-[6px] text-right">- {s}: {res?.failureReasons[s]}</span>)}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        <div className="mt-4 text-[8px] border-t pt-2 border-gray-300">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-right">
              <h4 className="font-bold mb-1 text-[9px] text-gray-700">شروط النجاح المطبقة:</h4>
              <ul className="list-disc mr-4 space-y-0.5 text-[7px]">
                <li className="text-blue-600 font-bold">الصف الأول والثاني الإعدادي:</li>
                <li>• نسبة الحضور لا تقل عن 85%</li>
                <li>• الحصول على 50% من مجموع كل مادة</li>
                <li className="mt-1 text-red-600 font-bold">الصف الثالث الإعدادي:</li>
                <li>• الغياب عن الامتحان = رسوب</li>
                <li>• 30% من ورقة الامتحان مع قاعدة الرفع</li>
              </ul>
            </div>
            <div className="text-center">
              <h4 className="font-bold mb-1 text-[9px] text-gray-700">شرح الرموز:</h4>
              <div className="flex flex-wrap justify-center gap-2 text-[7px]">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-50 border border-green-200"></div><span>ناجح</span></div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-50 border border-red-200"></div><span>دور ثان</span></div>
                <div className="flex items-center gap-1"><span className="text-red-600 font-bold">غ</span><span>غياب</span></div>
              </div>
            </div>
            <div className="text-left">
              <h4 className="font-bold mb-1 text-[9px] text-gray-700">قاعدة الرفع لـ ع3:</h4>
              <p className="text-[7px]">ينجح الطالب في شرط الـ 30% تحريري إذا حصل عليها في الترم الثاني أو في متوسط العام.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 text-center font-bold text-[10px]">
            <div>مسؤول الكنترول / .............</div>
            <div>رئيس اللجنة / .............</div>
            <div>يعتمد مدير المدرسة / .............</div>
        </div>
    </div>
  );
};

export default MasterSheet;
