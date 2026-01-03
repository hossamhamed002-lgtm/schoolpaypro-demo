import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, FileDown, Printer, Download, ArrowRight, Table, Users, Lock, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { Student, Subject, GradesDatabase, GradeLevel, GRADE_LABELS } from '../examControl.types';
import { db } from '../services/db';
import { exportUtils } from '../services/exportUtils';

interface Props {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
}

const SecondRoleExport: React.FC<Props> = ({ students, subjects, grades }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('p3');
  const certConfig = db.getCertConfig();
  const schoolInfo = db.getSchoolInfo();

  const validGrades = (Object.keys(GRADE_LABELS) as GradeLevel[]);

  // تجهيز قائمة طلاب الدور الثاني بناءً على شروط النجاح
  const secondRoleData = useMemo(() => {
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;

    const gradeStudents = students.filter(s => s.gradeLevel === selectedGrade);
    const gradeSubjects = subjects.filter(s => s.gradeLevels?.includes(selectedGrade) && s.isBasic);
    const gradeCommittees = db.getSecondRoleCommittees();

    const candidates = gradeStudents.filter(st => {
      const stGrades = grades[st.id] || {};
      let hasFail = false;
      gradeSubjects.forEach(sub => {
        const rec = stGrades[sub.id], safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
        const t1 = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
        const t2 = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
        const annualAvg = (t1 + t2) / 2;
        
        if (selectedGrade === 'p1' || selectedGrade === 'p2') {
            if (annualAvg < sub.maxScore * 0.5) hasFail = true;
        } else {
            const isAbs = (rec?.term1?.exam === -1 || rec?.term2?.exam === -1);
            const passedWritten = (sub.examScore === 0) || (safeVal(rec?.term2?.exam) >= sub.examScore * EXAM_THRESHOLD);
            if (isAbs || !passedWritten || annualAvg < sub.maxScore * PASS_THRESHOLD) hasFail = true;
        }
      });
      return hasFail;
    }).sort((a, b) => (a.seatingNumber || 0) - (b.seatingNumber || 0));

    return { candidates, gradeSubjects, gradeCommittees };
  }, [students, grades, selectedGrade, subjects, certConfig]);

  const exportStudentsToExcel = () => {
    const data = secondRoleData.candidates.map(st => {
        const failedSubs = secondRoleData.gradeSubjects.filter(sub => {
            const rec = grades[st.id]?.[sub.id], safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
            const t1 = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
            const t2 = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
            const annualAvg = (t1 + t2) / 2;
            const isRemedial = selectedGrade === 'p1' || selectedGrade === 'p2';
            if (isRemedial) return annualAvg < sub.maxScore * 0.5;
            return rec?.term1?.exam === -1 || rec?.term2?.exam === -1 || annualAvg < sub.maxScore * (certConfig.minPassingPercent/100) || safeVal(rec?.term2?.exam) < sub.examScore * (certConfig.minExamPassingPercent/100);
        }).map(s => s.name).join(' - ');

        return {
            'الاسم': st.name,
            'رقم الجلوس (د1)': st.seatingNumber,
            'الفصل': st.classroom,
            'مواد الدور الثاني': failedSubs,
            'اللجنة (د2)': secondRoleData.gradeCommittees.find(c => c.id === st.committeeIdSecondRole)?.name || 'غير محدد',
            'السري (د2)': st.secretNumberSecondRole || 'لم يولد بعد'
        };
    });
    exportUtils.exportDataToExcel(data, `طلاب_الدور_الثاني_${GRADE_LABELS[selectedGrade]}`);
  };

  const exportCommitteesToExcel = () => {
      const committees = secondRoleData.gradeCommittees.filter(c => c.gradeLevel === selectedGrade);
      const data = committees.map(c => {
          const studentsCount = secondRoleData.candidates.filter(s => s.committeeIdSecondRole === c.id).length;
          return {
              'اسم اللجنة': c.name,
              'المقر': c.location,
              'السعة المحددة': c.capacity,
              'عدد الطلاب الموزعين': studentsCount
          };
      });
      exportUtils.exportDataToExcel(data, `لجان_الدور_الثاني_${GRADE_LABELS[selectedGrade]}`);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-100">
                  <FileSpreadsheet size={24} />
              </div>
              <div>
                  <h3 className="text-xl font-black text-gray-800">مركز تصدير البيانات</h3>
                  <p className="text-sm text-gray-500 font-bold">استخراج التقارير والبيانات بصيغ متعددة</p>
              </div>
          </div>
          <div className="flex flex-col gap-1">
              <label className="text-xs font-black text-gray-400 mr-1 uppercase">اختر الصف للتصدير</label>
              <select 
                value={selectedGrade} 
                onChange={e => setSelectedGrade(e.target.value as GradeLevel)} 
                className="border-2 border-gray-100 rounded-xl p-2.5 font-bold text-blue-700 bg-gray-50 outline-none focus:border-blue-400 min-w-[200px]"
              >
                  {validGrades.map(g => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
              </select>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card: Students Export */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users size={28} />
              </div>
              <h4 className="text-lg font-black text-gray-800 mb-2">قائمة طلاب الدور الثاني</h4>
              <p className="text-sm text-gray-500 font-medium mb-6 h-10">تصدير قائمة كاملة بأسماء الطلاب، أرقام جلوسهم، ومواد الرسوب.</p>
              <button onClick={exportStudentsToExcel} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition shadow-lg shadow-emerald-100">
                  <Download size={18} /> تحميل Excel
              </button>
          </div>

          {/* Card: Committees Export */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Table size={28} />
              </div>
              <h4 className="text-lg font-black text-gray-800 mb-2">توزيع لجان الدور الثاني</h4>
              <p className="text-sm text-gray-500 font-medium mb-6 h-10">ملف يحتوي على أسماء اللجان، المقرات، وأعداد الطلاب في كل لجنة.</p>
              <button onClick={exportCommitteesToExcel} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-100">
                  <Download size={18} /> تحميل Excel
              </button>
          </div>

          {/* Card: Secret Numbers Export */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Lock size={28} />
              </div>
              <h4 className="text-lg font-black text-gray-800 mb-2">كشف الأرقام السرية</h4>
              <p className="text-sm text-gray-500 font-medium mb-6 h-10">تصدير العلاقة بين رقم الجلوس والرقم السري للدور الثاني.</p>
              <button 
                onClick={() => exportUtils.print('r2-secret-area')} 
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
              >
                  <Printer size={18} /> طباعة مباشرة
              </button>
          </div>

          {/* Card: Full Results Sheet */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ClipboardCheck size={28} />
              </div>
              <h4 className="text-lg font-black text-gray-800 mb-2">شيت رصد الدور الثاني</h4>
              <p className="text-sm text-gray-500 font-medium mb-6 h-10">استخراج شيت كامل مجهز للرصد اليدوي والتدقيق لجميع المواد.</p>
              <button 
                onClick={() => exportUtils.exportTableToExcel('r2-grading-table', `شيت_رصد_د2_${GRADE_LABELS[selectedGrade]}`)}
                className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition shadow-lg shadow-purple-100"
              >
                  <FileDown size={18} /> استخراج الشيت
              </button>
          </div>
      </div>

      <div className="bg-amber-50 border-r-4 border-amber-500 p-4 rounded-l-xl flex items-start gap-3 text-amber-900 no-print">
          {/* Fixed: Added missing AlertTriangle icon to the imports list from lucide-react */}
          <AlertTriangle size={24} className="shrink-0" />
          <div>
              <p className="font-black text-sm uppercase">ملاحظة هامة للمستخدم</p>
              <p className="text-xs opacity-90 font-bold leading-relaxed">
                  عمليات التصدير تعتمد على آخر بيانات تم حفظها في المتصفح. تأكد من إتمام توزيع اللجان وتوليد الأرقام السرية قبل بدء عملية التصدير لضمان اكتمال الملفات المستخرجة.
              </p>
          </div>
      </div>
    </div>
  );
};

export default SecondRoleExport;