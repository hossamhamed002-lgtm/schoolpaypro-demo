import React, { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, Edit3, Plus, Trash2, X, Briefcase } from 'lucide-react';
import useJobTitles from './hooks/useJobTitles';
import { JobTitle } from '../../types';

interface JobTitlesScreenProps {
  store: any;
  onBack: () => void;
}

const initialFormState: Partial<JobTitle> = {
  Title_Ar: '',
  Title_En: '',
  Department: ''
};

const JobTitlesScreen: React.FC<JobTitlesScreenProps> = ({ store, onBack }) => {
  const { lang } = store;
  const isRtl = lang === 'ar';
  const { jobTitles, createJobTitle, updateJobTitleRecord, removeJobTitle } = useJobTitles(store);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<JobTitle>>(initialFormState);

  const selectedJobTitle = useMemo(
    () => jobTitles.find((job) => job.Job_ID === selectedId) || null,
    [jobTitles, selectedId]
  );

  const editDisabled = !selectedJobTitle;
  const deleteDisabled = !selectedJobTitle;

  const openAddModal = useCallback(() => {
    setEditingId(null);
    setForm(initialFormState);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback(() => {
    if (!selectedJobTitle) return;
    setEditingId(selectedJobTitle.Job_ID);
    setForm({ ...selectedJobTitle });
    setIsModalOpen(true);
  }, [selectedJobTitle]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(initialFormState);
  }, []);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.currentTarget;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleRowSelection = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const targetId = event.currentTarget.dataset.id || '';
    const checked = event.currentTarget.checked;
    setSelectedId(checked ? targetId : null);
  }, []);

  const handleDelete = useCallback(() => {
    if (!selectedJobTitle) return;
    const confirmed = window.confirm('هل أنت متأكد من حذف المسمى الوظيفي؟');
    if (!confirmed) return;
    removeJobTitle(selectedJobTitle.Job_ID);
    setSelectedId(null);
  }, [removeJobTitle, selectedJobTitle]);

  const handleSave = useCallback(() => {
    if (editingId) {
      const saved = updateJobTitleRecord(editingId, form);
      if (saved) closeModal();
      return;
    }

    const created = createJobTitle(form);
    if (created) closeModal();
  }, [closeModal, createJobTitle, editingId, form, updateJobTitleRecord]);

  const rows = useMemo(() => jobTitles.map((job, index) => ({
    index: index + 1,
    ...job
  })), [jobTitles]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-start">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all">
            <ChevronLeft size={20} className={isRtl ? 'rotate-180' : ''} />
          </button>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{isRtl ? 'المسميات الوظيفية' : 'Job Titles'}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{rows.length} {isRtl ? 'سجل' : 'records'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={openAddModal} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20">
            <Plus size={18} />
            {isRtl ? 'إضافة مسمى' : 'Add Title'}
          </button>
          <button
            onClick={openEditModal}
            disabled={editDisabled}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all ${editDisabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20'}`}
          >
            <Edit3 size={18} />
            {isRtl ? 'تعديل مسمى' : 'Edit Title'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteDisabled}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all ${deleteDisabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-rose-600 text-white shadow-xl shadow-rose-600/20'}`}
          >
            <Trash2 size={18} />
            {isRtl ? 'حذف مسمى' : 'Delete Title'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-16">#</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-16"></th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الكود' : 'Code'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الاسم' : 'Title'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'الإدارة' : 'Department'}</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{isRtl ? 'الصلاحيات' : 'Permissions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((job) => (
                <tr key={job.Job_ID} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-center text-xs font-bold text-slate-300">{job.index}</td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      data-id={job.Job_ID}
                      checked={selectedId === job.Job_ID}
                      onChange={handleRowSelection}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-6 py-4 font-mono text-[10px] font-black text-indigo-500 uppercase tracking-tighter">{job.Job_ID}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-indigo-600 font-black shadow-sm">
                        <Briefcase size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 truncate">{job.Title_Ar}</p>
                        <p className="text-[10px] text-slate-400 font-bold truncate">{job.Title_En}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-500">{job.Department}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-black rounded-lg border border-slate-100">{isRtl ? 'لاحقاً' : 'Later'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-3xl shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4 text-start">
                <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                  {editingId ? <Edit3 size={28} /> : <Plus size={28} />}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingId ? (isRtl ? 'تعديل مسمى وظيفي' : 'Edit Job Title') : (isRtl ? 'إضافة مسمى وظيفي' : 'Add Job Title')}</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{isRtl ? 'هيكل الوظائف' : 'Job Structure'}</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400"><X size={24} /></button>
            </div>

            <div className="p-10 space-y-8 text-start">
              <div className="space-y-6">
                <h4 className="text-sm font-black text-slate-800">{isRtl ? 'البيانات الأساسية' : 'Basic Information'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'الاسم بالعربية' : 'Arabic Title'}</label>
                    <input name="Title_Ar" type="text" value={form.Title_Ar || ''} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'الاسم بالإنجليزية' : 'English Title'}</label>
                    <input name="Title_En" type="text" value={form.Title_En || ''} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-sm font-black text-slate-800">{isRtl ? 'بيانات إضافية' : 'Additional Details'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'الإدارة' : 'Department'}</label>
                    <input name="Department" type="text" value={form.Department || ''} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ps-1">{isRtl ? 'الصلاحيات' : 'Permissions'}</label>
                    <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-bold text-slate-400">{isRtl ? 'سيتم ضبطها لاحقاً' : 'Will be configured later'}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={closeModal} className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest">{isRtl ? 'إلغاء' : 'Cancel'}</button>
                <button onClick={handleSave} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl text-xs uppercase tracking-widest">{isRtl ? 'حفظ' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobTitlesScreen;
