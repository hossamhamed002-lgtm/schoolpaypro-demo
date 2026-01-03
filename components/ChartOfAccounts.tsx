import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Edit3,
  Folder,
  FileText,
  Eye,
  Square,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Account, AccountLevel, AccountType } from '../src/types/accounts.types';
import { useAccounts } from '../hooks/useAccountsLogic';
import { useStore } from '../store';
import { useJournal } from '../src/hooks/useJournal';

const treeLevelStyles = (level: number) => ({
  paddingLeft: level * 18 + 16
});

const buildTree = (accounts: Account[]) => {
  const byParent = new Map<string | null, Account[]>();
  accounts.forEach((account) => {
    const key = account.parentId || null;
    const bucket = byParent.get(key) ?? [];
    bucket.push(account);
    byParent.set(key, bucket);
  });
  byParent.forEach((bucket) =>
    bucket.sort((a, b) =>
      Number(a.code).toString().localeCompare(Number(b.code).toString(), undefined, { numeric: true })
    )
  );
  return byParent;
};

const systemAccountCodes = new Set(['1', '2', '3', '4', '5']);

const ChartOfAccounts: React.FC = () => {
  const store = useStore();
  const { accounts, addAccount, deleteAccount, getNextCode, hasChildren, updateAccount } = useAccounts();
  const { entries: journalEntries } = useJournal();
  const parentMap = useMemo(() => buildTree(accounts), [accounts]);
  const accountLookup = useMemo(() => {
    const map = new Map<string, Account>();
    accounts.forEach((account) => map.set(account.id, account));
    return map;
  }, [accounts]);
  const subtreeBalanceMap = useMemo(() => {
    const cache = new Map<string, number>();
    const compute = (accountId: string): number => {
      if (cache.has(accountId)) return cache.get(accountId)!;
      const account = accountLookup.get(accountId);
      if (!account) return 0;
      const children = parentMap.get(accountId) ?? [];
      const childrenTotal = children.reduce((sum, child) => sum + compute(child.id), 0);
      const total = Number((account.balance + childrenTotal).toFixed(2));
      cache.set(accountId, total);
      return total;
    };
    accounts.forEach((account) => {
      compute(account.id);
    });
    return cache;
  }, [accounts, accountLookup, parentMap]);

  const subtreeTotalsMap = useMemo(() => {
    const baseTotals = new Map<string, { debit: number; credit: number }>();
    journalEntries
      .filter((entry) => entry.status === 'APPROVED' || entry.status === 'POSTED')
      .filter((entry) => {
        const entryYear = (entry as any).Academic_Year_ID || (entry as any).academicYearId || '';
        return !entryYear || entryYear === store.workingYearId;
      })
      .forEach((entry) => {
        entry.lines.forEach((line) => {
          const current = baseTotals.get(line.accountId) || { debit: 0, credit: 0 };
          current.debit += Number(line.debit || 0);
          current.credit += Number(line.credit || 0);
          baseTotals.set(line.accountId, current);
        });
      });

    const cache = new Map<string, { debit: number; credit: number }>();
    const compute = (accountId: string): { debit: number; credit: number } => {
      if (cache.has(accountId)) return cache.get(accountId)!;
      const children = parentMap.get(accountId) ?? [];
      const selfTotals = baseTotals.get(accountId) || { debit: 0, credit: 0 };
      const childrenTotals = children.reduce(
        (sum, child) => {
          const childTotals = compute(child.id);
          return {
            debit: sum.debit + childTotals.debit,
            credit: sum.credit + childTotals.credit
          };
        },
        { debit: 0, credit: 0 }
      );
      const total = {
        debit: Number((selfTotals.debit + childrenTotals.debit).toFixed(2)),
        credit: Number((selfTotals.credit + childrenTotals.credit).toFixed(2))
      };
      cache.set(accountId, total);
      return total;
    };
    accounts.forEach((account) => {
      compute(account.id);
    });
    return cache;
  }, [accounts, journalEntries, parentMap, store.workingYearId]);

  const displayTotalsMap = useMemo(() => {
    const map = new Map<string, { debit: number; credit: number }>();
    accounts.forEach((account) => {
      const totals = subtreeTotalsMap.get(account.id) ?? { debit: 0, credit: 0 };
      if (totals.debit === 0 && totals.credit === 0) {
        const net = subtreeBalanceMap.get(account.id) ?? 0;
        map.set(account.id, {
          debit: net > 0 ? Number(net.toFixed(2)) : 0,
          credit: net < 0 ? Number(Math.abs(net).toFixed(2)) : 0
        });
      } else {
        map.set(account.id, totals);
      }
    });
    return map;
  }, [accounts, subtreeTotalsMap, subtreeBalanceMap]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [ledgerModal, setLedgerModal] = useState<{ open: boolean; account: Account | null }>({
    open: false,
    account: null
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [modalParent, setModalParent] = useState<Account | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: AccountType.ASSET,
    isMain: true,
    level: AccountLevel.ROOT,
    parentId: null as string | null
  });
  const selectedAccount = selectedAccountId ? accountLookup.get(selectedAccountId) ?? null : null;
  const selectedIsSystemAccount = selectedAccount ? systemAccountCodes.has(selectedAccount.code) : false;
  const selectedIsRootAccount = selectedAccount ? selectedAccount.level === AccountLevel.ROOT : false;
  const canEditSelected = Boolean(selectedAccount && !selectedIsSystemAccount && !selectedIsRootAccount);
  const canAddSelected = Boolean(selectedAccount);
  const selectedHasChildren = selectedAccount ? hasChildren(selectedAccount.id) : false;
  const selectedHasTransactions = selectedAccount ? accountHasPostedTransactions(selectedAccount.id) : false;
  const canDeleteSelected = Boolean(
    selectedAccount &&
      !selectedIsRootAccount &&
      !selectedHasChildren &&
      selectedAccount.balance === 0 &&
      !selectedHasTransactions
  );
  const isSystemAccount = editingAccount ? systemAccountCodes.has(editingAccount.code) : false;
  const editingHasChildren = editingAccount ? hasChildren(editingAccount.id) : false;
  const isTypeDisabled = modalMode === 'edit' ? editingHasChildren || isSystemAccount : false;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRowSelect = (account: Account) => {
    setSelectedAccountId((prev) => (prev === account.id ? null : account.id));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      type: AccountType.ASSET,
      isMain: true,
      level: AccountLevel.ROOT,
      parentId: null
    });
    setModalParent(null);
    setEditingAccount(null);
  };


  const openAddModal = (parent: Account) => {
    const level = Math.min(parent.level + 1, AccountLevel.LEAF);
    let nextCode = '';
    try {
      nextCode = getNextCode(parent.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'حدث خطأ أثناء توليد الرمز');
      return;
    }
    setFormData({
      name: '',
      code: nextCode,
      type: parent?.type ?? AccountType.ASSET,
      isMain: false,
      level,
      parentId: parent.id
    });
    setModalParent(parent);
    setEditingAccount(null);
    setModalMode('add');
    setIsModalOpen(true);
  };

  const handleAddChild = (account: Account) => openAddModal(account);

  const handleAddSelectedAccount = () => {
    if (!selectedAccount) return;
    openAddModal(selectedAccount);
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setModalParent(account.parentId ? accountLookup.get(account.parentId) ?? null : null);
    setFormData({
      name: account.name,
      code: account.code,
      type: account.type,
      isMain: account.isMain,
      level: account.level,
      parentId: account.parentId ?? null
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  function accountHasPostedTransactions(accountId: string) {
    const legacy = (store.journalEntries || []).some(
      (entry: any) => entry.Account_ID === accountId && entry.Academic_Year_ID === store.workingYearId
    );
    if (legacy) return true;
    return journalEntries.some(
      (entry) =>
        entry.status !== 'REJECTED' &&
        entry.lines.some((line) => line.accountId === accountId)
    );
  }

  const handleEditSelectedAccount = () => {
    if (!selectedAccount || selectedIsSystemAccount || selectedIsRootAccount) return;
    handleEditAccount(selectedAccount);
  };
  const handleDeleteSelectedAccount = () => {
    if (!selectedAccount) return;
    if (hasChildren(selectedAccount.id)) {
      alert('لا يمكن حذف حساب يحتوي على حسابات فرعية.');
      return;
    }
    if (selectedAccount.balance !== 0) {
      alert('لا يمكن حذف حساب غير متوازن. الرجاء التأكد من أن الرصيد يساوي صفر.');
      return;
    }
    if (accountHasPostedTransactions(selectedAccount.id)) {
      alert('لا يمكن حذف الحساب لأنه يحتوي على قيود مسجلة.');
      return;
    }
    const confirmed = window.confirm(`هل أنت متأكد من حذف الحساب "${selectedAccount.name}"؟`);
    if (!confirmed) return;
    deleteAccount(selectedAccount.id);
    setSelectedAccountId(null);
  };

  const handleSave = () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      alert('الاسم والرمز مطلوبان');
      return;
    }
    if (editingAccount) {
      updateAccount(editingAccount.id, {
        name: formData.name.trim()
      });
    } else {
      const id = crypto.randomUUID ? crypto.randomUUID() : `ACC-${Date.now()}`;
      addAccount({
        id,
        code: formData.code.trim(),
        name: formData.name.trim(),
        type: formData.type,
        level: formData.level,
        parentId: formData.parentId,
        isMain: formData.isMain,
        balance: 0
      });
    }
    setIsModalOpen(false);
    resetForm();
  };

  const ledgerEntriesForAccount = useMemo(() => {
    if (!ledgerModal.account) return [];
    const journal = journalEntries
      .filter((entry) => entry.status === 'APPROVED' || entry.status === 'POSTED')
      .flatMap((entry) =>
        entry.lines
          .filter((line) => line.accountId === ledgerModal.account?.id)
          .map((line) => ({
            Entry_ID: entry.id,
            SourceRefId: entry.sourceRefId || '',
            Date: entry.date || entry.createdAt,
            Description: line.note || entry.description,
            Debit: line.debit ?? 0,
            Credit: line.credit ?? 0,
            Academic_Year_ID: (entry as any).Academic_Year_ID || (entry as any).academicYearId
          }))
      )
      // TODO: enforce Academic_Year_ID on journal entries for strict year filtering.
      .filter(
        (entry) =>
          !entry.Academic_Year_ID || entry.Academic_Year_ID === store.workingYearId
      );

    const unique = new Map<string, any>();
    journal.forEach((entry) => {
      const keyBase = entry.SourceRefId
        ? `${entry.SourceRefId}:${entry.Debit}:${entry.Credit}`
        : entry.Entry_ID;
      if (!unique.has(keyBase)) {
        unique.set(keyBase, entry);
      }
    });

    return Array.from(unique.values());
  }, [ledgerModal.account, store.journalEntries, store.workingYearId, journalEntries]);

  const totalDebit = ledgerEntriesForAccount.reduce((sum, entry: any) => sum + Number(entry.Debit ?? 0), 0);
  const totalCredit = ledgerEntriesForAccount.reduce((sum, entry: any) => sum + Number(entry.Credit ?? 0), 0);

  const allowedRootCodes = new Set(['1', '2', '4', '5']);
  const rootAccounts = (parentMap.get(null) ?? []).filter((account) => allowedRootCodes.has(account.code));

  const accountTotals = useMemo(() => {
    const totals = rootAccounts.reduce(
      (acc, account) => {
        const display = displayTotalsMap.get(account.id) ?? { debit: 0, credit: 0 };
        return {
          debit: acc.debit + display.debit,
          credit: acc.credit + display.credit
        };
      },
      { debit: 0, credit: 0 }
    );
    return {
      totalDebit: Number(totals.debit.toFixed(2)),
      totalCredit: Number(totals.credit.toFixed(2))
    };
  }, [rootAccounts, displayTotalsMap]);

  const renderRow = (account: Account, level = 0) => {
    const children = parentMap.get(account.id) ?? [];
    const isExpanded = expanded[account.id];
    const isSystem = systemAccountCodes.has(account.code);
    const isRowSelected = selectedAccountId === account.id;
    const isRowEditable = !isSystem && account.level !== AccountLevel.ROOT;
    const subtreeTotals = displayTotalsMap.get(account.id) ?? { debit: 0, credit: 0 };
    return (
        <React.Fragment key={account.id}>
          <tr
            className={`border-b ${isRowSelected ? 'bg-indigo-50' : 'bg-white'} hover:bg-slate-50`}
          >
            <td className="px-4 py-3 text-center">
              <input
                type="checkbox"
                checked={isRowSelected}
                onChange={() => handleRowSelect(account)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </td>
            <td className="px-4 py-3" style={treeLevelStyles(level)}>
              <div className="flex items-center gap-2">
                {children.length ? (
                  <button type="button" onClick={() => toggleExpand(account.id)}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                ) : (
                  <Square size={16} className="text-slate-300" />
                )}
                {account.isMain ? <Folder size={16} className="text-indigo-500" /> : <FileText size={16} />}
                <span className="font-black">{account.name}</span>
              </div>
              <p className="text-[11px] text-slate-400">{account.code}</p>
              <div className="flex gap-2 text-[10px] text-slate-500 mt-1">
                {account.parentId === null && (
                  <span className="inline-flex items-center gap-1 text-rose-600">⛔ حساب رئيسي</span>
                )}
                {Math.abs(account.balance) > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-600">⚠️ يوجد معاملات</span>
                )}
              </div>
            </td>
            <td className="px-4 py-3 text-center">
              <span className="text-[11px] text-slate-500">
                {account.level === AccountLevel.ROOT
                  ? 'رئيسي'
                  : account.level === AccountLevel.BRANCH
                  ? 'أساسي'
                  : 'فرعي'}
              </span>
            </td>
            <td className="px-4 py-3 text-center">{account.type}</td>
            <td className="px-4 py-3 text-center text-emerald-600">{subtreeTotals.debit > 0 ? subtreeTotals.debit.toFixed(2) : '-'}</td>
            <td className="px-4 py-3 text-center text-rose-600">{subtreeTotals.credit > 0 ? subtreeTotals.credit.toFixed(2) : '-'}</td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setLedgerModal({ open: true, account })}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-black text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                >
                  كشف حساب
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!isRowEditable) return;
                    setSelectedAccountId(account.id);
                    handleEditAccount(account);
                  }}
                  disabled={!isRowEditable}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Edit3 size={14} />
                </button>
              </div>
            </td>
          </tr>
          {isExpanded && children.length ? children.map((child) => renderRow(child, level + 1)) : null}
        </React.Fragment>
      );
  };

  return (
    <div className="space-y-6 text-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">الحسابات المالية / دليل الحسابات</p>
          <h1 className="text-2xl font-black text-slate-900">الهيكل المحاسبي</h1>
        </div>
        <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm hover:bg-slate-50">
          <Eye size={16} />
          إظهار الكل
        </button>
        {process.env.NODE_ENV !== 'production' && (
          <button
            onClick={() => {
              const confirmed = window.confirm(
                'سيتم حذف دليل الحسابات الحالي وإعادة تحميل الدليل الافتراضي. هل أنت متأكد؟'
              );
              if (confirmed) {
                window.localStorage.removeItem('SCHOOL_CATALOG_ACCOUNTS');
                window.location.reload();
              }
            }}
            className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-xs font-black text-rose-600 shadow-sm hover:bg-rose-50"
          >
            إعادة تهيئة دليل الحسابات
          </button>
        )}
      </div>
    </div>

      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
        <button
          type="button"
          onClick={handleAddSelectedAccount}
          disabled={!canAddSelected}
          className="rounded-2xl border border-indigo-100 bg-white px-4 py-2 text-xs font-black text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          إضافة حساب
        </button>
        <button
          type="button"
          onClick={handleEditSelectedAccount}
          disabled={!canEditSelected}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          تعديل الحساب
        </button>
        <button
          type="button"
          onClick={handleDeleteSelectedAccount}
          disabled={!canDeleteSelected}
          className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-xs font-black text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          حذف الحساب
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="max-h-[600px] overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-20 bg-slate-50 text-[11px] uppercase text-slate-500 tracking-wider">
            <tr>
              <th className="px-4 py-3 text-center w-12">تحديد</th>
              <th className="px-4 py-3 text-start">اسم الحساب</th>
              <th className="px-4 py-3 text-center">المستوى</th>
              <th className="px-4 py-3 text-center">الصنف</th>
              <th className="px-4 py-3 text-center">مدين</th>
              <th className="px-4 py-3 text-center">دائن</th>
              <th className="px-4 py-3 text-center">عمليات</th>
            </tr>
          </thead>
          <tbody>{rootAccounts.length ? rootAccounts.map((account) => renderRow(account)) : null}</tbody>
          <tfoot className="sticky bottom-0 z-10 bg-slate-50 text-[11px] uppercase text-slate-500">
            <tr>
              <td className="px-4 py-3 text-center font-black text-slate-800" colSpan={4}>الإجمالي</td>
              <td className="px-4 py-3 text-center text-emerald-700 font-black text-base">{accountTotals.totalDebit.toFixed(2)}</td>
              <td className="px-4 py-3 text-center text-rose-700 font-black text-base">{accountTotals.totalCredit.toFixed(2)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
        </div>
      </div>

      {ledgerModal.open && ledgerModal.account && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">{ledgerModal.account.name} - كشف حساب</h3>
                <p className="text-xs text-slate-500">{ledgerModal.account.code}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-black text-sm text-slate-500">
                  {totalDebit === totalCredit ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 size={16} />
                      القيد موزون ({totalDebit.toFixed(2)})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-600">
                      <XCircle size={16} />
                      غير موزون
                    </span>
                  )}
                </span>
                <button
                  onClick={() => setLedgerModal({ open: false, account: null })}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-black text-slate-600"
                >
                  غلق
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-700 border-collapse">
                <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-start">كود العملية</th>
                    <th className="px-3 py-2 text-start">التاريخ</th>
                    <th className="px-3 py-2 text-start">البيان</th>
                    <th className="px-3 py-2 text-center">مدين</th>
                    <th className="px-3 py-2 text-center">دائن</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntriesForAccount.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-xs text-slate-500">
                        لا توجد حركات لهذا الحساب.
                      </td>
                    </tr>
                  ) : (
                    ledgerEntriesForAccount.map((entry: any) => (
                      <tr key={entry.Entry_ID} className="border-b border-slate-100">
                        <td className="px-3 py-3">{entry.Entry_ID}</td>
                        <td className="px-3 py-3">{new Date(entry.Date).toLocaleDateString('ar-EG')}</td>
                        <td className="px-3 py-3">{entry.Description}</td>
                        <td className="px-3 py-3 text-center text-emerald-600">{(entry.Debit ?? 0).toFixed(2)}</td>
                        <td className="px-3 py-3 text-center text-rose-600">{(entry.Credit ?? 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="text-[11px] uppercase bg-slate-100 text-slate-500">
                  <tr>
                    <td className="px-3 py-3 font-black text-slate-800">الإجمالي</td>
                    <td />
                    <td />
                    <td className="px-3 py-3 text-center text-emerald-600 font-black">
                      {totalDebit.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-center text-rose-600 font-black">
                      {totalCredit.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setLedgerModal({ open: false, account: null })}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600"
              >
                إغلاق
              </button>
              <button className="rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-black text-white">
                طباعة الكشف
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">
                {editingAccount ? 'تعديل الحساب' : 'إضافة حساب جديد'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-500 uppercase">رمز الحساب</label>
                <input
                  value={formData.code}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                  placeholder="مثال: 1101"
                  readOnly
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 uppercase">الاسم</label>
                <input
                  value={formData.name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                  placeholder="مثال: الخزينة"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 uppercase">نوع الحساب</label>
                <select
                  value={formData.type}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, type: event.target.value as AccountType }))
                  }
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                  disabled={isTypeDisabled}
                >
                  {Object.values(AccountType).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-500 uppercase">حساب الأب</label>
                <input
                  value={modalParent ? modalParent.name : 'جذر (بدون أب)'}
                  readOnly
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500"
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.isMain}
                  onChange={(event) => {
                    const isChecked = event.target.checked;
                    setFormData((prev) => ({
                      ...prev,
                      isMain: isChecked,
                      level: modalParent ? Math.min(modalParent.level + 1, AccountLevel.BRANCH) : prev.level
                    }));
                  }}
                  id="modalMain"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  disabled={modalMode === 'edit'}
                />
                <label htmlFor="modalMain" className="text-sm text-slate-600 font-black">
                  تحويل الحساب إلى مجلد
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-600"
              >
                إلغاء
              </button>
              <button onClick={handleSave} className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-black text-white">
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartOfAccounts;
