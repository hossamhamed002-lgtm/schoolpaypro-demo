import React from 'react';
import ReportPrintWrapper from '../../ReportPrintWrapper';

interface ArSummaryReportProps {
  title: string;
  activeSchool?: any;
  activeYear?: any;
  workingYearId?: string;
  arSummaryMatrix: { feeNames: string[]; rows: any[] };
  arSummaryTotals: { studentCount: number; totalItem: number; exemptions: number; net: number };
}

const ArSummaryReport: React.FC<ArSummaryReportProps> = ({
  title,
  activeSchool,
  activeYear,
  workingYearId,
  arSummaryMatrix,
  arSummaryTotals
}) => {
  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
      <ReportPrintWrapper
        reportTitle={title}
        activeSchool={activeSchool || {}}
        reportConfig={{ Signature_Chain: [] } as any}
        lang="ar"
        activeYearName={(activeYear?.Year_Name || workingYearId || '').toString()}
      >
        <div className="py-10 text-center space-y-4">
          <table className="w-full border-collapse border border-slate-900 text-sm">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="py-2 px-3 border border-slate-900 text-center">م</th>
                <th className="py-2 px-3 border border-slate-900 text-start">المرحلة</th>
                <th className="py-2 px-3 border border-slate-900 text-start">الصف</th>
                <th className="py-2 px-3 border border-slate-900 text-center">عدد الطلاب</th>
                {arSummaryMatrix.feeNames.map((name) => (
                  <th key={name} className="py-2 px-3 border border-slate-900 text-center">{name}</th>
                ))}
                <th className="py-2 px-3 border border-slate-900 text-center">إجمالي المطلوب</th>
                <th className="py-2 px-3 border border-slate-900 text-center">الخصومات</th>
                <th className="py-2 px-3 border border-slate-900 text-center">صافي المطلوب</th>
              </tr>
            </thead>
            <tbody>
              {arSummaryMatrix.rows.map((row, index) => (
                <tr key={`${row.stageName}-${row.gradeName}`}>
                  <td className="py-2 px-3 border border-slate-900 text-center font-bold">{index + 1}</td>
                  <td className="py-2 px-3 border border-slate-900 text-start font-bold">{row.stageName}</td>
                  <td className="py-2 px-3 border border-slate-900 text-start font-bold">{row.gradeName}</td>
                  <td className="py-2 px-3 border border-slate-900 text-center font-mono">{row.studentCount}</td>
                  {arSummaryMatrix.feeNames.map((name) => (
                    <td key={`${row.gradeName}-${name}`} className="py-2 px-3 border border-slate-900 text-center font-mono">
                      {(row.values[name] ?? 0).toFixed(2)}
                    </td>
                  ))}
                  <td className="py-2 px-3 border border-slate-900 text-center font-mono">{row.total.toFixed(2)}</td>
                  <td className="py-2 px-3 border border-slate-900 text-center font-mono">{(row.discounts ?? 0).toFixed(2)}</td>
                  <td className="py-2 px-3 border border-slate-900 text-center font-mono font-black">{row.net.toFixed(2)}</td>
                </tr>
              ))}
              {arSummaryMatrix.rows.length === 0 && (
                <tr>
                  <td colSpan={arSummaryMatrix.feeNames.length + 7} className="py-6 px-3 border border-slate-900 text-center text-slate-400 font-bold">
                    لا توجد بيانات فواتير للعام الدراسي الحالي
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50">
                <td className="py-2 px-3 border border-slate-900 text-center font-black" colSpan={3}>الإجمالي</td>
                <td className="py-2 px-3 border border-slate-900 text-center font-black font-mono">{arSummaryTotals.studentCount}</td>
                {arSummaryMatrix.feeNames.map((name) => {
                  const total = arSummaryMatrix.rows.reduce(
                    (sum, row) => sum + (row.values[name] ?? 0) * (row.studentCount || 0),
                    0
                  );
                  return (
                    <td key={`total-${name}`} className="py-2 px-3 border border-slate-900 text-center font-black font-mono">
                      {total.toFixed(2)}
                    </td>
                  );
                })}
                <td className="py-2 px-3 border border-slate-900 text-center font-black font-mono">{arSummaryTotals.totalItem.toFixed(2)}</td>
                <td className="py-2 px-3 border border-slate-900 text-center font-black font-mono">{arSummaryTotals.exemptions.toFixed(2)}</td>
                <td className="py-2 px-3 border border-slate-900 text-center font-black font-mono">{arSummaryTotals.net.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </ReportPrintWrapper>
    </div>
  );
};

export default ArSummaryReport;
