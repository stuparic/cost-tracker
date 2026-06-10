export type TransactionDirection = 'debit' | 'credit';

export type TransactionMatchStatus = 'new' | 'duplicate' | 'already_imported';

export interface StatementTransaction {
  ref: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  rawDescription: string;
  merchant: string;
  category?: string;
  /** Amount in RSD, always positive */
  amount: number;
  direction: TransactionDirection;
  matchStatus: TransactionMatchStatus;
  matchedExpenseId?: string;
  matchReason?: string;
  suggestImport: boolean;
}

export interface ParseStatementResult {
  success: boolean;
  error?: string;
  periodStart?: string;
  periodEnd?: string;
  transactions: StatementTransaction[];
}

export interface ImportStatementPayload {
  createdBy: string;
  transactions: Array<{
    ref: string;
    date: string;
    merchant: string;
    rawDescription?: string;
    category?: string;
    amount: number;
  }>;
}

export interface ImportStatementResult {
  imported: number;
  skipped: number;
}
