
import React, { useState } from 'react';
import { Layers, Plus, Info, Trash2, Edit3, X, Lock } from 'lucide-react';

interface SchoolStructureTabProps {
  store: any;
  setActiveTab: (tab: any) => void;
}

const SchoolStructureTab: React.FC<SchoolStructureTabProps> = ({ store, setActiveTab }) => {
  const { t, lang, stages, grades, addStage, updateStage, deleteStage, addGrade, updateGrade, deleteGrade, checkIntegrity } = store;
  const isRtl = lang === 'ar';
  const disableManualAdd = (stages || []).length > 0;
  const warnStructureLocked = () => {
    alert(
      isRtl
        ? 'تم تحميل هيكل جاهز للمراحل والصفوف والفصول. الإضافة اليدوية معطلة. أي مرحلة خارج الهيكل يتم اعتبار فصولها صفر حتى لا تُفعّل.'
        : 'A default structure is loaded. Manual add is disabled. Any stage outside the template should have zero classes to stay inactive.'
    );
  };

  const [modalMode, setModalMode] = useState<{ type: 'stage' | 'grade', action: 'add' | 'edit' } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null); // Stage_ID (for add grade) or Target_ID (for edit)
  const [inputValue, setInputValue] = useState('');

  const openStageModal = (action: 'add' | 'edit', stage?: any) => {
    setInputValue(stage?.Stage_Name || '');
    setActiveId(stage?.Stage_ID || null);
    setModalMode({ type: 'stage', action });
  };

  const openGradeModal = (action: 'add' | 'edit', parentStageId: string, grade?: any) => {
    setInputValue(grade?.Grade_Name || '');
    setActiveId(action === 'add' ? parentStageId : grade?.Grade_ID);
    setModalMode({ type: 'grade', action });
  };

  const handleSave = () => {
    if (!inputValue.trim() || !modalMode) return;

    if (modalMode.type === 'stage') {
      if (modalMode.action === 'add') addStage(inputValue);
      else if (activeId) updateStage(activeId, inputValue);
    } else {
      if (modalMode.action === 'add' && activeId) addGrade(activeId, inputValue);
      else if (activeId) updateGrade(activeId, inputValue);
    }

    closeModal();
  };

  const closeModal = () => {
    setModalMode(null);
    setInputValue('');
    setActiveId(null);
  };

  const handleDeleteStage = (id: string) => {
    if (checkIntegrity.isStageUsed(id)) {
      alert(t.cannotDeleteStageUsed);
      return;
    }
    if (confirm(t.confirmDeleteStage)) {
      deleteStage(id);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="text-start">
          <h3 className="font-black text-slate-800 text-lg">{t.tabStructure}</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Academic Hierarchy & Structure</p>
        </div>
        <button 
          onClick={() => (disableManualAdd ? warnStructureLocked() : openStageModal('add'))}
          disabled={false}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-transform shadow-xl shadow-indigo-600/10 ${
            disableManualAdd
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:scale-105'
          }`}
          title={disableManualAdd ? (isRtl ? 'تم تحميل الهيكل الافتراضي - الإضافة اليدوية معطلة' : 'Default structure loaded - manual add disabled') : ''}
        >
          <Plus size={18} />
          {t.addStage}
        </button>
      </div>

      {/* Stages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {stages.length === 0 ? (
          <div className="col-span-full bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-16 text-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Info size={32} />
            </div>
            <p className="text-slate-400 font-bold italic">{isRtl ? 'لا توجد مراحل دراسية مضافة بعد' : 'No academic stages defined yet'}</p>
            <button onClick={() => (disableManualAdd ? warnStructureLocked() : openStageModal('add'))} className="text-indigo-600 font-black text-sm mt-4 hover:underline">
               {t.addStage}
            </button>
          </div>
        ) : (
          stages.map((stg: any) => (
            <div key={stg.Stage_ID} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col h-full group hover:shadow-xl hover:border-indigo-100 transition-all duration-300">
              
              {/* Stage Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-start">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm tracking-tight">{stg.Stage_Name}</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">ID: {stg.Stage_ID}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => openStageModal('edit', stg)}
                    className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                  ><Edit3 size={16} /></button>
                  <button 
                    onClick={() => handleDeleteStage(stg.Stage_ID)}
                    className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                  ><Trash2 size={16} /></button>
                </div>
              </div>

              {/* Grades List */}
              <div className="space-y-2 flex-1 min-h-[120px]">
                {grades.filter((g: any) => g.Stage_ID === stg.Stage_ID).length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center opacity-30 italic">
                     <Plus size={24} className="mb-1" />
                     <p className="text-[10px] font-bold">{isRtl ? 'لا توجد صفوف' : 'No grades'}</p>
                  </div>
                ) : (
                  grades.filter((g: any) => g.Stage_ID === stg.Stage_ID).map((grade: any) => {
                    const inUse = checkIntegrity.isGradeUsed(grade.Grade_ID);
                    return (
                      <div key={grade.Grade_ID} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-white rounded-xl border border-transparent hover:border-slate-100 transition-all group/item shadow-sm hover:shadow-md">
                        <div className="text-start flex items-center gap-2">
                          {inUse && <Lock size={12} className="text-slate-300" />}
                          <div>
                            <p className="text-sm font-bold text-slate-700">{grade.Grade_Name}</p>
                            <p className="text-[9px] text-slate-300 font-black uppercase tracking-tighter">GRD: {grade.Grade_ID.slice(-4)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <button onClick={() => openGradeModal('edit', stg.Stage_ID, grade)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit3 size={14} /></button>
                          {!inUse && (
                            <button 
                              onClick={() => { if (confirm(isRtl ? 'حذف الصف؟' : 'Delete grade?')) deleteGrade(grade.Grade_ID); }}
                              className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                            ><Trash2 size={14} /></button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <button 
                onClick={() => (disableManualAdd ? warnStructureLocked() : openGradeModal('add', stg.Stage_ID))}
                disabled={false}
                className={`mt-6 w-full py-3.5 border border-dashed rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 group/btn transition-all ${
                  disableManualAdd
                    ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-600/20'
                }`}
                title={disableManualAdd ? (isRtl ? 'تم تحميل الهيكل الافتراضي - الإضافة اليدوية معطلة' : 'Default structure loaded - manual add disabled') : ''}
              >
                <Plus size={14} className={`${disableManualAdd ? '' : 'group-hover/btn:rotate-90 transition-transform duration-300'}`} />
                {t.addGrade}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Universal Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
           <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3 text-start">
                    <div className="p-3 bg-indigo-600 text-white rounded-xl">
                       <Layers size={20} />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900">
                         {modalMode.action === 'add' ? (isRtl ? 'إضافة ' : 'Add ') : (isRtl ? 'تعديل ' : 'Edit ')}
                         {modalMode.type === 'stage' ? (isRtl ? 'مرحلة' : 'Stage') : (isRtl ? 'صف' : 'Grade')}
                       </h3>
                    </div>
                 </div>
                 <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all">
                    <X size={24} />
                 </button>
              </div>

              <div className="space-y-6 text-start">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">
                      {modalMode.type === 'stage' ? t.stageName : t.gradeName}
                    </label>
                    <input 
                       type="text" 
                       autoFocus
                       value={inputValue}
                       onChange={e => setInputValue(e.target.value)}
                       className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all shadow-inner"
                       placeholder={isRtl ? 'ادخل الاسم هنا...' : 'Enter name...'}
                    />
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button 
                       onClick={closeModal}
                       className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                       {t.cancel}
                    </button>
                    <button 
                       onClick={handleSave}
                       className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-slate-900 transition-all"
                    >
                       {isRtl ? 'حفظ' : 'Save'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SchoolStructureTab;
