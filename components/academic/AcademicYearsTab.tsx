
import React, { useState, useMemo } from 'react';
import { Plus, Hash, CheckCircle2, XCircle, Edit3, Save, Info, Users, Trash2, Lock, X, Calendar } from 'lucide-react';
import { AcademicYear } from '../../types';
import { useJournal } from '../../src/hooks/useJournal';
import { financialCloseStorageKey } from '../../src/utils/financialYearClose';

interface AcademicYearsTabProps {
  store: any;
}

const AcademicYearsTab: React.FC<AcademicYearsTabProps> = ({ store }) => {
  const { t, years, addYear, updateYear, toggleYearStatus, deleteYear, checkIntegrity, lang } = store;
  const isRtl = lang === 'ar';
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [newYear, setNewYear] = useState({ name: '', start: '', end: '' });
  const { entries, addEntry } = useJournal();

  // توليد قائمة السنوات الدراسية تلقائياً
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const opts = [];
    for (let i = -1; i < 6; i++) {
      const start = currentYear + i;
      const end = start + 1;
      opts.push(`${start}-${end}`);
    }
    return opts;
  }, []);

  const handleYearSelect = (val: string) => {
    if (!val) {
      setNewYear({ name: '', start: '', end: '' });
      return;
    }
    const startYear = val.split('-')[0];
    const endYear = val.split('-')[1];
    
    // ضبط التواريخ المالية: يبدأ 1 سبتمبر وينتهي 31 أغسطس
    setNewYear({
      name: val,
      start: `${startYear}-09-01`,
      end: `${endYear}-08-31`
    });
  };

  const handleAddYear = () => {
    if (!newYear.name) {
      alert(isRtl ? 'يرجى اختيار العام الدراسي' : 'Please select a year');
      return;
    }
    const createdId = addYear(newYear.name, newYear.start, newYear.end);

    const schoolId =
      store.activeSchool?.School_ID ||
      store.activeSchool?.School_Code ||
      store.activeSchool?.Code ||
      store.activeSchool?.ID ||
      store.activeSchool?.id ||
      'SCHOOL';

    // تحديد العام السابق بحسب أقرب تاريخ نهاية قبل البدء الجديد
    const prevYear = [...years]
      .filter((y) => y.End_Date && y.End_Date < newYear.start)
      .sort((a, b) => (a.End_Date < b.End_Date ? 1 : -1))[0];

    if (prevYear) {
      const closeKey = financialCloseStorageKey(schoolId, prevYear.Year_ID);
      const closeExists = typeof window !== 'undefined' && Boolean(window.localStorage.getItem(closeKey));
      if (!closeExists) {
        alert('لا يمكن فتح عام مالي جديد قبل إغلاق العام المالي السابق');
      } else {
        // البحث عن قيد الرصيد الافتتاحي للعام السابق
        const prevOpening =
          entries.find(
            (entry) =>
              (entry.source || '').toString() === 'YEAR_OPENING' &&
              ((entry as any).Academic_Year_ID === prevYear.Year_ID ||
                (entry as any).academicYearId === prevYear.Year_ID ||
                (entry.sourceRefId || '').includes(prevYear.Year_ID))
          ) || null;

        const alreadyOpened = entries.some(
          (entry) =>
            (entry.source || '').toString() === 'YEAR_OPENING' &&
            ((entry as any).Academic_Year_ID === createdId ||
              (entry as any).academicYearId === createdId ||
              (entry.sourceRefId || '').includes(createdId))
        );

        if (prevOpening && !alreadyOpened) {
          const clonedLines = (prevOpening.lines || []).map((line, idx) => ({
            ...line,
            id: `${line.id || 'LINE'}-CLONE-${idx + 1}`
          }));

          addEntry({
            id: '',
            journalNo: Date.now(),
            date: newYear.start,
            description: 'قيد رصيد افتتاحي للعام الدراسي الجديد',
            source: 'YEAR_OPENING' as any,
            sourceRefId: `YEAR_OPENING_${createdId}`,
            status: 'POSTED',
            createdAt: new Date().toISOString(),
            createdBy: store.currentUser?.Username || store.currentUser?.User_ID || 'system',
            lines: clonedLines,
            totalDebit: prevOpening.totalDebit,
            totalCredit: prevOpening.totalCredit,
            isBalanced: true,
            academicYearId: createdId,
            locked: true as any,
            readOnly: true as any
          } as any);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(`FINANCIAL_YEAR_OPENED__${schoolId}__${createdId}`, 'true');
          }
        }
      }
    }

    setIsYearModalOpen(false);
    setNewYear({ name: '', start: '', end: '' });
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-start">
        <div>
          <h3 className="text-xl font-black text-slate-800">{t.multiYearActivation}</h3>
          <p className="text-xs text-slate-400 font-bold mt-1">تحديد الأعوام الدراسية والمدد المالية المرتبطة بها</p>
        </div>
        <button 
          onClick={() => setIsYearModalOpen(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-sm hover:scale-105 transition-transform shadow-xl shadow-slate-900/10"
        >
          <Plus size={18} />
          {t.addYear}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {years.map((year: AcademicYear) => {
          const inUse = checkIntegrity.isYearUsed(year.Year_ID);
          return (
            <div key={year.Year_ID} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 group flex flex-col h-full relative">
              <div className="flex items-start justify-between mb-6">
                <div className="text-start flex-1 me-4">
                  <h4 className="text-lg font-black text-slate-800">{year.Year_Name}</h4>
                  <div className="flex items-center gap-1 text-slate-400 mt-1">
                    <Hash size={10} className="font-bold" />
                    <span className="text-[9px] font-black uppercase tracking-tighter">{year.Year_ID}</span>
                  </div>
                </div>
                <button 
                  onClick={() => toggleYearStatus(year.Year_ID)}
                  className={`p-3 rounded-2xl transition-all shadow-sm ${year.Is_Active ? 'bg-indigo-600 text-white shadow-indigo-600/20' : 'bg-slate-50 text-slate-300 hover:bg-slate-100'}`}
                >
                  {year.Is_Active ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-start">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ps-1">{t.startDate}</label>
                    <div className="bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold text-slate-600">{year.Start_Date}</div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 ps-1">{t.endDate}</label>
                    <div className="bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold text-slate-600">{year.End_Date}</div>
                 </div>
              </div>

              {!inUse && (
                <button 
                  onClick={() => deleteYear(year.Year_ID)}
                  className="mt-auto pt-4 text-xs font-bold text-rose-400 hover:text-rose-600 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={14} /> {isRtl ? 'حذف العام' : 'Delete Year'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {isYearModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
           <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95 duration-300 text-start">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-600 text-white rounded-xl">
                       <Calendar size={24} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900">{t.addYear}</h3>
                 </div>
                 <button onClick={() => setIsYearModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                    <X size={24} />
                 </button>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRtl ? 'اختر العام الدراسي' : 'Select Academic Year'}</label>
                    <select 
                       value={newYear.name}
                       onChange={e => handleYearSelect(e.target.value)}
                       className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all shadow-inner"
                    >
                       <option value="">{isRtl ? '--- اختر من القائمة ---' : '--- Choose Year ---'}</option>
                       {yearOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.startDate}</label>
                       <input type="date" value={newYear.start} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 font-bold text-xs text-slate-400" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.endDate}</label>
                       <input type="date" value={newYear.end} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 font-bold text-xs text-slate-400" />
                    </div>
                 </div>

                 <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <p className="text-[10px] font-bold text-indigo-600 leading-tight">
                      {isRtl ? '* يتم ضبط التواريخ تلقائياً بناءً على السنة المختارة (من 1 سبتمبر وحتى 31 أغسطس من العام التالي).' : '* Dates are auto-set from Sep 1st to Aug 31st of the following year.'}
                    </p>
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button onClick={() => setIsYearModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase">{t.cancel}</button>
                    <button onClick={handleAddYear} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-indigo-600/20">{isRtl ? 'تأكيد الإضافة' : 'Confirm'}</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AcademicYearsTab;
