import React, { useEffect, useMemo, useState } from 'react';
import { Archive, Download, RefreshCw, Trash2, Database, AlertTriangle, Info } from 'lucide-react';
import { loadFromStorage, saveToStorage } from '../../db_engine';
import { INITIAL_STATE } from '../../store';
import useBackupRestore from '../../hooks/useBackupRestore';

type BackupRecord = {
  id: string;
  schoolCode: string;
  schoolName: string;
  createdAt: string;
  size: number;
  type: 'manual' | 'auto';
  status: 'success' | 'failed' | 'pending';
  createdBy: string;
  notes?: string;
  payload: string; // JSON string snapshot
};

type SchoolEntry = {
  id: string;
  name: string;
  code: string;
};

const DIRECTORY_KEY = 'SchoolPay Pro_V1';
const buildBackupKey = (schoolCode: string) => `BACKUPS__${schoolCode}`;

const loadDirectory = (): SchoolEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DIRECTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readBackups = (schoolCode: string): BackupRecord[] => {
  try {
    const raw = localStorage.getItem(buildBackupKey(schoolCode));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeBackups = (schoolCode: string, items: BackupRecord[]) => {
  localStorage.setItem(buildBackupKey(schoolCode), JSON.stringify(items));
};

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const BackupManager: React.FC<{ store: any }> = ({ store }) => {
  const { currentUser } = store;
  const [schools, setSchools] = useState<SchoolEntry[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolEntry | null>(null);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const { restoreBackup, restorePartial } = useBackupRestore();
  const selectedBackup = useMemo(
    () => backups.find((item) => item.id === selectedBackupId) || null,
    [backups, selectedBackupId]
  );
  const [restoreMode, setRestoreMode] = useState<'full' | 'partial'>('full');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const dependencyMap: Record<string, string[]> = {
    attendance: ['students'],
    ledger: ['accounts'],
    treasury: ['accounts'],
    cheques: ['accounts'],
    students: ['studentsAffairs']
  };

  useEffect(() => {
    setSchools(loadDirectory());
  }, []);

  useEffect(() => {
    if (!selectedSchool) {
      setBackups([]);
      setSelectedBackupId(null);
      return;
    }
    const records = readBackups(selectedSchool.code);
    setBackups(records);
    setSelectedBackupId(null);
  }, [selectedSchool]);

  const handleCreateBackup = () => {
    if (!selectedSchool) return;
    try {
      const db = loadFromStorage(INITIAL_STATE, selectedSchool.code);
      const payload = JSON.stringify(db);
      const size = payload.length;
      const now = new Date();
      const id = `BKP-${now.getTime()}`;
      const record: BackupRecord = {
        id,
        schoolCode: selectedSchool.code,
        schoolName: selectedSchool.name,
        createdAt: now.toISOString(),
        size,
        type: 'manual',
        status: 'success',
        createdBy: currentUser?.Username || currentUser?.User_ID || 'developer',
        notes: '',
        payload
      };
      const next = [record, ...backups].slice(0, 200);
      setBackups(next);
      writeBackups(selectedSchool.code, next);
      alert('تم إنشاء النسخة الاحتياطية بنجاح.');
    } catch (e: any) {
      alert('فشل إنشاء النسخة الاحتياطية.');
    }
  };

  const handleDownload = () => {
    if (!selectedBackup) return;
    const blob = new Blob([selectedBackup.payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedBackup.schoolCode}-${selectedBackup.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = () => {
    if (!selectedBackup || !selectedSchool) return;
    if (!window.confirm('حذف النسخة الاحتياطية؟')) return;
    const next = backups.filter((item) => item.id !== selectedBackup.id);
    setBackups(next);
    writeBackups(selectedSchool.code, next);
    setSelectedBackupId(null);
  };

  const handleRestore = () => {
    if (!selectedBackup || !selectedSchool) return;
    let result;
    if (restoreMode === 'partial') {
      if (!selectedModules.length) {
        alert('اختر قسمًا واحدًا على الأقل للاسترجاع الجزئي.');
        return;
      }
      const missingDeps = Array.from(
        new Set(
          selectedModules.flatMap((mod) =>
            (dependencyMap[mod] || []).filter((dep) => !selectedModules.includes(dep))
          )
        )
      );
      if (missingDeps.length) {
        const names = moduleOptions
          .filter((m) => missingDeps.includes(m.id))
          .map((m) => m.label)
          .join('، ');
        const ok = window.confirm(
          `تنبيه: الأقسام التالية مطلوبة لضمان الاتساق ولم تُحدد: ${names}. متابعة الاسترجاع قد يسبب عدم تطابق. هل تريد المتابعة؟`
        );
        if (!ok) return;
      }
      result = restorePartial(selectedSchool.code, selectedSchool.name, selectedBackup.id, selectedModules);
    } else {
      result = restoreBackup(selectedSchool.code, selectedSchool.name, selectedBackup.id);
    }
    setConfirmRestore(false);
    if (result.ok) {
      alert(`تم استرجاع نسخة احتياطية بتاريخ ${selectedBackup.createdAt.slice(0, 10)} بنجاح. سيتم تحديث البيانات الآن.`);
      // Soft refresh: إعادة تحميل بيانات المدرسة فقط
      if (store.switchSchool) {
        store.switchSchool(selectedSchool.code);
      } else {
        window.location.reload();
      }
    } else {
      alert(result.error || 'فشل الاستعادة.');
    }
  };

  const canOperate = Boolean(selectedSchool);
  const canRestoreOrDelete = Boolean(selectedSchool && selectedBackup);

  const moduleOptions = [
    { id: 'studentsAffairs', label: 'شؤون الطلاب' },
    { id: 'students', label: 'الطلاب' },
    { id: 'attendance', label: 'الحضور والغياب' },
    { id: 'staff', label: 'شؤون العاملين' },
    { id: 'accounts', label: 'الحسابات' },
    { id: 'ledger', label: 'القيد / القيود اليومية' },
    { id: 'treasury', label: 'سندات القبض / الخزينة' },
    { id: 'cheques', label: 'الشيكات' },
    { id: 'stores', label: 'المخازن' },
    { id: 'fixedAssets', label: 'الأصول الثابتة' },
    { id: 'settings', label: 'الإعدادات العامة' }
  ];

  const toggleModule = (id: string) => {
    setSelectedModules((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">النسخ الاحتياطي واستعادة البيانات</h2>
          <p className="text-sm font-medium text-slate-500">إدارة النسخ الاحتياطية لكل مدرسة بشكل مستقل وآمن</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-2">
          <Database size={18} className="text-blue-600" />
          <div className="text-xs font-bold text-slate-600">
            {selectedSchool ? `${selectedSchool.name} (${selectedSchool.code})` : 'اختر مدرسة'}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-2">
          <label className="text-xs font-bold text-slate-500">اختيار المدرسة</label>
          <select
            value={selectedSchool?.code || ''}
            onChange={(e) => {
              const code = e.target.value;
              const school = schools.find((item) => item.code === code) || null;
              setSelectedSchool(school);
            }}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
          >
            <option value="">اختر المدرسة...</option>
            {schools.map((school) => (
              <option key={school.id} value={school.code}>
                {school.name} ({school.code})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
            <p className="font-bold text-slate-700 text-sm">تنبيه الأمان</p>
            <p>كل نسخة مرتبطة بالمدرسة المختارة فقط. لا يمكن الاستعادة على مدرسة أخرى.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canOperate}
          onClick={handleCreateBackup}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold shadow-sm ${
            canOperate
              ? 'border-blue-200 bg-blue-50 text-blue-700 hover:shadow'
              : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
          }`}
        >
          <Archive size={16} /> إنشاء نسخة احتياطية
        </button>
        <button
          type="button"
          disabled={!canRestoreOrDelete}
          onClick={() => setConfirmRestore(true)}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold shadow-sm ${
            canRestoreOrDelete
              ? 'border-amber-200 bg-amber-50 text-amber-700 hover:shadow'
              : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
          }`}
        >
          <RefreshCw size={16} /> استعادة نسخة
        </button>
        <button
          type="button"
          disabled={!canRestoreOrDelete}
          onClick={handleDelete}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold shadow-sm ${
            canRestoreOrDelete
              ? 'border-rose-200 bg-rose-50 text-rose-700 hover:shadow'
              : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
          }`}
        >
          <Trash2 size={16} /> حذف نسخة
        </button>
        <button
          type="button"
          disabled={!canRestoreOrDelete}
          onClick={handleDownload}
          className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold shadow-sm ${
            canRestoreOrDelete
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:shadow'
              : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
          }`}
        >
          <Download size={16} /> تحميل النسخة
        </button>
      </div>

      {canRestoreOrDelete && (
        <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm space-y-3" dir="rtl">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="radio"
                name="restore-mode"
                value="full"
                checked={restoreMode === 'full'}
                onChange={() => setRestoreMode('full')}
                className="accent-blue-600"
              />
              استرجاع كامل
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="radio"
                name="restore-mode"
                value="partial"
                checked={restoreMode === 'partial'}
                onChange={() => setRestoreMode('partial')}
                className="accent-blue-600"
              />
              استرجاع جزئي (الأقسام المحددة)
            </label>
          </div>

          {restoreMode === 'partial' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {moduleOptions.map((mod) => (
                <label
                  key={mod.id}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold ${
                    selectedModules.includes(mod.id)
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedModules.includes(mod.id)}
                    onChange={() => toggleModule(mod.id)}
                    className="accent-blue-600"
                  />
                  {mod.label}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm" dir="rtl">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-200/70 text-slate-700 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-center font-bold">☐</th>
                <th className="px-4 py-3 text-center font-bold">تاريخ النسخة</th>
                <th className="px-4 py-3 text-center font-bold">وقت الإنشاء</th>
                <th className="px-4 py-3 text-center font-bold">حجم النسخة</th>
                <th className="px-4 py-3 text-center font-bold">نوع النسخة</th>
                <th className="px-4 py-3 text-center font-bold">الحالة</th>
                <th className="px-4 py-3 text-center font-bold">أنشئت بواسطة</th>
                <th className="px-4 py-3 text-center font-bold">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {backups.length === 0 ? (
                <tr>
                  <td colSpan={8} className="bg-white">
                    <div className="h-[320px]" />
                  </td>
                </tr>
              ) : (
                backups.map((backup) => {
                  const dateObj = new Date(backup.createdAt);
                  const date = dateObj.toISOString().slice(0, 10);
                  const time = backup.createdAt.slice(11, 16);
                  const statusTone =
                    backup.status === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : backup.status === 'failed'
                      ? 'bg-rose-50 text-rose-700 border-rose-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100';
                  return (
                    <tr
                      key={backup.id}
                      className={`border-b border-slate-100 ${selectedBackupId === backup.id ? 'bg-blue-50/50' : ''}`}
                      onClick={() => setSelectedBackupId(backup.id)}
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedBackupId === backup.id}
                          onChange={() => setSelectedBackupId(backup.id)}
                          className="h-4 w-4 accent-blue-600"
                        />
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">{date}</td>
                      <td className="px-4 py-3 text-center font-semibold">{time}</td>
                      <td className="px-4 py-3 text-center font-semibold">{formatBytes(backup.size)}</td>
                      <td className="px-4 py-3 text-center font-semibold">{backup.type === 'manual' ? 'يدوي' : 'تلقائي'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-black ${statusTone}`}>
                          {backup.status === 'success' ? 'ناجحة' : backup.status === 'failed' ? 'فاشلة' : 'قيد الإنشاء'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">{backup.createdBy}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{backup.notes || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmRestore && selectedBackup && selectedSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setConfirmRestore(false)}
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" dir="rtl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-amber-500" />
              <div>
                <h4 className="text-lg font-black text-slate-800">تأكيد الاستعادة</h4>
                <p className="text-xs font-semibold text-slate-500">سيتم استبدال بيانات المدرسة بالكامل بالنسخة المختارة.</p>
              </div>
            </div>
            <div className="space-y-2 text-sm font-semibold text-slate-700">
              <p>المدرسة: {selectedSchool.name} ({selectedSchool.code})</p>
              <p>التاريخ: {new Date(selectedBackup.createdAt).toLocaleString('ar-EG')}</p>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmRestore(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleRestore}
                className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-2 text-sm font-bold text-amber-700 shadow-sm"
              >
                استعادة الآن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupManager;
