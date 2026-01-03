import React, { useMemo, useState } from 'react';
import { Plus, XCircle } from 'lucide-react';
import { useSuppliersLogic } from '../../src/hooks/useSuppliersLogic';

const SuppliersTab: React.FC = () => {
  const { suppliers, addSupplierAccount } = useSuppliersLogic();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    commercialRecord: '',
    taxCard: '',
    bankAccountNumber: '',
    iban: '',
    bankName: '',
    address: '',
    contactNumbers: '',
    hasPreviousBalance: false,
    balance: 0,
    isActive: true
  });

  const sortedSuppliers = useMemo(
    () => suppliers.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [suppliers]
  );

  const resetForm = () => {
    setForm({
      name: '',
      commercialRecord: '',
      taxCard: '',
      bankAccountNumber: '',
      iban: '',
      bankName: '',
      address: '',
      contactNumbers: '',
      hasPreviousBalance: false,
      balance: 0,
      isActive: true
    });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      alert('اسم المورد مطلوب.');
      return;
    }
    setLoading(true);
    try {
      await addSupplierAccount({
        name: form.name.trim(),
        balance: form.balance,
        isActive: form.isActive,
        commercialRecord: form.commercialRecord,
        taxCard: form.taxCard,
        bankAccountNumber: form.bankAccountNumber,
        iban: form.iban,
        bankName: form.bankName,
        address: form.address,
        contactNumbers: form.contactNumbers,
        hasPreviousBalance: form.hasPreviousBalance
      });
      setModalOpen(false);
      resetForm();
    } catch (error: any) {
      alert(error.message || 'فشل إضافة المورد.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">الحسابات</p>
          <h3 className="text-xl font-black text-slate-900">الموردون</h3>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-white"
        >
          <Plus size={14} />
          إضافة مورد
        </button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">الكود</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">المورد</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-end">
                  الرصيد الافتتاحي
                </th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">
                  الحالة
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-sm text-slate-400">
                    لا توجد حسابات موردين بعد.
                  </td>
                </tr>
              ) : (
                sortedSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs text-slate-400 font-bold">{supplier.glCode}</td>
                    <td className="px-6 py-4 text-sm font-black text-slate-800">{supplier.name}</td>
                    <td className="px-6 py-4 text-end text-sm font-black text-slate-700">
                      {supplier.balance.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center text-xs font-black">
                      <span className={supplier.isActive ? 'text-emerald-600' : 'text-rose-600'}>
                        {supplier.isActive ? 'مفعّل' : 'معطّل'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">إضافة مورد</h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setModalOpen(false)}>
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">كود المورد</label>
              <input
                value="سيتم توليد الكود تلقائياً"
                readOnly
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-500">
                اسم المورد
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-500">
                السجل التجاري
                <input
                  value={form.commercialRecord}
                  onChange={(event) => setForm({ ...form, commercialRecord: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-500">
                البطاقة الضريبية
                <input
                  value={form.taxCard}
                  onChange={(event) => setForm({ ...form, taxCard: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-500">
                رقم حساب البنك
                <input
                  value={form.bankAccountNumber}
                  onChange={(event) => setForm({ ...form, bankAccountNumber: event.target.value })}
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
                اسم البنك
                <input
                  value={form.bankName}
                  onChange={(event) => setForm({ ...form, bankName: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-500 md:col-span-2">
                العنوان
                <input
                  value={form.address}
                  onChange={(event) => setForm({ ...form, address: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-500 md:col-span-2">
                أرقام التواصل
                <input
                  value={form.contactNumbers}
                  onChange={(event) => setForm({ ...form, contactNumbers: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-indigo-500 outline-none"
                />
              </label>
              <label className="flex items-center gap-2 text-sm font-black text-slate-600 md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.hasPreviousBalance}
                  onChange={(event) => setForm({ ...form, hasPreviousBalance: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                لديه رصيد سابق
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
            </div>
            <label className="flex items-center gap-2 text-sm font-black text-slate-600">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              المورد مفعل
            </label>
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500 disabled:opacity-60"
              >
                <Plus size={14} />
                {loading ? 'جارٍ الحفظ...' : 'حفظ المورد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersTab;
