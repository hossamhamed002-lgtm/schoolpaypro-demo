import React, { useState, useMemo, useEffect } from 'react';
import { Wand2, Trash2, Hash, Plus, Lock, ArrowDownWideNarrow, ShieldCheck, Printer, Eye, AlertTriangle, XCircle, FileDown, FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react';
import { Student, Subject, GradesDatabase, GradeLevel, GRADE_LABELS, SecretGenRange } from '../examControl.types';
import { db } from '../services/db';
import { exportUtils } from '../services/exportUtils';

interface Props {
  students: Student[];
  subjects: Subject[];
  grades: GradesDatabase;
  onUpdateStudents?: (students: Student[]) => void;
}

const SecondRoleSecretGen: React.FC<Props> = ({ students, subjects, grades, onUpdateStudents }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>('p3');
  const [secretRanges, setSecretRanges] = useState<SecretGenRange[]>([]);
  const [isRandom, setIsRandom] = useState(true);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({ 
    title: '', 
    message: '', 
    onConfirm: () => {} 
  });
  const [toastMessage, setToastMessage] = useState('');
  
  const schoolInfo = db.getSchoolInfo();
  const certConfig = db.getCertConfig();
  const validGrades = (Object.keys(GRADE_LABELS) as GradeLevel[]);

  const generateUniqueId = (): string => {
    return `r2_range_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  };

  useEffect(() => {
    const savedRanges = db.getSecretRanges();
    setSecretRanges(savedRanges);
  }, []);

  const saveRanges = (newRanges: SecretGenRange[]): void => {
    try {
      db.saveSecretRanges(newRanges);
      setSecretRanges(newRanges);
    } catch (error: any) {
      console.error('فشل حفظ النطاقات:', error);
    }
  };

  const r2Ranges = useMemo(() => 
    secretRanges.filter(r => r.term === 'second_role'), 
    [secretRanges]
  );

  const validation = useMemo(() => {
    const errors: string[] = [];
    const sorted = [...r2Ranges].sort((a, b) => a.fromSeating - b.fromSeating);
    
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[i].toSeating >= sorted[j].fromSeating && 
            sorted[i].fromSeating <= sorted[j].toSeating) {
          errors.push(`تداخل في أرقام الجلوس بين المجموعة ${i + 1} و ${j + 1}`);
        }
      }
      
      if (sorted[i].startSecret < 100 || sorted[i].startSecret > 99999) {
        errors.push(`الرقم السري للمجموعة ${i + 1} غير منطقي (يفضل بين 1000 و 9999)`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }, [r2Ranges]);

  const eligibleStudents = useMemo(() => {
    const gradeSubjects = subjects.filter(s => s.gradeLevels?.includes(selectedGrade) && s.isBasic);
    const PASS_THRESHOLD = certConfig.minPassingPercent / 100;
    const EXAM_THRESHOLD = certConfig.minExamPassingPercent / 100;

    return students.filter(st => {
      if (st.gradeLevel !== selectedGrade || st.seatingNumber === null) return false;
      
      const stGrades = grades[st.id] || {};
      let hasFail = false;

      if (gradeSubjects.length === 0) return false;

      for (const sub of gradeSubjects) {
        const rec = stGrades[sub.id];
        const safeVal = (v: any) => (v === undefined || v === -1) ? 0 : v;
        const isAbs = rec?.term1?.exam === -1 || rec?.term2?.exam === -1;
        
        const t1_sum = safeVal(rec?.term1?.work) + safeVal(rec?.term1?.practical) + safeVal(rec?.term1?.exam);
        const t2_sum = safeVal(rec?.term2?.work) + safeVal(rec?.term2?.practical) + safeVal(rec?.term2?.exam);
        const annualAvg = (t1_sum + t2_sum) / 2;

        if (selectedGrade === 'p1' || selectedGrade === 'p2') {
          if (annualAvg < sub.maxScore * 0.5) { hasFail = true; break; }
        } else {
          const passedWritten = (sub.examScore === 0) || (safeVal(rec?.term2?.exam) >= sub.examScore * EXAM_THRESHOLD);
          if (isAbs || !passedWritten || annualAvg < sub.maxScore * PASS_THRESHOLD) {
            hasFail = true; 
            break;
          }
        }
      }
      return hasFail;
    }).sort((a, b) => (a.seatingNumber ?? 0) - (b.seatingNumber ?? 0));
  }, [students, grades, selectedGrade, subjects, certConfig]);

  const studentsWithSecrets = useMemo(() => 
    eligibleStudents.filter(s => s.secretNumberSecondRole !== null),
    [eligibleStudents]
  );

  const alreadyGeneratedCount = useMemo(() => 
    studentsWithSecrets.length,
    [studentsWithSecrets]
  );

  const addRange = (): void => {
    const lastRange = r2Ranges[r2Ranges.length - 1];
    let from = 1, to = 100, secret = 9001;
    if (lastRange) {
      from = Math.max(1, lastRange.toSeating + 1);
      to = from + 99;
      secret = lastRange.startSecret + 1000;
    }
    const newRange: SecretGenRange = {
      id: generateUniqueId(),
      term: 'second_role',
      fromSeating: from,
      toSeating: to,
      startSecret: secret
    };
    saveRanges([...secretRanges, newRange]);
  };

  const removeRange = (id: string): void => {
    saveRanges(secretRanges.filter(r => r.id !== id));
  };

  const updateRange = (id: string, field: keyof SecretGenRange, value: number): void => {
    const safeValue = Math.max(1, value);
    saveRanges(secretRanges.map(r => r.id === id ? { ...r, [field]: safeValue } : r));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const executeGeneration = (studentsToProcess: Student[]) => {
    // Add explicit typing to the Map constructor to avoid 'unknown' type when getting students.
    const studentsMap = new Map<string, Student>(students.map(s => [s.id, { ...s }]));

    r2Ranges.forEach(range => {
      const batch = studentsToProcess.filter(s => s.seatingNumber! >= range.fromSeating && s.seatingNumber! <= range.toSeating);
      if (batch.length === 0) return;

      let secretsPool = Array.from({ length: batch.length }, (_, i) => range.startSecret + i);
      if (isRandom) secretsPool = secretsPool.sort(() => Math.random() - 0.5);

      batch.forEach((st, idx) => {
        const student = studentsMap.get(st.id);
        // Fix: Explicit type on studentsMap ensures 'student' is recognized as Student | undefined.
        if (student) student.secretNumberSecondRole = secretsPool[idx];
      });
    });

    if (onUpdateStudents) {
      onUpdateStudents(Array.from(studentsMap.values()));
      showToast('✅ تم توليد الأرقام السرية بنجاح');
    }
    setShowConfirmModal(false);
  };

  const handleGenerate = (): void => {
    if (!validation.isValid) {
      showToast('❌ يوجد أخطاء في النطاقات');
      return;
    }
    if (r2Ranges.length === 0) {
      showToast('❌ لا توجد نطاقات مضافة');
      return;
    }

    const studentsToProcess = eligibleStudents.filter(st => {
      const inRange = r2Ranges.some(r => st.seatingNumber! >= r.fromSeating && st.seatingNumber! <= r.toSeating);
      const needsSecret = overwriteExisting || st.secretNumberSecondRole === null;
      return inRange && needsSecret;
    });

    if (studentsToProcess.length === 0) {
      showToast('⚠️ لا يوجد طلاب يحتاجون أرقام جديدة ضمن النطاقات المحددة');
      return;
    }

    setModalConfig({
      title: 'تأكيد التوليد',
      message: `سيتم توزيع أرقام سرية لـ (${studentsToProcess.length}) طالب. هل تريد الاستمرار؟`,
      onConfirm: () => executeGeneration(studentsToProcess)
    });
    setShowConfirmModal(true);
  };

  const handleClear = (): void => {
    if (studentsWithSecrets.length === 0) {
      showToast('⚠️ لا توجد أرقام لمسحها');
      return;
    }
    
    const targetIds = new Set(studentsWithSecrets.map(s => s.id));
    const updated = students.map(s => targetIds.has(s.id) ? { ...s, secretNumberSecondRole: null } : s);
    if (onUpdateStudents) {
      onUpdateStudents(updated);
      showToast('✅ تم مسح الأرقام السرية بنجاح');
    }
    setShowConfirmModal(false);
  };

  const handleExportPDF = () => {
    if (studentsWithSecrets.length === 0) {
      showToast('⚠️ لا يوجد بيانات للتصدير');
      return;
    }
    setIsExporting(true);
    exportUtils.exportToPDF('r2-secret-area', `كشف_سري_د2_${GRADE_LABELS[selectedGrade]}`, 'landscape')
      .finally(() => setIsExporting(false));
  };

  const handleExportExcel = () => {
    if (studentsWithSecrets.length === 0) {
      showToast('⚠️ لا يوجد بيانات للتصدير');
      return;
    }
    exportUtils.exportTableToExcel('r2-secret-table', `كشف_سري_د2_${GRADE_LABELS[selectedGrade]}`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-center gap-4 shadow-xl border-b-4 border-emerald-500 no-print">
        <div className="bg-emerald-500 p-2.5 rounded-xl">
          <ShieldCheck size={26} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-sm">بروتوكول حماية البيانات نشط</h3>
            <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full border border-emerald-500/30">آمن تماماً</span>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">يتم عزل خاصية سري الدور الثاني تقنياً. لن يتم تعديل أو حذف أرقام الدور الأول تحت أي ظرف.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-xl border-2 border-indigo-50 no-print">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
              <Lock size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-800">إدارة سري الدور الثاني</h2>
              <p className="text-xs text-gray-500 font-bold">توزيع يدوي ذكي للطلاب المتعثرين</p>
            </div>
          </div>
          <div className="bg-indigo-50 px-6 py-2 rounded-2xl border border-indigo-100 flex items-center gap-3">
            <span className="text-xs font-bold text-indigo-400">الصف المستهدف:</span>
            <select 
              value={selectedGrade} 
              onChange={e => setSelectedGrade(e.target.value as GradeLevel)} 
              className="bg-transparent font-black text-indigo-900 outline-none cursor-pointer"
            >
              {validGrades.map(g => (
                <option key={g} value={g}>{GRADE_LABELS[g]}</option>
              ))}
            </select>
          </div>
        </div>

        {!validation.isValid && (
          <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl mb-6 flex gap-3">
            <XCircle className="text-red-600 shrink-0" size={24} />
            <div className="space-y-1">
              <p className="font-black text-red-800 text-sm">خطأ في إعداد النطاقات:</p>
              {validation.errors.map((err, i) => (
                <p key={i} className="text-red-600 text-xs font-bold">• {err}</p>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase">طلاب الصف</p>
            <p className="text-2xl font-black text-slate-800">{students.filter(s => s.gradeLevel === selectedGrade).length}</p>
          </div>
          <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-center">
            <p className="text-[10px] font-bold text-rose-500 uppercase">المتعثرون (المستهدفون)</p>
            <p className="text-2xl font-black text-slate-800">{eligibleStudents.length}</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
            <p className="text-[10px] font-bold text-emerald-500 uppercase">تم توزيع سري لهم</p>
            <p className="text-2xl font-black text-emerald-800">{alreadyGeneratedCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* قسم النطاقات على اليسار */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-800 text-white p-4 rounded-2xl flex justify-between items-center shadow-lg">
              <div className="flex items-center gap-2 font-bold"><ArrowDownWideNarrow size={20} />مجموعات التوزيع</div>
              <button onClick={addRange} className="bg-white/20 hover:bg-white/30 p-1.5 rounded-xl transition"><Plus size={20} /></button>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {r2Ranges.length > 0 ? (
                r2Ranges.map((range, idx) => (
                  <div key={range.id} className="bg-white p-4 rounded-2xl border-2 border-gray-100 relative group hover:border-indigo-200 transition-all shadow-sm">
                    <button onClick={() => removeRange(range.id)} className="absolute -top-2 -left-2 bg-red-100 text-red-600 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-red-600 hover:text-white z-10"><Trash2 size={14} /></button>
                    <div className="text-[10px] font-black text-indigo-400 mb-3 flex items-center gap-1"><Hash size={12} />مجموعة الترقيم {idx + 1}</div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block mb-1">من جلوس (د1)</label>
                        <input type="number" min="1" value={range.fromSeating} onChange={e => updateRange(range.id, 'fromSeating', parseInt(e.target.value) || 0)} className="w-full bg-gray-50 border-0 rounded-lg p-2.5 text-sm font-bold text-center focus:ring-2 focus:ring-indigo-300" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 block mb-1">إلى جلوس (د1)</label>
                        <input type="number" min="1" value={range.toSeating} onChange={e => updateRange(range.id, 'toSeating', parseInt(e.target.value) || 0)} className="w-full bg-gray-50 border-0 rounded-lg p-2.5 text-sm font-bold text-center focus:ring-2 focus:ring-indigo-300" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">بداية الرقم السري (د2)</label>
                      <input type="number" min="1" value={range.startSecret} onChange={e => updateRange(range.id, 'startSecret', parseInt(e.target.value) || 0)} className="w-full bg-indigo-50 border-0 rounded-lg p-2.5 text-sm font-black text-indigo-700 text-center focus:ring-2 focus:ring-indigo-300" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center border-2 border-dashed rounded-2xl text-gray-400 bg-gray-50/50">
                  <p className="text-xs font-bold leading-relaxed">لا يوجد نطاقات مضافة.<br />ابدأ بإضافة مجموعة ترقيم جديدة.</p>
                </div>
              )}
            </div>
          </div>

          {/* القسم المركزي: قسم المعاينة */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-200 h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <Eye size={22} className="text-indigo-600" /> معاينة كشف الأرقام
                </h3>
                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
                  {studentsWithSecrets.length} طالب
                </span>
              </div>
              
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-3 text-center font-bold text-gray-700 border-b">م</th>
                        <th className="p-3 text-right font-bold text-gray-700 border-b">الاسم</th>
                        <th className="p-3 text-center font-bold text-gray-700 border-b">جلوس (د1)</th>
                        <th className="p-3 text-center font-bold text-gray-700 border-b bg-indigo-50">سري (د2)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsWithSecrets.slice(0, 5).map((st, idx) => (
                        <tr key={st.id} className="hover:bg-gray-50 border-b">
                          <td className="p-3 text-center font-mono">{idx + 1}</td>
                          <td className="p-3 text-right pr-6">{st.name}</td>
                          <td className="p-3 text-center font-mono">{st.seatingNumber}</td>
                          <td className="p-3 text-center font-mono text-lg text-indigo-700 bg-indigo-50/30">{st.secretNumberSecondRole}</td>
                        </tr>
                      ))}
                      {studentsWithSecrets.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-12 text-center text-gray-400">
                            <Eye size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="font-bold">لا يوجد أرقام سرية مولدة</p>
                            <p className="text-sm mt-2">سيظهر هنا الطلاب بعد تنفيذ التوزيع</p>
                          </td>
                        </tr>
                      )}
                      {studentsWithSecrets.length > 5 && (
                        <tr>
                          <td colSpan={4} className="p-3 text-center text-gray-500 text-sm">
                            ... وإجمالي {studentsWithSecrets.length - 5} طالب إضافي
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="bg-amber-50 p-4 rounded-2xl flex gap-3 text-amber-800 border border-amber-100 mt-6">
                <AlertTriangle size={20} className="shrink-0 text-amber-500" />
                <p className="text-[10px] font-bold leading-relaxed">
                  تنبيه تقني: يقوم النظام تلقائياً باستثناء الطلاب الناجحين من عملية الترقيم. الأرقام تمنح حصراً للطلاب المتعثرين.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div 
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 cursor-pointer hover:bg-indigo-50/30 transition-colors"
                  onClick={() => setIsRandom(!isRandom)}
                >
                  <input 
                    type="checkbox" 
                    checked={isRandom}
                    readOnly
                    className="w-5 h-5 text-indigo-600 rounded-lg focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="text-right">
                    <span className="block font-black text-slate-800 text-sm">تفعيل العشوائية</span>
                    <span className="text-[9px] text-slate-400 font-bold">بعثرة الأرقام داخل المجموعة</span>
                  </div>
                </div>
                
                <div 
                  className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 cursor-pointer hover:bg-orange-50/30 transition-colors"
                  onClick={() => setOverwriteExisting(!overwriteExisting)}
                >
                  <input 
                    type="checkbox" 
                    checked={overwriteExisting}
                    readOnly
                    className="w-5 h-5 text-orange-600 rounded-lg focus:ring-orange-500 cursor-pointer"
                  />
                  <div className="text-right">
                    <span className="block font-black text-slate-800 text-sm">استبدال الحالي</span>
                    <span className="text-[9px] text-slate-400 font-bold">إعادة ترقيم الطلاب الحاليين</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* القسم الأيمن: أزرار التحكم */}
          <div className="lg:col-span-1 space-y-6">
            {/* بطاقة التوليد */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-5 rounded-3xl shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 p-2.5 rounded-xl">
                  <Wand2 size={22} />
                </div>
                <h3 className="font-black text-lg">تنفيذ التوليد</h3>
              </div>
              <button 
                onClick={handleGenerate}
                disabled={eligibleStudents.length === 0 || !validation.isValid}
                className="w-full py-4 bg-white text-indigo-700 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-gray-100 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Wand2 size={22} /> بدء التوليد
              </button>
              <div className="mt-4 text-center">
                <p className="text-xs text-white/90 font-bold">طلاب مؤهلين للتوليد:</p>
                <p className="text-2xl font-black mt-1">{eligibleStudents.length}</p>
              </div>
            </div>

            {/* بطاقة المسح */}
            <div className="bg-gradient-to-br from-slate-800 to-gray-900 text-white p-5 rounded-3xl shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 p-2.5 rounded-xl">
                  <Trash2 size={22} />
                </div>
                <h3 className="font-black text-lg">إدارة الأرقام</h3>
              </div>
              <button 
                onClick={() => {
                  if (studentsWithSecrets.length === 0) {
                    showToast('⚠️ لا توجد أرقام لمسحها');
                    return;
                  }
                  setModalConfig({
                    title: 'تأكيد المسح',
                    message: `هل أنت متأكد من مسح ${studentsWithSecrets.length} رقم سري؟`,
                    onConfirm: handleClear
                  });
                  setShowConfirmModal(true);
                }}
                disabled={alreadyGeneratedCount === 0}
                className="w-full py-3.5 bg-white/20 text-white border border-white/30 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/30 transition-all disabled:opacity-50"
              >
                <Trash2 size={18} /> مسح الأرقام
              </button>
              <div className="mt-4 text-center">
                <p className="text-xs text-white/90 font-bold">أرقام موجودة:</p>
                <p className="text-2xl font-black mt-1">{alreadyGeneratedCount}</p>
              </div>
            </div>

            {/* بطاقة التصدير والطباعة */}
            <div className="bg-white p-5 rounded-3xl shadow-lg border-2 border-gray-100">
              <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
                <Printer size={20} className="text-gray-600" /> التصدير والطباعة
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => exportUtils.print('r2-secret-area', 'landscape')}
                  disabled={alreadyGeneratedCount === 0}
                  className="py-3 bg-gray-100 text-gray-800 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 hover:bg-gray-200 transition-all disabled:opacity-50"
                >
                  <Printer size={16} /> طباعة
                </button>
                <button 
                  onClick={handleExportPDF}
                  disabled={alreadyGeneratedCount === 0 || isExporting}
                  className="py-3 bg-red-50 text-red-700 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 hover:bg-red-100 transition-all disabled:opacity-50"
                >
                  {isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} PDF
                </button>
                <button 
                  onClick={handleExportExcel}
                  disabled={alreadyGeneratedCount === 0}
                  className="py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 hover:bg-emerald-100 transition-all disabled:opacity-50 col-span-2"
                >
                  <FileSpreadsheet size={16} /> Excel
                </button>
              </div>
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500 font-bold">متوافق مع جميع الأجهزة</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* كشف الأرقام الكامل للطباعة */}
      <div className="bg-white rounded-3xl shadow-xl border overflow-hidden">
        <div className="bg-slate-50 p-4 border-b flex justify-between items-center no-print">
          <h3 className="font-bold flex items-center gap-2 text-gray-800">
            <Eye size={20} className="text-indigo-600" />
            كشف الأرقام السرية الكامل
          </h3>
          <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
            للطباعة والتصدير فقط
          </span>
        </div>

        <div id="r2-secret-area" className="bg-white p-12 text-black min-h-[600px]" dir="rtl">
          <div className="text-center mb-10 border-b-2 border-black pb-6">
            <h1 className="text-2xl font-black mb-1">{schoolInfo.schoolName}</h1>
            <h2 className="text-xl font-bold underline mb-4">كشف الأرقام السرية لطلاب الدور الثاني</h2>
            <p className="font-black text-lg text-slate-700">
              {GRADE_LABELS[selectedGrade]} | {schoolInfo.academicYear}
            </p>
          </div>

          <table id="r2-secret-table" className="w-full text-center border-collapse border-2 border-black font-bold">
            <thead>
              <tr className="bg-gray-100 h-12">
                <th className="border-2 border-black p-2 w-16">م</th>
                <th className="border-2 border-black p-2 text-right pr-6">اسم الطالب</th>
                <th className="border-2 border-black p-2 w-32">رقم الجلوس (د1)</th>
                <th className="border-2 border-black p-2 w-48 bg-indigo-50 text-indigo-900 font-black">
                  الرقم السري (د2)
                </th>
              </tr>
            </thead>
            <tbody>
              {studentsWithSecrets.length > 0 ? (
                studentsWithSecrets.map((st, idx) => (
                  <tr key={st.id} className="h-10 hover:bg-gray-50 border-b border-black/10">
                    <td className="border-2 border-black font-mono">{idx + 1}</td>
                    <td className="border-2 border-black text-right pr-6">{st.name}</td>
                    <td className="border-2 border-black font-mono text-lg">{st.seatingNumber}</td>
                    <td className="border-2 border-black font-mono text-2xl text-indigo-800 bg-indigo-50/10">
                      {st.secretNumberSecondRole}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-32 text-center text-gray-400 font-bold italic">
                    لا يوجد أرقام سرية مولدة للعرض. تأكد من إعداد المجموعات والضغط على "تنفيذ التوزيع"
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-20 flex justify-between items-end px-12 font-black">
            <div className="text-center space-y-12">
              <p className="underline underline-offset-8">رئيس الكنترول</p>
              <p className="text-slate-400 font-normal">.........................</p>
            </div>
            <div className="text-center space-y-12">
              <p className="underline underline-offset-8">مدير المدرسة</p>
              <p className="text-slate-400 font-normal">.........................</p>
            </div>
          </div>
        </div>
      </div>

      {/* نافذة التأكيد المخصصة */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="font-black text-xl text-gray-900">{modalConfig.title}</h3>
              <p className="text-gray-600 mt-2 font-bold">{modalConfig.message}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3.5 bg-gray-100 text-gray-800 rounded-xl font-bold hover:bg-gray-200 transition"
              >
                إلغاء
              </button>
              <button
                onClick={() => modalConfig.onConfirm()}
                className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* رسائل عارضة (Toast) */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl z-50 animate-slide-up flex items-center gap-3">
          <CheckCircle2 size={20} />
          <span className="font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default SecondRoleSecretGen;