import React, { useMemo, useState } from 'react';
import { CalendarRange, Filter, Printer, Search } from 'lucide-react';
import ReportPrintWrapper from '../../ReportPrintWrapper';
import { AccountType } from '../../../src/types/accounts.types';

interface CashflowReportProps {
  title: string;
  accounts: any[];
  postedEntries: any[];
  activeSchool?: any;
  activeYear?: any;
  workingYearId?: string;
  isYearClosed?: boolean;
  reportSettings: {
    paperSize: string;
    orientation: string;
    font: string;
    fontSize: string;
    lineHeight: string;
  };
}

const CashflowReport: React.FC<CashflowReportProps> = ({
  title,
  accounts,
  postedEntries,
  activeSchool,
  activeYear,
  workingYearId,
  isYearClosed,
  reportSettings
}) => {
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const accountMap = useMemo(() => new Map((accounts || []).map((acc: any) => [acc.id, acc])), [accounts]);
  const cashFlow = useMemo(() => {
    const { from, to } = appliedFilters;
    if (!from || !to) {
      return {
        sections: { operating: [] as any[], investing: [] as any[], financing: [] as any[] },
        operating: { inflow: 0, outflow: 0, net: 0 },
        investing: { inflow: 0, outflow: 0, net: 0 },
        financing: { inflow: 0, outflow: 0, net: 0 },
        totalNet: 0,
        openingCash: 0,
        closingCash: 0
      };
    }
    const fromTime = new Date(from).getTime();
    const toTime = new Date(to).getTime();

    const sections = { operating: [] as any[], investing: [] as any[], financing: [] as any[] };
    let openingCash = 0;
    let closingCash = 0;

    const isCashAccount = (acc: any) => {
      if (!acc) return false;
      const tag = (acc.systemTag || '').toString().toUpperCase();
      return acc.type === AccountType.ASSET && (tag === 'CASH' || tag === 'BANK' || acc.isCash === true);
    };

    postedEntries.forEach((entry: any) => {
      const entryYear = (entry as any).Academic_Year_ID || (entry as any).academicYearId || '';
      const yearIdFilter = workingYearId || activeYear?.Year_ID || activeYear?.AcademicYear_ID || '';
      if (yearIdFilter && entryYear && entryYear !== yearIdFilter) return;

      const entryTime = new Date(entry.date || entry.createdAt || Date.now()).getTime();
      const inRange = entryTime >= fromTime && entryTime <= toTime;

      let cashDeltaThisEntry = 0;
      (entry.lines || []).forEach((line: any) => {
        const acc = accountMap.get(line.accountId);
        if (!acc) return;
        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);
        if (isCashAccount(acc)) {
          const delta = debit - credit;
          cashDeltaThisEntry += delta;
        }
      });

      (entry.lines || []).forEach((line: any) => {
        const acc = accountMap.get(line.accountId);
        if (!acc) return;
        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);
        const delta = debit - credit;
        const hasCash = (entry.lines || []).some((l: any) => isCashAccount(accountMap.get(l.accountId)));
        if (!hasCash) return;

        const classify = () => {
          if (acc.type === AccountType.EXPENSE || acc.type === AccountType.REVENUE || acc.type === AccountType.ASSET) {
            if (acc.type === AccountType.ASSET && acc.subType === 'FIXED') return 'investing';
            if (acc.type === AccountType.EXPENSE || acc.type === AccountType.REVENUE) return 'operating';
          }
          if (acc.type === AccountType.LIABILITY || acc.type === AccountType.EQUITY) return 'financing';
          return 'operating';
        };

        const bucket = classify();
        const inflow = delta < 0 ? Math.abs(delta) : 0;
        const outflow = delta > 0 ? delta : 0;
        if (inRange) {
          sections[bucket].push({
            note: acc.name || acc.code || 'حركة نقدية',
            inflow,
            outflow
          });
        }

        if (!fromTime || entryTime < fromTime) {
          openingCash += delta;
        }
        closingCash += delta;
      });
    });

    const summarize = (list: { inflow: number; outflow: number }[]) => {
      const inflow = list.reduce((s, i) => s + i.inflow, 0);
      const outflow = list.reduce((s, i) => s + i.outflow, 0);
      return { inflow, outflow, net: inflow - outflow };
    };

    const op = summarize(sections.operating);
    const inv = summarize(sections.investing);
    const fin = summarize(sections.financing);
    const totalNet = op.net + inv.net + fin.net;

    return {
      sections,
      operating: op,
      investing: inv,
      financing: fin,
      totalNet,
      openingCash,
      closingCash: openingCash + totalNet
    };
  }, [appliedFilters, postedEntries, accountMap, workingYearId, activeYear?.Year_ID, activeYear?.AcademicYear_ID]);

  return (
    <div className="space-y-6">
      {isYearClosed && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 flex items-center gap-2">
          🔒 عام مغلق – قراءة فقط
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
          <Filter size={16} />
          <span>مرشحات تقرير التدفقات النقدية</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAppliedFilters(filters)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-xs font-black"
          >
            <Search size={14} />
            تحديث التقرير
          </button>
          <button
            onClick={() => window.print()}
            disabled={
              cashFlow.sections.operating.length === 0 &&
              cashFlow.sections.investing.length === 0 &&
              cashFlow.sections.financing.length === 0
            }
            title={
              cashFlow.sections.operating.length === 0 &&
              cashFlow.sections.investing.length === 0 &&
              cashFlow.sections.financing.length === 0
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
      </div>

      <div className="hidden print:block border border-slate-200 rounded-xl p-4 text-right space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-black text-slate-800">{activeSchool?.School_Name || activeSchool?.name || 'المدرسة'}</p>
            <p className="text-xs font-bold text-slate-600">{activeYear?.Year_Name || activeYear?.AcademicYear_Name || activeYear?.Name || workingYearId || ''}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-slate-900">تقرير التدفقات النقدية</p>
            <p className="text-[11px] text-slate-500 font-bold">
              الفترة: {appliedFilters.from || '—'} - {appliedFilters.to || '—'}
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
        settings={reportSettings}
        title={title}
        subtitle={`الفترة من ${appliedFilters.from || '—'} إلى ${appliedFilters.to || '—'}`}
      >
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-xl font-black text-slate-900">تقرير التدفقات النقدية</h3>
            <p className="text-sm font-semibold text-slate-600">
              الفترة: {appliedFilters.from || '—'} - {appliedFilters.to || '—'}
            </p>
          </div>

          {[
            { id: 'operating', title: 'التدفقات النقدية من الأنشطة التشغيلية', color: 'emerald' },
            { id: 'investing', title: 'التدفقات النقدية من الأنشطة الاستثمارية', color: 'indigo' },
            { id: 'financing', title: 'التدفقات النقدية من الأنشطة التمويلية', color: 'amber' }
          ].map((section) => {
            const list = cashFlow.sections[section.id as 'operating' | 'investing' | 'financing'];
            const summary = cashFlow[section.id as 'operating' | 'investing' | 'financing'];
            const colorClass =
              section.color === 'emerald'
                ? 'text-emerald-700'
                : section.color === 'indigo'
                ? 'text-indigo-700'
                : 'text-amber-700';
            return (
              <div key={section.id} className="space-y-2">
                <h4 className="text-lg font-black text-slate-800">{section.title}</h4>
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr>
                        <th className="py-2 px-3 text-start">البيان</th>
                        <th className="py-2 px-3 text-center">تدفق داخل</th>
                        <th className="py-2 px-3 text-center">تدفق خارج</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((row, idx) => (
                        <tr key={`${section.id}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="py-2 px-3 font-semibold text-slate-800">{row.note}</td>
                          <td className="py-2 px-3 text-center font-mono text-emerald-700">{row.inflow.toFixed(2)}</td>
                          <td className="py-2 px-3 text-center font-mono text-rose-700">{row.outflow.toFixed(2)}</td>
                        </tr>
                      ))}
                      {list.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-3 px-3 text-center text-slate-400 font-bold">
                            لا توجد حركات في هذا القسم
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-black">
                        <td className="py-2 px-3 text-start">صافي التدفق</td>
                        <td className="py-2 px-3 text-center font-mono">-</td>
                        <td className={`py-2 px-3 text-center font-mono ${colorClass}`}>
                          {summary.net.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="font-bold text-slate-700">صافي التدفق النقدي الكلي: {cashFlow.totalNet.toFixed(2)}</div>
            <div className="font-bold text-slate-700">رصيد النقدية أول الفترة: {cashFlow.openingCash.toFixed(2)}</div>
            <div className="font-bold text-slate-700">رصيد النقدية آخر الفترة: {cashFlow.closingCash.toFixed(2)}</div>
          </div>
        </div>
      </ReportPrintWrapper>
    </div>
  );
};

export default CashflowReport;
