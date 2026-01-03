import React, { useMemo, useState } from 'react';
import {
  Search,
  Eye,
  Wallet,
  FileText,
  X,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useStore } from '../../store';
import { useJournal } from '../../src/hooks/useJournal';

const StudentFinancialAffairs: React.FC = () => {
  const store = useStore();
  const { entries } = useJournal();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'invoices' | 'receipts' | 'summary'>('invoices');

  const activeYearId = store.activeYear?.Year_ID || '';
  const academicYearLabel = store.activeYear?.Year_Name || activeYearId || '—';

  const approvedBatchRefs = useMemo(() => {
    return entries
      .filter((entry) => entry.status === 'APPROVED' && entry.source === 'payments')
      .map((entry) => entry.sourceRefId || '')
      .filter((ref) => ref.startsWith('BATCH-'))
      .filter((ref) => !activeYearId || ref.startsWith(`BATCH-${activeYearId}-`));
  }, [entries, activeYearId]);

  const approvedInvoiceIds = useMemo(() => {
    const ids = new Set<string>();
    approvedBatchRefs.forEach((ref) => {
      const invoiceStart = ref.indexOf('INV-');
      const invoicePart = invoiceStart >= 0 ? ref.slice(invoiceStart) : (ref.split('-').pop() || '');
      invoicePart.split('|').forEach((id) => {
        if (id) ids.add(id);
      });
    });
    return ids;
  }, [approvedBatchRefs]);

  const receipts = useMemo(() => {
    return (store.receipts || []).filter((receipt: any) => !activeYearId || receipt.Academic_Year_ID === activeYearId);
  }, [store.receipts, activeYearId]);

  const stagesMap = useMemo(
    () => new Map((store.stages || []).map((stage: any) => [stage.Stage_ID, stage])),
    [store.stages]
  );

  const gradesMap = useMemo(
    () => new Map((store.grades || store.allGrades || []).map((grade: any) => [grade.Grade_ID, grade])),
    [store.grades, store.allGrades]
  );

  const classesMap = useMemo(
    () => new Map((store.classes || []).map((klass: any) => [klass.Class_ID, klass])),
    [store.classes]
  );

  const studentInfoById = useMemo(() => {
    const map = new Map<string, any>();
    const source = Array.isArray(store.allStudents) && store.allStudents.length ? store.allStudents : (store.students || []);
    source.forEach((student: any) => {
      const id = String(student.Student_Global_ID || student.Student_ID || student.Enroll_ID || student.id || '');
      if (!id) return;
      map.set(id, student);
    });
    return map;
  }, [store.allStudents, store.students]);

  const studentFinancials = useMemo(() => {
    const byStudent = new Map<string, {
      id: string;
      code: string;
      name: string;
      stageName: string;
      gradeName: string;
      className: string;
      totalDue: number;
      totalPaid: number;
      totalDiscounts: number;
      remainingBalance: number;
      status: 'paid' | 'partial' | 'overdue';
      invoices: any[];
    }>();

    const storedInvoices = (() => {
      if (typeof window === 'undefined') return [];
      try {
        const raw = window.localStorage.getItem('SCHOOL_INVOICING_RECORDS');
        return raw ? (JSON.parse(raw) as any[]) : [];
      } catch {
        return [];
      }
    })();

    const approvedInvoices = storedInvoices.filter((invoice) => {
      const isApproved = approvedInvoiceIds.has(invoice.id);
      const matchesYear = !activeYearId || invoice.academicYearId === activeYearId;
      return isApproved && matchesYear;
    });

    approvedInvoices.forEach((invoice) => {
      const studentId = String(invoice.studentId || '');
      if (!studentId) return;
      const studentInfo = studentInfoById.get(studentId);
      const gradeId = studentInfo?.Grade_ID || studentInfo?.gradeId || '';
      const classId = studentInfo?.Class_ID || studentInfo?.classId || '';
      const grade = gradeId ? gradesMap.get(gradeId) : null;
      const klass = classId ? classesMap.get(classId) : null;
      const stageId = grade?.Stage_ID || studentInfo?.Stage_ID || '';
      const stage = stageId ? stagesMap.get(stageId) : null;
      if (!byStudent.has(studentId)) {
        byStudent.set(studentId, {
          id: studentId,
          code: studentId,
          name: invoice.studentName || studentInfo?.Name_Ar || studentInfo?.Name_En || studentId,
          stageName: stage?.Stage_Name || studentInfo?.Stage_Name || '',
          gradeName: grade?.Grade_Name || studentInfo?.Grade_Name || '',
          className: klass?.Class_Name || studentInfo?.Class_Name || '',
          totalDue: 0,
          totalPaid: 0,
          totalDiscounts: 0,
          remainingBalance: 0,
          status: 'overdue',
          invoices: []
        });
      }
      const record = byStudent.get(studentId)!;
      record.totalDue += Number(invoice.totalAmount || 0);
      record.invoices.push(invoice);
    });

    byStudent.forEach((record, studentId) => {
      const studentReceipts = receipts.filter((receipt: any) => {
        const receiptStudentId = String(receipt.Student_ID || receipt.Enroll_ID || '');
        return receiptStudentId === studentId;
      });

      record.totalPaid = studentReceipts.reduce(
        (sum: number, receipt: any) => sum + Number(receipt.Amount_Paid || 0),
        0
      );

      record.totalDiscounts = 0;
      // TODO: connect approved discount entries if stored in journal entries.

      record.remainingBalance = record.totalDue - (record.totalPaid + record.totalDiscounts);

      if (record.remainingBalance <= 0) record.status = 'paid';
      else if (record.totalPaid > 0) record.status = 'partial';
      else record.status = 'overdue';
    });

    return Array.from(byStudent.values());
  }, [approvedInvoiceIds, activeYearId, receipts, studentInfoById, gradesMap, classesMap, stagesMap]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return studentFinancials;
    const query = searchTerm.trim().toLowerCase();
    return studentFinancials.filter((student) => {
      const name = String(student.name || '').toLowerCase();
      const code = String(student.code || '').toLowerCase();
      return name.includes(query) || code.includes(query);
    });
  }, [studentFinancials, searchTerm]);

  const selectedStudent = useMemo(
    () => studentFinancials.find((student) => student.id === selectedStudentId) || null,
    [studentFinancials, selectedStudentId]
  );

  const selectedInvoices = useMemo(() => {
    if (!selectedStudent) return [];
    return selectedStudent.invoices || [];
  }, [selectedStudent]);

  const selectedReceipts = useMemo(() => {
    if (!selectedStudent) return [];
    return receipts.filter((receipt: any) => {
      const receiptStudentId = String(receipt.Student_ID || receipt.Enroll_ID || '');
      return receiptStudentId === String(selectedStudent.id);
    });
  }, [receipts, selectedStudent]);

  const handleViewAccount = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveTab('invoices');
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6 text-start">
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900">الشؤون المالية للطلاب</h2>
            <p className="text-sm text-slate-500 mt-1">
              متابعة الاستحقاقات، المدفوعات، والمتبقي لكل طالب
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-600">
            <span>الحسابات / الشؤون المالية للطلاب</span>
            <span className="font-mono text-slate-900">{academicYearLabel}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              <Search size={16} className="text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="بحث باسم الطالب أو الكود"
                className="w-52 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
              />
            </div>
            <select className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              <option>المرحلة</option>
              {(store.stages || []).map((stage: any) => (
                <option key={stage.Stage_ID} value={stage.Stage_ID}>{stage.Stage_Name}</option>
              ))}
            </select>
            <select className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              <option>الصف</option>
              {(store.grades || store.allGrades || []).map((grade: any) => (
                <option key={grade.Grade_ID} value={grade.Grade_ID}>{grade.Grade_Name}</option>
              ))}
            </select>
            <select className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
              <option>الفصل</option>
              {(store.classes || []).map((klass: any) => (
                <option key={klass.Class_ID} value={klass.Class_ID}>{klass.Class_Name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-2xl bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
              نشط
            </span>
            <span className="rounded-2xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
              غير نشط
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="max-h-[520px] overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-100 text-slate-600 text-[12px] uppercase">
              <tr>
                <th className="px-4 py-3 text-center">م</th>
                <th className="px-4 py-3 text-center">كود الطالب</th>
                <th className="px-4 py-3 text-start">اسم الطالب</th>
                <th className="px-4 py-3 text-center">الصف</th>
                <th className="px-4 py-3 text-center">إجمالي المستحق</th>
                <th className="px-4 py-3 text-center">إجمالي المدفوع</th>
                <th className="px-4 py-3 text-center">الخصومات</th>
                <th className="px-4 py-3 text-center">المتبقي</th>
                <th className="px-4 py-3 text-center">الحالة</th>
                <th className="px-4 py-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    لا توجد استحقاقات مالية معتمدة للسنة الدراسية الحالية
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, index) => (
                  <tr
                    key={student.id}
                    className="border-b border-slate-100 cursor-pointer hover:bg-slate-50"
                    onClick={() => handleViewAccount(student.id)}
                  >
                    <td className="px-4 py-3 text-center font-mono">{index + 1}</td>
                    <td className="px-4 py-3 text-center font-mono">{student.code}</td>
                    <td className="px-4 py-3 text-start font-semibold text-slate-800">{student.name}</td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {student.gradeName || '—'} {student.className ? `/ ${student.className}` : ''}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">{student.totalDue.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center font-mono">{student.totalPaid.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center font-mono">{student.totalDiscounts.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center font-mono">{student.remainingBalance.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      {student.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                          <CheckCircle2 size={14} /> مسدد
                        </span>
                      ) : student.status === 'partial' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600">
                          <AlertTriangle size={14} /> جزئي
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600">
                          <AlertTriangle size={14} /> متأخر
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center" onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewAccount(student.id)}
                          className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600"
                        >
                          <Eye size={14} className="inline-block ml-1" />
                          عرض الحساب
                        </button>
                        <button
                          onClick={() => undefined}
                          className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600"
                        >
                          <Wallet size={14} className="inline-block ml-1" />
                          سند قبض
                        </button>
                        <button
                          onClick={() => undefined}
                          className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600"
                        >
                          <FileText size={14} className="inline-block ml-1" />
                          الفواتير
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

      {isDrawerOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">ملف الطالب المالي</h3>
                <p className="text-xs text-slate-500">تفاصيل الفواتير والمدفوعات والخصومات</p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">اسم الطالب</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{selectedStudent.name}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">الكود</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{selectedStudent.code}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">المرحلة</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{selectedStudent.stageName || '—'}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">الصف</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {selectedStudent.gradeName || '—'} {selectedStudent.className ? `/ ${selectedStudent.className}` : ''}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { label: 'إجمالي الفواتير', value: selectedStudent.totalDue.toFixed(2) },
                  { label: 'إجمالي المدفوعات', value: selectedStudent.totalPaid.toFixed(2) },
                  { label: 'إجمالي الخصومات', value: selectedStudent.totalDiscounts.toFixed(2) },
                  { label: 'صافي المتبقي', value: selectedStudent.remainingBalance.toFixed(2) }
                ].map((card) => (
                  <div key={card.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs text-slate-500">{card.label}</p>
                    <p className="text-lg font-black text-slate-900 mt-2 font-mono">{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl border border-slate-100 p-4">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-3 text-sm font-bold text-slate-600">
                  <button
                    onClick={() => setActiveTab('invoices')}
                    className={
                      activeTab === 'invoices'
                        ? 'rounded-2xl bg-slate-900 px-3 py-1 text-white'
                        : 'rounded-2xl bg-slate-100 px-3 py-1'
                    }
                  >
                    الفواتير
                  </button>
                  <button
                    onClick={() => setActiveTab('receipts')}
                    className={
                      activeTab === 'receipts'
                        ? 'rounded-2xl bg-slate-900 px-3 py-1 text-white'
                        : 'rounded-2xl bg-slate-100 px-3 py-1'
                    }
                  >
                    سندات القبض
                  </button>
                  <button
                    onClick={() => setActiveTab('summary')}
                    className={
                      activeTab === 'summary'
                        ? 'rounded-2xl bg-slate-900 px-3 py-1 text-white'
                        : 'rounded-2xl bg-slate-100 px-3 py-1'
                    }
                  >
                    الملخص المالي
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {activeTab === 'invoices' && (
                    <div className="overflow-auto rounded-2xl border border-slate-100">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-100 text-slate-600 text-[12px] uppercase">
                          <tr>
                            <th className="px-4 py-2 text-center">رقم الفاتورة</th>
                            <th className="px-4 py-2 text-center">التاريخ</th>
                            <th className="px-4 py-2 text-center">الإجمالي</th>
                            <th className="px-4 py-2 text-center">الحالة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedInvoices.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                                لا توجد فواتير معتمدة
                              </td>
                            </tr>
                          ) : (
                            selectedInvoices.map((invoice: any) => (
                              <tr key={invoice.Entry_ID} className="border-b border-slate-100">
                                <td className="px-4 py-2 text-center font-mono">{invoice.serial || invoice.id}</td>
                                <td className="px-4 py-2 text-center font-mono">
                                  {invoice.dueDate ? String(invoice.dueDate).slice(0, 10) : '—'}
                                </td>
                                <td className="px-4 py-2 text-center font-mono">
                                  {Number(invoice.totalAmount || 0).toFixed(2)}
                                </td>
                                <td className="px-4 py-2 text-center">معتمد</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {activeTab === 'receipts' && (
                    <div className="overflow-auto rounded-2xl border border-slate-100">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-100 text-slate-600 text-[12px] uppercase">
                          <tr>
                            <th className="px-4 py-2 text-center">رقم السند</th>
                            <th className="px-4 py-2 text-center">التاريخ</th>
                            <th className="px-4 py-2 text-center">المبلغ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReceipts.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                                لا توجد سندات قبض مسجلة
                              </td>
                            </tr>
                          ) : (
                            selectedReceipts.map((receipt: any) => (
                              <tr key={`${receipt.Receipt_ID}-${receipt.Fee_ID}`} className="border-b border-slate-100">
                                <td className="px-4 py-2 text-center font-mono">{receipt.Receipt_ID}</td>
                                <td className="px-4 py-2 text-center font-mono">{receipt.Date}</td>
                                <td className="px-4 py-2 text-center font-mono">
                                  {Number(receipt.Amount_Paid || 0).toFixed(2)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {activeTab === 'summary' && (
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">إجمالي المستحق</p>
                        <p className="text-lg font-black text-slate-900 mt-1 font-mono">
                          {selectedStudent.totalDue.toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">إجمالي المدفوع</p>
                        <p className="text-lg font-black text-slate-900 mt-1 font-mono">
                          {selectedStudent.totalPaid.toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-xs text-slate-500">المتبقي</p>
                        <p className="text-lg font-black text-slate-900 mt-1 font-mono">
                          {selectedStudent.remainingBalance.toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:col-span-3">
                        <p className="text-xs text-slate-500">ملاحظات</p>
                        <p className="text-sm font-semibold text-slate-700 mt-1">
                          عرض ملخص مالي فقط. لا توجد أي عمليات تعديل في هذه الشاشة.
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          TODO: ربط تفاصيل الخصومات إذا كانت محفوظة في القيود المعتمدة.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentFinancialAffairs;
