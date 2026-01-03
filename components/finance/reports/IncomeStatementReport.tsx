import React from 'react';
import { CalendarRange, Filter, Printer, Search } from 'lucide-react';
import ReportPrintWrapper from '../../ReportPrintWrapper';

interface IncomeStatementReportProps {
  title: string;
  activeSchool?: any;
  activeYear?: any;
  workingYearId?: string;
  filters: { from: string; to: string };
  setFilters: (fn: any) => void;
  appliedFilters: { from: string; to: string };
  applyFilters: () => void;
  incomeStatement: {
    revenueRows: any[];
    expenseRows: any[];
    totalRevenue: number;
    totalExpense: number;
    net: number;
  };
  reportSettings: any;
}

const IncomeStatementReport: React.FC<IncomeStatementReportProps> = ({
  title,
  activeSchool,
  activeYear,
  workingYearId,
  filters,
  setFilters,
  appliedFilters,
  applyFilters,
  incomeStatement,
  reportSettings
}) => {
  const revenueRows = incomeStatement?.revenueRows || [];
  const expenseRows = incomeStatement?.expenseRows || [];
  const totalRevenue = Number(incomeStatement?.totalRevenue || 0);
  const totalExpense = Number(incomeStatement?.totalExpense || 0);
  const net = Number(incomeStatement?.net || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
          <Filter size={16} />
          <span>مرشحات قائمة الدخل</span>
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
            disabled={revenueRows.length === 0 && expenseRows.length === 0}
            title={
              revenueRows.length === 0 && expenseRows.length === 0
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 no-print">
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
            <h3 className="text-xl font-black text-slate-900">قائمة الدخل</h3>
            <p className="text-sm font-semibold text-slate-600">
              الفترة: {appliedFilters.from || '—'} - {appliedFilters.to || '—'}
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-lg font-black text-slate-800">الإيرادات</h4>
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="py-2 px-3 text-start">اسم الحساب</th>
                    <th className="py-2 px-3 text-center">القيمة</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueRows.map((row, idx) => (
                    <tr key={`rev-${row.accountId}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="py-2 px-3 font-semibold text-slate-800">{row.name}</td>
                      <td className="py-2 px-3 text-center font-mono text-emerald-700">{row.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                  {revenueRows.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-3 px-3 text-center text-slate-400 font-bold">
                        لا توجد إيرادات
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black">
                    <td className="py-2 px-3 text-start">إجمالي الإيرادات</td>
                    <td className="py-2 px-3 text-center font-mono text-emerald-700">{totalRevenue.toFixed(2)}</td>
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
                    <th className="py-2 px-3 text-center">القيمة</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseRows.map((row, idx) => (
                    <tr key={`exp-${row.accountId}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="py-2 px-3 font-semibold text-slate-800">{row.name}</td>
                      <td className="py-2 px-3 text-center font-mono text-rose-700">{row.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                  {expenseRows.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-3 px-3 text-center text-slate-400 font-bold">
                        لا توجد مصروفات
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black">
                    <td className="py-2 px-3 text-start">إجمالي المصروفات</td>
                    <td className="py-2 px-3 text-center font-mono text-rose-700">{totalExpense.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
            <div className="font-bold text-slate-700">صافي الدخل</div>
            <div className={`font-black text-lg ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {net.toFixed(2)} ({net >= 0 ? 'فائض' : 'عجز'})
            </div>
          </div>
        </div>
      </ReportPrintWrapper>
    </div>
  );
};

export default IncomeStatementReport;
