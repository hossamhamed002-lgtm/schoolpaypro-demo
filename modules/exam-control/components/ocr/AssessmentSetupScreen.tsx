import React, { useMemo } from 'react';
import { AssessmentType, OcrAssessmentSetup, TermType } from '../../services/ocrGrades';

type Option = { value: string; label: string };

type Props = {
  setup: OcrAssessmentSetup;
  academicYears: Option[];
  grades: Option[];
  classes: Option[];
  subjects: Option[];
  onChange: (next: Partial<OcrAssessmentSetup>) => void;
  onFileSelect: (file: File | null) => void;
  readOnly?: boolean;
  lockSubject?: boolean;
};

const AssessmentSetupScreen: React.FC<Props> = ({
  setup,
  academicYears,
  grades,
  classes,
  subjects,
  onChange,
  onFileSelect,
  readOnly = false,
  lockSubject = false
}) => {
  const isComplete = useMemo(() => {
    return (
      !!setup.academicYearId &&
      !!setup.gradeId &&
      !!setup.term &&
      !!setup.assessmentType &&
      !!setup.subjectId
    );
  }, [setup]);

  const assessmentOptions: { value: AssessmentType; label: string }[] = [
    { value: 'year_work', label: 'أعمال سنة' },
    { value: 'written_exam', label: 'امتحان تحريري' },
    { value: 'oral', label: 'شفوي' },
    { value: 'activity', label: 'نشاط' }
  ];

  const termOptions: { value: TermType; label: string }[] = [
    { value: 'term1', label: 'الفصل الدراسي الأول' },
    { value: 'term2', label: 'الفصل الدراسي الثاني' }
  ];

  return (
    <div className="space-y-4" dir="rtl">
      <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 text-sm font-bold">
        صيغة الملف المطلوبة: جدول بعمودين في نفس الصف (العمود الأول: الرقم السري، العمود الثاني: الدرجة). ⚠️ يرجى عدم قص الأعمدة أو رفع صور منفصلة.
      </div>
      <div className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[12px] font-bold text-slate-700">
        ⚠️ يتم الربط بالطالب باستخدام الرقم السري فقط (العمود الأول)
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-black text-slate-500">العام الدراسي *</label>
          <select
            value={setup.academicYearId}
            onChange={(e) => onChange({ academicYearId: e.target.value })}
            disabled={readOnly}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-sm"
          >
            <option value="">اختر العام الدراسي</option>
            {academicYears.map((y) => (
              <option key={y.value} value={y.value}>{y.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black text-slate-500">الصف *</label>
          <select
            value={setup.gradeId}
            onChange={(e) => onChange({ gradeId: e.target.value })}
            disabled={readOnly}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-sm"
          >
            <option value="">اختر الصف</option>
            {grades.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black text-slate-500">الفصل (اختياري)</label>
          <select
            value={setup.classId || ''}
            onChange={(e) => onChange({ classId: e.target.value || undefined })}
            disabled={readOnly}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-sm"
          >
            <option value="">كل فصول الصف</option>
            {classes.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black text-slate-500">الفصل الدراسي *</label>
          <select
            value={setup.term}
            onChange={(e) => onChange({ term: e.target.value as TermType })}
            disabled={readOnly}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-sm"
          >
            <option value="">اختر الفصل الدراسي</option>
            {termOptions.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black text-slate-500">نوع التقييم *</label>
          <select
            value={setup.assessmentType}
            onChange={(e) => onChange({ assessmentType: e.target.value as AssessmentType })}
            disabled={readOnly}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-sm"
          >
            <option value="">اختر نوع التقييم</option>
            {assessmentOptions.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black text-slate-500">المادة (مادة واحدة فقط) *</label>
          <select
            value={setup.subjectId}
            onChange={(e) => onChange({ subjectId: e.target.value })}
            disabled={readOnly || lockSubject}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-sm"
          >
            <option value="">اختر المادة</option>
            {subjects.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black text-slate-500">رفع ملف الدرجات (صورة أو PDF)</label>
        <input
          type="file"
          accept="image/*,.pdf"
          disabled={!isComplete}
          onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
          className={`w-full rounded-xl border px-3 py-2 text-sm font-bold ${
            isComplete ? 'border-slate-300 bg-white' : 'border-slate-200 bg-slate-100 cursor-not-allowed'
          }`}
        />
        {!isComplete && (
          <p className="text-xs text-amber-600 font-bold">أكمل جميع الحقول الإلزامية لتفعيل الرفع.</p>
        )}
      </div>
    </div>
  );
};

export default AssessmentSetupScreen;
