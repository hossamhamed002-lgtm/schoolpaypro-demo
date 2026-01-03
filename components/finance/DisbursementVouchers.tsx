import React, { useMemo, useState } from 'react';
import { Lock, Search, FileText, Trash2, Pencil, Plus, X, Calendar } from 'lucide-react';
import { useAccounts } from '../../hooks/useAccountsLogic';
import { AccountType } from '../../src/types/accounts.types';

const columns = [
  { id: 'select', label: '' },
  { id: 'index', label: 'م' },
  { id: 'date', label: 'التاريخ' },
  { id: 'number', label: 'رقم السند' },
  { id: 'payee', label: 'اصرفوا لأمر' },
  { id: 'method', label: 'طريقة الصرف' },
  { id: 'treasury', label: 'الصندوق/البنك' },
  { id: 'statement', label: 'البيان' },
  { id: 'amount', label: 'القيمة' }
];

const DisbursementVouchers: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { accounts } = useAccounts();

  const expenseAccounts = useMemo(
    () => accounts.filter((account) => account.type === AccountType.EXPENSE && !account.isMain),
    [accounts]
  );
  const accountMap = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const currentAssetsAccounts = useMemo(() => {
    const isUnderCurrentAssets = (accountId: string): boolean => {
      let cursor: string | null | undefined = accountId;
      while (cursor) {
        const acc = accountMap.get(cursor);
        if (!acc) break;
        if (acc.code === '11') return true;
        cursor = acc.parentId;
      }
      return false;
    };
    return accounts.filter(
      (account) =>
        account.code !== '11' &&
        account.type === AccountType.ASSET &&
        isUnderCurrentAssets(account.id)
    );
  }, [accounts, accountMap]);
  const currentAssetsOptions = useMemo(
    () =>
      currentAssetsAccounts.map((account) => ({
        id: account.id,
        label: `${account.code} - ${account.name}`,
        code: account.code,
        name: account.name
      })),
    [currentAssetsAccounts]
  );
  const accountById = useMemo(
    () => new Map(expenseAccounts.map((account) => [account.id, account])),
    [expenseAccounts]
  );
  const accountOptions = useMemo(
    () =>
      expenseAccounts.map((account) => ({
        id: account.id,
        label: `${account.code} - ${account.name}`,
        code: account.code
      })),
    [expenseAccounts]
  );

  const [rows, setRows] = useState(
    Array.from({ length: 9 }, () => ({
      accountId: '',
      accountQuery: '',
      statement: '',
      amount: ''
    }))
  );
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [voucherNumber, setVoucherNumber] = useState('');
  const [voucherDate, setVoucherDate] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [voucherStatement, setVoucherStatement] = useState('');
  const [vouchers, setVouchers] = useState<
    Array<{
      id: string;
      number: string;
      date: string;
      payee: string;
      method: string;
      treasury: string;
      statement: string;
      amount: number;
    }>
  >([]);

  const handleRowChange = (index: number, patch: Partial<(typeof rows)[number]>) => {
    setRows((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
  };

  const resolveAccountFromQuery = (query: string) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return null;
    return expenseAccounts.find((account) => {
      const label = `${account.code} - ${account.name}`.toLowerCase();
      return label === normalized || account.code.toLowerCase() === normalized || account.name.toLowerCase() === normalized;
    }) || null;
  };

  const totalAmount = useMemo(() => {
    return rows.reduce((sum, row) => {
      const value = Number(row.amount || 0);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }, [rows]);

  const hasVoucherData = rows.some((row) => {
    const amount = Number(row.amount || 0);
    return row.accountId || row.statement.trim() || amount > 0;
  });

  const filterAccountOptions = (query: string) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return accountOptions;
    return accountOptions.filter((option) => option.label.toLowerCase().includes(normalized));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-end">
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
              className="m-2 rounded-xl border border-blue-200 bg-blue-50 p-2 text-blue-600 shadow-sm"
              onClick={() => setIsOpen(true)}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>

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
              {vouchers.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="bg-white">
                    <div className="h-[360px]" />
                  </td>
                </tr>
              ) : (
                vouchers.map((voucher, index) => (
                  <tr key={voucher.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" className="h-4 w-4 accent-slate-500" />
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">{index + 1}</td>
                    <td className="px-4 py-3 text-center font-semibold">{voucher.date}</td>
                    <td className="px-4 py-3 text-center font-semibold">{voucher.number}</td>
                    <td className="px-4 py-3 text-center font-semibold">{voucher.payee}</td>
                    <td className="px-4 py-3 text-center font-semibold">{voucher.method}</td>
                    <td className="px-4 py-3 text-center font-semibold">{voucher.treasury}</td>
                    <td className="px-4 py-3 text-center font-semibold">{voucher.statement}</td>
                    <td className="px-4 py-3 text-center font-bold">{voucher.amount.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-slate-200 bg-slate-100 p-2 text-slate-500 hover:text-slate-800"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="text-sm font-black">:: إضافة ::</span>
              </div>
            </div>

            <div className="grid gap-5 px-6 py-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                <div className="lg:col-span-6">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">طريقة الدفع:</label>
                      <select
                        className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={paymentAccountId}
                        onChange={(event) => {
                          const id = event.target.value;
                          setPaymentAccountId(id);
                          const acc = currentAssetsOptions.find((option) => option.id === id);
                          setPaymentMethod(acc?.name || '');
                          setAccountNumber(acc?.code || '');
                        }}
                      >
                        <option value="">اختر الحساب (الخزينة/البنوك)...</option>
                        {currentAssetsOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">رقم الحساب:</label>
                      <input
                        type="text"
                        className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                        placeholder="10200002002"
                        value={accountNumber}
                        onChange={(event) => setAccountNumber(event.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-6">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">رقم السند:</label>
                      <input
                        type="text"
                        className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                        placeholder="357"
                        value={voucherNumber}
                        onChange={(event) => setVoucherNumber(event.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">تاريخ السند:</label>
                      <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="date"
                          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm ps-10"
                          value={voucherDate}
                          onChange={(event) => setVoucherDate(event.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-12">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">بيان سند الصرف:</label>
                    <input
                      type="text"
                      className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                      placeholder="بيان الصرف"
                      value={voucherStatement}
                      onChange={(event) => setVoucherStatement(event.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-t-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm"
                >
                  مصاريف عامة
                </button>
                <button
                  type="button"
                  className="rounded-t-lg border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500"
                >
                  فواتير مشتريات
                </button>
              </div>

              <div className="overflow-hidden rounded border border-slate-300">
                <table className="min-w-full text-sm">
                  <colgroup>
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '36%' }} />
                    <col style={{ width: '20%' }} />
                  </colgroup>
                  <thead className="bg-slate-700 text-white">
                    <tr>
                      <th className="px-3 py-2 text-center font-bold border-l border-slate-500">حساب التكاليف</th>
                      <th className="px-3 py-2 text-center font-bold border-l border-slate-500">رقم الحساب</th>
                      <th className="px-3 py-2 text-center font-bold border-l border-slate-500">البيان</th>
                      <th className="px-3 py-2 text-center font-bold">القيمة المدفوعة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const account = accountById.get(row.accountId);
                      return (
                        <tr key={idx} className="border-t border-slate-300">
                          <td className="h-9 px-3 border-l border-slate-300 relative">
                            <input
                              type="text"
                              value={row.accountQuery}
                              onFocus={() => setActiveRow(idx)}
                              onChange={(event) => {
                                const value = event.target.value;
                                const resolved = resolveAccountFromQuery(value);
                                handleRowChange(idx, {
                                  accountQuery: value,
                                  accountId: resolved ? resolved.id : row.accountId
                                });
                              }}
                              onBlur={() => {
                                window.setTimeout(() => setActiveRow((prev) => (prev === idx ? null : prev)), 120);
                                const resolved = resolveAccountFromQuery(row.accountQuery);
                                if (resolved) {
                                  handleRowChange(idx, {
                                    accountId: resolved.id,
                                    accountQuery: `${resolved.code} - ${resolved.name}`
                                  });
                                }
                              }}
                              className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
                              placeholder=""
                            />
                            {activeRow === idx && (
                              <div className="absolute right-0 top-full z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-40 overflow-auto">
                                {filterAccountOptions(row.accountQuery).map((option) => (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onMouseDown={() => {
                                      handleRowChange(idx, {
                                        accountId: option.id,
                                        accountQuery: option.label
                                      });
                                      setActiveRow(null);
                                    }}
                                    className="w-full text-start px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                  >
                                    {option.label}
                                  </button>
                                ))}
                                {filterAccountOptions(row.accountQuery).length === 0 && (
                                  <div className="px-3 py-2 text-xs font-semibold text-slate-400">
                                    لا توجد نتائج
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="h-9 px-3 border-l border-slate-300">
                            <input
                              type="text"
                              value={account?.code || ''}
                              readOnly
                              className="w-full bg-transparent text-sm font-semibold text-slate-600"
                            />
                          </td>
                          <td className="h-9 px-3 border-l border-slate-300">
                            <input
                              type="text"
                              value={row.statement}
                              onChange={(event) => handleRowChange(idx, { statement: event.target.value })}
                              className="w-full bg-transparent text-sm text-slate-700 outline-none"
                              placeholder="تفصيل سند الصرف"
                            />
                          </td>
                          <td className="h-9 px-3">
                            <input
                              type="number"
                              value={row.amount}
                              onChange={(event) => handleRowChange(idx, { amount: event.target.value })}
                              className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
                              placeholder="0"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-3">
                <p className="text-sm font-bold text-slate-600">إجمالي المبلغ المصروف:</p>
                <span className="text-sm font-black text-slate-900">{totalAmount.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-center pb-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!hasVoucherData) {
                      alert('لا يمكن حفظ سند فارغ. اختر حسابًا أو اكتب بيانًا أو أدخل مبلغًا.');
                      return;
                    }
                    const nextVoucher = {
                      id: `VCH-${Date.now()}`,
                      number: voucherNumber || `#${vouchers.length + 1}`,
                      date: voucherDate || new Date().toISOString().slice(0, 10),
                      payee: '-',
                      method: paymentMethod || '---',
                      treasury: accountNumber || '---',
                      statement: voucherStatement || 'سند صرف',
                      amount: totalAmount
                    };
                    setVouchers((prev) => [nextVoucher, ...prev]);
                    setVoucherNumber('');
                    setVoucherDate('');
                    setPaymentMethod('بنك التعمير والإسكان');
                    setAccountNumber('');
                    setVoucherStatement('');
                    setRows(
                      Array.from({ length: 9 }, () => ({
                        accountId: '',
                        accountQuery: '',
                        statement: '',
                        amount: ''
                      }))
                    );
                    setIsOpen(false);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-12 py-2 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50"
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

export default DisbursementVouchers;
