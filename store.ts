
import { useState, useEffect, useCallback, useRef } from 'react';
import { UserRole, AccountType, AuditEntry } from './types';
import { translations } from './translations';
import { loadFromStorage, loadFromStorageKey, saveToStorage, saveToStorageKey, exportDatabase, importDatabase } from './db_engine';
import { getAcademicActions } from './slices/academicLogic';
import { getMemberActions } from './slices/memberLogic';
import { getFinanceActions } from './slices/financeLogic';
import { checkDeviceAndMaybeOtp, resendOtpForSession, verifyOtpAndTrust } from './security/authGuard';
import { getSecuritySettings } from './security/securitySettings';
import { isAuthenticated } from './storageGate';
import { load as loadData, save as saveData, remove as removeData, StorageScope } from './src/storage/dataLayer';
import { setRedistributingStudentsFlag } from './services/redistributionGuard';
import { enforceLicense } from './license/licenseGuard';
import { LicenseEnforcementResult } from './license/types';
import { isDemoMode as isDemo, showDemoToast } from './src/guards/appMode';
import { demoData, DEMO_SCHOOL_CODE, DEMO_YEAR_ID } from './src/demo/demoData';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4100';
const DISABLE_LICENSE_CHECK = false;

const LANG_KEY = 'EDULOGIC_LANG_V2';
const YEAR_KEY = 'EDULOGIC_WORKING_YEAR_V2';
const SCHOOL_CODE_KEY = 'EDULOGIC_ACTIVE_SCHOOL_CODE_V1';
const USER_ID_KEY = 'EDULOGIC_ACTIVE_USER_ID_V1';
const PROGRAMMER_USER_KEY = 'EDULOGIC_PROGRAMMER_USER_V1';
const PROGRAMMER_CONTEXT_KEY = 'EDULOGIC_PROGRAMMER_CONTEXT_V1';
const PROGRAMMER_CODE = 'PROGRAMMER';
const STORAGE_KEYS = {
  accounts: 'SCHOOL_ERP_ACCOUNTS',
  receipts: 'SCHOOL_ERP_RECEIPTS',
  banks: 'SCHOOL_ERP_BANKS',
  suppliers: 'SCHOOL_ERP_SUPPLIERS',
  journalEntries: 'SCHOOL_ERP_JOURNAL',
  feeStructure: 'SCHOOL_ERP_FEE_STRUCTURE'
};

const normalizeSchoolCode = (value: string) => value.trim().toUpperCase();
const defaultSchoolModules = () => SYSTEM_MODULES.filter((m) => m.id !== 'programmer').map((m) => m.id);
const readSetting = <T>(key: string, fallback: T, namespace?: string) =>
  loadData(StorageScope.SETTINGS, key, fallback, namespace);
const writeSetting = (key: string, value: unknown, namespace?: string) =>
  saveData(StorageScope.SETTINGS, key, value, namespace);
const removeSetting = (key: string, namespace?: string) =>
  removeData(StorageScope.SETTINGS, key, namespace);

const STUDENT_NUM_BUDGET_REPORT = {
  Report_ID: 'STU-RPT-NUM-BUDGET',
  Title_Ar: 'ميزانية عددية للطلاب',
  Title_En: 'Student Numerical Budget',
  Allowed_Roles: [
    UserRole.ADMIN,
    UserRole.REGISTRAR,
    UserRole.ACCOUNTANT,
    UserRole.HR_MANAGER,
    UserRole.TEACHER,
    UserRole.WORKER
  ]
};

const STUDENT_FIRST_GRADE_REPORT = {
  Report_ID: 'STU-RPT-FIRST-GRADES',
  Title_Ar: 'كشف تنسيق الطلاب للصفوف الأولى',
  Title_En: 'First Grade Placement Report',
  Allowed_Roles: [
    UserRole.ADMIN,
    UserRole.REGISTRAR,
    UserRole.ACCOUNTANT,
    UserRole.HR_MANAGER,
    UserRole.TEACHER,
    UserRole.WORKER
  ]
};

const FIN_AR_SUMMARY_REPORT = {
  Report_ID: 'FIN-RPT-AR-SUMMARY',
  Title_Ar: 'تقرير إجمالي المطلوب تحصيله',
  Title_En: 'Accounts Receivable Summary',
  Allowed_Roles: [UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.REGISTRAR]
};

const EXAM_CONTROL_REPORTS = [
  {
    Report_ID: 'EXM-RPT-SHEET',
    Title_Ar: 'شيت الدرجات',
    Title_En: 'Exam Score Sheet',
    Allowed_Roles: [
      UserRole.ADMIN,
      UserRole.REGISTRAR,
      UserRole.TEACHER
    ]
  },
  {
    Report_ID: 'EXM-RPT-CERT',
    Title_Ar: 'الشهادات',
    Title_En: 'Certificates',
    Allowed_Roles: [
      UserRole.ADMIN,
      UserRole.REGISTRAR,
      UserRole.TEACHER
    ]
  },
  {
    Report_ID: 'EXM-RPT-TOP',
    Title_Ar: 'الأوائل',
    Title_En: 'Top Students',
    Allowed_Roles: [
      UserRole.ADMIN,
      UserRole.REGISTRAR,
      UserRole.TEACHER
    ]
  },
  {
    Report_ID: 'EXM-RPT-FAIL',
    Title_Ar: 'راسبون/دور ثاني',
    Title_En: 'Failure Report',
    Allowed_Roles: [
      UserRole.ADMIN,
      UserRole.REGISTRAR,
      UserRole.TEACHER
    ]
  },
  {
    Report_ID: 'EXM-RPT-STAT',
    Title_Ar: 'إحصائيات المواد',
    Title_En: 'Subject Statistics',
    Allowed_Roles: [
      UserRole.ADMIN,
      UserRole.REGISTRAR,
      UserRole.TEACHER
    ]
  },
  {
    Report_ID: 'EXM-RPT-STATEMENT',
    Title_Ar: 'بيان درجات طالب',
    Title_En: 'Student Statement',
    Allowed_Roles: [
      UserRole.ADMIN,
      UserRole.REGISTRAR,
      UserRole.TEACHER
    ]
  },
  {
    Report_ID: 'EXM-RPT-OFFICIAL',
    Title_Ar: 'مطبوعات رسمية',
    Title_En: 'Official Papers',
    Allowed_Roles: [
      UserRole.ADMIN,
      UserRole.REGISTRAR
    ]
  }
];

const ensureStudentReports = (reportConfigs: any[]) => {
  const requiredReports = [STUDENT_NUM_BUDGET_REPORT, STUDENT_FIRST_GRADE_REPORT];
  const updated = (reportConfigs || []).map((config: any) => {
    if (config.Category_ID !== 'students') return config;
    const reports = config.Available_Reports || [];
    const merged = requiredReports.reduce((acc, report) => {
      if (acc.some((item: any) => item.Report_ID === report.Report_ID)) return acc;
      return [...acc, report];
    }, reports);
    return { ...config, Available_Reports: merged };
  });
  const hasStudentsConfig = updated.some((config: any) => config.Category_ID === 'students');
  if (hasStudentsConfig) return updated;
  return [
    ...updated,
    {
      Category_ID: 'students',
      Category_Name_Ar: 'الطلاب',
      Category_Name_En: 'Students',
      Signature_Chain: [],
      Available_Reports: [...requiredReports]
    }
  ];
};

const ensureFinanceReports = (reportConfigs: any[]) => {
  const requiredReports = [FIN_AR_SUMMARY_REPORT];
  const updated = (reportConfigs || []).map((config: any) => {
    if (config.Category_ID !== 'finance') return config;
    const reports = config.Available_Reports || [];
    const merged = requiredReports.reduce((acc, report) => {
      if (acc.some((item: any) => item.Report_ID === report.Report_ID)) return acc;
      return [...acc, report];
    }, reports);
    return { ...config, Available_Reports: merged };
  });
  const hasFinanceConfig = updated.some((config: any) => config.Category_ID === 'finance');
  if (hasFinanceConfig) return updated;
  return [
    ...updated,
    {
      Category_ID: 'finance',
      Category_Name_Ar: 'المالية',
      Category_Name_En: 'Finance',
      Signature_Chain: [],
      Available_Reports: [...requiredReports]
    }
  ];
};

const ensureExamControlReports = (reportConfigs: any[]) => {
  const requiredReports = EXAM_CONTROL_REPORTS;
  const updated = (reportConfigs || []).map((config: any) => {
    if (config.Category_ID !== 'examControl') return config;
    const reports = config.Available_Reports || [];
    const merged = requiredReports.reduce((acc, report) => {
      if (acc.some((item: any) => item.Report_ID === report.Report_ID)) return acc;
      return [...acc, report];
    }, reports);
    return { ...config, Available_Reports: merged };
  });
  const hasExamConfig = updated.some((config: any) => config.Category_ID === 'examControl');
  if (hasExamConfig) return updated;
  return [
    ...updated,
    {
      Category_ID: 'examControl',
      Category_Name_Ar: 'كنترول الامتحانات',
      Category_Name_En: 'Exam Control',
      Signature_Chain: [],
      Available_Reports: [...requiredReports]
    }
  ];
};

const getItemYearId = (item: { Academic_Year_ID?: string; Year_ID?: string } | null | undefined) =>
  item?.Academic_Year_ID || item?.Year_ID || '';

const ensureAcademicYearIds = (db: any, fallbackYearId: string) => {
  const resolvedYearId = fallbackYearId || '';
  const legacyStages = db.schools?.[0]?.Stages_Available || [];
  const stagesSource = (db.stages && db.stages.length > 0) ? db.stages : legacyStages;

  const stages = (stagesSource || []).map((stage: any) => ({
    ...stage,
    Academic_Year_ID: stage.Academic_Year_ID || resolvedYearId
  }));

  const grades = (db.grades || []).map((grade: any) => ({
    ...grade,
    Academic_Year_ID: grade.Academic_Year_ID || resolvedYearId
  }));

  const classes = (db.classes || []).map((klass: any) => ({
    ...klass,
    Academic_Year_ID: klass.Academic_Year_ID || klass.Year_ID || resolvedYearId
  }));

  const classYearById = new Map(classes.map((klass: any) => [klass.Class_ID, klass.Academic_Year_ID]));

  const students = (db.students || []).map((student: any) => ({
    ...student,
    Academic_Year_ID: student.Academic_Year_ID || classYearById.get(student.Class_ID) || resolvedYearId
  }));

  const feeItems = (db.feeItems || []).map((item: any) => ({
    ...item,
    Academic_Year_ID: item.Academic_Year_ID || resolvedYearId
  }));

  const feeStructure = (db.feeStructure || []).map((structure: any) => ({
    ...structure,
    Academic_Year_ID: structure.Academic_Year_ID || structure.Year_ID || resolvedYearId
  }));

  const receipts = (db.receipts || []).map((receipt: any) => ({
    ...receipt,
    Academic_Year_ID: receipt.Academic_Year_ID || resolvedYearId
  }));

  const journalEntries = (db.journalEntries || []).map((entry: any) => ({
    ...entry,
    Academic_Year_ID: entry.Academic_Year_ID || resolvedYearId
  }));

  return {
    ...db,
    stages,
    grades,
    classes,
    students,
    feeItems,
    feeStructure,
    receipts,
    journalEntries
  };
};

export const SYSTEM_MODULES = [
  { id: 'dashboard', icon: 'LayoutDashboard', labelKey: 'moduleDashboard', descKey: 'overview' },
  { id: 'academic', icon: 'BookOpen', labelKey: 'moduleAcademic', descKey: 'structure' },
  { id: 'members', icon: 'Users', labelKey: 'moduleMembers', descKey: 'membersDesc' },
  { id: 'students', icon: 'GraduationCap', labelKey: 'moduleStudents', descKey: 'affairs' },
  { id: 'examControl', icon: 'ClipboardCheck', labelKey: 'moduleExamControl', descKey: 'examControlDesc' },
  { id: 'staff', icon: 'Briefcase', labelKey: 'staff', descKey: 'staffDesc' },
  { id: 'finance', icon: 'Wallet', labelKey: 'finance', descKey: 'accounting' },
  { id: 'communications', icon: 'MessageCircle', labelKey: 'moduleCommunications', descKey: 'communicationsDesc' },
  { id: 'stores', icon: 'Package', labelKey: 'stores', descKey: 'storesDesc' },
  { id: 'programmer', icon: 'Wand2', labelKey: 'moduleProgrammer', descKey: 'programmerDesc' },
];

export const INITIAL_STATE = {
  schools: [],
  years: [],
  jobTitles: [],
  stages: [],
  grades: [],
  classes: [],
  students: [],
  parents: [],
  employees: [],
  receipts: [],
  journalEntries: [],
  feeItems: [],
  accounts: [],
  banks: [],
  suppliers: [],
  rules: [],
  feeStructure: [],
  users: [],
  auditLogs: [],
  reportConfigs: []
};

export const useStore = () => {
  const demoMode = isDemo();
  const [lang, setLang] = useState<'ar' | 'en'>(() => demoMode ? 'ar' : readSetting(LANG_KEY, 'ar'));
  const [schoolCode, setSchoolCode] = useState(() => demoMode ? DEMO_SCHOOL_CODE : readSetting(SCHOOL_CODE_KEY, ''));
  const [programmerContext, setProgrammerContext] = useState(() => demoMode ? '' : readSetting(PROGRAMMER_CONTEXT_KEY, ''));

const getYearKey = (code: string) => `${YEAR_KEY}__${code}`;
const getUserKey = (code: string) => `${USER_ID_KEY}__${code}`;
const UID_MAP_KEY = 'SCHOOL_UID_MAP_V1';

const readUidMap = (): Record<string, string> => {
  if (demoMode) return {};
  try {
    const raw = localStorage.getItem(UID_MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const appendUidMap = (code: string, uid: string) => {
  if (demoMode) return;
  if (!code || !uid) return;
  const map = readUidMap();
  if (map[code]) return;
  map[code] = uid;
  try {
    localStorage.setItem(UID_MAP_KEY, JSON.stringify(map));
  } catch {
    // ignore write failures to keep read-only behavior
  }
};

const generateUid = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as any).randomUUID();
  }
  return `sch-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
};

function seedProgrammerSnapshotIfMissing() {
  if (demoMode) return;
  const PROGRAMMER_CODE = 'PROGRAMMER';
  const STORAGE_KEY = `EDULOGIC_ULTRA_PERSISTENT_DB__${PROGRAMMER_CODE}`;

  if (localStorage.getItem(STORAGE_KEY)) return;

  const snapshot = {
    schools: [
      {
        School_ID: 'PRG-SYSTEM',
        Name: 'Programmer Context',
        School_Code: PROGRAMMER_CODE,
        school_uid: 'programmer-system-uid',
        Allowed_Modules: []
      }
    ],
    users: [
      {
        User_ID: 'PRG-DEV',
        Username: 'admin',
        Role: 'ADMIN',
        Is_Active: true,
        Permissions: ['programmer']
      }
    ],
    years: []
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));

  console.info('[PROGRAMMER] Seeded system programmer snapshot');
}

const ensureSchoolUidBinding = (dbSnapshot: any, scopedCode: string): { ok: boolean; db?: any; uid?: string; error?: string } => {
  if (!dbSnapshot?.schools?.length) {
    return { ok: false, error: 'NO_SCHOOL' };
  }
  const map = readUidMap();
  const snapshotUid = dbSnapshot.schools[0].school_uid;
  const mappedUid = map[scopedCode];

  // existing mismatch (real conflict)
  if (mappedUid && snapshotUid && mappedUid !== snapshotUid) {
    return { ok: false, error: 'MISMATCH' };
  }

  let uid = mappedUid || snapshotUid;
  const nextDb = { ...dbSnapshot, schools: [{ ...dbSnapshot.schools[0] }] };

  // if no UID yet, generate and assign
  if (!uid) {
    uid = generateUid();
    nextDb.schools[0].school_uid = uid;
  } else if (!nextDb.schools[0].school_uid) {
    nextDb.schools[0].school_uid = uid;
  }

  // ensure mapping exists
  if (demoMode) {
    return { ok: true, db: nextDb, uid };
  }
  if (uid && map[scopedCode] !== uid) {
    try {
      localStorage.setItem(UID_MAP_KEY, JSON.stringify({ ...map, [scopedCode]: uid }));
    } catch {
      // ignore
    }
  }

  return { ok: true, db: nextDb, uid };
};

const warnIdentityInconsistencies = (code: string, snapshot: any, uidMap: Record<string, string>) => {
  if (!code) return;
  const normalizedCode = normalizeSchoolCode(code);
  const existingUid = uidMap[normalizedCode];
  const snapshotUid = snapshot?.schools?.[0]?.school_uid;

  // 1) single code → multiple UIDs (detected when snapshotUid differs from mapping)
  if (existingUid && snapshotUid && existingUid !== snapshotUid) {
    console.warn('[SCHOOLS][WARN] Code mapped to multiple UIDs', { code: normalizedCode, mapUid: existingUid, snapshotUid });
  }

  // 2) snapshot missing UID
  if (!snapshotUid) {
    console.warn('[SCHOOLS][WARN] Snapshot missing school_uid', { code: normalizedCode });
  }

  // 3) storage keys without mapping (detected if snapshot exists but map lacks entry)
  if (snapshot?.schools?.length && !uidMap[normalizedCode]) {
    console.warn('[SCHOOLS][WARN] Storage exists for code without UID mapping', { code: normalizedCode });
  }
};

const describeLicenseError = (result: LicenseEnforcementResult | null, lang: 'ar' | 'en') => {
  if (!result || result.allowed) return '';
  const reason = result.reason || result.status;
  const isAr = lang === 'ar';
  switch (reason) {
    case 'expired':
      return isAr ? 'انتهت صلاحية الترخيص' : 'License expired';
    case 'bad_signature':
      return isAr ? 'الترخيص غير موثوق (توقيع غير صالح)' : 'License signature invalid';
    case 'corrupt_license':
      return isAr ? 'ملف الترخيص تالف أو غير قابل للقراءة' : 'Stored license is corrupted';
    case 'hwid_mismatch':
      return isAr ? 'تم حظر الوصول: الجهاز غير مطابق للترخيص' : 'Access blocked: device does not match license';
    case 'clock_tamper':
      return isAr ? 'تم اكتشاف تلاعب بتاريخ الجهاز' : 'System clock tampering detected';
    case 'school_mismatch':
      return isAr ? 'هذا الترخيص غير مرتبط بهذه المدرسة' : 'License is not bound to this school';
    case 'trial_creation_failed':
      return isAr ? 'تعذر إنشاء نسخة تجريبية على هذا الجهاز' : 'Could not issue a trial on this device';
    case 'missing_license':
      return isAr ? 'لا يوجد ترخيص صالح، برجاء التفعيل' : 'No valid license found, activation required';
    default:
      return isAr ? 'الترخيص غير صالح أو محظور' : 'License invalid or blocked';
  }
};

  const safeEnforceLicense = (options: Parameters<typeof enforceLicense>[0]) => {
    if (demoMode) {
      return { allowed: true, status: 'valid', reason: 'demo_mode', bypassed: true } as LicenseEnforcementResult;
    }
    if (DISABLE_LICENSE_CHECK) {
      return { allowed: true, status: 'valid', reason: 'license_check_disabled' } as LicenseEnforcementResult;
    }
    if (!options?.expectedSchoolUid) {
      return { allowed: true, status: 'missing', reason: 'missing_school_uid' } as LicenseEnforcementResult;
    }
    console.info('[LICENSE] enforcing for UID:', options.expectedSchoolUid);
    try {
      return enforceLicense(options);
    } catch (err) {
      console.error('[LICENSE][ERROR]', err);
      return { allowed: false, status: 'error', reason: 'runtime_error' } as LicenseEnforcementResult;
    }
  };

  const loadDbForSchool = (code: string) => {
    const scopedCode = normalizeSchoolCode(code || 'DEFAULT');
    const uidMap = readUidMap();
    let base = loadFromStorage(INITIAL_STATE, scopedCode);
    warnIdentityInconsistencies(scopedCode, base, uidMap);
    if (!base?.schools?.length) {
      const legacy = loadFromStorage(INITIAL_STATE);
      const legacySchoolCode = legacy?.schools?.[0]?.School_Code
        ? normalizeSchoolCode(legacy.schools[0].School_Code)
        : '';
      if (legacy?.schools?.length && legacySchoolCode === scopedCode) {
        base = legacy;
        saveToStorage(base, scopedCode);
      }
    }

    const defaultModules = scopedCode === PROGRAMMER_CODE ? [] : defaultSchoolModules();

    if (base?.schools?.length) {
      const currentCode = normalizeSchoolCode(base.schools[0].School_Code || '');
      const sameScope = currentCode === scopedCode;
      const school = sameScope ? base.schools[0] : { ...base.schools[0], School_Code: scopedCode, Allowed_Modules: defaultModules };
      const existingUid = school.school_uid || uidMap[scopedCode];
      const ensuredUid = existingUid || generateUid();
      appendUidMap(scopedCode, ensuredUid);
      base = {
        ...base,
        schools: [{
          ...school,
          School_Code: school.School_Code || scopedCode,
          Allowed_Modules: school.Allowed_Modules || defaultModules,
          school_uid: ensuredUid
        }]
      };
    } else {
      console.warn('[SCHOOLS] No school found for code, auto-provision disabled.', scopedCode);
      base = {
        ...(base || INITIAL_STATE),
        schools: []
      };
    }

    const yearId = readSetting<string | null>(getYearKey(scopedCode), null)
      || base.years.find((y: any) => y.Is_Active)?.Year_ID
      || base.years?.[0]?.Year_ID
      || '';

    const hydrated = {
      ...base,
      accounts: loadFromStorageKey(STORAGE_KEYS.accounts, base.accounts || [], scopedCode),
      receipts: loadFromStorageKey(STORAGE_KEYS.receipts, base.receipts || [], scopedCode),
      banks: loadFromStorageKey(STORAGE_KEYS.banks, base.banks || [], scopedCode),
      suppliers: loadFromStorageKey(STORAGE_KEYS.suppliers, base.suppliers || [], scopedCode),
      journalEntries: loadFromStorageKey(STORAGE_KEYS.journalEntries, base.journalEntries || [], scopedCode),
      feeStructure: loadFromStorageKey(STORAGE_KEYS.feeStructure, base.feeStructure || [], scopedCode)
    };

    const withReports = {
      ...hydrated,
      reportConfigs: ensureExamControlReports(ensureFinanceReports(ensureStudentReports(hydrated.reportConfigs || [])))
    };

    return {
      db: ensureAcademicYearIds(withReports, yearId),
      yearId,
      scopedCode
    };
  };

  const [db, setDb] = useState(INITIAL_STATE);
  const [isSaved, setIsSaved] = useState(true);
  const [isRedistributingStudents, setIsRedistributingStudents] = useState(false);
  const [workingYearId, setWorkingYearId] = useState<string>('');
  const [activeSchoolCode, setActiveSchoolCode] = useState('');
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [pendingOtp, setPendingOtp] = useState<any | null>(null);
  const [hrSyncEnabled, setHrSyncEnabled] = useState(false);
  const [financeSyncEnabled, setFinanceSyncEnabled] = useState(false);
  const [storageEnabled, setStorageEnabled] = useState(false);
  const [licenseGate, setLicenseGate] = useState<LicenseEnforcementResult | null>(null);
  const [licenseChecked, setLicenseChecked] = useState(false);

  useEffect(() => {
    if (demoMode) {
      if (!db.schools.length) {
        const yearId = DEMO_YEAR_ID || demoData.years.find((y: any) => y.Is_Active)?.Year_ID || demoData.years?.[0]?.Year_ID || '';
        const hydrated = ensureAcademicYearIds(demoData, yearId);
        setDb(hydrated);
        setWorkingYearId(yearId);
        setActiveSchoolCode(DEMO_SCHOOL_CODE);
        setSchoolCode(DEMO_SCHOOL_CODE);
        setStorageEnabled(false);
        setIsSaved(true);
        setPendingOtp(null);
      }
      return;
    }
    try {
      const savedCode = readSetting(SCHOOL_CODE_KEY, '');
      if (!savedCode) return;

      const scopedCode = normalizeSchoolCode(savedCode);
      const { db: loadedDb, yearId } = loadDbForSchool(scopedCode);
      const ensured = ensureSchoolUidBinding(loadedDb, scopedCode);
      if (!ensured.ok) return;

      setDb(ensured.db);
      setWorkingYearId(yearId);
      setActiveSchoolCode(scopedCode);

      const userId = readSetting<string | null>(getUserKey(scopedCode), null);
      if (userId) {
        const user = ensured.db.users?.find((u: any) => u.User_ID === userId) || null;
        setCurrentUser(user);
      }
    } catch (e) {
      console.error('[BOOTSTRAP][FATAL]', e);
    }
  }, [demoMode]);

  const resetStoreStateForSchoolSwitch = () => {
    setDb(INITIAL_STATE);
    setWorkingYearId('');
    setActiveSchoolCode('');
    setCurrentUser(null);
    setPendingOtp(null);
    setProgrammerContext('');
    setIsRedistributingStudents(false);
    setLicenseGate(null);
    setLicenseChecked(false);
    setRedistributingStudentsFlag(false);
  };

  const rebindCurrentSchoolToUID = () => {
    if (demoMode) return false;
    if (!activeSchoolCode || !db?.schools?.[0]) {
      console.warn('[SCHOOLS][REBIND] Missing active school or DB');
      return false;
    }
    const scopedCode = normalizeSchoolCode(activeSchoolCode);
    const uid = readUidMap()[scopedCode];
    const snapshotUid = db.schools[0].school_uid;
    if (!uid) {
      console.warn('[SCHOOLS][REBIND] No UID mapping for code', scopedCode);
      return false;
    }
    if (!snapshotUid) {
      console.warn('[SCHOOLS][REBIND] Snapshot missing school_uid', scopedCode);
      return false;
    }
    if (snapshotUid !== uid) {
      console.warn('[SCHOOLS][REBIND] UID mismatch; aborting', { code: scopedCode, uid, snapshotUid });
      return false;
    }
    const saved = saveToStorage(db, uid);
    if (saved) {
      console.info('[SCHOOLS][REBIND] School data rebound to UID', { code: scopedCode, uid });
      const { db: reloaded, yearId, scopedCode: resolved } = loadDbForSchool(scopedCode);
      setDb(reloaded);
      setWorkingYearId(yearId);
      setActiveSchoolCode(resolved);
      const userId = readSetting<string | null>(getUserKey(resolved), null);
      setCurrentUser(userId ? reloaded.users?.find((u: any) => u.User_ID === userId) || null : null);
      return true;
    }
    return false;
  };

const rebindSchoolUID = (schoolCode: string, targetUID: string) => {
    if (demoMode) return false;
    if (!programmerMode) {
      console.warn('[SCHOOLS][REBIND] Programmer mode required');
      return false;
    }
    resetStoreStateForSchoolSwitch();
    const scopedCode = normalizeSchoolCode(schoolCode);
    if (!scopedCode || !targetUID) {
      console.warn('[SCHOOLS][REBIND] Invalid code or UID');
      return false;
    }
    const uidMap = readUidMap();
    const uidData = loadFromStorage(INITIAL_STATE, targetUID);
    if (!uidData?.schools?.length) {
      console.warn('[SCHOOLS][REBIND] Target UID has no direct data; proceeding with mapping only', { uid: targetUID });
    }
    const nextMap = { ...uidMap, [scopedCode]: targetUID };
    try {
      localStorage.setItem('SCHOOL_UID_MAP_V1', JSON.stringify(nextMap));
      console.info('[SCHOOLS][REBIND] schoolCode rebound to UID', { code: scopedCode, uid: targetUID });
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (demoMode) {
      setStorageEnabled(false);
      return;
    }
    const allowedByLicense = !licenseGate || licenseGate.allowed || licenseGate.bypassed;
    setStorageEnabled(isAuthenticated(currentUser, activeSchoolCode) && allowedByLicense);
  }, [currentUser, activeSchoolCode, licenseGate, demoMode]);

  // ميزة الحفظ التلقائي مع مؤشر بصري
  useEffect(() => {
    if (!storageEnabled || demoMode) return;
    setIsSaved(false);
    if (saveToStorage(db, activeSchoolCode)) setIsSaved(true);
  }, [db, activeSchoolCode, storageEnabled, demoMode]);

  useEffect(() => {
    if (!storageEnabled || demoMode) return;
    saveToStorageKey(STORAGE_KEYS.accounts, db.accounts || [], activeSchoolCode);
    saveToStorageKey(STORAGE_KEYS.receipts, db.receipts || [], activeSchoolCode);
    saveToStorageKey(STORAGE_KEYS.banks, db.banks || [], activeSchoolCode);
    saveToStorageKey(STORAGE_KEYS.suppliers, db.suppliers || [], activeSchoolCode);
    saveToStorageKey(STORAGE_KEYS.journalEntries, db.journalEntries || [], activeSchoolCode);
    saveToStorageKey(STORAGE_KEYS.feeStructure, db.feeStructure || [], activeSchoolCode);
  }, [db.accounts, db.receipts, db.banks, db.suppliers, db.journalEntries, db.feeStructure, activeSchoolCode, storageEnabled, demoMode]);

  useEffect(() => {
    if (demoMode) return;
    const hmr = (import.meta as ImportMeta & { hot?: { dispose: (cb: () => void) => void } }).hot;
    if (!hmr) return;
    hmr.dispose(() => {
      saveToStorage(db);
      saveToStorageKey(STORAGE_KEYS.accounts, db.accounts || []);
      saveToStorageKey(STORAGE_KEYS.receipts, db.receipts || []);
      saveToStorageKey(STORAGE_KEYS.banks, db.banks || []);
      saveToStorageKey(STORAGE_KEYS.suppliers, db.suppliers || []);
      saveToStorageKey(STORAGE_KEYS.journalEntries, db.journalEntries || []);
      saveToStorageKey(STORAGE_KEYS.feeStructure, db.feeStructure || []);
    });
  }, [db]);


  // الحفظ عند إغلاق التبويب
  useEffect(() => {
    if (!storageEnabled || demoMode) return;
    const handleUnload = () => saveToStorage(db, activeSchoolCode);
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [db, activeSchoolCode, storageEnabled, demoMode]);

  // مزامنة بيانات الموظفين مع الباك-إند
  useEffect(() => {
    if (!activeSchoolCode || !storageEnabled || !hrSyncEnabled || demoMode) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/employees/${encodeURIComponent(activeSchoolCode)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setDb((prev) => ({ ...prev, employees: data }));
        }
      } catch (err) {
        console.warn('[API][WARN] employees fetch failed; using local copy.', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSchoolCode, storageEnabled, hrSyncEnabled]);

  useEffect(() => {
    if (!activeSchoolCode || !storageEnabled || !hrSyncEnabled || demoMode) return;
    (async () => {
      try {
        await fetch(`${API_BASE}/employees/${encodeURIComponent(activeSchoolCode)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(db.employees || [])
        });
      } catch (err) {
        console.warn('[API][WARN] employees persist failed.', err);
      }
    })();
  }, [db.employees, activeSchoolCode, storageEnabled, hrSyncEnabled]);

  useEffect(() => {
    if (!demoMode) {
      writeSetting(LANG_KEY, lang);
    }
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang, demoMode]);

  useEffect(() => {
    if (demoMode) return;
    if (workingYearId) writeSetting(getYearKey(activeSchoolCode), workingYearId);
  }, [workingYearId, activeSchoolCode, demoMode]);

  useEffect(() => {
    const list = db.years || [];
    if (!list.length) return;
    const active = list.find((y: any) => y.Is_Active) || list[0];
    const hasWorking = workingYearId && list.some((y: any) => y.Year_ID === workingYearId);
    if (!hasWorking && active?.Year_ID) {
      setWorkingYearId(active.Year_ID);
    }
  }, [db.years, activeSchoolCode, workingYearId]);

  const t = translations[lang];
  const activeSchool = db.schools[0];
  const activeSchoolUid = activeSchool?.school_uid;
  const programmerMode = !!programmerContext && activeSchoolCode !== PROGRAMMER_CODE;
  const isProgrammer = !!currentUser && (
    currentUser.Username === 'dev_owner' || currentUser.Permissions?.includes('programmer')
  );
  const isSubscriptionExpired = (() => {
    if (!activeSchool?.Subscription_End) return false;
    const end = new Date(activeSchool.Subscription_End);
    if (Number.isNaN(end.getTime())) return false;
    const now = new Date();
    return end < new Date(now.getFullYear(), now.getMonth(), now.getDate());
  })();
  const isReadOnly = isSubscriptionExpired && !isProgrammer;
  const userPermissions = Array.isArray(currentUser?.Permissions) ? currentUser.Permissions.filter(Boolean) : [];
  // لا نقيّد المبرمج بصلاحيات المستخدم حتى لا يتأثر نطاق الوصول الخاص به.
  const hasUserModuleScope = !isProgrammer && userPermissions.length > 0;
  const allowedModules = programmerMode
    ? SYSTEM_MODULES.filter((m) => m.id !== 'programmer').map((m) => m.id)
    : (activeSchool?.Allowed_Modules?.length
      ? activeSchool.Allowed_Modules
      : defaultSchoolModules());
  const scopedModules = isProgrammer
    ? allowedModules
    : hasUserModuleScope
      // المستخدم يرى فقط التقاطعات بين صلاحيات المدرسة وصلاحياته الشخصية (مع إبقاء لوحة التحكم دائماً).
      ? allowedModules.filter((id) => id === 'dashboard' || userPermissions.includes(id))
      : allowedModules;
  const availableModules = [
    ...SYSTEM_MODULES.filter((m) => m.id !== 'programmer' && scopedModules.includes(m.id)),
    ...(
      (isProgrammer && !programmerMode)
        ? SYSTEM_MODULES.filter((m) => m.id === 'programmer')
    : []
    )
  ].filter((m) => (demoMode ? m.id !== 'programmer' : true));

  useEffect(() => {
    if (demoMode) {
      setLicenseGate({ allowed: true, status: 'valid', reason: 'demo_mode', bypassed: true } as LicenseEnforcementResult);
      setLicenseChecked(true);
      return;
    }
    if (!activeSchoolUid || licenseChecked) return;
    const guard = safeEnforceLicense({
      expectedSchoolUid: activeSchoolUid,
      allowTrialFallback: true,
      programmerBypass: programmerMode
    });
    setLicenseGate(guard);
    setLicenseChecked(true);
    if (currentUser && !guard.allowed) {
      setCurrentUser(null);
      setStorageEnabled(false);
    }
  }, [activeSchoolUid, programmerMode, licenseChecked, demoMode]);

  const activeYear = db.years.find((y: any) => y.Year_ID === workingYearId);

  const allStages = db.stages || [];
  const allGrades = db.grades || [];
  const allClasses = db.classes || [];
  const allStudents = db.students || [];
  const allFeeItems = db.feeItems || [];
  const allFeeStructure = db.feeStructure || [];
  const allReceipts = db.receipts || [];
  const allJournalEntries = db.journalEntries || [];

  const stages = allStages.filter((stage: any) => getItemYearId(stage) === workingYearId);
  const grades = allGrades.filter((grade: any) => getItemYearId(grade) === workingYearId);
  const classes = allClasses.filter((klass: any) => getItemYearId(klass) === workingYearId);
  const students = allStudents.filter((student: any) => getItemYearId(student) === workingYearId);
  const feeItems = allFeeItems.filter((item: any) => getItemYearId(item) === workingYearId);
  const feeStructure = allFeeStructure.filter((structure: any) => getItemYearId(structure) === workingYearId);
  const receipts = allReceipts.filter((receipt: any) => getItemYearId(receipt) === workingYearId);
  const journalEntries = allJournalEntries.filter((entry: any) => getItemYearId(entry) === workingYearId);

  const logAction = (data: any) => {
    const newLog: AuditEntry = {
      Log_ID: `LOG-${Date.now()}`,
      Timestamp: new Date().toLocaleString('sv-SE').slice(0, 16),
      User_ID: currentUser?.User_ID || 'SYSTEM',
      Username: currentUser?.Username || 'SYSTEM',
      IP_Address: '127.0.0.1',
      Page_Name_En: '', Action_En: '', Details: '',
      ...data
    };
    setDb((prev: any) => ({ ...prev, auditLogs: [newLog, ...(prev.auditLogs || [])].slice(0, 500) }));
  };

  const guardedSetDb = (updater: any) => {
    if (isReadOnly) {
      alert(lang === 'ar' ? 'انتهى الاشتراك: الوضع الآن قراءة فقط.' : 'Subscription expired: read-only mode.');
      return;
    }
    setDb(updater);
  };

  const syncRedistributionFlag = (value: boolean) => {
    setIsRedistributingStudents(value);
    setRedistributingStudentsFlag(value);
  };

  const academicActions = getAcademicActions(
    guardedSetDb,
    activeSchool,
    logAction,
    () => workingYearId,
    () => db,
    syncRedistributionFlag
  );
  const memberActions = getMemberActions(guardedSetDb, activeSchool, logAction, () => workingYearId);
  const financeActions = getFinanceActions(guardedSetDb, logAction, () => workingYearId);

  const guardDestructive = <T extends (...args: any[]) => any>(fn: T | undefined, returnValue: any = false) => {
    if (!fn) return fn;
    if (!demoMode) return fn;
    return ((..._args: any[]) => {
      showDemoToast(lang === 'ar' ? 'هذه نسخة Demo – الرجاء التواصل للشراء' : 'Demo version – contact us to purchase');
      console.info('[DEMO] Destructive action blocked');
      return returnValue;
    }) as T;
  };

  const hydrateDemoSnapshot = () => {
    const yearId = DEMO_YEAR_ID || demoData.years.find((y: any) => y.Is_Active)?.Year_ID || demoData.years?.[0]?.Year_ID || '';
    const hydrated = ensureAcademicYearIds(demoData, yearId);
    setDb(hydrated);
    setWorkingYearId(yearId);
    setActiveSchoolCode(DEMO_SCHOOL_CODE);
    setStorageEnabled(false);
    setIsSaved(true);
    setLicenseGate({ allowed: true, status: 'valid', reason: 'demo_mode', bypassed: true } as LicenseEnforcementResult);
    return hydrated;
  };

  const loginAsDemoSchool = () => {
    const hydrated = hydrateDemoSnapshot();
    const demoUser = hydrated.users?.[0] || null;
    setCurrentUser(demoUser);
    setPendingOtp(null);
    setProgrammerContext('');
    return { ok: true };
  };

  const switchSchool = (code: string) => {
    if (demoMode) {
      alert(lang === 'ar' ? 'متاح في النسخة الكاملة فقط' : 'Available in the full version only');
      return;
    }
    resetStoreStateForSchoolSwitch();
    const scopedCode = normalizeSchoolCode(code);
    const { db: nextDb, yearId, scopedCode: resolved } = loadDbForSchool(scopedCode);
    const ensured = ensureSchoolUidBinding(nextDb, scopedCode);
    if (!ensured.ok) {
      console.error('[SCHOOLS] UID mismatch, aborting bind', { code: scopedCode });
      return;
    }
    setDb(ensured.db);
    setWorkingYearId(yearId);
    setActiveSchoolCode(resolved);
    writeSetting(SCHOOL_CODE_KEY, resolved);
    const userId = readSetting<string | null>(getUserKey(resolved), null);
    setCurrentUser(userId ? ensured.db?.users?.find((u: any) => u.User_ID === userId) || null : null);
  };

  const login = (code: string, username: string, password: string) => {
    if (demoMode) {
      return loginAsDemoSchool();
    }
    resetStoreStateForSchoolSwitch();
    const scopedCode = normalizeSchoolCode(code);
    const { db: nextDb, yearId } = loadDbForSchool(scopedCode);
    const ensured = ensureSchoolUidBinding(nextDb, scopedCode);
    if (!ensured.ok) {
      console.error('[SCHOOLS] UID mismatch, aborting bind', { code: scopedCode });
      return { ok: false, error: lang === 'ar' ? 'فشل تحميل المدرسة' : 'Failed to load school' };
    }
    if (!ensured.db?.schools?.length) {
      return { ok: false, error: lang === 'ar' ? 'لا توجد مدرسة مسجلة لهذا الكود' : 'No school registered for this code' };
    }
    setActiveSchoolCode(scopedCode);
    writeSetting(SCHOOL_CODE_KEY, scopedCode);
    removeSetting(PROGRAMMER_CONTEXT_KEY);
    setProgrammerContext('');
    setPendingOtp(null);

    const users = nextDb.users || [];
    if (users.length === 0) {
      return { ok: false, error: lang === 'ar' ? 'لا توجد مدرسة مسجلة لهذا الكود' : 'No school registered for this code' };
    }

    const user = users.find((u: any) => u.Username === username && u.Password_Hash === password && u.Is_Active !== false);
    if (user) {
      const school = (nextDb.schools || []).find(
        (s: any) => normalizeSchoolCode(s.School_Code || s.code || '') === scopedCode
      );
      const userPhone = user.Phone || school?.WhatsApp_Number || school?.Phone_Numbers;
      const guard = checkDeviceAndMaybeOtp(scopedCode, {
        ...user,
        Phone: userPhone,
        Email: user.Email || school?.Email_Address
      });
      if (!guard.trusted && guard.session) {
        setPendingOtp({
          sessionId: guard.session.id,
          user,
          db: nextDb,
          yearId,
          schoolCode: scopedCode,
          expiresAt: guard.session.expiresAt,
          fingerprint: guard.session.fingerprint,
          attemptsLeft: guard.session.attemptsLeft
        });
        return {
          ok: false,
          otpRequired: true,
          sessionId: guard.session.id,
          expiresAt: guard.session.expiresAt,
          attemptsLeft: guard.session.attemptsLeft
        };
      }
      const licenseCheck = safeEnforceLicense({
        expectedSchoolUid: ensured.uid || ensured.db?.schools?.[0]?.school_uid,
        allowTrialFallback: true
      });
      setLicenseGate(licenseCheck);
      if (!licenseCheck.allowed) {
        return { ok: false, error: describeLicenseError(licenseCheck, lang) || 'License check failed' };
      }
      setDb(nextDb);
      setWorkingYearId(yearId);
      setCurrentUser(user);
      writeSetting(getUserKey(scopedCode), user.User_ID);
      return { ok: true };
    }

    return { ok: false, error: lang === 'ar' ? 'بيانات الدخول غير صحيحة' : 'Invalid credentials' };
  };

  const loginProgrammer = (username: string) => {
    if (demoMode) {
      return { ok: false, error: 'FEATURE_DISABLED_IN_DEMO' };
    }
    seedProgrammerSnapshotIfMissing();
    resetStoreStateForSchoolSwitch();
    const scopedCode = PROGRAMMER_CODE;
    const { db: nextDb, yearId } = loadDbForSchool(scopedCode);
    if (!nextDb?.schools?.length) {
      console.error('[SCHOOLS] No programmer school snapshot found');
      return { ok: false, error: 'No programmer school snapshot' };
    }
    const licenseCheck = safeEnforceLicense({
      expectedSchoolUid: nextDb.schools?.[0]?.school_uid,
      programmerBypass: true
    });
    setLicenseGate(licenseCheck);
    setDb(nextDb);
    setWorkingYearId(yearId);
    setActiveSchoolCode(scopedCode);
    writeSetting(SCHOOL_CODE_KEY, scopedCode);
    removeSetting(PROGRAMMER_CONTEXT_KEY);
    setProgrammerContext('');

    const users = nextDb.users || [];
    const existing = users.find((u: any) => u.Username === username && u.Permissions?.includes('programmer'));
    let programmerUser = existing;
    if (!programmerUser) {
      programmerUser = {
        User_ID: `PRG-${Date.now()}`,
        Emp_ID: '',
        Username: username,
        Password_Hash: '',
        Role: UserRole.ADMIN,
        Is_Active: true,
        Permissions: ['programmer']
      };
      setDb((prev: any) => ({ ...prev, users: [programmerUser, ...(prev.users || [])] }));
    }
    setCurrentUser(programmerUser);
    writeSetting(getUserKey(scopedCode), programmerUser.User_ID);
    writeSetting(PROGRAMMER_USER_KEY, programmerUser.User_ID);
    return { ok: true };
  };

  const verifyOtpCode = async (sessionId: string, code: string) => {
    if (demoMode) return { ok: false, error: 'FEATURE_DISABLED_IN_DEMO' };
    if (!pendingOtp || pendingOtp.sessionId !== sessionId) {
      return { ok: false, error: 'لا توجد جلسة تحقق متاحة' };
    }
    const result = verifyOtpAndTrust(pendingOtp.schoolCode, sessionId, code, pendingOtp.user.User_ID);
    if (!result.ok) {
      return { ok: false, error: result.error || 'الكود غير صحيح', attemptsLeft: result.attemptsLeft };
    }
    const licenseCheck = safeEnforceLicense({
      expectedSchoolUid: pendingOtp.db?.schools?.[0]?.school_uid,
      allowTrialFallback: true
    });
    setLicenseGate(licenseCheck);
    if (!licenseCheck.allowed) {
      setPendingOtp(null);
      return { ok: false, error: describeLicenseError(licenseCheck, lang) || 'License check failed' };
    }
    setDb(pendingOtp.db);
    setWorkingYearId(pendingOtp.yearId);
    setCurrentUser(pendingOtp.user);
    writeSetting(getUserKey(pendingOtp.schoolCode), pendingOtp.user.User_ID);
    setPendingOtp(null);
    return { ok: true };
  };

  const resendOtpCode = async (sessionId: string) => {
    if (demoMode) return { ok: false, error: 'FEATURE_DISABLED_IN_DEMO' };
    if (!pendingOtp || pendingOtp.sessionId !== sessionId) return { ok: false, error: 'لا توجد جلسة' };
    const school = (pendingOtp.db?.schools || []).find(
      (s: any) => normalizeSchoolCode(s.School_Code || s.code || '') === pendingOtp.schoolCode
    );
    const userPhone = pendingOtp.user?.Phone || school?.WhatsApp_Number || school?.Phone_Numbers;
    const userEmail = pendingOtp.user?.Email || school?.Email_Address;
    const refreshed = resendOtpForSession(pendingOtp.schoolCode, sessionId, userPhone, userEmail);
    if (!refreshed) return { ok: false, error: 'تعذر إعادة الإرسال' };
    setPendingOtp({ ...pendingOtp, expiresAt: refreshed.expiresAt });
    return { ok: true, expiresAt: refreshed.expiresAt };
  };

  const cancelOtp = () => setPendingOtp(null);

  const enterSchoolAsAdmin = (code: string, username: string, password: string) => {
    if (demoMode) {
      alert(lang === 'ar' ? 'متاح في النسخة الكاملة فقط' : 'Available in the full version only');
      return { ok: false, error: 'FEATURE_DISABLED_IN_DEMO' };
    }
    resetStoreStateForSchoolSwitch();
    const scopedCode = normalizeSchoolCode(code);
    const { db: nextDb, yearId } = loadDbForSchool(scopedCode);
    const ensured = ensureSchoolUidBinding(nextDb, scopedCode);
    if (!ensured.ok) {
      console.error('[SCHOOLS] UID mismatch, aborting bind', { code: scopedCode });
      return { ok: false, error: lang === 'ar' ? 'فشل تحميل المدرسة' : 'Failed to load school' };
    }
    if (!nextDb?.schools?.length) {
      return { ok: false, error: lang === 'ar' ? 'لا توجد مدرسة مسجلة لهذا الكود' : 'No school registered for this code' };
    }
    const user = nextDb.users?.find((u: any) => u.Username === username && u.Password_Hash === password && u.Is_Active !== false);
    if (!user) {
      return { ok: false, error: lang === 'ar' ? 'بيانات الدخول غير صحيحة' : 'Invalid credentials' };
    }
    const licenseCheck = safeEnforceLicense({
      expectedSchoolUid: ensured.uid || ensured.db?.schools?.[0]?.school_uid,
      allowTrialFallback: true
    });
    setLicenseGate(licenseCheck);
    if (!licenseCheck.allowed) {
      return { ok: false, error: describeLicenseError(licenseCheck, lang) || 'License check failed' };
    }
    setDb(ensured.db);
    setWorkingYearId(yearId);
    setActiveSchoolCode(scopedCode);
    setCurrentUser(user);
    writeSetting(SCHOOL_CODE_KEY, scopedCode);
    writeSetting(getUserKey(scopedCode), user.User_ID);
    writeSetting(PROGRAMMER_CONTEXT_KEY, scopedCode);
    setProgrammerContext(scopedCode);
    return { ok: true };
  };

  const exitProgrammerMode = () => {
    if (demoMode) return;
    resetStoreStateForSchoolSwitch();
    const scopedCode = PROGRAMMER_CODE;
    const { db: nextDb, yearId } = loadDbForSchool(scopedCode);
    if (!nextDb?.schools?.length) {
      console.error('[SCHOOLS] No programmer school snapshot found');
      return;
    }
    setDb(nextDb);
    setWorkingYearId(yearId);
    setActiveSchoolCode(scopedCode);
    writeSetting(SCHOOL_CODE_KEY, scopedCode);
    removeSetting(PROGRAMMER_CONTEXT_KEY);
    setProgrammerContext('');

    const programmerUserId = readSetting<string | null>(PROGRAMMER_USER_KEY, null);
    let programmerUser = programmerUserId
      ? nextDb.users?.find((u: any) => u.User_ID === programmerUserId)
      : nextDb.users?.find((u: any) => u.Permissions?.includes('programmer'));
    if (!programmerUser) {
      programmerUser = {
        User_ID: `PRG-${Date.now()}`,
        Emp_ID: '',
        Username: 'dev_owner',
        Password_Hash: '',
        Role: UserRole.ADMIN,
        Is_Active: true,
        Permissions: ['programmer']
      };
      setDb((prev: any) => ({ ...prev, users: [programmerUser, ...(prev.users || [])] }));
      writeSetting(PROGRAMMER_USER_KEY, programmerUser.User_ID);
    }
    setCurrentUser(programmerUser);
    writeSetting(getUserKey(scopedCode), programmerUser.User_ID);
  };

  const logout = () => {
    removeSetting(getUserKey(activeSchoolCode));
    removeSetting(PROGRAMMER_CONTEXT_KEY);
    setProgrammerContext('');
    setCurrentUser(null);
    setPendingOtp(null);
    setHrSyncEnabled(false);
    setFinanceSyncEnabled(false);
    setStorageEnabled(false);
    setLicenseGate(null);
  };

  return {
    lang, t, isSaved, demoMode, toggleLang: () => setLang(prev => prev === 'ar' ? 'en' : 'ar'),
    activeSchool, activeYear, currentUser, workingYearId, setActiveYearId: setWorkingYearId,
    availableModules,
    isReadOnly,
    isRedistributingStudents,
    isProgrammer,
    programmerMode,
    licenseStatus: licenseGate,
    schoolCode: activeSchoolCode,
    switchSchool,
    login,
    loginAsDemoSchool,
    loginProgrammer,
    verifyOtpCode,
    resendOtpCode,
    cancelOtp,
    enterSchoolAsAdmin,
    exitProgrammerMode,
    logout,
    rebindCurrentSchoolToUID,
    rebindSchoolUID,
    setHrSyncEnabled,
    setFinanceSyncEnabled,
    storageEnabled,
    financeSyncEnabled,
    hrSyncEnabled,
    ...db,
    stages,
    grades,
    classes,
    students,
    feeItems,
    feeStructure,
    receipts,
    journalEntries,
    allStages,
    allGrades,
    allClasses,
    allStudents,
    allFeeItems,
    allFeeStructure,
    allReceipts,
    allJournalEntries,
    ...academicActions, ...memberActions, ...financeActions,
      deleteYear: guardDestructive(academicActions.deleteYear),
      deleteStage: guardDestructive(academicActions.deleteStage),
      deleteGrade: guardDestructive(academicActions.deleteGrade),
      deleteClass: guardDestructive(academicActions.deleteClass),
      deleteStudent: guardDestructive(memberActions.deleteStudent),
      deleteStudentsBatch: guardDestructive(memberActions.deleteStudentsBatch),
      exportData: () => {
        if (demoMode) {
          alert(lang === 'ar' ? 'متاح في النسخة الكاملة فقط' : 'Available in the full version only');
          return;
        }
        return exportDatabase(db);
      },
      importData: async (file: File) => {
        if (demoMode) {
          alert(lang === 'ar' ? 'متاح في النسخة الكاملة فقط' : 'Available in the full version only');
          return;
        }
        try {
          const newData = await importDatabase(file);
          const yearId = readSetting<string | null>(YEAR_KEY, null)
            || newData.years.find((y: any) => y.Is_Active)?.Year_ID
            || newData.years?.[0]?.Year_ID
            || '';
          setDb(ensureAcademicYearIds(newData, yearId));
        setWorkingYearId(yearId);
        setIsSaved(true);
        alert(lang === 'ar' ? '?? ??????? "???? ??????" ?????' : 'Vault data restored successfully');
      } catch (e) { alert(e); }
    },
    updateSchool: (data: any) => {
      if (isReadOnly) {
        alert(lang === 'ar' ? 'انتهى الاشتراك: الوضع الآن قراءة فقط.' : 'Subscription expired: read-only mode.');
        return;
      }
      setDb((prev: any) => ({ ...prev, schools: [{ ...prev.schools[0], ...data }] }));
    },
    checkIntegrity: {
      isYearUsed: (id: string) => db.classes.some((c: any) => getItemYearId(c) === id),
      isStageUsed: (id: string) => db.grades.some((g: any) => g.Stage_ID === id),
      isGradeUsed: (id: string) => db.classes.some((c: any) => c.Grade_ID === id),
      isClassUsed: (id: string) => db.students.some((s: any) => s.Class_ID === id),
      isJobUsed: (id: string) => db.employees.some((e: any) => e.Job_ID === id)
    }
  };
};
