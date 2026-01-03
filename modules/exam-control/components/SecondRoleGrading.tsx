
import React, { useState, useMemo } from 'react';
import { Search, Lock, Users, PenTool, Loader2, CheckCircle2, Info, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Student, Subject, GradesDatabase, GradeLevel, GRADE_LABELS } from '../examControl.types';
import { db } from '../services/db';

interface Props {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
  onUpdate: (grades: GradesDatabase) => void;
}

const SecondRoleGrading: React.FC<Props> = ({ students, subjects, grades, onUpdate }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('p3');
  const [viewMode, setViewMode] = useState<'standard' | 'secret'>('standard');
  const [searchTerm, setSearchTerm] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');

  const certConfig = db.getCertConfig();
  const validGrades = (Object.keys(GRADE_LABELS) as GradeLevel[]);

  const gradeSubjects = useMemo(() => 
    subjects.filter(s => s.gradeLevels?.includes(selectedGrade) && s.isBasic),
    [subjects, selectedGrade]
  );

  const isFailedInSubject = (stId: string, sub: Subject) => {
    const rec = grades[stId]?.[sub.id];
    const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
    const isAbs = (rec?.term1?.exam === -1 || rec?.term2?.exam === -1);
    
    const t1_sum = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
    const t2_sum = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
    const annualAvg = (t1_sum + t2_sum) / 2;

    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;

    if (selectedGrade === 'p1' || selectedGrade === 'p2') {
        return annualAvg < sub.maxScore * 0.5;
    } else {
        const passedWritten = (sub.examScore === 0) || (safeVal(rec?.term2?.exam) >= sub.examScore * EXAM_THRESHOLD);
        return isAbs || !passedWritten || annualAvg < sub.maxScore * PASS_THRESHOLD;
    }
  };

  const r2Students = useMemo(() => {
    return students.filter(st => {
      if (st.gradeLevel !== selectedGrade) return false;
      const hasAnyFail = gradeSubjects.some(sub => isFailedInSubject(st.id, sub));
      if (!hasAnyFail) return false;
      const search = searchTerm.toLowerCase();
      if (viewMode === 'standard') {
          return st.name.toLowerCase().includes(search) || st.seatingNumber?.toString().includes(search);
      } else {
          return st.secretNumberSecondRole?.toString().includes(search);
      }
    }).sort((a, b) => {
        if (viewMode === 'secret') return (a.secretNumberSecondRole ?? 0) - (b.secretNumberSecondRole ?? 0);
        return (a.seatingNumber ?? 0) - (b.seatingNumber ?? 0);
    });
  }, [students, grades, selectedGrade, gradeSubjects, searchTerm, viewMode]);

  const handleGradeChange = (studentId: string, subjectId: string, value: string) => {
    let num: number = 0;
    if (value.trim() === 'غ') num = -1;
    else if (value !== '') {
        num = parseFloat(value);
        if (isNaN(num)) return;
    } else {
        const newGrades = { ...grades };
        if (newGrades[studentId]?.[subjectId]) {
            delete newGrades[studentId][subjectId].secondRole;
            onUpdate(newGrades);
            setSaveStatus('saved');
        }
        return;
    }

    const sub = subjects.find(s => s.id === subjectId);
    if (sub && num > sub.maxScore) {
        alert(`خطأ: الدرجة العظمى لهذه المادة هي ${sub.maxScore}`);
        return;
    }

    setSaveStatus('saving');
    const newGrades = { ...grades };
    if (!newGrades[studentId]) newGrades[studentId] = {};
    if (!newGrades[studentId][subjectId]) {
        newGrades[studentId][subjectId] = { term1: { work: 0, practical: 0, exam: 0 }, term2: { work: 0, practical: 0, exam: 0 } };
    }
    const currentR2 = newGrades[studentId][subjectId].secondRole || { exam: 0, isExcused: false };
    newGrades[studentId][subjectId].secondRole = { ...currentR2, exam: num };
    onUpdate(newGrades);
    setTimeout(() => setSaveStatus('saved'), 600);
  };

  const toggleExcuse = (studentId: string, subjectId: string) => {
    setSaveStatus('saving');
    const newGrades = { ...grades };
    if (!newGrades[studentId]) newGrades[studentId] = {};
    if (!newGrades[studentId][subjectId]) {
        newGrades[studentId][subjectId] = { term1: { work: 0, practical: 0, exam: 0 }, term2: { work: 0, practical: 0, exam: 0 } };
    }
    const currentR2 = newGrades[studentId][subjectId].secondRole || { exam: 0, isExcused: false };
    newGrades[studentId][subjectId].secondRole = { ...currentR2, isExcused: !currentR2.isExcused };
    onUpdate(newGrades);
    setTimeout(() => setSaveStatus('saved'), 600);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row justify-between items-center gap-6 no-print">
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-gray-400 uppercase">الصف الدراسي</span>
                <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value as GradeLevel)} className="border-2 border-gray-100 rounded-xl p-2 font-bold text-blue-700 bg-gray-50 outline-none focus:border-blue-400">
                    {validGrades.map(g => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-gray-400 uppercase">نمط الرصد</span>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setViewMode('standard')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all text-xs font-bold ${viewMode === 'standard' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-400'}`}><Users size={14}/> الأسماء</button>
                    <button onClick={() => setViewMode('secret')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all text-xs font-bold ${viewMode === 'secret' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-400'}`}><Lock size={14}/> السري</button>
                </div>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all shadow-sm ${saveStatus === 'saving' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                {saveStatus === 'saving' ? <><Loader2 size={16} className="animate-spin" /> جاري الحفظ...</> : <><CheckCircle2 size={16} /> تم حفظ التغييرات</>}
            </div>
            <div className="relative flex-1 min-w-[200px]">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="بحث سريع..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pr-10 pl-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:border-blue-400 outline-none transition-all" />
            </div>
        </div>
      </div>

      <div className="bg-amber-50 border-r-4 border-amber-500 p-4 rounded-l-xl flex items-start gap-3 text-amber-900 shadow-sm no-print">
          <ShieldCheck size={24} className="shrink-0 text-amber-600" />
          <div className="space-y-1">
              <p className="font-black text-sm">قاعدة "النهاية الصغرى" و "العذر المقبول"</p>
              <p className="text-[10px] opacity-90 font-bold leading-relaxed">
                  قانوناً: يحصل الطالب الناجح في الدور الثاني على **درجة النجاح فقط** (النهاية الصغرى) في الشهادة. لتجاوز هذه القاعدة (في حالة الغياب بعذر مقبول في الدور الأول)، يرجى الضغط على زر <span className="inline-flex items-center bg-white px-1.5 py-0.5 rounded border border-amber-200 text-amber-600 mx-1 font-black">عذر</span> لتثبيت الدرجة كاملة.
              </p>
          </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-right border-collapse">
                  <thead>
                      <tr className="bg-slate-800 text-white">
                          <th className="p-4 w-12 text-center border-l border-slate-700">م</th>
                          {viewMode === 'standard' ? (
                              <>
                                  <th className="p-4 w-28 text-center border-l border-slate-700">الجلوس (د1)</th>
                                  <th className="p-4 min-w-[250px] border-l border-slate-700 sticky right-0 bg-slate-800 z-10 shadow-xl">اسم الطالب</th>
                              </>
                          ) : (
                              <th className="p-4 w-40 text-center border-l border-slate-700 bg-indigo-900 sticky right-0 z-10 shadow-xl font-black">السري (د2)</th>
                          )}
                          
                          {gradeSubjects.map(sub => (
                              <th key={sub.id} className="p-4 text-center border-l border-slate-700 min-w-[140px]">
                                  <div className="flex flex-col gap-1">
                                      <span className="text-xs font-black">{sub.name}</span>
                                      <div className="flex justify-center gap-2 text-[8px] opacity-60">
                                          <span>العظمى: {sub.maxScore}</span>
                                          <span className="text-amber-400">الصغرى: {sub.minScore}</span>
                                      </div>
                                  </div>
                              </th>
                          ))}
                      </tr>
                  </thead>
                  <tbody>
                      {r2Students.map((st, idx) => (
                          <tr key={st.id} className="border-b hover:bg-slate-50 transition-colors group">
                              <td className="p-4 text-center text-gray-400 font-mono text-xs border-l">{idx + 1}</td>
                              {viewMode === 'standard' ? (
                                  <>
                                      <td className="p-4 text-center font-mono font-bold text-blue-600 border-l bg-gray-50/50">{st.seatingNumber}</td>
                                      <td className="p-4 font-bold text-gray-800 border-l sticky right-0 bg-white group-hover:bg-slate-50 z-10 transition-colors shadow-sm">{st.name}</td>
                                  </>
                              ) : (
                                  <td className="p-4 text-center font-mono font-black text-indigo-700 border-l sticky right-0 bg-indigo-50/20 group-hover:bg-indigo-50/40 z-10 transition-colors shadow-sm">{st.secretNumberSecondRole || '-'}</td>
                              )}

                              {gradeSubjects.map(sub => {
                                  const isActive = isFailedInSubject(st.id, sub);
                                  const currentR2 = grades[st.id]?.[sub.id]?.secondRole;
                                  const currentGradeValue = currentR2?.exam;
                                  const isExcused = currentR2?.isExcused || false;
                                  
                                  return (
                                      <td key={sub.id} className={`p-2 text-center border-l transition-all ${!isActive ? 'bg-gray-100/50' : 'group-hover:bg-blue-50/30'}`}>
                                          {isActive ? (
                                              <div className="flex flex-col items-center gap-1">
                                                  <input 
                                                      type="text" 
                                                      inputMode="decimal"
                                                      value={currentGradeValue === -1 ? 'غ' : currentGradeValue === undefined ? '' : currentGradeValue}
                                                      onChange={e => handleGradeChange(st.id, sub.id, e.target.value)}
                                                      className={`w-full max-w-[100px] p-2 border-2 rounded-lg text-center font-black text-lg outline-none focus:ring-4 transition-all ${currentGradeValue === -1 ? 'text-red-600 border-red-200 focus:ring-red-100' : 'text-slate-800 border-slate-100 focus:border-blue-400 focus:ring-blue-100'}`}
                                                      placeholder="-"
                                                  />
                                                  <button 
                                                    onClick={() => toggleExcuse(st.id, sub.id)}
                                                    className={`text-[9px] font-black px-2 py-0.5 rounded border transition-colors ${isExcused ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-gray-400 border-gray-200 hover:border-emerald-300 hover:text-emerald-500'}`}
                                                  >
                                                      {isExcused ? 'بعذر مقبول (100%)' : 'عذر؟'}
                                                  </button>
                                              </div>
                                          ) : (
                                              <span className="text-[10px] font-bold text-gray-300 select-none">ناجح</span>
                                          )}
                                      </td>
                                  );
                              })}
                          </tr>
                      ))}
                      
                      {r2Students.length === 0 && (
                          <tr>
                              <td colSpan={viewMode === 'standard' ? gradeSubjects.length + 3 : gradeSubjects.length + 2} className="p-32 text-center text-gray-400">
                                  <div className="flex flex-col items-center gap-4">
                                      <PenTool size={64} className="opacity-10 text-gray-900" />
                                      <p className="text-xl font-bold text-gray-500">لا يوجد طلاب متعثرون للرصد حالياً</p>
                                  </div>
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
      
      <div className="flex justify-center no-print">
          <div className="bg-amber-50 border-2 border-amber-100 p-4 rounded-2xl flex items-start gap-3 max-w-2xl">
              <AlertTriangle className="text-amber-500 shrink-0" />
              <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                  تنبيه: سيقوم النظام تلقائياً باستبدال أي درجة ناجحة (أكبر من الصغرى) بدرجة النجاح الفعلية في الشهادة إذا لم يكن الطالب "بعذر مقبول". الرصد هنا يتم للدرجات الخام كما هي في أوراق الإجابة.
              </p>
          </div>
      </div>
    </div>
  );
};

export default SecondRoleGrading;
