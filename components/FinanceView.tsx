
import React, { useState } from 'react';
import { Wallet, Receipt, History as HistoryIcon, FileText, FileBarChart } from 'lucide-react';
import FeeItemsTab from './finance/FeeItemsTab';
import BillingRulesTab from './finance/BillingRulesTab';
import FeeStructureTab from './finance/FeeStructureTab';
import GeneralLedgerTab from './accounting/GeneralLedgerTab';
import FinanceReportsTab from './finance/FinanceReportsTab';

const FinanceView: React.FC<{ store: any }> = ({ store }) => {
  const { t } = store;
  const [activeSubTab, setActiveSubTab] = useState<'setup' | 'ledger' | 'reports'>('setup');

  const tabs = [
    { id: 'setup', label: t.feeSetup, icon: Wallet },
    { id: 'ledger', label: t.ledger, icon: HistoryIcon },
    { id: 'reports', label: t.memberReports, icon: FileBarChart },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="text-start">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t.finance}</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {activeSubTab === 'setup' ? t.feeSetup : activeSubTab === 'ledger' ? t.ledger : t.memberReports}
          </p>
        </div>
        
        {activeSubTab === 'ledger' && (
          <button className="flex items-center gap-3 bg-white border border-slate-200 px-6 py-3 rounded-2xl text-sm font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md">
            <FileText size={18} className="text-indigo-500" />
            {t.trialBalance}
          </button>
        )}
      </div>

      <div className="flex p-1.5 bg-slate-200/50 rounded-2xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${
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
        {activeSubTab === 'setup' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FeeItemsTab store={store} />
              <BillingRulesTab store={store} />
            </div>
            <FeeStructureTab store={store} />
          </div>
        )}
        {activeSubTab === 'ledger' && <GeneralLedgerTab store={store} />}
        {activeSubTab === 'reports' && <FinanceReportsTab store={store} />}
      </div>
    </div>
  );
};

export default FinanceView;
