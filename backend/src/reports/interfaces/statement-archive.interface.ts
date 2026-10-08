export type AccountKind = 'current' | 'savings';

/** One account section of a monthly statement (a multi-currency account has one section per currency) */
export interface StatementAccount {
  accountNo: string;
  kind: AccountKind;
  currency: string;
  /** Human label, e.g. "Tekući račun" or "Dinarska štednja po viđenju" */
  label: string;
  /** Interest on a positive balance, % per year (null when the statement does not print it) */
  interestRate: number | null;
  openingBalance: number;
  closingBalance: number;
}

/** A transaction row exactly as printed on the statement - classification happens at read time */
export interface ArchivedTransaction {
  /** Stable within a household: period + account + currency + row number */
  id: string;
  accountNo: string;
  currency: string;
  rowNo: number;
  /** ISO date (YYYY-MM-DD) the bank booked the row */
  bookingDate: string;
  valueDate: string;
  description: string;
  ref: string | null;
  /** Isplata (outgoing), always >= 0 */
  debit: number;
  /** Uplata (incoming), always >= 0 */
  credit: number;
  balanceAfter: number;
  /** Card payments in a foreign currency print the original amount */
  originalAmount: number | null;
  originalCurrency: string | null;
}

export interface ParsedStatement {
  bank: 'yettel';
  statementNo: number | null;
  /** YYYY-MM - statements are monthly */
  period: string;
  periodStart: string;
  periodEnd: string;
  accounts: StatementAccount[];
  transactions: ArchivedTransaction[];
}

export interface StatementArchive extends ParsedStatement {
  id: string;
  householdId: string;
  uploadedByUid: string;
  uploadedBy: string;
  fileName: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Corrections the user made in the reports view; applied on top of the automatic classification */
export interface CategoryOverrides {
  /** Normalized merchant -> category, applies to every month */
  merchants: Record<string, string>;
  /** Transaction id -> category, applies to that single row */
  transactions: Record<string, string>;
}
