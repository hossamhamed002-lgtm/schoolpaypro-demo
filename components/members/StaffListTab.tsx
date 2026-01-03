
import React, { useMemo, useState } from 'react';
import {
  Plus, Search, Filter, Printer, Download, Edit3, Trash2, X,
  CheckCircle, Shield, ShieldOff, UserCircle2, UserPlus, Fingerprint, Contact,
  ChevronLeft
} from 'lucide-react';
import { Employee } from '../../types';

interface StaffListTabProps {
  store: any;
  onBack: () => void;
}

const StaffListTab: React.FC<StaffListTabProps> = ({ store, onBack }) => {
  const { t, lang, employees, addEmployee, updateEmployee, deleteEmployee, jobTitles } = store;
  const isRtl = lang === 'ar';
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState<Partial<Employee>>({
    Name_Ar: '', Name_En: '', Username: '', Email: '', Phone: '',
    DOB: '', National_ID: '', Insurance_No: '', Section: '', Level: '',
    Job_ID: '', Is_System_User: false
  });

  const generateUniqueUsername = (fullName: string) => {
    const base = (fullName || 'user').replace(/\s+/g, '.').toLowerCase();
    const existingUsernames = new Set((employees || []).map((e: any) => (e.Username || '').toLowerCase()));
    if (!existingUsernames.has(base)) return base;
    let suffix = 1;
    let candidate = `${base}${suffix}`;
    while (existingUsernames.has(candidate)) {
      suffix += 1;
      candidate = `${base}${suffix}`;
    }
    return candidate;
  };

  const handleSave = () => {
    if (!form.Name_Ar || !form.Job_ID) {
      alert(isRtl ? 'يرجى إدخال الاسم والمسمى الوظيفي' : 'Please enter name and job title');
      return;
    }
    
    const selectedJob = jobTitles.find((j: any) => j.Job_ID === form.Job_ID);
    const current = editingId ? employees.find((e: any) => e.Emp_ID === editingId) : null;

    const payload = {
      ...current,
      ...form,
      Emp_ID: editingId || form.Emp_ID || '',
      Level: selectedJob ? (isRtl ? selectedJob.Title_Ar : selectedJob.Title_En) : (form.Level || current?.Level || '')
    };

    if (payload.Is_System_User && !payload.Username) {
      payload.Username = generateUniqueUsername(payload.Name_Ar || payload.Name_En || 'user');
    }

    if (editingId) {
      updateEmployee(editingId, payload);
    } else {
      addEmployee(payload);
    }
    closeModal();
  };

  const generateEmpId = (nid: string, rowIdx: number) => {
    const uuidLike = typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2, 10);
    const schoolPart =
      (store.activeSchool?.School_Code ||
        store.activeSchool?.Code ||
        store.activeSchool?.ID ||
        store.activeSchool?.id ||
        'SCHOOL').toString();
    return nid ? `EMP-${schoolPart}-${nid}` : `EMP-${schoolPart}-${uuidLike}-${rowIdx}`;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm({
      Name_Ar: '', Name_En: '', Username: '', Email: '', Phone: '',
      DOB: '', National_ID: '', Insurance_No: '', Section: '', Level: '',
      Job_ID: '', Is_System_User: false
    });
  };

  const openEdit = (emp: Employee) => {
    setForm({
      Emp_ID: emp.Emp_ID,
      Name_Ar: emp.Name_Ar || '',
      Name_En: emp.Name_En || '',
      Username: emp.Username || '',
      Email: emp.Email || '',
      Phone: emp.Phone || '',
      DOB: emp.DOB || '',
      National_ID: emp.National_ID || '',
      Insurance_No: emp.Insurance_No || '',
      Section: emp.Section || '',
      Level: emp.Level || '',
      Job_ID: emp.Job_ID || '',
      Is_System_User: !!emp.Is_System_User
    });
    setEditingId(emp.Emp_ID);
    setIsModalOpen(true);
  };

  const filtered = useMemo(() => {
    const q = (searchTerm || '').toLowerCase();
    return (employees || []).filter((e: Employee) => {
      const name = (e.Name_Ar || '').toLowerCase();
      const id = (e.Emp_ID || '').toLowerCase();
      const nid = (e.National_ID || '').toLowerCase();
      return name.includes(q) || id.includes(q) || nid.includes(q);
    });
  }, [employees, searchTerm]);

  const handleDownloadTemplate = () => {
    const headers = ['اسم الموظف','الرقم القومي','رقم الموبايل','الوظيفة','العنوان'];
    const sample = [
      'أحمد محمد',
      '="29801012345678"',
      '="01094981227"',
      'مشرف كنترول',
      'القاهرة - مدينة نصر'
    ];
    const csv = '\uFEFF' + [headers.join(','), sample.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'staff-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rawText = await file.text();
    const text = rawText.replace(/^\uFEFF/, '');
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      alert(isRtl ? 'الملف لا يحتوي بيانات قابلة للاستيراد.' : 'File has no rows.');
      return;
    }

    const detectDelimiter = (sample: string) => {
      if ((sample.match(/;/g) || []).length >= 4) return ';';
      if ((sample.match(/\t/g) || []).length >= 4) return '\t';
      return ',';
    };
    const delimiter = detectDelimiter(lines[0]);
    const rows = lines.slice(1);
    let imported = 0;
    const existingById = new Map<string, any>((employees || []).map((e: any) => [String(e.Emp_ID || '').trim(), e]));
    const existingByNid = new Map<string, any>((employees || []).map((e: any) => [String(e.National_ID || '').trim(), e]));
    const pendingAdds: any[] = [];
    const pendingUpdates = new Map<string, any>();
    const usedIds = new Set<string>(existingById.keys());

    const generateEmpId = (nid: string, rowIdx: number) => {
      // إذا وجد سجل بنفس الرقم القومي، احتفظ بمعرفه ولا تنشئ جديداً
      const existingByNat = nid ? existingByNid.get(nid) : null;
      if (existingByNat?.Emp_ID) return existingByNat.Emp_ID;

      const uuidLike = typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : null;
      const base = uuidLike
        ? `EMP-${uuidLike}`
        : `EMP-${Date.now()}-${rowIdx}-${Math.random().toString(36).slice(2, 8)}`;

      let candidate = base;
      while (usedIds.has(candidate) || pendingAdds.some((p) => p.Emp_ID === candidate) || pendingUpdates.has(candidate)) {
        candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      }
      usedIds.add(candidate);
      return candidate;
    };
    const normalizeCell = (c: string) => {
      const trimmed = c.trim().replace(/^"+|"+$/g, '');
      const eqMatch = trimmed.match(/^="?(.+?)"?$/);
      return eqMatch ? eqMatch[1] : trimmed;
    };

    rows.forEach((line, idx) => {
      const cols = line.split(delimiter).map((c) => c.trim());
      const [name, nid, mobile, job, address] = [
        normalizeCell(cols[0] || ''),
        normalizeCell(cols[1] || ''),
        normalizeCell(cols[2] || ''),
        normalizeCell(cols[3] || ''),
        normalizeCell(cols[4] || '')
      ];
      if (!name) return;
      // اعتمد الرقم القومي كمفتاح رئيسي إن وجد
      const baseEmpId = nid ? `EMP-${nid}` : generateEmpId('', idx + 1);
      const existingByNat = nid ? existingByNid.get(nid) : null;
      const existingByIdMatch = existingById.get(baseEmpId);
      const existing = existingByNat || existingByIdMatch;

      const payload = {
        Emp_ID: existing?.Emp_ID || baseEmpId,
        Name_Ar: name,
        Name_En: existing?.Name_En || '',
        Username: existing?.Username || '',
        Email: existing?.Email || '',
        Phone: mobile || existing?.Phone || '',
        DOB: existing?.DOB || '',
        National_ID: nid || existing?.National_ID || '',
        Insurance_No: existing?.Insurance_No || '',
        Section: address || existing?.Section || '',
        Level: job || existing?.Level || '',
        Job_ID: existing?.Job_ID || '',
        Is_System_User: !!existing?.Is_System_User,
        Is_Active: existing?.Is_Active ?? true
      };

      if (existing) {
        pendingUpdates.set(payload.Emp_ID, payload);
      } else {
        // ضمان فريدة Emp_ID
        let uniqueId = payload.Emp_ID;
        while (existingById.has(uniqueId) || pendingAdds.some((p) => p.Emp_ID === uniqueId) || pendingUpdates.has(uniqueId)) {
          uniqueId = generateEmpId(nid, idx + 1);
        }
        payload.Emp_ID = uniqueId;
        usedIds.add(uniqueId);
        pendingAdds.push(payload);
      }
      imported += 1;
    });

    pendingUpdates.forEach((payload, id) => updateEmployee(id, payload));
    pendingAdds.forEach((payload) => addEmployee(payload));
    alert(isRtl ? `تم استيراد ${imported} سجل (مضاف/محدّث).` : `Imported ${imported} rows (added/updated).`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-start">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all">
            <ChevronLeft size={20} className={isRtl ? 'rotate-180' : ''} />
          </button>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{t.staffList}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{filtered.length} {isRtl ? 'سجل' : 'records'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
           <div className="relative flex-1 min-w-[200px]">
              <Search className={`absolute inset-y-0 ${isRtl ? 'right-4' : 'left-4'} my-auto text-slate-300`} size={18} />
              <input 
                type="text" 
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all`}
              />
           </div>
           <button
             onClick={handleDownloadTemplate}
             className="flex items-center gap-2 border border-slate-200 text-slate-700 px-5 py-3 rounded-2xl font-black text-sm hover:bg-slate-50"
           >
             <Download size={18} />
             {isRtl ? 'تحميل نموذج إكسيل' : 'Download Excel Template'}
           </button>
           <button
             onClick={() => fileInputRef.current?.click()}
             className="flex items-center gap-2 border border-emerald-200 text-emerald-700 px-5 py-3 rounded-2xl font-black text-sm hover:bg-emerald-50"
           >
             <Download size={18} />
             {isRtl ? 'استيراد البيانات' : 'Import Data'}
           </button>
           <input
             type="file"
             accept=".csv, text/csv"
             ref={fileInputRef}
             onChange={handleImport}
             className="hidden"
           />
           <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20">
              <Plus size={18} />
              {t.addStaff}
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-16">#</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.globalId}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الرقم القومي' : 'National ID'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.nameAr}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.jobTitle}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.mobile}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t.isUser}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((emp: Employee, idx: number) => (
                <tr key={`${emp.Emp_ID || 'emp'}-${idx}`} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-center text-xs font-bold text-slate-300">{idx + 1}</td>
                  <td className="px-6 py-4 font-mono text-[10px] font-black text-indigo-500 uppercase tracking-tighter">{emp.Emp_ID}</td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-600">{emp.National_ID || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-indigo-600 font-black shadow-sm group-hover:scale-110 transition-transform">
                        {emp.Name_Ar.charAt(0)}
                      </div>
                      <div className="max-w-[200px]">
                        <p className="text-sm font-black text-slate-800 truncate">{emp.Name_Ar}</p>
                        <p className="text-[10px] text-slate-400 font-bold truncate">{emp.Name_En}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100">
                      {emp.Level}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-500">{emp.Phone}</td>
                  <td className="px-6 py-4 text-center">
                    {emp.Is_System_User ? <Shield size={18} className="text-emerald-500 mx-auto" /> : <ShieldOff size={18} className="text-slate-200 mx-auto" />}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(emp)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit3 size={16} /></button>
                      <button onClick={() => deleteEmployee(emp.Emp_ID)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
               <div className="flex items-center gap-4 text-start">
                  <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    {editingId ? <Edit3 size={28} /> : <UserPlus size={28} />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingId ? t.editStaff : t.addStaff}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Personnel Record</p>
                  </div>
               </div>
               <button onClick={closeModal} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400"><X size={24} /></button>
            </div>

            <div className="p-10 space-y-10">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-start">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{t.nameAr}</label>
                    <input type="text" value={form.Name_Ar} onChange={e => setForm({...form, Name_Ar: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{t.nameEn}</label>
                    <input type="text" value={form.Name_En} onChange={e => setForm({...form, Name_En: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{t.jobTitle}</label>
                    <select value={form.Job_ID} onChange={e => setForm({...form, Job_ID: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none">
                      <option value="">{isRtl ? 'اختر المسمى من الهيكل...' : 'Select Job Title...'}</option>
                      {jobTitles.map((job: any) => (
                        <option key={job.Job_ID} value={job.Job_ID}>{isRtl ? job.Title_Ar : job.Title_En}</option>
                      ))}
                    </select>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-start">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{t.username}</label>
                    <input type="text" value={form.Username} onChange={e => setForm({...form, Username: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{t.mobile}</label>
                    <input type="text" value={form.Phone} onChange={e => setForm({...form, Phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{t.section}</label>
                    <select value={form.Section} onChange={e => setForm({...form, Section: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 font-bold outline-none">
                      <option value="Arabic">Arabic</option>
                      <option value="International">International</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{t.birthday}</label>
                    <input type="date" value={form.DOB} onChange={e => setForm({...form, DOB: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 font-bold outline-none" />
                  </div>
               </div>

               <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-start">
                    <div className={`p-3 rounded-2xl ${form.Is_System_User ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-300'}`}>
                      <Shield size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-sm tracking-tight">{t.isUser}</h4>
                      <p className="text-[10px] text-slate-400 font-medium">سيتم ربط الصلاحيات آلياً حسب المسمى الوظيفي</p>
                    </div>
                  </div>
                  <button onClick={() => setForm({...form, Is_System_User: !form.Is_System_User})} className={`relative w-14 h-8 rounded-full transition-all duration-300 ${form.Is_System_User ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 ${isRtl ? (form.Is_System_User ? 'left-1' : 'left-7') : (form.Is_System_User ? 'right-1' : 'right-7')}`}></div>
                  </button>
               </div>

               <div className="flex gap-4">
                  <button onClick={closeModal} className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest">{t.cancel}</button>
                  <button onClick={handleSave} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl text-xs uppercase tracking-widest">{t.save}</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffListTab;
