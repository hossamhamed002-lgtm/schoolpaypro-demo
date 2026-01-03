
import { Student, Subject, GradesDatabase, CertificateConfig, SecretGenRange, GradeLevel, SchoolInfo, ExamCommittee, GradeGroup, GradeDescriptor, User, SubscriptionCredential, Note, ExamScheduleItem, Teacher, ObservationAssignment, CorrectionCommittee, ObserverConfig } from '../examControl.types';

const RAW_KEYS = {
  STUDENTS: 'app_students',
  SUBJECTS: 'app_subjects',
  GRADES: 'app_grades',
  CERT_CONFIG: 'app_cert_config',
  SCHOOL_INFO: 'app_school_info',
  SECRET_RANGES: 'app_secret_ranges',
  COMMITTEES: 'app_committees',
  COMMITTEES_R2: 'app_committees_r2',
  AUTO_BACKUPS: 'app_auto_backups',
  GRADE_GROUPS: 'app_grade_groups',
  DESCRIPTORS: 'app_grade_descriptors',
  NOTES: 'app_notes',
  EXAM_SCHEDULES: 'app_exam_schedules',
  TEACHERS: 'app_teachers',
  OBSERVATION_ASSIGNMENTS: 'app_observation_assignments',
  CORRECTION_COMMITTEES: 'app_correction_committees',
  OBSERVER_CONFIG: 'app_observer_config'
};

const API_BASE = import.meta.env.VITE_EXAM_BACKEND_URL || 'http://localhost:4000';
const defaultSchoolInfo: SchoolInfo = {
  schoolName: '',
  managerName: '',
  agentName: '',
  controlHead: '',
  itSpecialist: '',
  studentAffairsHead: '',
  academicYear: '2024 - 2025',
  educationalAdministration: '',
  governorate: '',
  logo: null
};

let cachedSchoolInfo: SchoolInfo | null = null;
const cachedStudentsByYear: Record<string, Student[]> = {};

const getScopedKey = (baseKey: string) => {
    const currentYear = localStorage.getItem('app_selected_year_preference') || "2024 - 2025";
    const yearSuffix = currentYear.replace(/[^a-zA-Z0-9]/g, '_');
    return `${baseKey}_${yearSuffix}`;
};

const safeSetLocalStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    // swallow quota errors; keep in-memory cache instead
    console.warn('[DB][WARN] Failed to persist to localStorage, using memory only.', err);
  }
};

const loadLocalSchoolInfo = (): SchoolInfo => {
  if (cachedSchoolInfo) return cachedSchoolInfo;
  try {
    const raw = localStorage.getItem(getScopedKey(RAW_KEYS.SCHOOL_INFO));
    cachedSchoolInfo = raw ? { ...defaultSchoolInfo, ...JSON.parse(raw) } : { ...defaultSchoolInfo };
  } catch {
    cachedSchoolInfo = { ...defaultSchoolInfo };
  }
  return cachedSchoolInfo;
};

const refreshSchoolInfoFromBackend = async () => {
  try {
    const year = localStorage.getItem('app_selected_year_preference') || '2024 - 2025';
    const res = await fetch(`${API_BASE}/school-info/${encodeURIComponent(year)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data) {
      cachedSchoolInfo = { ...defaultSchoolInfo, ...data };
      safeSetLocalStorage(getScopedKey(RAW_KEYS.SCHOOL_INFO), JSON.stringify(cachedSchoolInfo));
    }
  } catch (err) {
    console.warn('[DB][WARN] Backend school-info fetch failed; using cached/local copy.', err);
  }
};

const loadLocalStudents = (year: string): Student[] => {
  if (cachedStudentsByYear[year]) return cachedStudentsByYear[year];
  try {
    const raw = localStorage.getItem(getScopedKey(RAW_KEYS.STUDENTS));
    cachedStudentsByYear[year] = raw ? JSON.parse(raw) : [];
  } catch {
    cachedStudentsByYear[year] = [];
  }
  return cachedStudentsByYear[year];
};

const refreshStudentsFromBackend = async (year: string) => {
  try {
    const res = await fetch(`${API_BASE}/students/${encodeURIComponent(year)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data)) {
      cachedStudentsByYear[year] = data;
      safeSetLocalStorage(getScopedKey(RAW_KEYS.STUDENTS), JSON.stringify(data));
    }
  } catch (err) {
    console.warn('[DB][WARN] Backend students fetch failed; using cached/local copy.', err);
  }
};

export const db = {
  getSelectedYear: (): string => localStorage.getItem('app_selected_year_preference') || "2024 - 2025",
  setSelectedYear: (year: string) => localStorage.setItem('app_selected_year_preference', year),
  getAcademicYears: (): string[] => {
      try {
          const stored = localStorage.getItem('app_academic_years_list');
          return stored ? JSON.parse(stored) : ["2024 - 2025"];
      } catch { return ["2024 - 2025"]; }
  },
  addAcademicYear: (year: string): string[] => {
      const current = db.getAcademicYears();
      if (!current.includes(year)) {
          const updated = [...current, year].sort().reverse(); 
          localStorage.setItem('app_academic_years_list', JSON.stringify(updated));
          return updated;
      }
      return current;
  },

  getStudents: (): Student[] => {
      const year = localStorage.getItem('app_selected_year_preference') || '2024 - 2025';
      return loadLocalStudents(year);
  },
  saveStudents: (students: Student[]): void => {
      const year = localStorage.getItem('app_selected_year_preference') || '2024 - 2025';
      cachedStudentsByYear[year] = students;
      safeSetLocalStorage(getScopedKey(RAW_KEYS.STUDENTS), JSON.stringify(students));
      (async () => {
          try {
              await fetch(`${API_BASE}/students/${encodeURIComponent(year)}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(students)
              });
          } catch (err) {
              console.warn('[DB][WARN] Failed to persist students to backend.', err);
          }
      })();
  },
  
  getSubjects: (): Subject[] => JSON.parse(localStorage.getItem(getScopedKey(RAW_KEYS.SUBJECTS)) || '[]'),
  saveSubjects: (subjects: Subject[]) => localStorage.setItem(getScopedKey(RAW_KEYS.SUBJECTS), JSON.stringify(subjects)),
  
  getGradeGroups: (): GradeGroup[] => JSON.parse(localStorage.getItem(getScopedKey(RAW_KEYS.GRADE_GROUPS)) || '[]'),
  saveGradeGroups: (groups: GradeGroup[]) => localStorage.setItem(getScopedKey(RAW_KEYS.GRADE_GROUPS), JSON.stringify(groups)),
  
  getGradeDescriptors: (): GradeDescriptor[] => JSON.parse(localStorage.getItem(getScopedKey(RAW_KEYS.DESCRIPTORS)) || '[]'),
  saveGradeDescriptors: (descriptors: GradeDescriptor[]) => localStorage.setItem(getScopedKey(RAW_KEYS.DESCRIPTORS), JSON.stringify(descriptors)),

  getGrades: (): GradesDatabase => JSON.parse(localStorage.getItem(getScopedKey(RAW_KEYS.GRADES)) || '{}'),
  saveGrades: (grades: GradesDatabase) => localStorage.setItem(getScopedKey(RAW_KEYS.GRADES), JSON.stringify(grades)),
  
  getCertConfig: (): CertificateConfig => {
      const defaults: CertificateConfig = {
          schoolName: "", examTitle: "", footerRight: "", footerLeft: "", logo: null, showLogo: false, showEstimates: true, showColors: true, useScaledScore: false, showDetailedScores: false, showRank: false, minPassingPercent: 50, minExamPassingPercent: 30, term1SuccessText: "", term1FailText: "", term2SuccessText: "", term2FailText: "", annualSuccessText: "", annualFailText: ""
      };
      try {
          const stored = localStorage.getItem(getScopedKey(RAW_KEYS.CERT_CONFIG));
          if (!stored) return defaults;
          return { ...defaults, ...JSON.parse(stored) };
      } catch { return defaults; }
  },
  saveCertConfig: (config: CertificateConfig) => localStorage.setItem(getScopedKey(RAW_KEYS.CERT_CONFIG), JSON.stringify(config)),
  
  getSchoolInfo: (): SchoolInfo => loadLocalSchoolInfo(),
  saveSchoolInfo: async (info: SchoolInfo): Promise<void> => {
      cachedSchoolInfo = info;
      safeSetLocalStorage(getScopedKey(RAW_KEYS.SCHOOL_INFO), JSON.stringify(info));
      try {
          await fetch(`${API_BASE}/school-info/${encodeURIComponent(info.academicYear || '2024 - 2025')}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(info)
          });
      } catch (err) {
          console.warn('[DB][WARN] Failed to persist school-info to backend.', err);
      }
  },
  
  getSecretRanges: (): SecretGenRange[] => JSON.parse(localStorage.getItem(getScopedKey(RAW_KEYS.SECRET_RANGES)) || '[]'),
  saveSecretRanges: (ranges: SecretGenRange[]) => localStorage.setItem(getScopedKey(RAW_KEYS.SECRET_RANGES), JSON.stringify(ranges)),
  
  getCommittees: (): ExamCommittee[] => JSON.parse(localStorage.getItem(getScopedKey(RAW_KEYS.COMMITTEES)) || '[]'),
  saveCommittees: (committees: ExamCommittee[]) => localStorage.setItem(getScopedKey(RAW_KEYS.COMMITTEES), JSON.stringify(committees)),

  getSecondRoleCommittees: (): ExamCommittee[] => JSON.parse(localStorage.getItem(getScopedKey(RAW_KEYS.COMMITTEES_R2)) || '[]'),
  saveSecondRoleCommittees: (committees: ExamCommittee[]) => localStorage.setItem(getScopedKey(RAW_KEYS.COMMITTEES_R2), JSON.stringify(committees)),

  getNotes: (): Note[] => JSON.parse(localStorage.getItem(getScopedKey(RAW_KEYS.NOTES)) || '[]'),
  saveNotes: (notes: Note[]) => localStorage.setItem(getScopedKey(RAW_KEYS.NOTES), JSON.stringify(notes)),

  getExamSchedule: (grade: GradeLevel, term: 'term1' | 'term2'): ExamScheduleItem[] => {
      try {
          const key = getScopedKey(RAW_KEYS.EXAM_SCHEDULES);
          const allSchedules = JSON.parse(localStorage.getItem(key) || '{}');
          return allSchedules[`${grade}_${term}`] || [];
      } catch { return []; }
  },
  saveExamSchedule: (grade: GradeLevel, term: 'term1' | 'term2', schedule: ExamScheduleItem[]) => {
      const key = getScopedKey(RAW_KEYS.EXAM_SCHEDULES);
      const allSchedules = JSON.parse(localStorage.getItem(key) || '{}');
      allSchedules[`${grade}_${term}`] = schedule;
      localStorage.setItem(key, JSON.stringify(allSchedules));
  },

  getTeachers: (): Teacher[] => JSON.parse(localStorage.getItem(getScopedKey(RAW_KEYS.TEACHERS)) || '[]'),
  saveTeachers: (teachers: Teacher[]) => localStorage.setItem(getScopedKey(RAW_KEYS.TEACHERS), JSON.stringify(teachers)),

  getObservationAssignments: (): ObservationAssignment[] => JSON.parse(localStorage.getItem(getScopedKey(RAW_KEYS.OBSERVATION_ASSIGNMENTS)) || '[]'),
  saveObservationAssignments: (assignments: ObservationAssignment[]) => localStorage.setItem(getScopedKey(RAW_KEYS.OBSERVATION_ASSIGNMENTS), JSON.stringify(assignments)),

  getCorrectionCommittees: (): CorrectionCommittee[] => JSON.parse(localStorage.getItem(getScopedKey(RAW_KEYS.CORRECTION_COMMITTEES)) || '[]'),
  saveCorrectionCommittees: (committees: CorrectionCommittee[]) => localStorage.setItem(getScopedKey(RAW_KEYS.CORRECTION_COMMITTEES), JSON.stringify(committees)),

  getObserverConfig: (): ObserverConfig => {
      try {
          const data = localStorage.getItem(getScopedKey(RAW_KEYS.OBSERVER_CONFIG));
          return data ? JSON.parse(data) : { observersPerCommittee: 2, membersPerCorrection: 3 };
      } catch { return { observersPerCommittee: 2, membersPerCorrection: 3 }; }
  },
  saveObserverConfig: (config: ObserverConfig) => localStorage.setItem(getScopedKey(RAW_KEYS.OBSERVER_CONFIG), JSON.stringify(config)),

  getUsers: (): User[] => JSON.parse(localStorage.getItem('app_users') || '[]'),
  saveUsers: (users: User[]) => localStorage.setItem('app_users', JSON.stringify(users)),

  getDeviceId: async (): Promise<string> => 'FREE-VERSION',
  checkTrialStatus: () => ({ status: 'none' as const }),
  
  activateLicense: async (_activationCode: string): Promise<{ success: boolean; data?: { ownerName: string; activationDate: string; expiryDate: string }; message?: string }> => ({ success: true, data: { ownerName: 'مستخدم مجاني', activationDate: new Date().toISOString(), expiryDate: '2099-12-31T00:00:00.000Z' } }),
  checkLicense: () => ({ valid: true, daysLeft: 9999, data: { ownerName: 'نسخة مجانية بالكامل' } }),
  getSubscriptionCredentials: (): SubscriptionCredential[] => [],
  addSubscriptionCredential: (_cred: SubscriptionCredential): boolean => true,
  updateSubscriptionCredential: (_cred: SubscriptionCredential): boolean => true,
  deleteSubscriptionCredential: (_id: string): void => {},
  getActiveSubscription: () => null,
  refreshSchoolInfoFromBackend,
  refreshStudentsFromBackend,
  
  createBackup: () => JSON.stringify(localStorage),
  
  restoreBackup: (data: any): boolean => {
      try {
          localStorage.clear();
          Object.keys(data).forEach(key => {
              localStorage.setItem(key, data[key]);
          });
          return true;
      } catch { return false; }
  },
  
  clearAcademicData: () => {
      const currentYear = localStorage.getItem('app_selected_year_preference') || "2024 - 2025";
      const yearSuffix = currentYear.replace(/[^a-zA-Z0-9]/g, '_');
      
      Object.keys(localStorage).forEach(key => {
          if (key.startsWith('app_') && key.endsWith(yearSuffix)) {
              if (!key.includes(RAW_KEYS.SCHOOL_INFO)) {
                  localStorage.removeItem(key);
              }
          }
      });
  },

  wipeAllAppData: () => {
      const keysToKeep = ['app_auto_backup_path', 'app_auto_backup_enabled', 'app_users'];
      Object.keys(localStorage).forEach(key => {
          if (key.startsWith('app_') && !keysToKeep.includes(key)) {
              localStorage.removeItem(key);
          }
      });
      localStorage.removeItem('app_academic_years_list');
      localStorage.removeItem('app_selected_year_preference');
  }
};
