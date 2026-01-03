import { ApprovedLeave, LeaveImpact } from './payroll.types';

export const calculateDelayDeduction = (minutes: number, dailyRate: number) => {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  if (!Number.isFinite(dailyRate) || dailyRate <= 0) return 0;
  return (minutes / 60) * dailyRate;
};

export const calculateAbsenceDeduction = (days: number, dailyRate: number) => {
  if (!Number.isFinite(days) || days <= 0) return 0;
  if (!Number.isFinite(dailyRate) || dailyRate <= 0) return 0;
  return days * dailyRate;
};

export const resolveLeaveImpact = (leave: ApprovedLeave, gender: 'Male' | 'Female'): LeaveImpact => {
  const days = Number.isFinite(leave.days) ? Math.max(0, leave.days) : 0;
  if (days === 0) {
    return { paidDays: 0, unpaidDays: 0, insuranceCovered: false };
  }

  switch (leave.leaveType) {
    case 'SICK':
      return {
        paidDays: 0,
        unpaidDays: days,
        insuranceCovered: Boolean(leave.decisionApplied)
      };
    case 'CASUAL':
    case 'ANNUAL':
      return {
        paidDays: days,
        unpaidDays: 0,
        insuranceCovered: true
      };
    case 'CHILD_CARE':
      if (gender !== 'Female') {
        throw new Error('إجازة رعاية الطفل غير مسموحة للذكور');
      }
      return {
        paidDays: 0,
        unpaidDays: days,
        insuranceCovered: false
      };
    case 'MATERNITY':
      if (gender !== 'Female') {
        throw new Error('إجازة الوضع غير مسموحة للذكور');
      }
      return {
        paidDays: days,
        unpaidDays: 0,
        insuranceCovered: true
      };
    default:
      throw new Error('نوع إجازة غير صالح');
  }
};
