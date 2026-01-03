import React from 'react';
import { Info } from 'lucide-react';

interface StaffPlaceholderScreenProps {
  title: string;
  description: string;
  onBack: () => void;
  isRtl: boolean;
}

const StaffPlaceholderScreen: React.FC<StaffPlaceholderScreenProps> = ({ title, description, onBack, isRtl }) => {
  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-20 text-center flex flex-col items-center animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-[2rem] flex items-center justify-center mb-8">
        <Info size={48} />
      </div>
      <h3 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h3>
      <p className="text-slate-500 font-medium mt-2 max-w-sm mx-auto">{description}</p>
      <button
        onClick={onBack}
        className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-indigo-600 transition-colors"
      >
        {isRtl ? 'العودة للمركز الرئيسي' : 'Back to Hub'}
      </button>
    </div>
  );
};

export default StaffPlaceholderScreen;
