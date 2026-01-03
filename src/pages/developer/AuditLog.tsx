import React, { useMemo, useState } from 'react';
import { Activity, Filter, Search, RefreshCcw, Download, AlertCircle, List, X } from 'lucide-react';
import { getAuditLogs, AuditLogEntry } from '../../stores/auditLogStore';

const AuditLog: React.FC = () => {
  const [rows] = useState<AuditLogEntry[]>(() => {
    const stored = getAuditLogs();
    return stored.length ? stored : [];
  });
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditLogEntry['actionType'] | 'ALL'>('ALL');
  const [userFilter, setUserFilter] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sortKey, setSortKey] = useState<keyof AuditLogEntry>('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [drawer, setDrawer] = useState<AuditLogEntry | null>(null);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const filtered = useMemo(() => {
    let data = [...rows];
    if (search) {
      const term = search.toLowerCase();
      data = data.filter((r) =>
        `${r.username} ${r.description} ${r.schoolId} ${r.entity} ${r.role}`.toLowerCase().includes(term)
      );
    }
    if (actionFilter !== 'ALL') data = data.filter((r) => r.actionType === actionFilter);
    if (userFilter) data = data.filter((r) => r.username === userFilter);
    if (schoolFilter) data = data.filter((r) => r.schoolId === schoolFilter);
    if (yearFilter) data = data.filter((r) => r.academicYearId === yearFilter);
    if (fromDate) data = data.filter((r) => new Date(r.timestamp) >= new Date(fromDate));
    if (toDate) data = data.filter((r) => new Date(r.timestamp) <= new Date(toDate));

    data.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (sortKey === 'timestamp') {
        return sortDir === 'asc'
          ? new Date(aVal).getTime() - new Date(bVal).getTime()
          : new Date(bVal).getTime() - new Date(aVal).getTime();
      }
      return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
    return data;
  }, [rows, search, actionFilter, userFilter, schoolFilter, yearFilter, sortKey, sortDir, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const unique = <T extends keyof AuditLogEntry>(key: T) =>
    Array.from(new Set(rows.map((r) => r[key]).filter(Boolean))) as string[];

  const sortBy = (key: keyof AuditLogEntry) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const exportCsv = () => {
    const headers = ['timestamp','username','role','school','year','action','entity','description','ip','severity'];
    const csvRows = filtered.map((r) => [
      r.timestamp,
      r.username,
      r.role,
      r.schoolId,
      r.academicYearId,
      r.actionType,
      r.entity,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      `${r.ipAddress || ''} / ${r.device || ''}`,
      r.severity
    ].join(','));
    const content = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    // استخدام CSV بتنسيق .xls كتصدير بسيط بدون مكتبات إضافية
    const headers = ['التاريخ', 'المستخدم', 'الدور', 'المدرسة', 'السنة', 'العملية', 'الكيان', 'الوصف', 'IP/الجهاز', 'المستوى'];
    const rowsData = filtered.map((r) => [
      new Date(r.timestamp).toLocaleString('ar-EG'),
      r.username,
      r.role,
      r.schoolId,
      r.academicYearId,
      r.actionType,
      r.entity,
      r.description,
      `${r.ipAddress || ''} / ${r.device || ''}`,
      r.severity
    ]);
    const table = [headers, ...rowsData];
    const csv = table.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-log.xls';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Activity />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">سجل الأحداث (Audit Log)</h1>
          <p className="text-sm text-slate-500 font-bold">عرض جميع العمليات المهمة التي تمت داخل النظام (للمراجعة فقط)</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex-1 min-w-[240px]">
            <Search size={16} className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث عام"
              className="bg-transparent w-full text-sm font-bold text-slate-700 outline-none"
            />
          </div>
          <button
            onClick={() => setPage(1)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
          >
            <RefreshCcw size={16} /> تحديث
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as AuditLogEntry['actionType'] | 'ALL')}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none"
            >
              <option value="ALL">كل العمليات</option>
              <option value="CREATE">إضافة</option>
              <option value="UPDATE">تعديل</option>
              <option value="DELETE">حذف</option>
              <option value="APPROVE">اعتماد</option>
              <option value="LOGIN">دخول/خروج</option>
              <option value="PRINT">طباعة</option>
              <option value="SYSTEM">نظام</option>
            </select>
          </div>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none"
          >
            <option value="">كل المستخدمين</option>
            {unique('username').map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none"
          >
            <option value="">كل المدارس</option>
            {unique('schoolId').map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none"
          >
            <option value="">كل الأعوام</option>
            {unique('academicYearId').map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none"
            placeholder="من تاريخ"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none"
            placeholder="إلى تاريخ"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead className="bg-slate-50 text-slate-500 font-bold">
              <tr>
                <th className="p-3 text-right cursor-pointer" onClick={() => sortBy('timestamp')}>التاريخ والوقت</th>
                <th className="p-3 text-right cursor-pointer" onClick={() => sortBy('username')}>المستخدم</th>
                <th className="p-3 text-right">الدور</th>
                <th className="p-3 text-right">المدرسة</th>
                <th className="p-3 text-right">السنة</th>
                <th className="p-3 text-right cursor-pointer" onClick={() => sortBy('actionType')}>نوع العملية</th>
                <th className="p-3 text-right">الكيان</th>
                <th className="p-3 text-right">الوصف</th>
                <th className="p-3 text-right">IP / الجهاز</th>
                <th className="p-3 text-right">مستوى الخطورة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!visible.length && (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-400 font-bold">
                    لا توجد أحداث مسجلة
                  </td>
                </tr>
              )}
              {visible.map((row, idx) => {
                const rowColor =
                  row.actionType === 'CREATE'
                    ? 'bg-emerald-50/40'
                    : row.actionType === 'UPDATE'
                    ? 'bg-amber-50/40'
                    : row.actionType === 'DELETE'
                    ? 'bg-rose-50/40'
                    : row.actionType === 'APPROVE'
                    ? 'bg-blue-50/40'
                    : 'bg-white';
                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-slate-50 cursor-pointer ${rowColor}`}
                    onClick={() => setDrawer(row)}
                  >
                    <td className="p-3 text-slate-700 font-bold whitespace-nowrap">
                      {new Date(row.timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="p-3 font-bold text-slate-800">{row.username}</td>
                    <td className="p-3 text-slate-600">{row.role}</td>
                    <td className="p-3 text-slate-700 font-bold">{row.schoolId}</td>
                    <td className="p-3 text-slate-700 font-bold">{row.academicYearId}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-100 text-slate-700">
                        {row.actionType}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 font-bold">{row.entity}</td>
                    <td className="p-3 text-slate-600">{row.description}</td>
                    <td className="p-3 text-slate-600">{row.ipAddress || ''} / {row.device || ''}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                        row.severity === 'HIGH' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                        row.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}>
                        {row.severity}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-3 border-t border-slate-100 gap-3">
          <div className="text-xs text-slate-500 font-bold">إجمالي السجلات: {filtered.length}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCsv}
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 inline-flex items-center gap-2"
            >
              <Download size={14} /> CSV
            </button>
            <button
              onClick={exportExcel}
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 inline-flex items-center gap-2"
            >
              <Download size={14} /> Excel
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
            >
              السابق
            </button>
            <span className="text-xs text-slate-500 font-bold">Page {page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40"
            >
              التالي
            </button>
          </div>
        </div>
      </div>

      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-end z-50">
          <div className="w-full max-w-lg h-full bg-white shadow-2xl border-l border-slate-200 animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <List className="text-slate-500" size={18} />
                <div>
                  <p className="text-sm font-black text-slate-900">تفاصيل العملية</p>
                  <p className="text-[11px] text-slate-500 font-bold">{drawer.id}</p>
                </div>
              </div>
              <button onClick={() => setDrawer(null)} className="p-2 rounded-full hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3 text-sm text-slate-700">
            <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-slate-500 font-bold">المستخدم</span><p className="font-black">{drawer.username}</p></div>
                <div><span className="text-xs text-slate-500 font-bold">نوع العملية</span><p className="font-black">{drawer.actionType}</p></div>
                <div><span className="text-xs text-slate-500 font-bold">المدرسة</span><p className="font-black">{drawer.schoolId}</p></div>
                <div><span className="text-xs text-slate-500 font-bold">السنة</span><p className="font-black">{drawer.academicYearId}</p></div>
                <div><span className="text-xs text-slate-500 font-bold">التاريخ</span><p className="font-black">{new Date(drawer.timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</p></div>
                <div><span className="text-xs text-slate-500 font-bold">IP / الجهاز</span><p className="font-black">{drawer.ipAddress || ''} / {drawer.device || ''}</p></div>
                <div><span className="text-xs text-slate-500 font-bold">الكيان</span><p className="font-black">{drawer.entity}</p></div>
            </div>
            <div>
                <span className="text-xs text-slate-500 font-bold">الوصف</span>
                <p className="font-bold text-slate-800 mt-1">{drawer.description}</p>
            </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 font-mono text-xs text-slate-600 overflow-auto max-h-64">
                <pre>{JSON.stringify(drawer, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLog;
