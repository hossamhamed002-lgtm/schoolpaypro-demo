
export enum AccountType {
  ASSET = 'Asset',
  LIABILITY = 'Liability',
  INCOME = 'Income',
  EXPENSE = 'Expense'
}

export enum UserRole {
  ADMIN = 'Admin',
  ACCOUNTANT = 'Accountant',
  REGISTRAR = 'Registrar',
  HR_MANAGER = 'HR Manager',
  TEACHER = 'Teacher',
  WORKER = 'Worker'
}

export enum StudentStatus {
  ENROLLED = 'مقيد',
  NEW = 'مستجد',
  TRANSFERRED = 'محول',
  REPEATING = 'باق للإعادة',
  DEPARTED = 'منقول إلى مدرسة أخرى'
}

export interface ParentData {
  Parent_ID: string;
  Name: string;
  National_ID: string;
  DOB: string;
  Mobile: string;
  WhatsApp: string;
  Address: string;
  Job: string;
  Email?: string;
  ID_Type?: string;
  Nationality?: string;
}

export interface StudentMaster {
  Student_Global_ID: string;
  School_ID: string;
  Academic_Year_ID: string;
  Name_Ar: string;
  Name_En: string;
  National_ID: string;
  DOB: string;
  Age_In_Oct: string;
  Gender: 'Male' | 'Female';
  Status: StudentStatus;
  Gov_Code: string;
  Guardian_Phone: string;
  Stage_ID: string;
  Grade_ID: string;
  Class_ID: string;
  Stage_Name?: string;
  Grade_Name?: string;
  Class_Name?: string;
  Section: string;
  Level: string;
  Nationality?: string;
  Religion?: string;
  Place_Of_Birth?: string;
  
  // New Fields
  Father: ParentData;
  Mother: ParentData;
  Emergency_Phone: string;
  Is_Integration: boolean; // حالة الدمج
  Bus_Number: string;
  Email: string;
  Attachments: string[]; // URLs or Base64
}

export interface AuditEntry {
  Log_ID: string;
  Timestamp: string;
  User_ID: string;
  Username: string;
  Page_Name_Ar: string;
  Page_Name_En: string;
  Action_Ar: string;
  Action_En: string;
  Action_Type: 'add' | 'edit' | 'delete' | 'auth' | 'system';
  Record_ID: string;
  Details: string;
  IP_Address: string;
}

export interface SignatureStep {
  Step_ID: string;
  Job_ID: string;
  Display_Title_Ar: string;
  Display_Title_En: string;
  Alignment: 'left' | 'center' | 'right';
  Is_Stamp_Required: boolean;
}

export interface ReportDefinition {
  Report_ID: string;
  Title_Ar: string;
  Title_En: string;
  Allowed_Roles: UserRole[];
}

export interface ReportConfig {
  Category_ID: string;
  Category_Name_Ar: string;
  Category_Name_En: string;
  Signature_Chain: SignatureStep[];
  Available_Reports: ReportDefinition[];
}

export interface JobTitle {
  Job_ID: string;
  Title_Ar: string;
  Title_En: string;
  Parent_Job_ID: string | null;
  Default_Role: UserRole;
  Department: string;
}

export interface Stage {
  Stage_ID: string;
  Stage_Name: string;
  Academic_Year_ID: string;
}

export interface School {
  School_ID: string;
  Name: string;
  Logo: string;
  Address: string;
  Subscription_Plan: string;
  Directorate?: string;   
  Administration?: string; 
  School_Code?: string;    
  Phone_Numbers?: string;  
  WhatsApp_Number?: string;
  Email_Address?: string;
  Stages_Available?: Stage[]; 
  Allowed_Modules?: string[];
  Subscription_Start?: string;
  Subscription_End?: string;
  Admin_Username?: string;
}

export interface AppUser {
  User_ID: string;
  Emp_ID: string;
  Username: string;
  Password_Hash: string;
  Role: UserRole;
  Is_Active: boolean;
  Permissions: string[]; 
}

export interface Employee {
  Emp_ID: string;
  School_ID: string;
  Name_Ar: string;
  Name_En: string;
  Username: string;
  Email: string;
  Phone: string;
  DOB: string;
  National_ID: string;
  Insurance_No: string;
  Section: string; 
  Level: string; 
  Job_ID: string;  
  Is_System_User: boolean; 
  Is_Active: boolean;
}

export interface AcademicYear {
  Year_ID: string;
  School_ID: string;
  Year_Name: string;
  Start_Date: string;
  End_Date: string;
  Is_Active: boolean;
}

export interface Grade {
  Grade_ID: string;
  Stage_ID: string;
  Grade_Name: string;
  Academic_Year_ID: string;
}

export interface Class {
  Class_ID: string;
  Year_ID: string;
  Grade_ID: string;
  Class_Name: string;
  Class_Teacher_ID: string;
  Academic_Year_ID: string;
  capacity?: number;
}

export interface StudentReceipt {
  Receipt_ID: string;
  Date: string;
  Enroll_ID: string;
  Fee_ID: string;
  Amount_Paid: number;
  Treasury_Acc_ID: string;
  Academic_Year_ID: string;
}

export interface JournalEntry {
  Entry_ID: string;
  Date: string;
  Description: string;
  Account_ID: string;
  Debit: number;
  Credit: number;
  Source_Table: 'Receipt' | 'Payroll' | 'Manual';
  Academic_Year_ID: string;
}


export interface FeeItem {
  Fee_ID: string;
  Item_Name: string;
  Is_Mandatory: boolean;
  Income_Acc_ID: string;
  Expense_Acc_ID: string;
  Academic_Year_ID: string;
}

export interface FeeStructure {
  Structure_ID: string;
  Grade_ID: string;
  Fee_ID: string;
  Amount: number;
  Year_ID: string;
  Academic_Year_ID: string;
}
