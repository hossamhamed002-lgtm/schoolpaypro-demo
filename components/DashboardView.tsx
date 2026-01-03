
import React from 'react';
import { 
  Users, 
  GraduationCap, 
  TrendingUp, 
  AlertCircle,
  ArrowUpRight,
  Plus,
  History as HistoryIcon
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useInvoicing } from '../hooks/useInvoicingLogic';

const DashboardView: React.FC<{ store: any, setActiveTab: (tab: any) => void }> = ({ store, setActiveTab }) => {
  const { t, lang } = store;
  const isRtl = lang === 'ar';
  const { invoices } = useInvoicing();

  const formatNumber = (value: number) =>
    new Intl.NumberFormat(isRtl ? 'ar-EG' : 'en-US', { maximumFractionDigits: 2 }).format(value);

  const {
    totalStudents,
    totalReceiptsCount,
    pendingDues,
    chartData
  } = React.useMemo(() => {
    const yearId = String(store.activeYear?.Year_ID || store.workingYearId || '');
    const normalizeId = (value?: string | number) => String(value || '').trim();

    const studentsSource = store.allStudents && store.allStudents.length ? store.allStudents : (store.students || []);
    const students = studentsSource.filter((student: any) => {
      if (!yearId) return true;
      const studentYear = normalizeId(student.Academic_Year_ID || student.Year_ID || '');
      return !studentYear || studentYear === yearId;
    });

    const studentIdOf = (student: any) =>
      normalizeId(student.Student_Global_ID || student.Student_ID || student.Enroll_ID || student.id);

    const studentsById = new Map<string, any>();
    students.forEach((student: any) => {
      const id = studentIdOf(student);
      if (id) studentsById.set(id, student);
    });

    const gradeSource = store.grades || [];
    const gradeById = new Map(gradeSource.map((grade: any) => [normalizeId(grade.Grade_ID), grade]));
    const classSource = store.classes && store.classes.length ? store.classes : (store.allClasses || []);
    const classToGrade = new Map(classSource.map((klass: any) => [normalizeId(klass.Class_ID), normalizeId(klass.Grade_ID)]));

    const invoicesForYear = (invoices || []).filter((invoice: any) => {
      if (invoice.isVoided) return false;
      const invYear = normalizeId(invoice.academicYearId || invoice.Academic_Year_ID || invoice.Year_ID || '');
      if (yearId && invYear && invYear !== yearId) return false;
      return true;
    });

    const receiptsForYear = (store.receipts || []).filter((receipt: any) => {
      const recYear = normalizeId(receipt.Academic_Year_ID || receipt.Year_ID || '');
      if (yearId && recYear && recYear !== yearId) return false;
      return true;
    });

    const invoiceTotalsByStudent = new Map<string, number>();
    invoicesForYear.forEach((invoice: any) => {
      const studentId = normalizeId(invoice.studentId || invoice.Student_ID || invoice.StudentId || '');
      if (!studentId) return;
      const items = invoice.items || invoice.Items || invoice.invoiceItems || [];
      const total = (Array.isArray(items) ? items : []).reduce(
        (sum: number, item: any) => sum + Number(item.amount || item.Amount || 0),
        0
      );
      invoiceTotalsByStudent.set(studentId, (invoiceTotalsByStudent.get(studentId) || 0) + total);
    });

    const receiptTotalsByStudent = new Map<string, number>();
    receiptsForYear.forEach((receipt: any) => {
      if (receipt.Fee_ID === '__CREDIT__') return;
      const studentId = normalizeId(receipt.Enroll_ID || receipt.Student_ID || '');
      if (!studentId) return;
      receiptTotalsByStudent.set(
        studentId,
        (receiptTotalsByStudent.get(studentId) || 0) + Number(receipt.Amount_Paid || 0)
      );
    });

    const totalInvoiceAmount = Array.from(invoiceTotalsByStudent.values()).reduce((sum, value) => sum + value, 0);
    const totalReceiptsAmount = Array.from(receiptTotalsByStudent.values()).reduce((sum, value) => sum + value, 0);

    const gradeStats = new Map<string, { collected: number; due: number }>();
    studentsById.forEach((student, studentId) => {
      const gradeId = normalizeId(
        student.Grade_ID ||
        student.GradeId ||
        student.gradeId ||
        classToGrade.get(normalizeId(student.Class_ID || student.ClassId || student.classId)) ||
        ''
      );
      if (!gradeId) return;
      const total = invoiceTotalsByStudent.get(studentId) || 0;
      const paid = receiptTotalsByStudent.get(studentId) || 0;
      const stat = gradeStats.get(gradeId) || { collected: 0, due: 0 };
      stat.collected += paid;
      stat.due += Math.max(0, total - paid);
      gradeStats.set(gradeId, stat);
    });

    const chartData = gradeSource.map((grade: any) => {
      const gradeId = normalizeId(grade.Grade_ID);
      const stats = gradeStats.get(gradeId) || { collected: 0, due: 0 };
      return {
        name: grade.Grade_Name || gradeId,
        collected: Number(stats.collected.toFixed(2)),
        due: Number(stats.due.toFixed(2))
      };
    });

    return {
      totalStudents: students.length,
      totalReceiptsCount: receiptsForYear.length,
      pendingDues: Number(Math.max(0, totalInvoiceAmount - totalReceiptsAmount).toFixed(2)),
      chartData
    };
  }, [
    store.activeYear?.Year_ID,
    store.workingYearId,
    store.students,
    store.allStudents,
    store.receipts,
    store.grades,
    store.classes,
    store.allClasses,
    invoices
  ]);

  const stats = [
    { label: t.totalStudents, value: formatNumber(totalStudents), icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: t.totalReceipts, value: formatNumber(totalReceiptsCount), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
    { label: t.pendingDues, value: formatNumber(pendingDues), icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: t.staffCount, value: formatNumber(store.employees?.length || 0), icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon size={26} />
              </div>
              <span className="text-xs font-black text-green-500 flex items-center bg-green-50 px-3 py-1 rounded-full border border-green-100">
                +12% <ArrowUpRight size={14} className="ms-1" />
              </span>
            </div>
            <h3 className="text-slate-500 text-sm font-bold tracking-tight">{stat.label}</h3>
            <p className="text-3xl font-black text-slate-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-10">
            <div className="text-start">
              <h3 className="text-xl font-black text-slate-800">{t.feeAnalytics}</h3>
              <p className="text-sm text-slate-400 font-medium">Monthly performance overview</p>
            </div>
            <div className="flex gap-6">
               <div className="flex items-center gap-2">
                 <div className="w-4 h-4 rounded-lg bg-indigo-600"></div>
                 <span className="text-xs font-bold text-slate-600">{t.collected}</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-4 h-4 rounded-lg bg-slate-200"></div>
                 <span className="text-xs font-bold text-slate-600">{t.due}</span>
               </div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#64748b'}} />
                <YAxis orientation={isRtl ? 'right' : 'left'} axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 600, fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', textAlign: 'start'}}
                />
                <Bar dataKey="collected" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={28} />
                <Bar dataKey="due" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <h3 className="text-xl font-black text-slate-800 mb-8">{t.quickActions}</h3>
          <div className="space-y-4">
            <button 
              onClick={() => setActiveTab('students')}
              className="w-full group flex items-center justify-between p-5 bg-indigo-50 hover:bg-indigo-100 rounded-2xl transition-all duration-300"
            >
              <div className="flex items-center gap-4 text-indigo-700">
                <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                <span className="font-black text-sm">{t.enrollNew}</span>
              </div>
              <ArrowUpRight size={18} className="text-indigo-300 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
            <button 
              onClick={() => setActiveTab('finance')}
              className="w-full group flex items-center justify-between p-5 bg-emerald-50 hover:bg-emerald-100 rounded-2xl transition-all duration-300"
            >
              <div className="flex items-center gap-4 text-emerald-700">
                <TrendingUp size={22} />
                <span className="font-black text-sm">{t.recordReceipt}</span>
              </div>
              <ArrowUpRight size={18} className="text-emerald-300 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
            <button 
              onClick={() => setActiveTab('finance')}
              className="w-full group flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all duration-300"
            >
              <div className="flex items-center gap-4 text-slate-700">
                <HistoryIcon size={22} />
                <span className="font-black text-sm">{t.viewLedger}</span>
              </div>
              <ArrowUpRight size={18} className="text-slate-300 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
          </div>

          <div className="mt-10 p-6 bg-amber-50 rounded-[1.5rem] border border-amber-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:scale-125 transition-transform duration-500">
               <AlertCircle size={80} />
            </div>
            <div className="flex gap-4 relative z-10">
              <AlertCircle size={24} className="text-amber-500 flex-shrink-0" />
              <div className="text-start">
                <p className="text-sm font-black text-amber-900 leading-tight">{t.yearEndWarning}</p>
                <p className="text-[11px] text-amber-700 mt-2 font-medium leading-relaxed italic opacity-80">{t.yearEndDesc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
