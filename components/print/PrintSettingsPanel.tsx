import React, { useMemo, useRef, useState } from 'react';
import { PrintProfile, FitMode, DEFAULT_PRINT_PROFILE } from './printProfile';

interface PrintSettingsPanelProps {
  profile: PrintProfile;
  onChange: (next: PrintProfile) => void;
  onReset?: () => void;
  className?: string;
}

type DragEdge = 'top' | 'bottom' | 'left' | 'right' | null;

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const PrintSettingsPanel: React.FC<PrintSettingsPanelProps> = ({ profile, onChange, onReset, className }) => {
  const [dragging, setDragging] = useState<DragEdge>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const mmToPx = (mm: number) => mm * 3; // تقريب بصري كافي للمعاينة

  const paperDims = useMemo(() => {
    switch (profile.paperSize) {
      case 'A3':
        return profile.orientation === 'Landscape' ? { w: mmToPx(420), h: mmToPx(297) } : { w: mmToPx(297), h: mmToPx(420) };
      case 'Letter':
        return profile.orientation === 'Landscape' ? { w: mmToPx(279), h: mmToPx(216) } : { w: mmToPx(216), h: mmToPx(279) };
      case 'A4':
      default:
        return profile.orientation === 'Landscape' ? { w: mmToPx(297), h: mmToPx(210) } : { w: mmToPx(210), h: mmToPx(297) };
    }
  }, [profile.paperSize, profile.orientation]);

  const handleDrag = (edge: DragEdge, clientX: number, clientY: number) => {
    if (!previewRef.current || !edge) return;
    const rect = previewRef.current.getBoundingClientRect();
    const posX = clientX - rect.left;
    const posY = clientY - rect.top;
    const pxToMm = (px: number) => px / 3;
    const next = { ...profile, margins: { ...profile.margins } };
    if (edge === 'top') next.margins.top = clamp(pxToMm(posY), 5, 40);
    if (edge === 'bottom') next.margins.bottom = clamp(pxToMm(rect.height - posY), 5, 40);
    if (edge === 'left') next.margins.left = clamp(pxToMm(posX), 5, 40);
    if (edge === 'right') next.margins.right = clamp(pxToMm(rect.width - posX), 5, 40);
    onChange(next);
  };

  const startDrag = (edge: DragEdge) => (e: React.MouseEvent) => {
    setDragging(edge);
    handleDrag(edge, e.clientX, e.clientY);
  };

  const stopDrag = () => setDragging(null);

  return (
    <div className={`space-y-4 ${className || ''}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-500">Paper</label>
          <select
            value={profile.paperSize}
            onChange={(e) => onChange({ ...profile, paperSize: e.target.value as PrintProfile['paperSize'] })}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
          >
            <option value="A4">A4</option>
            <option value="A3">A3</option>
            <option value="Letter">Letter</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-500">Orientation</label>
          <select
            value={profile.orientation}
            onChange={(e) => onChange({ ...profile, orientation: e.target.value as PrintProfile['orientation'] })}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
          >
            <option value="Portrait">Portrait</option>
            <option value="Landscape">Landscape</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-500">Scale (%)</label>
          <input
            type="range"
            min={50}
            max={130}
            value={Math.round(profile.scale * 100)}
            onChange={(e) => onChange({ ...profile, scale: Number(e.target.value) / 100 })}
            className="accent-indigo-600"
          />
          <div className="text-[11px] font-bold text-slate-600">{Math.round(profile.scale * 100)}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-500">Fit to</label>
          <select
            value={profile.fitTo}
            onChange={(e) => onChange({ ...profile, fitTo: e.target.value as FitMode })}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
          >
            <option value="none">None</option>
            <option value="width">Fit columns to one page</option>
            <option value="height">Fit rows to one page</option>
            <option value="page">Fit sheet on one page</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-500">Margins (mm)</label>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            <input
              type="number"
              min={5}
              max={40}
              value={profile.margins.top}
              onChange={(e) => onChange({ ...profile, margins: { ...profile.margins, top: Number(e.target.value) || 12 } })}
              className="rounded-xl border border-slate-200 bg-white px-2 py-1 font-bold text-slate-700"
              placeholder="Top"
            />
            <input
              type="number"
              min={5}
              max={40}
              value={profile.margins.bottom}
              onChange={(e) => onChange({ ...profile, margins: { ...profile.margins, bottom: Number(e.target.value) || 12 } })}
              className="rounded-xl border border-slate-200 bg-white px-2 py-1 font-bold text-slate-700"
              placeholder="Bottom"
            />
            <input
              type="number"
              min={5}
              max={40}
              value={profile.margins.left}
              onChange={(e) => onChange({ ...profile, margins: { ...profile.margins, left: Number(e.target.value) || 12 } })}
              className="rounded-xl border border-slate-200 bg-white px-2 py-1 font-bold text-slate-700"
              placeholder="Left"
            />
            <input
              type="number"
              min={5}
              max={40}
              value={profile.margins.right}
              onChange={(e) => onChange({ ...profile, margins: { ...profile.margins, right: Number(e.target.value) || 12 } })}
              className="rounded-xl border border-slate-200 bg-white px-2 py-1 font-bold text-slate-700"
              placeholder="Right"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-500">Header / Footer</label>
          <label className="text-[11px] font-bold text-slate-600 flex items-center gap-2">
            <input
              type="checkbox"
              checked={profile.header.enabled}
              onChange={(e) => onChange({ ...profile, header: { ...profile.header, enabled: e.target.checked } })}
            />
            Header
          </label>
          <label className="text-[11px] font-bold text-slate-600 flex items-center gap-2">
            <input
              type="checkbox"
              checked={profile.footer.enabled}
              onChange={(e) => onChange({ ...profile, footer: { ...profile.footer, enabled: e.target.checked } })}
            />
            Footer
          </label>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-500">Table Options</label>
          <label className="text-[11px] font-bold text-slate-600 flex items-center gap-2">
            <input
              type="checkbox"
              checked={profile.repeatHeader}
              onChange={(e) => onChange({ ...profile, repeatHeader: e.target.checked })}
            />
            Repeat header
          </label>
          <label className="text-[11px] font-bold text-slate-600 flex items-center gap-2">
            <input
              type="checkbox"
              checked={profile.showGridLines}
              onChange={(e) => onChange({ ...profile, showGridLines: e.target.checked })}
            />
            Show gridlines
          </label>
          <label className="text-[11px] font-bold text-slate-600 flex items-center gap-2">
            <input
              type="checkbox"
              checked={profile.showBorders}
              onChange={(e) => onChange({ ...profile, showBorders: e.target.checked })}
            />
            Show borders
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <p className="text-[11px] font-bold text-slate-600 mb-2">Header</p>
          <div className="grid grid-cols-3 gap-2">
            {(['left', 'center', 'right'] as const).map((pos) => (
              <input
                key={pos}
                type="text"
                placeholder={pos}
                value={profile.header[pos]}
                onChange={(e) =>
                  onChange({ ...profile, header: { ...profile.header, [pos]: e.target.value } })
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
              />
            ))}
          </div>
          <p className="text-[11px] font-bold text-slate-600 mb-2 mt-3">Footer</p>
          <div className="grid grid-cols-3 gap-2">
            {(['left', 'center', 'right'] as const).map((pos) => (
              <input
                key={pos}
                type="text"
                placeholder={pos}
                value={profile.footer[pos]}
                onChange={(e) =>
                  onChange({ ...profile, footer: { ...profile.footer, [pos]: e.target.value } })
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
              />
            ))}
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <p className="text-[11px] font-bold text-slate-600 mb-2">Margins preview (drag edges)</p>
          <div
            ref={previewRef}
            className="relative bg-white border border-slate-300 rounded-xl mx-auto"
            style={{ width: paperDims.w, height: paperDims.h }}
            onMouseMove={(e) => dragging && handleDrag(dragging, e.clientX, e.clientY)}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
          >
            <div
              className="absolute inset-0 bg-slate-100/60"
              style={{
                paddingTop: mmToPx(profile.margins.top),
                paddingBottom: mmToPx(profile.margins.bottom),
                paddingLeft: mmToPx(profile.margins.left),
                paddingRight: mmToPx(profile.margins.right)
              }}
            >
              <div className="w-full h-full bg-white border border-dashed border-slate-400 rounded"></div>
            </div>
            {(['top', 'bottom', 'left', 'right'] as DragEdge[]).map((edge) => (
              <div
                key={edge}
                onMouseDown={startDrag(edge)}
                className="absolute bg-indigo-500/60 hover:bg-indigo-600 transition cursor-row-resize"
                style={
                  edge === 'top'
                    ? { top: mmToPx(profile.margins.top), left: 0, right: 0, height: 6 }
                    : edge === 'bottom'
                    ? { bottom: mmToPx(profile.margins.bottom), left: 0, right: 0, height: 6 }
                    : edge === 'left'
                    ? { left: mmToPx(profile.margins.left), top: 0, bottom: 0, width: 6, cursor: 'col-resize' }
                    : { right: mmToPx(profile.margins.right), top: 0, bottom: 0, width: 6, cursor: 'col-resize' }
                }
                title={edge}
              />
            ))}
            <div className="absolute top-1 left-1 text-[10px] font-bold text-slate-600">
              {profile.margins.top} / {profile.margins.bottom} / {profile.margins.left} / {profile.margins.right} mm
            </div>
          </div>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-indigo-200 hover:text-indigo-700 transition"
            >
              Reset to defaults
            </button>
          )}
        </div>
      </div>
      <div className="text-[11px] font-bold text-slate-500">
        (تطبق هذه الإعدادات على جميع التقارير التي تستخدم PrintProfile الموحد)
      </div>
      <div className="text-[11px] font-bold text-slate-500 italic">
        Recommended: Fit = page، Scale 90%، A4 Portrait، هوامش 10مم.
      </div>
    </div>
  );
};

PrintSettingsPanel.defaultProps = {
  className: ''
};

export default PrintSettingsPanel;

