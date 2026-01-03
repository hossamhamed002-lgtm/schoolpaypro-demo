import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit3, Trash2, Download, Search, Filter, CheckCircle2, AlertCircle, Printer } from 'lucide-react';
import { useAccounts } from '../../src/hooks/useAccountsLogic';
import { useJournal } from '../../src/hooks/useJournal';
import { JournalEntry } from '../../src/types/journal.types';
import { AccountLevel, AccountType } from '../../src/types/accounts.types';
import { exportUtils } from '../../modules/exam-control/services/exportUtils';
import { isFinancialYearClosed } from '../../src/utils/financialYearClose';

type StockReceiveStatus = 'DRAFT' | 'POSTED' | 'VOID';

type ReceiveLine = {
  id: string;
  itemId: string;
  itemName: string;
  qty: number;
  unit?: string;
  unitCost?: number;
  totalCost: number;
  notes?: string;
  selected?: boolean;
};

type ReceiveVoucher = {
  id: string;
  code: string;
  date: string;
  stockTypeId: string;
  stockTypeName: string;
  warehouseId?: string;
  reference?: string;
  description: string;
  status: StockReceiveStatus;
  totals: { qty: number; cost: number };
  createdAt: string;
  createdBy: string;
  postedAt?: string;
  postedBy?: string;
  journalId?: string;
  debitAccountId?: string;
  creditAccountId?: string;
  lines: ReceiveLine[];
};

type InventoryType = {
  id: string;
  name: string;
  inventoryAccountId?: string;
  contraAccountId?: string;
};

const STORAGE_KEY = 'STOCK_RECEIVES';
const SEQ_KEY = 'SEQ_STOCK_RECEIVE';
const INVENTORY_TYPES_KEY = 'INVENTORY_TYPES';

const warehouses = [
  { id: 'WH-1', name: 'المخزن الرئيسي' },
  { id: 'WH-2', name: 'مخزن الأدوات' },
  { id: 'WH-3', name: 'مخزن الكتب' }
];

const mockItems = ['كتب', 'أجهزة', 'طابعات', 'أحبار', 'مقاعد', 'أدوات معمل', 'أقلام', 'دفاتر'];

const StockReceiveVoucher: React.FC<{ store: any }> = ({ store }) => {
  const { accounts, addAccount, getNextCode } = useAccounts();
  const { addEntry } = useJournal();
  const schoolCode = (store?.schoolCode || 'DEFAULT').toUpperCase();
  const activeYear = store?.currentYear?.AcademicYear_ID || store?.activeYear?.id || 'YEAR';
  const userName = store?.currentUser?.Username || 'system';
  const lockTooltip = '⚠️ تم إغلاق العام المالي، لا يمكن التعديل';
  const isClosed = useMemo(() => isFinancialYearClosed(schoolCode, activeYear), [activeYear, schoolCode]);

  const [inventoryTypes, setInventoryTypes] = useState<InventoryType[]>(() => {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(`${INVENTORY_TYPES_KEY}__${schoolCode}`);
    return raw ? (JSON.parse(raw) as InventoryType[]) : [];
  });
  const [vouchers, setVouchers] = useState<ReceiveVoucher[]>(() => {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(`${STORAGE_KEY}__${schoolCode}__${activeYear}`);
    return raw ? (JSON.parse(raw) as ReceiveVoucher[]) : [];
  });
  const [seq, setSeq] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const raw = localStorage.getItem(`${SEQ_KEY}__${schoolCode}__${activeYear}`);
    return raw ? Number(raw) || 0 : 0;
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StockReceiveStatus>('all');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  const [voucher, setVoucher] = useState<Omit<ReceiveVoucher, 'lines' | 'totals'>>({
    id: '',
    code: '',
    date: new Date().toISOString().slice(0, 10),
    stockTypeId: '',
    stockTypeName: '',
    warehouseId: '',
    reference: '',
    description: '',
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    createdBy: userName
  });
  const [lines, setLines] = useState<ReceiveLine[]>([{ id: 'l1', itemId: '', itemName: '', qty: 0, unit: '', unitCost: 0, totalCost: 0 }]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${STORAGE_KEY}__${schoolCode}__${activeYear}`, JSON.stringify(vouchers));
  }, [vouchers, schoolCode, activeYear]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${INVENTORY_TYPES_KEY}__${schoolCode}`, JSON.stringify(inventoryTypes));
  }, [inventoryTypes, schoolCode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${SEQ_KEY}__${schoolCode}__${activeYear}`, String(seq));
  }, [seq, schoolCode, activeYear]);

  const filtered = useMemo(() => {
    let data = vouchers;
    if (search) {
      const term = search.toLowerCase();
      data = data.filter((v) => `${v.code} ${v.description} ${v.reference || ''}`.toLowerCase().includes(term));
    }
    if (statusFilter !== 'all') data = data.filter((v) => v.status === statusFilter);
    if (filterType) data = data.filter((v) => v.stockTypeId === filterType);
    return data;
  }, [vouchers, search, statusFilter, filterType]);

  const totals = useMemo(() => {
    const qty = lines.reduce((a, l) => a + (Number(l.qty) || 0), 0);
    const cost = lines.reduce((a, l) => a + (Number(l.totalCost) || 0), 0);
    const invalid = lines.some((l) => !l.itemName || l.qty <= 0 || (l.unitCost || 0) < 0);
    return { qty, cost, invalid };
  }, [lines]);

  const deriveYear = () => {
    const candidates = [
      (store?.activeYear && (store.activeYear.name || store.activeYear.AcademicYear_Name)) || '',
      (store?.currentYear && (store.currentYear.Name || store.currentYear.AcademicYear_Name)) || '',
      new Date().getFullYear().toString()
    ];
    const match = candidates.find((c) => /\d{4}/.test(c));
    return (match && (match.match(/\d{4}/)?.[0] as string)) || new Date().getFullYear().toString();
  };

  const generateCode = () => {
    const year = deriveYear();
    let next = seq + 1;
    let code = '';
    let exists = true;
    while (exists) {
      code = `RCV-${year}-${String(next).padStart(6, '0')}`;
      exists = vouchers.some((v) => v.code === code);
      if (exists) next += 1;
    }
    setSeq(next);
    return code;
  };

  const ensureAccount = (name: string, type: AccountType) => {
    const existing = accounts.find((a) => a.name === name);
    if (existing) return existing;
    const parent =
      accounts.find((a) => a.type === type && a.level === AccountLevel.ROOT) ||
      accounts.find((a) => a.level === AccountLevel.ROOT) ||
      accounts[0];
    const code = getNextCode(parent?.id || '');
    const acc = {
      id: `ACC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code,
      name,
      type,
      level: AccountLevel.LEAF,
      parentId: parent?.id,
      isMain: false,
      balance: 0
    };
    addAccount(acc);
    return acc;
  };

  const openAdd = () => {
    if (isClosed) return;
    setMode('add');
    setVoucher({
      id: '',
      code: generateCode(),
      date: new Date().toISOString().slice(0, 10),
      stockTypeId: '',
      stockTypeName: '',
      warehouseId: '',
      reference: '',
      description: '',
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      createdBy: userName
    });
    setLines([{ id: 'l1', itemId: '', itemName: '', qty: 0, unit: '', unitCost: 0, totalCost: 0 }]);
    setError('');
    setSelectedId(null);
    setShowModal(true);
  };

  const openEdit = () => {
    if (isClosed) return;
    const current = vouchers.find((v) => v.id === selectedId);
    if (!current || current.status === 'POSTED') return;
    setMode('edit');
    setVoucher({ ...current });
    setLines(current.lines.map((l) => ({ ...l, selected: false })));
    setError('');
    setShowModal(true);
  };

  const saveDraft = () => {
    if (isClosed) return;
    if (!voucher.code || !voucher.date || !voucher.stockTypeId) {
      setError('برجاء إكمال بيانات الإذن الأساسية.');
      return;
    }
    if (totals.invalid || totals.cost < 0 || totals.qty <= 0) {
      setError('يجب إدخال بنود صحيحة (كمية أكبر من صفر).');
      return;
    }
    const payload: ReceiveVoucher = {
      id: mode === 'edit' && voucher.id ? voucher.id : `RCV-${Date.now()}`,
      ...voucher,
      totals: { qty: totals.qty, cost: totals.cost },
      lines: lines.map((l) => ({ ...l, selected: false }))
    };
    setVouchers((prev) => {
      if (mode === 'edit') return prev.map((v) => (v.id === payload.id ? payload : v));
      return [payload, ...prev];
    });
    setSelectedId(payload.id);
    setShowModal(false);
  };

  const buildPostingAccounts = () => {
    const type = inventoryTypes.find((t) => t.id === voucher.stockTypeId);
    let debitId = type?.inventoryAccountId || '';
    let creditId = type?.contraAccountId || '';
    let updated = type ? { ...type } : undefined;

    if (!debitId) {
      const inv = ensureAccount(`مخزون - ${type?.name || 'وارد'}`, AccountType.ASSET);
      debitId = inv?.id || '';
      if (updated) updated.inventoryAccountId = debitId;
    }
    if (!creditId) {
      const contra = ensureAccount(`موردين - ${type?.name || 'وارد'}`, AccountType.LIABILITY);
      creditId = contra?.id || '';
      if (updated) updated.contraAccountId = creditId;
    }

    if (type && updated && (updated.inventoryAccountId !== type.inventoryAccountId || updated.contraAccountId !== type.contraAccountId)) {
      setInventoryTypes((prev) => prev.map((t) => (t.id === type.id ? { ...t, ...updated } : t)));
    }
    return { debitId, creditId };
  };

  const canPostReason = () => {
    if (totals.invalid || totals.qty <= 0) return 'أضف بنوداً صحيحة بكمية أكبر من صفر.';
    if (totals.cost <= 0) return 'لا يمكن الترحيل بدون تكلفة للبنود.';
    if (!voucher.stockTypeId) return 'اختر نوع المخزون.';
    const { debitId, creditId } = buildPostingAccounts();
    if (!debitId || !creditId) return 'تعذر تحديد حسابات القيد تلقائياً.';
    return '';
  };

  const postVoucher = () => {
    if (isClosed) return;
    const reason = canPostReason();
    if (reason) {
      setError(reason);
      return;
    }
    const { debitId, creditId } = buildPostingAccounts();
    const payload: ReceiveVoucher = {
      id: mode === 'edit' && voucher.id ? voucher.id : `RCV-${Date.now()}`,
      ...voucher,
      status: 'POSTED',
      postedAt: new Date().toISOString(),
      postedBy: userName,
      debitAccountId: debitId,
      creditAccountId: creditId,
      totals: { qty: totals.qty, cost: totals.cost },
      lines: lines.map((l) => ({ ...l, selected: false }))
    };

    const journal: JournalEntry = {
      id: `JR-${Date.now()}`,
      journalNo: Date.now(),
      date: payload.date,
      description: payload.description || `ترحيل إذن إضافة ${payload.code}`,
      source: 'inventory-receive',
      sourceRefId: payload.id,
      status: 'POSTED',
      createdAt: new Date().toISOString(),
      createdBy: userName,
      lines: [
        { id: 'DR', accountId: debitId, debit: totals.cost, credit: 0, note: 'إضافة مخزون' },
        { id: 'CR', accountId: creditId, debit: 0, credit: totals.cost, note: 'التزام/مورد' }
      ],
      totalDebit: totals.cost,
      totalCredit: totals.cost,
      isBalanced: true
    };
    addEntry(journal);

    payload.journalId = journal.id;

    setVouchers((prev) => {
      const exists = prev.some((v) => v.id === payload.id);
      if (exists) return prev.map((v) => (v.id === payload.id ? payload : v));
      return [payload, ...prev];
    });
    setSelectedId(payload.id);
    setShowModal(false);
  };

  const reason = canPostReason();

  const exportCsv = () => {
    const headers = ['الكود', 'التاريخ', 'نوع المخزون', 'إجمالي الكمية', 'إجمالي التكلفة', 'الحالة', 'البيان'];
    const rows = filtered.map((v) => [
      v.code,
      new Date(v.date).toLocaleDateString('ar-EG'),
      v.stockTypeName,
      v.totals.qty,
      v.totals.cost,
      v.status,
      v.description || ''
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-receives-${schoolCode}-${activeYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" dir="rtl" id="receive-print-area">
      {isClosed && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 flex items-center gap-2">
          🔒 هذا العام المالي مغلق – العرض للقراءة فقط
        </div>
      )}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-900">إذن إضافة مخزن</h2>
            <p className="text-sm text-slate-500 font-bold">إضافة أصناف للمخزن مع قيد محاسبي تلقائي</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white text-sm font-black shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isClosed}
              title={isClosed ? lockTooltip : ''}
            >
              <Plus size={16} /> إضافة
            </button>
            <button
              disabled={isClosed || !selectedId || vouchers.find((v) => v.id === selectedId)?.status === 'POSTED'}
              onClick={openEdit}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 disabled:opacity-50"
              title={isClosed ? lockTooltip : ''}
            >
              <Edit3 size={16} /> تعديل
            </button>
            <button
              disabled={!selectedId || isClosed}
              onClick={() => {
                const current = vouchers.find((v) => v.id === selectedId);
                if (!current) return;
                if (current.status === 'POSTED') {
                  setError('لا يمكن إلغاء إذن مُرحّل.');
                  return;
                }
                setVouchers((prev) => prev.map((v) => (v.id === current.id ? { ...v, status: 'VOID' as StockReceiveStatus } : v)));
                setSelectedId(null);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-black text-rose-600 disabled:opacity-50"
            >
              <Trash2 size={16} /> حذف
            </button>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600">
              <Download size={16} /> تصدير
            </button>
            <button
              onClick={() => exportUtils.print('receive-print-area', 'landscape', 8)}
              disabled={!filtered.length}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600 disabled:opacity-50"
            >
              <Printer size={16} /> طباعة
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-end">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Search size={16} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSelectedId(null);
                  setSearch(e.target.value);
                }}
                placeholder="بحث"
                className="bg-transparent outline-none text-sm font-bold text-slate-700"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setSelectedId(null);
                  setStatusFilter(e.target.value as any);
                }}
                className="bg-transparent outline-none text-sm font-bold text-slate-700"
              >
                <option value="all">كل الحالات</option>
                <option value="DRAFT">مسودة</option>
                <option value="POSTED">مرحّل</option>
                <option value="VOID">ملغي</option>
              </select>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <span className="text-[11px] font-black text-slate-500">نوع المخزون</span>
              <select
                value={filterType}
                onChange={(e) => {
                  setSelectedId(null);
                  setFilterType(e.target.value);
                }}
                className="bg-transparent outline-none text-sm font-bold text-slate-700"
              >
                <option value="">الكل</option>
                {inventoryTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
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
                <th className="p-3 text-right">الكود</th>
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">نوع المخزون</th>
                <th className="p-3 text-right">إجمالي الكمية</th>
                <th className="p-3 text-right">إجمالي التكلفة</th>
                <th className="p-3 text-right">مُرحّل؟</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">البيان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-400 font-bold">لا توجد بيانات</td>
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
                        disabled={isClosed}
                        title={isClosed ? lockTooltip : ''}
                      />
                    </td>
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{v.code}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{new Date(v.date).toLocaleDateString('ar-EG')}</td>
                    <td className="p-3 text-slate-700">{v.stockTypeName}</td>
                    <td className="p-3 text-emerald-700 font-bold">{v.totals.qty}</td>
                    <td className="p-3 text-emerald-700 font-bold">{v.totals.cost.toLocaleString('ar-EG')}</td>
                    <td className="p-3">
                      {v.status === 'POSTED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700">نعم</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-100 text-slate-600">لا</span>
                      )}
                    </td>
                    <td className="p-3">
                      {v.status === 'POSTED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700"><CheckCircle2 size={12} /> مرحّل</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-100 text-slate-600">{v.status === 'VOID' ? 'ملغي' : 'مسودة'}</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">{v.description || '—'}</td>
                  </tr>
                ))
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
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Stock Receive</p>
                <h3 className="text-xl font-black text-slate-900">{mode === 'add' ? 'إضافة إذن إضافة مخزن' : 'تعديل إذن إضافة مخزن'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-full bg-slate-100 px-3 py-2 text-slate-500 font-bold hover:bg-slate-200">إغلاق</button>
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
                  <label className="text-[11px] font-black text-slate-500">نوع المخزون</label>
                  <select
                    value={voucher.stockTypeId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const st = inventoryTypes.find((t) => t.id === id);
                      setVoucher((p) => ({ ...p, stockTypeId: id, stockTypeName: st?.name || '' }));
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                  >
                    <option value="">-- اختر --</option>
                    {inventoryTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-slate-500">المخزن</label>
                  <select
                    value={voucher.warehouseId}
                    onChange={(e) => setVoucher((p) => ({ ...p, warehouseId: e.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                  >
                    <option value="">-- اختر --</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-slate-500">مرجع</label>
                  <input
                    value={voucher.reference || ''}
                    onChange={(e) => setVoucher((p) => ({ ...p, reference: e.target.value }))}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    placeholder="مرجع/مستند"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-slate-500">البيان</label>
                  <input
                    value={voucher.description || ''}
                    onChange={(e) => setVoucher((p) => ({ ...p, description: e.target.value }))}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    placeholder="بيان إذن الإضافة"
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
                      <th className="p-3 text-right">التكلفة للوحدة</th>
                      <th className="p-3 text-right">الإجمالي</th>
                      <th className="p-3 text-right">ملاحظات</th>
                      <th className="p-3 text-right">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((line) => (
                      <tr key={line.id} className="bg-white hover:bg-slate-50">
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={!!line.selected}
                            onChange={() =>
                              setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, selected: !l.selected } : l)))
                            }
                            className="h-4 w-4 text-indigo-600 border-slate-300 rounded"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={line.itemName}
                            list="receive-items"
                            onChange={(e) => setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, itemName: e.target.value } : l)))}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                            placeholder="اسم الصنف"
                          />
                          <datalist id="receive-items">
                            {mockItems.map((it) => (
                              <option key={it} value={it} />
                            ))}
                          </datalist>
                        </td>
                        <td className="p-2">
                          <input
                            value={line.unit || ''}
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
                              setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, qty, totalCost: (l.unitCost || 0) * qty } : l)));
                            }}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-emerald-700 font-bold"
                            min={0}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={line.unitCost || 0}
                            onChange={(e) => {
                              const unitCost = Number(e.target.value);
                              setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, unitCost, totalCost: (l.qty || 0) * unitCost } : l)));
                            }}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-emerald-700 font-bold"
                            min={0}
                          />
                        </td>
                        <td className="p-2 text-emerald-700 font-bold">{(line.totalCost || 0).toLocaleString('ar-EG')}</td>
                        <td className="p-2">
                          <input
                            value={line.notes || ''}
                            onChange={(e) => setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, notes: e.target.value } : l)))}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                            placeholder="ملاحظات السطر"
                          />
                        </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => setLines((prev) => prev.filter((l) => l.id !== line.id))}
                        className="text-rose-600 hover:text-rose-800"
                        disabled={isClosed}
                        title={isClosed ? lockTooltip : ''}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setLines((prev) => [
                          ...prev,
                          { id: `l${prev.length + 1}`, itemId: '', itemName: '', qty: 0, unit: '', unitCost: 0, totalCost: 0 }
                        ])
                      }
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                    >
                      <Plus size={14} /> إضافة سطر
                    </button>
                    <button
                      onClick={() =>
                        setLines((prev) => {
                          const keep = prev.filter((l) => !l.selected);
                          return keep.length ? keep : prev;
                        })
                      }
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 font-bold"
                    >
                      <Trash2 size={14} /> حذف السطر المحدد
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-bold">
                    <span className="text-slate-600">إجمالي الكمية: <span className="text-emerald-700">{totals.qty}</span></span>
                    <span className="text-slate-600">إجمالي التكلفة: <span className="text-emerald-700">{totals.cost.toLocaleString('ar-EG')}</span></span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-black ${!totals.invalid && totals.qty > 0 && totals.cost > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {!totals.invalid && totals.qty > 0 && totals.cost > 0 ? 'جاهز للترحيل' : 'غير مكتمل'}
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
                    {(() => {
                      const { debitId, creditId } = buildPostingAccounts();
                      const preview = [
                        debitId && { id: 'dr', accountId: debitId, debit: totals.cost, credit: 0, note: 'إضافة مخزون' },
                        creditId && { id: 'cr', accountId: creditId, debit: 0, credit: totals.cost, note: 'التزام/مورد' }
                      ].filter(Boolean) as { id: string; accountId: string; debit: number; credit: number; note: string }[];
                      if (!preview.length) {
                        return (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-slate-400 font-bold">أضف بيانات كاملة لعرض القيد</td>
                          </tr>
                        );
                      }
                      return preview.map((l) => {
                        const acc = accounts.find((a) => a.id === l.accountId);
                        return (
                          <tr key={l.id}>
                            <td className="p-3 text-slate-700">{acc ? `${acc.code} - ${acc.name}` : l.accountId}</td>
                            <td className="p-3 text-emerald-700 font-bold">{l.debit.toLocaleString('ar-EG')}</td>
                            <td className="p-3 text-emerald-700 font-bold">{l.credit.toLocaleString('ar-EG')}</td>
                            <td className="p-3 text-slate-600">{l.note}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold">إلغاء</button>
                <button onClick={saveDraft} className="px-4 py-2 rounded-xl bg-indigo-500 text-white font-bold shadow-sm hover:bg-indigo-600">حفظ</button>
                <button
                  onClick={postVoucher}
                  disabled={!!reason}
                  className={`px-4 py-2 rounded-xl font-bold shadow-sm ${reason ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white'}`}
                  title={reason || ''}
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

export default StockReceiveVoucher;
