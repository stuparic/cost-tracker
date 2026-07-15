export type TransactionDirection = 'debit' | 'credit';

export type TransactionMatchStatus = 'new' | 'duplicate' | 'already_imported' | 'skipped';

export interface StatementTransaction {
  ref: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  rawDescription: string;
  merchant: string;
  category?: string;
  /** True when category was auto-applied from a learned merchant->category mapping */
  categoryLearned?: boolean;
  /** Suggested income type (credits only) */
  incomeType?: string;
  /** Amount in RSD, always positive */
  amount: number;
  direction: TransactionDirection;
  /** True when the transaction happened abroad / on a trip */
  travel?: boolean;
  /** Trip location as "City, Country" */
  travelPlace?: string;
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
    incomeType?: string;
    amount: number;
    direction: TransactionDirection;
    travel?: boolean;
    travelPlace?: string;
  }>;
}

export interface ImportStatementResult {
  expensesImported: number;
  incomesImported: number;
  skipped: number;
}
