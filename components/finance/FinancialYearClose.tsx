import React, { useMemo, useState } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, Lock, Loader2, Info, RefreshCcw, Printer } from 'lucide-react';
import { useJournal } from '../../src/hooks/useJournal';
import { useAccounts } from '../../hooks/useAccountsLogic';
import { useInvoicing } from '../../hooks/useInvoicingLogic';
import { AccountType } from '../../src/types/accounts.types';

type CloseState = {
  isClosed: boolean;
  closeDate?: string;
  summary?: Record<string, any>;
};

const storageKey = (schoolCode?: string | number, yearId?: string | number) =>
  `FINANCIAL_YEAR_CLOSE__${schoolCode || 'SCHOOL'}__${yearId || 'YEAR'}`;

const FinancialYearClose: React.FC<{ store: any }> = ({ store }) => {
  const { activeSchool, activeYear, workingYearId } = store;
  const schoolCode =
    (activeSchool?.School_Code || activeSchool?.Code || activeSchool?.ID || activeSchool?.id || 'SCHOOL').toString();
  const yearId =
    workingYearId || activeYear?.Year_ID || activeYear?.AcademicYear_ID || activeYear?.id || 'YEAR';

  const { entries, addEntry } = useJournal();
  const { accounts, createAccountIfNotExists, lockAccount, getAccountBySystemTag } = useAccounts();
  const { invoices } = useInvoicing();

  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isReadyToClose, setIsReadyToClose] = useState(false);
  const [closeState, setCloseState] = useState<CloseState>(() => {
    if (typeof window === 'undefined') return { isClosed: false };
    try {
      const raw = window.localStorage.getItem(storageKey(schoolCode, yearId));
      return raw ? JSON.parse(raw) : { isClosed: false };
    } catch {
      return { isClosed: false };
    }
  });
  const [activeTab, setActiveTab] = useState<'validation' | 'debtors' | 'advances' | 'opening'>('validation');

  const postedEntries = useMemo(
    () => (entries || []).filter((e: any) => (e.status || '').toUpperCase() === 'POSTED'),
    [entries]
  );

  const draftEntries = useMemo(
    () => (entries || []).filter((e: any) => (e.status || '').toUpperCase() !== 'POSTED'),
    [entries]
  );

  const unbalancedEntries = useMemo(
    () =>
      postedEntries.filter(
        (e: any) =>
          Math.abs(Number(e.totalDebit || 0) - Number(e.totalCredit || 0)) > 0.01 ||
          e.isBalanced === false
      ),
    [postedEntries]
  );

  const hasMandatoryAccounts = useMemo(() => {
    // نتحقق فقط من وجود حسابات عملاء طلاب كحد أدنى
    const neededCodes = ['ACC-STU', 'ACC-43', 'ACC-4306'];
    const codes = new Set((accounts || []).map((a: any) => (a.code || '').toString()));
    return neededCodes.some((c) => Array.from(codes).some((code) => code.includes(c)));
  }, [accounts]);

  const invoicesIssues = useMemo(() => {
    return (invoices || []).filter((inv: any) => {
      const status = (inv.Status || inv.status || '').toString().toUpperCase();
      return status !== 'PAID' && status !== 'PARTIAL' && status !== 'DUE';
    });
  }, [invoices]);

  const studentBalances = useMemo(() => {
    // محاولة حساب مديونيات من الفواتير المتاحة
    const map = new Map<string, { due: number; paid: number }>();
    (invoices || []).forEach((inv: any) => {
      const studentId = inv.Student_ID || inv.studentId || inv.StudentId || '';
      const amount = Number(inv.Total || inv.total || inv.amount || 0);
      const paid = Number(inv.Paid || inv.paid || inv.paidAmount || inv.collected || 0);
      if (!studentId) return;
      const curr = map.get(studentId) || { due: 0, paid: 0 };
      curr.due += amount;
      curr.paid += paid;
      map.set(studentId, curr);
    });
    return Array.from(map.entries()).map(([id, val]) => ({
      studentId: id,
      due: val.due,
      paid: val.paid,
      balance: Number((val.due - val.paid).toFixed(2))
    }));
  }, [invoices]);

  const studentDebtors = useMemo(() => studentBalances.filter((s) => s.balance > 0), [studentBalances]);
  const studentCreditors = useMemo(() => studentBalances.filter((s) => s.balance < 0), [studentBalances]);

  const requiredSystemAccounts = useMemo(() => ['OPENING_BALANCE', 'STUDENT_AR', 'DEFERRED_REVENUE', 'CURRENT_YEAR_PNL', 'RETAINED_EARNINGS'], []);

  const ensureSystemAccounts = () => {
    const createdIds: Record<string, string> = {};
    const findParentByType = (type: AccountType) =>
      accounts.find((a) => a.type === type && a.parentId === null)?.id || null;

    requiredSystemAccounts.forEach((tag) => {
      if (getAccountBySystemTag(tag)) return;
      let accType: AccountType = AccountType.ASSET;
      let name = '';
      switch (tag) {
        case 'OPENING_BALANCE':
          accType = AccountType.EQUITY;
          name = 'رصيد افتتاحي';
          break;
        case 'STUDENT_AR':
          accType = AccountType.ASSET;
          name = 'عملاء - طلاب (أرصدة مرحلة)';
          break;
        case 'DEFERRED_REVENUE':
          accType = AccountType.LIABILITY;
          name = 'إيرادات مقدمة - طلاب';
          break;
        case 'CURRENT_YEAR_PNL':
          accType = AccountType.EQUITY;
          name = 'نتائج أعمال العام';
          break;
        case 'RETAINED_EARNINGS':
          accType = AccountType.EQUITY;
          name = 'أرباح وخسائر مرحلة';
          break;
        default:
          name = tag;
      }
      const parentId = findParentByType(accType);
      const id = createAccountIfNotExists({
        name,
        type: accType as any,
        parentId,
        level: parentId ? 3 : 1,
        isSystem: true,
        systemTag: tag
      });
      createdIds[tag] = id;
      lockAccount(id);
    });
    return requiredSystemAccounts.every((tag) => getAccountBySystemTag(tag));
  };

  const validateBeforeClose = () => {
    setIsValidating(true);
    const errors: string[] = [];
    if (draftEntries.length > 0) {
      errors.push(`يوجد ${draftEntries.length} قيد غير مرحل (DRAFT أو Approved).`);
    }
    if (unbalancedEntries.length > 0) {
      errors.push(`يوجد ${unbalancedEntries.length} قيد غير موزون (مدين لا يساوي دائن).`);
    }
    if (invoicesIssues.length > 0) {
      errors.push(`يوجد ${invoicesIssues.length} فاتورة بحالة غير واضحة (ليست مسددة/جزئي/متبقي).`);
    }
    if (!ensureSystemAccounts()) {
      errors.push('حسابات النظام الافتتاحية غير متوفرة وتمت محاولة إنشائها. أعد الفحص.');
    }

    setValidationErrors(errors);
    setIsReadyToClose(errors.length === 0);
    setIsValidating(false);
  };

  const handleClose = () => {
    if (!isReadyToClose) return;
    const openingAccount = getAccountBySystemTag('OPENING_BALANCE');
    const studentArAcc = getAccountBySystemTag('STUDENT_AR');
    const deferredAcc = getAccountBySystemTag('DEFERRED_REVENUE');
    const retainedAcc = getAccountBySystemTag('RETAINED_EARNINGS');
    const pnlAcc = getAccountBySystemTag('CURRENT_YEAR_PNL');
    if (!openingAccount || !studentArAcc || !deferredAcc || !retainedAcc || !pnlAcc) {
      setValidationErrors(['تعذر إنشاء الحسابات النظامية، يرجى إضافتها يدوياً.']);
      setIsReadyToClose(false);
      return;
    }

    const openingLines: any[] = [];
    accounts.forEach((acc) => {
      const bal = Number(acc.balance || 0);
      if (!bal) return;
      const isDebit = bal > 0;
      openingLines.push({
        id: `${acc.id}-OPEN`,
        accountId: acc.id,
        debit: isDebit ? Math.abs(bal) : 0,
        credit: !isDebit ? Math.abs(bal) : 0,
        note: 'رصيد افتتاحي مرحل'
      });
    });

    const studentArTotal = studentDebtors.reduce((sum, s) => sum + s.balance, 0);
    if (studentArTotal !== 0) {
      openingLines.push({
        id: 'LINE-STU-AR',
        accountId: studentArAcc.id,
        debit: studentArTotal > 0 ? studentArTotal : 0,
        credit: studentArTotal < 0 ? Math.abs(studentArTotal) : 0,
        note: 'أرصدة مرحلة للطلاب'
      });
    }

    const deferredTotal = studentCreditors.reduce((sum, s) => sum + Math.abs(s.balance), 0);
    if (deferredTotal !== 0) {
      openingLines.push({
        id: 'LINE-DEFERRED',
        accountId: deferredAcc.id,
        debit: 0,
        credit: deferredTotal,
        note: 'إيرادات مقدمة للعام القادم'
      });
    }

    const totals = openingLines.reduce(
      (acc, line) => {
        acc.debit += line.debit;
        acc.credit += line.credit;
        return acc;
      },
      { debit: 0, credit: 0 }
    );
    const diff = Number((totals.debit - totals.credit).toFixed(2));
    if (Math.abs(diff) > 0.01) {
      openingLines.push({
        id: 'LINE-RETAINED',
        accountId: retainedAcc.id,
        debit: diff < 0 ? Math.abs(diff) : 0,
        credit: diff > 0 ? Math.abs(diff) : 0,
        note: 'تسوية توازن الرصيد الافتتاحي'
      });
    }

    addEntry({
      id: '',
      journalNo: Date.now(),
      date: new Date().toISOString().split('T')[0],
      description: `قيد الرصيد الافتتاحي لعام ${yearId}`,
      source: 'YEAR_OPENING' as any,
      sourceRefId: `YEAR_OPENING_${yearId}`,
      status: 'POSTED',
      createdAt: new Date().toISOString(),
      createdBy: 'system',
      lines: openingLines,
      totalDebit: openingLines.reduce((s, l) => s + l.debit, 0),
      totalCredit: openingLines.reduce((s, l) => s + l.credit, 0),
      isBalanced: true
    });

    const nextState: CloseState = {
      isClosed: true,
      closeDate: new Date().toISOString(),
      summary: {
        postedEntries: postedEntries.length,
        unbalancedEntries: unbalancedEntries.length,
        draftEntries: draftEntries.length,
        studentDebtors: studentDebtors.length,
        studentCreditors: studentCreditors.length,
        invoicesIssues: invoicesIssues.length,
        yearId,
        schoolCode,
        openingEntry: true
      }
    };
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey(schoolCode, yearId), JSON.stringify(nextState));
      window.localStorage.setItem(`FINANCIAL_YEAR_LOCKED__${schoolCode}__${yearId}`, 'true');
    }
    setCloseState(nextState);
    setIsReadyToClose(false);
  };

  const statusItems = [
    {
      label: 'قيود مرحّلة',
      value: postedEntries.length,
      ok: unbalancedEntries.length === 0 && draftEntries.length === 0
    },
    { label: 'قيود غير موزونة', value: unbalancedEntries.length, ok: unbalancedEntries.length === 0 },
    { label: 'قيود غير مرحّلة', value: draftEntries.length, ok: draftEntries.length === 0 },
    { label: 'فواتير بحاجة مراجعة', value: invoicesIssues.length, ok: invoicesIssues.length === 0 },
    { label: 'مديونيات طلاب', value: studentDebtors.length, ok: true },
    { label: 'دفعات مقدّمة (طلاب)', value: studentCreditors.length, ok: true }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Finance</p>
          <h2 className="text-2xl font-black text-slate-900">إغلاق العام المالي</h2>
          <p className="text-sm text-slate-500 font-bold">
            العام الحالي: {activeYear?.Year_Name || activeYear?.AcademicYear_Name || workingYearId || 'غير محدد'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-2 rounded-xl text-sm font-black ${closeState.isClosed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {closeState.isClosed ? 'مغلق' : 'قيد الإغلاق'}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 no-print">
        {[
          { id: 'validation', label: 'فحص الجاهزية' },
          { id: 'debtors', label: 'مديونيات الطلاب' },
          { id: 'advances', label: 'دفعات مقدّمة' },
          { id: 'opening', label: 'القيد الافتتاحي' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-sm font-black border transition ${
              activeTab === tab.id ? 'bg-indigo-600 text-white border-indigo-200' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white shadow-sm p-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600 font-bold text-sm">
            <ShieldCheck size={16} /> فحص الجاهزية للإغلاق
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={validateBeforeClose}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-xs font-black"
            >
              {isValidating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
              فحص الجاهزية
            </button>
            <button
              onClick={handleClose}
              disabled={!isReadyToClose || closeState.isClosed}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isReadyToClose ? 'أكمل الفحص أولاً' : ''}
            >
              <Lock size={14} />
              تنفيذ الإغلاق
            </button>
          </div>
        </div>
        {activeTab === 'validation' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {statusItems.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 flex items-center justify-between">
                  <span className="font-bold text-slate-700">{item.label}</span>
                  <span className={`font-black ${item.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{item.value}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-amber-700 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5" />
              <div>
                <p>تحذير: لا يمكن التراجع بعد الإغلاق. هذه العملية لا تعدل القيود ولكنها تغلق العام وتمنع التعديلات المستقبلية.</p>
              </div>
            </div>

            {validationErrors.length > 0 && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 space-y-2">
                <p>أخطاء الفحص:</p>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {isReadyToClose && validationErrors.length === 0 && !closeState.isClosed && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 flex items-center gap-2">
                <CheckCircle2 size={16} />
                جاهز للإغلاق. يمكنك تنفيذ الإغلاق الآن.
              </div>
            )}

            {closeState.isClosed && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 space-y-1">
                <p>تم الإغلاق بتاريخ: {closeState.closeDate ? new Date(closeState.closeDate).toLocaleString() : 'غير معروف'}</p>
                <p>العـام: {yearId}</p>
                <p>المدرسة: {schoolCode}</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'debtors' && (
          <div className="space-y-3">
            <h4 className="text-sm font-black text-slate-800">ملخص المديونيات</h4>
            <div className="rounded-2xl border border-slate-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="py-2 px-3 text-start">الطالب</th>
                    <th className="py-2 px-3 text-center">المستحق</th>
                    <th className="py-2 px-3 text-center">المسدد</th>
                    <th className="py-2 px-3 text-center">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {studentDebtors.map((s, idx) => (
                    <tr key={idx} className="odd:bg-white even:bg-slate-50">
                      <td className="py-2 px-3 text-start">{s.studentId}</td>
                      <td className="py-2 px-3 text-center font-mono text-emerald-700">{s.due.toFixed(2)}</td>
                      <td className="py-2 px-3 text-center font-mono text-indigo-700">{s.paid.toFixed(2)}</td>
                      <td className="py-2 px-3 text-center font-mono font-black text-rose-600">{s.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                  {studentDebtors.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 px-3 text-center text-slate-400 font-bold">
                        لا توجد مديونيات
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'advances' && (
          <div className="space-y-3">
            <h4 className="text-sm font-black text-slate-800">دفعات مقدّمة (طلاب/أعوام قادمة)</h4>
            <div className="rounded-2xl border border-slate-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="py-2 px-3 text-start">الطالب</th>
                    <th className="py-2 px-3 text-center">الرصيد الدائن</th>
                  </tr>
                </thead>
                <tbody>
                  {studentCreditors.map((s, idx) => (
                    <tr key={idx} className="odd:bg-white even:bg-slate-50">
                      <td className="py-2 px-3 text-start">{s.studentId}</td>
                      <td className="py-2 px-3 text-center font-mono text-indigo-700">{Math.abs(s.balance).toFixed(2)}</td>
                    </tr>
                  ))}
                  {studentCreditors.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-4 px-3 text-center text-slate-400 font-bold">
                        لا توجد دفعات مقدّمة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'opening' && (
          <div className="space-y-3">
            <h4 className="text-sm font-black text-slate-800">معاينة القيد الافتتاحي</h4>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 space-y-2">
              <p>سيتم إنشاء قيد واحد في بداية العام الجديد يشمل الأرصدة الختامية، مديونيات الطلاب، والإيرادات المقدّمة.</p>
              <p>مصدر القيد: YEAR_OPENING | locked = true | readOnly.</p>
              <p>يتم استخدام الحسابات النظامية: OPENING_BALANCE, STUDENT_AR, DEFERRED_REVENUE, CURRENT_YEAR_PNL, RETAINED_EARNINGS.</p>
              <p className="text-amber-600 font-bold flex items-center gap-2"><AlertTriangle size={14} /> إذا لم تتوفر الحسابات النظامية، سيتم إيقاف العملية.</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 space-y-2">
          <div className="flex items-center gap-2 text-slate-500 font-bold">
            <Info size={16} /> ملاحظات عن المديونيات والإيرادات المقدّمة
          </div>
          <p>• المديونيات ترحَّل كأرصدة افتتاحية للطلاب في العام الجديد ولن تُفوتر مرة أخرى.</p>
          <p>• الدفعات المقدّمة تُسجل كإيرادات مؤجلة، وتظهر كرصيد دائن في أول استحقاق بالعام الجديد.</p>
          <p>• إذا لم تتوفر الحسابات اللازمة في دليل الحسابات، يجب إضافتها يدويًا قبل الإغلاق.</p>
        </div>
      </div>
    </div>
  );
};

export default FinancialYearClose;
