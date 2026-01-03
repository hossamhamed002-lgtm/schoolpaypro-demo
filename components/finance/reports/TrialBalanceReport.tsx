import React from 'react';
import { CalendarRange, Filter, Printer, Search } from 'lucide-react';
import ReportPrintWrapper from '../../ReportPrintWrapper';

interface TrialBalanceReportProps {
  title: string;
  activeSchool?: any;
  activeYear?: any;
  workingYearId?: string;
  filters: { from: string; to: string; level: string; accountId: string };
  setFilters: (fn: any) => void;
  appliedFilters: { from: string; to: string; level: string; accountId: string };
  applyFilters: () => void;
  trialBalanceRows: { rows: any[]; totals: { debit: number; credit: number; balance: number } };
  accounts: any[];
  reportSettings: any;
}

const TrialBalanceReport: React.FC<TrialBalanceReportProps> = ({
  title,
  activeSchool,
  activeYear,
  workingYearId,
  filters,
  setFilters,
  appliedFilters,
  applyFilters,
  trialBalanceRows,
  accounts,
  reportSettings
}) => {
  const noData = trialBalanceRows.rows.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
          <Filter size={16} />
          <span>مرشحات ميزان المراجعة</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={applyFilters}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-xs font-black"
          >
            <Search size={14} />
            تطبيق الفلتر
          </button>
          <button
            onClick={() => window.print()}
            disabled={noData}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed"
            title={noData ? 'لا توجد بيانات قابلة للطباعة' : ''}
          >
            <Printer size={14} />
            طباعة
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 no-print">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <CalendarRange size={14} /> من تاريخ
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
            <CalendarRange size={14} /> إلى تاريخ
          </label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((p: any) => ({ ...p, to: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">المستوى</label>
          <select
            value={filters.level}
            onChange={(e) => setFilters((p: any) => ({ ...p, level: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
          >
            <option value="all">الكل</option>
            <option value="main">رئيسي</option>
            <option value="sub">فرعي</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">حساب محدد (اختياري)</label>
          <select
            value={filters.accountId}
            onChange={(e) => setFilters((p: any) => ({ ...p, accountId: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
          >
            <option value="">كل الحسابات</option>
            {accounts.map((acc: any) => (
              <option key={acc.id} value={acc.id}>
                {acc.code} - {acc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ReportPrintWrapper
        reportTitle={title}
        activeSchool={activeSchool || {}}
        reportConfig={{ Signature_Chain: [] } as any}
        lang="ar"
        activeYearName={activeYear?.Year_Name || activeYear?.AcademicYear_Name || activeYear?.Name || workingYearId || ''}
      >
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-xl font-black text-slate-900">ميزان المراجعة</h3>
            <p className="text-sm font-semibold text-slate-600">
              الفترة: {appliedFilters.from || '—'} - {appliedFilters.to || '—'}
            </p>
          </div>

          {noData ? (
            <div className="border border-amber-100 bg-amber-50 text-amber-700 font-bold rounded-2xl px-4 py-4">
              لا توجد بيانات لميزان المراجعة ضمن الفلتر الحالي.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm font-bold text-slate-700">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500">عدد الحسابات</p>
                  <p className="text-xl font-black text-slate-900">{trialBalanceRows.rows.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-xs text-emerald-700">إجمالي مدين</p>
                  <p className="text-xl font-black text-emerald-700">{trialBalanceRows.totals.debit.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                  <p className="text-xs text-indigo-700">إجمالي دائن</p>
                  <p className="text-xl font-black text-indigo-700">{trialBalanceRows.totals.credit.toFixed(2)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-center">كود</th>
                      <th className="px-4 py-3 text-start">الحساب</th>
                      <th className="px-4 py-3 text-center">مدين</th>
                      <th className="px-4 py-3 text-center">دائن</th>
                      <th className="px-4 py-3 text-center">الرصيد</th>
                      <th className="px-4 py-3 text-center">النوع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trialBalanceRows.rows.map((row, idx) => (
                      <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-4 py-3 text-center font-mono font-bold text-slate-800">{row.code}</td>
                        <td className="px-4 py-3 text-start font-semibold text-slate-800">{row.name}</td>
                        <td className="px-4 py-3 text-center font-mono text-emerald-700">{row.debit.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center font-mono text-indigo-700">{row.credit.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center font-mono text-slate-900">{row.balance.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center font-black text-slate-700">{row.balanceType}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black">
                      <td colSpan={2} className="px-4 py-3 text-center">الإجمالي</td>
                      <td className="px-4 py-3 text-center font-mono text-emerald-700">{trialBalanceRows.totals.debit.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center font-mono text-indigo-700">{trialBalanceRows.totals.credit.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center font-mono text-slate-900">
                        {Math.abs(trialBalanceRows.totals.debit - trialBalanceRows.totals.credit).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center font-black text-slate-700">
                        {trialBalanceRows.totals.debit >= trialBalanceRows.totals.credit ? 'مدين' : 'دائن'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      </ReportPrintWrapper>
    </div>
  );
};

export default TrialBalanceReport;
