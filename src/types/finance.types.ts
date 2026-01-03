import { AccountType } from './accounts.types';

export enum FeeHeadType {
  MANDATORY = 'Mandatory',
  OPTIONAL = 'Optional'
}

export interface FeeHead {
  id: string;
  name: string;
  linkedRevenueAccountId: string;
  type: FeeHeadType;
  isRecurring: boolean;
  priority: number;
}

export interface GradeFeeItem {
  feeHeadId: string;
  amount: number;
  revenueAccountId?: string;
  costAccountId?: string;
  term1Percent?: number;
  term2Percent?: number;
}

export interface GradeFeeStructure {
  id: string;
  academicYearId: string;
  gradeId: string;
  items: GradeFeeItem[];
  totalAmount: number;
}

export enum DiscountCategory {
  SIBLINGS = 'Siblings',
  STAFF = 'Staff',
  MERIT = 'Merit',
  FULL_EXEMPTION = 'FullExemption',
  SPECIAL = 'Special'
}

export enum DiscountType {
  PERCENTAGE = 'Percentage',
  FIXED_AMOUNT = 'FixedAmount'
}

export interface AppliedDiscount {
  feeHeadId: string;
  category: DiscountCategory;
  type: DiscountType;
  value: number;
  calculatedAmount?: number;
}
