import React, { useCallback, useMemo, useState } from 'react';
import { CheckCircle, Trash2, X, Plus, XCircle, ChevronLeft } from 'lucide-react';
import { useJournal } from '../../src/hooks/useJournal';
import { useAccounts } from '../../hooks/useAccountsLogic';
import { JournalEntry, JournalLine, JournalSource, JournalStatus } from '../../src/types/journal.types';
import { isFinancialYearClosed } from '../../src/utils/financialYearClose';

interface DailyJournalProps {
  store: any;
  onBack: () => void;
}

const buildLineId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `LINE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clampNonNegative = (value: number) => (value > 0 ? value : 0);

const statusBadge: Record<JournalStatus, string> = {
  DRAFT: 'bg-slate-50 text-slate-500 border-slate-200',
  POSTED: 'bg-amber-50 text-amber-600 border-amber-100',
  APPROVED: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  REJECTED: 'bg-rose-50 text-rose-600 border-rose-100'
};

const DailyJournal: React.FC<DailyJournalProps> = ({ store, onBack }) => {
  const { lang } = store;
  const isRtl = lang === 'ar';
  const { entries, addEntry, updateEntry, deleteEntry, approveEntry, rejectEntry } = useJournal();
  const { accounts } = useAccounts();
  const lockTooltip = '⚠️ تم إغلاق العام المالي، لا يمكن التعديل';

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
    source: 'all',
    search: ''
  });

  const nextJournalNo = useMemo(() => {
    const maxNo = entries.reduce((max, entry) => Math.max(max, entry.journalNo || 0), 0);
    return maxNo + 1;
  }, [entries]);

  const schoolCode =
    store.activeSchool?.School_Code ||
    store.activeSchool?.Code ||
    store.activeSchool?.ID ||
    store.activeSchool?.id ||
    undefined;
  const yearId = store.workingYearId || store.activeYear?.Year_ID || store.activeYear?.AcademicYear_ID || undefined;
  const isClosed = useMemo(() => isFinancialYearClosed(schoolCode, yearId), [schoolCode, yearId]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const activeYearId = store.workingYearId || store.activeYear?.Year_ID || '';
      const directYear = (entry as any).Academic_Year_ID || (entry as any).academicYearId || '';
      let matchesYear = true;
      if (activeYearId) {
        if (directYear) {
          matchesYear = directYear === activeYearId;
        } else if (entry.sourceRefId?.startsWith('BATCH-')) {
          matchesYear = entry.sourceRefId.startsWith(`BATCH-${activeYearId}-`);
        } else {
          matchesYear = false;
        }
      }
      if (!matchesYear) return false;
      if (filters.status !== 'all' && entry.status !== filters.status) return false;
      if (filters.source !== 'all' && entry.source !== filters.source) return false;
      if (filters.startDate && entry.date < filters.startDate) return false;
      if (filters.endDate && entry.date > filters.endDate) return false;
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matches =
          entry.description.toLowerCase().includes(query) ||
          String(entry.journalNo).includes(query);
        if (!matches) return false;
      }
      return true;
    });
  }, [entries, filters, store.activeYear?.Year_ID, store.workingYearId]);

  const selectedEntry = useMemo(() => {
    return entries.find((entry) => entry.id === selectedId) || null;
  }, [entries, selectedId]);

  const openEntry = useCallback((entryId: string) => {
    setActiveEntryId(entryId);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setActiveEntryId(null);
    setIsModalOpen(false);
  }, []);

  const handleAddManual = useCallback(() => {
    if (isClosed) return;
    const now = new Date().toISOString();
    const entry: JournalEntry = {
      id: '',
      journalNo: nextJournalNo,
      date: new Date().toISOString().slice(0, 10),
      description: '',
      source: 'manual',
      status: 'DRAFT',
      createdAt: now,
      createdBy: store.currentUser?.Username || store.currentUser?.User_ID || 'system',
      lines: [],
      totalDebit: 0,
      totalCredit: 0,
      isBalanced: false
    };
    (entry as any).Academic_Year_ID = store.workingYearId || store.activeYear?.Year_ID || '';
    const created = addEntry(entry);
    setActiveEntryId(created.id);
    setIsModalOpen(true);
  }, [addEntry, nextJournalNo, store.currentUser?.User_ID, store.currentUser?.Username, isClosed]);

  const handleApprove = useCallback(() => {
    if (isClosed) return;
    if (!selectedEntry) return;
    approveEntry(selectedEntry.id, store.currentUser?.Username || store.currentUser?.User_ID || 'system');
  }, [approveEntry, selectedEntry, store.currentUser?.User_ID, store.currentUser?.Username, isClosed]);

  const handleReject = useCallback(() => {
    if (isClosed) return;
    if (!selectedEntry) return;
    const reason = window.prompt(isRtl ? 'سبب الرفض' : 'Rejection reason') || '';
    rejectEntry(selectedEntry.id, reason);
  }, [isClosed, isRtl, rejectEntry, selectedEntry]);

  const handleDelete = useCallback(() => {
    if (isClosed) return;
    if (!selectedEntry) return;
    try {
      deleteEntry(selectedEntry.id);
      setSelectedId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : (isRtl ? 'لا يمكن حذف القيد' : 'Cannot delete entry');
      alert(message);
    }
  }, [deleteEntry, isClosed, isRtl, selectedEntry]);

  const activeEntry = useMemo(() => {
    return entries.find((entry) => entry.id === activeEntryId) || null;
  }, [activeEntryId, entries]);

  const updateEntryField = useCallback((patch: Partial<JournalEntry>) => {
    if (isClosed) return;
    if (!activeEntry) return;
    updateEntry(activeEntry.id, patch);
  }, [activeEntry, isClosed, updateEntry]);

  const updateLine = useCallback((lineId: string, patch: Partial<JournalLine>) => {
    if (isClosed) return;
    if (!activeEntry) return;
    const updatedLines = activeEntry.lines.map((line) => (line.id === lineId ? { ...line, ...patch } : line));
    updateEntry(activeEntry.id, { lines: updatedLines });
  }, [activeEntry, isClosed, updateEntry]);

  const addLine = useCallback(() => {
    if (isClosed) return;
    if (!activeEntry) return;
    const nextLine: JournalLine = {
      id: buildLineId(),
      accountId: accounts[0]?.id || '',
      debit: 0,
      credit: 0
    };
    updateEntry(activeEntry.id, { lines: [...activeEntry.lines, nextLine] });
  }, [accounts, activeEntry, isClosed, updateEntry]);

  const removeLine = useCallback((lineId: string) => {
    if (isClosed) return;
    if (!activeEntry) return;
    updateEntry(activeEntry.id, { lines: activeEntry.lines.filter((line) => line.id !== lineId) });
  }, [activeEntry, isClosed, updateEntry]);

  const userRole = store.currentUser?.Role || store.currentUser?.role || '';
  const canApprove = ['Admin', 'Accountant', 'Accounting Manager'].includes(userRole);
  const isPostedSelected = selectedEntry?.status === 'POSTED';
  const isSelectedBalanced = Boolean(selectedEntry?.isBalanced);
  const canEditEntry = !isClosed && activeEntry?.source === 'manual' && activeEntry?.status === 'DRAFT';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-start">
      {isClosed && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 flex items-center gap-2">
          🔒 هذا العام المالي مغلق – العرض للقراءة فقط
        </div>
      )}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all">
            <ChevronLeft size={20} className={isRtl ? 'rotate-180' : ''} />
          </button>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{isRtl ? 'اليومية العامة' : 'Daily Journal'}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{isRtl ? 'قيود اليومية' : 'Journal Entries'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAddManual}
            disabled={isClosed}
            title={isClosed ? lockTooltip : undefined}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            {isRtl ? 'إضافة قيد يدوي' : 'Add Manual Entry'}
          </button>
          <button
            onClick={handleApprove}
            disabled={!selectedEntry || !isPostedSelected || !isSelectedBalanced || !canApprove || isClosed}
            title={isClosed ? lockTooltip : undefined}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs ${
              selectedEntry && isPostedSelected && isSelectedBalanced && canApprove && !isClosed
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle size={16} />
            {isRtl ? 'اعتماد' : 'Approve'}
          </button>
          <button
            onClick={handleReject}
            disabled={!selectedEntry || !isPostedSelected || !canApprove || isClosed}
            title={isClosed ? lockTooltip : undefined}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs ${
              selectedEntry && isPostedSelected && canApprove && !isClosed
                ? 'bg-rose-600 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <XCircle size={16} />
            {isRtl ? 'رفض' : 'Reject'}
          </button>
          <button
            onClick={handleDelete}
            disabled
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs bg-slate-200 text-slate-400 cursor-not-allowed"
          >
            <Trash2 size={16} />
            {isRtl ? 'حذف' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-white p-4 rounded-3xl border border-slate-100">
        <input
          type="date"
          value={filters.startDate}
          onChange={(event) => {
            const value = event.target.value;
            setFilters((prev) => ({ ...prev, startDate: value }));
          }}
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(event) => {
            const value = event.target.value;
            setFilters((prev) => ({ ...prev, endDate: value }));
          }}
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold"
        />
        <select
          value={filters.status}
          onChange={(event) => {
            const value = event.target.value;
            setFilters((prev) => ({ ...prev, status: value }));
          }}
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold"
        >
          <option value="all">{isRtl ? 'كل الحالات' : 'All Statuses'}</option>
          <option value="DRAFT">{isRtl ? 'مسودة' : 'Draft'}</option>
          <option value="POSTED">{isRtl ? 'مرحّل' : 'Posted'}</option>
          <option value="APPROVED">{isRtl ? 'معتمد' : 'Approved'}</option>
          <option value="REJECTED">{isRtl ? 'مرفوض' : 'Rejected'}</option>
        </select>
        <div className="flex gap-2">
          <select
            value={filters.source}
            onChange={(event) => {
              const value = event.target.value;
              setFilters((prev) => ({ ...prev, source: value }));
            }}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold"
          >
            <option value="all">{isRtl ? 'كل المصادر' : 'All Sources'}</option>
            <option value="manual">{isRtl ? 'يدوي' : 'Manual'}</option>
            <option value="payroll">{isRtl ? 'رواتب' : 'Payroll'}</option>
            <option value="receipts">{isRtl ? 'قبض' : 'Receipts'}</option>
            <option value="payments">{isRtl ? 'صرف' : 'Payments'}</option>
          </select>
          <input
            type="text"
            value={filters.search}
            onChange={(event) => {
              const value = event.target.value;
              setFilters((prev) => ({ ...prev, search: value }));
            }}
            placeholder={isRtl ? 'بحث...' : 'Search...'}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold"
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest"></th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">#</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'التاريخ' : 'Date'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الوصف' : 'Description'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'المصدر' : 'Source'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'مدين' : 'Debit'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'دائن' : 'Credit'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الاتزان' : 'Balanced'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الحالة' : 'Status'}</th>
                <th className="px-4 py-4 font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'تفاصيل' : 'Open'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedId === entry.id}
                      onChange={(event) => setSelectedId(event.currentTarget.checked ? entry.id : null)}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-700">{entry.journalNo}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.date}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.description}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.source}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.totalDebit.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.totalCredit.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 text-[10px] font-black rounded-lg border ${entry.isBalanced ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                      {entry.isBalanced ? (isRtl ? 'متوازن' : 'Balanced') : (isRtl ? 'غير متوازن' : 'Unbalanced')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 text-[10px] font-black rounded-lg border ${statusBadge[entry.status]}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEntry(entry.id)} className="text-xs font-black text-indigo-600">
                      {isRtl ? 'عرض' : 'Open'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && activeEntry && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-xl font-black text-slate-900">{isRtl ? 'تفاصيل القيد' : 'Journal Entry'}</h4>
                <p className="text-xs text-slate-400 font-bold">#{activeEntry.journalNo}</p>
              </div>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="space-y-2 text-xs font-bold text-slate-500">
                  {isRtl ? 'التاريخ' : 'Date'}
                  <input
                    type="date"
                    value={activeEntry.date}
                    onChange={(event) => updateEntryField({ date: event.currentTarget.value })}
                    disabled={!canEditEntry}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2"
                  />
                </label>
                <label className="space-y-2 text-xs font-bold text-slate-500">
                  {isRtl ? 'الوصف' : 'Description'}
                  <input
                    type="text"
                    value={activeEntry.description}
                    onChange={(event) => updateEntryField({ description: event.currentTarget.value })}
                    disabled={!canEditEntry}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2"
                  />
                </label>
                <label className="space-y-2 text-xs font-bold text-slate-500">
                  {isRtl ? 'المصدر' : 'Source'}
                  <select
                    value={activeEntry.source}
                    onChange={(event) => updateEntryField({ source: event.currentTarget.value as JournalSource })}
                    disabled={!canEditEntry}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2"
                  >
                    <option value="manual">{isRtl ? 'يدوي' : 'Manual'}</option>
                    <option value="payroll">{isRtl ? 'رواتب' : 'Payroll'}</option>
                    <option value="receipts">{isRtl ? 'قبض' : 'Receipts'}</option>
                    <option value="payments">{isRtl ? 'صرف' : 'Payments'}</option>
                  </select>
                </label>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-black text-slate-700">{isRtl ? 'بنود القيد' : 'Lines'}</h5>
                  {canEditEntry && (
                    <button onClick={addLine} className="text-xs font-black text-indigo-600">{isRtl ? 'إضافة بند' : 'Add Line'}</button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400">
                        <th className="py-2">{isRtl ? 'الحساب' : 'Account'}</th>
                        <th className="py-2">{isRtl ? 'مدين' : 'Debit'}</th>
                        <th className="py-2">{isRtl ? 'دائن' : 'Credit'}</th>
                        <th className="py-2">{isRtl ? 'ملاحظة' : 'Note'}</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeEntry.lines.map((line) => (
                        <tr key={line.id} className="border-t border-slate-100">
                          <td className="py-2">
                            <select
                              value={line.accountId}
                              onChange={(event) => updateLine(line.id, { accountId: event.currentTarget.value })}
                              disabled={!canEditEntry}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                            >
                              {accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                  {account.code} - {account.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2">
                            <input
                              type="number"
                              min={0}
                              value={line.debit}
                              onChange={(event) => updateLine(line.id, { debit: clampNonNegative(toNumber(event.currentTarget.value)) })}
                              disabled={!canEditEntry}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs w-24"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="number"
                              min={0}
                              value={line.credit}
                              onChange={(event) => updateLine(line.id, { credit: clampNonNegative(toNumber(event.currentTarget.value)) })}
                              disabled={!canEditEntry}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs w-24"
                            />
                          </td>
                          <td className="py-2">
                            <input
                              type="text"
                              value={line.note || ''}
                              onChange={(event) => updateLine(line.id, { note: event.currentTarget.value })}
                              disabled={!canEditEntry}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs w-full"
                            />
                          </td>
                          <td className="py-2">
                            {canEditEntry && (
                              <button onClick={() => removeLine(line.id)} className="text-xs text-rose-500">{isRtl ? 'حذف' : 'Remove'}</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-6 text-xs font-bold text-slate-600 mt-4">
                  <span>{isRtl ? 'إجمالي المدين' : 'Total Debit'}: {activeEntry.totalDebit.toFixed(2)}</span>
                  <span>{isRtl ? 'إجمالي الدائن' : 'Total Credit'}: {activeEntry.totalCredit.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyJournal;
