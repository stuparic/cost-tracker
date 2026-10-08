// Mirrors backend/src/reports/interfaces - reports built from full monthly bank statements

export type SpendingGroup = 'fixed' | 'variable' | 'cash';
export type TransactionFlow = 'income' | 'expense' | 'internal' | 'transfer_in' | 'transfer_out' | 'cash_deposit';
export type InsightSeverity = 'high' | 'medium' | 'low' | 'positive';
export type MonthStatus = 'imported' | 'missing' | 'upcoming';

export interface MonthSummary {
  /** YYYY-MM */
  period: string;
  statementNo: number | null;
  income: number;
  /** income + transfers from the own other account + cash deposits */
  inflows: number;
  spending: number;
  fixed: number;
  variable: number;
  cash: number;
  /** inflows - spending - transfersOut (= change of all balances) */
  net: number;
  savingsRate: number | null;
  transfersIn: number;
  transfersOut: number;
  cashDeposits: number;
  openingBalance: number;
  closingBalance: number;
  savingsOpening: number;
  savingsClosing: number;
}

export interface CategoryLine {
  category: string;
  label: string;
  group: SpendingGroup;
  amount: number;
  share: number;
  count: number;
  average: number | null;
}

export interface GroupLine {
  group: SpendingGroup;
  label: string;
  amount: number;
  share: number;
}

export interface IncomeLine {
  category: string;
  label: string;
  amount: number;
  count: number;
}

export interface MerchantLine {
  merchant: string;
  category: string;
  label: string;
  amount: number;
  count: number;
}

export interface AccountLine {
  accountNo: string;
  kind: 'current' | 'savings';
  currency: string;
  label: string;
  interestRate: number | null;
  openingBalance: number;
  closingBalance: number;
  openingRsd: number;
  closingRsd: number;
  averageDailyBalance: number;
}

export interface InsightItem {
  label: string;
  amount: number;
  note?: string;
}

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  body: string;
  action?: string;
  monthlySaving?: number;
  items?: InsightItem[];
}

export interface ReportTransaction {
  id: string;
  accountNo: string;
  currency: string;
  bookingDate: string;
  description: string;
  merchant: string;
  merchantKey: string;
  direction: 'debit' | 'credit';
  amount: number;
  amountRsd: number;
  flow: TransactionFlow;
  category: string | null;
  travel: boolean;
  overridden: boolean;
  originalAmount: number | null;
  originalCurrency: string | null;
}

export interface MonthReport {
  statementId: string;
  uploadedBy: string;
  summary: MonthSummary;
  accounts: AccountLine[];
  groups: GroupLine[];
  categories: CategoryLine[];
  income: IncomeLine[];
  topMerchants: MerchantLine[];
  insights: Insight[];
  comparedMonths: number;
  transactions: ReportTransaction[];
}

export interface YearMonth {
  month: number;
  period: string;
  status: MonthStatus;
  summary: MonthSummary | null;
}

export interface YearOverview {
  year: number;
  months: YearMonth[];
  missingPeriods: string[];
  latestPeriod: string | null;
  totals: {
    months: number;
    income: number;
    inflows: number;
    spending: number;
    transfersOut: number;
    net: number;
    savingsRate: number | null;
    cash: number;
    cashDeposits: number;
  };
  categories: CategoryLine[];
  insights: Insight[];
}

export interface UploadStatementResult {
  id: string;
  period: string;
  statementNo: number | null;
  accounts: number;
  transactions: number;
  replaced: boolean;
}

export interface UpdateReportCategoryPayload {
  scope: 'transaction' | 'merchant';
  transactionId?: string;
  merchantKey?: string;
  /** null = back to the automatic category */
  category: string | null;
}
