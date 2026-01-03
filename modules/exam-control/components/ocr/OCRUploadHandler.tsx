import React, { useMemo, useState } from 'react';
import { OcrAssessmentSetup, OcrGradeInputRow, OcrGradePreviewRow, buildPreviewRows } from '../../services/ocrGrades';
import googleVisionOCR from '../../services/googleVisionOCR';

type Props = {
  setup: OcrAssessmentSetup;
  students: any[];
  subjects: any[];
  onPreview: (rows: OcrGradePreviewRow[]) => void;
  onRawRows?: (rows: OcrGradeInputRow[]) => void;
  disabled?: boolean;
};

const arabicToEnglishDigits = (value: string) =>
  value.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

const normalizeSecret = (raw: string) => {
  const digits = arabicToEnglishDigits(raw).replace(/[^\d]/g, '');
  return digits || raw.trim();
};

const normalizeGrade = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed === 'غ') return 'غ';
  const cleaned = trimmed.replace(/[.,٫،]/g, ''); // remove decimal/separator glyphs
  const digits = arabicToEnglishDigits(cleaned).replace(/[^\d]/g, '');
  if (digits) return digits;
  return trimmed;
};

const parseTextToRows = (
  text: string
): { rawRows: OcrGradeInputRow[]; invalidPreview: OcrGradePreviewRow[] } => {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rawRows: OcrGradeInputRow[] = [];
  const invalidPreview: OcrGradePreviewRow[] = [];

  lines.forEach((line, idx) => {
    const normalizedLine = arabicToEnglishDigits(line);
    const parts = normalizedLine.split(/[\|,،\s\t]+/).filter(Boolean);
    if (parts.length !== 2) {
      rawRows.push({
        secretNumber: normalizeSecret(parts[0] || ''),
        gradeRaw: normalizeGrade(parts[1] || '')
      });
      invalidPreview.push({
        secretNumber: parts[0] || `ROW_${idx + 1}`,
        status: 'invalid',
        reasons: ['INVALID_COLUMNS_COUNT'],
        normalizedGrade: undefined,
        studentName: undefined,
        studentId: undefined,
        gradeId: undefined,
        classId: undefined,
        maxGrade: undefined,
        isAbsent: false
      });
      return;
    }
    const secretPart = parts[0] || '';
    const gradePart = parts[1] || '';
    rawRows.push({
      secretNumber: normalizeSecret(secretPart),
      gradeRaw: normalizeGrade(gradePart)
    });
  });

  return { rawRows, invalidPreview };
};

const OCRUploadHandler: React.FC<Props> = ({ setup, students, subjects, onPreview, onRawRows, disabled = false }) => {
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewInfo, setPreviewInfo] = useState<string>('');

  const acceptedTextTypes = useMemo(() => ['text/plain', 'text/csv', 'application/json'], []);

  const decodeTextFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(buffer);
  };

  const loadPdfJs = async () => {
    if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
      return (window as any).pdfjsLib;
    }
    const pdfjs = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
    if (pdfjs && pdfjs.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc =
        pdfjs.GlobalWorkerOptions.workerSrc ||
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
    }
    return pdfjs;
  };

  const runVisionOcrOnImage = async (file: File) => {
    setPreviewInfo('جاري تشغيل OCR عبر Google Vision...');
    const text = await googleVisionOCR.extractTextFromImage(file);
    const { rawRows, invalidPreview } = parseTextToRows(text);
    onRawRows?.(rawRows);
    const previewValid = rawRows.length ? buildPreviewRows({ rawRows, setup, students, subjects }) : [];
    onPreview([...invalidPreview, ...previewValid]);
    setPreviewInfo('تم استخراج النص ومعالجته للعرض.');
  };

  const runOcrOnPdf = async (file: File) => {
    setPreviewInfo('جاري فك ترميز PDF وتشغيل OCR على الصفحات...');
    const buffer = await file.arrayBuffer();
    const pdfjs = await loadPdfJs();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    let aggregatedText = '';
    const pageCount = Math.min(pdf.numPages, 3);

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b || new Blob()), 'image/png')
      );
      const pageFile = new File([blob], `page-${i}.png`, { type: 'image/png' });
      aggregatedText += '\n' + (await googleVisionOCR.extractTextFromImage(pageFile));
      if (i === 1) {
        setPreviewUrl(canvas.toDataURL('image/png'));
      }
    }

    const { rawRows, invalidPreview } = parseTextToRows(aggregatedText);
    onRawRows?.(rawRows);
    const previewValid = rawRows.length ? buildPreviewRows({ rawRows, setup, students, subjects }) : [];
    onPreview([...invalidPreview, ...previewValid]);
    setPreviewInfo('تم استخراج النص من PDF.');
  };

  const handleFile = async (file: File) => {
    setIsParsing(true);
    setError(null);
    setPreviewUrl(null);
    setPreviewInfo('');
    try {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        await runVisionOcrOnImage(file);
      } else if (file.type === 'application/pdf') {
        await runOcrOnPdf(file);
      } else if (
        acceptedTextTypes.some((t) => file.type.includes(t) || file.name.endsWith('.txt') || file.name.endsWith('.csv'))
      ) {
        const text = await decodeTextFile(file);
        const { rawRows, invalidPreview } = parseTextToRows(text);
        if (!rawRows.length && !invalidPreview.length) {
          setError('لم يتم العثور على بيانات صالحة داخل الملف.');
          setIsParsing(false);
          return;
        }
        onRawRows?.(rawRows);
        const previewValid = rawRows.length ? buildPreviewRows({ rawRows, setup, students, subjects }) : [];
        onPreview([...invalidPreview, ...previewValid]);
        setPreviewInfo('تم استخدام محتوى الملف النصي مباشرة بدون OCR.');
      } else {
        setError('صيغة الملف غير مدعومة. استخدم صورة أو PDF.');
        onPreview([]);
      }
    } catch (err: any) {
      console.error(err);
      setError('تعذر تشغيل OCR أو قراءة الملف. يرجى التحقق من الملف أو إعدادات Google Vision.');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-3" dir="rtl">
      <p className="text-xs font-bold text-slate-500">
        صيغة الملف المطلوبة: جدول يحتوي على عمودين في نفس الصف (العمود الأول: الرقم السري، العمود الثاني: الدرجة). ⚠️ يُرجى عدم قص الأعمدة أو رفع صور منفصلة.
      </p>
      <input
        type="file"
        accept="image/*,.pdf,.txt,.csv"
        disabled={disabled || isParsing}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 1) {
            setError('يرجى رفع ملف واحد فقط يحتوي على الجدول كاملًا');
            onPreview([]);
            return;
          }
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
        className={`w-full rounded-xl border px-3 py-2 text-sm font-bold ${
          disabled ? 'border-slate-200 bg-slate-100 cursor-not-allowed' : 'border-slate-300 bg-white'
        }`}
      />
      {isParsing && <p className="text-xs text-indigo-600 font-bold">جاري تشغيل OCR...</p>}
      {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}
      {previewInfo && <p className="text-xs text-emerald-700 font-bold">{previewInfo}</p>}
      {previewUrl && (
        <div className="mt-2 border rounded-xl overflow-hidden">
          <img src={previewUrl} alt="معاينة الملف" className="max-h-64 w-full object-contain" />
        </div>
      )}
    </div>
  );
};

export default OCRUploadHandler;
