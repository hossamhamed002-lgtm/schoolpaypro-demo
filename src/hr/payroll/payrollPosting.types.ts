export type PayrollPostingStatus = 'Posted' | 'Reversed';

export interface PayrollPosting {
  id: string;
  payrollMonth: number;
  payrollYear: number;
  journalEntryId: string;
  postedAt: string;
  postedBy: string;
  status: PayrollPostingStatus;
}
