
import React, { useState, useEffect } from 'react';
import { KeyRound, ArrowRight, ShieldCheck, AlertCircle, Laptop, Loader2, CheckCircle2 } from 'lucide-react';
import { db } from '../services/db';
import { SubscriptionCredential } from '../examControl.types';

interface SubscriptionLoginProps {
  onSuccess: (cred: SubscriptionCredential) => void;
  onBack: () => void;
}

const SubscriptionLogin: React.FC<SubscriptionLoginProps> = ({ onSuccess, onBack }) => {
  const [activationCode, setActivationCode] = useState('');
  const [deviceId, setDeviceId] = useState('جاري التحميل...');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
      const fetchId = async () => {
          const id = await db.getDeviceId();
          setDeviceId(id);
      };
      fetchId();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
        const result = await db.activateLicense(activationCode);
        
        if (result.success && result.data) {
            setSuccessMsg('تم التفعيل بنجاح! جاري تحويلك...');
            const data = result.data;
            setTimeout(() => {
                const cred: SubscriptionCredential = {
                    id: 'license_' + Date.now(),
                    username: 'subscriber',
                    password: '',
                    ownerName: data.ownerName,
                    isActive: true,
                    durationDays: 365,
                    activationDate: data.activationDate,
                    expiryDate: data.expiryDate,
                    createdAt: new Date().toISOString()
                };
                
                localStorage.setItem('app_license_type', 'client');
                onSuccess(cred);
            }, 1000);
        } else {
            setLoading(false);
            setError(result.message || 'خطأ في التفعيل.');
        }
    } catch (err) {
        setLoading(false);
        setError('حدث خطأ في الاتصال بالخادم.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans" dir="rtl">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        <div className="bg-blue-600 p-6 text-white text-center relative overflow-hidden">
            <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                    <ShieldCheck size={32} />
                </div>
                <h2 className="text-2xl font-bold">تفعيل النسخة</h2>
                <p className="text-blue-100 text-sm mt-1">يرجى إدخل كود التفعيل الخاص بمدرستكم</p>
            </div>
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <svg width="100%" height="100%"><pattern id="p" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#fff"/></pattern><rect width="100%" height="100%" fill="url(#p)"/></svg>
            </div>
        </div>

        <div className="p-8">
            {successMsg ? (
                <div className="text-center py-8">
                    <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4 animate-bounce" />
                    <h3 className="text-xl font-bold text-gray-800">{successMsg}</h3>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <label className="text-xs font-bold text-gray-500 mb-1 block flex items-center gap-1">
                            <Laptop size={12} /> معرف الجهاز (Hardware ID)
                        </label>
                        <div className="flex items-center justify-between">
                            <code className="text-sm font-mono text-gray-700 font-bold tracking-wide break-all">
                                {deviceId}
                            </code>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">كود التفعيل (Activation Code)</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={activationCode}
                                onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-center font-mono text-xl tracking-widest uppercase transition placeholder-gray-300"
                                dir="ltr"
                                placeholder="XXXX-XXXX-XXXX"
                                required
                            />
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={onBack}
                            className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition"
                        >
                            <ArrowRight size={20} />
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading || !activationCode}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : 'تفعيل الآن'}
                        </button>
                    </div>
                </form>
            )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionLogin;
