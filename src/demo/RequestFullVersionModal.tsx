import React, { useState } from 'react';
import { isDemoMode, isDemoExpired } from '../guards/appMode';
import { saveLead } from './leadTracker';

type Props = {
  open: boolean;
  onClose: () => void;
};

const RequestFullVersionModal: React.FC<Props> = ({ open, onClose }) => {
  const [schoolName, setSchoolName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sending, setSending] = useState(false);

  if (!open) return null;

  const handleSubmit = () => {
    setError('');
    setSuccess('');
    if (!schoolName.trim() || !contactName.trim() || !phone.trim()) {
      setError('الرجاء إدخال اسم المدرسة، اسم المسؤول، ورقم الموبايل.');
      return;
    }
    if (!/^[0-9+().\-\s]{6,}$/.test(phone.trim())) {
      setError('رقم الموبايل غير صالح.');
      return;
    }
    if (!isDemoMode()) {
      onClose();
      return;
    }
    setSending(true);
    try {
      saveLead({
        schoolName: schoolName.trim(),
        contactName: contactName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        demoExpired: isDemoExpired(),
        host: typeof window !== 'undefined' ? window.location.host : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
      });
      setSuccess('تم إرسال طلبك، سيتم التواصل معك قريبًا');
      setSchoolName('');
      setContactName('');
      setPhone('');
      setEmail('');
      setNotes('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-black text-slate-800">طلب النسخة الكاملة</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 text-sm font-bold">إغلاق</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">اسم المدرسة *</label>
            <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">اسم المسؤول *</label>
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">رقم الموبايل *</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">الإيميل (اختياري)</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">ملاحظات (اختياري)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2" rows={3} />
          </div>
          {error && <div className="text-sm font-bold text-rose-600">{error}</div>}
          {success && <div className="text-sm font-bold text-emerald-600">{success}</div>}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={sending}
            className="w-full bg-indigo-600 text-white font-black py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {sending ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestFullVersionModal;
