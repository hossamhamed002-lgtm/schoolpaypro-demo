import React, { useMemo, useState } from 'react';
import { Download, Printer, Layers } from 'lucide-react';
import { useJournal } from '../../src/hooks/useJournal';
import { exportUtils } from '../../modules/exam-control/services/exportUtils';

const warehouses = [
  { id: 'WH-1', name: 'المخزن الرئيسي' },
  { id: 'WH-2', name: 'مخزن الأدوات' },
  { id: 'WH-3', name: 'مخزن الكتب' }
];

const StockReports: React.FC<{ store: any }> = ({ store }) => {
  const schoolCode = (store?.schoolCode || 'DEFAULT').toUpperCase();
  const activeYear = store?.currentYear?.AcademicYear_ID || store?.activeYear?.id || 'YEAR';
  const { entries } = useJournal();

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterItem, setFilterItem] = useState('');
  const [filterMovement, setFilterMovement] = useState<'all' | 'in' | 'out'>('all');
  const [tab, setTab] = useState<'movement' | 'balance' | 'accounting'>('movement');

  const inventoryTypes: any[] = useMemo(() => {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(`INVENTORY_TYPES__${schoolCode}`);
    return raw ? JSON.parse(raw) : [];
  }, [schoolCode]);

  const receives = useMemo(() => {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(`STOCK_RECEIVES__${schoolCode}__${activeYear}`);
    return raw ? (JSON.parse(raw) as any[]) : [];
  }, [schoolCode, activeYear]);

  const issues = useMemo(() => {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(`STOCK_ISSUES__${schoolCode}__${activeYear}`);
    return raw ? (JSON.parse(raw) as any[]) : [];
  }, [schoolCode, activeYear]);

  const movementRows = useMemo(() => {
    const all: any[] = [];
    receives.forEach((v) => {
      if (v.status !== 'POSTED') return;
      v.lines?.forEach((l: any) => {
        all.push({
          date: v.date,
          code: v.code,
          type: 'إضافة',
          stockTypeId: v.stockTypeId,
          stockTypeName: v.stockTypeName,
          item: l.itemName,
          qty: Number(l.qty) || 0,
          cost: Number(l.totalCost) || 0,
          warehouseId: v.warehouseId
        });
      });
    });
    issues.forEach((v) => {
      if (v.status !== 'POSTED') return;
      v.lines?.forEach((l: any) => {
        all.push({
          date: v.date,
          code: v.code,
          type: 'صرف',
          stockTypeId: v.stockTypeId,
          stockTypeName: v.stockTypeName,
          item: l.itemName,
          qty: -(Number(l.qty) || 0),
          cost: Number(l.totalCost) || 0,
          warehouseId: v.warehouseId
        });
      });
    });

    const filtered = all
      .filter((r) => {
        if (fromDate && r.date < fromDate) return false;
        if (toDate && r.date > toDate) return false;
        if (filterType && r.stockTypeId !== filterType) return false;
        if (filterWarehouse && r.warehouseId !== filterWarehouse) return false;
        if (filterItem && !(r.item || '').includes(filterItem)) return false;
        if (filterMovement === 'in' && r.qty <= 0) return false;
        if (filterMovement === 'out' && r.qty >= 0) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.code.localeCompare(b.code));

    const balances: Record<string, number> = {};
    return filtered.map((r) => {
      const key = r.item || 'ALL';
      const prev = balances[key] || 0;
      const next = prev + r.qty;
      balances[key] = next;
      return { ...r, balance: next, totalCost: r.cost };
    });
  }, [receives, issues, fromDate, toDate, filterType, filterWarehouse, filterItem, filterMovement]);

  const balanceRows = useMemo(() => {
    const map: Record<string, { stockTypeName: string; item: string; inQty: number; outQty: number; cost: number }> = {};
    movementRows.forEach((r) => {
      const key = `${r.stockTypeId || ''}__${r.item || ''}`;
      if (!map[key]) map[key] = { stockTypeName: r.stockTypeName, item: r.item, inQty: 0, outQty: 0, cost: 0 };
      if (r.qty >= 0) {
        map[key].inQty += r.qty;
        map[key].cost += r.totalCost || 0;
      } else {
        map[key].outQty += Math.abs(r.qty);
      }
    });
    return Object.values(map).map((row) => {
      const balanceQty = row.inQty - row.outQty;
      const avgCost = row.inQty > 0 ? row.cost / row.inQty : 0;
      return {
        stockTypeName: row.stockTypeName,
        item: row.item,
        inQty: row.inQty,
        outQty: row.outQty,
        balanceQty,
        avgCost,
        balanceValue: balanceQty * avgCost
      };
    });
  }, [movementRows]);

  const accountingRows = useMemo(() => {
    const all: any[] = [];
    const journalIndex = entries || [];
    const pushRow = (v: any, source: string) => {
      if (!v.journalId || v.status !== 'POSTED') return;
      const j = journalIndex.find((e: any) => e.id === v.journalId);
      if (!j || j.source !== source) return;
      const dr = j.lines?.find((l: any) => (l.debit || 0) > 0);
      const cr = j.lines?.find((l: any) => (l.credit || 0) > 0);
      all.push({
        date: v.date,
        code: v.code,
        debit: dr?.accountId || '—',
        credit: cr?.accountId || '—',
        amount: Number(v.totals?.cost) || 0,
        description: v.description || ''
      });
    };
    receives.forEach((v) => pushRow(v, 'inventory-receive'));
    issues.forEach((v) => pushRow(v, 'manual')); // inventory-issue كانت تُسجل بمصدر manual
    return all
      .filter((r) => {
        if (fromDate && r.date < fromDate) return false;
        if (toDate && r.date > toDate) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.code.localeCompare(b.code));
  }, [receives, issues, entries, fromDate, toDate]);

  const hasData = tab === 'movement' ? movementRows.length : tab === 'balance' ? balanceRows.length : accountingRows.length;

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-6" dir="rtl" id="stock-reports-area">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('movement')}
            className={`px-4 py-2 rounded-xl text-sm font-black border ${tab === 'movement' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'}`}
          >
            حركة المخزون
          </button>
          <button
            onClick={() => setTab('balance')}
            className={`px-4 py-2 rounded-xl text-sm font-black border ${tab === 'balance' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'}`}
          >
            الرصيد الحالي
          </button>
          <button
            onClick={() => setTab('accounting')}
            className={`px-4 py-2 rounded-xl text-sm font-black border ${tab === 'accounting' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'}`}
          >
            الحركة المحاسبية
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={!hasData}
            onClick={() => hasData && exportUtils.print('stock-reports-area', 'landscape', 8)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 disabled:opacity-50">
            <Printer size={16} /> طباعة
          </button>
          <button onClick={() => {
            const headers = tab === 'movement'
              ? ['التاريخ','رقم الإذن','الحركة','نوع المخزون','الصنف','الكمية','التكلفة','الرصيد بعد']
              : tab === 'balance'
              ? ['نوع المخزون','الصنف','الوارد','المنصرف','الرصيد','متوسط التكلفة','قيمة الرصيد']
              : ['التاريخ','رقم الإذن','مدين','دائن','المبلغ','البيان'];
            const rows = tab === 'movement'
              ? movementRows.map((r) => [new Date(r.date).toLocaleDateString('ar-EG'), r.code, r.type, r.stockTypeName, r.item || '', r.qty, r.totalCost, r.balance])
              : tab === 'balance'
              ? balanceRows.map((r) => [r.stockTypeName, r.item, r.inQty, r.outQty, r.balanceQty, r.avgCost, r.balanceValue])
              : accountingRows.map((r) => [new Date(r.date).toLocaleDateString('ar-EG'), r.code, r.debit, r.credit, r.amount, r.description]);
            const csv = [headers, ...rows]
              .map((row) => row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
              .join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `stock-report-${tab}-${schoolCode}-${activeYear}.csv`;
            link.click();
            URL.revokeObjectURL(url);
          }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600">
            <Download size={16} /> تصدير
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <div>
          <label className="text-xs font-bold text-slate-500">من تاريخ</label>
          <input value={fromDate} onChange={(e) => setFromDate(e.target.value)} type="date" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 text-end" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500">إلى تاريخ</label>
          <input value={toDate} onChange={(e) => setToDate(e.target.value)} type="date" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 text-end" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500">نوع المخزون</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 text-end">
            <option value="">الكل</option>
            {inventoryTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500">المخزن</label>
          <select value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 text-end">
            <option value="">الكل</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500">الصنف</label>
          <input value={filterItem} onChange={(e) => setFilterItem(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 text-end" placeholder="بحث بالصنف" />
        </div>
      </div>

      <div className="overflow-x-auto max-h-[65vh]">
        {tab === 'movement' && (
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-black uppercase">
              <tr>
                <th className="px-4 py-3 text-center">تحديد</th>
                <th className="px-4 py-3 text-end">التاريخ</th>
                <th className="px-4 py-3 text-end">رقم الإذن</th>
                <th className="px-4 py-3 text-end">الحركة</th>
                <th className="px-4 py-3 text-end">نوع المخزون</th>
                <th className="px-4 py-3 text-end">الصنف</th>
                <th className="px-4 py-3 text-end">الكمية (+/-)</th>
                <th className="px-4 py-3 text-end">التكلفة</th>
                <th className="px-4 py-3 text-end">الرصيد بعد</th>
              </tr>
            </thead>
            <tbody>
              {movementRows.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-6 text-center text-slate-400 font-bold">لا توجد بيانات</td></tr>
              ) : (
                movementRows.map((r, idx) => (
                  <tr key={`${r.code}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-center"><input type="checkbox" className="h-4 w-4 text-indigo-600 border-slate-300 rounded" /></td>
                    <td className="px-4 py-3 text-end text-slate-700">{new Date(r.date).toLocaleDateString('ar-EG')}</td>
                    <td className="px-4 py-3 text-end text-slate-800 font-bold">{r.code}</td>
                    <td className="px-4 py-3 text-end text-slate-700">{r.type}</td>
                    <td className="px-4 py-3 text-end text-slate-700">{r.stockTypeName}</td>
                    <td className="px-4 py-3 text-end text-slate-700">{r.item || '—'}</td>
                    <td className={`px-4 py-3 text-end font-bold ${r.qty >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{r.qty}</td>
                    <td className="px-4 py-3 text-end text-slate-700 font-bold">{(r.totalCost || 0).toLocaleString('ar-EG')}</td>
                    <td className="px-4 py-3 text-end text-slate-800 font-bold">{r.balance}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {tab === 'balance' && (
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-black uppercase">
              <tr>
                <th className="px-4 py-3 text-end">نوع المخزون</th>
                <th className="px-4 py-3 text-end">الصنف</th>
                <th className="px-4 py-3 text-end">إجمالي وارد</th>
                <th className="px-4 py-3 text-end">إجمالي منصرف</th>
                <th className="px-4 py-3 text-end">الرصيد الكمي</th>
                <th className="px-4 py-3 text-end">متوسط التكلفة</th>
                <th className="px-4 py-3 text-end">قيمة الرصيد</th>
              </tr>
            </thead>
            <tbody>
              {balanceRows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400 font-bold">لا توجد بيانات</td></tr>
              ) : (
                balanceRows.map((r, idx) => (
                  <tr key={`${r.item}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-end text-slate-700">{r.stockTypeName}</td>
                    <td className="px-4 py-3 text-end text-slate-700">{r.item || '—'}</td>
                    <td className="px-4 py-3 text-end text-emerald-700 font-bold">{r.inQty}</td>
                    <td className="px-4 py-3 text-end text-rose-600 font-bold">{r.outQty}</td>
                    <td className="px-4 py-3 text-end text-slate-800 font-bold">{r.balanceQty}</td>
                    <td className="px-4 py-3 text-end text-slate-700 font-bold">{r.avgCost.toLocaleString('ar-EG', { maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-end text-slate-800 font-bold">{r.balanceValue.toLocaleString('ar-EG')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {tab === 'accounting' && (
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-black uppercase">
              <tr>
                <th className="px-4 py-3 text-end">التاريخ</th>
                <th className="px-4 py-3 text-end">رقم الإذن</th>
                <th className="px-4 py-3 text-end">الحساب المدين</th>
                <th className="px-4 py-3 text-end">الحساب الدائن</th>
                <th className="px-4 py-3 text-end">المبلغ</th>
                <th className="px-4 py-3 text-end">البيان</th>
              </tr>
            </thead>
            <tbody>
              {accountingRows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400 font-bold">لا توجد بيانات</td></tr>
              ) : (
                accountingRows.map((r, idx) => (
                  <tr key={`${r.code}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-end text-slate-700">{new Date(r.date).toLocaleDateString('ar-EG')}</td>
                    <td className="px-4 py-3 text-end text-slate-800 font-bold">{r.code}</td>
                    <td className="px-4 py-3 text-end text-slate-700">{r.debit}</td>
                    <td className="px-4 py-3 text-end text-slate-700">{r.credit}</td>
                    <td className="px-4 py-3 text-end text-slate-800 font-bold">{(r.amount || 0).toLocaleString('ar-EG')}</td>
                    <td className="px-4 py-3 text-end text-slate-700">{r.description || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StockReports;
