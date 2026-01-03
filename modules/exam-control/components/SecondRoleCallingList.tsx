
import React, { useMemo, useState } from 'react';
import { Printer, FileSpreadsheet, ClipboardList, Grid, AlertCircle, Info } from 'lucide-react';
import { Student, Subject, GradesDatabase, GradeLevel, GRADE_LABELS, ExamCommittee } from '../examControl.types';
import { db } from '../services/db';
import { exportUtils } from '../services/exportUtils';

interface Props {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
}

const SecondRoleCallingList: React.FC<Props> = ({ students, subjects, grades }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('p3');
  const [viewMode, setViewMode] = useState<'subject' | 'committee'>('subject');
  const [selectedId, setSelectedId] = useState<string>('');
  
  const schoolInfo = db.getSchoolInfo();
  const certConfig = db.getCertConfig();
  const committees = db.getSecondRoleCommittees();

  const gradeSubjects = subjects.filter(s => s.gradeLevels?.includes(selectedGrade) && s.isBasic);
  const gradeCommittees = committees.filter(c => c.gradeLevel === selectedGrade);

  const callingList = useMemo(() => {
    if (!selectedId) return [];
    
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;

    let baseList = students.filter(st => {
      if (st.gradeLevel !== selectedGrade) return false;
      
      // إذا كان العرض حسب اللجنة، يجب أن يكون الطالب موزوعاً عليها
      if (viewMode === 'committee' && st.committeeIdSecondRole !== selectedId) return false;

      const stGrades = grades[st.id] || {};
      let isR2Candidate = false;
      
      const targetSubs = viewMode === 'subject' 
          ? gradeSubjects.filter(s => s.id === selectedId)
          : gradeSubjects;

      targetSubs.forEach(sub => {
        const rec = stGrades[sub.id];
        const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
        const isAbs = (rec?.term1?.exam === -1 || rec?.term2?.exam === -1);
        
        const t1_sum = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
        const t2_sum = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
        const annualAvg = (t1_sum + t2_sum) / 2;

        if (selectedGrade === 'p1' || selectedGrade === 'p2') {
             if (annualAvg < sub.maxScore * 0.5) isR2Candidate = true;
        } else {
             const t2_exam_val = safeVal(rec?.term2?.exam);
             const passedWritten = (sub.examScore === 0) || (t2_exam_val >= sub.examScore * EXAM_THRESHOLD);
             if (isAbs || !passedWritten || annualAvg < sub.maxScore * PASS_THRESHOLD) isR2Candidate = true;
        }
      });

      return isR2Candidate;
    });

    return baseList.sort((a, b) => (a.seatingNumber || 0) - (b.seatingNumber || 0));
  }, [students, grades, selectedGrade, selectedId, subjects, certConfig, viewMode]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex flex-wrap items-center gap-3">
            <select value={selectedGrade} onChange={(e) => { setSelectedGrade(e.target.value as GradeLevel); setSelectedId(''); }} className="border rounded-lg p-2 bg-gray-50 font-bold text-blue-700 outline-none">{(Object.keys(GRADE_LABELS) as GradeLevel[]).map(g => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}</select>
            <div className="bg-gray-100 p-1 rounded-lg flex">
                <button onClick={() => { setViewMode('subject'); setSelectedId(''); }} className={`px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 ${viewMode === 'subject' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-50'}`}><ClipboardList size={14}/> حسب المادة</button>
                <button onClick={() => { setViewMode('committee'); setSelectedId(''); }} className={`px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 ${viewMode === 'committee' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-50'}`}><Grid size={14}/> حسب اللجنة</button>
            </div>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className={`border rounded-lg p-2 bg-white font-bold outline-none min-w-[200px] ${viewMode === 'subject' ? 'text-red-700' : 'text-emerald-700'}`}>
                <option value="">-- {viewMode === 'subject' ? 'اختر المادة' : 'اختر اللجنة'} --</option>
                {viewMode === 'subject' ? gradeSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>) : gradeCommittees.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
        </div>
        <div className="flex gap-2">
            <button onClick={() => exportUtils.print('r2-calling-area')} disabled={!selectedId} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition hover:bg-gray-900 disabled:opacity-50"><Printer size={18}/> طباعة الكشف</button>
        </div>
      </div>

      {/* التنبيه الخاص برقم الجلوس */}
      <div className="bg-indigo-50 border-r-4 border-indigo-500 p-3 rounded-l-lg flex items-center gap-3 text-indigo-800 no-print">
          <Info size={20} className="shrink-0" />
          <p className="text-xs font-bold">ملاحظة: أرقام الجلوس الموضحة بالكشف هي أرقام جلوس الدور الأول المعتمدة لكل طالب.</p>
      </div>

      {viewMode === 'committee' && selectedId && callingList.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-800 no-print animate-pulse">
              <AlertCircle size={24} />
              <p className="font-bold">تنبيه: الكشف فارغ؟ تأكد من الذهاب إلى تبويب "لجان الدور الثاني" والضغط على زر "توزيع المرحلين تلقائياً" بعد إنشاء لجانك.</p>
          </div>
      )}

      {selectedId ? (
          <div id="r2-calling-area" className="bg-white p-12 rounded border-2 border-black text-black font-sans" dir="rtl">
              <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
                  <div className="text-right font-bold text-sm leading-relaxed">
                      <p>{schoolInfo.educationalAdministration}</p>
                      <p>{schoolInfo.schoolName}</p>
                  </div>
                  <div className="text-center">
                      <h2 className="text-2xl font-black underline underline-offset-4 mb-2">كشف مناداة الدور الثاني</h2>
                      <h3 className="text-xl font-bold">
                          {viewMode === 'subject' ? `مادة: ${subjects.find(s => s.id === selectedId)?.name}` : `لجنة: ${committees.find(c => c.id === selectedId)?.name} (${committees.find(c => c.id === selectedId)?.location})`}
                      </h3>
                      <p className="font-bold text-gray-700 mt-2">{GRADE_LABELS[selectedGrade]} | العام الدراسي {schoolInfo.academicYear}</p>
                  </div>
                  <div className="w-24">
                      {schoolInfo.logo && <img src={schoolInfo.logo} className="h-16 w-16 object-contain" alt="logo" />}
                  </div>
              </div>

              <table className="w-full text-center border-collapse border-2 border-black font-bold">
                  <thead>
                      <tr className="bg-gray-100 h-12">
                          <th className="border-2 border-black p-2 w-16">م</th>
                          <th className="border-2 border-black p-2 text-right pr-6">اسم الطالب</th>
                          <th className="border-2 border-black p-2 w-32">رقم الجلوس (د1)</th>
                          {viewMode === 'committee' ? <th className="border-2 border-black p-2 w-48">مواد الدور الثاني</th> : <th className="border-2 border-black p-2 w-32">ملاحظات</th>}
                      </tr>
                  </thead>
                  <tbody>
                      {callingList.map((st, idx) => {
                          const failedSubs = gradeSubjects.filter(sub => {
                              const rec = grades[st.id]?.[sub.id], safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
                              const t1 = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
                              const t2 = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
                              const annualAvg = (t1 + t2) / 2;
                              const isRemedial = selectedGrade === 'p1' || selectedGrade === 'p2';
                              if (isRemedial) return annualAvg < sub.maxScore * 0.5;
                              return rec?.term1?.exam === -1 || rec?.term2?.exam === -1 || annualAvg < sub.maxScore * (certConfig.minPassingPercent/100) || safeVal(rec?.term2?.exam) < sub.examScore * (certConfig.minExamPassingPercent/100);
                          });
                          
                          return (
                          <tr key={st.id} className="h-12 hover:bg-gray-50 transition-colors">
                              <td className="border-2 border-black">{idx + 1}</td>
                              <td className="border-2 border-black text-right pr-6 font-black">{st.name}</td>
                              <td className="border-2 border-black font-mono text-xl">{st.seatingNumber}</td>
                              <td className="border-2 border-black text-[10px] font-medium p-1">
                                  {viewMode === 'committee' ? (
                                      <div className="flex flex-wrap gap-1 justify-center">
                                          {failedSubs.map((fs, i) => <span key={i} className="bg-gray-50 border px-1.5 py-0.5 rounded">{fs.name}</span>)}
                                      </div>
                                  ) : ''}
                              </td>
                          </tr>
                          );
                      })}
                      {callingList.length === 0 && (
                          <tr><td colSpan={4} className="p-20 text-center text-gray-400 italic">لا يوجد طلاب مستهدفون في هذا الكشف</td></tr>
                      )}
                  </tbody>
              </table>

              <div className="mt-12 flex justify-between px-10 font-black text-lg">
                  <p className="underline underline-offset-8">رئيس الكنترول</p>
                  <p className="underline underline-offset-8">مدير المدرسة</p>
              </div>
          </div>
      ) : (
          <div className="flex flex-col items-center justify-center p-20 text-gray-400 bg-white rounded-xl border-2 border-dashed">
              <ClipboardList size={64} className="opacity-10 mb-4" />
              <p className="text-xl font-bold">يرجى اختيار {viewMode === 'subject' ? 'المادة' : 'اللجنة'} لعرض الكشف</p>
          </div>
      )}
    </div>
  );
};

export default SecondRoleCallingList;
