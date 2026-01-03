
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PlaceholderProps {
  title: string;
  desc: string;
  icon: LucideIcon;
  onBack: () => void;
  colorClass?: string;
  bgColorClass?: string;
}

const PermissionsHub: React.FC<PlaceholderProps> = ({ title, desc, icon: Icon, onBack, colorClass = "text-indigo-400", bgColorClass = "bg-indigo-50" }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center text-start">
        <button onClick={onBack} className="text-slate-400 font-bold flex items-center gap-2 hover:text-indigo-600 transition-colors">
          &larr; العودة للرئيسية
        </button>
      </div>
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-20 text-center flex flex-col items-center">
        <div className={`w-24 h-24 ${bgColorClass} ${colorClass} rounded-[2rem] flex items-center justify-center mb-8`}>
          <Icon size={48} />
        </div>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h3>
        <p className="text-slate-500 font-medium mt-2 max-w-sm mx-auto">{desc}</p>
        <div className="mt-8 px-6 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
          قيد التطوير البرمجي حالياً
        </div>
      </div>
    </div>
  );
};

export default PermissionsHub;
