import React, { useMemo, useState } from 'react';
import { useAcademicYear } from '../../contexts/AcademicYearContext';
import { useStore } from '../../store';
import { useStudents } from '../../hooks/useStudents';
import { useFeeConfiguration } from '../../hooks/useFeeConfiguration';
import { useInvoicing } from '../../hooks/useInvoicingLogic';
import { FeeHeadType } from '../../src/types/finance.types';
import { Trash2, XCircle, Pencil } from 'lucide-react';

type OptionalHeadConfig = {
  id: string;
  name: string;
  amount: number;
  revenueAccountId: string;
};

type StagingRow = {
  studentId: string;
  studentName: string;
  studentCode: string;
  classId: string;
  mandatoryTotal: number;
  optionalSelections: Record<string, boolean>;
  optionalTotal: number;
  adjustment: number;
  totalDue: number;
  status: 'pending' | 'invoiced';
};

type InvoicePreviewItem = {
  feeHeadId: string;
  amount: number;
  revenueAccountId: string;
};

type VoidModalState = {
  open: boolean;
  invoiceId?: string;
  reason: string;
};

type EditInvoiceModalState = {
  open: boolean;
  invoiceId?: string;
  studentName?: string;
  serial?: number;
  items: InvoiceItem[];
};

type ReissueModalState = {
  open: boolean;
  percent: number;
  reason: string;
};

const StudentInvoicing: React.FC = () => {
  const store = useStore();
  const { selectedYearId } = useAcademicYear();
  const students = useStudents();
  const { feeHeads, gradeFeeStructures, initializeYearFees } = useFeeConfiguration();
  const { invoices, previewBatchInvoicing, generateAndPostInvoices, voidInvoice, updateInvoice } = useInvoicing();

  const [stageId, setStageId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [classId, setClassId] = useState('');
  const [stagingData, setStagingData] = useState<StagingRow[]>([]);
  const [optionalHeads, setOptionalHeads] = useState<OptionalHeadConfig[]>([]);
  const [optionalSelectAll, setOptionalSelectAll] = useState<Record<string, boolean>>({});
  const [lastFilters, setLastFilters] = useState<{ stageId: string; gradeId: string; classId: string } | null>(null);
  const [posting, setPosting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [voidModal, setVoidModal] = useState<VoidModalState>({ open: false, reason: '' });
  const [editModal, setEditModal] = useState<EditInvoiceModalState>({ open: false, items: [] });
  const [reissueModal, setReissueModal] = useState<ReissueModalState>({ open: false, percent: 100, reason: '' });
  const [reissuing, setReissuing] = useState(false);

  const academicStages = useMemo(
    () => store.stages.filter((stage: any) => stage.Academic_Year_ID === selectedYearId),
    [store.stages, selectedYearId]
  );

  const gradeOptions = useMemo(
    () =>
      store.grades
        .filter((grade: any) => grade.Academic_Year_ID === selectedYearId && (!stageId || grade.Stage_ID === stageId))
        .sort((a: any, b: any) => a.Grade_Name.localeCompare(b.Grade_Name)),
    [store.grades, selectedYearId, stageId]
  );

  const classOptions = useMemo(
    () =>
      store.classes
        .filter((klass: any) => klass.Academic_Year_ID === selectedYearId && (!gradeId || klass.Grade_ID === gradeId))
        .sort((a: any, b: any) => a.Class_Name.localeCompare(b.Class_Name)),
    [store.classes, selectedYearId, gradeId]
  );

  const feeHeadMap = useMemo(() => new Map(feeHeads.map((head) => [head.id, head])), [feeHeads]);

  const loadStudents = () => {
    if (!gradeId) return;
    initializeYearFees(selectedYearId);
    const structure = gradeFeeStructures.find(
      (entry) => entry.gradeId === gradeId && entry.academicYearId === selectedYearId
    );
    if (!structure) {
      setStagingData([]);
      return;
    }

    const previewList = previewBatchInvoicing(gradeId);
    const previewSet = new Set(previewList.filter((item) => item.skipped).map((item) => item.studentId));

    const mandatoryHeads = structure.items.filter((item) => {
      const head = feeHeadMap.get(item.feeHeadId);
      return head?.type === FeeHeadType.MANDATORY;
    });
    const optionalHeadsConfig = structure.items
      .filter((item) => feeHeadMap.get(item.feeHeadId)?.type === FeeHeadType.OPTIONAL)
      .map((item) => {
        const head = feeHeadMap.get(item.feeHeadId);
        return {
          id: head?.id ?? item.feeHeadId,
          name: head?.name ?? 'Option',
          amount: Number(item.amount ?? 0),
          revenueAccountId: head?.linkedRevenueAccountId ?? ''
        };
      });

    setOptionalHeads(optionalHeadsConfig);
    setOptionalSelectAll(
      optionalHeadsConfig.reduce((acc, head) => ({ ...acc, [head.id]: false }), {} as Record<string, boolean>)
    );

    const gradeStudents = students
      .filter((student: any) => student.Grade_ID === gradeId && student.Academic_Year_ID === selectedYearId)
      .filter((student: any) => (!classId || student.Class_ID === classId) && (!stageId || student.Stage_ID === stageId));

    const mandatoryTotal = mandatoryHeads.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
    const initialRows: StagingRow[] = gradeStudents.map((student: any) => {
      const selections = optionalHeadsConfig.reduce(
        (acc, head) => ({ ...acc, [head.id]: false }),
        {} as Record<string, boolean>
      );
      return {
        studentId: student.Student_Global_ID,
        studentName: student.Name_Ar || student.Name_En || 'Student',
        studentCode: student.Student_Global_ID,
        classId: student.Class_ID,
        mandatoryTotal,
        optionalSelections: selections,
        optionalTotal: 0,
        adjustment: 0,
        totalDue: mandatoryTotal,
        status: previewSet.has(student.Student_Global_ID) ? 'invoiced' : 'pending'
      };
    });

    setStagingData(initialRows);
    setLastFilters({ stageId, gradeId, classId });
  };

  const calculateTotals = (
    row: StagingRow,
    selections: Record<string, boolean>,
    optionalList: OptionalHeadConfig[]
  ) => {
    const optionalTotal = optionalList.reduce(
      (sum, head) => (selections[head.id] ? sum + head.amount : sum),
      0
    );
    return { optionalTotal, totalDue: row.mandatoryTotal + optionalTotal + row.adjustment };
  };

  const updateRow = (
    studentId: string,
    updater: (row: StagingRow) => StagingRow
  ) => {
    setStagingData((prev) =>
      prev.map((row) => {
        if (row.studentId !== studentId) return row;
        const updated = updater(row);
        const totals = calculateTotals(updated, updated.optionalSelections, optionalHeads);
        return { ...updated, optionalTotal: totals.optionalTotal, totalDue: totals.totalDue };
      })
    );
  };

  const handleOptionalToggle = (studentId: string, headId: string, checked: boolean) => {
    updateRow(studentId, (row) => ({
      ...row,
      optionalSelections: { ...row.optionalSelections, [headId]: checked }
    }));
  };

  const handleSelectAllOptional = (headId: string, checked: boolean) => {
    setOptionalSelectAll((prev) => ({ ...prev, [headId]: checked }));
    setStagingData((prev) =>
      prev.map((row) => ({
        ...row,
        optionalSelections: { ...row.optionalSelections, [headId]: checked }
      }))
    );
  };

  const handleAdjustmentChange = (studentId: string, value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    updateRow(studentId, (row) => ({ ...row, adjustment: parsed }));
  };

  const pendingRows = stagingData.filter((row) => row.status === 'pending');
  const totalRevenue = stagingData.reduce((sum, row) => sum + row.totalDue, 0);
  const hasData = stagingData.length > 0;

  const buildInvoiceItems = (row: StagingRow) => {
    if (!optionalHeads.length) {
      return [];
    }
    const structure = gradeFeeStructures.find(
      (entry) => entry.gradeId === gradeId && entry.academicYearId === selectedYearId
    );
    if (!structure) {
      return [];
    }
    const result = structure.items
      .map((item) => {
        const head = feeHeadMap.get(item.feeHeadId);
        if (!head || !head.linkedRevenueAccountId) return null;
        if (head.type === FeeHeadType.OPTIONAL && !row.optionalSelections[head.id]) return null;
        return {
          feeHeadId: head.id,
          amount: Number(item.amount ?? 0),
          revenueAccountId: head.linkedRevenueAccountId
        };
      })
      .filter(Boolean) as InvoicePreviewItem[];

    const fallbackRevenueAccountId =
      result[0]?.revenueAccountId ||
      structure.items
        .map((item) => feeHeadMap.get(item.feeHeadId))
        .find((head) => Boolean(head?.linkedRevenueAccountId))?.linkedRevenueAccountId ||
      '';

    if (row.adjustment && fallbackRevenueAccountId) {
      result.push({
        feeHeadId: 'ADJ',
        amount: row.adjustment,
        revenueAccountId: fallbackRevenueAccountId
      });
    }

    return result;
  };

  const handlePostInvoices = () => {
    if (!gradeId || !stagingData.length) return;
    setPosting(true);
    const previewList = stagingData
      .filter((row) => row.status === 'pending')
      .map((row) => ({
        studentId: row.studentId,
        studentName: row.studentName,
        gradeId,
        gradeName: store.grades.find((grade: any) => grade.Grade_ID === gradeId)?.Grade_Name || '',
        items: buildInvoiceItems(row),
        totalAmount: row.totalDue,
        skipped: false
      }))
      .filter((row) => row.items.length && row.totalAmount > 0);

    generateAndPostInvoices(previewList);
    setPosting(false);
    setSuccess(true);
    if (lastFilters) {
      setTimeout(() => {
        loadStudents();
        setSuccess(false);
      }, 1000);
    }
  };

  const openVoidModal = (invoiceId: string) => {
    setVoidModal({ open: true, invoiceId, reason: '' });
  };

  const handleVoidConfirm = () => {
    if (!voidModal.invoiceId || !voidModal.reason.trim()) return;
    const response = voidInvoice(voidModal.invoiceId, voidModal.reason.trim());
    if (response?.warning) {
      alert(response.warning);
    }
    setVoidModal({ open: false, invoiceId: undefined, reason: '' });
  };

  const openEditModal = (invoice: any) => {
    setEditModal({
      open: true,
      invoiceId: invoice.id,
      studentName: invoice.studentName,
      serial: invoice.serial,
      items: (invoice.items || []).map((item: any) => ({ ...item }))
    });
  };

  const updateEditItem = (feeHeadId: string, value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    setEditModal((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.feeHeadId === feeHeadId ? { ...item, amount: parsed } : item
      )
    }));
  };

  const saveInvoiceEdits = () => {
    if (!editModal.invoiceId) return;
    const totalAmount = editModal.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    updateInvoice(editModal.invoiceId, { items: editModal.items, totalAmount });
    setEditModal({ open: false, items: [] });
  };

  const handleOpenReissue = () => {
    if (!gradeId || !stagingData.length) {
      alert('يجب تحميل الطلاب للصف قبل إعادة الإصدار.');
      return;
    }
    if (!classId) {
      alert('يجب اختيار الفصل لتطبيق إعادة الإصدار على فصل محدد.');
      return;
    }
    setReissueModal({ open: true, percent: 100, reason: '' });
  };

  const handleReissueConfirm = () => {
    if (!gradeId || !stagingData.length) return;
    if (!reissueModal.reason.trim()) return;
    const percent = Number(reissueModal.percent);
    if (Number.isNaN(percent) || percent <= 0 || percent > 100) return;

    setReissuing(true);
    const targetStudentIds = new Set(stagingData.map((row) => row.studentId));
    const previewList = previewBatchInvoicing(gradeId)
      .filter((preview) => targetStudentIds.has(preview.studentId))
      .map((preview) => {
        const items = preview.items.map((item) => ({
          ...item,
          amount: Number((item.amount * (percent / 100)).toFixed(2))
        }));
        const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
        return {
          ...preview,
          items,
          totalAmount,
          skipped: false,
          reason: undefined
        };
      })
      .filter((preview) => preview.items.length && preview.totalAmount > 0);

    invoices
      .filter(
        (invoice) =>
          invoice.academicYearId === selectedYearId &&
          invoice.gradeId === gradeId &&
          invoice.isPosted &&
          !invoice.isVoided &&
          targetStudentIds.has(invoice.studentId)
      )
      .forEach((invoice) => {
        voidInvoice(invoice.id, reissueModal.reason.trim());
      });

    generateAndPostInvoices(previewList);
    setReissueModal({ open: false, percent: 100, reason: '' });
    setReissuing(false);
    if (lastFilters) {
      setTimeout(() => {
        loadStudents();
      }, 200);
    }
  };

  const pendingCount = pendingRows.length;
  const postedInvoicesForGrade = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          invoice.academicYearId === selectedYearId &&
          invoice.gradeId === gradeId &&
          invoice.isPosted
      ),
    [invoices, gradeId, selectedYearId]
  );

  return (
    <div className="space-y-6 text-slate-800">
      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[11px] uppercase tracking-widest text-slate-500">Academic Year</label>
            <select
              disabled
              value={selectedYearId}
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600"
            >
              <option value={selectedYearId}>{store.activeYear?.Year_Name || '—'}</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-slate-500">Stage</label>
            <select
              value={stageId}
              onChange={(event) => setStageId(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
            >
              <option value="">All Stages</option>
              {academicStages.map((stage: any) => (
                <option key={stage.Stage_ID} value={stage.Stage_ID}>
                  {stage.Stage_Name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-slate-500">Grade</label>
            <select
              value={gradeId}
              onChange={(event) => setGradeId(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
            >
              <option value="">Select Grade</option>
              {gradeOptions.map((grade: any) => (
                <option key={grade.Grade_ID} value={grade.Grade_ID}>
                  {grade.Grade_Name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-slate-500">Class</label>
            <select
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
            >
              <option value="">All Classes</option>
              {classOptions.map((klass: any) => (
                <option key={klass.Class_ID} value={klass.Class_ID}>
                  {klass.Class_Name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end">
          <button
            onClick={loadStudents}
            className="rounded-2xl bg-indigo-600 px-5 py-2 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-indigo-500"
          >
            Load Students
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl overflow-x-auto">
        <table className="w-full text-sm text-slate-700 border-collapse">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 text-start">Student</th>
              <th className="px-3 py-3 text-center">Mandatory Fees</th>
              {optionalHeads.map((head) => (
                <th key={head.id} className="px-3 py-3 text-center">
                  <label className="flex items-center justify-center gap-1">
                    <input
                      type="checkbox"
                      checked={optionalSelectAll[head.id] || false}
                      onChange={(event) => handleSelectAllOptional(head.id, event.target.checked)}
                      className="h-3 w-3"
                    />
                    {head.name}
                  </label>
                </th>
              ))}
              <th className="px-3 py-3 text-center">Adjustment</th>
              <th className="px-4 py-3 text-center">Total Due</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {stagingData.length === 0 ? (
              <tr>
                <td colSpan={5 + optionalHeads.length} className="px-4 py-6 text-center text-slate-400">
                  Load students to begin.
                </td>
              </tr>
            ) : (
              stagingData.map((row) => (
                <tr key={row.studentId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-900">{row.studentName}</p>
                    <p className="text-[11px] text-slate-500">{row.studentCode}</p>
                  </td>
                  <td className="px-3 py-3 text-center text-slate-900 font-black">{row.mandatoryTotal.toFixed(2)}</td>
                  {optionalHeads.map((head) => (
                    <td key={head.id} className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.optionalSelections[head.id] || false}
                        onChange={(event) => handleOptionalToggle(row.studentId, head.id, event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-3 text-center">
                    <input
                      type="number"
                      value={row.adjustment}
                      onChange={(event) => handleAdjustmentChange(row.studentId, event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-2 py-1 text-xs text-slate-700"
                    />
                  </td>
                  <td className="px-4 py-3 text-center font-black text-slate-900">{row.totalDue.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black ${
                        row.status === 'invoiced' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {row.status === 'invoiced' ? 'Invoiced' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasData && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Selected Students</p>
            <p className="text-2xl font-black text-slate-900">{stagingData.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Total Expected Revenue</p>
            <p className="text-2xl font-black text-slate-900">{totalRevenue.toFixed(2)} EGP</p>
          </div>
          <button
            onClick={handlePostInvoices}
            disabled={!pendingCount || posting}
            className={`rounded-2xl px-6 py-3 text-sm font-black uppercase tracking-widest shadow-sm transition ${
              pendingCount && !posting
                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {posting ? 'Posting...' : 'Post Invoices'}
          </button>
        </div>
      )}

      {postedInvoicesForGrade.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900">Posted Invoices</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenReissue}
                className="rounded-2xl border border-indigo-200 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50"
              >
                Void & Reissue
              </button>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {postedInvoicesForGrade.length} invoices
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-700 border-collapse">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-start">Invoice #</th>
                  <th className="px-3 py-2 text-start">Student</th>
                  <th className="px-3 py-2 text-center">Total</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th className="px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {postedInvoicesForGrade.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className={`border-b border-slate-100 ${
                      invoice.isVoided ? 'bg-slate-100 line-through text-slate-500' : ''
                    }`}
                  >
                    <td className="px-3 py-3 text-start">{invoice.serial}</td>
                    <td className="px-3 py-3 text-start">
                      <p className="font-black text-slate-900">{invoice.studentName}</p>
                      <p className="text-[11px] text-slate-500">{invoice.dueDate.split('T')[0]}</p>
                    </td>
                    <td className="px-3 py-3 text-center font-black text-slate-900">{invoice.totalAmount.toFixed(2)} EGP</td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black ${
                          invoice.isVoided ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                        }`}
                      >
                        {invoice.isVoided ? 'VOIDED' : 'Posted'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {!invoice.isVoided && (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(invoice)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200 px-3 py-1 text-[11px] font-black text-indigo-600 hover:bg-indigo-50"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => openVoidModal(invoice.id)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-3 py-1 text-[11px] font-black text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 size={14} />
                            Void
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {postedInvoicesForGrade.length > 0 && voidModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">Void Invoice</h3>
              <button
                onClick={() => setVoidModal({ open: false, invoiceId: undefined, reason: '' })}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={20} />
              </button>
            </div>
            <textarea
              value={voidModal.reason}
              onChange={(event) => setVoidModal((prev) => ({ ...prev, reason: event.target.value }))}
              rows={4}
              placeholder="Reason for voiding..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setVoidModal({ open: false, invoiceId: undefined, reason: '' })}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleVoidConfirm}
                className="rounded-2xl bg-rose-600 px-4 py-2 text-xs font-black text-white"
              >
                Confirm Void
              </button>
            </div>
          </div>
        </div>
      )}

      {postedInvoicesForGrade.length > 0 && editModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Edit Invoice</h3>
                <p className="text-xs text-slate-500">
                  #{editModal.serial} • {editModal.studentName}
                </p>
              </div>
              <button
                onClick={() => setEditModal({ open: false, items: [] })}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-700 border-collapse">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-start">Fee Item</th>
                    <th className="px-3 py-2 text-center">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {editModal.items.map((item) => (
                    <tr key={item.feeHeadId} className="border-b border-slate-100">
                      <td className="px-3 py-3 text-start font-black text-slate-900">
                        {feeHeadMap.get(item.feeHeadId)?.name || item.feeHeadId}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(event) => updateEditItem(item.feeHeadId, event.target.value)}
                          className="w-32 rounded-2xl border border-slate-200 px-3 py-1 text-xs text-slate-700 text-center"
                        />
                      </td>
                    </tr>
                  ))}
                  {editModal.items.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-3 py-6 text-center text-slate-400">
                        No items available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setEditModal({ open: false, items: [] })}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={saveInvoiceEdits}
                className="rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-black text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {postedInvoicesForGrade.length > 0 && reissueModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">Void & Reissue</h3>
              <button
                onClick={() => setReissueModal({ open: false, percent: 100, reason: '' })}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Percentage</label>
              <input
                type="number"
                value={reissueModal.percent}
                onChange={(event) => setReissueModal((prev) => ({ ...prev, percent: Number(event.target.value) }))}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700"
                min={1}
                max={100}
              />
            </div>
            <textarea
              value={reissueModal.reason}
              onChange={(event) => setReissueModal((prev) => ({ ...prev, reason: event.target.value }))}
              rows={4}
              placeholder="Reason for reissue..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setReissueModal({ open: false, percent: 100, reason: '' })}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleReissueConfirm}
                disabled={reissuing || !reissueModal.reason.trim()}
                className={`rounded-2xl px-4 py-2 text-xs font-black text-white ${
                  reissuing ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600'
                }`}
              >
                {reissuing ? 'Reissuing...' : 'Confirm Reissue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="rounded-3xl bg-white p-6 shadow-2xl space-y-3 text-center">
            <p className="text-lg font-black text-slate-900">Invoices Posted</p>
            <p className="text-sm text-slate-500">الدفعات تم تجهيزها في السجلات المحاسبية.</p>
            <button
              onClick={() => setSuccess(false)}
              className="rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentInvoicing;
