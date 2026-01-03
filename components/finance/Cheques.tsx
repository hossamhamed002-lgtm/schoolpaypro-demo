import React, { useMemo, useState } from 'react';
import { Lock, Search, FileText, Trash2, Pencil, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAccounts } from '../../hooks/useAccountsLogic';
import { Account } from '../../src/types/accounts.types';
import { useSuppliersLogic } from '../../src/hooks/useSuppliersLogic';
import { useStore } from '../../store';

const columns = [
  { id: 'select', label: '' },
  { id: 'index', label: 'م' },
  { id: 'date', label: 'التاريخ' },
  { id: 'number', label: 'رقم الشيك' },
  { id: 'paymentDate', label: 'تاريخ الصرف' },
  { id: 'beneficiaryCode', label: 'كود المستفيد' },
  { id: 'beneficiaryName', label: 'اسم المستفيد' },
  { id: 'amount', label: 'القيمة' },
  { id: 'notes', label: 'ملاحظات' },
  { id: 'dueDate', label: 'تاريخ الاستحقاق' },
  { id: 'paid', label: 'تم الصرف' },
  { id: 'action', label: 'إجراء' }
];

const normalize = (value?: string) => (value || '').toLowerCase().trim();

const buildChequeCode = () => {
  const stamp = new Date();
  const datePart = stamp.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CHQ-OUT-${datePart}-${rand}`;
};

const toArabicWords = (value: number) => {
  if (!Number.isFinite(value)) return '';
  if (value === 0) return 'صفر';

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const teens = ['أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  const scales = [
    { singular: '', dual: '', plural: '' },
    { singular: 'ألف', dual: 'ألفان', plural: 'آلاف' },
    { singular: 'مليون', dual: 'مليونان', plural: 'ملايين' },
    { singular: 'مليار', dual: 'ملياران', plural: 'مليارات' }
  ];

  const tripletToWords = (num: number) => {
    const h = Math.floor(num / 100);
    const t = num % 100;
    const parts: string[] = [];
    if (h) parts.push(hundreds[h]);
    if (t) {
      if (t < 10) {
        parts.push(ones[t]);
      } else if (t === 10) {
        parts.push(tens[1]);
      } else if (t > 10 && t < 20) {
        parts.push(teens[t - 11]);
      } else {
        const u = t % 10;
        const tenValue = Math.floor(t / 10);
        if (u) parts.push(`${ones[u]} و ${tens[tenValue]}`);
        else parts.push(tens[tenValue]);
      }
    }
    return parts.filter(Boolean).join(' و ');
  };

  const parts: string[] = [];
  let remaining = Math.floor(value);
  let scaleIndex = 0;

  while (remaining > 0 && scaleIndex < scales.length) {
    const group = remaining % 1000;
    if (group) {
      const scale = scales[scaleIndex];
      let groupWords = tripletToWords(group);
      if (scaleIndex > 0) {
        if (group === 1) {
          groupWords = scale.singular;
        } else if (group === 2) {
          groupWords = scale.dual;
        } else if (group >= 3 && group <= 10) {
          groupWords = `${groupWords} ${scale.plural}`;
        } else {
          groupWords = `${groupWords} ${scale.singular}`;
        }
      }
      parts.unshift(groupWords);
    }
    remaining = Math.floor(remaining / 1000);
    scaleIndex += 1;
  }

  return parts.filter(Boolean).join(' و ');
};

type PayeeOption = {
  id: string;
  name: string;
  code?: string;
  type: 'supplier' | 'employee';
};

const Cheques: React.FC = () => {
  const store = useStore();
  const { suppliers } = useSuppliersLogic();
  const { accounts, accountMap, findByCode, postTransactions } = useAccounts();
  const [activeTab, setActiveTab] = useState<'outgoing' | 'incoming'>('outgoing');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [chequeCode, setChequeCode] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [bankQuery, setBankQuery] = useState('');
  const [payeeQuery, setPayeeQuery] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [selectedPayeeId, setSelectedPayeeId] = useState('');
  const [selectedSettlementId, setSelectedSettlementId] = useState('');
  const [amountValue, setAmountValue] = useState('');
  const [showBankList, setShowBankList] = useState(false);
  const [showPayeeList, setShowPayeeList] = useState(false);
  const [showSettlementList, setShowSettlementList] = useState(false);
  const [settlementQuery, setSettlementQuery] = useState('');
  const [pendingPaymentDates, setPendingPaymentDates] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [cheques, setCheques] = useState<
    Array<{
      id: string;
      date: string;
      chequeNumber: string;
      payeeId: string;
      payeeName: string;
      payeeCode?: string;
      bankId: string;
      bankName: string;
      amount: number;
      notes: string;
      settlementId: string;
      settlementName: string;
      isPaid: boolean;
      paymentDate?: string;
    }>
  >([]);
  // Incoming cheques UI state (no accounting logic)
  const [incomingCheques, setIncomingCheques] = useState<
    Array<{
      id: string;
      chequeNumber: string;
      clientName: string;
      bank: string;
      dueDate: string;
      amount: number;
      status: 'under_collection' | 'collected' | 'returned';
      notes: string;
    }>
  >([]);
  const [incomingSelectedId, setIncomingSelectedId] = useState<string | null>(null);
  const [incomingModalOpen, setIncomingModalOpen] = useState(false);
  const [incomingEditingId, setIncomingEditingId] = useState<string | null>(null);
  const [incomingForm, setIncomingForm] = useState({
    chequeNumber: '',
    clientName: '',
    bank: '',
    dueDate: '',
    amount: '',
    status: 'under_collection' as 'under_collection' | 'collected' | 'returned',
    notes: ''
  });
  const [incomingSearch, setIncomingSearch] = useState('');
  const [incomingStatusFilter, setIncomingStatusFilter] = useState('');
  const [incomingBankFilter, setIncomingBankFilter] = useState('');
  const [incomingDateFrom, setIncomingDateFrom] = useState('');
  const [incomingDateTo, setIncomingDateTo] = useState('');

  const childrenMap = useMemo(() => {
    const map = new Map<string, Account[]>();
    accounts.forEach((account) => {
      if (!account.parentId) return;
      const list = map.get(account.parentId) || [];
      list.push(account);
      map.set(account.parentId, list);
    });
    return map;
  }, [accounts]);

  const bankRoot = useMemo(() => {
    return (
      findByCode('1102') ||
      accounts.find((account) => normalize(account.name) === 'البنوك') ||
      accounts.find((account) => normalize(account.name).includes('البنوك')) ||
      null
    );
  }, [accounts, findByCode]);

  const bankOptions = useMemo(() => {
    if (!bankRoot) return [];
    const collect = (id: string): Account[] => {
      const children = childrenMap.get(id) || [];
      return children.flatMap((child) => [child, ...collect(child.id)]);
    };
    const descendants = collect(bankRoot.id);
    const leafDescendants = descendants.filter((account) => !(childrenMap.get(account.id)?.length));
    if (leafDescendants.length) return leafDescendants;
    return [bankRoot];
  }, [bankRoot, childrenMap]);

  const payeeOptions = useMemo<PayeeOption[]>(() => {
    const supplierOptions = (suppliers || []).map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      code: supplier.glCode,
      type: 'supplier' as const
    }));
    const employeeOptions = (store.employees || []).map((employee: any) => ({
      id: employee.Emp_ID || employee.id || employee.Employee_ID || '',
      name:
        employee.Name_Ar ||
        employee.Name_En ||
        employee.Full_Name ||
        employee.name ||
        'موظف',
      code: employee.Emp_ID || employee.Employee_ID || '',
      type: 'employee' as const
    }));
    return [...supplierOptions, ...employeeOptions].filter((option) => option.id);
  }, [suppliers, store.employees]);

  const selectedBank = selectedBankId ? accountMap.get(selectedBankId) || null : null;
  const bankBalance = selectedBank ? selectedBank.balance : 0;
  const parsedAmount = Number.parseFloat(amountValue.replace(/,/g, ''));
  const amountInteger = Number.isFinite(parsedAmount) ? Math.floor(parsedAmount) : 0;
  const amountCents = Number.isFinite(parsedAmount) ? Math.round((parsedAmount - amountInteger) * 100) : 0;
  const amountInWords = amountValue.trim()
    ? `${toArabicWords(amountInteger)} جنيه${amountCents ? ` و ${toArabicWords(amountCents)} قرش` : ''} فقط لا غير`
    : '';

  const filteredBanks = useMemo(() => {
    if (!bankQuery.trim()) return bankOptions;
    const query = normalize(bankQuery);
    return bankOptions.filter((account) => normalize(account.name).includes(query) || account.code.includes(query));
  }, [bankOptions, bankQuery]);

  const filteredPayees = useMemo(() => {
    if (!payeeQuery.trim()) return payeeOptions;
    const query = normalize(payeeQuery);
    return payeeOptions.filter((option) => {
      const nameMatch = normalize(option.name).includes(query);
      const codeMatch = option.code ? option.code.includes(query) : false;
      return nameMatch || codeMatch;
    });
  }, [payeeOptions, payeeQuery]);

  const filteredSettlementAccounts = useMemo(() => {
    const candidates = accounts.filter((account) => !account.isMain);
    if (!settlementQuery.trim()) return candidates;
    const query = normalize(settlementQuery);
    return candidates.filter((account) => normalize(account.name).includes(query) || account.code.includes(query));
  }, [accounts, settlementQuery]);

  // Incoming cheques helpers (UI-only)
  const filteredIncomingCheques = useMemo(() => {
    const normalizedSearch = normalize(incomingSearch);
    return incomingCheques
      .filter((item) => {
        if (incomingStatusFilter && item.status !== incomingStatusFilter) return false;
        if (incomingBankFilter && normalize(item.bank) !== normalize(incomingBankFilter)) return false;
        if (incomingDateFrom && item.dueDate < incomingDateFrom) return false;
        if (incomingDateTo && item.dueDate > incomingDateTo) return false;
        if (!normalizedSearch) return true;
        return (
          normalize(item.chequeNumber).includes(normalizedSearch) ||
          normalize(item.clientName).includes(normalizedSearch) ||
          normalize(item.bank).includes(normalizedSearch)
        );
      });
  }, [incomingBankFilter, incomingCheques, incomingDateFrom, incomingDateTo, incomingSearch, incomingStatusFilter]);

  const incomingStatusBadge = (status: 'under_collection' | 'collected' | 'returned') => {
    switch (status) {
      case 'collected':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'returned':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-100';
    }
  };

  const openIncomingModal = (mode: 'create' | 'edit') => {
    setIncomingEditingId(mode === 'edit' ? incomingSelectedId : null);
    if (mode === 'edit' && incomingSelectedId) {
      const existing = incomingCheques.find((item) => item.id === incomingSelectedId);
      if (existing) {
        setIncomingForm({
          chequeNumber: existing.chequeNumber,
          clientName: existing.clientName,
          bank: existing.bank,
          dueDate: existing.dueDate,
          amount: existing.amount.toString(),
          status: existing.status,
          notes: existing.notes
        });
      }
    } else {
      setIncomingForm({
        chequeNumber: '',
        clientName: '',
        bank: '',
        dueDate: '',
        amount: '',
        status: 'under_collection',
        notes: ''
      });
    }
    setIncomingModalOpen(true);
  };

  const handleIncomingSave = () => {
    if (
      !incomingForm.chequeNumber.trim() ||
      !incomingForm.clientName.trim() ||
      !incomingForm.bank.trim() ||
      !incomingForm.dueDate ||
      !incomingForm.amount
    ) {
      alert('يرجى إدخال البيانات الأساسية للشيك.');
      return;
    }
    const amountNum = Number(incomingForm.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      alert('يرجى إدخال قيمة صحيحة.');
      return;
    }
    if (incomingEditingId) {
      setIncomingCheques((prev) =>
        prev.map((item) =>
          item.id === incomingEditingId
            ? { ...item, ...incomingForm, amount: amountNum }
            : item
        )
      );
    } else {
      setIncomingCheques((prev) => [
        {
          id: `INC-${Date.now()}`,
          chequeNumber: incomingForm.chequeNumber,
          clientName: incomingForm.clientName,
          bank: incomingForm.bank,
          dueDate: incomingForm.dueDate,
          amount: amountNum,
          status: incomingForm.status,
          notes: incomingForm.notes
        },
        ...prev
      ]);
    }
    setIncomingModalOpen(false);
    setIncomingEditingId(null);
    setIncomingSelectedId(null);
  };

  const handleIncomingDelete = () => {
    if (!incomingSelectedId) return;
    if (!window.confirm('هل أنت متأكد من حذف الشيك؟')) return;
    setIncomingCheques((prev) => prev.filter((item) => item.id !== incomingSelectedId));
    setIncomingSelectedId(null);
  };

  const handleIncomingExport = () => {
    const data = filteredIncomingCheques.map((item) => ({
      'رقم الشيك': item.chequeNumber,
      'اسم العميل': item.clientName,
      'البنك': item.bank,
      'تاريخ الاستحقاق': item.dueDate,
      'القيمة': item.amount,
      'الحالة': item.status === 'collected' ? 'محصل' : item.status === 'returned' ? 'مرتد' : 'تحت التحصيل',
      'ملاحظات': item.notes
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'incoming_cheques');
    XLSX.writeFile(workbook, `incoming-cheques-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const resetForm = () => {
    setChequeCode(buildChequeCode());
    setChequeDate(new Date().toISOString().slice(0, 10));
    setSelectedBankId('');
    setSelectedPayeeId('');
    setSelectedSettlementId('');
    setBankQuery('');
    setPayeeQuery('');
    setSettlementQuery('');
    setAmountValue('');
    setNotes('');
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    resetForm();
    setIsCreateOpen(true);
  };

  const openEditModal = (chequeId: string) => {
    const cheque = cheques.find((item) => item.id === chequeId);
    if (!cheque) return;
    if (cheque.isPaid && cheque.bankId && cheque.settlementId) {
      if (!window.confirm('تم صرف هذا الشيك. هل تريد إلغاء الصرف للتعديل؟')) return;
      postTransactions([
        { accountId: cheque.settlementId, amount: -cheque.amount, description: `عكس صرف شيك ${cheque.chequeNumber}` },
        { accountId: cheque.bankId, amount: cheque.amount, description: `عكس صرف شيك ${cheque.chequeNumber}` }
      ]);
      setCheques((prev) =>
        prev.map((item) =>
          item.id === cheque.id ? { ...item, isPaid: false, paymentDate: undefined } : item
        )
      );
    }
    setModalMode('edit');
    setEditingId(chequeId);
    setChequeCode(cheque.chequeNumber);
    setChequeDate(cheque.date);
    setSelectedBankId(cheque.bankId);
    setSelectedPayeeId(cheque.payeeId);
    setSelectedSettlementId(cheque.settlementId);
    setBankQuery('');
    setPayeeQuery('');
    setSettlementQuery('');
    setAmountValue(cheque.amount.toString());
    setNotes(cheque.notes);
    setIsCreateOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {activeTab === 'incoming' ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openIncomingModal('create')}
                className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-blue-600 shadow-sm hover:shadow transition"
              >
                <Plus size={18} /> إضافة شيك
              </button>
              <button
                type="button"
                disabled={!incomingSelectedId}
                onClick={() => incomingSelectedId && openIncomingModal('edit')}
                className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold shadow-sm transition ${
                  incomingSelectedId
                    ? 'border-amber-200 bg-amber-50 text-amber-700 hover:shadow'
                    : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                }`}
              >
                <Pencil size={16} /> تعديل
              </button>
              <button
                type="button"
                disabled={!incomingSelectedId}
                onClick={handleIncomingDelete}
                className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold shadow-sm transition ${
                  incomingSelectedId
                    ? 'border-rose-200 bg-rose-50 text-rose-700 hover:shadow'
                    : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                }`}
              >
                <Trash2 size={16} /> حذف
              </button>
              <button
                type="button"
                onClick={handleIncomingExport}
                className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm hover:shadow"
              >
                <FileText size={16} /> تصدير Excel
              </button>
            </div>
          ) : (
          <div className="flex items-center divide-x divide-slate-200 rounded-2xl border border-slate-100 bg-white shadow-sm">
            <button type="button" className="px-3 py-2 text-slate-500">
              <Lock size={18} />
            </button>
            <button type="button" className="px-3 py-2 text-slate-500">
              <Search size={18} />
            </button>
            <button type="button" className="px-3 py-2 text-emerald-600">
              <FileText size={18} />
            </button>
            <button type="button" className="px-3 py-2 text-rose-500">
              <Trash2 size={18} />
            </button>
            <button type="button" className="px-3 py-2 text-amber-500">
              <Pencil size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'outgoing') {
                  openCreateModal();
                }
              }}
              className="m-2 rounded-xl border border-blue-200 bg-blue-50 p-2 text-blue-600 shadow-sm"
            >
              <Plus size={18} />
            </button>
          </div>
          )}

          <div className="flex items-center gap-2 rounded-full bg-slate-100/80 p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('incoming')}
              className={`rounded-full px-4 py-2 ${
                activeTab === 'incoming' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              الشيكات الواردة
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('outgoing')}
              className={`rounded-full px-4 py-2 ${
                activeTab === 'outgoing' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              الشيكات الصادرة
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'incoming' ? (
        <>
          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm" dir="rtl">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <input
                    type="text"
                    value={incomingSearch}
                    onChange={(e) => setIncomingSearch(e.target.value)}
                    placeholder="بحث برقم الشيك / اسم العميل / البنك..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-100"
                  />
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <select
                value={incomingStatusFilter}
                onChange={(e) => setIncomingStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 min-w-[160px]"
              >
                <option value="">كل الحالات</option>
                <option value="under_collection">تحت التحصيل</option>
                <option value="collected">محصل</option>
                <option value="returned">مرتد</option>
              </select>
              <input
                type="text"
                value={incomingBankFilter}
                onChange={(e) => setIncomingBankFilter(e.target.value)}
                placeholder="البنك"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 min-w-[160px]"
              />
              <input
                type="date"
                value={incomingDateFrom}
                onChange={(e) => setIncomingDateFrom(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              />
              <input
                type="date"
                value={incomingDateTo}
                onChange={(e) => setIncomingDateTo(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="overflow-hidden rounded-2xl border border-slate-200" dir="rtl">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-200/70 text-slate-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-center font-bold">☐</th>
                    <th className="px-4 py-3 text-center font-bold">رقم الشيك</th>
                    <th className="px-4 py-3 text-center font-bold">اسم العميل</th>
                    <th className="px-4 py-3 text-center font-bold">البنك</th>
                    <th className="px-4 py-3 text-center font-bold">تاريخ الاستحقاق</th>
                    <th className="px-4 py-3 text-center font-bold">القيمة</th>
                    <th className="px-4 py-3 text-center font-bold">الحالة</th>
                    <th className="px-4 py-3 text-center font-bold">ملاحظات</th>
                    <th className="px-4 py-3 text-center font-bold">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncomingCheques.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="bg-white">
                        <div className="h-[360px]" />
                      </td>
                    </tr>
                  ) : (
                    filteredIncomingCheques.map((item) => (
                      <tr
                        key={item.id}
                        className={`border-b border-slate-100 ${incomingSelectedId === item.id ? 'bg-blue-50/50' : ''}`}
                        onClick={() => setIncomingSelectedId(item.id)}
                      >
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={incomingSelectedId === item.id}
                            onChange={() => setIncomingSelectedId(item.id)}
                            className="h-4 w-4 accent-blue-600"
                          />
                        </td>
                        <td className="px-4 py-3 text-center font-semibold">{item.chequeNumber}</td>
                        <td className="px-4 py-3 text-center font-semibold">{item.clientName}</td>
                        <td className="px-4 py-3 text-center font-semibold">{item.bank}</td>
                        <td className="px-4 py-3 text-center font-semibold">{item.dueDate}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800">{item.amount.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-black ${incomingStatusBadge(item.status)}`}>
                            {item.status === 'collected' ? 'محصل' : item.status === 'returned' ? 'مرتد' : 'تحت التحصيل'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">{item.notes || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIncomingSelectedId(item.id);
                              openIncomingModal('edit');
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            عرض / تعديل
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="overflow-hidden rounded-2xl border border-slate-200" dir="rtl">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-200/70 text-slate-700">
              <tr>
                {columns.map((column) => (
                  <th key={column.id} className="px-4 py-3 text-center font-bold">
                    {column.id === 'select' ? (
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => undefined}
                        className="h-4 w-4 accent-slate-500"
                      />
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cheques.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="bg-white">
                    <div className="h-[360px]" />
                  </td>
                </tr>
              ) : (
                cheques.map((cheque, index) => (
                  <tr key={cheque.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={false} onChange={() => undefined} className="h-4 w-4 accent-slate-500" />
                    </td>
                    <td className="px-4 py-3 text-center">{index + 1}</td>
                    <td className="px-4 py-3 text-center">{cheque.date}</td>
                    <td className="px-4 py-3 text-center">{cheque.chequeNumber}</td>
                    <td className="px-4 py-3 text-center">
                      {cheque.isPaid ? (
                        cheque.paymentDate || '—'
                      ) : (
                        <input
                          type="date"
                          value={pendingPaymentDates[cheque.id] || ''}
                          onChange={(event) =>
                            setPendingPaymentDates((prev) => ({
                              ...prev,
                              [cheque.id]: event.target.value
                            }))
                          }
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">{cheque.payeeCode || '—'}</td>
                    <td className="px-4 py-3 text-center">{cheque.payeeName}</td>
                    <td className="px-4 py-3 text-center">{cheque.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">{cheque.notes || '—'}</td>
                    <td className="px-4 py-3 text-center">{cheque.date}</td>
                    <td className="px-4 py-3 text-center">{cheque.isPaid ? 'تم' : 'غير'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                          onClick={() => {
                            if (!cheque.isPaid) {
                              const date = pendingPaymentDates[cheque.id];
                              if (!date) {
                                alert('يرجى تحديد تاريخ الصرف أولاً.');
                                return;
                              }
                              setCheques((prev) =>
                                prev.map((item) =>
                                  item.id === cheque.id ? { ...item, isPaid: true, paymentDate: date } : item
                                )
                              );
                              if (cheque.bankId && cheque.settlementId) {
                                postTransactions([
                                  { accountId: cheque.settlementId, amount: cheque.amount, description: `شيك صادر ${cheque.chequeNumber}` },
                                  { accountId: cheque.bankId, amount: -cheque.amount, description: `شيك صادر ${cheque.chequeNumber}` }
                                ]);
                              }
                            } else {
                              if (cheque.bankId && cheque.settlementId) {
                                postTransactions([
                                  { accountId: cheque.settlementId, amount: -cheque.amount, description: `عكس صرف شيك ${cheque.chequeNumber}` },
                                  { accountId: cheque.bankId, amount: cheque.amount, description: `عكس صرف شيك ${cheque.chequeNumber}` }
                                ]);
                              }
                              setCheques((prev) =>
                                prev.map((item) =>
                                  item.id === cheque.id ? { ...item, isPaid: false, paymentDate: undefined } : item
                                )
                              );
                            }
                          }}
                        >
                          {cheque.isPaid ? 'إلغاء الصرف' : 'تأكيد الصرف'}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                          onClick={() => openEditModal(cheque.id)}
                        >
                          تعديل
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {isCreateOpen && activeTab === 'outgoing' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setIsCreateOpen(false)}
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"
          />
          <div className="relative mx-auto w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500"
              >
                <span className="text-xl leading-none">×</span>
              </button>
              <h3 className="text-lg font-black text-slate-700">إضافة شيك صادر</h3>
            </div>

            <div className="max-h-[calc(90vh-90px)] overflow-auto p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <label className="text-xs font-bold text-slate-500">رقم الشيك</label>
                  <input
                    type="text"
                    value={chequeCode}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  />
                </div>
                <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <label className="text-xs font-bold text-slate-500">تاريخ الدفع</label>
                  <input
                    type="date"
                    value={chequeDate}
                    onChange={(event) => setChequeDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  />
                </div>
                <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500">اصرفوا لأمر</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={
                        payeeQuery ||
                        (selectedPayeeId
                          ? payeeOptions.find((option) => option.id === selectedPayeeId)?.name || ''
                          : '')
                      }
                      onChange={(event) => {
                        setPayeeQuery(event.target.value);
                        setSelectedPayeeId('');
                        setShowPayeeList(true);
                      }}
                      onFocus={() => setShowPayeeList(true)}
                      placeholder="ابحث عن حساب المستفيد..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                    />
                    {showPayeeList && (
                      <div className="absolute z-10 mt-2 max-h-48 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                        {filteredPayees.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-slate-400">لا توجد نتائج</div>
                        ) : (
                          filteredPayees.map((option) => (
                            <button
                              type="button"
                              key={option.id}
                              onClick={() => {
                                setSelectedPayeeId(option.id);
                                setPayeeQuery('');
                                setShowPayeeList(false);
                              }}
                              className="flex w-full items-center justify-between px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <span>{option.name}</span>
                              <span className="text-xs text-slate-400">
                                {option.type === 'supplier' ? 'مورد' : 'موظف'}
                                {option.code ? ` • ${option.code}` : ''}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500">حساب التسوية</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={
                        settlementQuery ||
                        (selectedSettlementId ? accountMap.get(selectedSettlementId)?.name || '' : '')
                      }
                      onChange={(event) => {
                        setSettlementQuery(event.target.value);
                        setSelectedSettlementId('');
                        setShowSettlementList(true);
                      }}
                      onFocus={() => setShowSettlementList(true)}
                      placeholder="اختر بند الصرف..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                    />
                    {showSettlementList && (
                      <div className="absolute z-10 mt-2 max-h-48 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                        {filteredSettlementAccounts.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-slate-400">لا توجد نتائج</div>
                        ) : (
                          filteredSettlementAccounts.map((account) => (
                            <button
                              type="button"
                              key={account.id}
                              onClick={() => {
                                setSelectedSettlementId(account.id);
                                setSettlementQuery('');
                                setShowSettlementList(false);
                              }}
                              className="flex w-full items-center justify-between px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <span>{account.name}</span>
                              <span className="text-xs text-slate-400">{account.code}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <label className="text-xs font-bold text-slate-500">البنك</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={bankQuery || (selectedBankId ? accountMap.get(selectedBankId)?.name || '' : '')}
                      onChange={(event) => {
                        setBankQuery(event.target.value);
                        setSelectedBankId('');
                        setShowBankList(true);
                      }}
                      onFocus={() => setShowBankList(true)}
                      placeholder="ابحث عن البنك..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                    />
                    {showBankList && (
                      <div className="absolute z-10 mt-2 max-h-48 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                        {filteredBanks.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-slate-400">لا توجد نتائج</div>
                        ) : (
                          filteredBanks.map((account) => (
                            <button
                              type="button"
                              key={account.id}
                              onClick={() => {
                                setSelectedBankId(account.id);
                                setBankQuery('');
                                setShowBankList(false);
                              }}
                              className="flex w-full items-center justify-between px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <span>{account.name}</span>
                              <span className="text-xs text-slate-400">{account.code}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <label className="text-xs font-bold text-slate-500">المبلغ</label>
                  <input
                    type="text"
                    placeholder="3444"
                    value={amountValue}
                    onChange={(event) => setAmountValue(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  />
                </div>
                <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <label className="text-xs font-bold text-slate-500">الرصيد</label>
                  <input
                    type="text"
                    value={selectedBankId ? bankBalance.toFixed(2) : ''}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  />
                </div>
                <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500">ملاحظات</label>
                  <textarea
                    rows={3}
                    placeholder="اكتب الملاحظات هنا..."
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  />
                </div>
                <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500">المبلغ بالحروف</label>
                  <textarea
                    rows={2}
                    value={amountInWords}
                    readOnly
                    placeholder="سيظهر التفقيط هنا تلقائيًا"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    const amount = Number.parseFloat(amountValue.replace(/,/g, ''));
                    if (!chequeCode || !selectedBankId || !selectedPayeeId || !selectedSettlementId || !Number.isFinite(amount)) {
                      alert('يرجى استكمال البيانات الأساسية.');
                      return;
                    }
                    const payee = payeeOptions.find((option) => option.id === selectedPayeeId);
                    const settlement = accountMap.get(selectedSettlementId);
                    const bank = accountMap.get(selectedBankId);
                    if (modalMode === 'edit' && editingId) {
                      setCheques((prev) =>
                        prev.map((item) =>
                          item.id === editingId
                            ? {
                                ...item,
                                date: chequeDate || item.date,
                                chequeNumber: chequeCode,
                                payeeId: selectedPayeeId,
                                payeeName: payee?.name || item.payeeName,
                                payeeCode: payee?.code,
                                bankId: selectedBankId,
                                bankName: bank?.name || item.bankName,
                                amount,
                                notes,
                                settlementId: selectedSettlementId,
                                settlementName: settlement?.name || item.settlementName
                              }
                            : item
                        )
                      );
                    } else {
                      const payload = {
                        id: `CHQ-${Date.now()}`,
                        date: chequeDate || new Date().toISOString().slice(0, 10),
                        chequeNumber: chequeCode,
                        payeeId: selectedPayeeId,
                        payeeName: payee?.name || '',
                        payeeCode: payee?.code,
                        bankId: selectedBankId,
                        bankName: bank?.name || '',
                        amount,
                        notes,
                        settlementId: selectedSettlementId,
                        settlementName: settlement?.name || '',
                        isPaid: false,
                        paymentDate: undefined
                      };
                      setCheques((prev) => [...prev, payload]);
                    }
                    setIsCreateOpen(false);
                  }}
                  className="rounded-xl border border-slate-300 bg-slate-100 px-6 py-2 text-sm font-bold text-slate-700 shadow-sm"
                >
                  {modalMode === 'edit' ? 'تحديث' : 'حفظ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {incomingModalOpen && activeTab === 'incoming' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setIncomingModalOpen(false)}
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"
          />
          <div className="relative mx-auto w-full max-w-3xl max-h-[90vh] overflow-auto rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.25)]" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setIncomingModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500"
              >
                <span className="text-xl leading-none">×</span>
              </button>
              <h3 className="text-lg font-black text-slate-700">
                {incomingEditingId ? 'تعديل شيك وارد' : 'إضافة شيك وارد'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">رقم الشيك</label>
                  <input
                    type="text"
                    value={incomingForm.chequeNumber}
                    onChange={(e) => setIncomingForm((prev) => ({ ...prev, chequeNumber: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">اسم العميل</label>
                  <input
                    type="text"
                    value={incomingForm.clientName}
                    onChange={(e) => setIncomingForm((prev) => ({ ...prev, clientName: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">البنك</label>
                  <input
                    type="text"
                    value={incomingForm.bank}
                    onChange={(e) => setIncomingForm((prev) => ({ ...prev, bank: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">تاريخ الاستحقاق</label>
                  <input
                    type="date"
                    value={incomingForm.dueDate}
                    onChange={(e) => setIncomingForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">القيمة</label>
                  <input
                    type="number"
                    value={incomingForm.amount}
                    onChange={(e) => setIncomingForm((prev) => ({ ...prev, amount: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500">الحالة</label>
                  <select
                    value={incomingForm.status}
                    onChange={(e) =>
                      setIncomingForm((prev) => ({ ...prev, status: e.target.value as 'under_collection' | 'collected' | 'returned' }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    <option value="under_collection">تحت التحصيل</option>
                    <option value="collected">محصل</option>
                    <option value="returned">مرتد</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">ملاحظات</label>
                <textarea
                  value={incomingForm.notes}
                  onChange={(e) => setIncomingForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 min-h-[90px]"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIncomingModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleIncomingSave}
                  className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-2 text-sm font-bold text-blue-700 shadow-sm"
                >
                  حفظ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cheques;
