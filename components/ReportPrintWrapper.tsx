
import React from 'react';
import { School, ReportConfig, SignatureStep } from '../types';

interface ReportPrintWrapperProps {
  reportTitle?: string;
  activeSchool?: School;
  reportConfig?: ReportConfig;
  children: React.ReactNode;
  lang?: 'ar' | 'en';
  activeYearName?: string;
  // global print controls
  printOverrides?: {
    paperSize?: string;
    orientation?: 'portrait' | 'landscape';
    marginTop?: number;
    marginRight?: number;
    marginBottom?: number;
    marginLeft?: number;
    scale?: number; // 1 = 100%
  };
  // legacy props support
  title?: string;
  settings?: any;
  subtitle?: string;
  // allow passing classes
  className?: string;
}

const ReportPrintWrapper: React.FC<ReportPrintWrapperProps> = ({ 
  reportTitle, title, activeSchool, reportConfig, children, lang = 'ar', activeYearName, printOverrides, className
}) => {
  const isRtl = lang === 'ar';
  const safeConfig = reportConfig || { Signature_Chain: [] };
  const resolvedTitle = reportTitle || title || '';
  const marginTop = printOverrides?.marginTop ?? 12;
  const marginRight = printOverrides?.marginRight ?? 12;
  const marginBottom = printOverrides?.marginBottom ?? 12;
  const marginLeft = printOverrides?.marginLeft ?? 12;
  const paperSize = (printOverrides?.paperSize || 'A4').toUpperCase();
  const orientation = printOverrides?.orientation || 'portrait';
  const scale = printOverrides?.scale ?? 1;

  return (
    <div
      className={`report-print bg-white p-12 min-h-screen text-slate-900 ${isRtl ? 'text-right' : 'text-left'} ${className || ''}`}
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        '--print-margin-top': `${marginTop}mm`,
        '--print-margin-right': `${marginRight}mm`,
        '--print-margin-bottom': `${marginBottom}mm`,
        '--print-margin-left': `${marginLeft}mm`,
        '--print-scale': scale
      } as React.CSSProperties}
    >
      <style>{`
        @media print {
          @page { size: ${paperSize} ${orientation}; margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm; }
          body { background: #fff; }
          body * { visibility: hidden; }
          .report-print, .report-print * { visibility: visible; }
          .report-print {
            position: absolute;
            inset: 0;
            width: 100%;
            transform: scale(var(--print-scale, 1));
            transform-origin: top center;
            padding: var(--print-margin-top, 12mm) var(--print-margin-right, 12mm) var(--print-margin-bottom, 12mm) var(--print-margin-left, 12mm);
            box-shadow: none;
            --print-header-height: 36mm;
            --print-footer-height: 24mm;
          }
          .report-print select,
          .report-print button {
            display: none !important;
          }
          .report-print .print-header > .print-header-inner,
          .report-print .print-footer > .print-footer-inner {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .report-print .print-header-inner {
            padding-bottom: 6mm;
          }
          .report-print .print-footer-inner {
            padding-top: 4mm;
          }
          .report-print .print-body {
            padding: 0;
          }
          .report-print table { width: 100%; border-collapse: collapse; }
          .report-print thead { display: table-header-group; }
          .report-print tfoot { display: table-footer-group; }
          .report-print th, .report-print td { padding: 6px 8px; font-size: 11px; }
          .report-print .print-compact { font-size: 10px; }
          .report-print .print-title { font-size: 16px; }
          .report-print .print-muted { color: #6b7280; }
          .report-print { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <table className="print-layout w-full border-collapse">
        <thead className="print-header">
          <tr>
            <td>
              {/* 1. HEADER AREA */}
              <div className="print-header-inner flex items-start justify-between border-b-2 border-slate-900 pb-6">
                {/* RIGHT: School Info (Arabic Context) */}
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-black">{activeSchool?.Directorate || 'مديرية التعليم'}</p>
                  <p className="text-sm font-black">{activeSchool?.Administration || 'إدارة تعليمية'}</p>
                  <p className="text-sm font-black">{activeSchool?.Name || activeSchool?.School_Name || 'اسم المدرسة'}</p>
                </div>

                {/* CENTER: Report Title */}
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="px-8 py-3 border-2 border-slate-900 rounded-xl bg-slate-50">
                    <h2 className="print-title text-xl font-black uppercase tracking-tight">{resolvedTitle}</h2>
                  </div>
                  {activeYearName && (
                    <p className="print-compact text-[11px] text-slate-700 font-black mt-2">
                      {isRtl ? 'السنة الدراسية:' : 'Academic Year:'} {activeYearName}
                    </p>
                  )}
                  <p className="print-compact text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">
                    Printed On: {new Date().toLocaleDateString()}
                  </p>
                </div>

                {/* LEFT: Logo */}
                <div className="flex-1 flex justify-end">
                  {activeSchool?.Logo ? (
                    <img src={activeSchool.Logo} alt="School Logo" className="h-20 w-20 object-contain" />
                  ) : (
                    <div className="h-20 w-20 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[10px] text-slate-300 font-black">LOGO</div>
                  )}
                </div>
              </div>
            </td>
          </tr>
        </thead>

        <tbody className="print-body">
          <tr>
            <td className="min-h-[600px]">
              {/* 2. MAIN CONTENT (Table, Data, etc) */}
              <div className="mb-12">
                {children}
              </div>
            </td>
          </tr>
        </tbody>

        <tfoot className="print-footer border-t border-slate-200 pt-8">
          <tr>
            <td>
              {/* 3. FOOTER AREA (Signatures) */}
              <div className="print-footer-inner flex items-end justify-between w-full min-h-[120px]">
                {/* Signatures are arranged by alignment defined in store */}
                <div className="flex-1 flex flex-col items-start gap-6 h-full justify-end">
                  {safeConfig.Signature_Chain.filter(s => s.Alignment === 'left').map(s => <SignatureBlock key={s.Step_ID} s={s} isRtl={isRtl} />)}
                </div>
                <div className="flex-1 flex flex-col items-center gap-6 h-full justify-end">
                  {safeConfig.Signature_Chain.filter(s => s.Alignment === 'center').map(s => <SignatureBlock key={s.Step_ID} s={s} isRtl={isRtl} />)}
                </div>
                <div className="flex-1 flex flex-col items-end gap-6 h-full justify-end">
                  {safeConfig.Signature_Chain.filter(s => s.Alignment === 'right').map(s => <SignatureBlock key={s.Step_ID} s={s} isRtl={isRtl} />)}
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

const SignatureBlock = ({ s, isRtl }: { s: SignatureStep, isRtl: boolean }) => (
  <div className="text-center w-40 animate-in fade-in duration-500">
    {s.Is_Stamp_Required && (
      <div className="w-16 h-16 border-2 border-slate-900/10 rounded-full mx-auto mb-2 flex items-center justify-center text-slate-900/10 uppercase text-[8px] font-black tracking-widest rotate-12">OFFICIAL SEAL</div>
    )}
    <div className="h-10 border-b border-slate-900/20 w-full mb-1"></div>
    <p className="text-[10px] font-black text-slate-700">{isRtl ? s.Display_Title_Ar : s.Display_Title_En}</p>
  </div>
);

export default ReportPrintWrapper;
