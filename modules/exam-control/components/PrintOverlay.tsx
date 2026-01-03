import React from 'react';
import { Printer, FileDown, X, MoveHorizontal } from 'lucide-react';

interface PrintOverlayProps {
  margin: number;
  onMarginChange: (value: number) => void;
  onClose: () => void;
  onPrint: () => void;
  onPdf: () => void;
  children: React.ReactNode;
  title?: string;
}

/**
 * غلاف موحّد لمعاينة الطباعة/‏PDF مستخدم في شاشات الكنترول
 * يحافظ على نفس تجربة الأزرار والهوامش
 */
const PrintOverlay: React.FC<PrintOverlayProps> = ({
  margin,
  onMarginChange,
  onClose,
  onPrint,
  onPdf,
  children,
  title
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex flex-col">
      <div className="no-print flex flex-wrap items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2 text-slate-700 font-bold">
          {title || 'معاينة الطباعة'}
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
          <MoveHorizontal size={16} className="text-slate-500" />
          <span className="text-xs font-bold text-slate-600">الهامش</span>
          <input
            type="range"
            min={2}
            max={15}
            value={margin}
            onChange={(e) => onMarginChange(Number(e.target.value))}
            className="w-24 accent-indigo-600 cursor-pointer"
          />
          <span className="text-xs font-mono text-slate-600">{margin}mm</span>
        </div>
        <button
          onClick={onPrint}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold shadow-sm hover:bg-indigo-700"
        >
          <Printer size={16} /> طباعة
        </button>
        <button
          onClick={onPdf}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white font-bold shadow-sm hover:bg-rose-700"
        >
          <FileDown size={16} /> PDF
        </button>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
        >
          <X size={16} /> إغلاق
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-black/20 p-4 md:p-8">
        {children}
      </div>
    </div>
  );
};

export default PrintOverlay;
