import React, { useMemo, useState } from 'react';
import { CalendarRange, Filter, Printer, Search } from 'lucide-react';
import ReportPrintWrapper from '../../ReportPrintWrapper';
import { AccountType } from '../../../src/types/accounts.types';

interface RevenueExpenseReportProps {
  title: string;
  accounts: any[];
  postedEntries: any[];
  workingYearId?: string;
  activeYear?: any;
  reportSettings: {
    paperSize: string;
    orientation: string;
    font: string;
    fontSize: string;
    lineHeight: string;
  };
}

const RevenueExpenseReport: React.FC<RevenueExpenseReportProps> = ({
  title,
  accounts,
  postedEntries,
  workingYearId,
  activeYear,
  reportSettings
}) => {
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    accountMode: 'all' as 'all' | 'one',
    accountId: ''
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [executed, setExecuted] = useState(false);

  const accountMap = useMemo(() => new Map((accounts || []).map((acc: any) => [acc.id, acc])), [accounts]);

  const data = useMemo(() => {
    if (!executed) {
      return { revenueRows: [] as any[], expenseRows: [] as any[], totalRevenue: 0, totalExpense: 0, net: 0 };
    }
    const { from, to, accountMode, accountId } = appliedFilters;
    if (!from || !to) {
      return { revenueRows: [], expenseRows: [], totalRevenue: 0, totalExpense: 0, net: 0 };
    }
    const fromTime = new Date(from).getTime();
    const toTime = new Date(to).getTime();
    const yearIdFilter = workingYearId || activeYear?.Year_ID || activeYear?.AcademicYear_ID || '';

    const revenueMap = new Map<string, { code: string; name: string; amount: number }>();
    const expenseMap = new Map<string, { code: string; name: string; amount: number }>();

    const includeAccount = (accId: string) => {
      if (accountMode === 'all') return true;
      if (accountMode === 'one' && accountId) return String(accId) === String(accountId);
      return true;
    };

    postedEntries.forEach((entry: any) => {
      const entryYear = (entry as any).Academic_Year_ID || (entry as any).academicYearId || '';
      if (yearIdFilter && entryYear && entryYear !== yearIdFilter) return;
      const entryTime = new Date(entry.date || entry.createdAt || Date.now()).getTime();
      if (entryTime < fromTime || entryTime > toTime) return;
      if (entry.isBalanced === false) return;

      (entry.lines || []).forEach((line: any) => {
        const acc = accountMap.get(line.accountId);
        if (!acc) return;
        if (!includeAccount(acc.id)) return;
        if (acc.type === AccountType.REVENUE) {
          const amount = Number(line.credit || 0) - Number(line.debit || 0);
          if (amount === 0) return;
          const existing = revenueMap.get(acc.id) || { code: acc.code || acc.id, name: acc.name || acc.id, amount: 0 };
          existing.amount += amount;
          revenueMap.set(acc.id, existing);
        } else if (acc.type === AccountType.EXPENSE) {
          const amount = Number(line.debit || 0) - Number(line.credit || 0);
          if (amount === 0) return;
          const existing = expenseMap.get(acc.id) || { code: acc.code || acc.id, name: acc.name || acc.id, amount: 0 };
          existing.amount += amount;
          expenseMap.set(acc.id, existing);
        }
      });
    });

    const revenueRows = Array.from(revenueMap.values()).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    const expenseRows = Array.from(expenseMap.values()).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    const totalRevenue = revenueRows.reduce((sum, r) => sum + r.amount, 0);
    const totalExpense = expenseRows.reduce((sum, r) => sum + r.amount, 0);
    const net = totalRevenue - totalExpense;

    return { revenueRows, expenseRows, totalRevenue, totalExpense, net };
  }, [executed, appliedFilters, postedEntries, accountMap, workingYearId, activeYear?.Year_ID, activeYear?.AcademicYear_ID]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
          <Filter size={16} />
          <span>مرشحات تقرير الإيرادات والمصروفات</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!filters.from || !filters.to) {
                alert('يجب تحديد الفترة قبل التنفيذ');
                return;
              }
              setAppliedFilters(filters);
              setExecuted(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-xs font-black"
          >
            <Search size={14} />
            تنفيذ التقرير
          </button>
          <button
            onClick={() => window.print()}
            disabled={!executed || (data.revenueRows.length === 0 && data.expenseRows.length === 0)}
            title={
              !executed
                ? 'نفّذ التقرير أولاً'
                : data.revenueRows.length === 0 && data.expenseRows.length === 0
                ? 'لا توجد بيانات قابلة للطباعة'
                : ''
            }
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer size={14} />
            طباعة
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <CalendarRange size={14} /> من تاريخ
          </label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
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
            onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs font-bold text-slate-500">اختيار الحسابات</label>
          <div className="flex items-center gap-3 mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="revexp-accounts"
                checked={filters.accountMode === 'all'}
                onChange={() => setFilters((p) => ({ ...p, accountMode: 'all', accountId: '' }))}
              />
              <span className="text-sm font-semibold text-slate-600">كل الحسابات</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="revexp-accounts"
                checked={filters.accountMode === 'one'}
                onChange={() => setFilters((p) => ({ ...p, accountMode: 'one' }))}
              />
              <span className="text-sm font-semibold text-slate-600">حساب محدد</span>
            </label>
          </div>
          <select
            disabled={filters.accountMode !== 'one'}
            value={filters.accountId}
            onChange={(e) => setFilters((p) => ({ ...p, accountId: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">اختر حساباً</option>
            {(accounts || [])
              .filter((acc: any) => acc.type === AccountType.REVENUE || acc.type === AccountType.EXPENSE)
              .map((acc: any) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      <ReportPrintWrapper
        settings={reportSettings}
        title={title}
        subtitle={`عن الفترة من ${appliedFilters.from || '—'} إلى ${appliedFilters.to || '—'}`}
      >
        <div className="space-y-6">
          {!executed && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 text-center">
              قم بتنفيذ التقرير لعرض النتائج والطباعة.
            </div>
          )}

          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-slate-700">
                <div>{title}</div>
                <div className="text-xs text-slate-500">
                  {`عن الفترة من ${appliedFilters.from || '—'} إلى ${appliedFilters.to || '—'}`}
                </div>
              </div>
              <div className="text-xs font-bold text-slate-500 text-right">
                <div>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</div>
                <div>العام الدراسي: {activeYear?.Year_Name || activeYear?.AcademicYear_Name || activeYear?.Name || '—'}</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-lg font-black text-slate-800">الإيرادات</h4>
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="py-2 px-3 text-start">اسم الحساب</th>
                    <th className="py-2 px-3 text-center">إجمالي الإيراد</th>
                  </tr>
                </thead>
                <tbody>
                  {data.revenueRows.map((row, idx) => (
                    <tr key={`rev-${row.code}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="py-2 px-3 font-semibold text-slate-800">{row.name}</td>
                      <td className="py-2 px-3 text-center font-mono text-emerald-700">{row.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                  {data.revenueRows.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-3 px-3 text-center text-slate-400 font-bold">
                        لا توجد إيرادات في هذه الفترة
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black">
                    <td className="py-2 px-3 text-start">إجمالي الإيرادات</td>
                    <td className="py-2 px-3 text-center font-mono text-emerald-700">
                      {data.totalRevenue.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-lg font-black text-slate-800">المصروفات</h4>
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="py-2 px-3 text-start">اسم الحساب</th>
                    <th className="py-2 px-3 text-center">إجمالي المصروف</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expenseRows.map((row, idx) => (
                    <tr key={`exp-${row.code}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="py-2 px-3 font-semibold text-slate-800">{row.name}</td>
                      <td className="py-2 px-3 text-center font-mono text-rose-700">{row.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                  {data.expenseRows.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-3 px-3 text-center text-slate-400 font-bold">
                        لا توجد مصروفات في هذه الفترة
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black">
                    <td className="py-2 px-3 text-start">إجمالي المصروفات</td>
                    <td className="py-2 px-3 text-center font-mono text-rose-700">
                      {data.totalExpense.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
            <div className="font-bold text-slate-700">صافي النتيجة</div>
            <div className={`font-black text-lg ${data.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {data.net.toFixed(2)} ({data.net >= 0 ? 'فائض' : 'عجز'})
            </div>
          </div>
        </div>
      </ReportPrintWrapper>
    </div>
  );
};

export default RevenueExpenseReport;
