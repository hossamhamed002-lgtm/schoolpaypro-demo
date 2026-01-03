
import React, { useState } from 'react';
import { Calendar, Building, Layers, Presentation } from 'lucide-react';
import SchoolInfoTab from './academic/SchoolInfoTab';
import AcademicYearsTab from './academic/AcademicYearsTab';
import SchoolStructureTab from './academic/SchoolStructureTab';
import ClassesTab from './academic/ClassesTab';

const AcademicView: React.FC<{ store: any }> = ({ store }) => {
  const { t } = store;
  const [activeTab, setActiveTab] = useState<'school' | 'years' | 'structure' | 'classes'>('school');

  const tabs = [
    { id: 'school', label: t.tabSchool, icon: Building },
    { id: 'years', label: t.tabYears, icon: Calendar },
    { id: 'structure', label: t.tabStructure, icon: Layers },
    { id: 'classes', label: t.classes, icon: Presentation },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="text-start">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t.academic}</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {activeTab === 'school' && t.tabSchool}
            {activeTab === 'years' && t.tabYears}
            {activeTab === 'structure' && t.tabStructure}
            {activeTab === 'classes' && t.classes}
          </p>
        </div>
      </div>

      <div className="flex p-1.5 bg-slate-200/50 rounded-2xl w-fit overflow-x-auto max-w-full no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-300 whitespace-nowrap ${
              activeTab === tab.id 
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
        {activeTab === 'school' && <SchoolInfoTab store={store} />}
        {activeTab === 'years' && <AcademicYearsTab store={store} />}
        {activeTab === 'structure' && <SchoolStructureTab store={store} setActiveTab={setActiveTab} />}
        {activeTab === 'classes' && <ClassesTab store={store} />}
      </div>
    </div>
  );
};

export default AcademicView;
