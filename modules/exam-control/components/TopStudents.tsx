import React, { useState } from 'react';
import { Trophy, Printer, Award, Calendar, GraduationCap } from 'lucide-react';
import { Student, Subject, GradeLevel, GRADE_LABELS } from '../examControl.types';
import { db } from '../services/db';
import { exportUtils } from '../services/exportUtils';

interface TopStudentsProps {
  students: Student[];
  subjects: Subject[];
  grades: any;
  results: any;
  filterGrade: GradeLevel | 'all';
  sheetMode?: 'term1' | 'term2' | 'annual';
}

const TopStudents: React.FC<TopStudentsProps> = ({ students, results, filterGrade, sheetMode = 'annual' }) => {
  const [topCount, setTopCount] = useState(10);
  const schoolInfo = db.getSchoolInfo();

  const sortedBaseList = students
    .filter((s) => (filterGrade === 'all' || s.gradeLevel === filterGrade) && results[s.id]?.status === 'Pass')
    .sort((a, b) => (results[b.id]?.percent || 0) - (results[a.id]?.percent || 0))
    .slice(0, topCount);

  let lastPercent = -1;
  let lastRank = 0;

  const topStudentsList = sortedBaseList.map((student) => {
    const currentPercent = results[student.id]?.percent || 0;
    let rank;

    if (currentPercent === lastPercent) {
      rank = lastRank;
    } else {
      rank = lastRank + 1;
      lastRank = rank;
      lastPercent = currentPercent;
    }

    return {
      ...student,
      rank,
      result: results[student.id]
    };
  });

  const termLabel =
    sheetMode === 'term1'
      ? 'الفصل الدراسي الأول'
      : sheetMode === 'term2'
      ? 'الفصل الدراسي الثاني'
      : 'نهاية العام الدراسي';
  const gradeLabel = filterGrade === 'all' ? 'جميع الصفوف' : GRADE_LABELS[filterGrade];
  const formatGovernorate = (value?: string) => {
    if (!value) return 'مديرية التربية والتعليم بـ ........';
    const clean = value.trim();
    if (/مديرية التربية والتعليم/.test(clean)) return clean;
    return `مديرية التربية والتعليم بـ ${clean}`;
  };

  const formatAdministration = (value?: string) => {
    if (!value) return 'إدارة ........ التعليمية';
    let clean = value.trim();
    const hasPrefix = /^(إدارة|ادارة)\b/.test(clean);
    const hasSuffix = /التعليمية/.test(clean);
    if (!hasPrefix) clean = `إدارة ${clean}`;
    if (!hasSuffix) clean = `${clean} التعليمية`;
    return clean;
  };

  const formatSchoolName = (value?: string) => {
    if (!value) return 'مدرسة ........';
    const clean = value.trim();
    if (/^مدرسة\b/.test(clean)) return clean;
    return `مدرسة ${clean}`;
  };
  const handlePrint = () => {
    exportUtils.print('top-students-print-area', 'portrait');
  };

  return (
    <div className="p-8 bg-white min-h-screen font-official" dir="rtl">
      <div id="top-students-print-area">
      <div className="mb-10 border-b-[3px] border-double border-slate-800 pb-8">
        <div className="flex justify-between items-start mb-6">
          <div className="text-right font-black text-[13px] text-slate-800 space-y-1 w-1/3">
            <p>{formatGovernorate(schoolInfo.governorate)}</p>
            <p>{formatAdministration(schoolInfo.educationalAdministration)}</p>
            <p>{formatSchoolName(schoolInfo.schoolName)}</p>
          </div>

          <div className="text-center w-1/3 flex flex-col items-center">
            {schoolInfo.logo ? (
              <img src={schoolInfo.logo} className="h-20 w-20 object-contain mb-3" alt="logo" />
            ) : (
              <div className="w-16 h-16 bg-slate-50 border-2 border-dashed rounded-full flex items-center justify-center mb-3">
                <Trophy size={32} className="text-yellow-600 opacity-30" />
              </div>
            )}
          </div>

          <div className="text-left font-bold text-[13px] text-slate-800 space-y-1 w-1/3">
            <div className="flex items-center justify-end gap-2">
              <Calendar size={14} className="text-slate-400" /> العام الدراسي: {schoolInfo.academicYear}
            </div>
            <div className="flex items-center justify-end gap-2">
              <GraduationCap size={14} className="text-slate-400" /> {termLabel}
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-2">
              تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}
            </p>
          </div>
        </div>

        <div className="text-center space-y-3">
          <h1 className="text-3xl font-black text-slate-900 underline underline-offset-[12px] decoration-yellow-500">
            تقرير أوائل الطلاب
          </h1>
          <p className="text-xl font-bold text-blue-800 pt-2">
            للصف{' '}
            <span className="text-slate-900 border-b-2 border-slate-300 px-4">{gradeLabel}</span> للعام الدراسي{' '}
            <span className="text-slate-900 border-b-2 border-slate-300 px-4">{schoolInfo.academicYear}</span>{' '}
            {termLabel}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-8 no-print bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-100 p-2 rounded-xl text-yellow-700 shadow-inner">
            <Trophy size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 leading-tight">قائمة الأوائل</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top Students Intelligent List</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">عدد الطلاب:</span>
            <select
              value={topCount}
              onChange={(e) => setTopCount(Number(e.target.value))}
              className="border-2 border-slate-200 rounded-xl px-4 py-2 bg-white text-sm font-black text-blue-600 outline-none focus:ring-4 focus:ring-blue-100 transition-all cursor-pointer"
            >
              {[5, 10, 15, 20, 50, 100].map((c) => (
                <option key={c} value={c}>
                  {c} طلاب
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handlePrint}
            className="bg-slate-900 text-white px-8 py-2.5 rounded-xl flex items-center gap-3 font-black hover:bg-black transition shadow-xl active:scale-95"
          >
            <Printer size={20} /> طباعة التقرير
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-100 overflow-hidden">
        <table className="w-full border-collapse text-right">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="p-5 w-28 text-center font-black text-sm uppercase tracking-widest border-l border-slate-700">
                المركز
              </th>
              <th className="p-5 font-black text-sm border-l border-slate-700">اسم الطالـــــــب</th>
              <th className="p-5 font-black text-sm border-l border-slate-700">الفصل</th>
              <th className="p-5 font-black text-sm border-l border-slate-700">المجموع الكلي</th>
              <th className="p-5 font-black text-sm">النسبة المئوية %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {topStudentsList.map((st) => (
              <tr key={st.id} className="hover:bg-blue-50/20 transition-colors group">
                <td className="p-5 text-center">
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl font-black text-2xl transition-transform group-hover:scale-110 ${
                      st.rank === 1
                        ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-100'
                        : st.rank === 2
                        ? 'bg-slate-300 text-slate-700 shadow-md'
                        : st.rank === 3
                        ? 'bg-orange-400 text-white shadow-md'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {st.rank}
                  </div>
                </td>
                <td className="p-5 font-black text-slate-800 text-lg">{st.name}</td>
                <td className="p-5">
                  <span className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-xs font-black border border-slate-200">
                    {st.classroom}
                  </span>
                </td>
                <td className="p-5 font-black text-slate-800 text-xl">
                  {st.result?.totalScore.toFixed(1)}
                  <span className="text-[11px] text-slate-300 font-bold mr-2">/ {st.result?.maxTotal}</span>
                </td>
                <td className="p-5">
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-6 py-2 rounded-xl font-black text-xl border ${
                        st.rank === 1
                          ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}
                    >
                      {st.result?.percent.toFixed(1)}%
                    </span>
                    <div className="flex-1 max-w-[100px] h-2 bg-slate-100 rounded-full overflow-hidden no-print">
                      <div className="h-full bg-blue-500" style={{ width: `${st.result?.percent}%` }}></div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {topStudentsList.length === 0 && (
          <div className="p-32 text-center text-slate-300 font-bold flex flex-col items-center gap-6">
            <Trophy size={80} className="opacity-10" />
            <p className="text-xl font-black">لا توجد بيانات طلاب ناجحين مسجلة للعرض حالياً</p>
          </div>
        )}
      </div>

      <div className="mt-20 grid grid-cols-3 gap-12 text-center font-black text-lg px-10">
        <div className="space-y-12">
          <p className="underline underline-offset-8 decoration-2">يعتمد مدير المدرسة</p>
          <p className="text-slate-800">{schoolInfo.managerName || '........................'}</p>
        </div>
        <div className="space-y-12 flex flex-col items-center">
          <p className="underline underline-offset-8 decoration-2">خاتم المدرسة</p>
          <div className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-full mt-2"></div>
        </div>
        <div className="space-y-12">
          <p className="underline underline-offset-8 decoration-2">رئيس الكنترول</p>
          <p className="text-slate-800">{schoolInfo.controlHead || '........................'}</p>
        </div>
      </div>

      <div className="mt-12 p-5 bg-blue-50 rounded-2xl border-2 border-blue-100 no-print flex items-start gap-4">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shadow-inner">
          <Award size={24} />
        </div>
        <div className="space-y-1">
          <p className="font-black text-blue-900 text-sm">ملاحظات الترتيب المتتالي (Dense Rank):</p>
          <p className="text-xs text-blue-700 leading-relaxed font-bold">
            • في حالة تساوي المجموع والنسبة المئوية، يحصل الطالبان على نفس المركز تلقائياً.<br />
            • الطالب الذي يليهم يحصل على المركز التالي مباشرة (مثلاً: 1، 1 مكرر، 2) دون القفز في التسلسل الرقمي، لضمان
            استحقاق كافة الطلاب لمراكزهم.
          </p>
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-dashed border-slate-200 text-[8px] text-slate-300 font-mono tracking-[0.3em] uppercase text-left opacity-50">
        Eagle Eye Control System - Smart Reporting Module - 2025
      </div>
      </div>
    </div>
  );
};

export default TopStudents;
