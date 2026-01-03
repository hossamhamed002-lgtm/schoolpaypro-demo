
import React, { useState } from 'react';
import { Repeat, AlertTriangle, ClipboardList, PenTool, Award, Grid, FileText, Lock } from 'lucide-react';
import { Student, Subject, GradesDatabase } from '../examControl.types';
import SecondRoleFailureReport from './SecondRoleFailureReport';
import SecondRoleCallingList from './SecondRoleCallingList';
import SecondRoleGrading from './SecondRoleGrading';
import SecondRoleCertificates from './SecondRoleCertificates';
import SecondRoleCommittees from './SecondRoleCommittees';
import SecondRoleMasterSheet from './SecondRoleMasterSheet';
import SecondRoleSecretGen from './SecondRoleSecretGen';

interface SecondRoleProps {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
  onUpdate: (grades: GradesDatabase) => void;
  onUpdateStudents?: (students: Student[]) => void;
}

const SecondRole: React.FC<SecondRoleProps> = ({ students, subjects, grades, onUpdate, onUpdateStudents }) => {
  const [activeSubTab, setActiveSubTab] = useState<'report' | 'secret' | 'calling' | 'grading' | 'certificates' | 'committees' | 'sheet'>('report');

  const renderContent = () => {
    switch (activeSubTab) {
      case 'report': 
        return <SecondRoleFailureReport students={students} subjects={subjects} grades={grades} />;
      case 'secret':
        return <SecondRoleSecretGen students={students} subjects={subjects} grades={grades} onUpdateStudents={onUpdateStudents} />;
      case 'committees': 
        return <SecondRoleCommittees students={students} subjects={subjects} grades={grades} onUpdateStudents={onUpdateStudents} />;
      case 'calling': 
        return <SecondRoleCallingList students={students} subjects={subjects} grades={grades} />;
      case 'grading': 
        return <SecondRoleGrading students={students} subjects={subjects} grades={grades} onUpdate={onUpdate} />;
      case 'certificates': 
        return <SecondRoleCertificates students={students} subjects={subjects} grades={grades} />;
      case 'sheet':
        return <SecondRoleMasterSheet students={students} subjects={subjects} grades={grades} />;
      default: 
        return <SecondRoleFailureReport students={students} subjects={subjects} grades={grades} />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 p-2 rounded-lg text-white shadow-lg shadow-red-100">
            <Repeat size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">كنترول الدور الثاني</h2>
            <p className="text-xs text-gray-500 font-bold">إدارة المتعثرين، اللجان، الرصد، والشهادات</p>
          </div>
        </div>

        <div className="bg-gray-100 p-1 rounded-xl flex overflow-x-auto max-w-full custom-scrollbar gap-1">
          <button onClick={() => setActiveSubTab('report')} className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${activeSubTab === 'report' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}><AlertTriangle size={16} /> كشف المتعثرين</button>
          <button onClick={() => setActiveSubTab('secret')} className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${activeSubTab === 'secret' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}><Lock size={16} /> سري دور ثان</button>
          <button onClick={() => setActiveSubTab('committees')} className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${activeSubTab === 'committees' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}><Grid size={16} /> لجان الدور الثاني</button>
          <button onClick={() => setActiveSubTab('calling')} className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${activeSubTab === 'calling' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}><ClipboardList size={16} /> كشوف المناداة</button>
          
          <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
          
          <button onClick={() => setActiveSubTab('grading')} className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${activeSubTab === 'grading' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}><PenTool size={16} /> رصد الدرجات</button>
          <button onClick={() => setActiveSubTab('sheet')} className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${activeSubTab === 'sheet' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}><FileText size={16} /> شيت الدور الثاني</button>
          <button onClick={() => setActiveSubTab('certificates')} className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${activeSubTab === 'certificates' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}><Award size={16} /> الشهادات</button>
        </div>
      </div>

      <div className="min-h-[500px]">
        {renderContent()}
      </div>
    </div>
  );
};

export default SecondRole;
