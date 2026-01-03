import React, { useMemo } from 'react';
import { OcrGradePreviewRow } from '../../services/ocrGrades';

type Props = {
  rows: OcrGradePreviewRow[];
  onSave: (rowsToSave: OcrGradePreviewRow[]) => void;
  applied?: boolean;
  editable?: boolean;
  onEditRow?: (index: number, secret: string, grade: string) => void;
};

const GradesPreviewTable: React.FC<Props> = ({ rows, onSave, applied = false, editable = false, onEditRow }) => {
  const { validRows, invalidRows } = useMemo(() => {
    const valid = rows.filter((r) => r.status === 'valid');
    const invalid = rows.filter((r) => r.status === 'invalid');
    return { validRows: valid, invalidRows: invalid };
  }, [rows]);

  const canSave = useMemo(() => {
    if (!rows.length) return false;
    if (invalidRows.length === 0) return true;
    return false;
  }, [rows, invalidRows]);

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center gap-3">
        <p className="text-sm font-bold text-slate-700">
          إجمالي الصفوف: {rows.length} | الصالح: {validRows.length} | المرفوض: {invalidRows.length}
        </p>
        <p className="text-xs font-bold text-amber-700">تم استخراج هذه البيانات تلقائيًا باستخدام Google Vision OCR – يرجى المراجعة قبل الاعتماد</p>
      </div>

      <div className="overflow-x-auto max-h-[420px] border border-slate-100 rounded-2xl">
        <table className="min-w-[900px] w-full text-right text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">الرقم السري</th>
              <th className="px-3 py-2">اسم الطالب</th>
              <th className="px-3 py-2">الصف/الفصل</th>
              <th className="px-3 py-2">الدرجة</th>
              <th className="px-3 py-2">الحالة</th>
              <th className="px-3 py-2">السبب</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={`${row.secretNumber}-${idx}`} className={`border-t border-slate-100 ${row.status === 'invalid' ? 'bg-rose-50' : ''}`}>
                <td className="px-3 py-2 font-mono text-slate-800">
                  {editable ? (
                    <input
                      type="text"
                      defaultValue={row.secretNumber}
                      onBlur={(e) => onEditRow?.(idx, e.target.value, String(row.normalizedGrade ?? (row.isAbsent ? 'غ' : '')))}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  ) : (
                    row.secretNumber
                  )}
                </td>
                <td className="px-3 py-2 font-bold text-slate-900">{row.studentName || 'غير معروف'}</td>
                <td className="px-3 py-2 text-slate-700">
                  {row.gradeId || '—'} {row.classId ? `- ${row.classId}` : ''}
                </td>
                <td className="px-3 py-2 font-bold text-slate-800">
                  {editable ? (
                    <input
                      type="text"
                      defaultValue={row.isAbsent ? 'غ' : row.normalizedGrade ?? ''}
                      onBlur={(e) => onEditRow?.(idx, String(row.secretNumber), e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  ) : (
                    <>
                      {row.isAbsent ? 'غ' : row.normalizedGrade ?? '—'} {row.maxGrade ? `/ ${row.maxGrade}` : ''}
                    </>
                  )}
                </td>
                <td className="px-3 py-2">
                  {row.status === 'valid' ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black">صالح</span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-black">خطأ</span>
                  )}
                </td>
                <td className="px-3 py-2 text-[12px] text-rose-600">
                  {row.reasons.length ? row.reasons.join(' | ') : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-400 font-bold">
                  لا توجد بيانات للعرض.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!canSave || applied}
          onClick={() => canSave && !applied && onSave(rows)}
          className={`px-5 py-2 rounded-xl text-sm font-black ${
            canSave && !applied
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-slate-200 text-slate-500 cursor-not-allowed'
          }`}
        >
          {applied ? 'تم التطبيق' : 'اعتماد النتائج'}
        </button>
      </div>
    </div>
  );
};

export default GradesPreviewTable;
