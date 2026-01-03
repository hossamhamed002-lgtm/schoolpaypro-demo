
import * as XLSX from 'xlsx';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { printExamReport, ReportHeaderConfig } from '../print/examPrintAdapter';
import { exportPdf } from '../../../src/print/exportPdfEngine';

export const exportUtils = {
  /**
   * للطباعة مع معاينة احترافية تدعم التوجيه والهوامش المخصصة
   * @param elementId معرف العنصر المراد طباعته
   * @param orientation 'portrait' أو 'landscape'
   * @param margin الهامش بالملم (افتراضي 5)
   */
  print: (elementId?: string, orientation: 'portrait' | 'landscape' = 'portrait', _margin: number = 5, headerModel?: ReportHeaderConfig) => {
    const baseRoot = elementId
      ? (document.getElementById(elementId)?.closest('[data-exam-print-preview]') as HTMLElement | null)
        || (document.getElementById(elementId) as HTMLElement | null)
      : (document.getElementById('exam-print-root') || document.querySelector('[data-exam-print-preview]')) as HTMLElement | null;

    const exportRoot = baseRoot?.closest('[data-export-root]') || document.querySelector('[data-export-root]');
    if (exportRoot) {
      const handled = exportPdf({ root: exportRoot, orientation, mode: 'print' });
      if (handled) return;
    }

    if (baseRoot) {
      const hasTable = !!baseRoot.querySelector('[data-exam-print-table]');
      if (hasTable) {
        printExamReport({ sourceElement: baseRoot, orientation, header: headerModel });
        return;
      }
      const headHtml = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((node) => node.outerHTML)
        .join('\n');
      const clone = baseRoot.cloneNode(true) as HTMLElement;
      const win = window.open('', '_blank');
      if (win) {
        const sizeCss = `@page { size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'}; margin: 0; }`;
        win.document.write(`
          <html dir="rtl">
            <head>
              ${headHtml}
              <style>
                ${sizeCss}
                html, body { margin: 0; padding: 0; }
                body { font-family: 'Tajawal', 'Inter', sans-serif; -webkit-print-color-adjust: exact; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body></body>
          </html>
        `);
        win.document.body.appendChild(clone);
        win.document.close();
        win.focus();
        win.print();
        win.close();
        return;
      }
    }
    window.print();
  },

  /**
   * للتصدير إلى ملف PDF احترافي مع هوامش مخصصة
   */
  exportToPDF: (
    elementId: string,
    filename: string,
    orientation: 'portrait' | 'landscape' = 'portrait',
    margin: number = 5,
    format: 'a4' | 'a3' = 'a4'
  ) => {
    const element = document.getElementById(elementId);
    if (!element) return Promise.reject('Element not found');

    const exportRoot = element.closest('[data-export-root]');
    if (exportRoot) {
      const handled = exportPdf({
        root: exportRoot as HTMLElement,
        mode: 'pdf',
        orientation,
        pageSize: format.toUpperCase() === 'A3' ? 'A3' : 'A4',
        fileName: filename
      });
      if (handled) return Promise.resolve();
    }

    const rect = element.getBoundingClientRect();
    const targetId = elementId;
    const opt = {
      margin: margin,
      filename: `${filename}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        letterRendering: false,
        foreignObjectRendering: true,
        windowWidth: Math.max(element.scrollWidth, rect.width),
        windowHeight: Math.max(element.scrollHeight, rect.height),
        scrollX: 0,
        scrollY: 0,
        onclone: (doc: Document) => {
          document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
            doc.head.appendChild(node.cloneNode(true));
          });
          const link = doc.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&display=swap';
          doc.head.appendChild(link);
          const style = doc.createElement('style');
          style.textContent = `
            * { font-family: 'Cairo', 'Noto Naskh Arabic', sans-serif !important; }
            html, body { direction: rtl; unicode-bidi: plaintext; }
            body { font-smooth: always; -webkit-font-smoothing: antialiased; }
            .no-print { display: none !important; }
          `;
          doc.head.appendChild(style);
          const printRoot = doc.getElementById(targetId);
          if (printRoot) {
            (printRoot as HTMLElement).style.overflow = 'visible';
            (printRoot as HTMLElement).style.height = 'auto';
            (printRoot as HTMLElement).style.maxHeight = 'none';
          }
        }
      },
      pagebreak: { mode: ['css', 'legacy'] as const },
      jsPDF: { unit: 'mm' as const, format: format as const, orientation: orientation }
    };

    return html2pdf().set(opt).from(element).save();
  },

  exportTableToExcel: (tableId: string, filename: string) => {
    const table = document.getElementById(tableId);
    if (!table) return;
    const wb = XLSX.utils.table_to_book(table);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  },

  exportDataToExcel: (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }
};
