import React, { useEffect, useMemo, useState } from 'react';
import { Banknote, Home, Plus, Download, AlertTriangle, Cloud, XCircle } from 'lucide-react';
import {
  useTreasuryLogic,
  TreasuryAccount,
  TreasuryType
} from '../../hooks/useTreasuryLogic';

const tabs: { id: TreasuryType; title: string; icon: React.ComponentType<any> }[] = [
  { id: 'Bank', title: 'حسابات البنوك', icon: Banknote },
  { id: 'CashSafe', title: 'الخزائن', icon: Home }
];

const accountTypeOptions = ['جاري', 'توفير', 'استثماري', 'نقدي'];

const createEmptyFormState = () => ({
  name: '',
  accountNumber: '',
  balance: 0,
  schoolAccountName: '',
  bankName: '',
  iban: '',
  accountType: 'جاري',
  openingDate: new Date().toISOString().split('T')[0],
  isActive: true
});

const BankAccountsList: React.FC = () => {
  const { treasuryAccounts, addTreasuryAccount, updateTreasuryAccount, deleteTreasuryAccount } =
    useTreasuryLogic();
  const [activeTab, setActiveTab] = useState<TreasuryType>('Bank');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingEntry, setEditingEntry] = useState<TreasuryAccount | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState(createEmptyFormState());

  const filtered = useMemo(
    () => treasuryAccounts.filter((acc) => acc.type === activeTab),
    [activeTab, treasuryAccounts]
  );

  useEffect(() => {
    setSelectedId(null);
  }, [activeTab]);

  const handleOpenAdd = () => {
    setModalMode('add');
    setEditingEntry(null);
    setForm(createEmptyFormState());
    setModalOpen(true);
  };

  const handleOpenEdit = () => {
    if (!selectedId) return;
    const entry = filtered.find((item) => item.id === selectedId);
    if (!entry) return;
    setModalMode('edit');
    setEditingEntry(entry);
    setForm({
      name: entry.name,
      accountNumber: entry.accountNumber ?? '',
      balance: entry.balance
    });
    setModalOpen(true);
  };

  const handleDeleteSelectedAccount = () => {
    if (!selectedId) return;
    const entry = filtered.find((item) => item.id === selectedId);
    if (!entry) return;
    if (entry.balance !== 0) {
      alert('لا يمكن حذف الحساب ما لم يكن الرصيد صفرًا.');
      return;
    }
    const confirmed = window.confirm(`هل أنت متأكد من حذف الحساب "${entry.name}"؟`);
    if (!confirmed) return;
    try {
      deleteTreasuryAccount(entry.id);
      setToast(`تم حذف الحساب ${entry.name} بنجاح.`);
      setSelectedId(null);
    } catch (error: any) {
      alert(error.message || 'فشل حذف الحساب');
    }
  };

  const resetModalState = () => {
    setModalOpen(false);
    setForm(createEmptyFormState());
    setEditingEntry(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const treasuryPayload = {
        name: form.name,
        type: activeTab,
        accountNumber: form.accountNumber,
        balance: form.balance,
        currency: 'EGP',
        schoolAccountName: form.schoolAccountName,
        bankName: form.bankName,
        iban: form.iban,
        accountType: form.accountType,
        openingDate: form.openingDate,
        isActive: form.isActive
      };
      if (modalMode === 'add') {
        const entry = await addTreasuryAccount(treasuryPayload);
        setToast(`Linked ${entry.name} to GL account ${entry.glCode} under Banks.`);
        setSelectedId(entry.id);
      } else if (editingEntry) {
        await updateTreasuryAccount({
          ...treasuryPayload,
          id: editingEntry.id
        });
        setToast(`تم تحديث الحساب ${form.name} بنجاح.`);
        setSelectedId(editingEntry.id);
      }
      resetModalState();
    } catch (error: any) {
      alert(error.message || 'Failed to save treasury account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">الخزينة</p>
          <h2 className="text-2xl font-black text-slate-900">إدارة البنوك والخزائن</h2>
        </div>
      </header>

      <nav className="flex gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-[0.3em] transition ${
              activeTab === tab.id
                ? 'bg-indigo-100 text-indigo-600'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
              <tab.icon size={16} />
              {tab.title}
            </button>
          ))}
        </nav>

      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <button
          type="button"
          onClick={handleOpenAdd}
          className="rounded-2xl border border-indigo-100 bg-white px-4 py-2 text-xs font-black text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          إضافة
        </button>
        <button
          type="button"
          onClick={handleOpenEdit}
          disabled={!selectedId}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          تعديل
        </button>
        <button
          type="button"
          onClick={handleDeleteSelectedAccount}
          disabled={!selectedId}
          className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-xs font-black text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          حذف
        </button>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {filtered.map((entry) => {
          const isSelected = selectedId === entry.id;
          return (
            <article
              key={entry.id}
              onClick={() => setSelectedId(entry.id)}
              className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition ${
                isSelected ? 'border-indigo-400 shadow-lg' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">GL {entry.glCode}</p>
                  <h3 className="text-lg font-black text-slate-900">{entry.name}</h3>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-600">
                  مترابط
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Balance: {entry.balance.toFixed(2)} {entry.currency}
              </p>
              {entry.accountNumber && (
                <p className="text-xs text-slate-400">Account Number: {entry.accountNumber}</p>
              )}
              <div className="mt-3 space-y-1 text-[11px] text-slate-500">
                <p>اسم حساب المدرسة: {entry.schoolAccountName || '-'}</p>
                {entry.bankName && <p>اسم البنك: {entry.bankName}</p>}
                {entry.iban && <p>IBAN: {entry.iban}</p>}
                <p>نوع الحساب: {entry.accountType}</p>
                <p>تاريخ الرصيد: {entry.openingDate}</p>
                <p>
                  الحالة:{' '}
                  <span className={entry.isActive ? 'text-emerald-600' : 'text-rose-600'}>
                    {entry.isActive ? 'مفعّل' : 'معطّل'}
                  </span>
                </p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                <button
                  onClick={(event) => event.stopPropagation()}
                  className="flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 hover:border-slate-400"
                >
                  <Download size={12} /> تنزيل
                </button>
                <button
                  onClick={(event) => event.stopPropagation()}
                  className="flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-rose-500 hover:border-rose-400"
                >
                  <AlertTriangle size={12} /> استرجاع
                </button>
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            لم يتم تعريف {activeTab === 'Bank' ? 'حسابات بنكية' : 'خزائن'} بعد.
          </div>
        )}
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">
                إضافة {activeTab === 'Bank' ? 'حساب بنكي' : 'خزينة'}
              </h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={resetModalState}>
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">كود الحساب</label>
              <input
                value={editingEntry?.glCode ?? 'سيتم توليد الكود تلقائيًا عند الحفظ'}
                readOnly
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-500">
                الاسم
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-500">
                اسم حساب المدرسة
                <input
                  value={form.schoolAccountName}
                  onChange={(event) => setForm({ ...form, schoolAccountName: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 outline-none"
                />
              </label>
              {activeTab === 'Bank' && (
                <label className="flex flex-col gap-2 text-sm text-slate-500">
                  رقم الحساب
                  <input
                    value={form.accountNumber}
                    onChange={(event) => setForm({ ...form, accountNumber: event.target.value })}
                    className="rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 outline-none"
                  />
                </label>
              )}
              <label className="flex flex-col gap-2 text-sm text-slate-500">
                اسم البنك
                <input
                  value={form.bankName}
                  onChange={(event) => setForm({ ...form, bankName: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-500">
                رقم الآيبان
                <input
                  value={form.iban}
                  onChange={(event) => setForm({ ...form, iban: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-500">
                نوع الحساب
                <select
                  value={form.accountType}
                  onChange={(event) => setForm({ ...form, accountType: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 outline-none"
                >
                  {accountTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-500">
                الرصيد الافتتاحي
                <input
                  type="number"
                  value={form.balance}
                  onChange={(event) => setForm({ ...form, balance: Number(event.target.value) })}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-500">
                العملة
                <input
                  value="EGP"
                  readOnly
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm bg-slate-50"
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-500">
                تاريخ الرصيد الافتتاحي
                <input
                  type="date"
                  value={form.openingDate}
                  onChange={(event) => setForm({ ...form, openingDate: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 outline-none"
                />
              </label>
              <label className="flex items-center gap-2 text-sm font-black text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                الحساب مفعل
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.4em] text-slate-400">
                <Cloud size={14} />
                النظام يزامن الحسابات العامة تلقائياً
              </div>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500 disabled:opacity-60"
              >
                <Plus size={14} />
              {loading ? 'جارٍ الإنشاء…' : 'حفظ وربط الحساب'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-2xl">
          {toast}
          <button className="ml-4 underline" onClick={() => setToast(null)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default BankAccountsList;
