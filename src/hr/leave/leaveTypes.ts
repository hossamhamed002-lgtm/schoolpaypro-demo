import { resolveLeavePolicy } from './leavePolicy';

export interface LeaveType {
  id: string;
  name: string;
  genderRestriction: 'male' | 'female' | 'all';
  hasMaxDuration: boolean;
  maxDaysPerRequest?: number;
  affectsAttendance: boolean;
  countsAsAbsent: boolean;
  isPaid: boolean;
  countsForInsurance: boolean;
  affectsSalary: boolean;
  affectsInsurance: boolean;
  paidByEmployer: boolean;
  defaultAnnualBalance: number | null;
  requiresApproval: boolean;
}

const policyMap = [
  { legacyId: 'ANNUAL_LEAVE', policyId: 'ANNUAL' },
  { legacyId: 'CASUAL_LEAVE', policyId: 'CASUAL' },
  { legacyId: 'SICK_LEAVE', policyId: 'SICK' },
  { legacyId: 'CHILD_CARE_LEAVE', policyId: 'CHILD_CARE' },
  { legacyId: 'MATERNITY_LEAVE', policyId: 'MATERNITY' }
] as const;

export const leaveTypes: LeaveType[] = policyMap.map((item) => {
  const policy = resolveLeavePolicy(item.policyId);
  return {
    id: item.legacyId,
    name: policy.nameAr,
    genderRestriction: policy.genderRestriction,
    hasMaxDuration: policy.hasMaxDuration,
    maxDaysPerRequest: policy.maxDaysPerRequest,
    affectsAttendance: policy.affectsAttendance,
    countsAsAbsent: policy.countsAsAbsent,
    isPaid: policy.isPaid,
    countsForInsurance: policy.countsForInsurance,
    affectsSalary: policy.affectsSalary,
    affectsInsurance: policy.affectsInsurance,
    paidByEmployer: policy.paidBy === 'SCHOOL',
    defaultAnnualBalance: item.policyId === 'CASUAL' ? policy.maxDaysPerYear : null,
    requiresApproval: true
  };
});
