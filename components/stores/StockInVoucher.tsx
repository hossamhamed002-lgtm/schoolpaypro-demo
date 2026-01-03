import React, { useMemo, useState } from 'react';
import { Plus, Edit3, Trash2, Download, Search, Filter, ClipboardList, CheckCircle2, XCircle } from 'lucide-react';
import { useAccounts } from '../../src/hooks/useAccountsLogic';
import { useJournal } from '../../src/hooks/useJournal';
import { JournalEntry } from '../../src/types/journal.types';

type VoucherStatus = 'draft' | 'posted';

type VoucherLine = {
  id: string;
  item: string;
  unit: string;
  qty: number;
  price: number;
  total: number;
  selected?: boolean;
};

type StockVoucher = {
  id: string;
  code: string;
  date: string;
  store: string;
  note: string;
  status: VoucherStatus;
  lines: VoucherLine[];
  totalQty: number;
  totalValue: number;
};

// بيانات مبدئية محلية للعرض فقط
const mockStores = ['المخزن الرئيسي', 'مخزن الأدوات', 'مخزن الكتب'];
const mockItems = ['أقلام', 'دفاتر', 'أوراق طباعة', 'أجهزة حاسوب', 'كتب دراسية'];

const seqKey = 'STOCK_IN_SEQ';

const StockInVoucher: React.FC = () => {
  const { accounts } = useAccounts();
  const { addEntry } = useJournal();
  const [vouchers, setVouchers] = useState<StockVoucher[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | VoucherStatus>('all');
  const [storeFilter, setStoreFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  const [voucherForm, setVoucherForm] = useState<Omit<StockVoucher, 'lines' | 'totalQty' | 'totalValue'>>({
    id: '',
    code: '',
    date: new Date().toISOString().slice(0, 10),
    store: '',
    note: '',
    status: 'draft'
  });
  const [lines, setLines] = useState<VoucherLine[]>([{
    id: 'l1',
    item: '',
    unit: '',
    qty: 0,
    price: 0,
    total: 0
  }]);
  const [inventoryAccountId, setInventoryAccountId] = useState('');
  const [creditAccountId, setCreditAccountId] = useState('');
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    let data = vouchers;
    if (search) {
      const term = search.toLowerCase();
      data = data.filter((v) => `${v.code} ${v.store} ${v.note}`.toLowerCase().includes(term));
    }
    if (statusFilter !== 'all') data = data.filter((v) => v.status === statusFilter);
    if (storeFilter) data = data.filter((v) => v.store === storeFilter);
    if (dateFilter) data = data.filter((v) => v.date === dateFilter);
    return data;
  }, [vouchers, search, statusFilter, storeFilter, dateFilter]);

  const totals = useMemo(() => {
    const totalQty = lines.reduce((acc, l) => acc + (Number(l.qty) || 0), 0);
    const totalValue = lines.reduce((acc, l) => acc + (Number(l.total) || 0), 0);
    const invalidLine = lines.some((l) => !l.item || !l.unit || l.qty <= 0 || l.price <= 0);
    return { totalQty, totalValue, ready: totalQty > 0 && totalValue > 0 && !invalidLine };
  }, [lines]);

  const toggleLineSelect = (id: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, selected: !l.selected } : l)));
  };

  const addLine = () => {
    setLines((prev) => [...prev, { id: `l${prev.length + 1}`, item: '', unit: '', qty: 0, price: 0, total: 0 }]);
  };

  const removeLine = () => {
    setLines((prev) => {
      const keep = prev.filter((l) => !l.selected);
      return keep.length ? keep : prev;
    });
  };

  const updateLine = (id: string, field: keyof VoucherLine, value: any) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const next: VoucherLine = { ...l, [field]: value } as VoucherLine;
        if (field === 'qty' || field === 'price') {
          const qty = field === 'qty' ? Number(value) : Number(l.qty);
          const price = field === 'price' ? Number(value) : Number(l.price);
          next.total = qty * price;
        }
        return next;
      })
    );
  };

  const nextCode = () => {
    const raw = localStorage.getItem(seqKey);
    const current = raw ? Number(raw) || 0 : 0;
    const next = current + 1;
    localStorage.setItem(seqKey, String(next));
    return `IN-${String(next).padStart(4, '0')}`;
  };

  const openAdd = () => {
    setMode('add');
    setVoucherForm({
      id: '',
      code: nextCode(),
      date: new Date().toISOString().slice(0, 10),
      store: '',
      note: '',
      status: 'draft'
    });
    setLines([{ id: 'l1', item: '', unit: '', qty: 0, price: 0, total: 0 }]);
    setInventoryAccountId('');
    setCreditAccountId('');
    setError('');
    setShowModal(true);
  };

  const openEdit = () => {
    const current = vouchers.find((v) => v.id === selectedId);
    if (!current) return;
    setMode('edit');
    setVoucherForm({ ...current });
    setLines(current.lines.map((l) => ({ ...l, selected: false })));
    setInventoryAccountId(inventoryAccountId || '');
    setCreditAccountId(creditAccountId || '');
    setError('');
    setShowModal(true);
  };

  const saveDraft = () => {
    const { code, date, store, note, status } = voucherForm;
    if (!code || !date || !store) {
      setError('برجاء إكمال البيانات الأساسية (رقم الإذن، التاريخ، المخزن).');
      return;
    }
    if (lines.some((l) => !l.item || !l.unit || l.qty <= 0 || l.price <= 0)) {
      setError('يرجى إدخال بنود صحيحة (كمية وسعر أكبر من صفر).');
      return;
    }
    const totalQty = totals.totalQty;
    const totalValue = totals.totalValue;
    const payload: StockVoucher = {
      id: mode === 'edit' && voucherForm.id ? voucherForm.id : `V-${Date.now()}`,
      code,
      date,
      store,
      note,
      status,
      lines: lines.map((l) => ({ ...l, selected: false })),
      totalQty,
      totalValue
    };
    setVouchers((prev) => {
      if (mode === 'edit') return prev.map((v) => (v.id === payload.id ? payload : v));
      return [payload, ...prev];
    });
    setSelectedId(payload.id);
    setShowModal(false);
  };

  const postVoucher = () => {
    if (!totals.ready) {
      setError('لا يمكن الترحيل قبل اكتمال البيانات.');
      return;
    }
    if (!inventoryAccountId || !creditAccountId) {
      setError('يرجى اختيار حساب المخزون والحساب المقابل.');
      return;
    }
    const current = mode === 'edit' && voucherForm.id ? voucherForm : { ...voucherForm, id: `V-${Date.now()}` };
    const totalValue = totals.totalValue;

    const journal: JournalEntry = {
      id: `JR-${Date.now()}`,
      journalNo: Date.now(),
      date: current.date,
      description: current.note || `ترحيل إذن إضافة ${current.code}`,
      source: 'stock-in',
      sourceRefId: current.id,
      status: 'POSTED',
      createdAt: new Date().toISOString(),
      createdBy: 'system',
      lines: [
        { id: 'dr', accountId: inventoryAccountId, debit: totalValue, credit: 0, note: 'إضافة مخزون' },
        { id: 'cr', accountId: creditAccountId, debit: 0, credit: totalValue, note: 'طرف مقابل' }
      ],
      totalDebit: totalValue,
      totalCredit: totalValue,
      isBalanced: true
    };
    addEntry(journal);

    const payload: StockVoucher = {
      id: current.id,
      code: current.code,
      date: current.date,
      store: current.store,
      note: current.note,
      status: 'posted',
      lines: lines.map((l) => ({ ...l, selected: false })),
      totalQty: totals.totalQty,
      totalValue: totals.totalValue
    };
    setVouchers((prev) => {
      const exists = prev.some((v) => v.id === payload.id);
      if (exists) return prev.map((v) => (v.id === payload.id ? payload : v));
      return [payload, ...prev];
    });
    setSelectedId(payload.id);
    setShowModal(false);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3 justify-end">
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white text-sm font-black shadow-sm"
            >
              <Plus size={16} /> إضافة إذن
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
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600"
            >
              <Download size={16} /> تصدير
            </button>
          </div>

          <div className="flex flex-wrap gap-3 items-center justify-between">
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
                  value={storeFilter}
                  onChange={(e) => setStoreFilter(e.target.value)}
                  className="bg-transparent outline-none text-sm font-bold text-slate-700"
                >
                  <option value="">كل المخازن</option>
                  {mockStores.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="all">كل الحالات</option>
                <option value="draft">مسودة</option>
                <option value="posted">مرحّل</option>
              </select>
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
                <th className="p-3 text-right">رقم الإذن</th>
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">المخزن</th>
                <th className="p-3 text-right">إجمالي الكمية</th>
                <th className="p-3 text-right">إجمالي القيمة</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400 font-bold">لا توجد بيانات</td>
                </tr>
              ) : (
                filtered.map((v) => (
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
                    <td className="p-3 text-slate-700">{v.store}</td>
                    <td className="p-3 text-emerald-700 font-bold">{v.totalQty}</td>
                    <td className="p-3 text-emerald-700 font-bold">{v.totalValue.toLocaleString('ar-EG')}</td>
                    <td className="p-3">
                      {v.status === 'posted' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700">
                          <CheckCircle2 size={12} /> مرحّل
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-100 text-slate-600">
                          مسودة
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">{v.note || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Stock In</p>
                <h3 className="text-xl font-black text-slate-900">{mode === 'add' ? 'إضافة إذن إضافة' : 'تعديل إذن إضافة'}</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full bg-slate-100 px-3 py-2 text-slate-500 font-bold hover:bg-slate-200"
              >
                إغلاق
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 text-sm font-bold px-3 py-2 m-4 rounded-xl">
                {error}
              </div>
            )}

            <div className="p-6 space-y-4 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-slate-500">رقم الإذن</label>
                  <input
                    readOnly
                    value={voucherForm.code}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-slate-500">التاريخ</label>
                  <input
                    type="date"
                    value={voucherForm.date}
                    onChange={(e) => setVoucherForm((p) => ({ ...p, date: e.target.value }))}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-slate-500">المخزن</label>
                  <select
                    value={voucherForm.store}
                    onChange={(e) => setVoucherForm((p) => ({ ...p, store: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                  >
                    <option value="">-- اختر --</option>
                    {mockStores.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-slate-500">بيان عام</label>
                  <input
                    value={voucherForm.note}
                    onChange={(e) => setVoucherForm((p) => ({ ...p, note: e.target.value }))}
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
                            onChange={() => toggleLineSelect(line.id)}
                            className="h-4 w-4 text-indigo-600 border-slate-300 rounded"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            list="items-list"
                            value={line.item}
                            onChange={(e) => updateLine(line.id, 'item', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                            placeholder="اختر الصنف"
                          />
                          <datalist id="items-list">
                            {mockItems.map((it) => (
                              <option key={it} value={it} />
                            ))}
                          </datalist>
                        </td>
                        <td className="p-2">
                          <input
                            value={line.unit}
                            onChange={(e) => updateLine(line.id, 'unit', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                            placeholder="الوحدة"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={line.qty}
                            onChange={(e) => updateLine(line.id, 'qty', Number(e.target.value))}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-emerald-700 font-bold"
                            min={0}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={line.price}
                            onChange={(e) => updateLine(line.id, 'price', Number(e.target.value))}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-emerald-700 font-bold"
                            min={0}
                          />
                        </td>
                        <td className="p-2 text-emerald-700 font-bold">{(line.total || 0).toLocaleString('ar-EG')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={addLine}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                    >
                      <Plus size={14} /> إضافة سطر
                    </button>
                    <button
                      onClick={removeLine}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 font-bold"
                    >
                      <Trash2 size={14} /> حذف السطر المحدد
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold">
                    <span className="text-slate-600">إجمالي الكمية: <span className="text-emerald-700">{totals.totalQty}</span></span>
                    <span className="text-slate-600">إجمالي القيمة: <span className="text-emerald-700">{totals.totalValue.toLocaleString('ar-EG')}</span></span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-black ${totals.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {totals.ready ? 'جاهز للترحيل' : 'غير مكتمل'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-slate-500">حساب المخزون (مدين)</label>
                  <select
                    value={inventoryAccountId}
                    onChange={(e) => setInventoryAccountId(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <option value="">-- اختر الحساب --</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>{`${acc.code} - ${acc.name}`}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-slate-500">حساب مقابل (دائن)</label>
                  <select
                    value={creditAccountId}
                    onChange={(e) => setCreditAccountId(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <option value="">-- اختر الحساب --</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>{`${acc.code} - ${acc.name}`}</option>
                    ))}
                  </select>
                </div>
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
                  disabled={!totals.ready}
                  className={`px-4 py-2 rounded-xl font-bold shadow-sm ${totals.ready ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
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

export default StockInVoucher;

