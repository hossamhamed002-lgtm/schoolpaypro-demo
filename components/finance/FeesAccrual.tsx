import React, { useMemo, useState } from 'react';
import { Search, Printer, Wand2, RefreshCw, FileText, Grid2X2 } from 'lucide-react';
import { useAcademicYear } from '../../contexts/AcademicYearContext';
import { useStore } from '../../store';
import { useInvoicing } from '../../hooks/useInvoicingLogic';
import { useFeeConfiguration } from '../../hooks/useFeeConfiguration';
import { useJournal } from '../../src/hooks/useJournal';
import { useAccounts } from '../../hooks/useAccountsLogic';
import { useStudentAccounts } from '../../hooks/useStudentAccounts';
import { StudentStatus } from '../../types';
import { isFinancialYearClosed } from '../../src/utils/financialYearClose';

const FeesAccrual: React.FC = () => {
  const store = useStore();
  const { selectedYearId } = useAcademicYear();
  const { invoices, previewBatchInvoicing, generateInvoices, updateInvoice } = useInvoicing();
  const { feeHeads } = useFeeConfiguration();
  const { entries, addEntry, rejectEntry } = useJournal();
  const { accounts, findByCode, accountMap } = useAccounts();
  const lockTooltip = '⚠️ تم إغلاق العام المالي، لا يمكن التعديل';
  useStudentAccounts(
    store.allStudents || store.students || [],
    store.workingYearId || store.activeYear?.Year_ID,
    store.classes,
    store.years
  );

  const [yearId, setYearId] = useState<string>(selectedYearId || store.activeYear?.Year_ID || '');
  const [stageId, setStageId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [classId, setClassId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewRows, setPreviewRows] = useState<
    {
      studentId: string;
      studentName: string;
      gradeName: string;
      className: string;
      totalAmount: number;
      discountAmount: number;
      netAmount: number;
      status: 'generated' | 'pending';
      items: { feeHeadId: string; amount: number }[];
    }[]
  >([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{
    open: boolean;
    invoiceId: string | null;
    studentName: string;
    studentId: string;
    gradeName: string;
    className: string;
    yearName: string;
    items: { feeHeadId: string; amount: number; revenueAccountId: string }[];
  }>({ open: false, invoiceId: null, studentName: '', studentId: '', gradeName: '', className: '', yearName: '', items: [] });

  const feeHeadNameMap = useMemo(() => new Map(feeHeads.map((head) => [head.id, head.name])), [feeHeads]);
  const nextJournalNo = useMemo(() => {
    const maxNo = entries.reduce((max, entry) => Math.max(max, entry.journalNo || 0), 0);
    return maxNo + 1;
  }, [entries]);
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
    () => isFinancialYearClosed(schoolCode, yearId || store.activeYear?.Year_ID),
    [schoolCode, store.activeYear?.Year_ID, yearId]
  );

  const normalized = (value?: string) => (value || '').trim().toLowerCase();
  const resolveRevenueAccountId = (value?: string) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (accountMap.has(raw)) return raw;
    const byCode = findByCode(raw);
    return byCode?.id || '';
  };
  const resolveAccountId = (value?: string) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (accountMap.has(raw)) return raw;
    const byCode = findByCode(raw);
    return byCode?.id || '';
  };
  const resolveStudentAccount = (studentId: string, academicYearId?: string) => {
    const yearKey = String(academicYearId || yearId || '').trim();
    const direct =
      (yearKey && accountMap.get(`ACC-STU-${yearKey}-${studentId}`)) ||
      accountMap.get(`ACC-STU-${studentId}`);
    if (direct) return direct;
    const byStudent = accounts.find(
      (account) =>
        account.id.includes(studentId) || (account.name || '').includes(studentId)
    ) || null;
    if (byStudent) return byStudent;
    if (yearKey) {
      const yearFolderId = `ACC-13-YEAR-${yearKey}`;
      const byYearId = accountMap.get(yearFolderId);
      if (byYearId) return byYearId;
      const yearLabel = String(
        store.years.find((year: any) => year.Year_ID === yearKey)?.Year_Name || yearKey
      ).trim();
      const byYearName = accounts.find(
        (account) =>
          account.parentId &&
          normalize(account.name).includes('اقساط') &&
          (normalize(account.name).includes(normalize(yearLabel)) || normalize(account.name).includes(normalize(yearKey)))
      );
      if (byYearName) return byYearName;
    }
    return null;
  };

  const stageOptions = useMemo(
    () => store.stages.filter((stage: any) => stage.Academic_Year_ID === yearId),
    [store.stages, yearId]
  );

  const gradeOptions = useMemo(
    () =>
      store.grades.filter(
        (grade: any) =>
          grade.Academic_Year_ID === yearId && (!stageId || grade.Stage_ID === stageId)
      ),
    [store.grades, yearId, stageId]
  );

  const classOptions = useMemo(
    () =>
      store.classes.filter(
        (klass: any) =>
          klass.Academic_Year_ID === yearId && (!gradeId || klass.Grade_ID === gradeId)
      ),
    [store.classes, yearId, gradeId]
  );

  const studentsById = useMemo(() => {
    const map = new Map<string, any>();
    (store.students || []).forEach((student: any) => {
      map.set(student.Student_Global_ID, student);
    });
    return map;
  }, [store.students]);

  const enrolledStudents = useMemo(() => {
    const classByKey = new Map<string, any>();
    (store.classes || []).forEach((klass: any) => {
      const idKey = String(klass.Class_ID || '').trim();
      const nameKey = String(klass.Class_Name || '').trim();
      if (idKey) classByKey.set(idKey, klass);
      if (nameKey) classByKey.set(nameKey, klass);
    });
    const gradeById = new Map(
      (store.grades || []).map((grade: any) => [grade.Grade_ID, grade])
    );
    const resolveStudentGradeId = (student: any) => {
      if (student.Grade_ID) return student.Grade_ID;
      const klass =
        classByKey.get(String(student.Class_ID || '').trim()) ||
        classByKey.get(String(student.Class_Name || '').trim());
      return klass?.Grade_ID || '';
    };
    const resolveStudentStageId = (student: any) => {
      if (student.Stage_ID) return student.Stage_ID;
      const gradeId = resolveStudentGradeId(student);
      return gradeById.get(gradeId)?.Stage_ID || '';
    };

    return (store.students || []).filter((student: any) => {
      if (yearId && student.Academic_Year_ID !== yearId) return false;
      const resolvedStageId = resolveStudentStageId(student);
      const resolvedGradeId = resolveStudentGradeId(student);
      if (stageId && resolvedStageId !== stageId) return false;
      if (gradeId && resolvedGradeId !== gradeId) return false;
      if (classId) {
        const studentClassId = String(student.Class_ID || '').trim();
        const studentClassName = String(student.Class_Name || '').trim();
        const selectedClass = classByKey.get(classId);
        const selectedClassName = selectedClass?.Class_Name || '';
        if (studentClassId !== classId && studentClassName !== selectedClassName) return false;
      }
      const status = student.Status ?? student.Student_Status;
      const normalizedStatus = normalized(status);
      const isEnrolled =
        normalizedStatus === normalized(StudentStatus.ENROLLED) ||
        normalizedStatus === 'enrolled' ||
        normalizedStatus === 'مقيد' ||
        !normalizedStatus;
      if (!isEnrolled) return false;
      if (!searchTerm.trim()) return true;
      const name = `${student.Name_Ar || ''} ${student.Name_En || ''}`.toLowerCase();
      return name.includes(searchTerm.trim().toLowerCase());
    });
  }, [store.students, store.classes, store.grades, yearId, stageId, gradeId, classId, searchTerm]);

  const enrolledStudentIds = useMemo(() => new Set(enrolledStudents.map((student: any) => student.Student_Global_ID)), [enrolledStudents]);

  const invoiceRows = useMemo(() => {
    const rows = invoices.filter((invoice) => invoice.academicYearId === yearId && !invoice.isVoided);
    return rows
      .filter((invoice) => (!gradeId ? true : invoice.gradeId === gradeId))
      .filter((invoice) => {
        if (!classId) return true;
        const student = studentsById.get(invoice.studentId);
        const studentClassId = String(student?.Class_ID || '').trim();
        const studentClassName = String(student?.Class_Name || '').trim();
        const selectedClass = classOptions.find((klass: any) => klass.Class_ID === classId);
        const selectedClassName = String(selectedClass?.Class_Name || '').trim();
        return studentClassId === classId || studentClassName === selectedClassName;
      })
      .filter((invoice) => {
        if (!searchTerm.trim()) return true;
        const student = studentsById.get(invoice.studentId);
        const name = `${student?.Name_Ar || invoice.studentName || ''} ${student?.Name_En || ''}`.toLowerCase();
        return name.includes(searchTerm.trim().toLowerCase()) || invoice.studentId.toLowerCase().includes(searchTerm.trim().toLowerCase());
      });
  }, [invoices, yearId, gradeId, classId, searchTerm, studentsById]);

  const receiptsByStudent = useMemo(() => {
    const map = new Map<string, number>();
    (store.receipts || [])
      .filter((receipt: any) => receipt.Academic_Year_ID === yearId)
      .forEach((receipt: any) => {
        const studentId = receipt.Enroll_ID;
        if (!studentId) return;
        const paid = Number(receipt.Amount_Paid ?? 0);
        map.set(studentId, (map.get(studentId) ?? 0) + paid);
      });
    return map;
  }, [store.receipts, yearId]);

  const tableRows = useMemo(() => {
    if (invoiceRows.length) {
      return invoiceRows.map((invoice) => {
        const student = studentsById.get(invoice.studentId);
        const paidAmount = receiptsByStudent.get(invoice.studentId) ?? 0;
        const remaining = Math.max(invoice.totalAmount - paidAmount, 0);
        return {
          rowId: invoice.id,
          isInvoice: true,
          studentId: invoice.studentId,
          studentName: invoice.studentName,
          gradeName: invoice.gradeName || store.grades.find((grade: any) => grade.Grade_ID === invoice.gradeId)?.Grade_Name || '',
          className: student?.Class_ID
            ? store.classes.find((klass: any) => klass.Class_ID === student.Class_ID)?.Class_Name ||
              store.classes.find((klass: any) => klass.Class_Name === student.Class_ID)?.Class_Name ||
              student.Class_Name ||
              ''
            : student?.Class_Name || '',
          totalAmount: invoice.totalAmount,
          date: invoice.dueDate,
          balance: remaining,
          status: invoice.isPosted ? 'generated' : 'pending'
        };
      });
    }
    return previewRows.map((row) => ({
      rowId: row.studentId,
      isInvoice: false,
      studentId: row.studentId,
      studentName: row.studentName,
      gradeName: row.gradeName,
      className: row.className,
      totalAmount: row.totalAmount,
      date: '',
      balance: row.netAmount,
      status: row.status
    }));
  }, [invoiceRows, previewRows, receiptsByStudent, store.grades, store.classes, studentsById]);

  const handlePreview = () => {
    if (isClosed) return;
    if (!yearId) {
      alert('يرجى اختيار السنة الدراسية أولاً.');
      return;
    }
    if (yearId !== store.workingYearId) {
      alert('يرجى اختيار السنة الدراسية النشطة الحالية.');
      return;
    }
    if (!gradeId) {
      alert('يرجى اختيار الصف الدراسي.');
      return;
    }
    const rawPreview = previewBatchInvoicing(gradeId);
    const previewList =
      enrolledStudentIds.size > 0
        ? rawPreview.filter((entry) => enrolledStudentIds.has(entry.studentId))
        : rawPreview;
    if (!previewList.length) {
      alert('لا توجد بنود رسوم للصف المحدد.');
      setPreviewRows([]);
      return;
    }

    const rows = previewList
      .filter((entry) => {
        if (!classId) return true;
        const student = studentsById.get(entry.studentId);
        const studentClassId = String(student?.Class_ID || '').trim();
        const studentClassName = String(student?.Class_Name || '').trim();
        const selectedClass = classOptions.find((klass: any) => klass.Class_ID === classId);
        const selectedClassName = String(selectedClass?.Class_Name || '').trim();
        return studentClassId === classId || studentClassName === selectedClassName;
      })
      .map((entry) => {
        const student = studentsById.get(entry.studentId);
        const gradeName = store.grades.find((grade: any) => grade.Grade_ID === entry.gradeId)?.Grade_Name || '';
        const className =
          store.classes.find((klass: any) => klass.Class_ID === student?.Class_ID)?.Class_Name ||
          store.classes.find((klass: any) => klass.Class_Name === student?.Class_ID)?.Class_Name ||
          student?.Class_Name ||
          '';
        return {
          studentId: entry.studentId,
          studentName: entry.studentName,
          gradeName,
          className,
          totalAmount: entry.totalAmount,
          discountAmount: 0,
          netAmount: entry.totalAmount,
          status: entry.skipped ? 'generated' : 'pending',
          items: entry.items.map((item) => ({ feeHeadId: item.feeHeadId, amount: item.amount }))
        };
      });

    setPreviewRows(rows);
    setSelectedIds(new Set());
    setActiveRowId(null);
  };

  const handleGenerate = () => {
    if (isClosed) return;
    if (!yearId) {
      alert('يرجى اختيار السنة الدراسية أولاً.');
      return;
    }
    if (yearId !== store.workingYearId) {
      alert('يرجى اختيار السنة الدراسية النشطة الحالية.');
      return;
    }
    const receivableAccount = findByCode('1103');
    const targetGrades = gradeId
      ? store.grades.filter((grade: any) => grade.Grade_ID === gradeId)
      : store.grades.filter((grade: any) => grade.Academic_Year_ID === yearId);

    if (!targetGrades.length) {
      alert('لا توجد صفوف متاحة لهذه السنة الدراسية.');
      return;
    }

    const previewList = targetGrades.flatMap((grade: any) => {
      const rawList = previewBatchInvoicing(grade.Grade_ID);
      const list =
        enrolledStudentIds.size > 0
          ? rawList.filter((entry) => enrolledStudentIds.has(entry.studentId))
          : rawList;
      if (!classId) return list;
      return list.filter((entry) => {
        const student = studentsById.get(entry.studentId);
        const studentClassId = String(student?.Class_ID || '').trim();
        const studentClassName = String(student?.Class_Name || '').trim();
        const selectedClass = classOptions.find((klass: any) => klass.Class_ID === classId);
        const selectedClassName = String(selectedClass?.Class_Name || '').trim();
        return studentClassId === classId || studentClassName === selectedClassName;
      });
    });

    if (!previewList.length) {
      alert('لا توجد بنود رسوم أو طلاب مؤهلين للتوليد.');
      return;
    }

    const skippedCount = previewList.filter((entry) => entry.skipped).length;
    if (skippedCount === previewList.length) {
      const existingRefs = new Set(entries.map((entry) => entry.sourceRefId));
      const existingInvoices = invoices
        .filter((invoice) => invoice.academicYearId === yearId && invoice.isPosted && !invoice.isVoided)
        .filter((invoice) => (!gradeId ? true : invoice.gradeId === gradeId))
        .filter((invoice) => {
          if (!classId) return true;
          const student = studentsById.get(invoice.studentId);
          const studentClassId = String(student?.Class_ID || '').trim();
          const studentClassName = String(student?.Class_Name || '').trim();
          const selectedClass = classOptions.find((klass: any) => klass.Class_ID === classId);
          const selectedClassName = String(selectedClass?.Class_Name || '').trim();
          return studentClassId === classId || studentClassName === selectedClassName;
        })
        .filter((invoice) => !existingRefs.has(invoice.id));

      if (!existingInvoices.length) {
        alert('تم توليد الفواتير مسبقًا لهذه السنة.');
        return;
      }

      let createdEntries = 0;
      let missingStudentAccounts = 0;
      let missingRevenueAccounts = 0;
      const invoiceIds = existingInvoices.map((invoice) => invoice.id);
      const creditMap = new Map<string, number>();
      const debitLines: { id: string; accountId: string; debit: number; credit: number; note: string }[] = [];
      const missingAccountIds = new Set<string>();
      existingInvoices.forEach((invoice) => {
        if (invoice.totalAmount <= 0) return;
        const studentAccount = resolveStudentAccount(invoice.studentId, invoice.academicYearId);
        if (!studentAccount && !receivableAccount) {
          missingStudentAccounts += 1;
          return;
        }
        invoice.items.forEach((item) => {
          const revenueId = resolveRevenueAccountId(item.revenueAccountId);
          if (!revenueId) {
            missingRevenueAccounts += 1;
            return;
          }
          creditMap.set(revenueId, (creditMap.get(revenueId) ?? 0) + item.amount);
        });
        const debitAccountId = resolveAccountId(studentAccount?.id || receivableAccount?.id);
        if (!debitAccountId) {
          missingAccountIds.add(studentAccount?.id || receivableAccount?.id || 'UNKNOWN');
          return;
        }
        debitLines.push({
          id: `LINE-${invoice.id}-DR`,
          accountId: debitAccountId,
          debit: invoice.totalAmount,
          credit: 0,
          note: `مديونية طالب - ${invoice.studentName}`
        });
      });

      const creditLines = Array.from(creditMap.entries()).map(([accountId, amount]) => {
        const resolved = resolveAccountId(accountId);
        if (!resolved) {
          missingAccountIds.add(accountId);
        }
        return {
          id: `LINE-BATCH-${accountId}`,
          accountId: resolved,
          debit: 0,
          credit: amount,
          note: 'إيرادات رسوم دراسية'
        };
      }).filter((line) => line.accountId);

      if (missingAccountIds.size > 0) {
        alert('يوجد حساب غير موجود في دليل الحسابات. الرجاء ربط حسابات الإيراد والطلاب أولاً.');
        return;
      }

      if (debitLines.length && creditLines.length) {
        const lines = [
          ...debitLines,
          ...creditLines
        ];
        addEntry({
          id: '',
          journalNo: nextJournalNo,
          date: new Date().toISOString().slice(0, 10),
          description: `استحقاق رسوم دراسية مجمّع (${debitLines.length} طالب)`,
          source: 'payments',
          sourceRefId: `BATCH-${yearId}-${gradeId || 'ALL'}-${classId || 'ALL'}-${invoiceIds.join('|')}`,
          status: 'POSTED',
          createdAt: new Date().toISOString(),
          createdBy: store.currentUser?.Username || store.currentUser?.User_ID || 'system',
          lines,
          totalDebit: 0,
          totalCredit: 0,
          isBalanced: false
        });
        createdEntries = 1;
      }

      if (missingStudentAccounts > 0) {
        alert(`تعذر إنشاء قيود لعدد ${missingStudentAccounts} طالب لعدم وجود حساباتهم الفرعية.`);
      }
      if (missingRevenueAccounts > 0) {
        alert('يوجد بنود رسوم بدون ربط حساب إيراد. لم يتم إنشاء قيود لها.');
      }
      alert(`تم إنشاء ${createdEntries} قيد يومية لفواتير سابقة.`);
      return;
    }
    const created = generateInvoices(previewList);
    if (!created.length) {
      alert('تم توليد الفواتير مسبقًا لهذه السنة.');
      return;
    }

    const existingRefs = new Set(entries.map((entry) => entry.sourceRefId));
    let missingStudentAccounts = 0;
    let missingRevenueAccounts = 0;
    const creditMap = new Map<string, number>();
    const debitLines: { id: string; accountId: string; debit: number; credit: number; note: string }[] = [];
    const invoiceIds = created.map((invoice) => invoice.id);
    const missingAccountIds = new Set<string>();
    created.forEach((invoice) => {
      if (invoice.totalAmount <= 0) return;
      if (existingRefs.has(invoice.id)) return;
      const studentAccount = resolveStudentAccount(invoice.studentId, invoice.academicYearId);
      if (!studentAccount && !receivableAccount) {
        missingStudentAccounts += 1;
        return;
      }
      invoice.items.forEach((item) => {
        const revenueId = resolveRevenueAccountId(item.revenueAccountId);
        if (!revenueId) {
          missingRevenueAccounts += 1;
          return;
        }
        creditMap.set(revenueId, (creditMap.get(revenueId) ?? 0) + item.amount);
      });
      const debitAccountId = resolveAccountId(studentAccount?.id || receivableAccount?.id);
      if (!debitAccountId) {
        missingAccountIds.add(studentAccount?.id || receivableAccount?.id || 'UNKNOWN');
        return;
      }
      debitLines.push({
        id: `LINE-${invoice.id}-DR`,
        accountId: debitAccountId,
        debit: invoice.totalAmount,
        credit: 0,
        note: `مديونية طالب - ${invoice.studentName}`
      });
    });

    const creditLines = Array.from(creditMap.entries()).map(([accountId, amount]) => {
      const resolved = resolveAccountId(accountId);
      if (!resolved) {
        missingAccountIds.add(accountId);
      }
      return {
        id: `LINE-BATCH-${accountId}`,
        accountId: resolved,
        debit: 0,
        credit: amount,
        note: 'إيرادات رسوم دراسية'
      };
    }).filter((line) => line.accountId);

    if (missingAccountIds.size > 0) {
      alert('يوجد حساب غير موجود في دليل الحسابات. الرجاء ربط حسابات الإيراد والطلاب أولاً.');
      return;
    }

    if (debitLines.length && creditLines.length) {
      const lines = [
        ...debitLines,
        ...creditLines
      ];
      addEntry({
        id: '',
        journalNo: nextJournalNo,
        date: new Date().toISOString().slice(0, 10),
        description: `استحقاق رسوم دراسية مجمّع (${debitLines.length} طالب)`,
        source: 'payments',
        sourceRefId: `BATCH-${yearId}-${gradeId || 'ALL'}-${classId || 'ALL'}-${invoiceIds.join('|')}`,
        status: 'POSTED',
        createdAt: new Date().toISOString(),
        createdBy: store.currentUser?.Username || store.currentUser?.User_ID || 'system',
        lines,
        totalDebit: 0,
        totalCredit: 0,
        isBalanced: false
      });
    }

    if (missingStudentAccounts > 0) {
      alert(`تعذر إنشاء قيود لعدد ${missingStudentAccounts} طالب لعدم وجود حساباتهم الفرعية.`);
    }
    if (missingRevenueAccounts > 0) {
      alert('يوجد بنود رسوم بدون ربط حساب إيراد. لم يتم إنشاء قيود لها.');
    }

    alert(`تم إنشاء ${created.length} فاتورة. تم تخطي ${skippedCount} لوجود استحقاق سابق.`);
    setSelectedIds(new Set());
  };

  const handleReset = () => {
    if (isClosed) return;
    if (!yearId) {
      alert('حدد العام الدراسي قبل إعادة التعيين.');
      return;
    }

    const scopeInvoices = invoices
      .filter((invoice) => invoice.academicYearId === yearId)
      .filter((invoice) => (!gradeId ? true : invoice.gradeId === gradeId))
      .filter((invoice) => !invoice.isVoided)
      .filter((invoice) => {
        if (!classId) return true;
        const student = studentsById.get(invoice.studentId);
        const studentClassId = String(student?.Class_ID || '').trim();
        const studentClassName = String(student?.Class_Name || '').trim();
        const selectedClass = classOptions.find((klass: any) => klass.Class_ID === classId);
        const selectedClassName = String(selectedClass?.Class_Name || '').trim();
        return studentClassId === classId || studentClassName === selectedClassName;
      });

    if (!scopeInvoices.length) {
      alert('لا توجد فواتير لتصفيرها ضمن النطاق الحالي.');
      return;
    }

    const scopeStudentIds = new Set(scopeInvoices.map((invoice) => invoice.studentId));
    const hasReceipts = (store.receipts || []).some(
      (receipt: any) =>
        receipt.Academic_Year_ID === yearId &&
        scopeStudentIds.has(receipt.Enroll_ID) &&
        Number(receipt.Amount_Paid ?? 0) > 0
    );
    if (hasReceipts) {
      alert('لا يمكن إعادة التعيين لوجود إيصالات سداد مرتبطة.');
      return;
    }

    const prefix = `BATCH-${yearId}-${gradeId || 'ALL'}-${classId || 'ALL'}-`;
    const relatedEntries = entries.filter((entry) => entry.sourceRefId?.startsWith(prefix));
    const hasApprovedEntries = relatedEntries.some((entry) => entry.status === 'APPROVED');
    if (hasApprovedEntries) {
      alert('لا يمكن إعادة التعيين بعد اعتماد القيود اليومية.');
      return;
    }

    relatedEntries
      .filter((entry) => entry.status === 'POSTED')
      .forEach((entry) => {
        try {
          rejectEntry(entry.id, 'تمت إعادة تعيين الاستحقاق');
        } catch {
          return;
        }
      });

    scopeInvoices.forEach((invoice) => {
      updateInvoice(invoice.id, {
        isVoided: true,
        voidReason: 'إعادة تعيين الاستحقاق',
        voidDate: new Date().toISOString(),
        isPosted: false
      });
    });

    setSelectedIds(new Set());
    setPreviewRows([]);
    setActiveRowId(null);
    setSearchTerm('');
  };

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    const next = new Set(tableRows.map((row) => row.rowId));
    setSelectedIds(next);
  };

  const toggleRowSelection = (rowId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(rowId);
      } else {
        next.delete(rowId);
      }
      return next;
    });
  };

  const openEditModal = (invoiceId: string) => {
    if (isClosed) return;
    const invoice = invoices.find((item) => item.id === invoiceId);
    if (!invoice) return;
    const student = studentsById.get(invoice.studentId);
    const gradeName = invoice.gradeName || store.grades.find((grade: any) => grade.Grade_ID === invoice.gradeId)?.Grade_Name || '';
    const className = student?.Class_ID ? store.classes.find((klass: any) => klass.Class_ID === student.Class_ID)?.Class_Name || '' : '';
    const yearName = store.years.find((year: any) => year.Year_ID === invoice.academicYearId)?.Year_Name || '';
    setEditModal({
      open: true,
      invoiceId,
      studentName: invoice.studentName,
      studentId: invoice.studentId,
      gradeName,
      className,
      yearName,
      items: invoice.items.map((item) => ({ ...item }))
    });
  };

  const handleEditAmount = (feeHeadId: string, value: string) => {
    if (isClosed) return;
    const amount = Number(value);
    if (Number.isNaN(amount)) return;
    setEditModal((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.feeHeadId === feeHeadId ? { ...item, amount: Math.max(amount, 0) } : item
      )
    }));
  };

  const saveInvoiceEdits = () => {
    if (!editModal.invoiceId) return;
    const invoice = invoices.find((item) => item.id === editModal.invoiceId);
    if (!invoice) return;
    const receivableAccount = findByCode('1103');
    const studentAccount = resolveStudentAccount(invoice.studentId, invoice.academicYearId);
    if (!studentAccount && !receivableAccount) {
      alert('حساب الطالب غير موجود في دليل الحسابات.');
      return;
    }
    const beforeMap = new Map<string, number>();
    let missingRevenueAccounts = 0;
    invoice.items.forEach((item) => {
      const revenueId = resolveRevenueAccountId(item.revenueAccountId);
      if (!revenueId) {
        missingRevenueAccounts += 1;
        return;
      }
      beforeMap.set(revenueId, (beforeMap.get(revenueId) ?? 0) + item.amount);
    });
    const afterMap = new Map<string, number>();
    editModal.items.forEach((item) => {
      const revenueId = resolveRevenueAccountId(item.revenueAccountId);
      if (!revenueId) {
        missingRevenueAccounts += 1;
        return;
      }
      afterMap.set(revenueId, (afterMap.get(revenueId) ?? 0) + item.amount);
    });

    const allAccounts = new Set([...beforeMap.keys(), ...afterMap.keys()]);
    const deltas: { accountId: string; amount: number }[] = [];
    allAccounts.forEach((accountId) => {
      const delta = (afterMap.get(accountId) ?? 0) - (beforeMap.get(accountId) ?? 0);
      if (Math.abs(delta) > 0.001) {
        deltas.push({ accountId, amount: delta });
      }
    });

    const totalDelta = deltas.reduce((sum, item) => sum + item.amount, 0);
    if (deltas.length > 0) {
      const lines = [
        ...(Math.abs(totalDelta) > 0.001
          ? [
              {
                id: `LINE-ADJ-${invoice.id}-DR`,
                accountId: studentAccount?.id || receivableAccount!.id,
                debit: totalDelta > 0 ? totalDelta : 0,
                credit: totalDelta < 0 ? Math.abs(totalDelta) : 0,
                note: 'تعديل مديونية الطالب'
              }
            ]
          : []),
        ...deltas.map((delta) => ({
          id: `LINE-ADJ-${invoice.id}-${delta.accountId}`,
          accountId: delta.accountId,
          debit: delta.amount < 0 ? Math.abs(delta.amount) : 0,
          credit: delta.amount > 0 ? delta.amount : 0,
          note: 'تعديل إيرادات رسوم'
        }))
      ];
      addEntry({
        id: '',
        journalNo: nextJournalNo + entries.length + 1,
        date: new Date().toISOString().slice(0, 10),
        description: `تعديل فاتورة رسوم - ${invoice.studentName}`,
        source: 'payments',
        sourceRefId: `${invoice.id}-ADJ-${Date.now()}`,
        status: 'POSTED',
        createdAt: new Date().toISOString(),
        createdBy: store.currentUser?.Username || store.currentUser?.User_ID || 'system',
        lines,
        totalDebit: 0,
        totalCredit: 0,
        isBalanced: false
      });
    }
    if (missingRevenueAccounts > 0) {
      alert('يوجد بنود رسوم بدون ربط حساب إيراد. تم تجاهل قيودها أثناء التعديل.');
    }

    updateInvoice(editModal.invoiceId, { items: editModal.items });
    setEditModal({ open: false, invoiceId: null, studentName: '', studentId: '', gradeName: '', className: '', yearName: '', items: [] });
  };

  return (
    <div className="space-y-5 text-start">
      {isClosed && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 flex items-center gap-2">
          🔒 هذا العام المالي مغلق – العرض للقراءة فقط
        </div>
      )}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-2xl font-black text-slate-900">استحقاق الرسوم</h3>
            <p className="text-sm text-slate-500 mt-1">
              تحديد الرسوم المستحقة على الطلاب حسب الصف والسنة الدراسية
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePreview}
              disabled={!gradeId || !yearId || isClosed}
              title={isClosed ? lockTooltip : ''}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black text-white shadow-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              <Grid2X2 size={16} />
              معاينة
            </button>
            <button
              onClick={handleGenerate}
              disabled={!yearId || isClosed}
              title={isClosed ? lockTooltip : ''}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              <Wand2 size={16} />
              توليد الفواتير
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300"
              disabled={isClosed}
              title={isClosed ? lockTooltip : ''}
            >
              <RefreshCw size={16} />
              إعادة تعيين
            </button>
            <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-500">
              <Printer size={16} />
              طباعة
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 px-6 py-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-3">
            <select
              className="min-w-[160px] rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              value={yearId}
              onChange={(event) => {
                setYearId(event.target.value);
                setStageId('');
                setGradeId('');
                setClassId('');
                setPreviewRows([]);
                setSelectedIds(new Set());
              }}
              disabled={isClosed}
              title={isClosed ? lockTooltip : ''}
            >
              <option value="">السنة الدراسية</option>
              {(store.years || []).map((year: any) => (
                <option key={year.Year_ID} value={year.Year_ID}>
                  {year.Year_Name}
                </option>
              ))}
            </select>
            <select
              className="min-w-[160px] rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              value={stageId}
              onChange={(event) => {
                setStageId(event.target.value);
                setGradeId('');
                setClassId('');
                setPreviewRows([]);
                setSelectedIds(new Set());
              }}
              disabled={isClosed}
              title={isClosed ? lockTooltip : ''}
            >
              <option value="">المرحلة</option>
              {stageOptions.map((stage: any) => (
                <option key={stage.Stage_ID} value={stage.Stage_ID}>
                  {stage.Stage_Name}
                </option>
              ))}
            </select>
            <select
              className="min-w-[140px] rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              value={gradeId}
              onChange={(event) => {
                setGradeId(event.target.value);
                setClassId('');
                setPreviewRows([]);
                setSelectedIds(new Set());
              }}
              disabled={isClosed}
              title={isClosed ? lockTooltip : ''}
            >
              <option value="">الصف</option>
              {gradeOptions.map((grade: any) => (
                <option key={grade.Grade_ID} value={grade.Grade_ID}>
                  {grade.Grade_Name}
                </option>
              ))}
            </select>
            <select
              className="min-w-[140px] rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value);
                setPreviewRows([]);
                setSelectedIds(new Set());
              }}
              disabled={isClosed}
              title={isClosed ? lockTooltip : ''}
            >
              <option value="">الفصل</option>
              {classOptions.map((klass: any) => (
                <option key={klass.Class_ID} value={klass.Class_ID}>
                  {klass.Class_Name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              <Search size={16} className="text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="بحث عن الطالب..."
                className="w-44 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
              <FileText size={16} />
              ملاحظات النظام
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-slate-700">
            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
              <span>الطلاب المحددون</span>
              <span className="font-mono text-slate-900">{selectedIds.size}</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
              <span>إجمالي المستحق</span>
              <span className="font-mono text-slate-900">
                {tableRows
                  .filter((row) => selectedIds.has(row.rowId))
                  .reduce((sum, row) => sum + row.balance, 0)
                  .toFixed(2)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-black text-white shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
              onClick={handlePreview}
              disabled={!gradeId || !yearId}
            >
              تحميل الاستحقاق
            </button>
            <button
              className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
              disabled
            >
              اعتماد الفواتير
            </button>
            <button
              className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600"
              onClick={handleReset}
            >
              مسح التحديد
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="max-h-[520px] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-100 text-slate-600 text-[12px] uppercase">
              <tr>
                <th className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={tableRows.length > 0 && selectedIds.size === tableRows.length}
                    onChange={(event) => toggleSelectAll(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    disabled={isClosed}
                    title={isClosed ? lockTooltip : ''}
                  />
                </th>
                <th className="px-4 py-3 text-center">رقم الطالب</th>
                <th className="px-4 py-3 text-start">اسم الطالب</th>
                <th className="px-4 py-3 text-start">الصف</th>
                <th className="px-4 py-3 text-center">قيمة الفاتورة</th>
                <th className="px-4 py-3 text-center">التاريخ</th>
                <th className="px-4 py-3 text-center">الرصيد</th>
                <th className="px-4 py-3 text-center">الحالة</th>
                <th className="px-4 py-3 text-center">تعديل</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, index) => (
                <tr
                  key={row.rowId}
                  className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'} ${
                    activeRowId === row.rowId ? 'ring-1 ring-indigo-200' : ''
                  }`}
                  onClick={() => setActiveRowId(row.rowId)}
                >
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.rowId)}
                      onChange={(event) => toggleRowSelection(row.rowId, event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      disabled={isClosed}
                      title={isClosed ? lockTooltip : ''}
                    />
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-slate-600">{row.studentId}</td>
                  <td className="px-4 py-3 text-start font-bold text-slate-800">{row.studentName}</td>
                  <td className="px-4 py-3 text-start text-slate-600">
                    {row.gradeName}
                    <span className="text-xs text-slate-400"> / {row.className || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-slate-700">
                    {row.totalAmount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500">
                    {row.date ? row.date.slice(0, 10) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-slate-700">
                    {row.balance.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        row.status === 'generated'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {row.status === 'generated' ? 'مُولد' : 'غير مولد'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.isInvoice ? (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditModal(row.rowId);
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-black text-slate-600 hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-40"
                        disabled={isClosed}
                        title={isClosed ? lockTooltip : ''}
                      >
                        تعديل
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-semibold">
                    لم يتم تحميل بيانات بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editModal.open && editModal.invoiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h4 className="text-lg font-black text-slate-900">تعديل الفاتورة</h4>
                <p className="text-xs text-slate-500">تعديل بنود الرسوم للطالب المحدد</p>
              </div>
              <button
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-black text-slate-600"
                onClick={() =>
                  setEditModal({
                    open: false,
                    invoiceId: null,
                    studentName: '',
                    studentId: '',
                    gradeName: '',
                    className: '',
                    yearName: '',
                    items: []
                  })
                }
              >
                إغلاق
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-100 px-4 py-3">
                <p className="text-[11px] text-slate-400">اسم الطالب</p>
                <p className="font-black text-slate-800">{editModal.studentName}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 px-4 py-3">
                <p className="text-[11px] text-slate-400">رقم الطالب</p>
                <p className="font-black text-slate-800">{editModal.studentId}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 px-4 py-3">
                <p className="text-[11px] text-slate-400">الصف / الفصل</p>
                <p className="font-black text-slate-800">
                  {editModal.gradeName} {editModal.className ? `- ${editModal.className}` : ''}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 px-4 py-3">
                <p className="text-[11px] text-slate-400">السنة الدراسية</p>
                <p className="font-black text-slate-800">{editModal.yearName || '—'}</p>
              </div>
            </div>
            <div className="mt-4 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-[12px] uppercase">
                  <tr>
                    <th className="px-4 py-2 text-start">البند</th>
                    <th className="px-4 py-2 text-center">القيمة</th>
                  </tr>
                </thead>
                <tbody>
                  {editModal.items.map((item) => (
                    <tr key={item.feeHeadId} className="border-b border-slate-100">
                      <td className="px-4 py-3 text-start font-semibold text-slate-700">
                        {feeHeadNameMap.get(item.feeHeadId) || item.feeHeadId}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min={0}
                          value={item.amount}
                          onChange={(event) => handleEditAmount(item.feeHeadId, event.target.value)}
                          className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm disabled:bg-slate-50"
                          disabled={isClosed}
                          title={isClosed ? lockTooltip : ''}
                        />
                      </td>
                    </tr>
                  ))}
                  {editModal.items.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-6 text-center text-slate-400 font-semibold">
                        لا توجد بنود لهذه الفاتورة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600"
                onClick={() =>
                  setEditModal({
                    open: false,
                    invoiceId: null,
                    studentName: '',
                    studentId: '',
                    gradeName: '',
                    className: '',
                    yearName: '',
                    items: []
                  })
                }
              >
                إلغاء
              </button>
              <button
                className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black text-white"
                onClick={saveInvoiceEdits}
              >
                حفظ التعديل
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FeesAccrual;
