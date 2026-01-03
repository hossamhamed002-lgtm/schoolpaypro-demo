import React from 'react';
import { CalendarRange, Filter, Printer, Search } from 'lucide-react';
import ReportPrintWrapper from '../../ReportPrintWrapper';

interface GeneralLedgerReportProps {
  title: string;
  activeSchool?: any;
  activeYear?: any;
  workingYearId?: string;
  filters: any;
  setFilters: (fn: any) => void;
  appliedFilters: any;
  applyFilters: () => void;
  ledgerAccount: any;
  ledgerNoData: boolean;
  ledgerLines: any[];
  ledgerTotals: { debit: number; credit: number; opening: number; closing: number };
  ledgerFilteredAccounts: any[];
  reportSettings: any;
}

const GeneralLedgerReport: React.FC<GeneralLedgerReportProps> = ({
  title,
  activeSchool,
  activeYear,
  workingYearId,
  filters,
  setFilters,
  appliedFilters,
  applyFilters,
  ledgerAccount,
  ledgerNoData,
  ledgerLines,
  ledgerTotals,
  ledgerFilteredAccounts,
  reportSettings
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
          <Filter size={16} />
          <span>مرشحات التقرير</span>
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
            disabled={!ledgerAccount || ledgerNoData}
            title={!ledgerAccount ? 'اختر حسابًا لعرض التقرير' : ''}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer size={14} />
            طباعة
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 no-print">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <Search size={14} /> بحث حساب
          </label>
          <input
            type="text"
            value={filters.accountQuery}
            onChange={(e) => setFilters((p: any) => ({ ...p, accountQuery: e.target.value }))}
            placeholder="كود أو اسم الحساب"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
          />
          <select
            value={filters.accountId}
            onChange={(e) => setFilters((p: any) => ({ ...p, accountId: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
          >
            <option value="">اختر الحساب</option>
            {ledgerFilteredAccounts.map((acc: any) => (
              <option key={acc.id} value={acc.id}>
                {acc.code} - {acc.name}
              </option>
            ))}
          </select>
        </div>
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
          <label className="text-xs font-bold text-slate-500">مصدر القيد</label>
          <select
            value={filters.entryType}
            onChange={(e) => setFilters((p: any) => ({ ...p, entryType: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
          >
            <option value="all">الكل</option>
            <option value="manual">يدوي</option>
            <option value="accrual">استحقاق</option>
            <option value="receipt">رسوم/قبض</option>
            <option value="stores">مخازن</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">السنة المالية</label>
          <input
            type="text"
            value={filters.yearId}
            onChange={(e) => setFilters((p: any) => ({ ...p, yearId: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
            placeholder="السنة النشطة"
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
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <h3 className="text-xl font-black text-slate-900">تقرير الأستاذ العام</h3>
            <p className="text-sm font-semibold text-slate-600">
              {ledgerAccount ? `${ledgerAccount.code} - ${ledgerAccount.name}` : 'لم يتم اختيار حساب'}
            </p>
            <p className="text-xs font-bold text-slate-500">
              الفترة: {appliedFilters.from || '—'} - {appliedFilters.to || '—'}
            </p>
          </div>

          {ledgerNoData ? (
            <div className="border border-amber-100 bg-amber-50 text-amber-700 font-bold rounded-2xl px-4 py-4">
              لا توجد حركات لهذا الحساب في هذه الفترة.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="py-2 px-3 text-center">م</th>
                    <th className="py-2 px-3 text-center">رقم القيد</th>
                    <th className="py-2 px-3 text-center">التاريخ</th>
                    <th className="py-2 px-3 text-start">البيان</th>
                    <th className="py-2 px-3 text-center">مدين</th>
                    <th className="py-2 px-3 text-center">دائن</th>
                    <th className="py-2 px-3 text-center">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerLines.map((line: any, idx: number) => (
                    <tr key={`${line.entryNumber}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="py-2 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">{line.entryNumber}</td>
                      <td className="py-2 px-3 text-center text-slate-700">
                        {line.entryDate ? new Date(line.entryDate).toLocaleDateString('ar-EG') : '—'}
                      </td>
                      <td className="py-2 px-3 text-start text-slate-700">{line.entryDescription || '—'}</td>
                      <td className="py-2 px-3 text-center font-mono text-emerald-700">{Number(line.debit || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-center font-mono text-rose-700">{Number(line.credit || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-center font-mono text-slate-900">{Number(line.balance || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black">
                    <td colSpan={4} className="py-2 px-3 text-center">الإجمالي</td>
                    <td className="py-2 px-3 text-center font-mono text-emerald-700">{Number(ledgerTotals.debit || 0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-center font-mono text-rose-700">{Number(ledgerTotals.credit || 0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-center font-mono text-slate-900">{Number(ledgerTotals.closing || 0).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </ReportPrintWrapper>
    </div>
  );
};

export default GeneralLedgerReport;
