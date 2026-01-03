export enum AccountType {
  ASSET = 'Asset',
  LIABILITY = 'Liability',
  EQUITY = 'Equity',
  REVENUE = 'Revenue',
  EXPENSE = 'Expense'
}

export enum AccountLevel {
  ROOT = 1,
  BRANCH = 2,
  LEAF = 3
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType | (typeof AccountType)[keyof typeof AccountType];
  level: number;
  parentId: string | null;
  isMain: boolean;
  balance: number;
  isSystem?: boolean;
  systemTag?: string;
  locked?: boolean;
}
