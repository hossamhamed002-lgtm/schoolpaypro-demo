export type JournalStatus = 'DRAFT' | 'POSTED' | 'APPROVED' | 'REJECTED';
export type JournalSource =
  | 'payroll'
  | 'receipts'
  | 'payments'
  | 'manual'
  | 'assets'
  | 'inventory-receive'
  | 'inventory-issue';

export interface JournalLine {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  note?: string;
  costCenterId?: string;
}

export interface JournalEntry {
  id: string;
  journalNo: number;
  date: string;
  description: string;
  source: JournalSource;
  sourceRefId?: string;
  status: JournalStatus;
  createdAt: string;
  createdBy: string;
  approvedAt?: string;
  approvedBy?: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  rejectionReason?: string;
}
