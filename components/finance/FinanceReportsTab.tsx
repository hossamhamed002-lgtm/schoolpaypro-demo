import React, { useMemo, useState } from 'react';
import { FileBarChart, Printer, Eye, Search, ShieldCheck, Filter, CalendarRange } from 'lucide-react';
import ReportPrintWrapper from '../ReportPrintWrapper';
import CashflowReport from './reports/CashflowReport';
import RevenueExpenseReport from './reports/RevenueExpenseReport';
import JournalReport from './reports/JournalReport';
import BalanceSheetReport from './reports/BalanceSheetReport';
import IncomeStatementReport from './reports/IncomeStatementReport';
import GeneralLedgerReport from './reports/GeneralLedgerReport';
import TrialBalanceReport from './reports/TrialBalanceReport';
import ArSummaryReport from './reports/ArSummaryReport';
import ParentsOverdueReport from './reports/ParentsOverdueReport';
import { useInvoicing } from '../../hooks/useInvoicingLogic';
import { useFeeConfiguration } from '../../hooks/useFeeConfiguration';
import { useJournal } from '../../src/hooks/useJournal';
import { useAccounts } from '../../hooks/useAccountsLogic';
import { isFinancialYearClosed, financialCloseStorageKey } from '../../src/utils/financialYearClose';
import { AccountType } from '../../src/types/accounts.types';

interface FinanceReportsTabProps {
  store: any;
}

const JOURNAL_REPORT_ID = 'FIN-RPT-JOURNAL';
const GENERAL_LEDGER_REPORT_ID = 'FIN-RPT-GENERAL-LEDGER';
const FINANCIAL_CLOSE_REPORT_ID = 'FIN-RPT-CLOSE-REPORT';
const TRIAL_BALANCE_REPORT_ID = 'FIN-RPT-TRIAL-BALANCE';
const INCOME_STATEMENT_REPORT_ID = 'FIN-RPT-INCOME-STATEMENT';
const BALANCE_SHEET_REPORT_ID = 'FIN-RPT-BALANCE-SHEET';
const CASHFLOW_REPORT_ID = 'FIN-RPT-CASHFLOW';
const REVENUE_EXPENSE_REPORT_ID = 'FIN-RPT-REV-EXP';
const PARENTS_OVERDUE_REPORT_ID = 'FIN-RPT-PARENTS-OVERDUE';

const FinanceReportsTab: React.FC<FinanceReportsTabProps> = ({ store }) => {
  const { t, lang, reportConfigs, activeSchool, currentUser, grades, workingYearId, activeYear, stages, students, allStudents, classes, allClasses, feeItems, allFeeItems } = store;
  const isRtl = lang === 'ar';
  const schoolCode =
    (activeSchool?.School_Code || activeSchool?.Code || activeSchool?.ID || activeSchool?.id || 'SCHOOL').toString();
  const yearId =
    workingYearId || activeYear?.Year_ID || activeYear?.AcademicYear_ID || activeYear?.id || 'YEAR';
  const isYearClosed = isFinancialYearClosed(schoolCode, yearId);
  
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [settingsReportId, setSettingsReportId] = useState<string | null>(null);
  const defaultReportSettings = {
    paperSize: 'A4',
    orientation: 'Portrait',
    font: 'Cairo',
    fontSize: '12',
    lineHeight: '1.4'
  };
  const [reportSettings, setReportSettings] = useState(defaultReportSettings);
  const finConfig = reportConfigs.find((c: any) => c.Category_ID === 'finance');
  const { invoices } = useInvoicing();
  const { feeHeads } = useFeeConfiguration();
  const { entries } = useJournal();
  const { accounts } = useAccounts();
  const accountMap = useMemo(() => new Map((accounts || []).map((acc: any) => [acc.id, acc])), [accounts]);
  const [journalFilters, setJournalFilters] = useState({
    from: '',
    to: '',
    entryType: 'all',
    accountId: '',
    accountQuery: ''
  });
  const [appliedJournalFilters, setAppliedJournalFilters] = useState(journalFilters);
  const [ledgerFilters, setLedgerFilters] = useState({
    accountId: '',
    accountQuery: '',
    from: '',
    to: '',
    entryType: 'all',
    yearId: workingYearId || activeYear?.Year_ID || ''
  });
  const [appliedLedgerFilters, setAppliedLedgerFilters] = useState(ledgerFilters);
  const [trialFilters, setTrialFilters] = useState({
    from: '',
    to: '',
    level: 'all',
    accountId: ''
  });
  const [appliedTrialFilters, setAppliedTrialFilters] = useState(trialFilters);
  const [incomeFilters, setIncomeFilters] = useState({
    from: '',
    to: ''
  });
  const [appliedIncomeFilters, setAppliedIncomeFilters] = useState(incomeFilters);
  const [balanceFilters, setBalanceFilters] = useState({
    asOf: '',
    showZero: false
  });
  const [appliedBalanceFilters, setAppliedBalanceFilters] = useState(balanceFilters);

  const handlePrint = (reportId: string) => {
    setSelectedReport(reportId);
    setTimeout(() => {
       alert(isRtl ? 'جاري تجهيز التقرير للطباعة...' : 'Preparing report for printing...');
    }, 100);
  };

  const handlePreview = (reportId: string) => {
    setSelectedReport(reportId);
  };

  const loadReportSettings = (reportId: string) => {
    if (typeof window === 'undefined') return defaultReportSettings;
    try {
      const raw = window.localStorage.getItem('REPORT_SETTINGS');
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed[reportId] || defaultReportSettings;
    } catch {
      return defaultReportSettings;
    }
  };

  const handleOpenSettings = (reportId: string) => {
    setReportSettings(loadReportSettings(reportId));
    setSettingsReportId(reportId);
  };

  const handleSaveSettings = () => {
    if (!settingsReportId || typeof window === 'undefined') {
      setSettingsReportId(null);
      return;
    }
    try {
      const raw = window.localStorage.getItem('REPORT_SETTINGS');
      const parsed = raw ? JSON.parse(raw) : {};
      parsed[settingsReportId] = reportSettings;
      window.localStorage.setItem('REPORT_SETTINGS', JSON.stringify(parsed));
    } catch {
      // ignore storage errors
    }
    setSettingsReportId(null);
  };

  const currentRole = currentUser?.Role;
  const availableReports = finConfig?.Available_Reports || [];
  const visibleReports = currentRole
    ? availableReports.filter((report: any) => report.Allowed_Roles?.includes(currentRole))
    : [];
  const mergedReports = useMemo(() => {
    const base = [...visibleReports];
    const hasJournal = base.some((r) => r.Report_ID === JOURNAL_REPORT_ID);
    if (!hasJournal) {
      base.push({
        Report_ID: JOURNAL_REPORT_ID,
        Title_Ar: 'دفتر اليومية',
        Title_En: 'Journal Ledger',
        Description: 'تقرير القيود المرحلة من دفتر اليومية',
        Allowed_Roles: []
      });
    }
    const hasGl = base.some((r) => r.Report_ID === GENERAL_LEDGER_REPORT_ID);
    if (!hasGl) {
      base.push({
        Report_ID: GENERAL_LEDGER_REPORT_ID,
        Title_Ar: 'تقرير الأستاذ العام',
        Title_En: 'General Ledger',
        Description: 'كشف حركات الحساب مع الرصيد التراكمي',
        Allowed_Roles: []
      });
    }
    if (isYearClosed && !base.some((r) => r.Report_ID === FINANCIAL_CLOSE_REPORT_ID)) {
      base.push({
        Report_ID: FINANCIAL_CLOSE_REPORT_ID,
        Title_Ar: 'التقرير الرسمي لإغلاق العام المالي',
        Title_En: 'Financial Year Close Report',
        Description: 'توثيق رسمي لعملية إغلاق العام المالي والقيد الافتتاحي',
        Allowed_Roles: []
      });
    }
    if (!base.some((r) => r.Report_ID === TRIAL_BALANCE_REPORT_ID)) {
      base.push({
        Report_ID: TRIAL_BALANCE_REPORT_ID,
        Title_Ar: 'ميزان المراجعة',
        Title_En: 'Trial Balance',
        Description: 'تجميع أرصدة الحسابات (مدين/دائن) للتحقق من الاتزان',
        Allowed_Roles: []
      });
    }
    if (!base.some((r) => r.Report_ID === INCOME_STATEMENT_REPORT_ID)) {
      base.push({
        Report_ID: INCOME_STATEMENT_REPORT_ID,
        Title_Ar: 'قائمة الدخل',
        Title_En: 'Income Statement',
        Description: 'حساب إجمالي الإيرادات والمصروفات وصافي الدخل',
        Allowed_Roles: []
      });
    }
    if (!base.some((r) => r.Report_ID === BALANCE_SHEET_REPORT_ID)) {
      base.push({
        Report_ID: BALANCE_SHEET_REPORT_ID,
        Title_Ar: 'الميزانية العمومية',
        Title_En: 'Balance Sheet',
        Description: 'عرض المركز المالي كما في تاريخ محدد',
        Allowed_Roles: []
      });
    }
    if (!base.some((r) => r.Report_ID === CASHFLOW_REPORT_ID)) {
      base.push({
        Report_ID: CASHFLOW_REPORT_ID,
        Title_Ar: 'تقرير التدفقات النقدية',
        Title_En: 'Cash Flow Statement',
        Description: 'تحليل التدفقات النقدية من الأنشطة التشغيلية والاستثمارية والتمويلية',
        Allowed_Roles: []
      });
    }
    if (!base.some((r) => r.Report_ID === REVENUE_EXPENSE_REPORT_ID)) {
      base.push({
        Report_ID: REVENUE_EXPENSE_REPORT_ID,
        Title_Ar: 'تقرير الإيرادات والمصروفات',
        Title_En: 'Revenue & Expense Report',
        Description: 'عرض الإيرادات والمصروفات عن فترة محددة',
        Allowed_Roles: []
      });
    }
    if (!base.some((r) => r.Report_ID === PARENTS_OVERDUE_REPORT_ID)) {
      base.push({
        Report_ID: PARENTS_OVERDUE_REPORT_ID,
        Title_Ar: 'تقرير أولياء الأمور المتأخرين في السداد',
        Title_En: 'Parents Overdue Payments',
        Description: 'كشف أولياء الأمور ذوي المديونيات المتأخرة',
        Allowed_Roles: []
      });
    }
    return base;
  }, [visibleReports, isYearClosed]);

  const postedEntries = useMemo(
    () => (entries || []).filter((e: any) => (e.status || '').toUpperCase() === 'POSTED'),
    [entries]
  );
  const unbalancedEntries = useMemo(
    () =>
      postedEntries.filter(
        (e: any) =>
          Math.abs(Number(e.totalDebit || 0) - Number(e.totalCredit || 0)) > 0.01 ||
          e.isBalanced === false
      ),
    [postedEntries]
  );

  const filteredAccounts = useMemo(() => {
    if (!journalFilters.accountQuery.trim()) return accounts || [];
    const q = journalFilters.accountQuery.trim().toLowerCase();
    return (accounts || []).filter(
      (acc: any) =>
        acc.code?.toString().toLowerCase().includes(q) ||
        (acc.name || '').toLowerCase().includes(q)
    );
  }, [accounts, journalFilters.accountQuery]);

  const filteredJournalEntries = useMemo(() => {
    const { from, to, entryType, accountId } = appliedJournalFilters;
    const fromTime = from ? new Date(from).getTime() : null;
    const toTime = to ? new Date(to).getTime() : null;
    return postedEntries
      .filter((entry: any) => {
        const entryDate = new Date(entry.date || entry.createdAt || entry.valueDate || Date.now()).getTime();
        if (fromTime && entryDate < fromTime) return false;
        if (toTime && entryDate > toTime) return false;
        if (entryType && entryType !== 'all') {
          const src = (entry.source || entry.entryType || '').toString().toLowerCase();
          if (!src.includes(entryType)) return false;
        }
        if (accountId) {
          const hasAccount = (entry.lines || []).some((line: any) => String(line.accountId) === String(accountId));
          if (!hasAccount) return false;
        }
        return true;
      })
      .sort((a: any, b: any) => {
        const da = new Date(a.date || a.createdAt || 0).getTime();
        const db = new Date(b.date || b.createdAt || 0).getTime();
        return da - db;
      });
  }, [appliedJournalFilters, postedEntries]);

  const journalLines = useMemo(() => {
    const lines: any[] = [];
    let lineCounter = 1;
    filteredJournalEntries.forEach((entry: any) => {
      const entryDate = entry.date || entry.createdAt || '';
      (entry.lines || []).forEach((line: any) => {
        const acc = accountMap.get(line.accountId);
        lines.push({
          lineIndex: lineCounter++,
          entryNumber: entry.number || entry.id || '—',
          entryDate,
          entrySource: entry.source || entry.entryType || 'يدوي',
          entryDescription: entry.description || entry.note || '',
          accountLabel: acc ? `${acc.code || ''} - ${acc.name || ''}` : line.accountId || '—',
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0),
          entry
        });
      });
    });
    return lines;
  }, [filteredJournalEntries, accountMap]);

  const journalTotals = useMemo(() => {
    return journalLines.reduce(
      (acc, line) => {
        acc.debit += line.debit;
        acc.credit += line.credit;
        return acc;
      },
      { debit: 0, credit: 0 }
    );
  }, [journalLines]);

  const arSummaryRows = useMemo(() => {
    const yearId = workingYearId || activeYear?.Year_ID || '';
    if (!yearId) return [];

    const normalizeId = (value?: string | number) => String(value || '').trim();
    const normalizeText = (value?: string | number) => String(value || '').trim().toLowerCase();

    const isApprovedInvoice = (invoice: any) => {
      const status = String(invoice.Status || invoice.status || invoice.Approval_Status || invoice.approvalStatus || '').toUpperCase();
      return status === 'APPROVED' || status === 'POSTED' || status === 'FINAL' || invoice.isPosted === true || invoice.Is_Approved === true || invoice.isApproved === true;
    };
    const invoiceYearId = (invoice: any) =>
      normalizeId(
        invoice.academicYearId ||
        invoice.Academic_Year_ID ||
        invoice.AcademicYearId ||
        invoice.Year_ID ||
        invoice.yearId ||
        ''
      );

    const gradeSource = grades || [];
    const gradeNameToId = new Map((gradeSource || []).map((grade: any) => [normalizeText(grade.Grade_Name), normalizeId(grade.Grade_ID)]));
    const gradesMap = new Map((gradeSource || []).map((grade: any) => [normalizeId(grade.Grade_ID), grade]));
    const stagesMap = new Map((stages || []).map((stage: any) => [normalizeId(stage.Stage_ID), stage]));
    const classSource = classes && classes.length ? classes : (allClasses || []);
    const classToGrade = new Map((classSource || []).map((klass: any) => [normalizeId(klass.Class_ID), normalizeId(klass.Grade_ID)]));
    const classNameToGrade = new Map((classSource || []).map((klass: any) => [normalizeText(klass.Class_Name), normalizeId(klass.Grade_ID)]));
    const feeItemsSource = feeItems && feeItems.length ? feeItems : (allFeeItems || []);
    const feeNameById = new Map((feeItemsSource || []).map((item: any) => [normalizeId(item.Fee_ID || item.id || item.feeHeadId), item.Item_Name || item.name || item.Fee_Name]));
    const feeHeadNameById = new Map((feeHeads || []).map((head: any) => [normalizeId(head.id || head.Fee_ID || head.feeHeadId), head.name || head.Item_Name || head.Fee_Name]));

    const studentSource = allStudents && allStudents.length ? allStudents : (students || []);
    const studentById = new Map<string, any>();
    studentSource.forEach((student: any) => {
      const studentId = normalizeId(student.Student_ID || student.Student_Global_ID || student.Enroll_ID || student.id);
      if (studentId) studentById.set(studentId, student);
    });

    const approvedInvoices = (invoices || []).filter((invoice: any) => {
      if (!isApprovedInvoice(invoice)) return false;
      if (invoice.isVoided) return false;
      const invYear = invoiceYearId(invoice);
      if (invYear && invYear === normalizeId(yearId)) return true;
      if (!invYear) {
        const studentId = normalizeId(invoice.Student_ID || invoice.studentId || invoice.StudentId || '');
        const student = studentById.get(studentId);
        const studentYear = normalizeId(student?.Academic_Year_ID || student?.Year_ID || '');
        return !!studentYear && studentYear === normalizeId(yearId);
      }
      return false;
    });

    const totalsByGradeFee = new Map<string, { gradeId: string; feeName: string; total: number }>();
    const discountsByGrade = new Map<string, number>();
    const studentsByGrade = new Map<string, Set<string>>();

    approvedInvoices.forEach((invoice: any) => {
      const studentId = normalizeId(invoice.Student_ID || invoice.studentId || invoice.StudentId || '');
      const student = studentById.get(studentId);
      const gradeIdFromStudent = normalizeId(
        student?.Grade_ID ||
        student?.GradeId ||
        student?.gradeId ||
        classToGrade.get(normalizeId(student?.Class_ID || student?.ClassId || student?.classId || '')) ||
        classNameToGrade.get(normalizeText(student?.Class_Name || student?.className || student?.Class || '')) ||
        gradeNameToId.get(normalizeText(student?.Grade_Name || student?.gradeName || student?.Level || student?.grade || '')) ||
        ''
      );
      const gradeId = normalizeId(invoice.gradeId || invoice.Grade_ID || gradeIdFromStudent || '');
      if (!gradeId) return;
      if (!studentsByGrade.has(gradeId)) studentsByGrade.set(gradeId, new Set());
      if (studentId) studentsByGrade.get(gradeId)!.add(studentId);

      const invoiceItems = invoice.items || invoice.Items || invoice.InvoiceItems || invoice.invoiceItems || invoice.details || invoice.lines || [];
      (Array.isArray(invoiceItems) ? invoiceItems : []).forEach((item: any) => {
        const feeHeadId = item.feeHeadId || item.Fee_ID || item.feeId || item.FeeHeadId;
        const feeName = feeHeadNameById.get(normalizeId(feeHeadId))
          || feeNameById.get(normalizeId(feeHeadId))
          || item.feeName
          || item.Fee_Name
          || item.name
          || item.Item_Name
          || item.itemName
          || feeHeadId
          || '—';
        const key = `${gradeId}:${feeName}`;
        const current = totalsByGradeFee.get(key) || { gradeId, feeName, total: 0 };
        current.total += Number(item.amount || item.Amount || item.value || item.Price || 0);
        totalsByGradeFee.set(key, current);
      });

      const invoiceDiscounts = Array.isArray(invoice.discounts || invoice.Discounts)
        ? (invoice.discounts || invoice.Discounts)
        : [];
      const discountTotal = invoiceDiscounts.reduce(
        (sum: number, entry: any) => sum + Number(entry.amount || entry.Amount || entry.value || 0),
        0
      );
      const headerDiscount = Number(invoice.discountTotal || invoice.Discount_Total || invoice.discount || 0);
      discountsByGrade.set(gradeId, (discountsByGrade.get(gradeId) ?? 0) + discountTotal + headerDiscount);
    });

    return Array.from(totalsByGradeFee.values()).map((entry, index) => {
      const grade = gradesMap.get(entry.gradeId) as any;
      const stageName = grade ? (stagesMap.get(normalizeId(grade.Stage_ID)) as any)?.Stage_Name || '—' : '—';
      const studentCount = studentsByGrade.get(entry.gradeId)?.size || 0;
      const totalItem = Number(entry.total.toFixed(2));
      const discounts = discountsByGrade.get(entry.gradeId) || 0;
      return {
        index: index + 1,
        stageName,
        gradeId: entry.gradeId,
        gradeName: grade?.Grade_Name || entry.gradeId || '—',
        feeName: entry.feeName,
        studentCount,
        itemAmount: studentCount > 0 ? Number((totalItem / studentCount).toFixed(2)) : 0,
        totalItem,
        exemptions: discounts,
        net: Number((totalItem - discounts).toFixed(2))
      };
    });
  }, [invoices, workingYearId, activeYear?.Year_ID, grades, stages, students, allStudents, classes, allClasses, feeItems, allFeeItems, feeHeads]);

  const arSummaryMatrix = useMemo(() => {
    const normalizeId = (value?: string | number) => String(value || '').trim();
    const stagesMap = new Map((stages || []).map((stage: any) => [normalizeId(stage.Stage_ID), stage.Stage_Name]));
    const gradeSource = grades || [];
    const feeNames = Array.from(new Set(arSummaryRows.map((row) => row.feeName))).filter(Boolean);

    const gradeRows = new Map<string, { stageName: string; gradeId: string; gradeName: string; studentCount: number; values: Record<string, number>; total: number; discounts: number; net: number }>();
    arSummaryRows.forEach((row) => {
      if (!gradeRows.has(row.gradeName)) {
        gradeRows.set(row.gradeName, {
          stageName: row.stageName || '—',
          gradeId: row.gradeId || '',
          gradeName: row.gradeName,
          studentCount: row.studentCount,
          values: {},
          total: 0,
          discounts: 0,
          net: 0
        });
      }
      const entry = gradeRows.get(row.gradeName)!;
      entry.values[row.feeName] = row.itemAmount;
      entry.total += row.totalItem;
      entry.discounts = Math.max(entry.discounts, row.exemptions);
      entry.net = Number((entry.total - entry.discounts).toFixed(2));
      entry.studentCount = Math.max(entry.studentCount, row.studentCount);
    });

    const rows = Array.from(gradeRows.values());

    return {
      feeNames,
      rows
    };
  }, [arSummaryRows, stages, grades]);

  const arSummaryTotals = useMemo(() => {
    return arSummaryMatrix.rows.reduce(
      (acc, row) => ({
        studentCount: acc.studentCount + row.studentCount,
        totalItem: acc.totalItem + row.total,
        exemptions: acc.exemptions + row.discounts,
        net: acc.net + row.net
      }),
      { studentCount: 0, totalItem: 0, exemptions: 0, net: 0 }
    );
  }, [arSummaryMatrix.rows]);

  const ledgerFilteredAccounts = useMemo(() => {
    if (!ledgerFilters.accountQuery.trim()) return accounts || [];
    const q = ledgerFilters.accountQuery.trim().toLowerCase();
    return (accounts || []).filter(
      (acc: any) =>
        acc.code?.toString().toLowerCase().includes(q) ||
        (acc.name || '').toLowerCase().includes(q)
    );
  }, [accounts, ledgerFilters.accountQuery]);

  const ledgerAccount = useMemo(
    () => (ledgerFilters.accountId ? accountMap.get(ledgerFilters.accountId) || null : null),
    [ledgerFilters.accountId, accountMap]
  );

  const ledgerEntries = useMemo(() => {
    if (!ledgerAccount) return [];
    const { from, to, entryType, yearId } = appliedLedgerFilters;
    const fromTime = from ? new Date(from).getTime() : null;
    const toTime = to ? new Date(to).getTime() : null;
    return postedEntries
      .filter((entry: any) => {
        const entryDate = new Date(entry.date || entry.createdAt || entry.valueDate || Date.now()).getTime();
        if (fromTime && entryDate < fromTime) return false;
        if (toTime && entryDate > toTime) return false;
        if (entryType && entryType !== 'all') {
          const src = (entry.source || entry.entryType || '').toString().toLowerCase();
          if (!src.includes(entryType)) return false;
        }
        if (yearId) {
          const yr = entry.yearId || entry.academicYearId || entry.Year_ID || entry.year || '';
          if (yr && String(yr) !== String(yearId)) return false;
        }
        const hasAccount = (entry.lines || []).some((line: any) => String(line.accountId) === String(ledgerAccount.id));
        return hasAccount;
      })
      .sort((a: any, b: any) => {
        const da = new Date(a.date || a.createdAt || 0).getTime();
        const db = new Date(b.date || b.createdAt || 0).getTime();
        return da - db;
      });
  }, [appliedLedgerFilters, postedEntries, ledgerAccount]);

  const ledgerLines = useMemo(() => {
    if (!ledgerAccount) return [];
    const initialBalance = Number(ledgerAccount.balance || 0);
    let running = initialBalance;
    const rows: any[] = [];
    ledgerEntries.forEach((entry: any) => {
      const entryDate = entry.date || entry.createdAt || '';
      const entryNumber = entry.number || entry.id || '—';
      const description = entry.description || entry.note || '';
      (entry.lines || []).forEach((line: any) => {
        if (String(line.accountId) !== String(ledgerAccount.id)) return;
        const debit = Number(line.debit || 0);
        const credit = Number(line.credit || 0);
        running += debit - credit;
        rows.push({
          entryDate,
          entryNumber,
          description,
          debit,
          credit,
          balance: running
        });
      });
    });
    return rows;
  }, [ledgerEntries, ledgerAccount]);

  const ledgerTotals = useMemo(() => {
    return ledgerLines.reduce(
      (acc, line) => {
        acc.debit += line.debit;
        acc.credit += line.credit;
        acc.finalBalance = line.balance;
        return acc;
      },
      { debit: 0, credit: 0, finalBalance: ledgerAccount ? Number(ledgerAccount.balance || 0) : 0 }
    );
  }, [ledgerLines, ledgerAccount]);

  const ledgerNoData = !ledgerAccount || ledgerLines.length === 0;

  const getReportTitle = (id: string) => {
    if (id === JOURNAL_REPORT_ID) return isRtl ? 'دفتر اليومية' : 'Journal Ledger';
    if (id === GENERAL_LEDGER_REPORT_ID) return isRtl ? 'تقرير الأستاذ العام' : 'General Ledger';
    if (id === FINANCIAL_CLOSE_REPORT_ID) return isRtl ? 'التقرير الرسمي لإغلاق العام المالي' : 'Financial Close Report';
    if (id === TRIAL_BALANCE_REPORT_ID) return isRtl ? 'ميزان المراجعة' : 'Trial Balance';
    if (id === INCOME_STATEMENT_REPORT_ID) return isRtl ? 'قائمة الدخل' : 'Income Statement';
    if (id === BALANCE_SHEET_REPORT_ID) return isRtl ? 'الميزانية العمومية' : 'Balance Sheet';
    if (id === REVENUE_EXPENSE_REPORT_ID) return isRtl ? 'تقرير الإيرادات والمصروفات' : 'Revenue & Expense Report';
    if (id === CASHFLOW_REPORT_ID) return isRtl ? 'تقرير التدفقات النقدية' : 'Cash Flow Statement';
    if (id === PARENTS_OVERDUE_REPORT_ID) return isRtl ? 'تقرير أولياء الأمور المتأخرين في السداد' : 'Parents Overdue Payments';
    const fromConfig = finConfig?.Available_Reports?.find((r: any) => r.Report_ID === id);
    return fromConfig ? (isRtl ? fromConfig.Title_Ar : fromConfig.Title_En) : id;
  };

  const journalNoData = filteredJournalEntries.length === 0;

  const closeState = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(financialCloseStorageKey(schoolCode, yearId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [schoolCode, yearId]);

  const studentSource = useMemo(
    () => (Array.isArray(allStudents) && allStudents.length ? allStudents : students || []),
    [allStudents, students]
  );
  const gradesMap = useMemo(() => new Map((grades || []).map((g: any) => [g.Grade_ID, g])), [grades]);
  const classesMap = useMemo(() => new Map((classes || allClasses || []).map((c: any) => [c.Class_ID, c])), [classes, allClasses]);

  const studentBalances = useMemo(() => {
    const map = new Map<string, { due: number; paid: number }>();
    (invoices || []).forEach((inv: any) => {
      const studentId = inv.Student_ID || inv.studentId || inv.StudentId || '';
      const amount = Number(inv.Total || inv.total || inv.amount || 0);
      const paid = Number(inv.Paid || inv.paid || inv.paidAmount || inv.collected || 0);
      if (!studentId) return;
      const curr = map.get(studentId) || { due: 0, paid: 0 };
      curr.due += amount;
      curr.paid += paid;
      map.set(studentId, curr);
    });
    return Array.from(map.entries()).map(([id, val]) => ({
      studentId: id,
      due: val.due,
      paid: val.paid,
      balance: Number((val.due - val.paid).toFixed(2))
    }));
  }, [invoices]);

  const studentDebtors = useMemo(
    () =>
      studentBalances
        .filter((s) => s.balance > 0)
        .map((s) => {
          const student = studentSource.find((st: any) => String(st.Student_Global_ID || st.id || st.Student_ID) === String(s.studentId)) || {};
          const gradeName = (gradesMap.get(student.Grade_ID) as any)?.Grade_Name || '';
          const className = (classesMap.get(student.Class_ID) as any)?.Class_Name || '';
          return { ...s, name: student.Name_Ar || student.Name_En || s.studentId, gradeName, className };
        }),
    [classesMap, gradesMap, studentBalances, studentSource]
  );

  const studentCreditors = useMemo(
    () =>
      studentBalances
        .filter((s) => s.balance < 0)
        .map((s) => {
          const student = studentSource.find((st: any) => String(st.Student_Global_ID || st.id || st.Student_ID) === String(s.studentId)) || {};
          const gradeName = (gradesMap.get(student.Grade_ID) as any)?.Grade_Name || '';
          const className = (classesMap.get(student.Class_ID) as any)?.Class_Name || '';
          return { ...s, name: student.Name_Ar || student.Name_En || s.studentId, gradeName, className };
        }),
    [classesMap, gradesMap, studentBalances, studentSource]
  );

  const openingPreviewLines = useMemo(() => {
    const lines = (accounts || [])
      .filter((acc: any) => Number(acc.balance || 0) !== 0)
      .map((acc: any) => {
        const bal = Number(acc.balance || 0);
        const isDebit = bal > 0;
        return {
          id: acc.id,
          name: acc.name || acc.code || acc.id,
          debit: isDebit ? Math.abs(bal) : 0,
          credit: !isDebit ? Math.abs(bal) : 0,
          note: 'رصيد افتتاحي مرحل'
        };
      });
    const totals = lines.reduce(
      (agg, line) => {
        agg.debit += line.debit;
        agg.credit += line.credit;
        return agg;
      },
      { debit: 0, credit: 0 }
    );
    return { lines, totals };
  }, [accounts]);

  const trialBalanceRows = useMemo(() => {
    const { from, to, level, accountId } = appliedTrialFilters;
    const fromTime = from ? new Date(from).getTime() : null;
    const toTime = to ? new Date(to).getTime() : null;
    const sums = new Map<
      string,
      { account: any; debit: number; credit: number }
    >();

    postedEntries.forEach((entry: any) => {
      const entryTime = new Date(entry.date || entry.createdAt || Date.now()).getTime();
      if (fromTime && entryTime < fromTime) return;
      if (toTime && entryTime > toTime) return;
      (entry.lines || []).forEach((line: any) => {
        if (!line.accountId) return;
        if (accountId && String(accountId) !== String(line.accountId)) return;
        const acc = accountMap.get(line.accountId);
        if (!acc) return;
        const isMain = !acc.parentId;
        if (level === 'main' && !isMain) return;
        if (level === 'sub' && isMain) return;
        const existing = sums.get(line.accountId) || { account: acc, debit: 0, credit: 0 };
        existing.debit += Number(line.debit || 0);
        existing.credit += Number(line.credit || 0);
        sums.set(line.accountId, existing);
      });
    });

    const rows = Array.from(sums.values()).map(({ account, debit, credit }) => {
      const balance = debit - credit;
      const type = balance >= 0 ? 'مدين' : 'دائن';
      return {
        id: account.id,
        code: account.code || account.id,
        name: account.name || account.id,
        debit: Number(debit.toFixed(2)),
        credit: Number(credit.toFixed(2)),
        balance: Number(Math.abs(balance).toFixed(2)),
        balanceType: type
      };
    });

    rows.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    const totals = rows.reduce(
      (agg, row) => {
        agg.debit += row.debit;
        agg.credit += row.credit;
        agg.balance += row.balanceType === 'مدين' ? row.balance : -row.balance;
        return agg;
      },
      { debit: 0, credit: 0, balance: 0 }
    );
    return { rows, totals };
  }, [appliedTrialFilters, postedEntries, accountMap]);

  const incomeStatement = useMemo(() => {
    const { from, to } = appliedIncomeFilters;
    const fromTime = from ? new Date(from).getTime() : null;
    const toTime = to ? new Date(to).getTime() : null;

    const yearIdFilter = workingYearId || activeYear?.Year_ID || activeYear?.AcademicYear_ID || '';

    const sums = {
      revenues: new Map<string, { account: any; amount: number }>(),
      expenses: new Map<string, { account: any; amount: number }>()
    };

    postedEntries.forEach((entry: any) => {
      const entryYear = (entry as any).Academic_Year_ID || (entry as any).academicYearId || '';
      if (yearIdFilter && entryYear && entryYear !== yearIdFilter) return;
      const entryTime = new Date(entry.date || entry.createdAt || Date.now()).getTime();
      if (fromTime && entryTime < fromTime) return;
      if (toTime && entryTime > toTime) return;
      (entry.lines || []).forEach((line: any) => {
        if (!line.accountId) return;
        const acc = accountMap.get(line.accountId);
        if (!acc) return;
        if (acc.type === AccountType.REVENUE) {
          const current = sums.revenues.get(acc.id) || { account: acc, amount: 0 };
          current.amount += Number(line.credit || 0) - Number(line.debit || 0);
          sums.revenues.set(acc.id, current);
        } else if (acc.type === AccountType.EXPENSE) {
          const current = sums.expenses.get(acc.id) || { account: acc, amount: 0 };
          current.amount += Number(line.debit || 0) - Number(line.credit || 0);
          sums.expenses.set(acc.id, current);
        }
      });
    });

    const revenueRows = Array.from(sums.revenues.values()).filter((row) => row.amount !== 0);
    const expenseRows = Array.from(sums.expenses.values()).filter((row) => row.amount !== 0);
    const totalRevenue = revenueRows.reduce((sum, r) => sum + r.amount, 0);
    const totalExpense = expenseRows.reduce((sum, r) => sum + r.amount, 0);
    const net = totalRevenue - totalExpense;

    return {
      revenueRows,
      expenseRows,
      totalRevenue,
      totalExpense,
      net
    };
  }, [appliedIncomeFilters, postedEntries, accountMap, workingYearId, activeYear?.Year_ID, activeYear?.AcademicYear_ID]);

  const balanceSheet = useMemo(() => {
    const asOfTime = appliedBalanceFilters.asOf ? new Date(appliedBalanceFilters.asOf).getTime() : null;
    const yearIdFilter = workingYearId || activeYear?.Year_ID || activeYear?.AcademicYear_ID || '';
    const sums = new Map<
      string,
      { account: any; debit: number; credit: number }
    >();

    postedEntries.forEach((entry: any) => {
      const entryYear = (entry as any).Academic_Year_ID || (entry as any).academicYearId || '';
      if (yearIdFilter && entryYear && entryYear !== yearIdFilter) return;
      const entryTime = new Date(entry.date || entry.createdAt || Date.now()).getTime();
      if (asOfTime && entryTime > asOfTime) return;
      (entry.lines || []).forEach((line: any) => {
        if (!line.accountId) return;
        const acc = accountMap.get(line.accountId);
        if (!acc) return;
        if (acc.type !== AccountType.ASSET && acc.type !== AccountType.LIABILITY && acc.type !== AccountType.EQUITY) return;
        const current = sums.get(acc.id) || { account: acc, debit: 0, credit: 0 };
        current.debit += Number(line.debit || 0);
        current.credit += Number(line.credit || 0);
        sums.set(acc.id, current);
      });
    });

    const rows = Array.from(sums.values()).map(({ account, debit, credit }) => ({
      account,
      balance: Number((debit - credit).toFixed(2))
    }));

    const filteredRows = appliedBalanceFilters.showZero ? rows : rows.filter((r) => r.balance !== 0);

    const assets = filteredRows.filter((r) => r.account.type === AccountType.ASSET);
    const liabilities = filteredRows.filter((r) => r.account.type === AccountType.LIABILITY);
    const equity = filteredRows.filter((r) => r.account.type === AccountType.EQUITY);

    const total = (list: typeof filteredRows) => list.reduce((sum, r) => sum + r.balance, 0);

    const assetsTotal = total(assets);
    const liabilitiesTotal = total(liabilities);
    const equityTotal = total(equity);

    return {
      assets,
      liabilities,
      equity,
      assetsTotal,
      liabilitiesTotal,
      equityTotal,
      balanced: Number((assetsTotal - (liabilitiesTotal + equityTotal)).toFixed(2)) === 0
    };
  }, [appliedBalanceFilters, postedEntries, accountMap, workingYearId, activeYear?.Year_ID, activeYear?.AcademicYear_ID]);

  // Cashflow and Revenue/Expense reports are now isolated in dedicated components.

  const renderSelectedReport = () => {
    if (selectedReport === JOURNAL_REPORT_ID) {
      return (
        <JournalReport
          isRtl={isRtl}
          filters={journalFilters}
          setFilters={setJournalFilters}
          appliedFilters={appliedJournalFilters}
          applyFilters={() => setAppliedJournalFilters(journalFilters)}
          journalLines={journalLines}
          journalTotals={journalTotals}
          journalNoData={journalNoData}
          filteredAccounts={filteredAccounts}
          accountMap={accountMap}
          reportSettings={reportSettings}
          getReportTitle={getReportTitle}
          reportId={JOURNAL_REPORT_ID}
        />
      );
    }
    if (
      selectedReport === REVENUE_EXPENSE_REPORT_ID ||
      getReportTitle(selectedReport || '') === (isRtl ? 'تقرير الإيرادات والمصروفات' : 'Revenue & Expense Report')
    ) {
      return (
        <RevenueExpenseReport
          title={getReportTitle(REVENUE_EXPENSE_REPORT_ID)}
          accounts={accounts || []}
          postedEntries={postedEntries}
          workingYearId={workingYearId}
          activeYear={activeYear}
          reportSettings={reportSettings}
        />
      );
    }
    if (selectedReport === BALANCE_SHEET_REPORT_ID) {
      return (
        <BalanceSheetReport
          title={getReportTitle(BALANCE_SHEET_REPORT_ID)}
          activeSchool={activeSchool}
          activeYear={activeYear}
          workingYearId={workingYearId}
          filters={balanceFilters}
          setFilters={setBalanceFilters}
          appliedFilters={appliedBalanceFilters}
          applyFilters={() => setAppliedBalanceFilters(balanceFilters)}
          balanceSheet={balanceSheet}
          reportSettings={reportSettings}
        />
      );
    }
    if (selectedReport === GENERAL_LEDGER_REPORT_ID) {
      return (
        <GeneralLedgerReport
          title={getReportTitle(GENERAL_LEDGER_REPORT_ID)}
          activeSchool={activeSchool}
          activeYear={activeYear}
          workingYearId={workingYearId}
          filters={ledgerFilters}
          setFilters={setLedgerFilters}
          appliedFilters={appliedLedgerFilters}
          applyFilters={() => setAppliedLedgerFilters(ledgerFilters)}
          ledgerAccount={ledgerAccount}
          ledgerNoData={ledgerNoData}
          ledgerLines={ledgerLines}
          ledgerTotals={ledgerTotals}
          ledgerFilteredAccounts={ledgerFilteredAccounts}
          reportSettings={reportSettings}
        />
      );
    }
    if (selectedReport === 'FIN-RPT-AR-SUMMARY') {
      return (
        <ArSummaryReport
          title="إجمالي المطلوب تحصيله"
          activeSchool={activeSchool}
          activeYear={activeYear}
          workingYearId={workingYearId}
          arSummaryMatrix={arSummaryMatrix}
          arSummaryTotals={arSummaryTotals}
        />
      );
    }
    if (selectedReport === TRIAL_BALANCE_REPORT_ID) {
      return (
        <TrialBalanceReport
          title={getReportTitle(TRIAL_BALANCE_REPORT_ID)}
          activeSchool={activeSchool}
          activeYear={activeYear}
          workingYearId={workingYearId}
          filters={trialFilters}
          setFilters={setTrialFilters}
          appliedFilters={appliedTrialFilters}
          applyFilters={() => setAppliedTrialFilters(trialFilters)}
          trialBalanceRows={trialBalanceRows}
          accounts={accounts || []}
          reportSettings={reportSettings}
        />
      );
    }
    if (selectedReport === INCOME_STATEMENT_REPORT_ID) {
      return (
        <IncomeStatementReport
          title={getReportTitle(INCOME_STATEMENT_REPORT_ID)}
          activeSchool={activeSchool}
          activeYear={activeYear}
          workingYearId={workingYearId}
          filters={incomeFilters}
          setFilters={setIncomeFilters}
          appliedFilters={appliedIncomeFilters}
          applyFilters={() => setAppliedIncomeFilters(incomeFilters)}
          incomeStatement={incomeStatement}
          reportSettings={reportSettings}
        />
      );
    }
    if (selectedReport === CASHFLOW_REPORT_ID) {
      return (
        <CashflowReport
          title={getReportTitle(CASHFLOW_REPORT_ID)}
          accounts={accounts || []}
          postedEntries={postedEntries}
          activeSchool={activeSchool}
          activeYear={activeYear}
          workingYearId={workingYearId}
          isYearClosed={isYearClosed}
          reportSettings={reportSettings}
        />
      );
    }
    if (selectedReport === PARENTS_OVERDUE_REPORT_ID) {
      return (
        <ParentsOverdueReport
          title={getReportTitle(PARENTS_OVERDUE_REPORT_ID)}
          students={students || []}
          invoices={invoices || []}
          stages={stages || []}
          grades={grades || []}
          activeSchool={activeSchool}
          activeYear={activeYear}
          workingYearId={workingYearId}
          reportSettings={reportSettings}
        />
      );
    }
    return null;
  };

  if (selectedReport && renderSelectedReport()) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500 text-start">
        {renderSelectedReport()}
        {settingsReportId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6">
            <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <h4 className="text-lg font-black text-slate-800">{isRtl ? 'إعدادات التقرير' : 'Report Settings'}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {isRtl ? 'تحكم سريع في شكل الطباعة لهذا التقرير' : 'Quick print layout controls'}
                  </p>
                </div>
                <button
                  onClick={() => setSettingsReportId(null)}
                  className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-700"
                >
                  ×
                </button>
              </div>
              <div className="p-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-bold text-slate-500">{isRtl ? 'مقاس الورق' : 'Paper Size'}</label>
                  <select
                    value={reportSettings.paperSize}
                    onChange={(event) => setReportSettings((prev) => ({ ...prev, paperSize: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    <option>A4</option>
                    <option>A3</option>
                    <option>Letter</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">{isRtl ? 'الوضع' : 'Orientation'}</label>
                  <select
                    value={reportSettings.orientation}
                    onChange={(event) => setReportSettings((prev) => ({ ...prev, orientation: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    <option value="Portrait">{isRtl ? 'عمودي' : 'Portrait'}</option>
                    <option value="Landscape">{isRtl ? 'أفقي' : 'Landscape'}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">{isRtl ? 'نوع الخط' : 'Font'}</label>
                  <select
                    value={reportSettings.font}
                    onChange={(event) => setReportSettings((prev) => ({ ...prev, font: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    <option>Cairo</option>
                    <option>IBM Plex Sans</option>
                    <option>Tahoma</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">{isRtl ? 'حجم الخط' : 'Font Size'}</label>
                  <select
                    value={reportSettings.fontSize}
                    onChange={(event) => setReportSettings((prev) => ({ ...prev, fontSize: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    <option>11</option>
                    <option>12</option>
                    <option>13</option>
                    <option>14</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500">{isRtl ? 'ارتفاع السطر' : 'Line Height'}</label>
                  <select
                    value={reportSettings.lineHeight}
                    onChange={(event) => setReportSettings((prev) => ({ ...prev, lineHeight: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    <option>1.2</option>
                    <option>1.4</option>
                    <option>1.6</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-5">
                <button
                  onClick={() => setSettingsReportId(null)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600"
                >
                  {isRtl ? 'إغلاق' : 'Close'}
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-black text-white"
                >
                  {isRtl ? 'حفظ' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-start">
      {!selectedReport ? (
        <>
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800">تقارير الحسابات</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">إعدادات الطباعة والتنسيق المالي للتقارير</p>
                {isYearClosed && (
                  <span className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-700">
                    🔒 العام المالي مغلق
                  </span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-600 text-[11px] font-black uppercase">
                  <tr>
                    <th className="px-4 py-3 text-center">تصميم</th>
                    <th className="px-4 py-3 text-center">نوع الخط</th>
                    <th className="px-4 py-3 text-center">حجم الخط</th>
                    <th className="px-4 py-3 text-center">ارتفاع السطر</th>
                    <th className="px-4 py-3 text-center">مقاس الورق</th>
                    <th className="px-4 py-3 text-center">الوضع</th>
                    <th className="px-4 py-3 text-start">اسم التقرير</th>
                    <th className="px-4 py-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {mergedReports.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-slate-400 font-bold">
                        {isRtl ? 'لا توجد تقارير متاحة' : 'No reports available'}
                      </td>
                    </tr>
                  ) : selectedReport === INCOME_STATEMENT_REPORT_ID ? (
                    <div className="space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                          <Filter size={16} />
                          <span>مرشحات قائمة الدخل</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setAppliedIncomeFilters(incomeFilters)}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-xs font-black"
                          >
                            <Search size={14} />
                            تطبيق الفلتر
                          </button>
                          <button
                            onClick={() => window.print()}
                            disabled={
                              incomeStatement.revenueRows.length === 0 &&
                              incomeStatement.expenseRows.length === 0
                            }
                            title={
                              incomeStatement.revenueRows.length === 0 &&
                              incomeStatement.expenseRows.length === 0
                                ? 'لا توجد بيانات قابلة للطباعة'
                                : ''
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Printer size={14} />
                            طباعة
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 no-print">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                            <CalendarRange size={14} /> من تاريخ
                          </label>
                          <input
                            type="date"
                            value={incomeFilters.from}
                            onChange={(e) => setIncomeFilters((p) => ({ ...p, from: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                            <CalendarRange size={14} /> إلى تاريخ
                          </label>
                          <input
                            type="date"
                            value={incomeFilters.to}
                            onChange={(e) => setIncomeFilters((p) => ({ ...p, to: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                          />
                        </div>
                      </div>

                      <div className="hidden print:block border border-slate-200 rounded-xl p-4 text-right space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-black text-slate-800">{activeSchool?.School_Name || activeSchool?.name || 'المدرسة'}</p>
                            <p className="text-xs font-bold text-slate-600">{activeYear?.Year_Name || activeYear?.AcademicYear_Name || activeYear?.Name || workingYearId || ''}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-black text-slate-900">قائمة الدخل</p>
                            <p className="text-[11px] text-slate-500 font-bold">
                              الفترة: {appliedIncomeFilters.from || '—'} - {appliedIncomeFilters.to || '—'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold">
                              تاريخ الطباعة: {new Date().toLocaleDateString()}
                            </p>
                          </div>
                          <div className="h-16 w-16 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[10px] text-slate-300 font-black">
                            {activeSchool?.Logo ? <img src={activeSchool.Logo} alt="logo" className="h-16 w-16 object-contain" /> : 'LOGO'}
                          </div>
                        </div>
                      </div>

                      <ReportPrintWrapper
                        settings={reportSettings}
                        title={getReportTitle(INCOME_STATEMENT_REPORT_ID)}
                        subtitle={`عن الفترة من ${appliedIncomeFilters.from || '—'} إلى ${appliedIncomeFilters.to || '—'}`}
                      >
                        <div className="space-y-4">
                          <div className="text-center space-y-1">
                            <h3 className="text-xl font-black text-slate-900">قائمة الدخل</h3>
                            <p className="text-sm font-semibold text-slate-600">
                              الفترة: {appliedIncomeFilters.from || '—'} - {appliedIncomeFilters.to || '—'}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-lg font-black text-slate-800">الإيرادات</h4>
                            <div className="overflow-hidden rounded-2xl border border-slate-200">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-700">
                                  <tr>
                                    <th className="py-2 px-3 text-start">اسم الحساب</th>
                                    <th className="py-2 px-3 text-center">المبلغ</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {incomeStatement.revenueRows.map((row, idx) => (
                                    <tr key={row.account.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                      <td className="py-2 px-3 font-semibold text-slate-800">{row.account.name || row.account.code}</td>
                                      <td className="py-2 px-3 text-center font-mono text-emerald-700">{row.amount.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                  {incomeStatement.revenueRows.length === 0 && (
                                    <tr>
                                      <td colSpan={2} className="py-3 px-3 text-center text-slate-400 font-bold">
                                        لا توجد إيرادات
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                                <tfoot>
                                  <tr className="bg-slate-100 font-black">
                                    <td className="py-2 px-3 text-start">إجمالي الإيرادات</td>
                                    <td className="py-2 px-3 text-center font-mono text-emerald-700">{incomeStatement.totalRevenue.toFixed(2)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-lg font-black text-slate-800">المصروفات</h4>
                            <div className="overflow-hidden rounded-2xl border border-slate-200">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-700">
                                  <tr>
                                    <th className="py-2 px-3 text-start">اسم الحساب</th>
                                    <th className="py-2 px-3 text-center">المبلغ</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {incomeStatement.expenseRows.map((row, idx) => (
                                    <tr key={row.account.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                      <td className="py-2 px-3 font-semibold text-slate-800">{row.account.name || row.account.code}</td>
                                      <td className="py-2 px-3 text-center font-mono text-rose-700">{row.amount.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                  {incomeStatement.expenseRows.length === 0 && (
                                    <tr>
                                      <td colSpan={2} className="py-3 px-3 text-center text-slate-400 font-bold">
                                        لا توجد مصروفات
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                                <tfoot>
                                  <tr className="bg-slate-100 font-black">
                                    <td className="py-2 px-3 text-start">إجمالي المصروفات</td>
                                    <td className="py-2 px-3 text-center font-mono text-rose-700">{incomeStatement.totalExpense.toFixed(2)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-lg font-black text-slate-800">صافي الدخل</h4>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
                              <div className="font-bold text-slate-700">صافي الدخل</div>
                              <div className={`font-black text-lg ${incomeStatement.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {incomeStatement.net.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </ReportPrintWrapper>
                    </div>
                  ) : selectedReport === BALANCE_SHEET_REPORT_ID ? (
                    <div className="space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                          <Filter size={16} />
                          <span>مرشحات الميزانية</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setAppliedBalanceFilters(balanceFilters)}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-xs font-black"
                          >
                            <Search size={14} />
                            تطبيق الفلتر
                          </button>
                          <button
                            onClick={() => window.print()}
                            disabled={
                              balanceSheet.assets.length === 0 &&
                              balanceSheet.liabilities.length === 0 &&
                              balanceSheet.equity.length === 0
                            }
                            title={
                              balanceSheet.assets.length === 0 &&
                              balanceSheet.liabilities.length === 0 &&
                              balanceSheet.equity.length === 0
                                ? 'لا توجد بيانات قابلة للطباعة'
                                : ''
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Printer size={14} />
                            طباعة
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 no-print">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                            <CalendarRange size={14} /> كما في تاريخ
                          </label>
                          <input
                            type="date"
                            value={balanceFilters.asOf}
                            onChange={(e) => setBalanceFilters((p) => ({ ...p, asOf: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500">عرض الأرصدة الصفرية</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={balanceFilters.showZero}
                              onChange={(e) => setBalanceFilters((p) => ({ ...p, showZero: e.target.checked }))}
                              className="h-4 w-4"
                            />
                            <span className="text-sm font-semibold text-slate-600">إظهار</span>
                          </div>
                        </div>
                      </div>

                      <div className="hidden print:block border border-slate-200 rounded-xl p-4 text-right space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-black text-slate-800">{activeSchool?.School_Name || activeSchool?.name || 'المدرسة'}</p>
                            <p className="text-xs font-bold text-slate-600">{activeYear?.Year_Name || activeYear?.AcademicYear_Name || activeYear?.Name || workingYearId || ''}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-black text-slate-900">الميزانية العمومية</p>
                            <p className="text-[11px] text-slate-500 font-bold">
                              كما في: {appliedBalanceFilters.asOf || '—'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold">
                              تاريخ الطباعة: {new Date().toLocaleDateString()}
                            </p>
                          </div>
                          <div className="h-16 w-16 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[10px] text-slate-300 font-black">
                            {activeSchool?.Logo ? <img src={activeSchool.Logo} alt="logo" className="h-16 w-16 object-contain" /> : 'LOGO'}
                          </div>
                        </div>
                      </div>

                      <ReportPrintWrapper
                        settings={reportSettings}
                        title={getReportTitle(BALANCE_SHEET_REPORT_ID)}
                        subtitle={`كما في تاريخ ${appliedBalanceFilters.asOf || '—'}`}
                      >
                        <div className="space-y-6">
                          <div className="text-center space-y-1">
                            <h3 className="text-xl font-black text-slate-900">الميزانية العمومية</h3>
                            <p className="text-sm font-semibold text-slate-600">
                              كما في تاريخ: {appliedBalanceFilters.asOf || '—'}
                            </p>
                          </div>

                          <div className="space-y-3">
                            <h4 className="text-lg font-black text-slate-800">الأصول</h4>
                            <div className="rounded-2xl border border-slate-200 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-700">
                                  <tr>
                                    <th className="py-2 px-3 text-start">كود الحساب</th>
                                    <th className="py-2 px-3 text-start">اسم الحساب</th>
                                    <th className="py-2 px-3 text-center">الرصيد</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {balanceSheet.assets.map((row, idx) => (
                                    <tr key={row.account.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                      <td className="py-2 px-3 font-mono font-bold text-slate-800">{row.account.code || row.account.id}</td>
                                      <td className="py-2 px-3 font-semibold text-slate-800">{row.account.name || row.account.code}</td>
                                      <td className="py-2 px-3 text-center font-mono text-emerald-700">{row.balance.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                  {balanceSheet.assets.length === 0 && (
                                    <tr>
                                      <td colSpan={3} className="py-3 px-3 text-center text-slate-400 font-bold">
                                        لا توجد أصول
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                                <tfoot>
                                  <tr className="bg-slate-100 font-black">
                                    <td className="py-2 px-3 text-start" colSpan={2}>إجمالي الأصول</td>
                                    <td className="py-2 px-3 text-center font-mono text-emerald-700">{balanceSheet.assetsTotal.toFixed(2)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="text-lg font-black text-slate-800">الخصوم</h4>
                            <div className="rounded-2xl border border-slate-200 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-700">
                                  <tr>
                                    <th className="py-2 px-3 text-start">كود الحساب</th>
                                    <th className="py-2 px-3 text-start">اسم الحساب</th>
                                    <th className="py-2 px-3 text-center">الرصيد</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {balanceSheet.liabilities.map((row, idx) => (
                                    <tr key={row.account.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                      <td className="py-2 px-3 font-mono font-bold text-slate-800">{row.account.code || row.account.id}</td>
                                      <td className="py-2 px-3 font-semibold text-slate-800">{row.account.name || row.account.code}</td>
                                      <td className="py-2 px-3 text-center font-mono text-rose-700">{row.balance.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                  {balanceSheet.liabilities.length === 0 && (
                                    <tr>
                                      <td colSpan={3} className="py-3 px-3 text-center text-slate-400 font-bold">
                                        لا توجد خصوم
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                                <tfoot>
                                  <tr className="bg-slate-100 font-black">
                                    <td className="py-2 px-3 text-start" colSpan={2}>إجمالي الخصوم</td>
                                    <td className="py-2 px-3 text-center font-mono text-rose-700">{balanceSheet.liabilitiesTotal.toFixed(2)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="text-lg font-black text-slate-800">حقوق الملكية</h4>
                            <div className="rounded-2xl border border-slate-200 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-700">
                                  <tr>
                                    <th className="py-2 px-3 text-start">كود الحساب</th>
                                    <th className="py-2 px-3 text-start">اسم الحساب</th>
                                    <th className="py-2 px-3 text-center">الرصيد</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {balanceSheet.equity.map((row, idx) => (
                                    <tr key={row.account.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                      <td className="py-2 px-3 font-mono font-bold text-slate-800">{row.account.code || row.account.id}</td>
                                      <td className="py-2 px-3 font-semibold text-slate-800">{row.account.name || row.account.code}</td>
                                      <td className="py-2 px-3 text-center font-mono text-indigo-700">{row.balance.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                  {balanceSheet.equity.length === 0 && (
                                    <tr>
                                      <td colSpan={3} className="py-3 px-3 text-center text-slate-400 font-bold">
                                        لا توجد حسابات حقوق ملكية
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                                <tfoot>
                                  <tr className="bg-slate-100 font-black">
                                    <td className="py-2 px-3 text-start" colSpan={2}>إجمالي حقوق الملكية</td>
                                    <td className="py-2 px-3 text-center font-mono text-indigo-700">{balanceSheet.equityTotal.toFixed(2)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
                            <div className="font-bold text-slate-700">
                              ملخص الميزانية: أصول = {balanceSheet.assetsTotal.toFixed(2)} | خصوم + حقوق الملكية = {(balanceSheet.liabilitiesTotal + balanceSheet.equityTotal).toFixed(2)}
                            </div>
                            <div className={`font-black ${balanceSheet.balanced ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {balanceSheet.balanced ? '✔️ الميزانية متوازنة' : '⚠️ الميزانية غير متوازنة'}
                            </div>
                          </div>
                        </div>
                      </ReportPrintWrapper>
                    </div>
                  ) : selectedReport === CASHFLOW_REPORT_ID ? (
                    <CashflowReport
                      title={getReportTitle(CASHFLOW_REPORT_ID)}
                      accounts={accounts || []}
                      postedEntries={postedEntries}
                      activeSchool={activeSchool}
                      activeYear={activeYear}
                      workingYearId={workingYearId}
                      isYearClosed={isYearClosed}
                      reportSettings={reportSettings}
                    />
                  ) : selectedReport === REVENUE_EXPENSE_REPORT_ID ||
                    getReportTitle(selectedReport || '') === (isRtl ? 'تقرير الإيرادات والمصروفات' : 'Revenue & Expense Report') ? (
                    <RevenueExpenseReport
                      title={getReportTitle(REVENUE_EXPENSE_REPORT_ID)}
                      accounts={accounts || []}
                      postedEntries={postedEntries}
                      workingYearId={workingYearId}
                      activeYear={activeYear}
                      reportSettings={reportSettings}
                    />
                  ) : (
                    mergedReports.map((report: any, index: number) => (
                      <tr key={report.Report_ID} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <FileBarChart size={18} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold">Cairo</td>
                        <td className="px-4 py-3 text-center font-mono">12</td>
                        <td className="px-4 py-3 text-center font-mono">1.4</td>
                        <td className="px-4 py-3 text-center font-semibold">A4</td>
                        <td className="px-4 py-3 text-center font-semibold">{isRtl ? 'عمودي' : 'Portrait'}</td>
                        <td className="px-4 py-3 text-start font-black text-slate-800">
                          {isRtl ? report.Title_Ar : report.Title_En}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handlePrint(report.Report_ID)}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-[10px] font-black uppercase text-white"
                            >
                              <Printer size={14} /> {t.printReport}
                            </button>
                            <button
                              onClick={() => handlePreview(report.Report_ID)}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-600"
                            >
                              <Eye size={14} />
                              {isRtl ? 'معاينة' : 'Preview'}
                            </button>
                            <button
                              onClick={() => handleOpenSettings(report.Report_ID)}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-emerald-600"
                            >
                              <ShieldCheck size={14} />
                              {isRtl ? 'إعدادات' : 'Settings'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-8 bg-indigo-50 rounded-[2.5rem] border border-indigo-100 flex items-center gap-6">
             <div className="w-12 h-12 bg-white text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                <ShieldCheck size={24} />
             </div>
             <div>
                <h4 className="font-black text-slate-800 tracking-tight">{isRtl ? 'التحكم في الصلاحيات' : 'Access Control'}</h4>
                <p className="text-[10px] text-indigo-700 font-bold opacity-70 mt-1 uppercase tracking-widest">
                  {isRtl ? 'هذه التقارير تظهر بناءً على مصفوفة الصلاحيات في قسم الأعضاء.' : 'These reports are visible based on the permissions matrix in the Members section.'}
                </p>
             </div>
          </div>
          {settingsReportId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6">
              <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-100">
                <div className="flex items-center justify-between border-b border-slate-100 p-5">
                  <div>
                    <h4 className="text-lg font-black text-slate-800">{isRtl ? 'إعدادات التقرير' : 'Report Settings'}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {isRtl ? 'تحكم سريع في شكل الطباعة لهذا التقرير' : 'Quick print layout controls'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSettingsReportId(null)}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-700"
                  >
                    ×
                  </button>
                </div>
                <div className="p-6 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-slate-500">{isRtl ? 'مقاس الورق' : 'Paper Size'}</label>
                    <select
                      value={reportSettings.paperSize}
                      onChange={(event) =>
                        setReportSettings((prev) => ({ ...prev, paperSize: event.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      <option>A4</option>
                      <option>A3</option>
                      <option>Letter</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">{isRtl ? 'الوضع' : 'Orientation'}</label>
                    <select
                      value={reportSettings.orientation}
                      onChange={(event) =>
                        setReportSettings((prev) => ({ ...prev, orientation: event.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      <option value="Portrait">{isRtl ? 'عمودي' : 'Portrait'}</option>
                      <option value="Landscape">{isRtl ? 'أفقي' : 'Landscape'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">{isRtl ? 'نوع الخط' : 'Font'}</label>
                    <select
                      value={reportSettings.font}
                      onChange={(event) =>
                        setReportSettings((prev) => ({ ...prev, font: event.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      <option>Cairo</option>
                      <option>IBM Plex Sans</option>
                      <option>Tahoma</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500">{isRtl ? 'حجم الخط' : 'Font Size'}</label>
                    <select
                      value={reportSettings.fontSize}
                      onChange={(event) =>
                        setReportSettings((prev) => ({ ...prev, fontSize: event.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      <option>11</option>
                      <option>12</option>
                      <option>13</option>
                      <option>14</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-500">{isRtl ? 'ارتفاع السطر' : 'Line Height'}</label>
                    <select
                      value={reportSettings.lineHeight}
                      onChange={(event) =>
                        setReportSettings((prev) => ({ ...prev, lineHeight: event.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      <option>1.2</option>
                      <option>1.4</option>
                      <option>1.6</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-5">
                  <button
                    onClick={() => setSettingsReportId(null)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600"
                  >
                    {isRtl ? 'إغلاق' : 'Close'}
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black text-white"
                  >
                    {isRtl ? 'حفظ الإعدادات' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="animate-in zoom-in-95 duration-500">
           <button 
             onClick={() => setSelectedReport(null)}
             className="mb-8 flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-indigo-600 transition-colors"
           >
                             &larr; {isRtl ? 'العودة لقائمة التقارير' : 'Back to Reports'}
           </button>

           <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
              <ReportPrintWrapper 
                reportTitle={getReportTitle(selectedReport || '')}
                activeSchool={activeSchool}
                reportConfig={finConfig}
                lang={lang}
                activeYearName={(activeYear?.Year_Name || workingYearId || '').toString()}
              >
                <div className="py-10 text-center space-y-4">
                  {selectedReport === 'FIN-RPT-AR-SUMMARY' ? (
                    <>
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
                    </>
                  ) : selectedReport === JOURNAL_REPORT_ID ? (
                    <JournalReport
                      isRtl={isRtl}
                      filters={journalFilters}
                      setFilters={setJournalFilters}
                      appliedFilters={appliedJournalFilters}
                      applyFilters={() => setAppliedJournalFilters(journalFilters)}
                      journalLines={journalLines}
                      journalTotals={journalTotals}
                      journalNoData={journalNoData}
                      filteredAccounts={filteredAccounts}
                      accountMap={accountMap}
                      reportSettings={reportSettings}
                      getReportTitle={getReportTitle}
                      reportId={JOURNAL_REPORT_ID}
                    />
                  ) : selectedReport === GENERAL_LEDGER_REPORT_ID ? (
                    <div className="space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                          <Filter size={16} />
                          <span>{isRtl ? 'مرشحات التقرير' : 'Report Filters'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setAppliedLedgerFilters(ledgerFilters)}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-xs font-black"
                          >
                            <Search size={14} />
                            {isRtl ? 'تطبيق الفلتر' : 'Apply Filter'}
                          </button>
                          <button
                            onClick={() => window.print()}
                            disabled={!ledgerAccount || ledgerNoData}
                            title={!ledgerAccount ? (isRtl ? 'اختر حسابًا لعرض التقرير' : 'Select an account first') : ''}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Printer size={14} />
                            {isRtl ? 'طباعة' : 'Print'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 no-print">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                            <Search size={14} /> {isRtl ? 'بحث حساب' : 'Search Account'}
                          </label>
                          <input
                            type="text"
                            value={ledgerFilters.accountQuery}
                            onChange={(e) => setLedgerFilters((p) => ({ ...p, accountQuery: e.target.value }))}
                            placeholder={isRtl ? 'كود أو اسم الحساب' : 'Code or name'}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                          />
                          <select
                            value={ledgerFilters.accountId}
                            onChange={(e) => setLedgerFilters((p) => ({ ...p, accountId: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                          >
                            <option value="">{isRtl ? 'اختر الحساب' : 'Select account'}</option>
                            {ledgerFilteredAccounts.map((acc: any) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.code} - {acc.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                            <CalendarRange size={14} /> {isRtl ? 'من تاريخ' : 'From'}
                          </label>
                          <input
                            type="date"
                            value={ledgerFilters.from}
                            onChange={(e) => setLedgerFilters((p) => ({ ...p, from: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                            <CalendarRange size={14} /> {isRtl ? 'إلى تاريخ' : 'To'}
                          </label>
                          <input
                            type="date"
                            value={ledgerFilters.to}
                            onChange={(e) => setLedgerFilters((p) => ({ ...p, to: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500">{isRtl ? 'مصدر القيد' : 'Entry Source'}</label>
                          <select
                            value={ledgerFilters.entryType}
                            onChange={(e) => setLedgerFilters((p) => ({ ...p, entryType: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                          >
                            <option value="all">{isRtl ? 'الكل' : 'All'}</option>
                            <option value="manual">{isRtl ? 'يدوي' : 'Manual'}</option>
                            <option value="accrual">{isRtl ? 'استحقاق' : 'Accrual'}</option>
                            <option value="receipt">{isRtl ? 'رسوم/قبض' : 'Receipt'}</option>
                            <option value="stores">{isRtl ? 'مخازن' : 'Stores'}</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500">{isRtl ? 'السنة المالية' : 'Year'}</label>
                          <input
                            type="text"
                            value={ledgerFilters.yearId}
                            onChange={(e) => setLedgerFilters((p) => ({ ...p, yearId: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                            placeholder={isRtl ? 'السنة النشطة' : 'Active year'}
                          />
                        </div>
                      </div>

                      <div className="hidden print:block border border-slate-200 rounded-xl p-4 text-right space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-black text-slate-800">{activeSchool?.School_Name || activeSchool?.name || 'المدرسة'}</p>
                            <p className="text-xs font-bold text-slate-600">{activeYear?.Year_Name || activeYear?.AcademicYear_Name || activeYear?.Name || workingYearId || ''}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-black text-slate-900">تقرير الأستاذ العام</p>
                            <p className="text-[11px] text-slate-500 font-bold">
                              {ledgerAccount ? `${ledgerAccount.code} - ${ledgerAccount.name}` : (isRtl ? 'لم يتم اختيار حساب' : 'No account selected')}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold">
                              {isRtl ? 'الفترة' : 'Period'}: {appliedLedgerFilters.from || '—'} - {appliedLedgerFilters.to || '—'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold">
                              {isRtl ? 'تاريخ الطباعة' : 'Printed on'}: {new Date().toLocaleDateString()}
                            </p>
                          </div>
                          <div className="h-16 w-16 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[10px] text-slate-300 font-black">
                            {activeSchool?.Logo ? <img src={activeSchool.Logo} alt="logo" className="h-16 w-16 object-contain" /> : 'LOGO'}
                          </div>
                        </div>
                      </div>

                      {ledgerNoData ? (
                        <div className="border border-amber-100 bg-amber-50 text-amber-700 font-bold rounded-2xl px-4 py-4">
                          {!ledgerAccount
                            ? (isRtl ? 'اختر حسابًا لعرض التقرير.' : 'Please select an account.')
                            : (isRtl ? 'لا توجد حركات مطابقة للفلتر.' : 'No ledger movements for this filter.')}
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="rounded-2xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-100 text-slate-700">
                                <tr>
                                  <th className="py-2 px-3 text-center">التاريخ</th>
                                  <th className="py-2 px-3 text-center">رقم القيد</th>
                                  <th className="py-2 px-3 text-start">البيان</th>
                                  <th className="py-2 px-3 text-center">مدين</th>
                                  <th className="py-2 px-3 text-center">دائن</th>
                                  <th className="py-2 px-3 text-center">الرصيد</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="bg-slate-50">
                                  <td className="py-2 px-3 text-center font-mono text-xs">—</td>
                                  <td className="py-2 px-3 text-center font-mono text-xs">—</td>
                                  <td className="py-2 px-3 text-start font-semibold">رصيد افتتاحي</td>
                                  <td className="py-2 px-3 text-center font-mono text-emerald-700">0.00</td>
                                  <td className="py-2 px-3 text-center font-mono text-indigo-700">0.00</td>
                                  <td className="py-2 px-3 text-center font-mono font-black">
                                    {ledgerAccount ? Number(ledgerAccount.balance || 0).toFixed(2) : '0.00'}
                                  </td>
                                </tr>
                                {ledgerLines.map((line, idx) => (
                                  <tr key={`${line.entryNumber}-${idx}`} className="odd:bg-white even:bg-slate-50">
                                    <td className="py-2 px-3 text-center font-mono text-xs">{line.entryDate ? new Date(line.entryDate).toLocaleDateString() : '—'}</td>
                                    <td className="py-2 px-3 text-center font-bold">{line.entryNumber}</td>
                                    <td className="py-2 px-3 text-start">{line.description || '—'}</td>
                                    <td className="py-2 px-3 text-center font-mono text-emerald-700">{line.debit.toFixed(2)}</td>
                                    <td className="py-2 px-3 text-center font-mono text-indigo-700">{line.credit.toFixed(2)}</td>
                                    <td className="py-2 px-3 text-center font-mono font-black">{line.balance.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-slate-100 font-black">
                                  <td className="py-2 px-3 text-center" colSpan={3}>الإجمالي</td>
                                  <td className="py-2 px-3 text-center font-mono text-emerald-700">{ledgerTotals.debit.toFixed(2)}</td>
                                  <td className="py-2 px-3 text-center font-mono text-indigo-700">{ledgerTotals.credit.toFixed(2)}</td>
                                  <td className="py-2 px-3 text-center font-mono font-black">{ledgerTotals.finalBalance.toFixed(2)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : selectedReport === FINANCIAL_CLOSE_REPORT_ID ? (
                    <div className="space-y-4">
                      {!isYearClosed ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                          لا يمكن عرض التقرير لأن العام المالي غير مغلق بعد.
                        </div>
                      ) : (
                        <ReportPrintWrapper
                          settings={reportSettings}
                          title={getReportTitle(FINANCIAL_CLOSE_REPORT_ID)}
                          subtitle="تقرير رسمي لإغلاق العام المالي"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 no-print mb-4">
                            <div className="text-slate-600 font-bold text-sm flex items-center gap-2">
                              <ShieldCheck size={16} className="text-emerald-600" />
                              تقرير ثابت يعتمد على بيانات الإغلاق
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => window.print()}
                                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-black"
                              >
                                <Printer size={14} />
                                طباعة
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex flex-col gap-1 text-center">
                              <p className="text-sm font-bold text-slate-500">
                                {activeSchool?.School_Name || activeSchool?.Name || 'اسم المدرسة'}
                              </p>
                              <p className="text-xs font-semibold text-slate-500">
                                العام المالي: {yearId}
                              </p>
                              <h2 className="text-2xl font-black text-slate-900">تقرير إغلاق العام المالي</h2>
                              <p className="text-sm font-bold text-slate-600">
                                تاريخ الإغلاق: {closeState?.closeDate ? new Date(closeState.closeDate).toLocaleString('ar-EG') : 'غير متوفر'}
                              </p>
                              <p className="text-sm font-bold text-slate-600">
                                نفّذ الإغلاق: {closeState?.summary?.closedBy || closeState?.summary?.user || closeState?.summary?.username || 'غير متوفر'}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-center">
                                <p className="text-[11px] text-slate-400 font-black uppercase">إجمالي القيود</p>
                                <p className="text-xl font-black text-slate-900">{entries?.length || 0}</p>
                              </div>
                              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-center">
                                <p className="text-[11px] text-slate-400 font-black uppercase">القيود المرحلة</p>
                                <p className="text-xl font-black text-emerald-700">{postedEntries.length}</p>
                              </div>
                              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-center">
                                <p className="text-[11px] text-slate-400 font-black uppercase">اتزان القيود</p>
                                <p className={`text-xl font-black ${unbalancedEntries.length === 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                  {unbalancedEntries.length === 0 ? '✔️ متزن' : `${unbalancedEntries.length} غير موزون`}
                                </p>
                              </div>
                              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-center">
                                <p className="text-[11px] text-emerald-600 font-black uppercase">حالة الإغلاق</p>
                                <p className="text-xl font-black text-emerald-700">تم الإغلاق بنجاح</p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h4 className="text-lg font-black text-slate-800">جدول المديونيات المرحلة</h4>
                              <div className="overflow-auto rounded-2xl border border-slate-200">
                                <table className="min-w-full text-sm">
                                  <thead className="bg-slate-50 text-slate-700">
                                    <tr>
                                      <th className="py-2 px-3 text-start">اسم الطالب</th>
                                      <th className="py-2 px-3 text-center">الصف</th>
                                      <th className="py-2 px-3 text-center">الرصيد المرحل (مدين)</th>
                                      <th className="py-2 px-3 text-start">ملاحظات</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {studentDebtors.map((s, idx) => (
                                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                        <td className="py-2 px-3 font-semibold text-slate-800">{s.name}</td>
                                        <td className="py-2 px-3 text-center text-slate-600">
                                          {s.gradeName || '—'} {s.className ? `/ ${s.className}` : ''}
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono font-black text-rose-600">{s.balance.toFixed(2)}</td>
                                        <td className="py-2 px-3 text-start text-slate-600">رصيد مرحل للعام الجديد</td>
                                      </tr>
                                    ))}
                                    {studentDebtors.length === 0 && (
                                      <tr>
                                        <td colSpan={4} className="py-3 px-3 text-center text-slate-400 font-bold">
                                          لا توجد مديونيات مرحلة
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h4 className="text-lg font-black text-slate-800">جدول الدفعات المقدّمة</h4>
                              <div className="overflow-auto rounded-2xl border border-slate-200">
                                <table className="min-w-full text-sm">
                                  <thead className="bg-slate-50 text-slate-700">
                                    <tr>
                                      <th className="py-2 px-3 text-start">اسم الطالب</th>
                                      <th className="py-2 px-3 text-center">الصف</th>
                                      <th className="py-2 px-3 text-center">المبلغ</th>
                                      <th className="py-2 px-3 text-start">النوع</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {studentCreditors.map((s, idx) => (
                                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                        <td className="py-2 px-3 font-semibold text-slate-800">{s.name}</td>
                                        <td className="py-2 px-3 text-center text-slate-600">
                                          {s.gradeName || '—'} {s.className ? `/ ${s.className}` : ''}
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono font-black text-indigo-700">{Math.abs(s.balance).toFixed(2)}</td>
                                        <td className="py-2 px-3 text-start text-slate-600">دفعة مقدّمة للعام الجديد</td>
                                      </tr>
                                    ))}
                                    {studentCreditors.length === 0 && (
                                      <tr>
                                        <td colSpan={4} className="py-3 px-3 text-center text-slate-400 font-bold">
                                          لا توجد دفعات مقدّمة
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h4 className="text-lg font-black text-slate-800">معاينة القيد الافتتاحي</h4>
                              <p className="text-sm font-semibold text-slate-500">قيد نظامي غير قابل للتعديل</p>
                              <div className="overflow-auto rounded-2xl border border-slate-200">
                                <table className="min-w-full text-sm">
                                  <thead className="bg-slate-50 text-slate-700">
                                    <tr>
                                      <th className="py-2 px-3 text-start">الحساب</th>
                                      <th className="py-2 px-3 text-center">مدين</th>
                                      <th className="py-2 px-3 text-center">دائن</th>
                                      <th className="py-2 px-3 text-start">البيان</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {openingPreviewLines.lines.map((line, idx) => (
                                      <tr key={line.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                        <td className="py-2 px-3 font-semibold text-slate-800">{line.name}</td>
                                        <td className="py-2 px-3 text-center font-mono text-emerald-700">{line.debit.toFixed(2)}</td>
                                        <td className="py-2 px-3 text-center font-mono text-indigo-700">{line.credit.toFixed(2)}</td>
                                        <td className="py-2 px-3 text-start text-slate-600">{line.note}</td>
                                      </tr>
                                    ))}
                                    {openingPreviewLines.lines.length === 0 && (
                                      <tr>
                                        <td colSpan={4} className="py-3 px-3 text-center text-slate-400 font-bold">
                                          لا توجد بيانات رصيد افتتاحي متاحة
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                  <tfoot>
                                    <tr className="bg-slate-100 font-black">
                                      <td className="py-2 px-3 text-center">الإجمالي</td>
                                      <td className="py-2 px-3 text-center font-mono text-emerald-700">{openingPreviewLines.totals.debit.toFixed(2)}</td>
                                      <td className="py-2 px-3 text-center font-mono text-indigo-700">{openingPreviewLines.totals.credit.toFixed(2)}</td>
                                      <td className="py-2 px-3 text-center text-slate-600">{openingPreviewLines.totals.debit === openingPreviewLines.totals.credit ? '✔️ موزون' : 'غير موزون'}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            </div>

                            <div className="border border-slate-200 rounded-2xl p-4 space-y-2">
                              <p className="font-bold text-slate-700">
                                تم إغلاق العام المالي بعد المراجعة الكاملة للقيود والسندات.
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm font-semibold text-slate-600">
                                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                                  المدير المالي: ______________________
                                </div>
                                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                                  مدير المدرسة: ______________________
                                </div>
                                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                                  تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}
                                </div>
                              </div>
                            </div>
                          </div>
                        </ReportPrintWrapper>
                      )}
                    </div>
                  ) : selectedReport === TRIAL_BALANCE_REPORT_ID ? (
                    <div className="space-y-6">
                      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                          <Filter size={16} />
                          <span>مرشحات ميزان المراجعة</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setAppliedTrialFilters(trialFilters)}
                            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-xs font-black"
                          >
                            <Search size={14} />
                            تطبيق الفلتر
                          </button>
                          <button
                            onClick={() => window.print()}
                            disabled={trialBalanceRows.rows.length === 0}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Printer size={14} />
                            طباعة
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 no-print">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                            <CalendarRange size={14} /> من تاريخ
                          </label>
                          <input
                            type="date"
                            value={trialFilters.from}
                            onChange={(e) => setTrialFilters((p) => ({ ...p, from: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                            <CalendarRange size={14} /> إلى تاريخ
                          </label>
                          <input
                            type="date"
                            value={trialFilters.to}
                            onChange={(e) => setTrialFilters((p) => ({ ...p, to: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500">مستوى الحساب</label>
                          <select
                            value={trialFilters.level}
                            onChange={(e) => setTrialFilters((p) => ({ ...p, level: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                          >
                            <option value="all">الكل</option>
                            <option value="main">حساب رئيسي</option>
                            <option value="sub">حساب فرعي</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500">حساب محدد</label>
                          <select
                            value={trialFilters.accountId}
                            onChange={(e) => setTrialFilters((p) => ({ ...p, accountId: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
                          >
                            <option value="">كل الحسابات</option>
                            {(accounts || []).map((acc: any) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.code} - {acc.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="hidden print:block border border-slate-200 rounded-xl p-4 text-right space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-black text-slate-800">{activeSchool?.School_Name || activeSchool?.name || 'المدرسة'}</p>
                            <p className="text-xs font-bold text-slate-600">{activeYear?.Year_Name || activeYear?.AcademicYear_Name || activeYear?.Name || workingYearId || ''}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-black text-slate-900">ميزان المراجعة</p>
                            <p className="text-[11px] text-slate-500 font-bold">
                              الفترة: {appliedTrialFilters.from || '—'} - {appliedTrialFilters.to || '—'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold">
                              تاريخ الطباعة: {new Date().toLocaleDateString()}
                            </p>
                          </div>
                          <div className="h-16 w-16 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[10px] text-slate-300 font-black">
                            {activeSchool?.Logo ? <img src={activeSchool.Logo} alt="logo" className="h-16 w-16 object-contain" /> : 'LOGO'}
                          </div>
                        </div>
                      </div>

                      {trialBalanceRows.rows.length === 0 ? (
                        <div className="border border-amber-100 bg-amber-50 text-amber-700 font-bold rounded-2xl px-4 py-4">
                          لا توجد حركات مطابقة للفلتر.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm font-bold text-slate-700">
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                              <p className="text-xs text-slate-500">عدد الحسابات</p>
                              <p className="text-xl font-black text-slate-900">{trialBalanceRows.rows.length}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                              <p className="text-xs text-emerald-700">إجمالي مدين</p>
                              <p className="text-xl font-black text-emerald-700">{trialBalanceRows.totals.debit.toFixed(2)}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                              <p className="text-xs text-indigo-700">إجمالي دائن</p>
                              <p className="text-xl font-black text-indigo-700">{trialBalanceRows.totals.credit.toFixed(2)}</p>
                            </div>
                          </div>

                          <div className="overflow-auto rounded-3xl border border-slate-100 shadow-sm">
                            <table className="min-w-full text-sm text-right">
                              <thead className="bg-slate-50 text-slate-600 font-black">
                                <tr>
                                  <th className="px-4 py-3 border-b">رقم الحساب</th>
                                  <th className="px-4 py-3 border-b">اسم الحساب</th>
                                  <th className="px-4 py-3 border-b text-center">مدين</th>
                                  <th className="px-4 py-3 border-b text-center">دائن</th>
                                  <th className="px-4 py-3 border-b text-center">الرصيد</th>
                                  <th className="px-4 py-3 border-b text-center">نوع الرصيد</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {trialBalanceRows.rows.map((row, idx) => (
                                  <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                                    <td className="px-4 py-3 font-mono font-bold text-slate-800">{row.code}</td>
                                    <td className="px-4 py-3 font-bold text-slate-800">{row.name}</td>
                                    <td className="px-4 py-3 text-center font-mono text-emerald-700">{row.debit.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-center font-mono text-indigo-700">{row.credit.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-center font-mono font-black text-slate-900">{row.balance.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-center font-bold text-slate-700">{row.balanceType}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-slate-100 font-black">
                                  <td className="px-4 py-3 text-center" colSpan={2}>الإجمالي</td>
                                  <td className="px-4 py-3 text-center font-mono text-emerald-700">{trialBalanceRows.totals.debit.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-center font-mono text-indigo-700">{trialBalanceRows.totals.credit.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-center font-mono text-slate-900">
                                    {Math.abs(trialBalanceRows.totals.debit - trialBalanceRows.totals.credit).toFixed(2)}
                                  </td>
                                  <td className="px-4 py-3 text-center text-slate-700">
                                    {trialBalanceRows.totals.debit >= trialBalanceRows.totals.credit ? 'مدين' : 'دائن'}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="text-slate-400 font-bold italic">-- محتوى التقرير سيظهر هنا بناءً على البيانات --</p>
                      <div className="w-full h-px bg-slate-100"></div>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b-2 border-slate-900">
                            <th className="py-2 text-start font-black">Account</th>
                            <th className="py-2 text-end font-black">Debit</th>
                            <th className="py-2 text-end font-black">Credit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[1, 2, 3, 4].map((i) => (
                            <tr key={i} className="border-b border-slate-100 text-sm">
                              <td className="py-3">Cash In Hand</td>
                              <td className="py-3 text-end font-mono">1,000.00</td>
                              <td className="py-3 text-end font-mono">0.00</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              </ReportPrintWrapper>
           </div>
        </div>
      )}
    </div>
  );
};

export default FinanceReportsTab;
