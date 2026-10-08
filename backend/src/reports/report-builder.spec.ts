import { ArchivedTransaction, CategoryOverrides, ParsedStatement, StatementAccount } from './interfaces/statement-archive.interface';
import { buildMonthData, buildMonthReport, buildYearOverview } from './report-builder';
import { plural, rsd } from './insights';
import { classifyStatement, cleanMerchant } from './transaction-classifier';

const EUR_RATE = 117;
const NO_OVERRIDES: CategoryOverrides = { merchants: {}, transactions: {} };

type Row = Pick<ArchivedTransaction, 'description'> & Partial<ArchivedTransaction>;

/** Builds a one-account RSD statement whose running balances add up */
function statement(period: string, rows: Row[], opening = 100000, savings?: { opening: number; closing: number }): ParsedStatement {
  let balance = opening;
  const transactions = rows.map((row, index) => {
    const debit = row.debit ?? 0;
    const credit = row.credit ?? 0;
    balance = Math.round((balance - debit + credit) * 100) / 100;
    return {
      id: `${period}:ACC:${row.currency ?? 'RSD'}:${index + 1}`,
      accountNo: row.accountNo ?? 'ACC',
      currency: row.currency ?? 'RSD',
      rowNo: index + 1,
      bookingDate: row.bookingDate ?? `${period}-${String(Math.min(index + 1, 28)).padStart(2, '0')}`,
      valueDate: row.bookingDate ?? `${period}-01`,
      ref: null,
      debit,
      credit,
      balanceAfter: balance,
      originalAmount: row.originalAmount ?? null,
      originalCurrency: row.originalCurrency ?? null,
      description: row.description
    };
  });
  const accounts: StatementAccount[] = [
    {
      accountNo: 'ACC',
      kind: 'current' as const,
      currency: 'RSD',
      label: 'Tekući račun (RSD)',
      interestRate: 0,
      openingBalance: opening,
      closingBalance: balance
    }
  ];
  if (savings) {
    accounts.push({
      accountNo: 'SAV',
      kind: 'savings' as const,
      currency: 'RSD',
      label: 'Dinarska štednja po viđenju',
      interestRate: 2.01,
      openingBalance: savings.opening,
      closingBalance: savings.closing
    });
  }
  const lastDay = new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0)).getUTCDate();
  return { bank: 'yettel', statementNo: 1, period, periodStart: `${period}-01`, periodEnd: `${period}-${lastDay}`, accounts, transactions };
}

describe('cleanMerchant', () => {
  it('turns statement descriptions into readable names', () => {
    expect(cleanMerchant('GooglePay LIDL 174 NOVI SAD, NOVI SAD')).toBe('Lidl 174 Novi Sad');
    expect(cleanMerchant('GooglePay PAYSPOT DOO*BAKER PLU, NOVI SAD')).toBe('Baker Plu');
    expect(cleanMerchant('GOOGLE *Travel Town Me, MOUNTAIN VIEW')).toBe('Google Play – Travel Town Me');
    expect(cleanMerchant('Netflix.com, Los Gatos Kurs: 121.9937')).toBe('Netflix.com');
    expect(cleanMerchant('Podizanje gotovine: ATM OTP NS, NOVI SAD')).toBe('Podizanje gotovine');
  });
});

describe('classifyStatement', () => {
  const classify = (rows: Row[], overrides = NO_OVERRIDES) => classifyStatement(statement('2026-06', rows), overrides, EUR_RATE);

  it('applies the household rules for loans, rent, salary and own-account transfers', () => {
    const rows = classify([
      { description: 'ACME VENTURES DOO, KNEZ MIHAILOVA 1, BEOGRAD', credit: 500000 },
      { description: 'MILOS ORLIC, NOVI SAD', credit: 50000 },
      { description: 'DEJAN STUPARIC, NOVI SAD', credit: 65000 },
      { description: 'OTP banka Srbija a.d. Novi Sad', debit: 64000 },
      { description: 'Dejan S', debit: 100000 }
    ]);
    expect(rows.map(tx => [tx.flow, tx.category])).toEqual([
      ['income', 'Salary'],
      ['income', 'Rent'],
      ['transfer_in', 'OwnAccount'],
      ['expense', 'CarLoan'],
      ['expense', 'HomeLoan'],
      ['transfer_out', null]
    ]);
    // 780 EUR of the transfer pays the apartment loan, the rest only moves money
    expect(rows[4].amountRsd).toBe(780 * EUR_RATE);
    expect(rows[5].amountRsd).toBe(100000 - 780 * EUR_RATE);
    expect(rows[5].id).toMatch(/:preko$/);
  });

  it('keeps internal transfers and cash apart from spending', () => {
    const rows = classify([
      { description: 'Interni transfer - Isplata TR', debit: 20000 },
      { description: 'Podizanje gotovine: ATM YETTEL SHOP NS, Novi Sad', debit: 10000 },
      { description: 'Uplata gotovine: ATM SPENS NOVI SAD,', credit: 5000 }
    ]);
    expect(rows.map(tx => [tx.flow, tx.category])).toEqual([
      ['internal', null],
      ['expense', 'Cash'],
      ['cash_deposit', 'CashDeposit']
    ]);
  });

  it('puts card payments abroad into travel, but not online subscriptions', () => {
    const rows = classify([
      { description: 'GooglePay SPAR KOPER 2, KOPER/CAPODIS Kurs: 122.0982', debit: 387, originalAmount: 3.17, originalCurrency: 'EUR' },
      { description: 'NETFLIX.COM, AMSTERDAM Kurs: 122.0686', debit: 609, originalAmount: 4.99, originalCurrency: 'EUR' },
      { description: 'GooglePay METRO NOVI SAD, NOVI SAD', debit: 9000 }
    ]);
    expect(rows.map(tx => tx.category)).toEqual(['Travel', 'Subscriptions', 'Groceries']);
  });

  it('treats a returned payment order as a refund that cancels the spending', () => {
    const rows = classify([
      { description: 'Transakcije po nalogu građana', debit: 5000 },
      { description: 'Transakcije po nalogu građana', credit: 5000 }
    ]);
    expect(rows.reduce((sum, tx) => sum + tx.amountRsd, 0)).toBe(0);
    expect(rows.every(tx => tx.flow === 'expense')).toBe(true);
  });

  it('applies merchant and transaction corrections, the row correction winning', () => {
    const rows = classify(
      [
        { description: 'GooglePay RIVER, NOVI SAD', debit: 5000 },
        { description: 'GooglePay RIVER, NOVI SAD', debit: 600 }
      ],
      { merchants: { river: 'Dining' }, transactions: { '2026-06:ACC:RSD:2': 'Groceries' } }
    );
    expect(rows.map(tx => [tx.category, tx.overridden])).toEqual([
      ['Dining', true],
      ['Groceries', true]
    ]);
  });
});

describe('month report', () => {
  const june = statement(
    '2026-06',
    [
      { description: 'ACME VENTURES DOO, BEOGRAD', credit: 400000 },
      { description: 'Podizanje gotovine: ATM OTP, NOVI SAD', debit: 100000 },
      ...Array.from({ length: 20 }, () => ({ description: 'GooglePay MIKROMARKET NS, Sremska Kamen', debit: 300 })),
      { description: 'GOOGLE *Travel Town Me, MOUNTAIN VIEW', debit: 649 },
      { description: 'GOOGLE *Travel Town Me, MOUNTAIN VIEW', debit: 649 },
      { description: 'GOOGLE *YouTube, MOUNTAIN VIEW', debit: 819 }
    ],
    50000,
    { opening: 300000, closing: 200000 }
  );
  const may = statement('2026-05', [
    { description: 'ACME VENTURES DOO, BEOGRAD', credit: 400000 },
    { description: 'GooglePay LIDL 174 NOVI SAD, NOVI SAD', debit: 6000 }
  ]);

  const current = buildMonthData(june, NO_OVERRIDES, EUR_RATE);
  const report = buildMonthReport(current, [buildMonthData(may, NO_OVERRIDES, EUR_RATE)]);

  it('sums inflows and spending so that what is left equals the balance change', () => {
    const { summary } = report;
    expect(summary.income).toBe(400000);
    expect(summary.spending).toBe(100000 + 20 * 300 + 2 * 649 + 819);
    expect(summary.net).toBe(summary.inflows - summary.spending - summary.transfersOut);
    const currentAccount = report.accounts.find(account => account.kind === 'current')!;
    expect(currentAccount.closingBalance - currentAccount.openingBalance).toBe(summary.net);
  });

  it('breaks spending down by category with averages of the other months', () => {
    const groceries = report.categories.find(line => line.category === 'Groceries')!;
    expect(groceries.amount).toBe(6000);
    expect(groceries.count).toBe(20);
    expect(groceries.average).toBe(6000);
    expect(report.categories[0].category).toBe('Cash');
  });

  it('suggests the expected improvements, most severe first', () => {
    const ids = report.insights.map(insight => insight.id);
    expect(ids).toEqual(expect.arrayContaining(['cash', 'games', 'small-purchases', 'subscriptions', 'savings-trend']));
    expect(report.insights[0].severity).toBe('high');

    const games = report.insights.find(insight => insight.id === 'games')!;
    expect(games.monthlySaving).toBe(1298);
    expect(games.body).toContain('2 kupovine');

    const savings = report.insights.find(insight => insight.id === 'savings-trend')!;
    expect(savings.title).toBe('Štednja je pala za 100.000 din');
  });
});

describe('year overview', () => {
  it('marks months as imported, missing or upcoming', () => {
    const months = ['2026-01', '2026-04'].map(period =>
      buildMonthData(statement(period, [{ description: 'ACME VENTURES DOO, BEOGRAD', credit: 1000 }]), NO_OVERRIDES, EUR_RATE)
    );
    const overview = buildYearOverview(2026, months, new Date('2026-06-10'));
    expect(overview.months.slice(0, 6).map(month => month.status)).toEqual([
      'imported',
      'missing',
      'missing',
      'imported',
      'missing',
      'upcoming'
    ]);
    expect(overview.missingPeriods).toEqual(['2026-02', '2026-03', '2026-05']);
    expect(overview.latestPeriod).toBe('2026-04');
    expect(overview.insights[0].id).toBe('missing-statements');
  });
});

describe('text helpers', () => {
  it('formats RSD amounts', () => {
    expect(rsd(1234567.8)).toBe('1.234.568 din');
    expect(rsd(-500)).toBe('−500 din');
  });

  it('uses Serbian plurals', () => {
    expect([1, 2, 5, 11, 12, 21, 22, 25].map(n => plural(n, 'kupovina', 'kupovine', 'kupovina'))).toEqual([
      'kupovina',
      'kupovine',
      'kupovina',
      'kupovina',
      'kupovina',
      'kupovina',
      'kupovine',
      'kupovina'
    ]);
  });
});
