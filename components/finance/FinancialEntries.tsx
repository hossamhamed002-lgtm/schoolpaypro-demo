import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Edit3, Trash2, Download, BadgeCheck, BadgeX, Search, Filter } from 'lucide-react';
import { useAccounts } from '../../hooks/useAccountsLogic';
import { useJournal } from '../../src/hooks/useJournal';
import { JournalEntry, JournalLine } from '../../src/types/journal.types';
import { Account } from '../../src/types/accounts.types';
import { useAcademicYear } from '../../contexts/AcademicYearContext';
import { isFinancialYearClosed } from '../../src/utils/financialYearClose';

type EntryStatus = 'draft' | 'posted';

type FinancialEntry = {
  id: string;
  code: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balanced: boolean;
  status: EntryStatus;
  isPosted?: boolean;
  lines?: EntryLine[];
};

type EntryLine = {
  id: string;
  accountId?: string;
  accountName: string;
  accountCode: string;
  memo: string;
  debit: number;
  credit: number;
};

type CombinedEntry = FinancialEntry & { source: 'draft' | 'journal' };

const FinancialEntries: React.FC = () => {
  const { accounts } = useAccounts();
  const { entries: journalEntries, addEntry } = useJournal();
  const { selectedYearId } = useAcademicYear();
  const [draftEntries, setDraftEntries] = useState<FinancialEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EntryStatus>('all');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [modalLines, setModalLines] = useState<EntryLine[]>([
    { id: 'l1', accountName: '', accountCode: '', memo: '', debit: 0, credit: 0 }
  ]);
  const [modalHeader, setModalHeader] = useState({ code: 'JV-XXXX', date: '', memo: '' });
  const [isClosed, setIsClosed] = useState(false);

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const buildCode = (year: number, seq: number) => `JV-${year}-${String(seq).padStart(4, '0')}`;

  const extractSeq = (code: string) => {
    const match = /^JV-(\d{4})-(\d+)$/.exec(code);
    if (!match) return null;
    return { year: Number(match[1]), seq: Number(match[2]) };
  };

  const safeAccounts: Account[] = Array.isArray(accounts) ? (accounts as Account[]) : [];

  const parseAmount = (value: string) => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : 0;
  };

  const generateNextCode = () => {
    let maxSeq = 0;
    draftEntries.forEach((entry) => {
      const parsed = extractSeq(entry.code);
      if (parsed && parsed.year === currentYear && parsed.seq > maxSeq) {
        maxSeq = parsed.seq;
      }
    });
    journalEntries.forEach((entry) => {
      const year = entry.date ? new Date(entry.date).getFullYear() : currentYear;
      if (year !== currentYear) return;
      const seq = entry.journalNo || 0;
      if (seq > maxSeq) maxSeq = seq;
    });
    return buildCode(currentYear, maxSeq + 1);
  };

  const findAccount = (value: string) =>
    safeAccounts.find((a) => a.name === value || a.code === value);

  const postedEntries: CombinedEntry[] = useMemo(() => {
    return journalEntries
      .filter((entry) => entry.status !== 'DRAFT')
      .map((entry, idx) => {
        const year = entry.date ? new Date(entry.date).getFullYear() : currentYear;
        const seq = entry.journalNo || idx + 1;
        const code = buildCode(year, seq);
        const lines: EntryLine[] = (entry.lines || []).map((line) => {
          const accountInfo = safeAccounts.find((acc) => acc.id === line.accountId);
          return {
            id: line.id,
            accountId: line.accountId,
            accountName: accountInfo?.name || '',
            accountCode: accountInfo?.code || '',
            memo: line.note || '',
            debit: line.debit,
            credit: line.credit
          };
        });
        return {
          id: entry.id,
          code,
          date: entry.date,
          description: entry.description,
          debit: entry.totalDebit,
          credit: entry.totalCredit,
          balanced: entry.isBalanced,
          status: 'posted' as EntryStatus,
          isPosted: entry.status !== 'DRAFT',
          lines,
          source: 'journal' as const
        };
      });
  }, [journalEntries, currentYear, safeAccounts]);

  const combinedEntries: CombinedEntry[] = useMemo(() => {
    const drafts = draftEntries.map((entry) => ({ ...entry, source: 'draft' as const }));
    return [...drafts, ...postedEntries];
  }, [draftEntries, postedEntries]);

  const filtered: CombinedEntry[] = useMemo(() => {
    let data = combinedEntries;
    if (search) {
      const term = search.toLowerCase();
      data = data.filter((e) => `${e.code} ${e.description}`.toLowerCase().includes(term));
    }
    if (statusFilter !== 'all') {
      data = data.filter((e) => e.status === statusFilter);
    }
    return data;
  }, [combinedEntries, search, statusFilter]);

  useEffect(() => {
    setSelectedId(null);
  }, [search, statusFilter]);

  useEffect(() => {
    if (selectedId && !combinedEntries.find((e) => e.id === selectedId)) {
      setSelectedId(null);
    }
  }, [combinedEntries, selectedId]);

  const selected = combinedEntries.find((e) => e.id === selectedId);

  const badge = selected
    ? selected.balanced
      ? { text: selected.status === 'posted' ? 'مرحّل (موزون)' : 'قيد موزون', color: 'bg-emerald-50 text-emerald-700', icon: <BadgeCheck size={16} /> }
      : { text: 'قيد غير موزون', color: 'bg-rose-50 text-rose-700', icon: <BadgeX size={16} /> }
    : { text: '—', color: 'bg-slate-100 text-slate-500', icon: null };

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    let hasInvalid = false;

    modalLines.forEach((line) => {
      const d = Number(line.debit) || 0;
      const c = Number(line.credit) || 0;
      const bothSides = d > 0 && c > 0;
      const noValue = d <= 0 && c <= 0;

      if (!line.accountId || bothSides || noValue) {
        hasInvalid = true;
      }

      debit += d > 0 ? d : 0;
      credit += c > 0 ? c : 0;
    });

    const balanced = debit > 0 && credit > 0 && debit === credit && !hasInvalid;
    return { debit, credit, balanced, hasInvalid };
  }, [modalLines]);

  const selectedDraft = selected && selected.source === 'draft' && selected.status === 'draft' ? selected : undefined;
  const canEdit = !!selectedDraft;
  const canDelete = !!selectedDraft;
  const lockTooltip = '⚠️ تم إغلاق العام المالي، لا يمكن التعديل';

  useEffect(() => {
    const schoolCode =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('EDULOGIC_ACTIVE_SCHOOL_CODE_V1') || undefined
        : undefined;
    setIsClosed(isFinancialYearClosed(schoolCode, selectedYearId));
  }, [selectedYearId]);

  const resetModalForAdd = () => {
    if (isClosed) return;
    setModalHeader({
      code: generateNextCode(),
      date: new Date().toISOString().slice(0, 10),
      memo: ''
    });
    setModalLines([{ id: 'l1', accountName: '', accountCode: '', memo: '', debit: 0, credit: 0 }]);
    setModalMode('add');
    setShowModal(true);
  };

  const handleSaveDraft = () => {
    if (isClosed) return;
    if (totals.hasInvalid) return;
    const newEntry: FinancialEntry = {
      id: modalMode === 'edit' && selectedDraft ? selectedDraft.id : `draft-${Date.now()}`,
      code: modalHeader.code,
      date: modalHeader.date || new Date().toISOString().slice(0, 10),
      description: modalHeader.memo,
      debit: totals.debit,
      credit: totals.credit,
      balanced: totals.balanced,
      status: 'draft',
      isPosted: false,
      lines: modalLines.map((l) => ({ ...l }))
    };
    setDraftEntries((prev) => {
      const exists = prev.findIndex((e) => e.id === newEntry.id);
      if (exists >= 0) {
        const next = [...prev];
        next[exists] = newEntry;
        return next;
      }
      return [...prev, newEntry];
    });
    setShowModal(false);
  };

  const handlePost = () => {
    if (isClosed) return;
    if (totals.hasInvalid || !totals.balanced) return;
    if (!modalLines.every((l) => l.accountId)) return;

    const seq = extractSeq(modalHeader.code)?.seq ?? Date.now();
    const journalLines: JournalLine[] = modalLines.map((l) => ({
      id: l.id,
      accountId: l.accountId || '',
      debit: l.debit > 0 ? l.debit : 0,
      credit: l.credit > 0 ? l.credit : 0,
      note: l.memo
    }));

    const journal: JournalEntry = {
      id: `JR-${Date.now()}`,
      journalNo: typeof seq === 'number' ? Number(seq) : Date.now(),
      date: modalHeader.date || new Date().toISOString().slice(0, 10),
      description: modalHeader.memo || 'قيد مالي',
      source: 'manual',
      status: 'POSTED',
      createdAt: new Date().toISOString(),
      createdBy: 'system',
      lines: journalLines,
      totalDebit: totals.debit,
      totalCredit: totals.credit,
      isBalanced: totals.balanced
    };

    addEntry(journal);

    setDraftEntries((prev) => prev.filter((e) => e.id !== selectedDraft?.id));
    setShowModal(false);
    setSelectedId(journal.id);
  };

  const handleDeleteDraft = () => {
    if (isClosed) return;
    if (!selectedDraft) return;
    const confirmed = window.confirm('هل أنت متأكد من حذف القيد (مسودة)؟');
    if (!confirmed) return;
    setDraftEntries((prev) => prev.filter((e) => e.id !== selectedDraft.id));
    setSelectedId(null);
  };

  const handleExport = () => {
    if (!filtered.length) return;
    const header = ['code', 'date', 'description', 'debit', 'credit', 'status'];
    const rows = filtered.map((entry) => [
      entry.code,
      entry.date,
      entry.description,
      entry.debit,
      entry.credit,
      entry.status === 'posted' ? 'POSTED' : 'DRAFT'
    ]);
    const csv = [header.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'financial-entries.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const addLine = () => {
    if (isClosed) return;
    setModalLines((prev) => [
      ...prev,
      { id: `l-${Date.now()}-${prev.length + 1}`, accountName: '', accountCode: '', memo: '', debit: 0, credit: 0 }
    ]);
  };

  const removeLine = (id: string) => {
    if (isClosed) return;
    setModalLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.id !== id)));
  };

  const handleAccountSelect = (lineId: string, value: string) => {
    if (isClosed) return;
    const account = findAccount(value);
    setModalLines((prev) =>
      prev.map((l) =>
        l.id === lineId
          ? account
            ? { ...l, accountName: account.name, accountCode: account.code, accountId: account.id }
            : { ...l, accountName: '', accountCode: '', accountId: undefined }
          : l
      )
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      {isClosed && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 flex items-center gap-2">
          🔒 هذا العام المالي مغلق – العرض للقراءة فقط
        </div>
      )}
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h1 className="text-2xl font-black text-slate-900">القيود المالية</h1>
        <p className="text-sm text-slate-500 font-bold mt-1">عرض القيود مع حالتها وترحيلها</p>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold shadow-sm hover:bg-indigo-700"
              onClick={resetModalForAdd}
              disabled={isClosed}
              title={isClosed ? lockTooltip : ''}
            >
              <Plus size={16} /> إضافة
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold disabled:opacity-50"
              disabled={!canEdit || isClosed}
              title={isClosed && canEdit ? lockTooltip : ''}
              onClick={() => {
                if (isClosed) return;
                if (!selectedDraft) return;
                setModalMode('edit');
                setModalHeader({ code: selectedDraft.code, date: selectedDraft.date, memo: selectedDraft.description });
                const editableLines =
                  selectedDraft.lines && selectedDraft.lines.length
                    ? selectedDraft.lines
                    : [{ id: 'l1', accountName: '', accountCode: '', memo: '', debit: 0, credit: 0 }];
                setModalLines(
                  editableLines.map((l, idx) => ({
                    ...l,
                    id: l.id || `l-${idx + 1}`
                  }))
                );
                setShowModal(true);
              }}
            >
              <Edit3 size={16} /> تعديل
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold disabled:opacity-50"
              disabled={!canDelete || isClosed}
              title={isClosed && canDelete ? lockTooltip : ''}
              onClick={handleDeleteDraft}
            >
              <Trash2 size={16} /> حذف
            </button>
          </div>

          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-black ${badge.color}`}>
            {badge.icon} <span>{badge.text}</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
              onClick={handleExport}
            >
              <Download size={16} /> تصدير
            </button>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Search size={16} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث"
                className="bg-transparent text-sm font-bold text-slate-700 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | EntryStatus)}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none"
              >
                <option value="all">كل الحالات</option>
                <option value="draft">مسودة</option>
                <option value="posted">مُرحّل</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 z-10">
              <tr>
                <th className="p-3 text-right">تحديد</th>
                <th className="p-3 text-right">كود القيد</th>
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">البيان</th>
                <th className="p-3 text-right">إجمالي مدين</th>
                <th className="p-3 text-right">إجمالي دائن</th>
                <th className="p-3 text-right">موزون؟</th>
                <th className="p-3 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((entry) => {
                const selectedRow = selectedId === entry.id;
                return (
                  <tr
                    key={entry.id}
                    className={`hover:bg-slate-50 ${selectedRow ? 'bg-indigo-50/60' : 'bg-white'}`}
                  >
                    <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedRow}
                    onChange={() => setSelectedId(selectedRow ? null : entry.id)}
                    className="h-4 w-4 text-indigo-600 border-slate-300 rounded"
                    disabled={isClosed}
                    title={isClosed ? lockTooltip : ''}
                  />
                </td>
                <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{entry.code}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">
                      {entry.date ? new Date(entry.date).toLocaleDateString('ar-EG') : '-'}
                    </td>
                    <td className="p-3 text-slate-700">{entry.description}</td>
                    <td className="p-3 text-emerald-700 font-bold">{entry.debit.toLocaleString('ar-EG')}</td>
                    <td className="p-3 text-emerald-700 font-bold">{entry.credit.toLocaleString('ar-EG')}</td>
                    <td className="p-3">
                      {entry.balanced ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700">
                          موزون
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-50 text-rose-700">
                          غير موزون
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black ${
                          entry.status === 'posted'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {entry.status === 'posted' ? 'مُرحّل' : 'مسودة'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400 font-bold">
                    لا توجد بيانات
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: إضافة/تعديل القيد */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Financial Entry</p>
                <h3 className="text-xl font-black text-slate-900">{modalMode === 'add' ? 'إضافة قيد' : 'تعديل قيد'}</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full bg-slate-100 text-slate-500 px-3 py-2 text-sm font-bold hover:bg-slate-200"
              >
                إغلاق
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-auto">
              {/* بيانات القيد */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500">رقم القيد</label>
                  <input
                    readOnly
                    value={modalHeader.code}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700"
                    placeholder="JV-XXXX"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-500">التاريخ</label>
                  <input
                    type="date"
                    value={modalHeader.date}
                    onChange={(e) => setModalHeader((prev) => ({ ...prev, date: e.target.value }))}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                    disabled={isClosed}
                  />
                </div>
                <div className="flex flex-col gap-1 md:col-span-1">
                  <label className="text-xs font-bold text-slate-500">البيان</label>
                  <input
                    value={modalHeader.memo}
                    onChange={(e) => setModalHeader((prev) => ({ ...prev, memo: e.target.value }))}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                    placeholder="أدخل بيان القيد"
                    disabled={isClosed}
                  />
                </div>
              </div>

              {/* جدول التفاصيل */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0">
                    <tr>
                      <th className="p-3 text-right">اسم الحساب</th>
                      <th className="p-3 text-right">رقم الحساب</th>
                      <th className="p-3 text-right">البيان</th>
                      <th className="p-3 text-right">مدين</th>
                      <th className="p-3 text-right">دائن</th>
                      <th className="p-3 text-right">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modalLines.map((line) => (
                      <tr key={line.id} className="bg-white hover:bg-slate-50">
                        <td className="p-2">
                          <input
                            list="accounts-list"
                            value={line.accountName}
                            onChange={(e) => handleAccountSelect(line.id, e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                            placeholder="اختر الحساب"
                            disabled={isClosed}
                          />
                          <datalist id="accounts-list">
                            {accounts.map((acc: any) => (
                              <option key={acc.id} value={acc.name} />
                            ))}
                          </datalist>
                        </td>
                        <td className="p-2">
                          <input
                            value={line.accountCode}
                            readOnly
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm"
                            placeholder="رقم الحساب"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            value={line.memo}
                            onChange={(e) =>
                              setModalLines((prev) =>
                                prev.map((l) => (l.id === line.id ? { ...l, memo: e.target.value } : l))
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                            placeholder="بيان السطر"
                            disabled={isClosed}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={line.debit}
                            onChange={(e) =>
                              setModalLines((prev) =>
                                prev.map((l) =>
                                  l.id === line.id
                                    ? { ...l, debit: parseAmount(e.target.value), credit: parseAmount(e.target.value) > 0 ? 0 : l.credit }
                                    : l
                                )
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-emerald-700 font-bold"
                            disabled={isClosed}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={line.credit}
                            onChange={(e) =>
                              setModalLines((prev) =>
                                prev.map((l) =>
                                  l.id === line.id
                                    ? { ...l, credit: parseAmount(e.target.value), debit: parseAmount(e.target.value) > 0 ? 0 : l.debit }
                                    : l
                                )
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-emerald-700 font-bold"
                            disabled={isClosed}
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => removeLine(line.id)}
                            className="text-rose-600 hover:text-rose-800"
                            disabled={isClosed}
                            title={isClosed ? lockTooltip : ''}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={addLine}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                    disabled={isClosed}
                    title={isClosed ? lockTooltip : ''}
                  >
                    <Plus size={16} /> إضافة سطر
                  </button>
                  <div className="flex items-center gap-3 text-sm font-bold">
                    <span className="text-slate-600">إجمالي المدين: <span className="text-emerald-700">{totals.debit.toLocaleString('ar-EG')}</span></span>
                    <span className="text-slate-600">إجمالي الدائن: <span className="text-emerald-700">{totals.credit.toLocaleString('ar-EG')}</span></span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-black ${totals.balanced ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {totals.balanced ? 'موزون' : 'غير موزون'}
                    </span>
                  </div>
                </div>
              </div>

              {/* أزرار الأسفل */}
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  إلغاء
                </button>
                <button
                  className="px-4 py-2 rounded-xl border border-indigo-200 text-indigo-700 font-bold bg-indigo-50"
                  onClick={handleSaveDraft}
                  disabled={isClosed}
                  title={isClosed ? lockTooltip : ''}
                >
                  حفظ
                </button>
                <button
                  disabled={!totals.balanced || totals.hasInvalid || isClosed}
                  onClick={handlePost}
                  className={`px-4 py-2 rounded-xl font-bold shadow-sm ${
                    !totals.balanced || totals.hasInvalid || isClosed
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 text-white'
                  }`}
                  title={isClosed ? lockTooltip : ''}
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

export default FinancialEntries;
