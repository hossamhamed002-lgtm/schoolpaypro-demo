import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';

const warehouses = [
  { id: 'WH-1', name: 'المخزن الرئيسي' },
  { id: 'WH-2', name: 'مخزن الأدوات' },
  { id: 'WH-3', name: 'مخزن الكتب' }
];

const StockMovement: React.FC<{ store: any }> = ({ store }) => {
  const schoolCode = (store?.schoolCode || 'DEFAULT').toUpperCase();
  const activeYear = store?.currentYear?.AcademicYear_ID || store?.activeYear?.id || 'YEAR';
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterItem, setFilterItem] = useState('');
  const [statusOnlyPosted, setStatusOnlyPosted] = useState(true);

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

  const rows = useMemo(() => {
    const all: any[] = [];
    receives.forEach((v) => {
      if (statusOnlyPosted && v.status !== 'POSTED') return;
      v.lines?.forEach((l: any) => {
        all.push({
          date: v.date,
          code: v.code,
          movement: 'إضافة',
          item: l.itemName,
          inQty: Number(l.qty) || 0,
          outQty: 0,
          value: Number(l.totalCost) || 0,
          debit: v.debitAccountId,
          credit: v.creditAccountId,
          stockTypeId: v.stockTypeId,
          warehouseId: v.warehouseId
        });
      });
    });
    issues.forEach((v) => {
      if (statusOnlyPosted && v.status !== 'POSTED') return;
      v.lines?.forEach((l: any) => {
        all.push({
          date: v.date,
          code: v.code,
          movement: 'صرف',
          item: l.itemName,
          inQty: 0,
          outQty: Number(l.qty) || 0,
          value: Number(l.totalCost) || 0,
          debit: v.debitAccountId,
          credit: v.creditAccountId,
          stockTypeId: v.stockTypeId,
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
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.code.localeCompare(b.code));

    const balances: Record<string, number> = {};
    return filtered.map((r) => {
      const key = r.item || 'ALL';
      const prev = balances[key] || 0;
      const next = prev + r.inQty - r.outQty;
      balances[key] = next;
      return { ...r, balance: next };
    });
  }, [receives, issues, fromDate, toDate, filterType, filterWarehouse, filterItem, statusOnlyPosted]);

  const exportCsv = () => {
    const headers = ['التاريخ', 'رقم الإذن', 'نوع الحركة', 'الصنف', 'وارد', 'منصرف', 'الرصيد الكمي', 'القيمة', 'حساب مدين', 'حساب دائن'];
    const csv = [headers, ...rows.map((r) => [
      new Date(r.date).toLocaleDateString('ar-EG'),
      r.code,
      r.movement,
      r.item || '',
      r.inQty,
      r.outQty,
      r.balance,
      r.value,
      r.debit || '',
      r.credit || ''
    ])].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-movement-${schoolCode}-${activeYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center gap-2 justify-end">
        <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600">
          <Download size={16} /> تصدير
        </button>
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
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <input type="checkbox" checked={statusOnlyPosted} onChange={(e) => setStatusOnlyPosted(e.target.checked)} className="h-4 w-4 text-indigo-600 border-slate-300 rounded" />
          عرض المرحّل فقط
        </label>
      </div>
      <div className="overflow-x-auto max-h-[65vh]">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-[11px] font-black uppercase">
            <tr>
              <th className="px-4 py-3 text-center">تحديد</th>
              <th className="px-4 py-3 text-end">التاريخ</th>
              <th className="px-4 py-3 text-end">رقم الإذن</th>
              <th className="px-4 py-3 text-end">الحركة</th>
              <th className="px-4 py-3 text-end">الصنف</th>
              <th className="px-4 py-3 text-end">وارد</th>
              <th className="px-4 py-3 text-end">منصرف</th>
              <th className="px-4 py-3 text-end">الرصيد الكمي</th>
              <th className="px-4 py-3 text-end">القيمة</th>
              <th className="px-4 py-3 text-end">حساب مدين</th>
              <th className="px-4 py-3 text-end">حساب دائن</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-6 text-center text-slate-400 font-bold">لا توجد حركة بعد</td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr key={`${r.code}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-center"><input type="checkbox" className="h-4 w-4 text-indigo-600 border-slate-300 rounded" /></td>
                  <td className="px-4 py-3 text-end text-slate-700">{new Date(r.date).toLocaleDateString('ar-EG')}</td>
                  <td className="px-4 py-3 text-end text-slate-800 font-bold">{r.code}</td>
                  <td className="px-4 py-3 text-end text-slate-700">{r.movement}</td>
                  <td className="px-4 py-3 text-end text-slate-700">{r.item || '—'}</td>
                  <td className="px-4 py-3 text-end text-emerald-700 font-bold">{r.inQty}</td>
                  <td className="px-4 py-3 text-end text-rose-600 font-bold">{r.outQty}</td>
                  <td className="px-4 py-3 text-end text-slate-800 font-bold">{r.balance}</td>
                  <td className="px-4 py-3 text-end text-slate-700 font-bold">{(r.value || 0).toLocaleString('ar-EG')}</td>
                  <td className="px-4 py-3 text-end text-slate-700">{r.debit || '—'}</td>
                  <td className="px-4 py-3 text-end text-slate-700">{r.credit || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockMovement;
