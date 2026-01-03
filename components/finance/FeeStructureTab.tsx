
import React, { useState } from 'react';
import { Plus, X, DollarSign, Trash2 } from 'lucide-react';

interface FeeStructureTabProps {
  store: any;
}

const FeeStructureTab: React.FC<FeeStructureTabProps> = ({ store }) => {
  const { t, feeStructure, activeYear, grades, feeItems, addFeeStructure, deleteFeeStructure, lang } = store;
  const isRtl = lang === 'ar';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ Grade_ID: '', Fee_ID: '', Amount: 0 });

  const handleSave = () => {
    if (!form.Grade_ID || !form.Fee_ID || form.Amount <= 0) {
      alert(isRtl ? 'يرجى اختيار الصف والبند وإدخال مبلغ صحيح' : 'Please select grade, item and enter valid amount');
      return;
    }
    addFeeStructure({ ...form, Year_ID: activeYear?.Year_ID });
    setIsModalOpen(false);
    setForm({ Grade_ID: '', Fee_ID: '', Amount: 0 });
  };

  const handleDelete = (id: string) => {
    if (confirm(isRtl ? 'هل تريد حذف هذا التعريف؟' : 'Delete this definition?')) {
      deleteFeeStructure(id);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
       <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div className="text-start">
            <h3 className="font-black text-slate-800 text-lg">{t.feeStructure} ({activeYear?.Year_Name})</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Academic Pricing Strategy</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-slate-900/10"
          >
            <Plus size={16} />
            {isRtl ? 'تعريف قيمة' : 'Define Rate'}
          </button>
       </div>
       <div className="overflow-x-auto">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">{t.grade}</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">{t.item}</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-end">{t.amount}</th>
              <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {feeStructure.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-8 py-12 text-center text-slate-300 font-bold italic">لا توجد بيانات مسجلة لهذا العام</td>
              </tr>
            ) : (
              feeStructure.map((fs: any) => {
                const grade = grades.find((g: any) => g.Grade_ID === fs.Grade_ID);
                const item = feeItems.find((i: any) => i.Fee_ID === fs.Fee_ID);
                return (
                  <tr key={fs.Structure_ID} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 font-bold text-slate-800">{grade?.Grade_Name || fs.Grade_ID}</td>
                    <td className="px-8 py-5 text-slate-500 font-bold">{item?.Item_Name || fs.Fee_ID}</td>
                    <td className="px-8 py-5 text-end font-black text-slate-900 text-lg">
                      <span className="text-xs text-indigo-400 me-1">$</span>
                      {fs.Amount.toLocaleString()}
                    </td>
                    <td className="px-8 py-5 text-center">
                       <button 
                        onClick={() => handleDelete(fs.Structure_ID)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                       >
                         <Trash2 size={16} />
                       </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
       </div>

       {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 text-start">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-xl font-black text-slate-900">{isRtl ? 'تعريف قيمة رسوم' : 'Define Fee Rate'}</h3>
               <button onClick={() => setIsModalOpen(false)}><X className="text-slate-400" /></button>
             </div>
             <div className="space-y-6">
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t.grade}</label>
                 <select value={form.Grade_ID} onChange={e => setForm({...form, Grade_ID: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none">
                    <option value="">اختر الصف...</option>
                    {grades.map((g: any) => <option key={g.Grade_ID} value={g.Grade_ID}>{g.Grade_Name}</option>)}
                 </select>
               </div>
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t.item}</label>
                 <select value={form.Fee_ID} onChange={e => setForm({...form, Fee_ID: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold outline-none">
                    <option value="">اختر البند...</option>
                    {feeItems.map((i: any) => <option key={i.Fee_ID} value={i.Fee_ID}>{i.Item_Name}</option>)}
                 </select>
               </div>
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t.amount}</label>
                 <div className="relative">
                   <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={18} />
                   <input type="number" value={form.Amount} onChange={e => setForm({...form, Amount: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-12 py-3 font-bold outline-none" placeholder="0.00" />
                 </div>
               </div>
               <div className="pt-4 flex gap-3">
                 <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-50 text-slate-400 font-black rounded-xl">{t.cancel}</button>
                 <button onClick={handleSave} className="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-600/20">{t.save}</button>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeStructureTab;
