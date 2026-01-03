import React, { useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Download,
  Search,
  Save,
  X,
  Wallet
} from 'lucide-react';
import { useStore } from '../../store';
import { useInvoicing } from '../../hooks/useInvoicingLogic';
import { useTreasuryLogic } from '../../src/hooks/useTreasuryLogic';
import { useJournal } from '../../src/hooks/useJournal';
import { useAccounts } from '../../hooks/useAccountsLogic';
import { useStudentAccounts } from '../../hooks/useStudentAccounts';
import { useFeeConfiguration } from '../../hooks/useFeeConfiguration';
import { DiscountCategory, DiscountType } from '../../src/types/finance.types';
import { isFinancialYearClosed } from '../../src/utils/financialYearClose';

const Receipts: React.FC = () => {
  const store = useStore();
  const { invoices, updateInvoice, getStudentBalance } = useInvoicing();
  const { feeHeads } = useFeeConfiguration();
  const { treasuryAccounts } = useTreasuryLogic();
  const { addEntry } = useJournal();
  const { accounts, findByCode, accountMap } = useAccounts();

  useStudentAccounts(
    store.allStudents || store.students || [],
    store.workingYearId || store.activeYear?.Year_ID,
    store.classes,
    store.years
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [studentQuery, setStudentQuery] = useState('');
  const [studentId, setStudentId] = useState('');
  const [treasuryId, setTreasuryId] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentAmount, setPaymentAmount] = useState('');
  const [discountByHead, setDiscountByHead] = useState<Record<string, { type: 'percent' | 'amount'; value: number }>>({});
  const lockTooltip = '⚠️ تم إغلاق العام المالي، لا يمكن التعديل';

  const normalize = (value?: string | number) => (value || '').toString().trim().toLowerCase();
  const schoolCode = useMemo(
    () =>
      store.activeSchool?.School_Code ||
      store.activeSchool?.Code ||
      store.activeSchool?.ID ||
      store.activeSchool?.id ||
      undefined,
    [store.activeSchool]
  );
  const isClosed = useMemo(
    () => isFinancialYearClosed(schoolCode, store.workingYearId || store.activeYear?.Year_ID),
    [schoolCode, store.activeYear?.Year_ID, store.workingYearId]
  );

  const isEnrolled = (status?: string) => {
    const value = normalize(status);
    return (
      value === 'مقيد' ||
      value === 'مسجل' ||
      value === 'نشط' ||
      value === 'enrolled' ||
      value === 'active' ||
      value === 'registered' ||
      value === 'منتظم' ||
      !value
    );
  };

  const studentsSource = useMemo(
    () =>
      (Array.isArray(store.allStudents) && store.allStudents.length ? store.allStudents : (store.students || []))
        .filter((student: any) => String(student.Academic_Year_ID || student.Year_ID || '') === String(store.workingYearId || '')),
    [store.allStudents, store.students, store.workingYearId]
  );

  const getStudentDisplayName = (student: any) => {
    return (
      student?.Name_Ar ||
      student?.Name_En ||
      student?.Student_Name ||
      student?.Full_Name ||
      student?.name ||
      ''
    );
  };

  const getStudentIdentifier = (student: any) => {
    return (
      student?.Student_Global_ID ||
      student?.Student_ID ||
      student?.Enroll_ID ||
      student?.id ||
      ''
    );
  };

  const students = useMemo(() => {
    const enrolledList = studentsSource.filter((student: any) =>
      isEnrolled(student.Status || student.Student_Status || student.status)
    );
    const list = enrolledList.length ? enrolledList : studentsSource;
    if (!studentQuery.trim()) return list;
    const query = studentQuery.trim().toLowerCase();
    return list.filter((student: any) => {
      const name = getStudentDisplayName(student).toLowerCase();
      const id = String(getStudentIdentifier(student) || '').toLowerCase();
      return name.includes(query) || id.includes(query);
    });
  }, [studentsSource, studentQuery]);

  const gradeById = useMemo(() => new Map((store.grades || store.allGrades || []).map((g: any) => [g.Grade_ID, g])), [store.grades, store.allGrades]);
  const classById = useMemo(() => new Map((store.classes || []).map((c: any) => [c.Class_ID, c])), [store.classes]);
  const feeHeadMap = useMemo(() => new Map(feeHeads.map((head) => [head.id, head])), [feeHeads]);

  const receipts = useMemo(
    () => (store.receipts || []).filter((receipt: any) => receipt.Academic_Year_ID === store.workingYearId),
    [store.receipts, store.workingYearId]
  );

  const receiptGroups = useMemo(() => {
    const groups = new Map<string, any>();
    receipts.forEach((receipt: any) => {
      const id = receipt.Receipt_ID;
      if (!groups.has(id)) {
        groups.set(id, {
          id,
          studentId: receipt.Enroll_ID,
          date: receipt.Date,
          totalPaid: 0,
          feeHeads: [] as string[]
        });
      }
      const group = groups.get(id);
      group.totalPaid += Number(receipt.Amount_Paid || 0);
      if (!group.feeHeads.includes(receipt.Fee_ID)) group.feeHeads.push(receipt.Fee_ID);
    });

    const list = Array.from(groups.values());
    if (!searchTerm.trim()) return list;
    const query = searchTerm.trim().toLowerCase();
    return list.filter((item) => {
      const student = studentsSource.find(
        (s: any) => String(getStudentIdentifier(s)) === String(item.studentId)
      );
      const name = getStudentDisplayName(student || {}).toLowerCase();
      return item.id.toLowerCase().includes(query) || name.includes(query) || String(item.studentId || '').includes(query);
    });
  }, [receipts, searchTerm, studentsSource]);

  const resolveStudentAccount = (studentIdValue: string, academicYearId?: string) => {
    const yearKey = String(academicYearId || store.workingYearId || '').trim();
    const direct =
      (yearKey && accountMap.get(`ACC-STU-${yearKey}-${studentIdValue}`)) ||
      accountMap.get(`ACC-STU-${studentIdValue}`);
    if (direct) return direct;
    return (
      accounts.find(
        (account) => account.id.includes(studentIdValue) || (account.name || '').includes(studentIdValue)
      ) || null
    );
  };

  const selectedStudent = useMemo(
    () =>
      studentsSource.find((student: any) => String(getStudentIdentifier(student)) === String(studentId)) || null,
    [studentsSource, studentId]
  );

  const studentInvoices = useMemo(() => {
    if (!studentId) return [];
    return invoices.filter(
      (invoice) =>
        invoice.studentId === studentId &&
        invoice.academicYearId === store.workingYearId &&
        invoice.isPosted &&
        !invoice.isVoided
    );
  }, [invoices, studentId, store.workingYearId]);

  const studentPaidByHead = useMemo(() => {
    if (!studentId) return new Map<string, number>();
    const map = new Map<string, number>();
    receipts
      .filter((receipt: any) => receipt.Enroll_ID === studentId)
      .forEach((receipt: any) => {
        map.set(receipt.Fee_ID, (map.get(receipt.Fee_ID) || 0) + Number(receipt.Amount_Paid || 0));
      });
    return map;
  }, [receipts, studentId]);

  const itemRows = useMemo(() => {
    const rows = new Map<string, { feeHeadId: string; feeHeadName: string; total: number; paid: number; priority: number }>();
    studentInvoices.forEach((invoice) => {
      invoice.items.forEach((item) => {
        const head = feeHeadMap.get(item.feeHeadId);
        const existing = rows.get(item.feeHeadId);
        if (existing) {
          existing.total += Number(item.amount || 0);
        } else {
          rows.set(item.feeHeadId, {
            feeHeadId: item.feeHeadId,
            feeHeadName: head?.name || item.feeHeadId,
            total: Number(item.amount || 0),
            paid: 0,
            priority: head?.priority ?? 0
          });
        }
      });
    });

    rows.forEach((row) => {
      row.paid = studentPaidByHead.get(row.feeHeadId) || 0;
    });

    return Array.from(rows.values()).sort((a, b) => a.priority - b.priority);
  }, [feeHeadMap, studentInvoices, studentPaidByHead]);

  const computedItems = useMemo(() => {
    return itemRows.map((row) => {
      const remaining = Math.max(0, row.total - row.paid);
      const discountEntry = discountByHead[row.feeHeadId] || { type: 'amount', value: 0 };
      const base = remaining;
      let discountAmount = 0;
      if (discountEntry.type === 'percent') {
        discountAmount = Math.min(base, (base * Number(discountEntry.value || 0)) / 100);
      } else {
        discountAmount = Math.min(base, Number(discountEntry.value || 0));
      }
      const netDue = Math.max(0, base - discountAmount);
      return {
        ...row,
        remaining,
        discountType: discountEntry.type,
        discountValue: Number(discountEntry.value || 0),
        discountAmount: Number(discountAmount.toFixed(2)),
        netDue: Number(netDue.toFixed(2))
      };
    });
  }, [itemRows, discountByHead]);

  const totals = useMemo(() => {
    const totalDue = computedItems.reduce((sum, item) => sum + item.remaining, 0);
    const totalDiscount = computedItems.reduce((sum, item) => sum + item.discountAmount, 0);
    const netDue = computedItems.reduce((sum, item) => sum + item.netDue, 0);
    return {
      totalDue: Number(totalDue.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      netDue: Number(netDue.toFixed(2))
    };
  }, [computedItems]);

  const allocation = useMemo(() => {
    const amount = Number(paymentAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { byHead: new Map<string, number>(), totalPaid: 0, remaining: totals.netDue };
    }
    let remaining = amount;
    const byHead = new Map<string, number>();
    computedItems.forEach((item) => {
      if (remaining <= 0) return;
      const payable = Math.min(remaining, item.netDue);
      remaining -= payable;
      byHead.set(item.feeHeadId, Number(payable.toFixed(2)));
    });
    return {
      byHead,
      totalPaid: Number((amount - remaining).toFixed(2)),
      remaining: Number((totals.netDue - (amount - remaining)).toFixed(2))
    };
  }, [computedItems, paymentAmount, totals.netDue]);

  const paymentValue = Number(paymentAmount || 0);
  const creditAmount = Number(Math.max(0, paymentValue - totals.netDue).toFixed(2));
  const remainingAfterPayment = Number((totals.netDue - paymentValue).toFixed(2));

  const openCreate = () => {
    if (isClosed) return;
    setModalMode('create');
    setSelectedReceiptId('');
    setStudentQuery('');
    setStudentId('');
    setTreasuryId('');
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setDiscountByHead({});
    setModalOpen(true);
  };

  const openEdit = () => {
    if (isClosed) return;
    if (!selectedReceiptId) return;
    const group = receiptGroups.find((item) => item.id === selectedReceiptId);
    if (!group) return;
    const receiptLines = receipts.filter((receipt: any) => receipt.Receipt_ID === group.id);
    setModalMode('edit');
    setSelectedReceiptId(group.id);
    setStudentId(group.studentId);
    setStudentQuery('');
    setTreasuryId(receiptLines[0]?.Treasury_Acc_ID || '');
    setPaymentAmount(String(group.totalPaid.toFixed(2)));
    setPaymentDate(group.date);
    setDiscountByHead({});
    setModalOpen(true);
  };

  const handleDelete = () => {
    if (isClosed) return;
    if (!selectedReceiptId) return;
    if (!window.confirm('هل تريد حذف سند القبض المحدد؟')) return;
    store.deleteReceipt(selectedReceiptId);
    setSelectedReceiptId('');
  };

  const setDiscountValue = (feeHeadId: string, value: number) => {
    setDiscountByHead((prev) => ({
      ...prev,
      [feeHeadId]: {
        type: prev[feeHeadId]?.type || 'amount',
        value
      }
    }));
  };

  const setDiscountType = (feeHeadId: string, type: 'percent' | 'amount') => {
    setDiscountByHead((prev) => ({
      ...prev,
      [feeHeadId]: {
        type,
        value: prev[feeHeadId]?.value || 0
      }
    }));
  };

  const applyDiscountsToInvoices = () => {
    if (!studentInvoices.length) return;
    const remainingByHead = computedItems.reduce<Record<string, number>>((acc, item) => {
      if (item.discountAmount > 0) acc[item.feeHeadId] = item.discountAmount;
      return acc;
    }, {});

    studentInvoices.forEach((invoice) => {
      if (!Object.keys(remainingByHead).length) return;
      const updatedItems = invoice.items.map((item) => {
        const discountRemaining = remainingByHead[item.feeHeadId] || 0;
        if (!discountRemaining) return item;
        const apply = Math.min(Number(item.amount || 0), discountRemaining);
        remainingByHead[item.feeHeadId] = Number((discountRemaining - apply).toFixed(2));
        const appliedDiscounts = [
          ...(item.appliedDiscounts || []),
          {
            feeHeadId: item.feeHeadId,
            category: DiscountCategory.SPECIAL,
            type: DiscountType.FIXED_AMOUNT,
            value: apply,
            calculatedAmount: apply
          }
        ];
        return {
          ...item,
          amount: Number((Number(item.amount || 0) - apply).toFixed(2)),
          appliedDiscounts
        };
      });
      updateInvoice(invoice.id, { items: updatedItems });
    });
  };

  const handleSave = () => {
    if (isClosed) return;
    if (!studentId) {
      alert('يرجى اختيار الطالب أولاً.');
      return;
    }

    const treasury = treasuryAccounts.find((acc) => acc.id === treasuryId && acc.isActive);
    if (!treasury) {
      alert('يرجى اختيار خزينة أو بنك فعال.');
      return;
    }

    if (!computedItems.length) {
      alert('لا توجد بنود مستحقة لهذا الطالب.');
      return;
    }

    if (allocation.totalPaid <= 0 && totals.totalDiscount <= 0 && paymentValue <= 0) {
      alert('يرجى إدخال مبلغ تحصيل أو خصم صالح.');
      return;
    }

    if (modalMode === 'edit' && selectedReceiptId) {
      store.deleteReceipt(selectedReceiptId);
    }

    if (totals.totalDiscount > 0) {
      applyDiscountsToInvoices();
    }

    const receiptIdBase = selectedReceiptId || `REC-${Date.now()}`;
    const academicYearId = store.workingYearId;

    computedItems.forEach((item) => {
      const paidAmount = allocation.byHead.get(item.feeHeadId) || 0;
      if (paidAmount <= 0) return;
      store.addReceipt({
        Receipt_ID: receiptIdBase,
        Date: paymentDate,
        Enroll_ID: studentId,
        Fee_ID: item.feeHeadId,
        Amount_Paid: Number(paidAmount.toFixed(2)),
        Treasury_Acc_ID: treasury.glAccountId,
        Academic_Year_ID: academicYearId
      });
    });

    if (creditAmount > 0) {
      store.addReceipt({
        Receipt_ID: receiptIdBase,
        Date: paymentDate,
        Enroll_ID: studentId,
        Fee_ID: '__CREDIT__',
        Amount_Paid: Number(creditAmount.toFixed(2)),
        Treasury_Acc_ID: treasury.glAccountId,
        Academic_Year_ID: academicYearId
      });
    }

    if (modalMode === 'create' && paymentValue > 0) {
      const receivable = resolveStudentAccount(studentId, academicYearId) || findByCode('1103');
      if (receivable) {
        addEntry({
          id: '',
          journalNo: 0,
          date: paymentDate,
          description: `سند قبض - ${studentId}`,
          source: 'receipts',
          sourceRefId: receiptIdBase,
          status: 'POSTED',
          createdAt: new Date().toISOString(),
          createdBy: store.currentUser?.Username || store.currentUser?.User_ID || 'system',
          lines: [
            {
              id: `${receiptIdBase}-DR`,
              accountId: treasury.glAccountId,
              debit: paymentValue,
              credit: 0,
              note: 'تحصيل نقدي'
            },
            {
              id: `${receiptIdBase}-CR`,
              accountId: receivable.id,
              debit: 0,
              credit: paymentValue,
              note: 'تسوية مديونية طالب'
            }
          ],
          totalDebit: 0,
          totalCredit: 0,
          isBalanced: false
        });
      }
    }

    setModalOpen(false);
    setSelectedReceiptId(receiptIdBase);
    setPaymentAmount('');
    setDiscountByHead({});
  };

  const exportCsv = () => {
    const rows = receiptGroups.map((group) => {
      const student = (store.students || []).find((item: any) => item.Student_Global_ID === group.studentId);
      const grade = student?.Grade_ID ? gradeById.get(student.Grade_ID)?.Grade_Name : '';
      const klass = student?.Class_ID ? classById.get(student.Class_ID)?.Class_Name : '';
      return [
        group.id,
        student?.Student_Global_ID || group.studentId,
        student?.Name_Ar || student?.Name_En || '',
        grade || '',
        klass || '',
        group.totalPaid.toFixed(2),
        group.date
      ];
    });

    const header = ['Receipt ID', 'Student ID', 'Student Name', 'Grade', 'Class', 'Paid Amount', 'Date'];
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 text-start">
      {isClosed && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 flex items-center gap-2">
          🔒 هذا العام المالي مغلق – العرض للقراءة فقط
        </div>
      )}
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl border border-slate-100 p-6 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-2xl font-black text-slate-900">سندات القبض</h3>
            <p className="text-sm text-slate-500 mt-1">تسجيل التحصيلات وربطها بالفواتير</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isClosed}
              title={isClosed ? lockTooltip : ''}
            >
              <Plus size={16} />
              إضافة
            </button>
            <button
              onClick={openEdit}
              disabled={!selectedReceiptId || isClosed}
              title={isClosed && selectedReceiptId ? lockTooltip : ''}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm disabled:opacity-40"
            >
              <Pencil size={16} />
              تعديل
            </button>
            <button
              onClick={handleDelete}
              disabled={!selectedReceiptId || isClosed}
              title={isClosed && selectedReceiptId ? lockTooltip : ''}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2 text-xs font-black text-rose-600 shadow-sm disabled:opacity-40"
            >
              <Trash2 size={16} />
              حذف
            </button>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm hover:border-slate-300"
            >
              <Download size={16} />
              تصدير
            </button>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
            <Search size={16} className="text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="بحث..."
              className="w-44 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-lg overflow-hidden">
        <div className="max-h-[520px] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-900 text-white text-[12px] uppercase">
              <tr>
                <th className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => undefined}
                    className="h-4 w-4 accent-slate-700"
                  />
                </th>
                <th className="px-4 py-3 text-center">رقم السند</th>
                <th className="px-4 py-3 text-start">الطالب</th>
                <th className="px-4 py-3 text-center">الصف / الفصل</th>
                <th className="px-4 py-3 text-center">قيمة التحصيل</th>
                <th className="px-4 py-3 text-center">التاريخ</th>
                <th className="px-4 py-3 text-center">الخصم</th>
                <th className="px-4 py-3 text-center">المتبقي</th>
              </tr>
            </thead>
            <tbody>
              {receiptGroups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                    لا توجد سندات قبض مسجلة
                  </td>
                </tr>
              ) : (
                receiptGroups.map((group, index) => {
                  const student = studentsSource.find(
                    (item: any) => String(getStudentIdentifier(item)) === String(group.studentId)
                  );
                  const gradeName = student?.Grade_ID ? gradeById.get(student.Grade_ID)?.Grade_Name : '';
                  const className = student?.Class_ID ? classById.get(student.Class_ID)?.Class_Name : '';
                  const yearInvoices = invoices.filter(
                    (invoice) =>
                      invoice.studentId === String(group.studentId) &&
                      invoice.academicYearId === store.workingYearId &&
                      invoice.isPosted &&
                      !invoice.isVoided
                  );
                  const totalDue = yearInvoices.reduce(
                    (sum, invoice) => sum + invoice.items.reduce((iSum, item) => iSum + Number(item.amount || 0), 0),
                    0
                  );
                  const totalDiscount = yearInvoices.reduce((sum, invoice) => {
                    const itemDiscounts = invoice.items.reduce((iSum, item) => {
                      const applied = item.appliedDiscounts || [];
                      if (!Array.isArray(applied)) return iSum;
                      return iSum + applied.reduce((aSum: number, entry: any) => {
                        if (typeof entry === 'string') return aSum;
                        return aSum + Number(entry.calculatedAmount ?? entry.value ?? 0);
                      }, 0);
                    }, 0);
                    return sum + itemDiscounts;
                  }, 0);
                  const totalPaid = receipts
                    .filter((receipt: any) => receipt.Enroll_ID === group.studentId)
                    .reduce((sum: number, receipt: any) => sum + Number(receipt.Amount_Paid || 0), 0);
                  const remaining = Number((totalDue - totalPaid).toFixed(2));
                  return (
                    <tr key={group.id} className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedReceiptId === group.id}
                          onChange={() => setSelectedReceiptId(group.id)}
                          className="h-4 w-4 accent-slate-700"
                          disabled={isClosed}
                          title={isClosed ? lockTooltip : ''}
                        />
                      </td>
                      <td className="px-4 py-3 text-center font-mono">{group.id}</td>
                      <td className="px-4 py-3 text-start font-semibold">
                        {getStudentDisplayName(student || {}) || group.studentId}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">
                        {gradeName || '—'} {className ? `/ ${className}` : ''}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">{group.totalPaid.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center font-mono">{group.date}</td>
                      <td className="px-4 py-3 text-center font-mono">{Number(totalDiscount || 0).toFixed(2)}</td>
                      <td className={`px-4 py-3 text-center font-mono ${remaining < 0 ? 'text-emerald-600' : ''}`}>
                        {remaining < 0 ? `له رصيد ${Math.abs(remaining).toFixed(2)}` : remaining.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-6">
          <div className="w-full max-w-6xl overflow-hidden rounded-[2.5rem] bg-white shadow-[0_30px_80px_rgba(15,23,42,0.25)]">
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3 text-white">
                  <Wallet size={20} />
                </div>
                <div>
                  <h4 className="text-xl font-black">إضافة سند قبض</h4>
                  <p className="text-xs text-slate-200/90">توزيع المبلغ تلقائيًا على البنود</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-full border border-white/20 p-2 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid gap-4 lg:grid-cols-4">
                <div className="relative rounded-2xl border border-slate-100 bg-slate-50/60 p-4 shadow-sm">
                  <label className="text-xs font-bold text-slate-500">اسم الطالب</label>
                  <input
                    value={studentQuery || (selectedStudent?.Name_Ar || selectedStudent?.Name_En || '')}
                    onChange={(event) => {
                      setStudentQuery(event.target.value);
                      setStudentId('');
                    }}
                    placeholder="ابحث عن الطالب..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    disabled={isClosed}
                  />
                  {studentQuery && !selectedStudent && (
                    <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg max-h-56 overflow-auto">
                      {students.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-400">لا توجد نتائج</div>
                      ) : (
                        students.map((student: any) => (
                          <button
                            key={getStudentIdentifier(student) || student.Student_Global_ID}
                            onClick={() => {
                              setStudentId(String(getStudentIdentifier(student) || ''));
                              setStudentQuery('');
                            }}
                            className="w-full text-start px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <span className="font-semibold text-slate-700">{getStudentDisplayName(student)}</span>
                            <span className="text-xs text-slate-400"> — {getStudentIdentifier(student)}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 shadow-sm">
                  <label className="text-xs font-bold text-slate-500">طريقة الاستلام</label>
                  <select
                    value={treasuryId}
                    onChange={(event) => setTreasuryId(event.target.value)}
                    disabled={isClosed}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">اختر خزينة / بنك</option>
                    {treasuryAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} {account.isActive ? '' : '(معطل)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 shadow-sm">
                  <label className="text-xs font-bold text-slate-500">تاريخ التحصيل</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(event) => setPaymentDate(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    disabled={isClosed}
                  />
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 shadow-sm">
                  <label className="text-xs font-bold text-slate-500">المبلغ المحصل</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                    placeholder="0.00"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    disabled={isClosed}
                  />
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-xs font-semibold text-slate-600 shadow-sm md:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  إجمالي المستحق: <span className="font-mono text-slate-900">{totals.totalDue.toFixed(2)}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  إجمالي الخصم: <span className="font-mono text-slate-900">{totals.totalDiscount.toFixed(2)}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  صافي المستحق: <span className="font-mono text-slate-900">{totals.netDue.toFixed(2)}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  إجمالي المحصل: <span className="font-mono text-slate-900">{paymentValue.toFixed(2)}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  المتبقي: <span className="font-mono text-slate-900">{Math.max(0, remainingAfterPayment).toFixed(2)}</span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  الرصيد الدائن: <span className="font-mono text-emerald-600">{creditAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="overflow-auto rounded-2xl border border-slate-100 shadow-sm">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-900 text-white text-[11px] uppercase sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-start">البند</th>
                      <th className="px-3 py-2 text-center">قيمة البند</th>
                      <th className="px-3 py-2 text-center">المستلم سابقًا</th>
                      <th className="px-3 py-2 text-center">المتبقي</th>
                      <th className="px-3 py-2 text-center">نوع الخصم</th>
                      <th className="px-3 py-2 text-center">قيمة الخصم</th>
                      <th className="px-3 py-2 text-center">إجمالي الخصم</th>
                      <th className="px-3 py-2 text-center">الصافي</th>
                      <th className="px-3 py-2 text-center">المستلم الآن</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computedItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                          لا توجد بنود مستحقة لهذا الطالب
                        </td>
                      </tr>
                    ) : (
                      computedItems.map((item) => {
                        const allocated = allocation.byHead.get(item.feeHeadId) || 0;
                        return (
                          <tr key={item.feeHeadId} className="border-b border-slate-100 hover:bg-slate-50/70">
                            <td className="px-3 py-2 text-start font-semibold">{item.feeHeadName}</td>
                            <td className="px-3 py-2 text-center font-mono">{item.total.toFixed(2)}</td>
                            <td className="px-3 py-2 text-center font-mono">{item.paid.toFixed(2)}</td>
                            <td className="px-3 py-2 text-center font-mono">{item.remaining.toFixed(2)}</td>
                            <td className="px-3 py-2 text-center">
                              <select
                                value={item.discountType}
                                onChange={(event) =>
                                  setDiscountType(item.feeHeadId, event.target.value === 'percent' ? 'percent' : 'amount')
                                }
                                className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-semibold shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                              >
                                <option value="amount">مبلغ</option>
                                <option value="percent">نسبة</option>
                              </select>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                value={item.discountValue}
                                onChange={(event) => setDiscountValue(item.feeHeadId, Number(event.target.value || 0))}
                                className="w-20 rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-center shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                              />
                            </td>
                            <td className="px-3 py-2 text-center font-mono">{item.discountAmount.toFixed(2)}</td>
                            <td className="px-3 py-2 text-center font-mono">{item.netDue.toFixed(2)}</td>
                            <td className="px-3 py-2 text-center font-mono">{Number(allocated || 0).toFixed(2)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 p-6">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm hover:border-slate-300"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isClosed}
                title={isClosed ? lockTooltip : ''}
              >
                <Save size={16} />
                حفظ السند
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Receipts;
