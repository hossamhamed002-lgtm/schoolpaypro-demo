
import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, Save, X, AlertTriangle } from 'lucide-react';
import { db } from '../services/db';
import { User, Role, ROLE_LABELS } from '../examControl.types';

interface UserManagementProps {
    currentUser?: User | null;
}

const UserManagement: React.FC<UserManagementProps> = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({ role: 'data_entry' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; userId: string | null; name: string }>({ isOpen: false, userId: null, name: '' });

  useEffect(() => {
    setUsers(db.getUsers());
  }, []);

  const handleSaveUser = () => {
    if (!formData.username || !formData.fullName || !formData.password) {
      alert("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    let updatedUsers = [...users];
    if (formData.id) {
      updatedUsers = updatedUsers.map(u => u.id === formData.id ? { ...u, ...formData } as User : u);
    } else {
      if (users.some(u => u.username === formData.username)) { alert("اسم المستخدم موجود بالفعل"); return; }
      updatedUsers.push({ id: `u_${Date.now()}`, username: formData.username, password: formData.password, fullName: formData.fullName, role: formData.role as Role });
    }
    setUsers(updatedUsers);
    db.saveUsers(updatedUsers);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="text-blue-600" /> إدارة المستخدمين
            </h2>
            <button onClick={() => { setFormData({ role: 'data_entry' }); setIsModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-md">
                <Plus size={18} /> إضافة مستخدم
            </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-right">
            <thead className="bg-gray-50 border-b">
                <tr><th className="p-4 text-gray-600">الاسم الكامل</th><th className="p-4 text-gray-600">اسم الدخول</th><th className="p-4 text-gray-600">كلمة المرور</th><th className="p-4 text-gray-600">الصلاحية</th><th className="p-4 text-gray-600 w-32">إجراءات</th></tr>
            </thead>
            <tbody className="divide-y">
                {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                    <td className="p-4 font-bold text-gray-800">{user.fullName}</td>
                    <td className="p-4 text-gray-600 font-mono">{user.username}</td>
                    <td className="p-4 text-gray-400 font-mono">••••••</td>
                    <td className="p-4"><span className="px-2 py-1 rounded-md text-xs font-bold border bg-blue-50 text-blue-700 border-blue-200">{ROLE_LABELS[user.role]}</span></td>
                    <td className="p-4 flex gap-2">
                        <button onClick={() => { setFormData(user); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={18} /></button>
                        <button onClick={() => setDeleteConfirm({ isOpen: true, userId: user.id, name: user.fullName })} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center"><h3 className="font-bold text-lg">{formData.id ? 'تعديل مستخدم' : 'مستخدم جديد'}</h3><button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-red-500"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium mb-1">الاسم الكامل</label><input type="text" value={formData.fullName || ''} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="w-full border rounded p-2.5 outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium mb-1">اسم المستخدم</label><input type="text" value={formData.username || ''} onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full border rounded p-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-mono" /></div>
              <div><label className="block text-sm font-medium mb-1">كلمة المرور</label><input type="text" value={formData.password || ''} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full border rounded p-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-mono" /></div>
              <div><label className="block text-sm font-medium mb-1">الصلاحية</label><select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value as Role})} className="w-full border rounded p-2.5 outline-none focus:ring-2 focus:ring-blue-500"><option value="data_entry">مدخل بيانات</option><option value="control_head">رئيس كنترول</option><option value="viewer">مستعرض تقارير</option><option value="admin">مدير نظام</option></select></div>
              <button onClick={handleSaveUser} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold hover:bg-blue-700 mt-2 flex items-center justify-center gap-2"><Save size={18}/> حفظ</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse"><AlertTriangle size={32} /></div>
                <h3 className="text-xl font-bold mb-2">حذف مستخدم</h3>
                <p className="text-gray-600 mb-6 text-sm">هل أنت متأكد من حذف "{deleteConfirm.name}"؟</p>
                <div className="flex gap-3 justify-center"><button onClick={() => setDeleteConfirm({ isOpen: false, userId: null, name: '' })} className="flex-1 py-2.5 rounded-lg border border-gray-300">إلغاء</button><button onClick={() => { const updated = users.filter(u => u.id !== deleteConfirm.userId); setUsers(updated); db.saveUsers(updated); setDeleteConfirm({ isOpen: false, userId: null, name: '' }); }} className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-bold">تأكيد الحذف</button></div>
            </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
