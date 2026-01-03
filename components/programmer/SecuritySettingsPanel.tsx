import React, { useEffect, useState } from 'react';
import { Shield, Phone, Clock, RefreshCcw } from 'lucide-react';
import { getSecuritySettings, saveSecuritySettings } from '../../security/securitySettings';

const SecuritySettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState(getSecuritySettings());
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setSettings(getSecuritySettings());
  }, []);

  const handleChange = (key: keyof typeof settings, value: any) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSecuritySettings(next);
    setStatus('تم الحفظ');
    setTimeout(() => setStatus(null), 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-lg p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Shield />
        </div>
        <div>
          <h3 className="text-2xl font-black text-slate-900">إعدادات الأمان</h3>
          <p className="text-sm text-slate-500 font-bold">التحقق عند تغيير الجهاز + OTP واتساب</p>
        </div>
        {status && <span className="ml-auto text-emerald-600 text-sm font-bold">{status}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enableDeviceCheck}
            onChange={(e) => handleChange('enableDeviceCheck', e.target.checked)}
            className="h-5 w-5 text-indigo-600 rounded border-slate-300"
          />
          <div>
            <p className="font-black text-slate-800 text-sm">تفعيل التحقق عند تغيير الجهاز</p>
            <p className="text-xs text-slate-500 font-bold">إلزام OTP عند جهاز جديد</p>
          </div>
        </label>

        <label className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enableOtp}
            onChange={(e) => handleChange('enableOtp', e.target.checked)}
            className="h-5 w-5 text-indigo-600 rounded border-slate-300"
          />
          <div>
            <p className="font-black text-slate-800 text-sm">تفعيل OTP عبر واتساب</p>
            <p className="text-xs text-slate-500 font-bold">إرسال رمز 6 أرقام للرقم المسجل</p>
          </div>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-2 mb-2">
            <Clock size={14} /> مدة صلاحية الكود (دقائق)
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={settings.otpExpiryMinutes}
            onChange={(e) => handleChange('otpExpiryMinutes', Number(e.target.value || 5))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800"
          />
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-2 mb-2">
            <RefreshCcw size={14} /> وقت إعادة الإرسال (ثواني)
          </label>
          <input
            type="number"
            min={10}
            max={180}
            value={settings.otpResendCooldown}
            onChange={(e) => handleChange('otpResendCooldown', Number(e.target.value || 60))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800"
          />
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-2 mb-2">
            <Phone size={14} /> أقصى محاولات
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={settings.maxOtpAttempts}
            onChange={(e) => handleChange('maxOtpAttempts', Number(e.target.value || 3))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-800"
          />
        </div>
      </div>
    </div>
  );
};

export default SecuritySettingsPanel;
