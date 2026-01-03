
export type Stage = 'primary' | 'preparatory';

export type GradeLevel = 
  | 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6' // Primary 1-6
  | 'm1' | 'm2' | 'm3'; // Middle/Prep 1-3

export const GRADE_LABELS: Record<GradeLevel, string> = {
  p1: 'الصف الأول الابتدائي',
  p2: 'الصف الثاني الابتدائي',
  p3: 'الصف الثالث الابتدائي',
  p4: 'الصف الرابع الابتدائي',
  p5: 'الصف الخامس الابتدائي',
  p6: 'الصف السادس الابتدائي',
  m1: 'الصف الأول الإعدادي',
  m2: 'الصف الثاني الإعدادي',
  m3: 'الصف الثالث الإعدادي',
};

export interface GradeGroup {
  id: string;
  name: string;
  grades: GradeLevel[];
}

export interface Subject {
  id: string;
  name: string;
  maxScore: number; 
  minScore: number; 
  certificateMax?: number; 
  yearWork: number; 
  practicalScore: number; 
  examScore: number; 
  isAddedToTotal: boolean; 
  isBasic: boolean;
  showInSchedule?: boolean; 
  groupId?: string; 
  stage: Stage | 'all'; 
  gradeLevels?: GradeLevel[]; 
}

export interface ExamScheduleItem {
  id: string; 
  subjectName: string; 
  day: string;
  date: string;
  timeFrom: string;
  timeTo: string;
  duration: string; 
}

export interface Student {
  id: string;
  name: string;
  nationalId: string; 
  classroom: string; 
  stage: Stage;
  gradeLevel: GradeLevel; 
  seatingNumber: number | null;
  secretNumberTerm1: number | null;
  secretNumberTerm2: number | null;
  secretNumberSecondRole: number | null; 
  committeeId?: string | null; 
  committeeIdSecondRole?: string | null;
  gender?: 'ذكر' | 'أنثى';
  religion?: 'مسلم' | 'مسيحي';
  birthDate?: string; 
  enrollmentStatus?: 'مستجد' | 'باق' | 'وافد';
  isIntegration?: boolean;
}

export interface GradeRecord {
  term1: { work: number; practical: number; exam: number };
  term2: { work: number; practical: number; exam: number };
  secondRole?: { exam: number; isExcused?: boolean };
}

export interface GradesDatabase {
  [studentId: string]: {
    [subjectId: string]: GradeRecord;
  };
}

export interface GradeDescriptor {
  id: string;
  label: string; 
  minPercent: number; 
  color: string; 
}

export interface CertificateConfig {
  schoolName: string;
  examTitle: string;
  footerRight: string;
  footerLeft: string;
  logo: string | null;
  showLogo: boolean;
  showEstimates: boolean; 
  showColors: boolean; 
  useScaledScore: boolean; 
  showDetailedScores: boolean; 
  showRank: boolean;
  minPassingPercent: number; 
  minExamPassingPercent: number; 
  term1SuccessText: string;
  term1FailText: string;
  term2SuccessText: string;
  term2FailText: string;
  annualSuccessText: string;
  annualFailText: string;
}

export interface SchoolInfo {
  schoolName: string;
  managerName: string;
  agentName: string;
  controlHead: string;
  itSpecialist: string;
  studentAffairsHead: string;
  academicYear: string;
  educationalAdministration: string; 
  governorate: string; 
  logo?: string | null; 
}

export interface SecretGenRange {
  id: string;
  term: 'term1' | 'term2' | 'second_role'; 
  fromSeating: number;
  toSeating: number;
  startSecret: number;
}

export interface ExamCommittee {
  id: string;
  name: string; 
  location: string; 
  capacity: number;
  gradeLevel: GradeLevel;
  shift?: 'morning' | 'evening';
  notes?: string;
}

export interface Teacher {
  id: string;
  name: string;
  subject?: string;
  conflicts?: string[]; 
}

export interface ObservationAssignment {
  id: string;
  scheduleId: string;
  committeeId: string;
  term: 'term1' | 'term2';
  observerIds: string[];
  reserveObserverId?: string; 
}

export interface CorrectionCommittee {
  id: string;
  subjectId: string;
  gradeLevel: GradeLevel;
  term: 'term1' | 'term2';
  headTeacherId?: string;
  memberIds: string[];
}

export interface ObserverConfig {
  observersPerCommittee: number;
  membersPerCorrection: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: string;
  isImportant: boolean;
}

export enum Tab {
  DASHBOARD = 'dashboard',
  SCHOOL_DATA = 'school_data',
  STUDENTS = 'students',
  CONTROL = 'control', 
  SETTINGS = 'settings', 
  OBSERVERS = 'observers',
  GRADING = 'grading',
  REPORTS = 'reports',
  SHEETS = 'sheets',
  STATISTICS = 'statistics', 
  OFFICIAL_PAPERS = 'official_papers',
  SECOND_ROLE = 'second_role', 
  BACKUP = 'backup',
  USERS = 'users',
  NOTES = 'notes'
}

export type Role = 'admin' | 'subscriber' | 'control_head' | 'data_entry' | 'viewer';

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: Role;
}

export interface SubscriptionCredential {
  id: string;
  username: string;
  password: string;
  ownerName: string;
  createdAt: string;
  isActive: boolean;
  durationDays: number; 
  activationDate?: string | null; 
  expiryDate?: string | null; 
  activationCode?: string;
  hardwareId?: string;
}

export const PERMISSIONS: Record<Role, Tab[]> = {
  admin: Object.values(Tab),
  subscriber: Object.values(Tab),
  control_head: [
    Tab.DASHBOARD, 
    Tab.STUDENTS, 
    Tab.CONTROL,
    Tab.OBSERVERS,
    Tab.GRADING, 
    Tab.REPORTS, 
    Tab.SHEETS,
    Tab.STATISTICS, 
    Tab.OFFICIAL_PAPERS,
    Tab.SECOND_ROLE,
    Tab.NOTES
  ],
  data_entry: [
    Tab.DASHBOARD, 
    Tab.STUDENTS, 
    Tab.GRADING
  ],
  viewer: [
    Tab.DASHBOARD, 
    Tab.REPORTS, 
    Tab.SHEETS,
    Tab.STATISTICS
  ]
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'مدير النظام',
  subscriber: 'مدير مدرسة (مشترك)',
  control_head: 'رئيس الكنترول',
  data_entry: 'مدخل بيانات',
  viewer: 'مستعرض تقارير'
};
