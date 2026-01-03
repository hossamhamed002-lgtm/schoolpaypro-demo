export type ExamPrintModel = {
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  page?: { size?: 'A4' | 'A3'; orientation?: 'portrait' | 'landscape' };
  fitColumns?: boolean;
  fitRows?: boolean;
  headerHtml?: string | null;
  headerModel?: ReportHeaderConfig;
};

export type ReportHeaderConfig = {
  title: string;
  subtitle?: string;
  showTrophy?: boolean;
  meta: {
    year: string;
    term?: string;
    school: string;
    administration?: string;
    printDate: string;
  };
};

const toText = (value: string | number | null | undefined) =>
  (value ?? '').toString().trim();

const choosePage = (columnCount: number, rowCount: number) => {
  const manyColumns = columnCount > 8;
  const extremeColumns = columnCount > 12;
  const manyRows = rowCount > 60;
  const orientation: 'portrait' | 'landscape' = manyColumns ? 'landscape' : 'portrait';
  const size: 'A4' | 'A3' = extremeColumns || (manyColumns && manyRows) ? 'A3' : 'A4';
  const fitColumns = columnCount > 6;
  const fitRows = manyRows || (manyColumns && rowCount > 40);
  return { size, orientation, fitColumns, fitRows };
};

const findHeaderHtml = (table: HTMLTableElement, container: HTMLElement): string | null => {
  const headerCandidate = container.querySelector<HTMLElement>('[data-report-header]') || container.querySelector<HTMLElement>('h1, h2');
  if (headerCandidate) {
    const clone = headerCandidate.cloneNode(true) as HTMLElement;
    clone.classList.add('print-header');
    return clone.outerHTML;
  }
  return null;
};

const extractTextList = (nodes: NodeListOf<HTMLElement> | HTMLElement[] | undefined | null) =>
  (nodes ? Array.from(nodes) : []).map((el) => toText(el.textContent || '')).filter(Boolean);

const isTopReport = (contextTokens: string[]) => {
  const pattern = /(أوائل|متفوق|top|ranking|merit)/i;
  return contextTokens.some((token) => pattern.test(token));
};

const buildModelFromTable = (
  table: HTMLTableElement,
  container: HTMLElement,
  title: string,
  forcedOrientation?: 'portrait' | 'landscape',
  providedHeader?: ReportHeaderConfig
): ExamPrintModel => {
  const headers = Array.from(table.querySelectorAll('thead th, thead td')).map((cell) => toText(cell.textContent || ''));
  const bodyRows = Array.from(table.querySelectorAll('tbody tr')).map((row) =>
    Array.from(row.querySelectorAll('th, td')).map((cell) => toText(cell.textContent || ''))
  );
  const { size, orientation, fitColumns, fitRows } = choosePage(headers.length || bodyRows[0]?.length || 0, bodyRows.length);
  const headerHtml = findHeaderHtml(table, container);

  let headerModel = providedHeader;
  if (!headerModel) {
    const domTitle = toText((container.querySelector('[data-report-header]')?.textContent) || (container.querySelector('h1, h2')?.textContent) || title);
    const metaRight = extractTextList(container.querySelectorAll('[data-report-meta-right]'));
    const metaLeft = extractTextList(container.querySelectorAll('[data-report-meta-left]'));
    const infoLine = extractTextList(container.querySelectorAll('[data-report-info]'));
    headerModel = domTitle ? {
      title: domTitle,
      subtitle: infoLine.join(' • ') || undefined,
      meta: {
        year: metaRight[0] || metaLeft[0] || '',
        term: metaRight[1] || '',
        school: metaLeft[1] || '',
        administration: metaLeft[2] || '',
        printDate: new Date().toLocaleDateString('ar-EG')
      }
    } : undefined;
  }

  return {
    title,
    columns: headers,
    rows: bodyRows,
    page: { size, orientation: forcedOrientation || orientation },
    fitColumns,
    fitRows,
    headerHtml,
    headerModel
  };
};

const renderPrintModel = (model: ExamPrintModel) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const { contentDocument } = iframe;
  if (!contentDocument) {
    document.body.removeChild(iframe);
    return;
  }

  const { columns, rows, title, page, fitColumns, fitRows, headerHtml, headerModel } = model;
  const orientation = page?.orientation || 'portrait';
  const size = page?.size || 'A4';

  const doc = contentDocument;
  doc.open();
  doc.write(`
    <html dir="rtl">
      <head>
        <style>
          @page { size: ${size} ${orientation}; margin: 10mm; }
          @media print {
            body { margin: 0; font-family: 'Tajawal', 'Inter', sans-serif; }
            table { width: 100%; border-collapse: collapse; table-layout: ${fitColumns ? 'fixed' : 'auto'}; }
            th, td { border: 1px solid #000; padding: ${fitRows ? '4px 6px' : '6px 8px'}; font-size: ${fitRows ? '11px' : '12px'}; line-height: ${fitRows ? '1.2' : '1.35'}; white-space: ${fitColumns ? 'normal' : 'nowrap'}; word-break: ${fitColumns ? 'break-word' : 'normal'}; }
            thead th { background: #f1f5f9; position: sticky; top: 0; }
            tr { page-break-inside: avoid; }
            h1 { margin: 0 0 8px 0; font-size: 16px; }
            .print-header { page-break-after: avoid; page-break-inside: avoid; break-inside: avoid; margin-bottom: 12px; text-align: center; }
            .header-meta { display: flex; justify-content: space-between; gap: 12px; margin-top: 6px; font-size: 11px; }
            .header-meta .col { display: flex; flex-direction: column; gap: 4px; }
            .header-meta .col span { display: block; }
            .header-subtitle { margin: 4px 0 6px 0; font-size: 13px; font-weight: 600; }
            .golden-divider { height: 1px; border: 0; background: linear-gradient(90deg, transparent, #d4af37, transparent); margin: 8px 0 0 0; }
            .trophy { font-size: 20px; display: inline-block; margin-bottom: 4px; }
            body * { visibility: hidden !important; }
            [data-exam-print-root], [data-exam-print-root] * { visibility: visible !important; }
          }
          body { padding: 8px; }
        </style>
      </head>
      <body>
        <div data-exam-print-root>
        ${headerModel ? (() => {
          const showTrophy = !!headerModel.showTrophy;
          const { meta } = headerModel;
          const metaRight = [meta.administration, meta.school].filter(Boolean).map((m) => `<span>${m}</span>`).join('');
          const metaLeft = [meta.year, meta.term, meta.printDate].filter(Boolean).map((m) => `<span>${m}</span>`).join('');
          return `
            <div class="print-header print-root">
              ${showTrophy ? `<div class="trophy">🏆</div>` : ''}
              <h1 style="text-align:center; font-weight:800;">${headerModel.title}</h1>
              ${headerModel.subtitle ? `<div class="header-subtitle" style="text-align:center;">${headerModel.subtitle}</div>` : ''}
              ${(metaRight || metaLeft) ? `
                <div class="header-meta">
                  <div class="col" style="text-align:right;">${metaRight}</div>
                  <div class="col" style="text-align:left;">${metaLeft}</div>
                </div>
              ` : ''}
              <div class="golden-divider"></div>
            </div>
          `;
        })() : (headerHtml ? headerHtml : `<h1>${title}</h1>`)}
        <table>
          <thead>
            <tr>${columns.map((c) => `<th>${c}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map((r) => `<tr>${r.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
        </div>
      </body>
    </html>
  `);
  doc.close();
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 3000);
};

export const printExamTable = (
  containerId: string,
  title: string,
  orientation?: 'portrait' | 'landscape',
  headerModel?: ReportHeaderConfig
) => {
  const container = document.getElementById(containerId);
  if (!container) {
    window.print();
    return;
  }
  const table = container.querySelector('table');
  if (!(table instanceof HTMLTableElement)) {
    window.print();
    return;
  }
  const model = buildModelFromTable(table, container, title, orientation, headerModel);
  renderPrintModel(model);
};

type PrintExamReportOptions = {
  sourceElement: HTMLElement;
  orientation?: 'portrait' | 'landscape';
  header?: ReportHeaderConfig;
};

export const printExamReport = ({ sourceElement, orientation, header }: PrintExamReportOptions) => {
  const clone = sourceElement.cloneNode(true) as HTMLElement;
  clone.classList.add('print-root');
  clone.querySelectorAll('.no-print, [data-no-print]').forEach((el) => el.remove());
  const table = clone.querySelector('table') as HTMLTableElement | null;
  if (!table) {
    window.print();
    return;
  }
  const model = buildModelFromTable(table, clone, document.title || 'تقرير', orientation, header);
  renderPrintModel(model);
};
