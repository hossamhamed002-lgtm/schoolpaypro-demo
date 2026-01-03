
import React, { useState } from 'react';
import { GraduationCap, Users, CalendarCheck, FileBarChart } from 'lucide-react';
import StudentsListTab from './students/StudentsListTab';
import StudentReportsTab from './students/StudentReportsTab';

const StudentView: React.FC<{ store: any }> = ({ store }) => {
  const { t, lang } = store;
  const isRtl = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'enrollment' | 'reports'>('list');

  const tabs = [
    { id: 'list', label: isRtl ? 'قائمة الطلاب' : 'Students List', icon: Users },
    { id: 'enrollment', label: isRtl ? 'القيد السنوي' : 'Annual Enrollment', icon: CalendarCheck },
    { id: 'reports', label: isRtl ? 'تقارير الطلاب' : 'Student Reports', icon: FileBarChart },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="text-start">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t.students}</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
             {tabs.find(tab => tab.id === activeSubTab)?.label}
          </p>
        </div>
      </div>

      <div className="flex p-1.5 bg-slate-200/50 rounded-2xl w-fit overflow-x-auto max-w-full no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-300 whitespace-nowrap ${
              activeSubTab === tab.id 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {activeSubTab === 'list' && <StudentsListTab store={store} />}
        {activeSubTab === 'enrollment' && (
           <div className="bg-white rounded-[2rem] border border-slate-100 p-20 text-center opacity-40 italic flex flex-col items-center">
              <CalendarCheck size={64} className="mb-4 text-slate-300" />
              <p className="text-slate-500 font-black">{isRtl ? 'وحدة القيد السنوي والترحيل قيد التفعيل' : 'Annual Enrollment and Promotion module is being activated'}</p>
           </div>
        )}
        {activeSubTab === 'reports' && <StudentReportsTab store={store} />}
      </div>
    </div>
  );
};

export default StudentView;
