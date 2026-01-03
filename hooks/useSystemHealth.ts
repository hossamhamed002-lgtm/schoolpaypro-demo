import { useMemo } from 'react';
import { getAuditLogs, logAuditEvent } from '../src/stores/auditLogStore';

export type HealthStatus = 'OK' | 'WARNING' | 'ERROR';
export type HealthSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SystemHealthCheck {
  key: string;
  title: string;
  status: HealthStatus;
  severity: HealthSeverity;
  message: string;
  lastCheckedAt: string;
  meta?: Record<string, any>;
}

interface HealthSummary {
  errors: number;
  warnings: number;
  oks: number;
  lastError?: string;
  status: HealthStatus;
  lastCheckAt: string;
  metrics: {
    studentsCount: number;
    invoicesCount: number;
    receiptsCount: number;
    journalsCount: number;
  };
}

const toStatus = (ok: boolean | null | undefined, warnCondition = false): HealthStatus => {
  if (ok) return 'OK';
  if (warnCondition) return 'WARNING';
  return 'ERROR';
};

const toSeverity = (status: HealthStatus, critical?: boolean): HealthSeverity => {
  if (critical && status !== 'OK') return 'critical';
  if (status === 'ERROR') return 'high';
  if (status === 'WARNING') return 'medium';
  return 'low';
};

export const useSystemHealth = (store: any, trigger: number) => {
  const checks = useMemo<SystemHealthCheck[]>(() => {
    const now = new Date().toISOString();

    const workingYear = store?.workingYearId;
    const schoolCode = store?.schoolCode;
    const reportConfigs = store?.reportConfigs || [];
    const accounts = store?.accounts || [];
    const journalEntries = store?.journalEntries || [];
    const receipts = store?.receipts || [];
    const users = store?.users || [];
    const grades = store?.grades || [];
    const students = store?.students || [];
    const invoices = receipts || [];

    const balancedEntries = journalEntries.filter((j: any) => {
      if (j.TotalDebit !== undefined && j.TotalCredit !== undefined) return j.TotalDebit === j.TotalCredit;
      if (Array.isArray(j.Lines) || Array.isArray((j as any).lines)) {
        const lines = (j as any).Lines || (j as any).lines || [];
        const debit = lines.reduce((acc: number, l: any) => acc + (l.Debit || l.debit || 0), 0);
        const credit = lines.reduce((acc: number, l: any) => acc + (l.Credit || l.credit || 0), 0);
        return debit === credit;
      }
      return false;
    });

    const lastBackup = (() => {
      try {
        const key = `AUTO_BACKUPS__${schoolCode || 'DEFAULT'}`;
        const raw = localStorage.getItem(key);
        const backups = raw ? (JSON.parse(raw) as any[]) : [];
        return backups.length ? backups[backups.length - 1] : null;
      } catch {
        return null;
      }
    })();

    const adminExists = users.some((u: any) => u.Role === 'ADMIN' || u.role === 'ADMIN');

    const checksList: SystemHealthCheck[] = [
      {
        key: 'WORKING_YEAR',
        title: 'العام الدراسي النشط',
        status: toStatus(Boolean(workingYear)),
        severity: toSeverity(toStatus(Boolean(workingYear)), !workingYear),
        message: workingYear ? `العام الحالي: ${workingYear}` : 'لا يوجد عام دراسي محدد',
        lastCheckedAt: now
      },
      {
        key: 'ACTIVE_SCHOOL',
        title: 'المدرسة النشطة',
        status: toStatus(Boolean(schoolCode)),
        severity: toSeverity(toStatus(Boolean(schoolCode)), !schoolCode),
        message: schoolCode || 'لا يوجد كود مدرسة نشط',
        lastCheckedAt: now
      },
      {
        key: 'PRINT_ENGINE',
        title: 'محرك الطباعة',
        status: toStatus(reportConfigs.length > 0, true),
        severity: toSeverity(toStatus(reportConfigs.length > 0, true), reportConfigs.length === 0),
        message: reportConfigs.length > 0 ? 'إعدادات طباعة متاحة' : 'لا توجد إعدادات طباعة نشطة',
        lastCheckedAt: now
      },
      {
        key: 'ACCOUNTS_BALANCE',
        title: 'اتزان القيود المحاسبية',
        status: toStatus(journalEntries.length === 0 ? false : balancedEntries.length === journalEntries.length, journalEntries.length === 0),
        severity: toSeverity(
          toStatus(journalEntries.length === 0 ? false : balancedEntries.length === journalEntries.length, journalEntries.length === 0),
          balancedEntries.length !== journalEntries.length && journalEntries.length > 0
        ),
        message:
          journalEntries.length === 0
            ? 'لا توجد قيود مسجلة'
            : balancedEntries.length === journalEntries.length
            ? 'كل القيود موزونة'
            : `${journalEntries.length - balancedEntries.length} قيود غير موزونة`,
        lastCheckedAt: now
      },
      {
        key: 'BACKUP_STATUS',
        title: 'النسخ الاحتياطي',
        status: toStatus(Boolean(lastBackup), true),
        severity: toSeverity(toStatus(Boolean(lastBackup), true), !lastBackup),
        message: lastBackup ? `آخر نسخة: ${lastBackup.createdAt || ''}` : 'لا توجد نسخ احتياطية',
        lastCheckedAt: now
      },
      {
        key: 'ADMIN_USER',
        title: 'مستخدم إداري',
        status: toStatus(adminExists),
        severity: toSeverity(toStatus(adminExists), !adminExists),
        message: adminExists ? 'مستخدم إداري متاح' : 'لا يوجد مستخدم إداري نشط',
        lastCheckedAt: now
      },
      {
        key: 'ACCOUNTS_EXISTS',
        title: 'حسابات الدليل',
        status: toStatus(accounts.length > 0, true),
        severity: toSeverity(toStatus(accounts.length > 0, true), accounts.length === 0),
        message: accounts.length ? `${accounts.length} حساب` : 'لا توجد حسابات في الدليل',
        lastCheckedAt: now
      },
      {
        key: 'RECEIPTS_APPROVED',
        title: 'حالة الإيصالات/الفواتير',
        status: toStatus(receipts.length > 0, true),
        severity: toSeverity(toStatus(receipts.length > 0, true), receipts.length === 0),
        message: receipts.length ? `${receipts.length} سجلات مالية` : 'لا توجد إيصالات أو فواتير',
        lastCheckedAt: now
      },
      {
        key: 'EXAM_DATA',
        title: 'بيانات الكنترول',
        status: toStatus(grades.length > 0, true),
        severity: toSeverity(toStatus(grades.length > 0, true), grades.length === 0),
        message: grades.length ? 'بيانات كنترول متاحة' : 'لا توجد بيانات درجات/صفوف',
        lastCheckedAt: now
      }
    ];

    return checksList;
  }, [store, store?.workingYearId, store?.schoolCode, store?.reportConfigs, store?.accounts, store?.journalEntries, store?.receipts, store?.users, store?.grades, trigger]);

  const summary = useMemo<HealthSummary>(() => {
    const errors = checks.filter((c) => c.status === 'ERROR').length;
    const warnings = checks.filter((c) => c.status === 'WARNING').length;
    const oks = checks.filter((c) => c.status === 'OK').length;
    const audit = getAuditLogs();
    const lastError = audit
      .filter((l) => l.severity === 'HIGH')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.description;
    const studentsCount = store?.students?.length || 0;
    const invoicesCount = store?.receipts?.length || 0;
    const receiptsCount = store?.receipts?.length || 0;
    const journalsCount = store?.journalEntries?.length || 0;
    const status: HealthStatus = errors > 0 ? 'ERROR' : warnings > 0 ? 'WARNING' : 'OK';
    return {
      errors,
      warnings,
      oks,
      lastError,
      status,
      lastCheckAt: new Date().toISOString(),
      metrics: { studentsCount, invoicesCount, receiptsCount, journalsCount }
    };
  }, [checks, store?.students, store?.receipts, store?.journalEntries]);

  const criticalAlerts = useMemo(() => checks.filter((c) => c.status === 'ERROR'), [checks]);

  // تسجيل تنبيه في الـ Audit Log عند وجود أخطاء أو حرجة (تأثير محدود)
  useMemo(() => {
    // ملاحظات مستقبلية: يمكن تسجيل تنبيهات في الـ Audit، حالياً نكتفي بالقراءة
  }, [criticalAlerts]);

  return { checks, summary, criticalAlerts };
};
