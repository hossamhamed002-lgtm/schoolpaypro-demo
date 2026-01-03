
import React, { useState } from 'react';
import { Tag, Plus, X, Trash2, Edit3 } from 'lucide-react';

interface FeeItemsTabProps {
  store: any;
}

const FeeItemsTab: React.FC<FeeItemsTabProps> = ({ store }) => {
  const { t, feeItems, addFeeItem, deleteFeeItem, updateFeeItem, lang } = store;
  const isRtl = lang === 'ar';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ Item_Name: '', Is_Mandatory: true, Income_Acc_ID: '401', Expense_Acc_ID: '501' });
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const handleSave = () => {
    if (!form.Item_Name) return;
    if (editingItem) {
      updateFeeItem(editingItem.Fee_ID, form);
    } else {
      addFeeItem(form);
    }
    setIsModalOpen(false);
    setForm({ Item_Name: '', Is_Mandatory: true, Income_Acc_ID: '401', Expense_Acc_ID: '501' });
    setEditingItem(null);
  };

  const handleDelete = (id: string) => {
    if (confirm(isRtl ? 'حذف بند الرسوم؟' : 'Delete fee item?')) {
      deleteFeeItem(id);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
      <div className="p-8 border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-4 text-start">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Tag size={24} />
          </div>
          <h3 className="font-black text-slate-800 text-lg">{t.feeItems}</h3>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="text-indigo-600 font-black text-sm hover:underline"
        >
          + {isRtl ? 'إضافة بند' : 'Add Item'}
        </button>
      </div>
      <div className="divide-y divide-slate-50 overflow-y-auto max-h-[400px]">
        {feeItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold italic">لا توجد بنود رسوم مضافة بعد</div>
        ) : (
          feeItems.map((item: any) => (
            <div key={item.Fee_ID} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
              <div className="text-start">
                <p className="font-black text-sm text-slate-800">{item.Item_Name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-widest">GL ACC: {item.Income_Acc_ID}</p>
              </div>
              <div className="flex items-center gap-3">
                {item.Is_Mandatory && (
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] rounded-full font-black uppercase tracking-tighter border border-amber-100">
                    {t.mandatory}
                  </span>
                )}
                <button
                  onClick={() => handleEdit(item)}
                  className="p-2 text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Edit3 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(item.Fee_ID)}
                  className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-xl font-black text-slate-900">
                 {editingItem ? (isRtl ? 'تعديل بند رسوم' : 'Edit Fee Item') : (isRtl ? 'بند رسوم جديد' : 'New Fee Item')}
               </h3>
               <button
                 onClick={() => {
                   setIsModalOpen(false);
                   setEditingItem(null);
                   setForm({ Item_Name: '', Is_Mandatory: true, Income_Acc_ID: '401', Expense_Acc_ID: '501' });
                 }}
               >
                 <X className="text-slate-400" />
               </button>
             </div>
             <div className="space-y-6 text-start">
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t.item}</label>
                 <input type="text" value={form.Item_Name} onChange={e => setForm({...form, Item_Name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold" placeholder="مثلاً: رسوم حافلة" />
               </div>
               <div className="flex items-center gap-3">
                 <input type="checkbox" checked={form.Is_Mandatory} onChange={e => setForm({...form, Is_Mandatory: e.target.checked})} className="w-5 h-5 accent-indigo-600" />
                 <span className="text-sm font-bold text-slate-700">{t.mandatory}</span>
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

export default FeeItemsTab;
  const handleEdit = (item: any) => {
    setEditingItem(item);
    setForm({
      Item_Name: item.Item_Name || '',
      Is_Mandatory: Boolean(item.Is_Mandatory),
      Income_Acc_ID: item.Income_Acc_ID || '401',
      Expense_Acc_ID: item.Expense_Acc_ID || '501'
    });
    setIsModalOpen(true);
  };
