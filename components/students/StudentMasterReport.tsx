import React, { useMemo, useState, useEffect } from 'react';
import { Settings, Eye, Printer, X, Filter } from 'lucide-react';

type ReportSettings = {
  paperSize: 'A4' | 'A3';
  orientation: 'portrait' | 'landscape';
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
};

const SETTINGS_KEY = 'STUDENT_MASTER_REPORT_SETTINGS';

const StudentMasterReport: React.FC<{ store: any }> = ({ store }) => {
  const { stages = [], grades = [], classes = [], students = [], allStudents = [], activeYear, activeSchool } = store;
  const schoolName = activeSchool?.School_Name || activeSchool?.name || 'المدرسة';
  const academicYear = activeYear?.AcademicYear_Name || activeYear?.Name || activeYear?.name || '';

  const [filters, setFilters] = useState({
    yearId: '',
    stageId: '',
    gradeId: '',
    classId: '',
    status: ''
  });

  const defaultSettings: ReportSettings = {
    paperSize: 'A4',
    orientation: 'portrait',
    fontFamily: 'Cairo, Arial, sans-serif',
    fontSize: '12px',
    lineHeight: '1.5'
  };
  const [settings, setSettings] = useState<ReportSettings>(defaultSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings({ ...defaultSettings, ...JSON.parse(raw) });
    } catch {
      setSettings(defaultSettings);
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setShowSettings(false);
  };

  const sourceStudents = allStudents && allStudents.length ? allStudents : students || [];

  const filteredStudents = useMemo(() => {
    return sourceStudents.filter((s: any) => {
      const yr = s.Academic_Year_ID || s.academicYearId;
      const stageId = s.Stage_ID || s.stageId;
      const gradeId = s.Grade_ID || s.gradeId;
      const classId = s.Class_ID || s.classId;
      const status = (s.Status || s.Student_Status || s.status || '').toString().toLowerCase();
      if (filters.yearId && String(yr) !== String(filters.yearId)) return false;
      if (filters.stageId && String(stageId) !== String(filters.stageId)) return false;
      if (filters.gradeId && String(gradeId) !== String(filters.gradeId)) return false;
      if (filters.classId && String(classId) !== String(filters.classId)) return false;
      if (filters.status && status !== filters.status.toLowerCase()) return false;
      return true;
    });
  }, [sourceStudents, filters]);

  const handlePrint = () => {
    window.print();
  };

  const headerInfo = {
    school: schoolName,
    year: academicYear,
    title: 'تقرير بيانات الطلاب الشامل'
  };

  const renderTable = (data: any[]) => (
    <table className="w-full text-sm border-collapse" style={{ fontFamily: settings.fontFamily, fontSize: settings.fontSize, lineHeight: settings.lineHeight }}>
      <thead className="bg-slate-50 text-slate-600 font-black text-[11px]">
        <tr>
          <th className="border border-slate-200 px-2 py-2">كود الطالب</th>
          <th className="border border-slate-200 px-2 py-2">الاسم الكامل</th>
          <th className="border border-slate-200 px-2 py-2">الرقم القومي</th>
          <th className="border border-slate-200 px-2 py-2">المرحلة</th>
          <th className="border border-slate-200 px-2 py-2">الصف</th>
          <th className="border border-slate-200 px-2 py-2">الفصل</th>
          <th className="border border-slate-200 px-2 py-2">تاريخ الميلاد</th>
          <th className="border border-slate-200 px-2 py-2">النوع</th>
          <th className="border border-slate-200 px-2 py-2">هاتف ولي الأمر</th>
          <th className="border border-slate-200 px-2 py-2">الحالة</th>
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr><td colSpan={10} className="border border-slate-200 px-2 py-3 text-center text-slate-400 font-bold">لا توجد بيانات</td></tr>
        ) : (
          data.map((s: any, idx: number) => (
            <tr key={s.Student_ID || s.id || idx} className="hover:bg-slate-50">
              <td className="border border-slate-200 px-2 py-1">{s.Student_Code || s.code || s.id || '—'}</td>
              <td className="border border-slate-200 px-2 py-1 font-semibold text-slate-800">{s.Student_FullName || s.Full_Name || s.name || s.fullName || '—'}</td>
              <td className="border border-slate-200 px-2 py-1">{s.National_ID || s.NationalId || s.nationalId || '—'}</td>
              <td className="border border-slate-200 px-2 py-1">{s.Stage_Name || s.stageName || stages.find((st: any) => String(st.Stage_ID) === String(s.Stage_ID))?.Stage_Name || '—'}</td>
              <td className="border border-slate-200 px-2 py-1">{s.Grade_Name || s.gradeName || grades.find((g: any) => String(g.Grade_ID) === String(s.Grade_ID))?.Grade_Name || '—'}</td>
              <td className="border border-slate-200 px-2 py-1">{s.Class_Name || s.className || classes.find((c: any) => String(c.Class_ID) === String(s.Class_ID))?.Class_Name || '—'}</td>
              <td className="border border-slate-200 px-2 py-1">{s.Birth_Date || s.birthDate || '—'}</td>
              <td className="border border-slate-200 px-2 py-1">{s.Gender || s.gender || '—'}</td>
              <td className="border border-slate-200 px-2 py-1">{s.Guardian_Phone || s.guardianPhone || s.Phone || s.Guardian_Mobile || '—'}</td>
              <td className="border border-slate-200 px-2 py-1">{s.Status || s.Student_Status || s.status || '—'}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 space-y-6" dir="rtl">
      <style>{`
        @media print {
          @page {
            size: ${settings.paperSize} ${settings.orientation};
            margin: 8mm;
          }
          body { background: white; }
          #student-master-report { box-shadow: none !important; border: none !important; }
          .no-print { display: none !important; }
          .print-footer { position: fixed; display: block !important; bottom: 5mm; left: 8mm; right: 8mm; font-size: 10px; color: #64748b; }
          .print-footer .page-num:after { content: counter(page); }
        }
      `}</style>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-start">
          <h3 className="text-2xl font-black text-slate-900">تقرير بيانات الطلاب الشامل</h3>
          <p className="text-sm text-slate-500 font-bold">عرض شامل لبيانات الطلاب مع الفلاتر والإعدادات</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button
            onClick={() => setShowSettings(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700"
          >
            <Settings size={16} /> الإعدادات
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700"
          >
            <Eye size={16} /> معاينة
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700"
          >
            <Printer size={16} /> طباعة
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 no-print">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Filter size={12}/> العام الدراسي</label>
          <select
            value={filters.yearId}
            onChange={(e) => setFilters((p) => ({ ...p, yearId: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
          >
            <option value="">الكل</option>
            {store.years?.map((y: any) => (
              <option key={y.Year_ID || y.id} value={y.Year_ID || y.id}>{y.AcademicYear_Name || y.Name || y.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Filter size={12}/> المرحلة</label>
          <select
            value={filters.stageId}
            onChange={(e) => setFilters((p) => ({ ...p, stageId: e.target.value, gradeId: '', classId: '' }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
          >
            <option value="">الكل</option>
            {stages.map((st: any) => (
              <option key={st.Stage_ID} value={st.Stage_ID}>{st.Stage_Name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Filter size={12}/> الصف</label>
          <select
            value={filters.gradeId}
            onChange={(e) => setFilters((p) => ({ ...p, gradeId: e.target.value, classId: '' }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
          >
            <option value="">الكل</option>
            {grades.filter((g: any) => !filters.stageId || String(g.Stage_ID) === String(filters.stageId)).map((g: any) => (
              <option key={g.Grade_ID} value={g.Grade_ID}>{g.Grade_Name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Filter size={12}/> الفصل</label>
          <select
            value={filters.classId}
            onChange={(e) => setFilters((p) => ({ ...p, classId: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
          >
            <option value="">الكل</option>
            {classes
              .filter((c: any) => !filters.gradeId || String(c.Grade_ID) === String(filters.gradeId))
              .map((c: any) => (
                <option key={c.Class_ID} value={c.Class_ID}>{c.Class_Name}</option>
              ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Filter size={12}/> الحالة</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
          >
            <option value="">الكل</option>
            <option value="active">مقيد</option>
            <option value="new">مستجد</option>
            <option value="transferred">منقول</option>
            <option value="graduated">متخرج</option>
          </select>
        </div>
      </div>

      <div className="border border-slate-100 rounded-2xl shadow-sm overflow-hidden" id="student-master-report">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-lg font-black text-slate-800">{headerInfo.title}</h4>
            <p className="text-xs text-slate-500 font-bold">العام الدراسي: {academicYear || 'غير محدد'}</p>
          </div>
          <div className="text-end text-xs text-slate-500 font-bold">
            <p>{schoolName}</p>
            <p>عدد الطلاب: {filteredStudents.length}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          {renderTable(filteredStudents)}
        </div>
      </div>

      {/* تذييل الطباعة */}
      <div className="print-footer hidden print:block text-start">
        <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</span>
        <span className="page-num ms-4"> | رقم الصفحة: </span>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-black text-slate-800">إعدادات التقرير</h4>
              <button onClick={() => setShowSettings(false)} className="rounded-full bg-slate-100 px-3 py-2 text-slate-500 font-bold hover:bg-slate-200">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3" dir="rtl">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">حجم الورق</label>
                <select value={settings.paperSize} onChange={(e) => setSettings((p) => ({ ...p, paperSize: e.target.value as any }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">الاتجاه</label>
                <select value={settings.orientation} onChange={(e) => setSettings((p) => ({ ...p, orientation: e.target.value as any }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                  <option value="portrait">طولي</option>
                  <option value="landscape">عرضي</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">الخط</label>
                <input value={settings.fontFamily} onChange={(e) => setSettings((p) => ({ ...p, fontFamily: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">حجم الخط</label>
                <input value={settings.fontSize} onChange={(e) => setSettings((p) => ({ ...p, fontSize: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700" />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-bold text-slate-500">تباعد الأسطر</label>
                <input value={settings.lineHeight} onChange={(e) => setSettings((p) => ({ ...p, lineHeight: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setShowSettings(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold">إلغاء</button>
              <button onClick={saveSettings} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold">حفظ</button>
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-5xl max-h-[90vh] overflow-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xl font-black text-slate-800">{headerInfo.title}</h4>
                <p className="text-sm text-slate-500 font-bold">العام الدراسي: {academicYear || 'غير محدد'}</p>
              </div>
              <button onClick={() => setShowPreview(false)} className="rounded-full bg-slate-100 px-3 py-2 text-slate-500 font-bold hover:bg-slate-200">
                <X size={14} />
              </button>
            </div>
            {renderTable(filteredStudents)}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentMasterReport;
