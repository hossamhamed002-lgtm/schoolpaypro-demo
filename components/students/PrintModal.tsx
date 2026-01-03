import React from 'react';
import { X } from 'lucide-react';

export type ModalPrintSettings = {
  paperSize: 'A4' | 'A3' | 'Letter';
  orientation: 'Portrait' | 'Landscape';
  margins: { top: number; right: number; bottom: number; left: number };
  scale: number;
  repeatHeader: boolean;
  fontFamily: string;
  fontSize: number;
  columnsMode: 'all' | 'custom';
  selectedColumns: string[];
};

interface PrintModalProps {
  open: boolean;
  onClose: () => void;
  settings: ModalPrintSettings;
  onChange: (s: ModalPrintSettings) => void;
  onPrint: () => void;
  preview: React.ReactNode;
}

const PrintModal: React.FC<PrintModalProps> = ({ open, onClose, settings, onChange, onPrint, preview }) => {
  if (!open) return null;

  const updateMargins = (key: keyof PrintSettings['margins'], value: number) => {
    onChange({ ...settings, margins: { ...settings.margins, [key]: value } });
  };

  const toggleColumn = (id: string) => {
    const selected = settings.selectedColumns.includes(id)
      ? settings.selectedColumns.filter((c) => c !== id)
      : [...settings.selectedColumns, id];
    onChange({ ...settings, selectedColumns: selected, columnsMode: 'custom' });
  };

  const columns = [
    { id: 'studentName', label: 'اسم الطالب' },
    { id: 'grade', label: 'الصف' },
    { id: 'year', label: 'العام' },
    { id: 'duration', label: 'مدة البقاء' },
    { id: 'birth', label: 'تاريخ ميلاد الطالب' },
    { id: 'studentNid', label: 'رقم قومي الطالب' },
    { id: 'guardianName', label: 'اسم ولي الأمر' },
    { id: 'guardianNid', label: 'رقم قومي ولي الأمر' },
    { id: 'guardianDob', label: 'تاريخ ميلاد ولي الأمر' },
    { id: 'guardianMobile', label: 'موبايل ولي الأمر' },
    { id: 'address', label: 'العنوان' },
    { id: 'fromSchool', label: 'المدرسة المحول منها' },
    { id: 'currentSchool', label: 'المدرسة المقيد بها' },
    { id: 'toSchool', label: 'المدرسة المحول إليها' },
    { id: 'reason', label: 'سبب التحويل' },
    { id: 'fees', label: 'موقف الرسوم' },
    { id: 'books', label: 'موقف الكتب' }
  ];

  const mmToPx = (mm: number) => mm * 3;
  const paperDims = (() => {
    switch (settings.paperSize) {
      case 'A3':
        return settings.orientation === 'Landscape' ? { w: mmToPx(420), h: mmToPx(297) } : { w: mmToPx(297), h: mmToPx(420) };
      case 'Letter':
        return settings.orientation === 'Landscape' ? { w: mmToPx(279), h: mmToPx(216) } : { w: mmToPx(216), h: mmToPx(279) };
      case 'A4':
      default:
        return settings.orientation === 'Landscape' ? { w: mmToPx(297), h: mmToPx(210) } : { w: mmToPx(210), h: mmToPx(297) };
    }
  })();

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-black text-slate-900">إعدادات الطباعة</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          <div className="p-6 space-y-4 border-r border-slate-100">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500">حجم الورق</label>
                <select
                  value={settings.paperSize}
                  onChange={(e) => onChange({ ...settings, paperSize: e.target.value as any })}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                >
                  <option value="A4">A4</option>
                  <option value="A3">A3</option>
                  <option value="Letter">Letter</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500">اتجاه الصفحة</label>
                <select
                  value={settings.orientation}
                  onChange={(e) => onChange({ ...settings, orientation: e.target.value as any })}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                >
                  <option value="Portrait">طولي</option>
                  <option value="Landscape">عرضي</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-500">الهوامش (مم)</label>
              <div className="grid grid-cols-2 gap-2">
                {(['top', 'bottom', 'left', 'right'] as const).map((edge) => (
                  <div key={edge} className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 w-12">{edge}</span>
                    <input
                      type="range"
                      min={5}
                      max={40}
                      value={settings.margins[edge]}
                      onChange={(e) => updateMargins(edge, Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                    <span className="text-[11px] font-bold text-slate-600 w-10">{settings.margins[edge]}mm</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500">مقياس الطباعة (%)</label>
                <input
                  type="range"
                  min={50}
                  max={130}
                  value={Math.round(settings.scale * 100)}
                  onChange={(e) => onChange({ ...settings, scale: Number(e.target.value) / 100 })}
                  className="accent-indigo-600"
                />
                <div className="text-[11px] font-bold text-slate-600">{Math.round(settings.scale * 100)}%</div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-slate-500">تكرار رأس الجدول</label>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={settings.repeatHeader}
                    onChange={(e) => onChange({ ...settings, repeatHeader: e.target.checked })}
                  />
                  نعم، كرر الرأس بكل صفحة
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500">الخط</label>
                <input
                  type="text"
                  value={settings.fontFamily}
                  onChange={(e) => onChange({ ...settings, fontFamily: e.target.value })}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                  placeholder="مثال: Cairo"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500">حجم الخط</label>
                <input
                  type="number"
                  min={8}
                  max={18}
                  value={settings.fontSize}
                  onChange={(e) => onChange({ ...settings, fontSize: Number(e.target.value) || 12 })}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500">الأعمدة</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input
                    type="radio"
                    checked={settings.columnsMode === 'all'}
                    onChange={() => onChange({ ...settings, columnsMode: 'all' })}
                  />
                  كل الأعمدة
                </label>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input
                    type="radio"
                    checked={settings.columnsMode === 'custom'}
                    onChange={() => onChange({ ...settings, columnsMode: 'custom' })}
                  />
                  اختيار أعمدة
                </label>
              </div>
              {settings.columnsMode === 'custom' && (
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-auto border border-slate-200 rounded-xl p-2">
                  {columns.map((col) => (
                    <label key={col.id} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={settings.selectedColumns.includes(col.id)}
                        onChange={() => toggleColumn(col.id)}
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="p-6 bg-slate-50">
            <p className="text-[11px] font-bold text-slate-600 mb-2">معاينة مباشرة</p>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-inner p-4 max-h-[80vh] overflow-auto">
              <div
                className="mx-auto bg-slate-50 border border-dashed border-slate-200"
                style={{
                  width: paperDims.w,
                  height: paperDims.h,
                  overflow: 'auto',
                  transform: `scale(${settings.scale})`,
                  transformOrigin: 'top center',
                  fontFamily: settings.fontFamily,
                  fontSize: `${settings.fontSize}px`
                }}
              >
                <div
                  style={{
                    paddingTop: mmToPx(settings.margins.top),
                    paddingBottom: mmToPx(settings.margins.bottom),
                    paddingLeft: mmToPx(settings.margins.left),
                    paddingRight: mmToPx(settings.margins.right)
                  }}
                >
                  {preview}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-slate-300"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="rounded-xl bg-indigo-600 text-white px-5 py-2 text-sm font-black shadow hover:bg-slate-900 transition"
          >
            طباعة
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintModal;
