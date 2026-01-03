export type LeavePolicyId = 'ANNUAL' | 'CASUAL' | 'SICK' | 'CHILD_CARE' | 'MATERNITY' | 'UNPAID';
export type LeaveGender = 'Male' | 'Female';
export type GenderRestriction = 'male' | 'female' | 'all';
export type InsuranceHandledBy = 'school' | 'employee' | 'none';

export interface LeavePolicy {
  id: LeavePolicyId;
  nameAr: string;
  allowedGenders: LeaveGender[];
  genderRestriction: GenderRestriction;
  hasMaxDuration: boolean;
  maxDaysPerRequest?: number;
  maxDaysPerYear: number;
  isPaid: boolean;
  insuranceHandledBy: InsuranceHandledBy;
  countsForInsurance: boolean;
  affectsAttendance: boolean;
  countsAsAbsent: boolean;
  affectsSalary: boolean;
  affectsInsurance: boolean;
  paidBy: 'SCHOOL' | 'EMPLOYEE';
}

export interface LeavePolicyResolutionOptions {
  employeeGender?: LeaveGender | null;
  yearsOfService?: number;
  annualOverride?: number;
}

const defaultPolicies: Record<LeavePolicyId, Omit<LeavePolicy, 'maxDaysPerYear' | 'genderRestriction' | 'hasMaxDuration' | 'maxDaysPerRequest' | 'countsForInsurance'>> = {
  CASUAL: {
    id: 'CASUAL',
    nameAr: 'إجازة عارضة',
    allowedGenders: ['Male', 'Female'],
    isPaid: true,
    insuranceHandledBy: 'school',
    affectsAttendance: false,
    countsAsAbsent: false,
    affectsSalary: false,
    affectsInsurance: false,
    paidBy: 'SCHOOL'
  },
  ANNUAL: {
    id: 'ANNUAL',
    nameAr: 'إجازة اعتيادية',
    allowedGenders: ['Male', 'Female'],
    isPaid: true,
    insuranceHandledBy: 'school',
    affectsAttendance: false,
    countsAsAbsent: false,
    affectsSalary: false,
    affectsInsurance: false,
    paidBy: 'SCHOOL'
  },
  SICK: {
    id: 'SICK',
    nameAr: 'إجازة مرضية',
    allowedGenders: ['Male', 'Female'],
    isPaid: false,
    insuranceHandledBy: 'school',
    affectsAttendance: true,
    countsAsAbsent: true,
    affectsSalary: true,
    affectsInsurance: false,
    paidBy: 'SCHOOL'
  },
  CHILD_CARE: {
    id: 'CHILD_CARE',
    nameAr: 'إجازة رعاية طفل',
    allowedGenders: ['Female'],
    isPaid: false,
    insuranceHandledBy: 'none',
    affectsAttendance: true,
    countsAsAbsent: false,
    affectsSalary: true,
    affectsInsurance: true,
    paidBy: 'EMPLOYEE'
  },
  MATERNITY: {
    id: 'MATERNITY',
    nameAr: 'إجازة وضع',
    allowedGenders: ['Female'],
    isPaid: false,
    insuranceHandledBy: 'school',
    affectsAttendance: true,
    countsAsAbsent: false,
    affectsSalary: false,
    affectsInsurance: false,
    paidBy: 'SCHOOL'
  },
  UNPAID: {
    id: 'UNPAID',
    nameAr: 'إجازة بدون راتب',
    allowedGenders: ['Male', 'Female'],
    isPaid: false,
    insuranceHandledBy: 'none',
    affectsAttendance: true,
    countsAsAbsent: true,
    affectsSalary: true,
    affectsInsurance: true,
    paidBy: 'EMPLOYEE'
  }
};

const resolveAnnualMaxDays = (options: LeavePolicyResolutionOptions) => {
  if (typeof options.annualOverride === 'number') return options.annualOverride;
  if (options.yearsOfService === undefined) return 0;
  if (options.yearsOfService < 1) return 0;
  if (options.yearsOfService <= 10) return 21;
  return 30;
};

const resolveSickMaxDays = () => 180;
const resolveChildCareMaxDays = () => 730;
const resolveMaternityMaxDays = () => 90;
const resolveUnpaidMaxDays = () => 365;

export const resolveLeavePolicy = (
  leaveTypeId: LeavePolicyId,
  options: LeavePolicyResolutionOptions = {}
): LeavePolicy => {
  const base = defaultPolicies[leaveTypeId];
  const maxDaysPerYear = (() => {
    switch (leaveTypeId) {
      case 'CASUAL':
        return 6;
      case 'ANNUAL':
        return resolveAnnualMaxDays(options);
      case 'SICK':
        return resolveSickMaxDays();
      case 'CHILD_CARE':
        return resolveChildCareMaxDays();
      case 'MATERNITY':
        return resolveMaternityMaxDays();
      case 'UNPAID':
        return resolveUnpaidMaxDays();
      default:
        return 0;
    }
  })();

  const genderRestriction: GenderRestriction = base.allowedGenders.length === 1
    ? (base.allowedGenders[0] === 'Female' ? 'female' : 'male')
    : 'all';

  const hasMaxDuration = ['SICK', 'CHILD_CARE', 'MATERNITY'].includes(leaveTypeId);
  const maxDaysPerRequest = hasMaxDuration ? maxDaysPerYear : undefined;
  const countsForInsurance = base.insuranceHandledBy !== 'none';

  return {
    ...base,
    genderRestriction,
    hasMaxDuration,
    maxDaysPerRequest,
    maxDaysPerYear,
    countsForInsurance
  };
};

export const isGenderEligibleForLeave = (policy: LeavePolicy, gender?: LeaveGender | null) => {
  if (!gender) return policy.allowedGenders.length > 1;
  return policy.allowedGenders.includes(gender);
};

const normalizeNationalIdDigits = (nationalId?: string) => {
  if (!nationalId) return '';
  return nationalId.replace(/\D/g, '');
};

const normalizeGenderValue = (genderValue?: string | null): LeaveGender | null => {
  if (!genderValue) return null;
  const trimmed = genderValue.trim();
  if (!trimmed) return null;
  if (trimmed === 'Male' || trimmed === 'Female') return trimmed;
  if (trimmed === 'ذكر') return 'Male';
  if (trimmed === 'أنثى') return 'Female';
  return null;
};

export const deriveGenderFromNationalId = (nationalId?: string): LeaveGender | null => {
  const digits = normalizeNationalIdDigits(nationalId);
  if (digits.length !== 14) return null;
  const genderDigit = Number(digits.charAt(12));
  if (Number.isNaN(genderDigit)) return null;
  return genderDigit % 2 === 0 ? 'Female' : 'Male';
};

export const resolveEmployeeGender = (employee?: {
  Gender?: string | null;
  gender?: string | null;
  Gender_Ar?: string | null;
  National_ID?: string | null;
  nationalId?: string | null;
}): LeaveGender | null => {
  if (!employee) return null;
  const normalized =
    normalizeGenderValue(employee.Gender) ||
    normalizeGenderValue(employee.gender) ||
    normalizeGenderValue(employee.Gender_Ar);
  if (normalized) return normalized;
  return deriveGenderFromNationalId(employee.National_ID || employee.nationalId || undefined);
};
