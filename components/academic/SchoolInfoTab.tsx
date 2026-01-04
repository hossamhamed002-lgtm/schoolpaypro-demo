
import React, { useMemo, useState } from 'react';
import { School as SchoolIcon, Save, Zap, Plus, Trash2, Edit3, Info, Lock, Camera, X } from 'lucide-react';
import { Stage } from '../../types';

interface SchoolInfoTabProps {
  store: any;
}

const SchoolInfoTab: React.FC<SchoolInfoTabProps> = ({ store }) => {
  const {
    t,
    lang,
    activeSchool,
    updateSchool,
    checkIntegrity,
    stages = [],
    grades = [],
    classes = [],
    addStage,
    addGrade,
    updateGrade,
    addClass,
    deleteStage,
    deleteGrade,
    deleteClass,
    activeYear
  } = store;
  const [schoolCodeError, setSchoolCodeError] = useState('');
  const isSchoolCodeLocked = !!activeSchool.School_Code;
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [infoModal, setInfoModal] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: ''
  });
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; message: string; onConfirm?: () => void }>({
    open: false,
    message: '',
    onConfirm: undefined
  });
  const [sectionsModal, setSectionsModal] = useState<{
    open: boolean;
    data: Array<{ grade: string; defaultSections: number; value: number }>;
  }>({ open: false, data: [] });

  const closeInfo = () => setInfoModal({ open: false, title: '', message: '' });
  const closeConfirm = () => setConfirmModal({ open: false, message: '', onConfirm: undefined });
  const closeSections = () => setSectionsModal({ open: false, data: [] });

  const handleChange = (field: string, value: any) => {
    if (field === 'School_Code') {
      const trimmed = String(value || '').trim();
      if (!trimmed) {
        setSchoolCodeError(lang === 'ar' ? 'كود المدرسة مطلوب ولا يمكن تركه فارغًا.' : 'School code is required.');
        return;
      }
      setSchoolCodeError('');
    }
    updateSchool({ [field]: value });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleChange('Logo', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const template = useMemo(
    () => [
      {
        stage: 'بيبي كلاس',
        grades: [{ name: 'بيبي كلاس', sections: 1 }]
      },
      {
        stage: 'رياض أطفال',
        grades: [
          { name: 'KG1', sections: 2 },
          { name: 'KG2', sections: 2 }
        ]
      },
      {
        stage: 'الابتدائي',
        grades: [
          { name: 'الصف الأول الابتدائي', sections: 3 },
          { name: 'الصف الثاني الابتدائي', sections: 3 },
          { name: 'الصف الثالث الابتدائي', sections: 3 },
          { name: 'الصف الرابع الابتدائي', sections: 3 },
          { name: 'الصف الخامس الابتدائي', sections: 3 },
          { name: 'الصف السادس الابتدائي', sections: 3 }
        ]
      },
      {
        stage: 'الإعدادي',
        grades: [
          { name: 'الصف الأول الإعدادي', sections: 3 },
          { name: 'الصف الثاني الإعدادي', sections: 3 },
          { name: 'الصف الثالث الإعدادي', sections: 3 }
        ]
      },
      {
        stage: 'الثانوي',
        grades: [
          { name: 'الصف الأول الثانوي', sections: 3 },
          { name: 'الصف الثاني الثانوي', sections: 3 },
          { name: 'الصف الثالث الثانوي', sections: 3 }
        ]
      }
    ],
    []
  );

  const startApplyDefaultStructure = () => {
    if (!activeYear?.Year_ID) {
      setInfoModal({
        open: true,
        title: lang === 'ar' ? 'تنبيه' : 'Notice',
        message: lang === 'ar' ? 'يرجى تفعيل عام دراسي أولاً قبل تحميل الهيكل.' : 'Activate an academic year first.'
      });
      return;
    }
    if (!addStage || !addGrade || !addClass) {
      setInfoModal({
        open: true,
        title: lang === 'ar' ? 'تعذر الإجراء' : 'Unavailable',
        message: lang === 'ar' ? 'دوال الإضافة غير متاحة في هذا السياق.' : 'Add functions are not available here.'
      });
      return;
    }

    const draft = template.flatMap((stg) =>
      stg.grades.map((grd) => ({
        grade: grd.name,
        defaultSections: grd.sections,
        value: grd.sections
      }))
    );
    setSectionsModal({ open: true, data: draft });
  };

  const confirmSections = () => {
    const map: Record<string, number> = {};
    sectionsModal.data.forEach((item) => {
      map[item.grade] = item.value;
    });
    closeSections();
    applyDefaultStructure(map);
  };

  const applyDefaultStructure = async (sectionOverrides: Record<string, number>) => {
    setIsApplyingTemplate(true);
    const normalize = (v: string) => v.trim().toLowerCase();
    let existingStages = stages || [];
    let existingGrades = grades || [];
    let existingClasses = classes || [];
    let createdClasses = [...existingClasses];

    const ensureStage = async (stageName: string) => {
      const found = existingStages.find((s: any) => normalize(s.Stage_Name) === normalize(stageName));
      if (found) return found.Stage_ID;
      const createdId = addStage(stageName);
      const latestStageId =
        (typeof createdId === 'string' && createdId) ||
        (stages || []).find((s: any) => normalize(s.Stage_Name) === normalize(stageName))?.Stage_ID ||
        null;
      if (latestStageId) {
        existingStages = [...existingStages, { Stage_ID: latestStageId, Stage_Name: stageName }];
        return latestStageId;
      }
      const fallbackId = `STG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      existingStages = [...existingStages, { Stage_ID: fallbackId, Stage_Name: stageName }];
      return fallbackId;
    };

    const ensureGrade = async (stageId: string, gradeName: string) => {
      const findGradeId = (source: any[]) =>
        source.find((g: any) => g.Stage_ID === stageId && normalize(g.Grade_Name) === normalize(gradeName))
          ?.Grade_ID;

      const existingId = findGradeId(existingGrades);
      if (existingId) return existingId;

      const createdId = addGrade(stageId, gradeName);
      const resolvedId =
        (typeof createdId === 'string' && createdId) ||
        findGradeId(grades || []) ||
        null;

      if (resolvedId) {
        existingGrades = [...existingGrades, { Grade_ID: resolvedId, Stage_ID: stageId, Grade_Name: gradeName }];
        return resolvedId;
      }

      const fallbackId = `GRD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      existingGrades = [...existingGrades, { Grade_ID: fallbackId, Stage_ID: stageId, Grade_Name: gradeName }];
      return fallbackId;
    };

    // احذف الهيكل القديم بالكامل (فصول ثم صفوف ثم مراحل)
    try {
      for (const cls of existingClasses || []) {
        if (!cls?.Class_ID) continue;
        const result = deleteClass?.(cls.Class_ID);
        if (result && result.ok === false) {
          setInfoModal({
            open: true,
            title: lang === 'ar' ? 'تنبيه' : 'Alert',
            message:
              lang === 'ar'
                ? 'تعذر مسح الفصول الحالية بسبب بيانات مرتبطة بها. يرجى حذف القيود أولاً.'
                : 'Could not clear existing classes because they are in use. Please remove related data first.'
          });
          setIsApplyingTemplate(false);
          return;
        }
      }
      for (const gr of existingGrades || []) {
        if (gr?.Grade_ID) deleteGrade?.(gr.Grade_ID);
      }
      for (const stg of existingStages || []) {
        if (stg?.Stage_ID) deleteStage?.(stg.Stage_ID);
      }
      existingStages = [];
      existingGrades = [];
      existingClasses = [];
    } catch (err) {
      console.warn('failed to reset existing structure', err);
    }

    for (const stg of template) {
      const stageId = await ensureStage(stg.stage);
      for (const grd of stg.grades) {
        const gradeId = await ensureGrade(stageId, grd.name);
        const sectionCount = Math.min(
          Math.max(sectionOverrides[grd.name] ?? grd.sections ?? 0, 0),
          30
        );
        const gradeActive = sectionCount > 0;
        // mark grade as inactive if supported (fallback: store flag on grade object)
        if (!gradeActive) {
          updateGrade?.(gradeId, grd.name, false);
        }
        if (gradeActive) {
          for (let i = 0; i < sectionCount; i++) {
            const className = `${grd.name} - فصل ${i + 1}`;
            const existsClass = createdClasses.some(
              (c: any) => c.Grade_ID === gradeId && normalize(c.Class_Name) === normalize(className)
            );
            if (!existsClass) {
              const newId = addClass({
                Class_Name: className,
                Grade_ID: gradeId,
                Class_Teacher_ID: '',
                Year_ID: activeYear.Year_ID
              });
              createdClasses = [
                ...createdClasses,
                {
                  Class_ID: (typeof newId === 'string' && newId) || `CLS-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                  Grade_ID: gradeId,
                  Class_Name: className
                }
              ];
            }
          }
        }
      }
    }

    setIsApplyingTemplate(false);
    setInfoModal({
      open: true,
      title: lang === 'ar' ? 'تم' : 'Done',
      message: lang === 'ar' ? 'تم تحميل الهيكل الافتراضي.' : 'Default academic structure applied.'
    });
  };

  const removeStage = (id: string) => {
    if (checkIntegrity.isStageUsed(id)) {
      setInfoModal({ open: true, title: lang === 'ar' ? 'تنبيه' : 'Notice', message: t.cannotDeleteStageUsed });
      return;
    }
    setConfirmModal({
      open: true,
      message: t.confirmDeleteStage,
      onConfirm: () => {
        const currentStages = activeSchool.Stages_Available || [];
        handleChange('Stages_Available', currentStages.filter((s: Stage) => s.Stage_ID !== id));
      }
    });
  };

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500 relative">
      <div className="lg:col-span-2 space-y-6 text-start">
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <SchoolIcon size={24} />
                </div>
              <div>
                <h3 className="text-xl font-black text-slate-800">{t.tabSchool}</h3>
                <p className="text-[10px] text-green-500 font-black uppercase tracking-widest mt-0.5">Configuration Engine</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black border border-emerald-100">
              <Save size={16} />
              {t.active}
            </div>
            <button
              onClick={startApplyDefaultStructure}
              disabled={isApplyingTemplate}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg hover:shadow-indigo-600/20 hover:scale-[1.02] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              {isApplyingTemplate
                ? (lang === 'ar' ? 'جاري التحميل...' : 'Applying...')
                : (lang === 'ar' ? 'تحميل هيكل افتراضي' : 'Apply Default Structure')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Logo Section */}
            <div className="md:col-span-2 flex flex-col items-center justify-center p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200 group relative">
               <div className="w-32 h-32 bg-white rounded-3xl shadow-xl flex items-center justify-center overflow-hidden border-4 border-white ring-1 ring-slate-100 mb-4 relative">
                  {activeSchool.Logo ? (
                    <img src={activeSchool.Logo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Camera size={40} className="text-slate-200" />
                  )}
                  <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-all">
                    <Plus size={24} />
                    <span className="text-[10px] font-black uppercase mt-1">Change Logo</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </label>
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.schoolLogo || 'Report Identity Logo'}</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{t.schoolName}</label>
              <input 
                type="text" 
                value={activeSchool.Name || ''}
                onChange={(e) => handleChange('Name', e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{t.schoolCode}</label>
              <input 
                type="text" 
                value={activeSchool.School_Code || ''}
                onChange={(e) => handleChange('School_Code', e.target.value)}
                className={`w-full border rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all ${
                  isSchoolCodeLocked
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-50 border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500/20'
                }`}
                readOnly={isSchoolCodeLocked}
              />
              {schoolCodeError && (
                <p className="text-[10px] font-bold text-rose-600">{schoolCodeError}</p>
              )}
              {isSchoolCodeLocked && (
                <p className="text-[10px] font-bold text-amber-600">
                  {lang === 'ar' ? 'تم تثبيت كود المدرسة ولا يمكن تعديله بعد الإنشاء.' : 'School code is locked after creation.'}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{t.directorate}</label>
              <input 
                type="text" 
                value={activeSchool.Directorate || ''}
                onChange={(e) => handleChange('Directorate', e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                placeholder="مثلاً: مديرية القاهرة التعليمية"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{t.administration}</label>
              <input 
                type="text" 
                value={activeSchool.Administration || ''}
                onChange={(e) => handleChange('Administration', e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                placeholder="مثلاً: إدارة المعادي التعليمية"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{t.schoolAddress}</label>
              <input 
                type="text" 
                value={activeSchool.Address || ''}
                onChange={(e) => handleChange('Address', e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative z-10 space-y-6 text-start">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black italic tracking-tighter">{t.subscriptionInfo}</h3>
              <Zap size={20} className="text-amber-400 fill-amber-400" />
            </div>
            <div className="space-y-4">
              <div className="bg-white/5 p-5 rounded-[1.5rem] border border-white/10 backdrop-blur-md">
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">{t.schoolPlan}</p>
                <p className="text-xl font-black mt-1">{activeSchool?.Subscription_Plan || (lang === 'ar' ? 'غير محدد' : 'Not set')}</p>
              </div>
              <div className="bg-white/5 p-5 rounded-[1.5rem] border border-white/10 backdrop-blur-md">
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Global Sync Key</p>
                <p className="text-xs font-mono font-bold mt-2 text-indigo-200">{activeSchool?.School_ID || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">{lang === 'ar' ? 'بداية الاشتراك' : 'Start'}</p>
                  <p className="text-sm font-black mt-1">{activeSchool?.Subscription_Start || '—'}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">{lang === 'ar' ? 'نهاية الاشتراك' : 'End'}</p>
                  <p className="text-sm font-black mt-1">{activeSchool?.Subscription_End || '—'}</p>
                </div>
              </div>
              {(() => {
                const endDate = activeSchool?.Subscription_End ? new Date(activeSchool.Subscription_End) : null;
                const now = new Date();
                const remaining =
                  endDate && !isNaN(endDate.getTime())
                    ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
                    : null;
                const companyEmail = (import.meta as any)?.env?.VITE_COMPANY_EMAIL || 'hossamhamed002@gmail.com';
                const subject = encodeURIComponent(`طلب تجديد اشتراك - ${activeSchool?.Name || 'School'}`);
                const body = encodeURIComponent(
                  `مرحباً،\n\nأرغب في تجديد اشتراك المدرسة التالية:\nالمدرسة: ${activeSchool?.Name || ''}\nالكود: ${activeSchool?.School_Code || activeSchool?.School_ID || ''}\nالخطة: ${activeSchool?.Subscription_Plan || ''}\nتاريخ الانتهاء: ${activeSchool?.Subscription_End || ''}\n\nشكراً.`
                );
                const mailto = `mailto:${companyEmail}?subject=${subject}&body=${body}`;
                return (
                  <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div>
                      <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                        {lang === 'ar' ? 'المتبقي للتجديد' : 'Days remaining'}
                      </p>
                      <p className="text-sm font-black mt-1">
                        {remaining !== null ? `${remaining} ${lang === 'ar' ? 'يوم' : 'days'}` : (lang === 'ar' ? 'غير متاح' : 'N/A')}
                      </p>
                    </div>
                    <a
                      href={mailto}
                      className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-black shadow hover:bg-amber-600 transition"
                    >
                      {lang === 'ar' ? 'طلب تجديد الاشتراك' : 'Request Renewal'}
                    </a>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Info Modal */}
    {infoModal.open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-black text-slate-800">{infoModal.title}</h4>
            <button onClick={closeInfo} className="text-slate-400 hover:text-slate-600 transition">
              <X size={18} />
            </button>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{infoModal.message}</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={closeInfo}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow hover:bg-indigo-700 transition"
            >
              {lang === 'ar' ? 'حسناً' : 'OK'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Confirm Modal */}
    {confirmModal.open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-black text-slate-800">{lang === 'ar' ? 'تأكيد' : 'Confirm'}</h4>
            <button onClick={closeConfirm} className="text-slate-400 hover:text-slate-600 transition">
              <X size={18} />
            </button>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{confirmModal.message}</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={closeConfirm}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={() => {
                confirmModal.onConfirm?.();
                closeConfirm();
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold shadow hover:bg-rose-700 transition"
            >
              {lang === 'ar' ? 'تأكيد' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Sections Modal */}
    {sectionsModal.open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-black text-slate-800">
              {lang === 'ar' ? 'تحديد عدد الفصول' : 'Set sections per grade'}
            </h4>
            <button onClick={closeSections} className="text-slate-400 hover:text-slate-600 transition">
              <X size={18} />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto space-y-3">
            {sectionsModal.data.map((item, idx) => (
              <div key={item.grade} className="flex items-center gap-3 border rounded-xl p-3">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{item.grade}</p>
                  <p className="text-xs text-slate-500">
                    {lang === 'ar' ? 'الافتراضي' : 'Default'}: {item.defaultSections}
                  </p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={item.value}
                  onChange={(e) => {
                    const next = [...sectionsModal.data];
                    next[idx] = { ...item, value: Number(e.target.value) };
                    setSectionsModal({ open: true, data: next });
                  }}
                  className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={closeSections}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={confirmSections}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow hover:bg-indigo-700 transition"
            >
              {lang === 'ar' ? 'تأكيد' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default SchoolInfoTab;
