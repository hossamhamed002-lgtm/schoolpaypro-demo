
import React, { useMemo, useState } from 'react';
import { Printer, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { Student, Subject, GradesDatabase, GradeLevel, GRADE_LABELS } from '../examControl.types';
import { db } from '../services/db';
import { exportUtils } from '../services/exportUtils';

interface Props {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
}

const SecondRoleFailureReport: React.FC<Props> = ({ students, subjects, grades }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('p3');
  const certConfig = db.getCertConfig();
  const schoolInfo = db.getSchoolInfo();

  // إتاحة كافة الصفوف بناءً على طلب المستخدم
  const validGrades = (Object.keys(GRADE_LABELS) as GradeLevel[]);

  const failingStudents = useMemo(() => {
    const fails: { student: Student; failedSubjects: { name: string; reason: string }[] }[] = [];
    const gradeStudents = students.filter(s => s.gradeLevel === selectedGrade);
    
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;

    gradeStudents.forEach(st => {
      const stGrades = grades[st.id] || {};
      const failedSubs: { name: string; reason: string }[] = [];
      
      const relevantSubjects = subjects.filter(sub => 
        sub.gradeLevels?.includes(st.gradeLevel) && sub.isBasic
      );

      if (relevantSubjects.length === 0) return;

      let totalT1 = 0, totalT2 = 0, grandMax = 0;

      relevantSubjects.forEach(sub => {
        const record = stGrades[sub.id];
        const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
        const isAbs = (v: any) => v === -1;

        // إذا لم توجد بيانات (لم يتم الرصد)، يعتبر راسباً (صفر)
        const t1_sum = safeVal(record?.term1?.work) + safeVal(record?.term1?.practical) + safeVal(record?.term1?.exam);
        const t2_sum = safeVal(record?.term2?.work) + safeVal(record?.term2?.practical) + safeVal(record?.term2?.exam);
        
        const annualAvg = (t1_sum + t2_sum) / 2;
        const subMax = sub.maxScore; 
        const examMax = sub.examScore;

        let isSubFailed = false;
        let reason = "";

        if (st.gradeLevel === 'p1' || st.gradeLevel === 'p2') {
             // الصفوف الأولى: شرط الـ 50% فقط
             if (annualAvg < subMax * 0.5) { isSubFailed = true; reason = "أقل من 50%"; }
        } else {
            // باقي الصفوف: غياب أو عدم تحقيق حد النجاح أو شرط التحريري
            if (record && (isAbs(record?.term1?.exam) || isAbs(record?.term2?.exam))) {
                isSubFailed = true; reason = "غياب";
            } else {
                const t2_exam_score = safeVal(record?.term2?.exam);
                const passedWritten = (sub.examScore === 0) || (t2_exam_score >= examMax * EXAM_THRESHOLD);
                
                if (!passedWritten) { 
                    isSubFailed = true; 
                    reason = `شرط التحريري (${certConfig.minExamPassingPercent}%)`; 
                } else if (annualAvg < subMax * PASS_THRESHOLD) { 
                    isSubFailed = true; 
                    reason = `أقل من ${certConfig.minPassingPercent}%`; 
                }
            }
        }

        if (isSubFailed) failedSubs.push({ name: sub.name, reason });
        if (sub.isAddedToTotal) { totalT1 += t1_sum; totalT2 += t2_sum; grandMax += subMax; }
      });

      const finalGrandAvg = (totalT1 + totalT2) / 2;
      if (grandMax > 0 && finalGrandAvg < grandMax * PASS_THRESHOLD) {
          if (!failedSubs.some(fs => fs.name === 'المجموع')) {
              failedSubs.push({ name: 'المجموع', reason: `أقل من ${certConfig.minPassingPercent}% كلي` });
          }
      }

      if (failedSubs.length > 0) fails.push({ student: st, failedSubjects: failedSubs });
    });

    // تحديث: ترتيب الطلاب حسب رقم الجلوس (الدور الأول) ليكون مطابقاً لكشوف الرصد واللجان
    return fails.sort((a, b) => (a.student.seatingNumber || 0) - (b.student.seatingNumber || 0));
  }, [students, grades, selectedGrade, subjects, certConfig]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-500">عرض صف:</span>
            <select 
                value={selectedGrade} 
                onChange={(e) => setSelectedGrade(e.target.value as GradeLevel)} 
                className="border rounded-lg p-2 bg-gray-50 font-bold text-blue-700 outline-none"
            >
                {validGrades.map(g => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
            </select>
        </div>
        <div className="flex gap-2">
            <button onClick={() => exportUtils.exportTableToExcel('r2-failure-table', `كشف_متعثري_${GRADE_LABELS[selectedGrade]}`)} className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 font-bold flex items-center gap-2 transition hover:bg-emerald-100"><FileSpreadsheet size={18}/> Excel</button>
            <button onClick={() => exportUtils.print('r2-failure-area')} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition hover:bg-gray-900 shadow-md"><Printer size={18}/> طباعة</button>
        </div>
      </div>

      <div id="r2-failure-area" className="bg-white p-12 rounded border-2 border-black text-black font-sans shadow-none" dir="rtl">
          <div className="text-center mb-8 border-b-4 border-double border-black pb-4">
              <h1 className="text-2xl font-black mb-1">{schoolInfo.schoolName}</h1>
              <h2 className="text-xl font-bold underline underline-offset-8">كشف الطلاب المرحلين للدور الثاني (تلقائياً)</h2>
              <p className="mt-4 font-bold text-blue-800">مرتبين حسب أرقام جلوس الدور الأول</p>
              <p className="mt-1 font-bold">الصف الدراسي: {GRADE_LABELS[selectedGrade]} | العام الدراسي {schoolInfo.academicYear}</p>
          </div>

          <table id="r2-failure-table" className="w-full text-center border-collapse border-4 border-black font-bold">
              <thead>
                  <tr className="bg-gray-100 h-14 text-lg">
                      <th className="border-4 border-black p-2 w-16">م</th>
                      <th className="border-4 border-black p-2 text-right pr-6">اسم الطالب</th>
                      <th className="border-4 border-black p-2 w-32">رقم الجلوس</th>
                      <th className="border-4 border-black p-2">مواد الرسوب</th>
                  </tr>
              </thead>
              <tbody>
                  {failingStudents.map((item, idx) => (
                      <tr key={item.student.id} className="h-14 text-lg hover:bg-gray-50">
                          <td className="border-4 border-black bg-gray-50">{idx + 1}</td>
                          <td className="border-4 border-black text-right pr-6 font-black">{item.student.name}</td>
                          <td className="border-4 border-black font-mono font-bold text-blue-800">{item.student.seatingNumber || '-'}</td>
                          <td className="border-4 border-black p-2">
                              <div className="flex flex-wrap gap-2 justify-center">
                                  {item.failedSubjects.map((fs, i) => (
                                      <span key={i} className="bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200 text-xs">
                                          {fs.name} ({fs.reason})
                                      </span>
                                  ))}
                              </div>
                          </td>
                      </tr>
                  ))}
                  {failingStudents.length === 0 && (
                      <tr><td colSpan={4} className="p-20 text-center text-gray-400 font-bold italic">لا يوجد طلاب متعثرون (الكل ناجح أو لم يتم تعريف مواد لهذا الصف)</td></tr>
                  )}
              </tbody>
          </table>
          <div className="mt-12 flex justify-between items-end px-4 font-black text-[13px]">
              <div className="text-center w-48"><p className="mb-14">رئيس الكنترول</p><p className="border-t-2 border-black pt-1">{schoolInfo.controlHead || '.................'}</p></div>
              <div className="text-center w-48"><p className="mb-14">مدير المدرسة</p><p className="border-t-2 border-black pt-1">{schoolInfo.managerName || '.................'}</p></div>
          </div>
      </div>
    </div>
  );
};

export default SecondRoleFailureReport;
