import { SpendingGroup } from '../report-categories';
import { ClassifiedTransaction } from '../transaction-classifier';
import { StatementAccount } from './statement-archive.interface';

export interface MonthSummary {
  /** YYYY-MM */
  period: string;
  statementNo: number | null;
  /** Real income: salary, rent, cashback, interest */
  income: number;
  /** Everything that came in: income + transfers from the household's own other account + cash deposits */
  inflows: number;
  spending: number;
  fixed: number;
  variable: number;
  cash: number;
  /** What stayed: inflows - spending - transfersOut, i.e. the change of all account balances */
  net: number;
  /** net / inflows, null without inflows */
  savingsRate: number | null;
  transfersIn: number;
  transfersOut: number;
  cashDeposits: number;
  /** Sum of all accounts, RSD (EUR converted) */
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
  /** Share of total spending, 0..1 */
  share: number;
  count: number;
  /** Average of the other imported months (null when there are none) */
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

export interface AccountLine extends StatementAccount {
  openingRsd: number;
  closingRsd: number;
  /** Average end-of-day balance over the month, in the account currency */
  averageDailyBalance: number;
}

export type InsightSeverity = 'high' | 'medium' | 'low' | 'positive';

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
  /** Estimated monthly saving in RSD, when it can be estimated */
  monthlySaving?: number;
  items?: InsightItem[];
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
  /** Number of other imported months the averages are based on */
  comparedMonths: number;
  transactions: ClassifiedTransaction[];
}

export type MonthStatus = 'imported' | 'missing' | 'upcoming';

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
