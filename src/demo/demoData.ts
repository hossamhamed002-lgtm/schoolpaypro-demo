const demoSchoolCode = 'DEMO';
const demoYearId = 'YEAR-DEMO-2024';
const demoModules = ['dashboard', 'academic', 'members', 'students', 'examControl', 'staff', 'finance', 'communications', 'stores'];
const baseState = {
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

const stages = [
  { Stage_ID: 'STG-DEMO-1', Stage_Name: 'المرحلة الابتدائية', Stage_Name_En: 'Primary', Academic_Year_ID: demoYearId },
  { Stage_ID: 'STG-DEMO-2', Stage_Name: 'المرحلة الإعدادية', Stage_Name_En: 'Preparatory', Academic_Year_ID: demoYearId }
];

const grades = [
  { Grade_ID: 'GRD-DEMO-1', Stage_ID: 'STG-DEMO-1', Grade_Name: 'الصف الرابع', Grade_Name_En: 'Grade 4', Academic_Year_ID: demoYearId },
  { Grade_ID: 'GRD-DEMO-2', Stage_ID: 'STG-DEMO-1', Grade_Name: 'الصف الخامس', Grade_Name_En: 'Grade 5', Academic_Year_ID: demoYearId },
  { Grade_ID: 'GRD-DEMO-3', Stage_ID: 'STG-DEMO-2', Grade_Name: 'الأول الإعدادي', Grade_Name_En: 'Grade 7', Academic_Year_ID: demoYearId }
];

const classes = [
  { Class_ID: 'CLS-DEMO-A', Grade_ID: 'GRD-DEMO-1', Class_Name: 'A', capacity: 30, Academic_Year_ID: demoYearId, Year_ID: demoYearId },
  { Class_ID: 'CLS-DEMO-B', Grade_ID: 'GRD-DEMO-2', Class_Name: 'B', capacity: 30, Academic_Year_ID: demoYearId, Year_ID: demoYearId },
  { Class_ID: 'CLS-DEMO-C', Grade_ID: 'GRD-DEMO-3', Class_Name: 'C', capacity: 30, Academic_Year_ID: demoYearId, Year_ID: demoYearId }
];

const students = [
  {
    Student_ID: 'STU-DEMO-1',
    Name_Ar: 'سلمى محمد',
    Gender: 'F',
    Grade_ID: 'GRD-DEMO-1',
    Class_ID: 'CLS-DEMO-A',
    Academic_Year_ID: demoYearId,
    Parent_ID: 'PAR-DEMO-1'
  },
  {
    Student_ID: 'STU-DEMO-2',
    Name_Ar: 'ياسين أحمد',
    Gender: 'M',
    Grade_ID: 'GRD-DEMO-1',
    Class_ID: 'CLS-DEMO-A',
    Academic_Year_ID: demoYearId,
    Parent_ID: 'PAR-DEMO-1'
  },
  {
    Student_ID: 'STU-DEMO-3',
    Name_Ar: 'ملك محمود',
    Gender: 'F',
    Grade_ID: 'GRD-DEMO-2',
    Class_ID: 'CLS-DEMO-B',
    Academic_Year_ID: demoYearId,
    Parent_ID: 'PAR-DEMO-2'
  },
  {
    Student_ID: 'STU-DEMO-4',
    Name_Ar: 'علي إبراهيم',
    Gender: 'M',
    Grade_ID: 'GRD-DEMO-3',
    Class_ID: 'CLS-DEMO-C',
    Academic_Year_ID: demoYearId,
    Parent_ID: 'PAR-DEMO-3'
  }
];

const parents = [
  { Parent_ID: 'PAR-DEMO-1', Parent_Name: 'محمد فوزي', Phone: '0100000001', Address: 'القاهرة', Academic_Year_ID: demoYearId },
  { Parent_ID: 'PAR-DEMO-2', Parent_Name: 'محمود عبد العزيز', Phone: '0100000002', Address: 'الإسكندرية', Academic_Year_ID: demoYearId },
  { Parent_ID: 'PAR-DEMO-3', Parent_Name: 'إبراهيم صابر', Phone: '0100000003', Address: 'المنصورة', Academic_Year_ID: demoYearId }
];

const employees = [
  { Emp_ID: 'EMP-DEMO-1', Full_Name: 'هدى الشربيني', Job_ID: 'JOB-DEMO-ADMIN', Gender: 'F', Academic_Year_ID: demoYearId },
  { Emp_ID: 'EMP-DEMO-2', Full_Name: 'طارق الشرقاوي', Job_ID: 'JOB-DEMO-TEACHER', Gender: 'M', Academic_Year_ID: demoYearId },
  { Emp_ID: 'EMP-DEMO-3', Full_Name: 'منة الله عبد الجليل', Job_ID: 'JOB-DEMO-ACCOUNTANT', Gender: 'F', Academic_Year_ID: demoYearId }
];

const jobTitles = [
  { Job_ID: 'JOB-DEMO-ADMIN', Job_Name: 'مدير المدرسة', Job_Name_En: 'Principal' },
  { Job_ID: 'JOB-DEMO-TEACHER', Job_Name: 'معلم رياضيات', Job_Name_En: 'Math Teacher' },
  { Job_ID: 'JOB-DEMO-ACCOUNTANT', Job_Name: 'محاسب', Job_Name_En: 'Accountant' }
];

const feeItems = [
  { Fee_ID: 'FEE-DEMO-TUITION', Fee_Name: 'مصروفات دراسية', Amount: 4500, Academic_Year_ID: demoYearId },
  { Fee_ID: 'FEE-DEMO-ACTIVITY', Fee_Name: 'أنشطة', Amount: 750, Academic_Year_ID: demoYearId }
];

const feeStructure = [
  { Structure_ID: 'STR-DEMO-G4', Grade_ID: 'GRD-DEMO-1', Fee_ID: 'FEE-DEMO-TUITION', Amount: 4500, Year_ID: demoYearId, Academic_Year_ID: demoYearId },
  { Structure_ID: 'STR-DEMO-G4-ACT', Grade_ID: 'GRD-DEMO-1', Fee_ID: 'FEE-DEMO-ACTIVITY', Amount: 750, Year_ID: demoYearId, Academic_Year_ID: demoYearId },
  { Structure_ID: 'STR-DEMO-G5', Grade_ID: 'GRD-DEMO-2', Fee_ID: 'FEE-DEMO-TUITION', Amount: 4700, Year_ID: demoYearId, Academic_Year_ID: demoYearId }
];

const accounts = [
  { Account_ID: 'ACC-DEMO-CASH', Account_Name: 'خزينة المدرسة', Account_Type: 'asset' },
  { Account_ID: 'ACC-DEMO-BANK', Account_Name: 'حساب بنكي', Account_Type: 'asset' }
];

const receipts = [
  {
    Receipt_ID: 'RCPT-DEMO-1',
    Student_ID: 'STU-DEMO-1',
    Amount: 1200,
    Date: '2024-09-15',
    Academic_Year_ID: demoYearId,
    Description: 'دفعة مصروفات',
    Account_ID: 'ACC-DEMO-CASH'
  },
  {
    Receipt_ID: 'RCPT-DEMO-2',
    Student_ID: 'STU-DEMO-3',
    Amount: 750,
    Date: '2024-09-20',
    Academic_Year_ID: demoYearId,
    Description: 'أنشطة',
    Account_ID: 'ACC-DEMO-BANK'
  }
];

const reportConfigs = [
  { Category_ID: 'students', Category_Name_Ar: 'الطلاب', Category_Name_En: 'Students', Signature_Chain: [], Available_Reports: [] },
  { Category_ID: 'finance', Category_Name_Ar: 'المالية', Category_Name_En: 'Finance', Signature_Chain: [], Available_Reports: [] },
  { Category_ID: 'examControl', Category_Name_Ar: 'كنترول الامتحانات', Category_Name_En: 'Exam Control', Signature_Chain: [], Available_Reports: [] }
];

const users = [
  {
    User_ID: 'USR-DEMO-ADMIN',
    Username: 'demo',
    Password_Hash: 'demo',
    Role: 'ADMIN',
    Is_Active: true,
    Permissions: demoModules
  }
];

export const demoData = {
  ...baseState,
  schools: [
    {
      School_ID: 'SCH-DEMO',
      Name: 'مدرسة الريادة',
      Name_En: 'Pioneer International School',
      School_Code: demoSchoolCode,
      school_uid: 'demo-school-uid',
      Email_Address: 'demo@school.edu',
      Phone_Numbers: '0100000000',
      Allowed_Modules: demoModules
    }
  ],
  years: [
    { Year_ID: demoYearId, Year_Name: '2024 - 2025', Start_Date: '2024-09-01', End_Date: '2025-06-30', Is_Active: true }
  ],
  jobTitles,
  stages,
  grades,
  classes,
  students,
  parents,
  employees,
  receipts,
  feeItems,
  accounts,
  feeStructure,
  users,
  rules: [
    {
      Rule_ID: 'RULE-DEMO-ATT',
      Name: 'سياسة الحضور',
      Description: 'تسجيل حضور وغياب الطلاب بشكل تجريبي',
      Academic_Year_ID: demoYearId
    }
  ],
  reportConfigs
};

export const DEMO_SCHOOL_CODE = demoSchoolCode;
export const DEMO_YEAR_ID = demoYearId;
