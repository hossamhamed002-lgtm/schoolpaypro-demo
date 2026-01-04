import React, { useMemo, useRef, useState } from 'react';
import { Plus, Save, ShieldCheck, CalendarDays, School, KeyRound, UserCog, LogIn, RefreshCw } from 'lucide-react';
import { loadFromStorage, saveToStorage } from '../../db_engine';
import { INITIAL_STATE, SYSTEM_MODULES } from '../../store';
import { UserRole } from '../../types';

interface SchoolEntry {
  id: string;
  name: string;
  code: string;
  adminUsername?: string;
  adminPassword?: string;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  whatsappPhone?: string;
  emailAddress?: string;
  allowedModules: string[];
  school_uid?: string;
}

const loadDirectory = (): SchoolEntry[] => {
  const raw = sessionStorage.getItem('SchoolPay_Pro_Directory');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SchoolEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveDirectory = (items: SchoolEntry[]) => {
  try {
    sessionStorage.setItem('SchoolPay_Pro_Directory', JSON.stringify(items));
  } catch {
    // ignore quota or serialization errors
  }
};

const normalizeCode = (value: string) => value.trim().toUpperCase();
const generateUid = () => {
  const g: any = (typeof crypto !== 'undefined' && crypto) || (typeof window !== 'undefined' ? (window as any).crypto : null);
  if (g?.randomUUID) return g.randomUUID();
  return `sch-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
};

const buildDefaultModules = () => SYSTEM_MODULES.filter((m) => m.id !== 'programmer').map((m) => m.id);

const SCHOOL_CODE_SEQ_KEY = 'SCHOOL_CODE_SEQ_V1';

function generateSchoolCode(): string {
  const raw = localStorage.getItem(SCHOOL_CODE_SEQ_KEY);
  const next = raw ? parseInt(raw, 10) + 1 : 1000;

  localStorage.setItem(SCHOOL_CODE_SEQ_KEY, String(next));
  return `SCH-${String(next).padStart(4, '0')}`;
}

const upsertAdminUser = (base: any, scopedCode: string, adminUsername?: string, adminPassword?: string) => {
  if (!adminUsername || !adminPassword) return base;
  const adminId = `ADMIN-${scopedCode}`;
  const users = base.users || [];
  const nextUsers = users.some((u: any) => u.User_ID === adminId)
    ? users.map((u: any) => (u.User_ID === adminId ? {
      ...u,
      Username: adminUsername,
      Password_Hash: adminPassword,
      Role: UserRole.ADMIN,
      Is_Active: true
    } : u))
    : [{
      User_ID: adminId,
      Emp_ID: '',
      Username: adminUsername,
      Password_Hash: adminPassword,
      Role: UserRole.ADMIN,
      Is_Active: true,
      Permissions: []
    }, ...users];
  return { ...base, users: nextUsers };
};

const createScopedSchool = (code: string, name: string, payload: Partial<SchoolEntry>) => {
  const scopedCode = normalizeCode(code);
  let base = loadFromStorage(INITIAL_STATE, scopedCode);
  const school = base.schools?.[0] || {
    School_ID: `SCH-${Date.now()}`,
    Name: name || 'مدرسة جديدة',
    Logo: '',
    Address: '',
    Subscription_Plan: ''
  };

  base = upsertAdminUser(base, scopedCode, payload.adminUsername, payload.adminPassword);
  const next = {
    ...base,
    schools: [{
      ...school,
      Name: name || school.Name,
      School_Code: scopedCode,
      Admin_Username: payload.adminUsername || school.Admin_Username,
      WhatsApp_Number: payload.whatsappPhone || school.WhatsApp_Number,
      Email_Address: payload.emailAddress || school.Email_Address,
      Allowed_Modules: payload.allowedModules || school.Allowed_Modules || buildDefaultModules(),
      Subscription_Start: payload.subscriptionStart || school.Subscription_Start,
      Subscription_End: payload.subscriptionEnd || school.Subscription_End,
      school_uid: payload.school_uid || school.school_uid || generateUid()
    }]
  };

  saveToStorage(next, scopedCode);
};

const SchoolsManager: React.FC<{ store: any }> = ({ store }) => {
  const { lang } = store;
  const isRtl = lang === 'ar';
  const moduleOptions = SYSTEM_MODULES.filter((m) => m.id !== 'programmer');

  const [schools, setSchools] = useState<SchoolEntry[]>(() => loadDirectory());
  const [activeId, setActiveId] = useState<string | null>(schools[0]?.id || null);
  const activeSchool = useMemo(() => schools.find((s) => s.id === activeId) || null, [schools, activeId]);

  const [form, setForm] = useState<SchoolEntry>(() => ({
    id: '',
    name: '',
    code: '',
    adminUsername: '',
    adminPassword: '',
    subscriptionStart: '',
    subscriptionEnd: '',
    whatsappPhone: '',
    emailAddress: '',
    allowedModules: buildDefaultModules(),
    school_uid: generateUid()
  }));
  const [rebindCode, setRebindCode] = useState('');
  const [rebindUid, setRebindUid] = useState('');
  const canRebind = Boolean(store?.rebindSchoolUID);
  const codeRef = useRef<string | null>(null);

  const resetForm = (data?: SchoolEntry) => {
    if (data) {
      setForm({
        ...data,
        allowedModules: data.allowedModules?.length ? data.allowedModules : buildDefaultModules()
      });
      return;
    }
    setForm({
      id: '',
      name: '',
      code: '',
      adminUsername: '',
      adminPassword: '',
      subscriptionStart: '',
      subscriptionEnd: '',
      whatsappPhone: '',
      emailAddress: '',
      allowedModules: buildDefaultModules(),
      school_uid: generateUid()
    });
  };

  const handleSelect = (id: string) => {
    setActiveId(id);
    const found = schools.find((s) => s.id === id);
    if (found) resetForm(found);
  };

  const handleAdd = () => {
    const generatedCode = generateSchoolCode();
    codeRef.current = generatedCode;
    resetForm({ ...form, id: '', code: generatedCode });
    setActiveId(null);
  };

  const handleEnterSchool = (school: SchoolEntry) => {
    if (!school.adminUsername || !school.adminPassword) {
      alert(isRtl ? 'بيانات مدير المدرسة غير مكتملة.' : 'Admin credentials are missing.');
      return;
    }
    const result = store.enterSchoolAsAdmin?.(school.code, school.adminUsername, school.adminPassword);
    if (result && !result.ok) {
      alert(result.error || (isRtl ? 'تعذر تسجيل الدخول.' : 'Login failed.'));
    }
  };

  const handleSave = () => {
    const name = form.name.trim();
    const code = normalizeCode(form.code || codeRef.current || generateSchoolCode());
    const payload = { ...form, name, code, school_uid: form.school_uid || generateUid() };

    if (!name) {
      alert(isRtl ? 'اسم المدرسة مطلوب.' : 'School name is required.');
      return;
    }
    if (!form.adminUsername || !form.adminPassword) {
      alert(isRtl ? 'بيانات مدير المدرسة مطلوبة.' : 'Admin credentials are required.');
      return;
    }

    const exists = schools.find((s) => s.code === code && s.id !== form.id);
    if (exists) {
      alert(isRtl ? 'كود المدرسة مستخدم بالفعل.' : 'School code already exists.');
      return;
    }

    let next: SchoolEntry[];
    if (form.id) {
      next = schools.map((s) => (s.id === form.id ? payload : s));
    } else {
      const newEntry = { ...payload, id: `DIR-${Date.now()}` };
      next = [newEntry, ...schools];
      payload.id = newEntry.id;
    }

    setSchools(next);
    saveDirectory(next);
    createScopedSchool(code, name, payload);
    setActiveId(payload.id);
    resetForm(payload);
  };

  const isExpired = (date?: string) => {
    if (!date) return false;
    const end = new Date(date);
    if (Number.isNaN(end.getTime())) return false;
    const now = new Date();
    return end < new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };

  const toggleModule = (id: string) => {
    setForm((prev) => {
      const exists = prev.allowedModules.includes(id);
      const allowedModules = exists
        ? prev.allowedModules.filter((m) => m !== id)
        : [...prev.allowedModules, id];
      return { ...prev, allowedModules };
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <School className="text-indigo-600" />
            <h3 className="text-lg font-black text-slate-800">{isRtl ? 'قائمة المدارس' : 'Schools List'}</h3>
          </div>
          <button onClick={handleAdd} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100">
            <Plus size={18} />
          </button>
        </div>
        <div className="max-h-[600px] overflow-y-auto custom-scrollbar divide-y divide-slate-50">
          {schools.length === 0 && (
            <div className="p-10 text-center text-slate-400 font-bold">
              {isRtl ? 'لا توجد مدارس مسجلة بعد' : 'No schools yet'}
            </div>
          )}
          {schools.map((school) => (
            <div
              key={school.id}
              onClick={() => handleSelect(school.id)}
              role="button"
              className={`w-full text-start px-6 py-4 flex items-center justify-between gap-3 transition ${
                activeId === school.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm">{school.name}</p>
                <p className={`text-[10px] font-bold ${activeId === school.id ? 'text-indigo-100' : 'text-slate-400'}`}>{school.code}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-black ${isExpired(school.subscriptionEnd) ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {isExpired(school.subscriptionEnd) ? (isRtl ? 'منتهي' : 'Expired') : (isRtl ? 'نشط' : 'Active')}
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleEnterSchool(school);
                  }}
                  className={`px-3 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 border transition ${
                    activeId === school.id
                      ? 'bg-white text-indigo-600 border-white/70'
                      : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
                  }`}
                >
                  <LogIn size={12} /> {isRtl ? 'دخول' : 'Enter'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <KeyRound className="text-indigo-600" />
            <h3 className="text-xl font-black text-slate-800">{isRtl ? 'إدارة بيانات المدرسة' : 'School Details'}</h3>
          </div>
          <div className="flex items-center gap-2">
            {store?.programmerMode && store?.schoolCode && (
              <button
                type="button"
                onClick={() => {
                  const confirmed = window.confirm(isRtl
                    ? 'سيتم ربط بيانات المدرسة الحالية بالمعرّف الثابت. لن يتم حذف أي بيانات. هل أنت متأكد؟'
                    : 'Current school data will be rebound to the stable UID. No data will be deleted. Are you sure?');
                  if (!confirmed) return;
                  const ok = store.rebindCurrentSchoolToUID?.();
                  if (!ok) {
                    alert(isRtl ? 'تعذر إعادة الربط. تحقق من الكود/المعرف.' : 'Rebind failed. Check code/UID.');
                  }
                }}
                className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-black flex items-center gap-2 border border-emerald-100 hover:bg-emerald-100"
              >
                <RefreshCw size={16} /> {isRtl ? 'إعادة ربط بيانات المدرسة (UID Rebind)' : 'Rebind School Data (UID)'}
              </button>
            )}
            <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black flex items-center gap-2 hover:bg-indigo-700">
              <Save size={18} /> {isRtl ? 'حفظ' : 'Save'}
            </button>
          </div>
        </div>

        <div className={`rounded-2xl border ${canRebind ? 'border-amber-100 bg-amber-50/60' : 'border-slate-200 bg-slate-50/80'} p-4 space-y-3`}>
          <div className={`flex items-center gap-2 font-black text-sm ${canRebind ? 'text-amber-800' : 'text-slate-500'}`}>
            <RefreshCw size={16} /> {isRtl ? 'إعادة ربط كود بــ UID يدويًا' : 'Manual UID Rebind'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest">
                {isRtl ? 'كود المدرسة' : 'School Code'}
              </label>
              <input
                type="text"
                value={rebindCode}
                onChange={(e) => setRebindCode(e.target.value)}
                className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-200"
                placeholder="SCH-001"
                disabled={!canRebind}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest">
                {isRtl ? 'المعرّف الثابت (UID)' : 'Target UID'}
              </label>
              <input
                type="text"
                value={rebindUid}
                onChange={(e) => setRebindUid(e.target.value)}
                className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 font-bold text-sm outline-none focus:ring-2 focus:ring-amber-200"
                placeholder="uuid"
                disabled={!canRebind}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canRebind}
              onClick={() => {
                const code = (rebindCode || '').trim();
                const uid = (rebindUid || '').trim();
                if (!code || !uid) {
                  alert(isRtl ? 'أدخل الكود والـ UID.' : 'Enter code and UID.');
                  return;
                }
                const confirmed = window.confirm(isRtl
                  ? 'سيتم ربط الكود بالـ UID المحدد. لن يتم حذف أو نقل بيانات. هل أنت متأكد؟'
                  : 'Code will be rebound to the specified UID. No data will be deleted or moved. Continue?');
                if (!confirmed) return;
                const ok = store.rebindSchoolUID?.(code, uid);
                if (!ok) {
                  alert(isRtl ? 'فشل إعادة الربط. تحقق من الكود/الـ UID.' : 'Rebind failed. Check code/UID.');
                } else {
                  alert(isRtl ? 'تم الربط يدوياً بالكود/الـ UID.' : 'Manual rebind completed.');
                }
              }}
              className={`px-4 py-2 rounded-xl font-black flex items-center gap-2 ${canRebind ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
            >
              <RefreshCw size={16} /> {isRtl ? 'تنفيذ إعادة الربط' : 'Rebind Now'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'اسم المدرسة' : 'School Name'}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'كود المدرسة (تلقائي)' : 'School Code (Auto)'}</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder={generateSchoolCode()}
              readOnly
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'اسم المستخدم للمدير' : 'Admin Username'}</label>
            <input
              type="text"
              value={form.adminUsername || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, adminUsername: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'كلمة مرور المدير' : 'Admin Password'}</label>
            <div className="relative">
              <UserCog size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={form.adminPassword || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, adminPassword: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 ps-10 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'رقم واتساب (OTP)' : 'WhatsApp (OTP)'}</label>
            <input
              type="text"
              value={form.whatsappPhone || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, whatsappPhone: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder={isRtl ? 'مثال: +2010xxxxxxx' : 'e.g. +2010xxxxxxx'}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'بريد للـ OTP' : 'Email (OTP)'}</label>
            <input
              type="email"
              value={form.emailAddress || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, emailAddress: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder={isRtl ? 'مثال: school@email.com' : 'e.g. school@email.com'}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'بداية الاشتراك' : 'Subscription Start'}</label>
            <div className="relative">
              <CalendarDays size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={form.subscriptionStart || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, subscriptionStart: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 ps-10 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'نهاية الاشتراك' : 'Subscription End'}</label>
            <div className="relative">
              <CalendarDays size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={form.subscriptionEnd || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, subscriptionEnd: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 ps-10 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-emerald-500" />
            <h4 className="text-sm font-black text-slate-800">{isRtl ? 'صلاحيات الأقسام للمدرسة' : 'Allowed Modules'}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {moduleOptions.map((module) => {
              const checked = form.allowedModules.includes(module.id);
              return (
                <button
                  key={module.id}
                  onClick={() => toggleModule(module.id)}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition ${checked ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200'}`}
                >
                  <span className="text-sm font-black">{store.t[module.labelKey]}</span>
                  <span className={`text-[10px] font-black ${checked ? 'text-emerald-100' : 'text-slate-400'}`}>{checked ? (isRtl ? 'مفعل' : 'Enabled') : (isRtl ? 'معطل' : 'Disabled')}</span>
                </button>
              );
            })}
          </div>
        </div>

        {activeSchool && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-bold text-slate-600">
            {isExpired(activeSchool.subscriptionEnd)
              ? (isRtl ? 'ملاحظة: اشتراك المدرسة منتهي وسيتم تفعيل وضع القراءة فقط لها.' : 'Note: Subscription expired; school is read-only.')
              : (isRtl ? 'الاشتراك نشط، ويمكن للمدرسة العمل بشكل كامل.' : 'Subscription active.')}
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolsManager;
