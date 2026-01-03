import React from 'react';
import { CalendarRange, Filter, Printer, Search } from 'lucide-react';
import ReportPrintWrapper from '../../ReportPrintWrapper';

interface JournalReportProps {
  isRtl: boolean;
  filters: any;
  setFilters: (fn: any) => void;
  appliedFilters: any;
  applyFilters: () => void;
  journalLines: any[];
  journalTotals: { debit: number; credit: number };
  journalNoData: boolean;
  filteredAccounts: any[];
  accountMap: Map<any, any>;
  reportSettings: any;
  getReportTitle: (id: string) => string;
  reportId: string;
}

const JournalReport: React.FC<JournalReportProps> = ({
  isRtl,
  filters,
  setFilters,
  appliedFilters,
  applyFilters,
  journalLines,
  journalTotals,
  journalNoData,
  filteredAccounts,
  accountMap,
  reportSettings,
  getReportTitle,
  reportId
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
          <Filter size={16} />
          <span>{isRtl ? 'مرشحات التقرير' : 'Report Filters'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={applyFilters}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-xs font-black"
          >
            <Search size={14} />
            {isRtl ? 'تطبيق الفلتر' : 'Apply Filter'}
          </button>
          <button
            onClick={() => window.print()}
            disabled={journalNoData}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer size={14} />
            {isRtl ? 'طباعة' : 'Print'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 no-print">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <CalendarRange size={14} /> {isRtl ? 'من تاريخ' : 'From'}
          </label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((p: any) => ({ ...p, from: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <CalendarRange size={14} /> {isRtl ? 'إلى تاريخ' : 'To'}
          </label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((p: any) => ({ ...p, to: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">{isRtl ? 'نوع القيد' : 'Entry Type'}</label>
          <select
            value={filters.entryType}
            onChange={(e) => setFilters((p: any) => ({ ...p, entryType: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
          >
            <option value="all">{isRtl ? 'الكل' : 'All'}</option>
            <option value="manual">{isRtl ? 'يدوي' : 'Manual'}</option>
            <option value="fees">{isRtl ? 'رسوم' : 'Fees'}</option>
            <option value="stock">{isRtl ? 'مخازن' : 'Stock'}</option>
            <option value="receipt">{isRtl ? 'سندات' : 'Receipts'}</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">{isRtl ? 'الحساب' : 'Account'}</label>
          <select
            value={filters.accountId}
            onChange={(e) => setFilters((p: any) => ({ ...p, accountId: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
          >
            <option value="">{isRtl ? 'الكل' : 'All'}</option>
            {filteredAccounts.map((acc: any) => (
              <option key={acc.id} value={acc.id}>
                {acc.code} - {acc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ReportPrintWrapper
        settings={reportSettings}
        title={getReportTitle(reportId)}
        subtitle={`${isRtl ? 'من' : 'From'} ${appliedFilters.from || '—'} ${isRtl ? 'إلى' : 'To'} ${appliedFilters.to || '—'}`}
      >
        <div className="space-y-4">
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-center">#</th>
                  <th className="px-3 py-2 text-center">{isRtl ? 'رقم القيد' : 'Entry No.'}</th>
                  <th className="px-3 py-2 text-center">{isRtl ? 'التاريخ' : 'Date'}</th>
                  <th className="px-3 py-2 text-center">{isRtl ? 'المصدر' : 'Source'}</th>
                  <th className="px-3 py-2 text-center">{isRtl ? 'الوصف' : 'Description'}</th>
                  <th className="px-3 py-2 text-center">{isRtl ? 'الحساب' : 'Account'}</th>
                  <th className="px-3 py-2 text-center">{isRtl ? 'مدين' : 'Debit'}</th>
                  <th className="px-3 py-2 text-center">{isRtl ? 'دائن' : 'Credit'}</th>
                </tr>
              </thead>
              <tbody>
                {journalLines.map((line, idx) => (
                  <tr key={`${line.entryNumber}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-3 py-2 text-center font-mono text-slate-500">{line.lineIndex}</td>
                    <td className="px-3 py-2 text-center font-mono font-bold text-slate-800">{line.entryNumber}</td>
                    <td className="px-3 py-2 text-center text-slate-700">
                      {line.entryDate ? new Date(line.entryDate).toLocaleDateString('ar-EG') : '—'}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-600">{line.entrySource}</td>
                    <td className="px-3 py-2 text-center text-slate-600">{line.entryDescription || '—'}</td>
                    <td className="px-3 py-2 text-center text-slate-700">{line.accountLabel}</td>
                    <td className="px-3 py-2 text-center font-mono text-emerald-700">{line.debit.toFixed(2)}</td>
                    <td className="px-3 py-2 text-center font-mono text-rose-700">{line.credit.toFixed(2)}</td>
                  </tr>
                ))}
                {journalNoData && (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-center text-slate-400 font-bold">
                      {isRtl ? 'لا توجد بيانات ضمن الفلتر الحالي' : 'No data for current filter'}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-black">
                  <td colSpan={6} className="px-3 py-2 text-center">{isRtl ? 'الإجمالي' : 'Total'}</td>
                  <td className="px-3 py-2 text-center font-mono text-emerald-700">{journalTotals.debit.toFixed(2)}</td>
                  <td className="px-3 py-2 text-center font-mono text-rose-700">{journalTotals.credit.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </ReportPrintWrapper>
    </div>
  );
};

export default JournalReport;
