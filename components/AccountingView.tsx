
import React from 'react';
import { FileText } from 'lucide-react';
import GeneralLedgerTab from './accounting/GeneralLedgerTab';
import SuppliersTab from './accounting/SuppliersTab';

const AccountingView: React.FC<{ store: any }> = ({ store }) => {
  const { t } = store;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="text-start">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t.generalLedger}</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">{t.accounting}</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-3 bg-white border border-slate-200 px-6 py-3 rounded-2xl text-sm font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md">
            <FileText size={18} className="text-indigo-500" />
            {t.trialBalance}
          </button>
        </div>
      </div>

      <GeneralLedgerTab store={store} />
      <SuppliersTab />
    </div>
  );
};

export default AccountingView;
