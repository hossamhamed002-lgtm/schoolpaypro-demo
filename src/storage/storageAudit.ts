/**
 * DEV-ONLY STORAGE AUDIT
 * ----------------------
 * حصر المفاتيح المستخدمة حالياً في localStorage عبر المشروع.
 * الغرض: توثيق أماكن التخزين قبل أي refactor لاحق. لا تغيير سلوكي.
 *
 * الفئات:
 * - license: مفاتيح الترخيص والـ vault والبرنامج المبرمج.
 * - meta: إعدادات عامة/تجريبية.
 * - academic: بيانات سنوات/مراحل/طلاب/لجان (Exam Control).
 * - staff/hr/finance/stores: نطاقات الموارد البشرية والمالية والمخازن.
 * - programmer/demo: أدوات المطور والنسخة التجريبية.
 *
 * ملاحظة: هذه القائمة مستخلصة من بحث سريع ولا تُعد ترحيل أو تعديل.
 */

export const STORAGE_AUDIT = [
  // License / HWID / Programmer
  { key: 'EDULOGIC_LICENSE_V1', file: 'license/licenseStorage.ts', purpose: 'license', scope: 'license' },
  { key: 'EDULOGIC_PROGRAMMER_CREDENTIALS_V1', file: 'components/SystemLogin.tsx', purpose: 'programmer creds', scope: 'programmer' },
  { key: 'EDULOGIC_PROGRAMMER_CONTEXT_V1', file: 'components/SystemLogin.tsx', purpose: 'programmer context', scope: 'programmer' },
  { key: 'EDULOGIC_PROGRAMMER_USER_V1', file: 'App.tsx', purpose: 'programmer user flag', scope: 'programmer' },
  { key: 'EDULOGIC_HWID_V1', file: 'license/hwid.ts', purpose: 'hwid cache', scope: 'license' },
  { key: 'EDULOGIC_INSTALL_FP_V1', file: 'license/installFingerprint.ts', purpose: 'install fingerprint', scope: 'license' },

  // Meta / gateway / selected year (exam control)
  { key: 'app_selected_year_preference', file: 'modules/exam-control/services/db.ts', purpose: 'selected academic year', scope: 'meta' },
  { key: 'app_academic_years_list', file: 'modules/exam-control/services/db.ts', purpose: 'years list', scope: 'meta' },

  // Exam Control primary datasets
  { key: 'app_school_info', file: 'modules/exam-control/services/db.ts', purpose: 'school info snapshot', scope: 'academic' },
  { key: 'app_students', file: 'modules/exam-control/services/db.ts', purpose: 'students', scope: 'academic' },
  { key: 'app_subjects', file: 'modules/exam-control/services/db.ts', purpose: 'subjects', scope: 'academic' },
  { key: 'app_grade_groups', file: 'modules/exam-control/services/db.ts', purpose: 'grade groups', scope: 'academic' },
  { key: 'app_descriptors', file: 'modules/exam-control/services/db.ts', purpose: 'grade descriptors', scope: 'academic' },
  { key: 'app_grades', file: 'modules/exam-control/services/db.ts', purpose: 'grades', scope: 'academic' },
  { key: 'app_cert_config', file: 'modules/exam-control/services/db.ts', purpose: 'certificate config', scope: 'academic' },
  { key: 'app_secret_ranges', file: 'modules/exam-control/services/db.ts', purpose: 'secret ranges', scope: 'academic' },
  { key: 'app_committees', file: 'modules/exam-control/services/db.ts', purpose: 'committees', scope: 'academic' },
  { key: 'app_committees_r2', file: 'modules/exam-control/services/db.ts', purpose: 'second role committees', scope: 'academic' },
  { key: 'app_notes', file: 'modules/exam-control/services/db.ts', purpose: 'notes', scope: 'academic' },
  { key: 'app_teachers', file: 'modules/exam-control/services/db.ts', purpose: 'teachers', scope: 'academic' },
  { key: 'app_observation_assignments', file: 'modules/exam-control/services/db.ts', purpose: 'observers assignments', scope: 'academic' },
  { key: 'app_correction_committees', file: 'modules/exam-control/services/db.ts', purpose: 'correction committees', scope: 'academic' },
  { key: 'app_users', file: 'modules/exam-control/services/db.ts', purpose: 'exam control users', scope: 'academic' },

  // Exam Control utilities
  { key: 'app_student_sort_mode', file: 'modules/exam-control/components/Students.tsx', purpose: 'student sort preference', scope: 'academic' },
  { key: 'app_auto_backup_path', file: 'modules/exam-control/components/DataBackup.tsx', purpose: 'backup path', scope: 'meta' },
  { key: 'app_auto_backup_enabled', file: 'modules/exam-control/components/DataBackup.tsx', purpose: 'auto backup toggle', scope: 'meta' },
  { key: 'app_last_auto_backup_time', file: 'modules/exam-control/components/DataBackup.tsx', purpose: 'auto backup timestamp', scope: 'meta' },

  // Licensing aux (licenseKeyStore)
  { key: 'EDULOGIC_PROGRAMMER_LICENSE_KEYS_V1', file: 'license/licenseKeyStore.ts', purpose: 'issued license keys', scope: 'license' },
  { key: 'EDULOGIC_LICENSE_LOCAL_V1', file: 'license/licenseKeyStore.ts', purpose: 'local activation', scope: 'license' },

  // Store / UID mapping
  { key: 'SCHOOL_UID_MAP_V1', file: 'store.ts', purpose: 'school UID map', scope: 'meta' },
  { key: 'EDULOGIC_ACTIVE_SCHOOL_CODE_V1', file: 'components/finance/FinancialEntries.tsx', purpose: 'active school code finance', scope: 'financial' },

  // Programmer tools / backup
  { key: 'DATA_PURGE_DIR', file: 'components/programmer/DataPurgeManager.tsx', purpose: 'purge directory', scope: 'programmer' },
  { key: 'BACKUP_DIR', file: 'components/programmer/BackupManager.tsx', purpose: 'backup directory', scope: 'programmer' },

  // Journal / accounting (used in Desktop scope)
  { key: 'JOURNAL_ENTRIES_V1', file: 'src/hooks/useJournal.ts', purpose: 'journal entries draft', scope: 'financial' }
];

if ((import.meta as any)?.env?.DEV) {
  // eslint-disable-next-line no-console
  console.info('[STORAGE][AUDIT] Loaded', STORAGE_AUDIT.length, 'keys (DEV only).');
}
