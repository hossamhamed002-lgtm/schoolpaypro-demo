
import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface BillingRulesTabProps {
  store: any;
}

const BillingRulesTab: React.FC<BillingRulesTabProps> = ({ store }) => {
  const { t, rules } = store;
  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
      <div className="p-8 border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <ShieldCheck size={24} />
          </div>
          <h3 className="font-black text-slate-800 text-lg">{t.billingRules}</h3>
        </div>
      </div>
      <div className="divide-y divide-slate-50">
        {rules.map((rule: any) => (
          <div key={rule.Rule_ID} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
            <div className="text-start">
              <p className="font-black text-sm text-slate-800">{rule.Rule_Name}</p>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-widest">Policy: {rule.Rule_ID}</p>
            </div>
            <div className="text-end">
               <p className="text-2xl font-black text-emerald-600">{rule.Payable_Percentage}%</p>
               <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Multiplier</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BillingRulesTab;
