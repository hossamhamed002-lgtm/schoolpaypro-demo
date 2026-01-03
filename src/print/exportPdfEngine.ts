type ExportMode = 'print' | 'pdf';

export type ExportPdfOptions = {
  root?: HTMLElement | null;
  mode?: ExportMode;
  fileName?: string;
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'A3';
};

const byPriority = <T>(...values: Array<T | undefined | null>) => values.find((v) => v !== undefined && v !== null);

const getReportTitle = (root: HTMLElement) => {
  const datasetTitle = root.dataset.reportTitle;
  const heading = root.querySelector<HTMLElement>('[data-report-title], h1, h2');
  return byPriority(datasetTitle, heading?.textContent?.trim(), root.dataset.reportId, 'تقرير');
};

const resolveHeader = (root: HTMLElement, reportId: string) => {
  const isTopExam = root.dataset.exportType === 'exam' && reportId === 'top-students';
  const schoolName = root.dataset.schoolName || '';
  const academicYear = root.dataset.academicYear || '';
  const logo = root.dataset.reportLogo || '';
  const title = getReportTitle(root);
  const badge = root.dataset.reportBadge;

  const headerParts: string[] = [];

  if (logo) {
    headerParts.push(`<div class="export-logo"><img src="${logo}" alt="" /></div>`);
  }

  const metaLeft: string[] = [];
  if (schoolName) metaLeft.push(`<span>${schoolName}</span>`);
  if (academicYear) metaLeft.push(`<span>${academicYear}</span>`);

  const headerTitle = `
    <div class="export-title">
      ${isTopExam ? '<div class="trophy">🏆</div>' : ''}
      <div class="title-text">${title}</div>
      ${badge ? `<div class="title-badge">${badge}</div>` : ''}
    </div>
  `;

  const metaSection = metaLeft.length
    ? `<div class="export-meta">${metaLeft.join('<span class="dot">•</span>')}</div>`
    : '';

  return `<header class="export-header">
    ${headerTitle}
    ${metaSection}
  </header>`;
};

const computeLayout = (root: HTMLElement, pageSize?: 'A4' | 'A3', orientation?: 'portrait' | 'landscape') => {
  const table = root.querySelector('table');
  const columnCount = table ? table.querySelectorAll('thead th, thead td').length || table.rows[0]?.cells.length || 0 : 0;
  const rowCount = table ? table.querySelectorAll('tbody tr').length : 0;

  let size: 'A4' | 'A3' = pageSize || (root.dataset.pageSize as 'A4' | 'A3') || 'A4';
  let orient: 'portrait' | 'landscape' = orientation || (root.dataset.orientation as 'portrait' | 'landscape') || 'portrait';

  if (!pageSize && columnCount > 10) size = 'A3';
  if (!orientation && (columnCount > 8 || (root.scrollWidth > root.clientWidth && columnCount > 0))) {
    orient = 'landscape';
  }

  const fitColumns = columnCount > 6;
  const fitRows = rowCount > 40 || (columnCount > 8 && rowCount > 25);
  const scale = columnCount > 12 ? 0.85 : columnCount > 9 ? 0.92 : 1;

  return { size, orient, fitColumns, fitRows, scale };
};

export const exportPdf = (options: ExportPdfOptions = {}): boolean => {
  const targetRoot =
    options.root ||
    document.querySelector<HTMLElement>('[data-export-root]') ||
    document.querySelector<HTMLElement>('[data-exam-print-preview]');

  if (!targetRoot) return false;

  const clone = targetRoot.cloneNode(true) as HTMLElement;
  const reportId = targetRoot.dataset.reportId || 'report';
  const { size, orient, fitColumns, fitRows, scale } = computeLayout(
    targetRoot,
    options.pageSize,
    options.orientation
  );

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    return false;
  }

  const headerHtml = resolveHeader(targetRoot, reportId);

  doc.open();
  doc.write(`
    <html dir="rtl">
      <head>
        <style>
          @page { size: ${size} ${orient}; margin: 10mm; }
          html, body { margin: 0; padding: 0; }
          body {
            font-family: 'Tajawal', 'Inter', sans-serif;
            -webkit-print-color-adjust: exact;
            color: #0f172a;
            background: white;
          }
          .export-shell {
            padding: 12mm;
            transform-origin: top right;
            transform: scale(${scale});
          }
          .export-header {
            text-align: center;
            margin-bottom: 12px;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          .export-header .export-meta {
            display: inline-flex;
            gap: 10px;
            font-size: 12px;
            color: #1f2937;
            margin-top: 6px;
          }
          .export-header .dot { color: #d1d5db; }
          .export-title {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 18px;
            font-weight: 800;
          }
          .export-title .title-badge {
            font-size: 11px;
            padding: 4px 8px;
            border-radius: 999px;
            border: 1px solid #e5e7eb;
            background: #f8fafc;
          }
          .export-logo img {
            height: 48px;
            width: 48px;
            object-fit: contain;
            display: block;
            margin: 0 auto 8px auto;
          }
          .trophy { font-size: 20px; }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: ${fitColumns ? 'fixed' : 'auto'};
          }
          thead th {
            background: #f4f6f9;
            position: sticky;
            top: 0;
            z-index: 2;
          }
          th, td {
            border: 1px solid #0f172a;
            padding: ${fitRows ? '4px 6px' : '6px 10px'};
            font-size: ${fitRows ? '11px' : '12px'};
            line-height: ${fitRows ? '1.2' : '1.35'};
            white-space: ${fitColumns ? 'normal' : 'nowrap'};
            word-break: ${fitColumns ? 'break-word' : 'normal'};
          }
          tr { page-break-inside: avoid; }
          .fit-columns * { word-wrap: break-word; }
        </style>
      </head>
      <body>
        <div class="export-shell ${fitColumns ? 'fit-columns' : ''}" data-export-shell>
          ${headerHtml}
        </div>
      </body>
    </html>
  `);
  doc.close();

  const shell = doc.querySelector('[data-export-shell]');
  if (shell) shell.appendChild(clone);

  const trigger = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  };

  setTimeout(trigger, 25);
  setTimeout(() => document.body.removeChild(iframe), 4000);
  return true;
};
