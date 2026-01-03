
import React from 'react';
import { History as HistoryIcon } from 'lucide-react';

interface GeneralLedgerTabProps {
  store: any;
}

const GeneralLedgerTab: React.FC<GeneralLedgerTabProps> = ({ store }) => {
  const { t, journalEntries } = store;
  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">{t.date}</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">{t.entryID}</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">{t.account}</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">{t.description}</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-end">{t.debit}</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-end">{t.credit}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {journalEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-8 py-32 text-center">
                  <div className="flex flex-col items-center opacity-20">
                    <HistoryIcon size={64} className="mb-4" />
                    <p className="text-lg font-black tracking-tight">{t.ledger}</p>
                    <p className="text-sm font-bold uppercase tracking-tighter mt-1 opacity-60">النظام بانتظار أول عملية مالية...</p>
                  </div>
                </td>
              </tr>
            ) : (
              journalEntries.map((entry: any) => (
                <tr key={entry.Entry_ID} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5 text-xs text-slate-400 font-bold">{entry.Date}</td>
                  <td className="px-8 py-5 font-mono text-[10px] text-slate-300 font-black tracking-tighter uppercase">{entry.Entry_ID}</td>
                  <td className="px-8 py-5">
                     <p className="text-sm font-black text-slate-800">{entry.Account_ID}</p>
                     <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg uppercase font-black tracking-widest mt-1 inline-block">
                       {entry.Source_Table}
                     </span>
                  </td>
                  <td className="px-8 py-5 text-sm text-slate-500 font-medium max-w-xs truncate">{entry.Description}</td>
                  <td className="px-8 py-5 text-end">
                    {entry.Debit > 0 && (
                      <span className="font-black text-slate-900 text-lg">${entry.Debit.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-end">
                    {entry.Credit > 0 && (
                      <span className="font-black text-emerald-600 text-lg">${entry.Credit.toLocaleString()}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {journalEntries.length > 0 && (
            <tfoot>
              <tr className="bg-slate-900 text-white font-black">
                <td colSpan={4} className="px-8 py-6 text-end text-xs uppercase tracking-widest">{t.totals}</td>
                <td className="px-8 py-6 text-end text-xl">
                  <span className="text-xs text-slate-400 me-2">$</span>
                  {journalEntries.reduce((sum: any, e: any) => sum + e.Debit, 0).toLocaleString()}
                </td>
                <td className="px-8 py-6 text-end text-xl text-emerald-400">
                  <span className="text-xs text-slate-400 me-2">$</span>
                  {journalEntries.reduce((sum: any, e: any) => sum + e.Credit, 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default GeneralLedgerTab;
