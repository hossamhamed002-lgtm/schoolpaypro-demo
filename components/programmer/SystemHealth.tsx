import React, { useMemo, useState } from 'react';
import { Activity, RefreshCcw, AlertTriangle, CheckCircle2, FileJson, Radio, Shield, Printer } from 'lucide-react';

type Status = 'success' | 'warning' | 'error' | 'unknown';

const statusColor: Record<Status, string> = {
  success: 'text-emerald-600 bg-emerald-50',
  warning: 'text-amber-600 bg-amber-50',
  error: 'text-rose-600 bg-rose-50',
  unknown: 'text-slate-500 bg-slate-100'
};

const statusLabel: Record<Status, string> = {
  success: 'سليم',
  warning: 'تحذير',
  error: 'خطأ',
  unknown: 'غير معروف'
};

const statusIcon = (status: Status) => {
  switch (status) {
    case 'success': return <CheckCircle2 size={16} />;
    case 'warning': return <AlertTriangle size={16} />;
    case 'error': return <AlertTriangle size={16} />;
    default: return <Radio size={16} />;
  }
};

const SystemHealth: React.FC<{ store: any }> = ({ store }) => {
  const [trigger, setTrigger] = useState(Date.now());

  const activeYear = useMemo(() => {
    return store.years?.find((y: any) => y.Year_ID === store.workingYearId) || store.activeYear || null;
  }, [store.years, store.workingYearId, store.activeYear]);

  const computed = useMemo(() => {
    const students = store.students || [];
    const receipts = store.receipts || [];
    const journalEntries = store.journalEntries || [];
    const accounts = store.accounts || [];
    const reportConfigs = store.reportConfigs || [];

    const activeYearStatus: Status = activeYear ? 'success' : 'error';

    const studentsWithYear = students.filter((s: any) => s.Academic_Year_ID === store.workingYearId);
    const studentsLinkStatus: Status = students.length === 0 ? 'unknown'
      : studentsWithYear.length === students.length ? 'success'
      : studentsWithYear.length > 0 ? 'warning' : 'error';

    const approvedInvoices = receipts.filter((r: any) => r.Is_Approved === true || r.Approved === true);
    const invoicesStatus: Status = receipts.length === 0 ? 'unknown'
      : approvedInvoices.length === receipts.length ? 'success'
      : approvedInvoices.length > 0 ? 'warning' : 'error';

    const balancedEntries = journalEntries.filter((j: any) => {
      if (j.TotalDebit !== undefined && j.TotalCredit !== undefined) return j.TotalDebit === j.TotalCredit;
      if (Array.isArray(j.Lines)) {
        const debit = j.Lines.reduce((acc: number, l: any) => acc + (l.Debit || 0), 0);
        const credit = j.Lines.reduce((acc: number, l: any) => acc + (l.Credit || 0), 0);
        return debit === credit;
      }
      return false;
    });
    const journalStatus: Status = journalEntries.length === 0 ? 'unknown'
      : balancedEntries.length === journalEntries.length ? 'success'
      : balancedEntries.length > 0 ? 'warning' : 'error';

    const studentAccountsExist = accounts.some((a: any) => typeof a.name === 'string' && a.name.includes('الطلاب'));
    const studentAccountsStatus: Status = accounts.length === 0 ? 'unknown' : (studentAccountsExist ? 'success' : 'warning');

    const printConfigCoverage = (() => {
      const totalCats = reportConfigs.length || 0;
      if (totalCats === 0) return { percent: 0, status: 'unknown' as Status };
      const withReports = reportConfigs.filter((c: any) => (c.Available_Reports || []).length > 0).length;
      const percent = Math.round((withReports / totalCats) * 100);
      let status: Status = 'warning';
      if (percent >= 90) status = 'success';
      else if (percent < 50) status = 'error';
      return { percent, status };
    })();

    const overall: Status = [activeYearStatus, studentsLinkStatus, invoicesStatus, journalStatus, studentAccountsStatus, printConfigCoverage.status]
      .includes('error') ? 'error'
      : [activeYearStatus, studentsLinkStatus, invoicesStatus, journalStatus, studentAccountsStatus, printConfigCoverage.status]
          .includes('warning') ? 'warning'
      : 'success';

    const checks = [
      {
        name: 'وجود عام دراسي نشط',
        status: activeYearStatus,
        desc: activeYear ? `العام: ${activeYear?.Year_Name || activeYear?.Name || ''}` : 'لا يوجد عام نشط'
      },
      {
        name: 'ربط الطلاب بالعام النشط',
        status: studentsLinkStatus,
        desc: students.length === 0 ? 'لا يوجد طلاب' : `${studentsWithYear.length}/${students.length} مرتبطين`
      },
      {
        name: 'عدد الفواتير المعتمدة',
        status: invoicesStatus,
        desc: receipts.length === 0 ? 'لا يوجد فواتير/إيصالات' : `${approvedInvoices.length}/${receipts.length} معتمد`
      },
      {
        name: 'اتزان القيود اليومية',
        status: journalStatus,
        desc: journalEntries.length === 0 ? 'لا توجد قيود' : `${balancedEntries.length}/${journalEntries.length} متزنة`
      },
      {
        name: 'وجود حسابات الطلاب بدليل الحسابات',
        status: studentAccountsStatus,
        desc: studentAccountsExist ? 'حسابات الطلاب موجودة' : 'لم يتم العثور على حسابات الطلاب'
      },
      {
        name: 'تغطية إعدادات الطباعة PrintEngine',
        status: printConfigCoverage.status,
        desc: reportConfigs.length === 0 ? 'لا توجد إعدادات' : `تغطية ${printConfigCoverage.percent}%`
      }
    ];

    const log = checks
      .filter((c) => c.status === 'warning' || c.status === 'error' || c.status === 'unknown')
      .map((c, idx) => ({
        id: idx,
        date: new Date().toLocaleString('ar-EG'),
        severity: c.status,
        module: 'تشخيص',
        message: `${c.name}: ${c.desc}`
      }));

    const summary = {
      overall,
      activeYearStatus,
      studentsLinkStatus,
      invoicesStatus,
      journalStatus,
      studentAccountsStatus,
      printConfigCoverage
    };

    return { checks, log, summary };
  }, [activeYear, store.students, store.receipts, store.journalEntries, store.accounts, store.reportConfigs, store.workingYearId, trigger]);

  const exportReport = () => {
    const data = {
      generatedAt: new Date().toISOString(),
      summary: computed.summary,
      checks: computed.checks
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-health-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusCard = (title: string, status: Status, desc: string, icon: React.ReactNode) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${statusColor[status]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500 font-bold">{title}</p>
        <p className="text-sm font-black text-slate-800 flex items-center gap-2">
          <span className={statusColor[status].split(' ')[0]}>{statusLabel[status]}</span>
          <span className="text-[11px] text-slate-400">{desc}</span>
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500" dir="rtl">
      <header className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col gap-2">
        <h1 className="text-2xl font-black text-slate-900">مراقبة حالة النظام</h1>
        <p className="text-sm text-slate-500 font-bold">لوحة تشخيص ومتابعة حالة النظام</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statusCard('الحالة العامة', computed.summary.overall, '', <Shield size={20} />)}
        {statusCard('العام الدراسي النشط', computed.summary.activeYearStatus, activeYear?.Year_Name || activeYear?.Name || 'غير محدد', <Activity size={20} />)}
        {statusCard('اتزان القيود', computed.summary.journalStatus, 'مقارنة إجمالي المدين/الدائن', <Radio size={20} />)}
        {statusCard('الفواتير المعتمدة', computed.summary.invoicesStatus, 'إيصالات/فواتير', <CheckCircle2 size={20} />)}
        {statusCard('ربط الطلاب بالعام', computed.summary.studentsLinkStatus, 'تحقق من Academic_Year_ID', <AlertTriangle size={20} />)}
        {statusCard('تغطية الطباعة', computed.summary.printConfigCoverage.status, `${computed.summary.printConfigCoverage.percent || 0}%`, <Printer size={20} />)}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">فحوصات الصحة</h3>
            <p className="text-xs text-slate-500 font-bold">نتائج الفحوصات الحالية</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTrigger(Date.now())}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold flex items-center gap-2 hover:bg-slate-50"
            >
              <RefreshCcw size={16} /> إعادة الفحص
            </button>
            <button
              onClick={() => setTrigger(Date.now())}
              className="px-4 py-2 rounded-xl border border-indigo-200 text-indigo-700 font-bold flex items-center gap-2 hover:bg-indigo-50"
            >
              <Printer size={16} /> التحقق من ربط الطباعة
            </button>
            <button
              onClick={exportReport}
              className="px-4 py-2 rounded-xl border border-emerald-200 text-emerald-700 font-bold flex items-center gap-2 hover:bg-emerald-50"
            >
              <FileJson size={16} /> تصدير JSON
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold">
              <tr>
                <th className="p-3 text-right">الفحص</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">الوصف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {computed.checks.map((check, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="p-3 font-black text-slate-800">{check.name}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${statusColor[check.status]}`}>
                      {statusIcon(check.status)}
                      {statusLabel[check.status]}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 text-sm">{check.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">سجل التحذيرات والأخطاء</h3>
            <p className="text-xs text-slate-500 font-bold">عرض للقراءة فقط</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold">
              <tr>
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">الشدة</th>
                <th className="p-3 text-right">الوحدة</th>
                <th className="p-3 text-right">الرسالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {computed.log.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-400 font-bold">لا توجد تحذيرات حالياً</td>
                </tr>
              )}
              {computed.log.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="p-3 whitespace-nowrap">{item.date}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${statusColor[item.severity as Status]}`}>
                      {statusIcon(item.severity as Status)}
                      {statusLabel[item.severity as Status]}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">{item.module}</td>
                  <td className="p-3 text-slate-600">{item.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
