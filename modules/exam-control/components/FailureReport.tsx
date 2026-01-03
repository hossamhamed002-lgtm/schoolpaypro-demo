
import React from 'react';
import { AlertTriangle, Printer } from 'lucide-react';
import { Student, Subject, GradeLevel } from '../examControl.types';

interface FailureReportProps {
  students: Student[];
  subjects: Subject[];
  grades: any;
  results: any;
  filterGrade: GradeLevel | 'all';
  filterClass: string;
}

const FailureReport: React.FC<FailureReportProps> = ({ students, results, filterGrade, filterClass }) => {
  
  const failingStudentsList = students
    .filter(s => (filterGrade === 'all' || s.gradeLevel === filterGrade) && (filterClass === 'all' || s.classroom === filterClass) && results[s.id]?.status !== 'Pass')
    .map(student => ({
      ...student,
      result: results[student.id]
    }));

  return (
    <div className="p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6 no-print">
        <h3 className="text-lg font-bold text-red-600 flex items-center gap-2"><AlertTriangle size={20} /> كشف الطلاب المتعثرين (بناءً على الوضع الحالي)</h3>
        <button onClick={() => window.print()} className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold"><Printer size={18} /> طباعة</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full border-collapse text-right">
          <thead className="bg-red-50 text-right">
            <tr className="border-b border-red-100">
              <th className="p-4 font-bold">اسم الطالب</th>
              <th className="p-4 font-bold w-32 text-center">رقم الجلوس</th>
              <th className="p-4 font-bold">أسباب التعثر (مواد الرسوب)</th>
              <th className="p-4 font-bold w-32 text-center">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {failingStudentsList.map((st) => (
              <tr key={st.id} className="hover:bg-red-50/20 border-b last:border-0">
                <td className="p-4 font-bold text-gray-800">{st.name}</td>
                <td className="p-4 font-mono font-bold text-blue-800 text-center">{st.seatingNumber}</td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-2">
                    {st.result?.failedSubjects.map((sub: string, i: number) => (
                      <span key={i} className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded border border-red-200 font-bold">
                        {sub} ({st.result?.failureReasons[sub]})
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${st.result?.status === 'Remedial' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                        {st.result?.status === 'Remedial' ? 'برنامج علاجي' : 'دور ثان'}
                    </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {failingStudentsList.length === 0 && <div className="p-20 text-center text-gray-400 font-bold">لا يوجد طلاب متعثرون حالياً في هذا الوضع.</div>}
      </div>
    </div>
  );
};

export default FailureReport;
