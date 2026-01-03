
import React, { useState } from 'react';
import { LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { db } from '../services/db';
import { User } from '../examControl.types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const schoolInfo = db.getSchoolInfo();

  const MASTER_DEV_USER: User = {
      id: 'master_dev_id',
      username: 'dev_owner',
      password: 'dev_123456',
      fullName: 'المطور (المالك)',
      role: 'admin'
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // الدخول المباشر للمطور
    if (username === MASTER_DEV_USER.username && password === MASTER_DEV_USER.password) {
        onLogin(MASTER_DEV_USER);
        return;
    }

    const users = db.getUsers();
    // إذا لم يوجد مستخدمين، اسمح بالدخول كمسؤول افتراضي لأول مرة
    if (users.length === 0 && username === 'admin' && password === 'admin') {
        onLogin({ id: 'initial_admin', username: 'admin', fullName: 'مسؤول النظام', role: 'admin' });
        return;
    }

    let user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      onLogin(user);
    } else {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة (المسؤول الافتراضي: admin / admin)');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
        <div className="bg-blue-900 p-8 text-center text-white relative">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg p-2 overflow-hidden relative z-10">
            {schoolInfo.logo ? (
                <img src={schoolInfo.logo} alt="Logo" className="w-full h-full object-contain" />
            ) : (
                <img src="./eagle-icon.svg" alt="Eagle Eye" className="w-16 h-16 object-contain" />
            )}
          </div>
          <h1 className="text-2xl font-bold mb-1 relative z-10">{schoolInfo.schoolName || ' Control System'}</h1>
          <p className="text-blue-200 text-sm relative z-10">نظام الكنترول المجاني المفتوح</p>
          
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <svg width="100%" height="100%"><pattern id="p" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#fff"/></pattern><rect width="100%" height="100%" fill="url(#p)"/></svg>
          </div>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100 font-bold">
                <AlertCircle size={16} className="shrink-0" /> 
                <span>{error}</span>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                placeholder="أدخل اسم المستخدم"
                autoFocus
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                placeholder="********"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
            >
              <LogIn size={20} /> تسجيل الدخول
            </button>
          </form>

          <div className="mt-8 text-center text-[10px] text-gray-400">
            <p className="flex items-center justify-center gap-1"><ShieldCheck size={12}/>   - جميع الحقوق محفوظة   </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
