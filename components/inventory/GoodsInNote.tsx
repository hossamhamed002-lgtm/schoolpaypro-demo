import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit3, Trash2, Download, Search, Filter, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAccounts } from '../../src/hooks/useAccountsLogic';
import { useJournal } from '../../src/hooks/useJournal';
import { JournalEntry } from '../../src/types/journal.types';

type VoucherStatus = 'DRAFT' | 'POSTED';
type PaymentMethod = 'cash' | 'bank' | 'credit';

type GoodsInLine = {
  id: string;
  itemName: string;
  unit: string;
  qty: number;
  unitCost: number;
  lineTotal: number;
  selected?: boolean;
  notes?: string;
};

type GoodsInVoucher = {
  id: string;
  code: string;
  date: string;
  warehouseId: string;
  stockTypeId: string;
  vendorName?: string;
  vendorId?: string;
  paymentMethod: PaymentMethod;
  treasuryAccountId?: string;
  notes?: string;
  status: VoucherStatus;
  totalQty: number;
  totalAmount: number;
  lines: GoodsInLine[];
};

type InventoryType = {
  id: string;
  name: string;
  inventoryAccountId?: string;
  purchaseAccountId?: string;
  supplierAccountId?: string;
};

const GOODS_IN_KEY = 'GIN_VOUCHERS';
const GIN_SEQ_KEY = 'GIN_SEQ';
const INVENTORY_TYPES_KEY = 'INVENTORY_TYPES';

const warehouses = [
  { id: 'WH-1', name: 'المخزن الرئيسي' },
  { id: 'WH-2', name: 'مخزن الأدوات' },
  { id: 'WH-3', name: 'مخزن الكتب' }
];

const GoodsInNote: React.FC<{ store: any }> = ({ store }) => {
  const { accounts } = useAccounts();
  const { addEntry } = useJournal();
  const schoolCode = (store?.schoolCode || 'DEFAULT').toUpperCase();
  const activeYear = store?.currentYear?.AcademicYear_ID || store?.activeYear?.id || 'YEAR';

  const [vouchers, setVouchers] = useState<GoodsInVoucher[]>(() => {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(`${GOODS_IN_KEY}__${schoolCode}__${activeYear}`);
    return raw ? (JSON.parse(raw) as GoodsInVoucher[]) : [];
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VoucherStatus>('all');
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  const [voucher, setVoucher] = useState<Omit<GoodsInVoucher, 'lines' | 'totalQty' | 'totalAmount'>>({
    id: '',
    code: '',
    date: new Date().toISOString().slice(0, 10),
    warehouseId: '',
    stockTypeId: '',
    vendorName: '',
    vendorId: '',
    paymentMethod: 'cash',
    treasuryAccountId: '',
    notes: '',
    status: 'DRAFT'
  });
  const [lines, setLines] = useState<GoodsInLine[]>([
    { id: 'l1', itemName: '', unit: '', qty: 0, unitCost: 0, lineTotal: 0 }
  ]);
  const [error, setError] = useState('');
  const [inventoryTypes, setInventoryTypes] = useState<InventoryType[]>(() => {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(`${INVENTORY_TYPES_KEY}__${schoolCode}`);
    return raw ? (JSON.parse(raw) as InventoryType[]) : [];
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${GOODS_IN_KEY}__${schoolCode}__${activeYear}`, JSON.stringify(vouchers));
  }, [vouchers, schoolCode, activeYear]);

  const filtered = useMemo(() => {
    let data = vouchers;
    if (search) {
      const term = search.toLowerCase();
      data = data.filter((v) => `${v.code} ${v.notes || ''} ${v.vendorName || ''}`.toLowerCase().includes(term));
    }
    if (statusFilter !== 'all') data = data.filter((v) => v.status === statusFilter);
    return data;
  }, [vouchers, search, statusFilter]);

  const totals = useMemo(() => {
    const totalQty = lines.reduce((a, l) => a + (Number(l.qty) || 0), 0);
    const totalAmount = lines.reduce((a, l) => a + (Number(l.lineTotal) || 0), 0);
    const invalid = lines.some((l) => !l.itemName || !l.unit || l.qty <= 0 || l.unitCost <= 0);
    return { totalQty, totalAmount, invalid };
  }, [lines]);

  const journalPreview = useMemo(() => {
    const type = inventoryTypes.find((t) => t.id === voucher.stockTypeId);
    const inventoryAcc = type?.inventoryAccountId || '';
    const supplierAcc = type?.supplierAccountId || '';
    const amount = totals.totalAmount;

    let creditAcc = '';
    if (voucher.paymentMethod === 'cash' || voucher.paymentMethod === 'bank') creditAcc = voucher.treasuryAccountId || '';
    if (voucher.paymentMethod === 'credit') creditAcc = supplierAcc || '';

    const linesPreview = [
      inventoryAcc
        ? { accountId: inventoryAcc, debit: amount, credit: 0, note: 'إضافة مخزون' }
        : null,
      creditAcc
        ? { accountId: creditAcc, debit: 0, credit: amount, note: voucher.paymentMethod === 'credit' ? 'مورد' : 'طرف مقابل' }
        : null
    ].filter(Boolean) as { accountId: string; debit: number; credit: number; note: string }[];

    const balanced =
      linesPreview.length === 2 &&
      linesPreview.every((l) => l.accountId) &&
      amount > 0 &&
      linesPreview.reduce((a, l) => a + l.debit, 0) === linesPreview.reduce((a, l) => a + l.credit, 0);

    return { lines: linesPreview, balanced, inventoryAcc, supplierAcc };
  }, [inventoryTypes, voucher.stockTypeId, voucher.paymentMethod, voucher.treasuryAccountId, totals.totalAmount]);

  const nextCode = () => {
    const dateYear = new Date(voucher.date || new Date().toISOString()).getFullYear();
    const key = `${GIN_SEQ_KEY}__${schoolCode}__${activeYear}`;
    const raw = localStorage.getItem(key);
    const current = raw ? Number(raw) || 0 : 0;
    const next = current + 1;
    localStorage.setItem(key, String(next));
    return `GIN-${dateYear}-${String(next).padStart(6, '0')}`;
  };

  const openAdd = () => {
    setMode('add');
    setVoucher({
      id: '',
      code: nextCode(),
      date: new Date().toISOString().slice(0, 10),
      warehouseId: '',
      stockTypeId: '',
      vendorName: '',
      vendorId: '',
      paymentMethod: 'cash',
      treasuryAccountId: '',
      notes: '',
      status: 'DRAFT'
    });
    setLines([{ id: 'l1', itemName: '', unit: '', qty: 0, unitCost: 0, lineTotal: 0 }]);
    setError('');
    setShowModal(true);
    setSelectedId(null);
  };

  const openEdit = () => {
    const current = vouchers.find((v) => v.id === selectedId);
    if (!current) return;
    setMode('edit');
    setVoucher({ ...current });
    setLines(current.lines.map((l) => ({ ...l, selected: false })));
    setError('');
    setShowModal(true);
  };

  const saveDraft = () => {
    if (!voucher.code) {
      setError('رقم الإذن غير متوفر.');
      return;
    }
    if (!voucher.date || !voucher.warehouseId || !voucher.stockTypeId) {
      setError('برجاء إكمال بيانات الإذن الأساسية.');
      return;
    }
    if (totals.invalid || totals.totalAmount <= 0) {
      setError('يجب إدخال بنود صحيحة (كمية وسعر أكبر من صفر).');
      return;
    }

    const payload: GoodsInVoucher = {
      id: mode === 'edit' && voucher.id ? voucher.id : `GIN-${Date.now()}`,
      ...voucher,
      lines: lines.map((l) => ({ ...l, selected: false })),
      totalQty: totals.totalQty,
      totalAmount: totals.totalAmount
    };
    setVouchers((prev) => {
      if (mode === 'edit') return prev.map((v) => (v.id === payload.id ? payload : v));
      return [payload, ...prev];
    });
    setSelectedId(payload.id);
    setShowModal(false);
  };

  const canPostReason = () => {
    if (totals.invalid || totals.totalAmount <= 0) return 'أكمل البنود (كمية وسعر أكبر من صفر).';
    if (!voucher.warehouseId || !voucher.stockTypeId) return 'حدد المخزن ونوع المخزون.';
    if (voucher.paymentMethod !== 'credit' && !voucher.treasuryAccountId) return 'حدد حساب الخزينة/البنك.';
    if (voucher.paymentMethod === 'credit') {
      const type = inventoryTypes.find((t) => t.id === voucher.stockTypeId);
      if (!type?.supplierAccountId) return 'اربط حساب المورد لنوع المخزون قبل الترحيل.';
    }
    if (!journalPreview.balanced) return 'القيد غير موزون.';
    return '';
  };

  const postVoucher = () => {
    const reason = canPostReason();
    if (reason) {
      setError(reason);
      return;
    }
    const payload: GoodsInVoucher = {
      id: mode === 'edit' && voucher.id ? voucher.id : `GIN-${Date.now()}`,
      ...voucher,
      status: 'POSTED',
      lines: lines.map((l) => ({ ...l, selected: false })),
      totalQty: totals.totalQty,
      totalAmount: totals.totalAmount
    };

    const previewLines = journalPreview.lines;
    const mappedAccounts = previewLines.map((pl) => {
      const acc = accounts.find((a) => a.id === pl.accountId);
      return { ...pl, accountCode: acc?.code || '', accountName: acc?.name || '' };
    });

    const journal: JournalEntry = {
      id: `JR-${Date.now()}`,
      journalNo: Date.now(),
      date: payload.date,
      description: payload.notes || `ترحيل إذن إضافة ${payload.code}`,
      source: 'inventory-gin',
      sourceRefId: payload.id,
      status: 'POSTED',
      createdAt: new Date().toISOString(),
      createdBy: store?.currentUser?.Username || 'system',
      lines: mappedAccounts.map((l, idx) => ({
        id: `L-${idx}`,
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
        note: l.note
      })),
      totalDebit: totals.totalAmount,
      totalCredit: totals.totalAmount,
      isBalanced: true
    };
    addEntry(journal);

    setVouchers((prev) => {
      const exists = prev.some((v) => v.id === payload.id);
      if (exists) return prev.map((v) => (v.id === payload.id ? payload : v));
      return [payload, ...prev];
    });
    setSelectedId(payload.id);
    setShowModal(false);
  };

  const tooltipReason = canPostReason();

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white text-sm font-black shadow-sm"
            >
              <Plus size={16} /> إضافة
            </button>
            <button
              disabled={!selectedId}
              onClick={openEdit}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 disabled:opacity-50"
            >
              <Edit3 size={16} /> تعديل
            </button>
            <button
              disabled={!selectedId}
              onClick={() => {
                if (!selectedId) return;
                setVouchers((prev) => prev.filter((v) => v.id !== selectedId));
                setSelectedId(null);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-black text-rose-600 disabled:opacity-50"
            >
              <Trash2 size={16} /> حذف
            </button>
            <button
              disabled={!!tooltipReason || !selectedId}
              onClick={() => setShowModal(true)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black shadow-sm ${tooltipReason || !selectedId ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white'}`}
              title={tooltipReason || ''}
            >
              ترحيل
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600">
              <Download size={16} /> تصدير
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Search size={16} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث"
                className="bg-transparent outline-none text-sm font-bold text-slate-700"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center justify-end">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Filter size={16} className="text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-transparent outline-none text-sm font-bold text-slate-700"
                >
                  <option value="all">كل الحالات</option>
                  <option value="DRAFT">مسودة</option>
                  <option value="POSTED">مرحّل</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[65vh]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold text-[11px] sticky top-0">
              <tr>
                <th className="p-3 text-center">تحديد</th>
                <th className="p-3 text-right">الكود</th>
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">المخزن</th>
                <th className="p-3 text-right">النوع</th>
                <th className="p-3 text-right">الإجمالي</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">المورد/الدفع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400 font-bold">لا توجد بيانات</td>
                </tr>
              ) : (
                filtered.map((v) => {
                  const typeName = inventoryTypes.find((t) => t.id === v.stockTypeId)?.name || '—';
                  return (
                    <tr key={v.id} className={`${selectedId === v.id ? 'bg-indigo-50/60' : 'bg-white'} hover:bg-slate-50`}>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedId === v.id}
                          onChange={() => setSelectedId(selectedId === v.id ? null : v.id)}
                          className="h-4 w-4 text-indigo-600 border-slate-300 rounded"
                        />
                      </td>
                      <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{v.code}</td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">{new Date(v.date).toLocaleDateString('ar-EG')}</td>
                      <td className="p-3 text-slate-700">{warehouses.find((w) => w.id === v.warehouseId)?.name || '—'}</td>
                      <td className="p-3 text-slate-700">{typeName}</td>
                      <td className="p-3 text-emerald-700 font-bold">{v.totalAmount.toLocaleString('ar-EG')}</td>
                      <td className="p-3">
                        {v.status === 'POSTED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700">
                            <CheckCircle2 size={12} /> مرحّل
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-100 text-slate-600">
                            مسودة
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">{v.vendorName || v.paymentMethod || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col" dir="rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Goods In Note</p>
                <h3 className="text-xl font-black text-slate-900">{mode === 'add' ? 'إضافة إذن إضافة مخزون' : 'تعديل إذن إضافة مخزون'}</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full bg-slate-100 px-3 py-2 text-slate-500 font-bold hover:bg-slate-200"
              >
                إغلاق
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 text-sm font-bold px-3 py-2 m-4 rounded-xl flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="p-6 space-y-4 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-slate-500">الكود</label>
                  <input readOnly value={voucher.code} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-slate-500">التاريخ</label>
                  <input type="date" value={voucher.date} onChange={(e) => setVoucher((p) => ({ ...p, date: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-slate-500">المخزن</label>
                  <select value={voucher.warehouseId} onChange={(e) => setVoucher((p) => ({ ...p, warehouseId: e.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                    <option value="">-- اختر --</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-slate-500">نوع المخزون</label>
                  <select value={voucher.stockTypeId} onChange={(e) => setVoucher((p) => ({ ...p, stockTypeId: e.target.value }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                    <option value="">-- اختر --</option>
                    {inventoryTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-slate-500">طريقة الدفع</label>
                  <select
                    value={voucher.paymentMethod}
                    onChange={(e) => setVoucher((p) => ({ ...p, paymentMethod: e.target.value as PaymentMethod, treasuryAccountId: '' }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                  >
                    <option value="cash">نقدي</option>
                    <option value="bank">بنكي</option>
                    <option value="credit">آجل</option>
                  </select>
                </div>
                {(voucher.paymentMethod === 'cash' || voucher.paymentMethod === 'bank') && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-black text-slate-500">حساب الخزينة/البنك</label>
                    <select
                      value={voucher.treasuryAccountId}
                      onChange={(e) => setVoucher((p) => ({ ...p, treasuryAccountId: e.target.value }))}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                    >
                      <option value="">-- اختر --</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>{`${acc.code} - ${acc.name}`}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-slate-500">المورد (اختياري)</label>
                  <input
                    value={voucher.vendorName || ''}
                    onChange={(e) => setVoucher((p) => ({ ...p, vendorName: e.target.value }))}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    placeholder="اسم المورد"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-slate-500">ملاحظات</label>
                  <input
                    value={voucher.notes || ''}
                    onChange={(e) => setVoucher((p) => ({ ...p, notes: e.target.value }))}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    placeholder="ملاحظات"
                  />
                </div>
              </div>

              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold text-[11px] sticky top-0">
                    <tr>
                      <th className="p-3 text-center">تحديد</th>
                      <th className="p-3 text-right">الصنف</th>
                      <th className="p-3 text-right">الوحدة</th>
                      <th className="p-3 text-right">الكمية</th>
                      <th className="p-3 text-right">سعر الوحدة</th>
                      <th className="p-3 text-right">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((line) => (
                      <tr key={line.id} className="bg-white hover:bg-slate-50">
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={!!line.selected}
                            onChange={() => setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, selected: !l.selected } : l)))}
                            className="h-4 w-4 text-indigo-600 border-slate-300 rounded"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={line.itemName}
                            onChange={(e) => setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, itemName: e.target.value } : l)))}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                            placeholder="اسم الصنف"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={line.unit}
                            onChange={(e) => setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, unit: e.target.value } : l)))}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                            placeholder="الوحدة"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={line.qty}
                            onChange={(e) => {
                              const qty = Number(e.target.value);
                              setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, qty, lineTotal: qty * l.unitCost } : l)));
                            }}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-emerald-700 font-bold"
                            min={0}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={line.unitCost}
                            onChange={(e) => {
                              const unitCost = Number(e.target.value);
                              setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, unitCost, lineTotal: unitCost * l.qty } : l)));
                            }}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-emerald-700 font-bold"
                            min={0}
                          />
                        </td>
                        <td className="p-2 text-emerald-700 font-bold">{(line.lineTotal || 0).toLocaleString('ar-EG')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLines((prev) => [...prev, { id: `l${prev.length + 1}`, itemName: '', unit: '', qty: 0, unitCost: 0, lineTotal: 0 }])}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                    >
                      <Plus size={14} /> إضافة سطر
                    </button>
                    <button
                      onClick={() => setLines((prev) => {
                        const keep = prev.filter((l) => !l.selected);
                        return keep.length ? keep : prev;
                      })}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 font-bold"
                    >
                      <Trash2 size={14} /> حذف السطر المحدد
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold">
                    <span className="text-slate-600">إجمالي الكمية: <span className="text-emerald-700">{totals.totalQty}</span></span>
                    <span className="text-slate-600">إجمالي القيمة: <span className="text-emerald-700">{totals.totalAmount.toLocaleString('ar-EG')}</span></span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-black ${!totals.invalid && totals.totalAmount > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {!totals.invalid && totals.totalAmount > 0 ? 'جاهز للترحيل' : 'غير مكتمل'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 text-sm font-black text-slate-700">معاينة القيد التلقائي</div>
                <table className="w-full text-sm">
                  <thead className="bg-white text-slate-500 font-bold text-[11px]">
                    <tr>
                      <th className="p-3 text-right">الحساب</th>
                      <th className="p-3 text-right">مدين</th>
                      <th className="p-3 text-right">دائن</th>
                      <th className="p-3 text-right">بيان</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {journalPreview.lines.map((l, idx) => {
                      const acc = accounts.find((a) => a.id === l.accountId);
                      return (
                        <tr key={idx}>
                          <td className="p-3 text-slate-700">{acc ? `${acc.code} - ${acc.name}` : l.accountId}</td>
                          <td className="p-3 text-emerald-700 font-bold">{l.debit.toLocaleString('ar-EG')}</td>
                          <td className="p-3 text-emerald-700 font-bold">{l.credit.toLocaleString('ar-EG')}</td>
                          <td className="p-3 text-slate-600">{l.note}</td>
                        </tr>
                      );
                    })}
                    {journalPreview.lines.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-400 font-bold">أضف بيانات كاملة لعرض القيد</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  إلغاء
                </button>
                <button
                  onClick={saveDraft}
                  className="px-4 py-2 rounded-xl bg-indigo-500 text-white font-bold shadow-sm hover:bg-indigo-600"
                >
                  حفظ
                </button>
                <button
                  onClick={postVoucher}
                  disabled={!!tooltipReason}
                  className={`px-4 py-2 rounded-xl font-bold shadow-sm ${tooltipReason ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white'}`}
                  title={tooltipReason || ''}
                >
                  ترحيل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoodsInNote;

