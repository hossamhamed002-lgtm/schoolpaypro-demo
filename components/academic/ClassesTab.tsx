
import React, { useMemo, useState } from 'react';
// Fix: Replace non-existent CalendarAlert with AlertCircle to fix compilation error
import { Plus, Presentation, Users, Trash2, Edit3, X, Info, Search, GitCommitVertical, Lock, AlertCircle, Shuffle } from 'lucide-react';
import { Class } from '../../types';

interface ClassesTabProps { store: any; }

const ClassesTab: React.FC<ClassesTabProps> = ({ store }) => {
  const { t, lang, classes, students = [], addClass, updateClass, deleteClass, activeYear, grades, employees, stages, checkIntegrity } = store;
  const isRtl = lang === 'ar';
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ Class_Name: '', Grade_ID: '', Class_Teacher_ID: '', capacity: 40 });
  const [isDistributionOpen, setIsDistributionOpen] = useState(false);
  const [distributionGradeId, setDistributionGradeId] = useState('');
  const [distributionMode, setDistributionMode] = useState<'MIXED' | 'SEPARATE'>('MIXED');
  const classesCount = (classes || []).length;

  // التحقق من صحة البيانات قبل الحفظ
  const isFormValid = form.Class_Name.trim() !== '' && form.Grade_ID !== '' && !!activeYear && Number(form.capacity) > 0;

  const handleSaveClass = () => {
    if (!isFormValid) return;
    
    if (editingClassId) {
      updateClass(editingClassId, form);
    } else {
      addClass({ ...form, Year_ID: activeYear.Year_ID });
    }
    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClassId(null);
    setForm({ Class_Name: '', Grade_ID: '', Class_Teacher_ID: '', capacity: 40 });
  };

  const openEditModal = (cls: Class) => {
    setForm({
      Class_Name: cls.Class_Name,
      Grade_ID: cls.Grade_ID,
      Class_Teacher_ID: cls.Class_Teacher_ID,
      capacity: (cls as any).capacity || (cls as any).Capacity || 40
    });
    setEditingClassId(cls.Class_ID);
    setIsModalOpen(true);
  };

  const filteredClasses = (classes || []).filter((c: Class) => 
    c.Year_ID === activeYear?.Year_ID && 
    (c.Class_Name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     c.Class_ID.toLowerCase().includes(searchTerm.toLowerCase()) ||
     grades.find(g => g.Grade_ID === c.Grade_ID)?.Grade_Name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeGrades = useMemo(
    () => (grades || []).filter((g: any) => g.Academic_Year_ID === activeYear?.Year_ID || !g.Academic_Year_ID),
    [grades, activeYear]
  );

  const openDistribution = () => {
    const defaultGrade = distributionGradeId || activeGrades[0]?.Grade_ID || '';
    setDistributionGradeId(defaultGrade);
    setDistributionMode('MIXED');
    setIsDistributionOpen(true);
  };

  const handleDistribution = () => {
    const gradeId = distributionGradeId;
    if (!gradeId) {
      alert(isRtl ? 'اختر الصف أولاً.' : 'Select a grade first.');
      return;
    }
    const gradeStudents =
      gradeId === 'ALL_GRADES'
        ? (students || [])
        : (students || []).filter((s: any) => s.Grade_ID === gradeId);
    if (!gradeStudents.length) {
      alert(isRtl ? 'لا يوجد طلبة في هذا الاختيار. قم بتحميل الطلبة وتسجيل الصفوف أولاً.' : 'No students found for this selection. Please import students and assign grades first.');
      return;
    }
    try {
      store.redistributeStudents?.({ gradeId, mode: distributionMode });
      alert(isRtl ? 'تم توزيع الطلبة بنجاح.' : 'Students redistributed successfully.');
      setIsDistributionOpen(false);
    } catch (e: any) {
      const code = e?.message || '';
      if (code === 'REDISTRIBUTION_NO_CLASSES') {
        alert(isRtl ? 'لا توجد فصول لهذا الصف.' : 'No classes for this grade.');
      } else if (code === 'REDISTRIBUTION_EMPTY_RESULT') {
        alert(isRtl ? 'لا يوجد طلاب للتوزيع.' : 'No students to redistribute.');
      } else if (code === 'REDISTRIBUTION_CAPACITY_EXCEEDED') {
        alert(isRtl ? 'عدد الطلبة أكبر من سعة الفصول.' : 'Students exceed classes capacity.');
      } else if (code === 'REDISTRIBUTION_NO_GENDER_CLASSES') {
        alert(isRtl ? 'يتطلب التوزيع المنفصل فصولاً لكلا المجموعتين.' : 'Separate distribution needs classes for both groups.');
      } else {
        alert(isRtl ? 'تعذر تنفيذ التوزيع.' : 'Distribution failed.');
      }
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-start">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="text-start">
          <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{t.classMgt}</h3>
          <p className="text-[10px] md:text-xs text-slate-400 font-bold mt-1 tracking-tight">
            {activeYear ? (isRtl ? `العام الحالي: ${activeYear.Year_Name}` : `Active Year: ${activeYear.Year_Name}`) : (isRtl ? '⚠️ لا يوجد عام دراسي نشط' : '⚠️ No active year')}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row w-full xl:w-auto items-center gap-4">
           <div className="w-full sm:flex-1 relative">
              <Search className={`absolute inset-y-0 ${isRtl ? 'right-4' : 'left-4'} my-auto text-slate-300`} size={18} />
              <input 
                type="text"
                placeholder={isRtl ? 'بحث في الفصول...' : 'Search classes...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-2.5 md:py-3 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all`}
              />
           </div>
           <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
             <button 
             onClick={openDistribution}
              disabled={!classesCount}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl font-black text-xs md:text-sm shadow-xl active:scale-95 transition-all ${
                !classesCount
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
              title={isRtl ? 'توزيع الطلبة على الفصول الحالية' : 'Distribute students across classes'}
             >
              <Shuffle size={18} />
              {isRtl ? 'توزيع الطلبة على الفصول' : 'Distribute students'}
             </button>
             <button 
              onClick={() => setIsModalOpen(true)}
              disabled={(classes || []).length > 0}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl font-black text-xs md:text-sm shadow-xl active:scale-95 transition-all ${
                (classes || []).length > 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 text-white hover:scale-[1.02]'
              }`}
              title={(classes || []).length > 0 ? (isRtl ? 'تم تحميل الهيكل الافتراضي - الإضافة اليدوية للفصول معطلة' : 'Default structure loaded - manual class add disabled') : ''}
             >
              <Plus size={18} />
              {t.addClass}
             </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {filteredClasses.length === 0 ? (
          <div className="col-span-full bg-white border-2 border-dashed border-slate-100 rounded-[2.5rem] p-16 md:p-24 text-center">
             <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-50 text-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Presentation size={48} />
             </div>
             <p className="text-slate-400 font-black italic text-sm md:text-base">
               {!activeYear ? (isRtl ? 'يرجى تفعيل عام دراسي أولاً من تبويب الأعوام' : 'Please activate a year first') : (isRtl ? 'لا توجد فصول مضافة لهذا العام' : 'No classes for this year')}
             </p>
          </div>
        ) : (
          filteredClasses.map((cls: Class, idx: number) => {
            const grade = grades.find((g: any) => g.Grade_ID === cls.Grade_ID);
            const teacher = employees.find((e: any) => e.Emp_ID === cls.Class_Teacher_ID);
            const inUse = checkIntegrity.isClassUsed(cls.Class_ID);
            
            return (
              <div key={`${cls.Class_ID}-${idx}`} className="bg-white p-5 md:p-6 rounded-2xl md:rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-2xl transition-all duration-500 group flex flex-col h-full relative overflow-hidden">
                <div className="flex justify-between items-start mb-4 md:mb-6">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 text-white rounded-xl md:rounded-2xl flex items-center justify-center font-black text-lg md:text-xl shadow-lg group-hover:bg-indigo-600 transition-colors">
                    {cls.Class_Name.charAt(0)}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(cls)} className="p-1.5 md:p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit3 size={16} /></button>
                    {!inUse && <button onClick={() => {
                      if(!confirm(isRtl ? 'حذف؟' : 'Delete?')) return;
                      const result = deleteClass(cls.Class_ID);
                      if (!result?.ok) {
                        if (result?.errorCode === 'CLASS_DELETE_BLOCKED_FINANCIAL') {
                          alert(isRtl ? 'لا يمكن حذف الفصل لوجود معاملات مالية مرتبطة بالطلاب.' : 'Cannot delete class: financial transactions exist for its students.');
                        } else if (result?.errorCode === 'CLASS_DELETE_BLOCKED_HAS_STUDENTS_NEEDS_REDISTRIBUTION') {
                          alert(isRtl ? 'يوجد طلاب في الفصل. أعد توزيعهم أولاً (إعادة التوزيع المتاحة حسب الاستراتيجية) ثم احذف.' : 'Class has students. Please redistribute them to another class (using the redistribution strategy) before deleting.');
                        } else {
                          alert(isRtl ? 'تعذر حذف الفصل.' : 'Failed to delete class.');
                        }
                      }
                    }} className="p-1.5 md:p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>}
                  </div>
                </div>

                <div className="space-y-2 flex-1">
                  <h4 className="text-lg md:text-xl font-black text-slate-800 truncate">{cls.Class_Name}</h4>
                  <span className="text-[9px] md:text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                     {grade?.Grade_Name || '---'}
                  </span>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400">
                    {isRtl ? 'السعة' : 'Capacity'}: {(cls as any).capacity || (cls as any).Capacity || 40}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-50 flex items-center gap-2 md:gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-white shadow-sm">
                    {teacher ? <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${teacher.Emp_ID}`} alt="" /> : <Users size={14} className="text-slate-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase truncate">{isRtl ? 'رائد الفصل' : 'Teacher'}</p>
                    <p className="text-[10px] md:text-xs font-bold text-slate-600 truncate">{teacher?.Name_Ar || '---'}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isDistributionOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl p-6 md:p-8 animate-in zoom-in-95 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">{isRtl ? 'توزيع الطلبة على الفصول' : 'Distribute students'}</h3>
              <button onClick={() => setIsDistributionOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'اختر الصف' : 'Select grade'}</label>
                  <select
                    value={distributionGradeId}
                    onChange={(e) => setDistributionGradeId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10"
                  >
                    <option value="">{isRtl ? 'اختر الصف...' : 'Select grade...'}</option>
                  <option value="ALL_GRADES">{isRtl ? 'كل الصفوف (حسب الجنس)' : 'All grades (gender aware)'}</option>
                  {activeGrades.map((g: any) => (
                    <option key={g.Grade_ID} value={g.Grade_ID}>{g.Grade_Name}</option>
                  ))}
                  </select>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'طريقة التوزيع' : 'Distribution mode'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDistributionMode('MIXED')}
                    className={`p-4 rounded-xl border text-sm font-black transition ${distributionMode === 'MIXED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                  >
                    {isRtl ? 'مختلط (ذكور + إناث)' : 'Mixed (All)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDistributionMode('SEPARATE')}
                    className={`p-4 rounded-xl border text-sm font-black transition ${distributionMode === 'SEPARATE' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                  >
                    {isRtl ? 'منفصل (ذكور/إناث)' : 'Separate (M/F)'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                  {isRtl
                    ? 'يتم التوزيع أبجديًا مع احترام السعة. في التوزيع المنفصل يتم تقسيم الفصول تلقائيًا بين الذكور والإناث.'
                    : 'Alphabetical round-robin respecting capacity. Separate mode auto-splits classes between males and females.'}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={() => setIsDistributionOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 font-black rounded-xl text-xs uppercase hover:bg-slate-200 transition-all">
                {t.cancel}
              </button>
              <button
                onClick={handleDistribution}
                className="flex-1 py-3 bg-emerald-600 text-white font-black rounded-xl text-xs uppercase shadow-xl hover:bg-emerald-700 transition-all"
              >
                {isRtl ? 'تنفيذ التوزيع' : 'Run distribution'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
           <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-6 md:p-8 animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-xl font-black text-slate-900">{editingClassId ? t.editClass : t.addClass}</h3>
                 <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>

              {!activeYear && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
                  {/* Fix: Replace non-existent CalendarAlert with AlertCircle */}
                  <AlertCircle className="text-rose-500 shrink-0" size={20} />
                  <p className="text-[11px] font-bold text-rose-700 leading-tight">
                    {isRtl ? 'تنبيه: لا يوجد عام دراسي نشط حالياً. يرجى تفعيل عام دراسي من "الأعوام الدراسية" قبل إضافة الفصول.' : 'Alert: No active academic year. Please activate one from "Academic Years" first.'}
                  </p>
                </div>
              )}

              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{t.className} *</label>
                    <input 
                      type="text" 
                      value={form.Class_Name} 
                      onChange={e => setForm({...form, Class_Name: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all" 
                      placeholder="1/A" 
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{t.grade} *</label>
                    <select 
                      value={form.Grade_ID} 
                      onChange={e => setForm({...form, Grade_ID: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10"
                    >
                       <option value="">{t.selectGrade}</option>
                       {(grades || []).map((g: any) => <option key={g.Grade_ID} value={g.Grade_ID}>{g.Grade_Name}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'سعة الفصل' : 'Class capacity'}</label>
                    <input
                      type="number"
                      min={1}
                      value={form.capacity}
                      onChange={e => setForm({ ...form, capacity: Number(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all"
                      placeholder="40"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'رائد الفصل' : 'Teacher'}</label>
                    <select 
                      value={form.Class_Teacher_ID} 
                      onChange={e => setForm({...form, Class_Teacher_ID: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10"
                    >
                       <option value="">{isRtl ? 'اختر معلماً...' : 'Select teacher...'}</option>
                       {(employees || []).map((e: any) => <option key={e.Emp_ID} value={e.Emp_ID}>{e.Name_Ar}</option>)}
                    </select>
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button onClick={closeModal} className="flex-1 py-3 bg-slate-100 text-slate-400 font-black rounded-xl text-xs uppercase hover:bg-slate-200 transition-all">{t.cancel}</button>
                    <button 
                      onClick={handleSaveClass} 
                      disabled={!isFormValid}
                      className={`flex-1 py-3 font-black rounded-xl text-xs uppercase shadow-xl transition-all ${isFormValid ? 'bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-slate-900' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                      {t.save}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ClassesTab;
