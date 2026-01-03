
import React from 'react';
import { BarChart3 } from 'lucide-react';
import { Subject, GradeLevel } from '../examControl.types';

interface SubjectStatsProps {
  students: any[];
  subjects: Subject[];
  results: any;
  filterGrade: GradeLevel | 'all';
}

const SubjectStats: React.FC<SubjectStatsProps> = ({ students, subjects, results, filterGrade }) => {
  
  const activeSubjects = subjects.filter(s => filterGrade === 'all' || s.gradeLevels?.includes(filterGrade as GradeLevel));

  return (
    <div className="p-6" dir="rtl">
      <h3 className="text-lg font-bold text-blue-600 flex items-center gap-2 mb-6"><BarChart3 size={20} /> إحصاءات المواد الدراسية</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeSubjects.map(sub => {
          let pass = 0, fail = 0;
          students.forEach(st => {
            if (st.gradeLevel === filterGrade || filterGrade === 'all') {
               const res = results[st.id];
               if (res?.failedSubjects.includes(sub.name)) fail++; else pass++;
            }
          });
          const total = pass + fail;
          const passPercent = total > 0 ? (pass / total) * 100 : 0;
          return (
            <div key={sub.id} className="bg-white border-2 border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition">
              <h4 className="font-black text-gray-800 mb-3 border-b pb-2 text-lg">{sub.name}</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm font-bold"><span>ناجحون:</span><span className="text-green-600">{pass}</span></div>
                <div className="flex justify-between items-center text-sm font-bold"><span>راسبون:</span><span className="text-red-600">{fail}</span></div>
                <div className="w-full bg-gray-100 rounded-full h-3 mt-4"><div className="bg-blue-600 h-3 rounded-full shadow-inner" style={{ width: `${passPercent}%` }}></div></div>
                <div className="text-center text-xs font-black text-blue-600 mt-1">نسبة النجاح: {passPercent.toFixed(1)}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SubjectStats;
