import React from 'react';
import { CalendarRange, Filter, Printer, Search } from 'lucide-react';
import ReportPrintWrapper from '../../ReportPrintWrapper';
import { AccountType } from '../../../src/types/accounts.types';

interface BalanceSheetReportProps {
  title: string;
  activeSchool?: any;
  activeYear?: any;
  workingYearId?: string;
  filters: { asOf: string; showZero: boolean };
  setFilters: (fn: any) => void;
  appliedFilters: { asOf: string; showZero: boolean };
  applyFilters: () => void;
  balanceSheet: {
    assets: any[];
    liabilities: any[];
    equity: any[];
    assetsTotal: number;
    liabilitiesTotal: number;
    equityTotal: number;
    balanced: boolean;
  };
  reportSettings: any;
}

const BalanceSheetReport: React.FC<BalanceSheetReportProps> = ({
  title,
  activeSchool,
  activeYear,
  workingYearId,
  filters,
  setFilters,
  appliedFilters,
  applyFilters,
  balanceSheet,
  reportSettings
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
          <Filter size={16} />
          <span>مرشحات الميزانية</span>
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
            disabled={
              balanceSheet.assets.length === 0 &&
              balanceSheet.liabilities.length === 0 &&
              balanceSheet.equity.length === 0
            }
            title={
              balanceSheet.assets.length === 0 &&
              balanceSheet.liabilities.length === 0 &&
              balanceSheet.equity.length === 0
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 no-print">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <CalendarRange size={14} /> كما في تاريخ
          </label>
          <input
            type="date"
            value={filters.asOf}
            onChange={(e) => setFilters((p: any) => ({ ...p, asOf: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">عرض الأرصدة الصفرية</label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.showZero}
              onChange={(e) => setFilters((p: any) => ({ ...p, showZero: e.target.checked }))}
              className="h-4 w-4"
            />
            <span className="text-sm font-semibold text-slate-600">إظهار</span>
          </div>
        </div>
      </div>

      <div className="hidden print:block border border-slate-200 rounded-xl p-4 text-right space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-black text-slate-800">{activeSchool?.School_Name || activeSchool?.name || 'المدرسة'}</p>
            <p className="text-xs font-bold text-slate-600">{activeYear?.Year_Name || activeYear?.AcademicYear_Name || activeYear?.Name || workingYearId || ''}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-slate-900">الميزانية العمومية</p>
            <p className="text-[11px] text-slate-500 font-bold">
              كما في: {appliedFilters.asOf || '—'}
            </p>
            <p className="text-[10px] text-slate-400 font-bold">
              تاريخ الطباعة: {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="h-16 w-16 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[10px] text-slate-300 font-black">
            {activeSchool?.Logo ? <img src={activeSchool.Logo} alt="logo" className="h-16 w-16 object-contain" /> : 'LOGO'}
          </div>
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
            <h3 className="text-xl font-black text-slate-900">الميزانية العمومية</h3>
            <p className="text-sm font-semibold text-slate-600">
              كما في تاريخ: {appliedFilters.asOf || '—'}
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-lg font-black text-slate-800">الأصول</h4>
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="py-2 px-3 text-start">كود الحساب</th>
                    <th className="py-2 px-3 text-start">اسم الحساب</th>
                    <th className="py-2 px-3 text-center">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceSheet.assets.map((row, idx) => (
                    <tr key={row.account.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">{row.account.code || row.account.id}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{row.account.name || row.account.code}</td>
                      <td className="py-2 px-3 text-center font-mono text-emerald-700">{row.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                  {balanceSheet.assets.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-3 px-3 text-center text-slate-400 font-bold">
                        لا توجد أصول
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black">
                    <td className="py-2 px-3 text-start" colSpan={2}>إجمالي الأصول</td>
                    <td className="py-2 px-3 text-center font-mono text-emerald-700">{balanceSheet.assetsTotal.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-lg font-black text-slate-800">الخصوم</h4>
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="py-2 px-3 text-start">كود الحساب</th>
                    <th className="py-2 px-3 text-start">اسم الحساب</th>
                    <th className="py-2 px-3 text-center">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceSheet.liabilities.map((row, idx) => (
                    <tr key={row.account.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">{row.account.code || row.account.id}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{row.account.name || row.account.code}</td>
                      <td className="py-2 px-3 text-center font-mono text-rose-700">{row.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                  {balanceSheet.liabilities.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-3 px-3 text-center text-slate-400 font-bold">
                        لا توجد خصوم
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black">
                    <td className="py-2 px-3 text-start" colSpan={2}>إجمالي الخصوم</td>
                    <td className="py-2 px-3 text-center font-mono text-rose-700">{balanceSheet.liabilitiesTotal.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-lg font-black text-slate-800">حقوق الملكية</h4>
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="py-2 px-3 text-start">كود الحساب</th>
                    <th className="py-2 px-3 text-start">اسم الحساب</th>
                    <th className="py-2 px-3 text-center">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceSheet.equity.map((row, idx) => (
                    <tr key={row.account.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">{row.account.code || row.account.id}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{row.account.name || row.account.code}</td>
                      <td className="py-2 px-3 text-center font-mono text-indigo-700">{row.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                  {balanceSheet.equity.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-3 px-3 text-center text-slate-400 font-bold">
                        لا توجد حسابات حقوق ملكية
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black">
                    <td className="py-2 px-3 text-start" colSpan={2}>إجمالي حقوق الملكية</td>
                    <td className="py-2 px-3 text-center font-mono text-indigo-700">{balanceSheet.equityTotal.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
            <div className="font-bold text-slate-700">
              ملخص الميزانية: أصول = {balanceSheet.assetsTotal.toFixed(2)} | خصوم + حقوق الملكية = {(balanceSheet.liabilitiesTotal + balanceSheet.equityTotal).toFixed(2)}
            </div>
            <div className={`font-black ${balanceSheet.balanced ? 'text-emerald-700' : 'text-rose-700'}`}>
              {balanceSheet.balanced ? '✔️ الميزانية متوازنة' : '⚠️ الميزانية غير متوازنة'}
            </div>
          </div>
        </div>
      </ReportPrintWrapper>
    </div>
  );
};

export default BalanceSheetReport;
