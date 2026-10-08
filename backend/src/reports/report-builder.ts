import { CategoryOverrides, ParsedStatement, StatementAccount } from './interfaces/statement-archive.interface';
import { AccountLine, CategoryLine, GroupLine, IncomeLine, MonthReport, MonthSummary, YearOverview } from './interfaces/report.interface';
import { GROUP_LABELS, INCOME_CATEGORIES, isSpendingCategory, SPENDING_CATEGORIES, SpendingGroup } from './report-categories';
import { classifyStatement, ClassifiedTransaction } from './transaction-classifier';
import { buildMonthInsights, buildYearInsights, topMerchants } from './insights';

/** Everything derived from one monthly statement */
export interface MonthData {
  statement: ParsedStatement & { id?: string; uploadedBy?: string };
  transactions: ClassifiedTransaction[];
  summary: MonthSummary;
  accounts: AccountLine[];
  /** Spending per category, RSD */
  categoryTotals: Map<string, number>;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: number[]): number {
  return round(values.reduce((total, value) => total + value, 0));
}

function toRsd(amount: number, currency: string, eurRate: number): number {
  return currency === 'EUR' ? round(amount * eurRate) : amount;
}

/** Average end-of-day balance over every day of the statement month */
function averageDailyBalance(account: StatementAccount, statement: ParsedStatement): number {
  const rows = statement.transactions
    .filter(tx => tx.accountNo === account.accountNo && tx.currency === account.currency)
    .sort((a, b) => a.bookingDate.localeCompare(b.bookingDate) || a.rowNo - b.rowNo);

  const days = Number(statement.periodEnd.slice(8, 10));
  let balance = account.openingBalance;
  let index = 0;
  let total = 0;
  for (let day = 1; day <= days; day++) {
    const date = `${statement.period}-${String(day).padStart(2, '0')}`;
    while (index < rows.length && rows[index].bookingDate <= date) {
      balance = rows[index].balanceAfter;
      index++;
    }
    total += balance;
  }
  return round(total / days);
}

export function buildMonthData(statement: MonthData['statement'], overrides: CategoryOverrides, eurRate: number): MonthData {
  const transactions = classifyStatement(statement, overrides, eurRate);

  const byFlow = (flow: ClassifiedTransaction['flow']) => transactions.filter(tx => tx.flow === flow);
  const expenses = byFlow('expense');

  const categoryTotals = new Map<string, number>();
  const groupTotals: Record<SpendingGroup, number> = { fixed: 0, variable: 0, cash: 0 };
  for (const tx of expenses) {
    const category = tx.category && isSpendingCategory(tx.category) ? tx.category : 'Other';
    categoryTotals.set(category, round((categoryTotals.get(category) ?? 0) + tx.amountRsd));
    groupTotals[SPENDING_CATEGORIES[category].group] += tx.amountRsd;
  }

  const accounts: AccountLine[] = statement.accounts.map(account => ({
    ...account,
    openingRsd: toRsd(account.openingBalance, account.currency, eurRate),
    closingRsd: toRsd(account.closingBalance, account.currency, eurRate),
    averageDailyBalance: averageDailyBalance(account, statement)
  }));
  const savings = accounts.filter(account => account.kind === 'savings');

  const income = sum(byFlow('income').map(tx => tx.amountRsd));
  const transfersIn = sum(byFlow('transfer_in').map(tx => tx.amountRsd));
  const transfersOut = sum(byFlow('transfer_out').map(tx => tx.amountRsd));
  const cashDeposits = sum(byFlow('cash_deposit').map(tx => tx.amountRsd));
  const inflows = round(income + transfersIn + cashDeposits);
  const spending = sum(expenses.map(tx => tx.amountRsd));
  const net = round(inflows - spending - transfersOut);

  const summary: MonthSummary = {
    period: statement.period,
    statementNo: statement.statementNo,
    income,
    inflows,
    spending,
    fixed: round(groupTotals.fixed),
    variable: round(groupTotals.variable),
    cash: round(groupTotals.cash),
    net,
    savingsRate: inflows > 0 ? net / inflows : null,
    transfersIn,
    transfersOut,
    cashDeposits,
    openingBalance: sum(accounts.map(account => account.openingRsd)),
    closingBalance: sum(accounts.map(account => account.closingRsd)),
    savingsOpening: sum(savings.map(account => account.openingRsd)),
    savingsClosing: sum(savings.map(account => account.closingRsd))
  };

  return { statement, transactions, summary, accounts, categoryTotals };
}

function categoryLines(
  totals: Map<string, number>,
  counts: Map<string, number>,
  averageOf: (category: string) => number | null
): CategoryLine[] {
  const spending = [...totals.values()].reduce((total, value) => total + value, 0);
  const categories = new Set([...totals.keys()]);
  return [...categories]
    .filter(isSpendingCategory)
    .map(category => {
      const amount = round(totals.get(category) ?? 0);
      return {
        category,
        label: SPENDING_CATEGORIES[category].label,
        group: SPENDING_CATEGORIES[category].group,
        amount,
        share: spending > 0 ? amount / spending : 0,
        count: counts.get(category) ?? 0,
        average: averageOf(category)
      };
    })
    .filter(line => Math.abs(line.amount) >= 0.01)
    .sort((a, b) => b.amount - a.amount);
}

export function buildMonthReport(current: MonthData, history: MonthData[]): MonthReport {
  const { summary, transactions } = current;
  const expenses = transactions.filter(tx => tx.flow === 'expense');

  const counts = new Map<string, number>();
  for (const tx of expenses) counts.set(tx.category ?? 'Other', (counts.get(tx.category ?? 'Other') ?? 0) + 1);

  const averageOf = (category: string): number | null =>
    history.length > 0
      ? round(history.reduce((total, month) => total + (month.categoryTotals.get(category) ?? 0), 0) / history.length)
      : null;

  const groups: GroupLine[] = (['fixed', 'variable', 'cash'] as SpendingGroup[]).map(group => ({
    group,
    label: GROUP_LABELS[group],
    amount: summary[group],
    share: summary.spending > 0 ? summary[group] / summary.spending : 0
  }));

  const incomeTotals = new Map<string, { amount: number; count: number }>();
  for (const tx of transactions.filter(t => t.flow === 'income' || t.flow === 'transfer_in' || t.flow === 'cash_deposit')) {
    const entry = incomeTotals.get(tx.category ?? 'OtherIncome') ?? { amount: 0, count: 0 };
    entry.amount = round(entry.amount + tx.amountRsd);
    entry.count++;
    incomeTotals.set(tx.category ?? 'OtherIncome', entry);
  }
  const income: IncomeLine[] = [...incomeTotals.entries()]
    .map(([category, { amount, count }]) => ({ category, label: INCOME_CATEGORIES[category] ?? category, amount, count }))
    .sort((a, b) => b.amount - a.amount);

  return {
    statementId: current.statement.id ?? '',
    uploadedBy: current.statement.uploadedBy ?? '',
    summary,
    accounts: current.accounts,
    groups,
    categories: categoryLines(current.categoryTotals, counts, averageOf),
    income,
    topMerchants: topMerchants(expenses.filter(tx => tx.category !== 'Cash')),
    insights: buildMonthInsights(current, history),
    comparedMonths: history.length,
    transactions
  };
}

/**
 * Year view: which months are imported, which are missing, totals and the
 * year-level insights. `today` decides which months are still upcoming (a
 * month's statement only exists once the month is over).
 */
export function buildYearOverview(year: number, allMonths: MonthData[], today: Date): YearOverview {
  const inYear = allMonths
    .filter(month => month.statement.period.startsWith(`${year}-`))
    .sort((a, b) => a.statement.period.localeCompare(b.statement.period));
  const byPeriod = new Map(inYear.map(month => [month.statement.period, month]));

  const currentPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const months = Array.from({ length: 12 }, (_, index) => {
    const period = `${year}-${String(index + 1).padStart(2, '0')}`;
    const data = byPeriod.get(period);
    const status = data ? ('imported' as const) : period >= currentPeriod ? ('upcoming' as const) : ('missing' as const);
    return { month: index + 1, period, status, summary: data?.summary ?? null };
  });

  const totals = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const month of inYear) {
    for (const [category, amount] of month.categoryTotals) totals.set(category, round((totals.get(category) ?? 0) + amount));
    for (const tx of month.transactions.filter(t => t.flow === 'expense'))
      counts.set(tx.category ?? 'Other', (counts.get(tx.category ?? 'Other') ?? 0) + 1);
  }

  const income = sum(inYear.map(month => month.summary.income));
  const inflows = sum(inYear.map(month => month.summary.inflows));
  const spending = sum(inYear.map(month => month.summary.spending));
  const transfersOut = sum(inYear.map(month => month.summary.transfersOut));
  const net = round(inflows - spending - transfersOut);

  return {
    year,
    months,
    missingPeriods: months.filter(month => month.status === 'missing').map(month => month.period),
    latestPeriod: inYear.length > 0 ? inYear[inYear.length - 1].statement.period : null,
    totals: {
      months: inYear.length,
      income,
      inflows,
      spending,
      transfersOut,
      net,
      savingsRate: inflows > 0 ? net / inflows : null,
      cash: sum(inYear.map(month => month.summary.cash)),
      cashDeposits: sum(inYear.map(month => month.summary.cashDeposits))
    },
    categories: categoryLines(totals, counts, category => (inYear.length > 0 ? round((totals.get(category) ?? 0) / inYear.length) : null)),
    insights: buildYearInsights(year, inYear, months)
  };
}
