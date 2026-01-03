import { AppliedDiscount } from './finance.types';

export interface InvoiceItem {
  feeHeadId: string;
  amount: number;
  revenueAccountId: string;
  appliedDiscounts?: AppliedDiscount[];
}

export interface Invoice {
  id: string;
  serial: number;
  studentId: string;
  studentName: string;
  academicYearId: string;
  dueDate: string;
  items: InvoiceItem[];
  totalAmount: number;
  isPosted: boolean;
  isVoided?: boolean;
  voidReason?: string;
  voidDate?: string;
  gradeId?: string;
  gradeName?: string;
}
