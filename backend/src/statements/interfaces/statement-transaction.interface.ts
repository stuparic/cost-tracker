export type TransactionDirection = 'debit' | 'credit';

export type TransactionMatchStatus = 'new' | 'duplicate' | 'already_imported' | 'skipped';

/** A single transaction extracted from an uploaded bank statement */
export interface StatementTransaction {
  /** Bank transaction reference, unique per transaction (e.g. "94735212551001") */
  ref: string;
  /** Value date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Raw description as printed on the statement */
  rawDescription: string;
  /** Normalized merchant / counterparty name */
  merchant: string;
  /** Suggested expense category (debits only) */
  category?: string;
  /** Suggested income type (credits only) */
  incomeType?: string;
  /** Amount in RSD, always positive */
  amount: number;
  direction: TransactionDirection;
  /** True when the transaction happened abroad / on a trip (adds the "putovanje" tag on import) */
  travel?: boolean;
}

/** Transaction enriched with duplicate-detection info */
export interface MatchedStatementTransaction extends StatementTransaction {
  matchStatus: TransactionMatchStatus;
  /** ID of the existing expense this transaction matched, if any */
  matchedExpenseId?: string;
  /** Human-readable explanation of the match */
  matchReason?: string;
  /** Whether the review UI should pre-select this transaction for import */
  suggestImport: boolean;
}

export interface ParseStatementResult {
  success: boolean;
  error?: string;
  /** Statement period detected from the document, ISO dates */
  periodStart?: string;
  periodEnd?: string;
  transactions: MatchedStatementTransaction[];
}
