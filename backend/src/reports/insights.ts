import { Insight, InsightItem, InsightSeverity, MerchantLine, YearMonth } from './interfaces/report.interface';
import { categoryLabel, SPENDING_CATEGORIES, SpendingCategory } from './report-categories';
import type { MonthData } from './report-builder';
import { ClassifiedTransaction } from './transaction-classifier';

/**
 * Rule-based suggestions. Every number in the text comes from the statements,
 * and savings are only estimated where the arithmetic is explicit - the
 * suggestions should be something the household can check and act on.
 */

const MONTH_NAMES = ['januar', 'februar', 'mart', 'april', 'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'];

const SEVERITY_ORDER: Record<InsightSeverity, number> = { high: 0, medium: 1, low: 2, positive: 3 };

/** Variable categories worth comparing month to month (trips and unknowns are too lumpy) */
const COMPARABLE: SpendingCategory[] = ['Groceries', 'Dining', 'Transport', 'Health', 'Shopping', 'Fun'];

const CASH_MIN = 10000;
const SMALL_PURCHASE_LIMIT = 1000;
const SMALL_PURCHASES_MIN_COUNT = 15;
const SPIKE_RATIO = 1.3;
const SPIKE_MIN_RSD = 5000;
const IDLE_MIN_RSD = 50000;
const SAVINGS_MOVE_MIN_RSD = 50000;

export function rsd(value: number): string {
  const rounded = Math.round(value);
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${rounded < 0 ? '−' : ''}${digits} din`;
}

/** Serbian plural: 1 kupovina, 2-4 kupovine, 5+ kupovina (11-14 take the "many" form) */
export function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function inMonths(count: number): string {
  return `u ${count} ${plural(count, 'uvezenom mesecu', 'uvezena meseca', 'uvezenih meseci')}`;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function monthName(period: string): string {
  return MONTH_NAMES[Number(period.slice(5, 7)) - 1] ?? period;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function topMerchants(expenses: ClassifiedTransaction[], limit = 8): MerchantLine[] {
  const byMerchant = new Map<string, MerchantLine>();
  for (const tx of expenses) {
    const line = byMerchant.get(tx.merchantKey) ?? {
      merchant: tx.merchant,
      category: tx.category ?? 'Other',
      label: categoryLabel(tx.category ?? 'Other'),
      amount: 0,
      count: 0
    };
    line.amount = round(line.amount + tx.amountRsd);
    line.count++;
    byMerchant.set(tx.merchantKey, line);
  }
  return [...byMerchant.values()].sort((a, b) => b.amount - a.amount).slice(0, limit);
}

function sortInsights(insights: Insight[]): Insight[] {
  return insights.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || (b.monthlySaving ?? 0) - (a.monthlySaving ?? 0)
  );
}

function expensesIn(month: MonthData, category: SpendingCategory): ClassifiedTransaction[] {
  return month.transactions.filter(tx => tx.flow === 'expense' && tx.category === category);
}

function total(transactions: ClassifiedTransaction[]): number {
  return transactions.reduce((sum, tx) => sum + tx.amountRsd, 0);
}

function merchantItems(transactions: ClassifiedTransaction[], limit = 5): InsightItem[] {
  return topMerchants(transactions, limit).map(line => ({
    label: line.merchant,
    amount: line.amount,
    note: line.count > 1 ? `${line.count}×` : undefined
  }));
}

function average(history: MonthData[], pick: (month: MonthData) => number): number | null {
  if (history.length === 0) return null;
  return history.reduce((sum, month) => sum + pick(month), 0) / history.length;
}

// ---------------------------------------------------------------- month rules

function cashInsight(month: MonthData, history: MonthData[]): Insight | null {
  const withdrawals = expensesIn(month, 'Cash');
  const cash = total(withdrawals);
  const deposits = month.summary.cashDeposits;
  const { spending } = month.summary;
  if (cash < CASH_MIN || spending <= 0) return null;

  if (deposits >= cash) {
    return {
      id: 'cash',
      severity: 'low',
      title: `Gotovina: podignuto ${rsd(cash)}, uplaćeno ${rsd(deposits)}`,
      body: 'Ovog meseca je više gotovine vraćeno na račun nego što je podignuto, pa gotovina nije rupa u budžetu.'
    };
  }

  const share = (cash - deposits) / spending;
  if (share < 0.1) return null;

  const avg = average(history, m => m.summary.cash);
  return {
    id: 'cash',
    severity: share >= 0.25 ? 'high' : 'medium',
    title: `Gotovina: ${rsd(cash - deposits)} bez traga`,
    body:
      `Podignuto je ${rsd(cash)} u ${withdrawals.length} ${plural(withdrawals.length, 'podizanju', 'podizanja', 'podizanja')}` +
      (deposits > 0 ? `, a uplaćeno nazad ${rsd(deposits)}` : '') +
      `. To je ${pct(share)} svih troškova za koje se ne vidi na šta su potrošeni, pa taj deo budžeta ne može ni da se analizira ni da se smanji.` +
      (avg !== null ? ` Prosek ostalih uvezenih meseci: ${rsd(avg)} podignuto.` : ''),
    action:
      'Plaćaj karticom gde god može (uz to ide i keš-bek). Kad mora gotovinom, zapiši trošak u Troškiću preko dugmeta + ili glasom, da se zna gde je otišla.'
  };
}

function subscriptionsInsight(month: MonthData): Insight | null {
  const subscriptions = expensesIn(month, 'Subscriptions');
  const amount = total(subscriptions);
  if (amount <= 0) return null;

  // The same service charged more than once (e.g. from both the RSD and the EUR account)
  const byService = new Map<string, ClassifiedTransaction[]>();
  for (const tx of subscriptions) {
    const service = tx.merchantKey.split(' ')[0];
    byService.set(service, [...(byService.get(service) ?? []), tx]);
  }
  const duplicates = [...byService.values()].filter(list => list.length > 1);
  const duplicateSaving = duplicates.reduce((sum, list) => sum + total(list) - Math.max(...list.map(tx => tx.amountRsd)), 0);

  return {
    id: 'subscriptions',
    severity: duplicates.length > 0 ? 'medium' : 'low',
    title: `Pretplate: ${rsd(amount)} mesečno`,
    body:
      `Na godišnjem nivou to je ${rsd(amount * 12)}.` +
      (duplicates.length > 0
        ? ` ${duplicates.map(list => list[0].merchant).join(', ')} je naplaćen više puta ovog meseca — proveri da li postoje dva naloga ili dve pretplate.`
        : ''),
    action: 'Proveri koje se stvarno koriste. Svaka ukinuta pretplata od 800 din mesečno je 9.600 din godišnje.',
    monthlySaving: duplicateSaving > 0 ? Math.round(duplicateSaving) : undefined,
    items: merchantItems(subscriptions, 8)
  };
}

function gamesInsight(month: MonthData, history: MonthData[]): Insight | null {
  const purchases = expensesIn(month, 'Games');
  const amount = total(purchases);
  if (amount < 500) return null;

  const year = month.summary.period.slice(0, 4);
  const yearToDate =
    amount +
    history
      .filter(m => m.summary.period.startsWith(year) && m.summary.period < month.summary.period)
      .reduce((sum, m) => sum + total(expensesIn(m, 'Games')), 0);

  return {
    id: 'games',
    severity: 'medium',
    title: `Kupovine u igricama: ${rsd(amount)}`,
    body:
      `${purchases.length} ${plural(purchases.length, 'kupovina', 'kupovine', 'kupovina')} u aplikacijama ovog meseca.` +
      (yearToDate > amount ? ` Od početka godine (u uvezenim mesecima): ${rsd(yearToDate)}.` : ''),
    action:
      'Ovo je trošak koji može potpuno da otpadne. U Google Play podešavanjima uključi potvrdu (otisak ili lozinku) za svaku kupovinu.',
    monthlySaving: Math.round(amount),
    items: merchantItems(purchases)
  };
}

function smallPurchasesInsight(month: MonthData): Insight | null {
  const small = expensesIn(month, 'Groceries').filter(tx => !tx.travel && tx.amountRsd > 0 && tx.amountRsd < SMALL_PURCHASE_LIMIT);
  if (small.length < SMALL_PURCHASES_MIN_COUNT) return null;

  const amount = total(small);
  const saving = roundTo(amount * 0.2, 100);
  return {
    id: 'small-purchases',
    severity: amount >= 10000 ? 'medium' : 'low',
    title: `${small.length} ${plural(small.length, 'sitna kupovina', 'sitne kupovine', 'sitnih kupovina')} u prodavnicama`,
    body: `Ukupno ${rsd(amount)}, u proseku ${rsd(amount / small.length)} po kupovini — skoro svaki dan po jedna. Usputne kupovine se najlakše otmu kontroli.`,
    action: `Jedna planirana veća kupovina nedeljno, sa spiskom, znači manje usputnih stvari. Ako se preskoči svaka peta usputna kupovina, ostaje oko ${rsd(saving)} mesečno.`,
    monthlySaving: saving,
    items: merchantItems(small, 4)
  };
}

function categorySpikeInsights(month: MonthData, history: MonthData[]): Insight[] {
  if (history.length === 0) return [];
  const insights: Insight[] = [];

  for (const category of COMPARABLE) {
    const amount = month.categoryTotals.get(category) ?? 0;
    const avg = average(history, m => m.categoryTotals.get(category) ?? 0)!;
    const label = SPENDING_CATEGORIES[category].label;

    if (amount > avg * SPIKE_RATIO && amount - avg >= SPIKE_MIN_RSD) {
      const rows = expensesIn(month, category);
      const largest = rows.reduce((max, tx) => (tx.amountRsd > max.amountRsd ? tx : max), rows[0]);
      const oneOff = largest && largest.amountRsd >= (amount - avg) * 0.6;
      // With a tiny average (few months, or most of it still under "Ostalo") a percentage is just noise
      const thinBase = avg < SPIKE_MIN_RSD;
      insights.push(
        thinBase && !oneOff
          ? {
              id: `spike-${category}`,
              severity: 'low',
              title: `${label}: ${rsd(amount)} ovog meseca`,
              body: `U ostalim uvezenim mesecima ovde je bilo u proseku samo ${rsd(avg)}, pa poređenje još nije pouzdano.`,
              action: 'Ako ovo postaje redovno, odredi koliko mesečno sme da ode na ovu kategoriju i drži se toga.',
              items: merchantItems(rows, 3)
            }
          : oneOff
            ? {
                id: `spike-${category}`,
                severity: 'low',
                title: `${label}: ${rsd(amount - avg)} više nego inače`,
                body: `Ovog meseca ${rsd(amount)}, a prosek ostalih uvezenih meseci je ${rsd(avg)}. Najveći deo je jedna stavka: ${largest.merchant} ${rsd(largest.amountRsd)}.`,
                action:
                  'Ako je to jednokratan trošak, sve je u redu. Ako se ponavlja (npr. servis, veća kupovina), planiraj ga unapred kao poseban iznos.',
                items: merchantItems(rows, 3)
              }
            : {
                id: `spike-${category}`,
                severity: 'medium',
                title:
                  amount / avg - 1 <= 2
                    ? `${label}: ${pct(amount / avg - 1)} iznad proseka`
                    : `${label}: ${rsd(amount - avg)} više nego inače`,
                body: `Ovog meseca ${rsd(amount)}, a prosek ostalih uvezenih meseci je ${rsd(avg)}.`,
                action: `Cilj za sledeći mesec: vratiti se na oko ${rsd(roundTo(avg, 1000))}.`,
                monthlySaving: Math.round(amount - avg),
                items: merchantItems(rows, 3)
              }
      );
    } else if (avg > 0 && amount < avg * 0.75 && avg - amount >= SPIKE_MIN_RSD) {
      insights.push({
        id: `drop-${category}`,
        severity: 'positive',
        title: `${label}: ${rsd(avg - amount)} manje nego inače`,
        body: `Ovog meseca ${rsd(amount)}, a prosek ostalih uvezenih meseci je ${rsd(avg)}. Tako nastavi.`
      });
    }
  }

  const spikes = insights.filter(i => i.severity !== 'positive').sort((a, b) => (b.monthlySaving ?? 0) - (a.monthlySaving ?? 0));
  const drops = insights.filter(i => i.severity === 'positive');
  return [...spikes.slice(0, 3), ...drops.slice(0, 1)];
}

function idleMoneyInsight(month: MonthData): Insight | null {
  const current = month.accounts.find(a => a.kind === 'current' && a.currency === 'RSD');
  const savings = month.accounts.find(a => a.kind === 'savings' && a.currency === 'RSD');
  if (!current || !savings || savings.interestRate === null) return null;

  const gap = savings.interestRate - (current.interestRate ?? 0);
  if (gap <= 0) return null;

  const buffer = Math.max(30000, roundTo((month.summary.variable + month.summary.cash) * 0.5, 5000));
  const idle = current.averageDailyBalance - buffer;
  if (idle < IDLE_MIN_RSD) return null;

  const interest = (idle * gap) / 100 / 12;
  return {
    id: 'idle-money',
    severity: 'low',
    title: 'Novac na tekućem ne zarađuje',
    body:
      `Na tekućem računu je u proseku stajalo ${rsd(current.averageDailyBalance)} uz kamatu od ${current.interestRate ?? 0}%. ` +
      `Dinarska štednja po viđenju u istoj banci nosi ${savings.interestRate}%, a sa nje se novac vraća na tekući bilo kad.`,
    action: `Na dan plate prebaci sve iznad oko ${rsd(buffer)} na štednju po viđenju, pa skidaj po potrebi. To je oko ${rsd(interest)} kamate mesečno.`,
    monthlySaving: Math.round(interest)
  };
}

function savingsRateInsight(month: MonthData, history: MonthData[]): Insight | null {
  const { inflows, spending, net, savingsRate, transfersIn, transfersOut, cashDeposits } = month.summary;
  if (inflows <= 0 || savingsRate === null) return null;

  const salaries = month.transactions.filter(tx => tx.flow === 'income' && tx.category === 'Salary').length;
  const usuallyPaid = history.some(m => m.transactions.some(tx => tx.flow === 'income' && tx.category === 'Salary'));
  const notes: string[] = [];
  if (salaries === 0 && usuallyPaid && transfersIn === 0) {
    notes.push(
      'Plata ovog meseca nije legla na ovaj račun (možda je stigla krajem prethodnog), pa rezultat izgleda lošije nego što jeste.'
    );
  }
  if (salaries > 1) notes.push(`Ovog meseca su legle ${salaries} plate, pa rezultat izgleda bolje nego što jeste.`);
  if (transfersIn > 0) notes.push(`Prilivi uključuju ${rsd(transfersIn)} prebačenih sa drugog računa.`);
  if (cashDeposits > 0) {
    notes.push(
      `Prilivi uključuju i ${rsd(cashDeposits)} uplaćene gotovine — ako je to gotovina podignuta ranijih meseci, ovaj mesec izgleda bolje nego što jeste.`
    );
  }
  if (transfersOut > 0)
    notes.push(`Na drugi račun je, pored rate za stan, prebačeno još ${rsd(transfersOut)} — to nije trošak, ali je otišlo sa ovog računa.`);
  const suffix = notes.length > 0 ? ` ${notes.join(' ')}` : '';

  const target = roundTo(inflows * 0.1, 5000);
  const figures = `Prilivi ${rsd(inflows)}, troškovi ${rsd(spending)}${transfersOut > 0 ? `, prebačeno na drugi račun ${rsd(transfersOut)}` : ''}.`;
  if (net < 0) {
    return {
      id: 'savings-rate',
      severity: 'high',
      title: `Potrošeno ${rsd(-net)} više nego što je ušlo`,
      body: `${figures} Razlika je pokrivena sa štednje ili iz ranijih ušteda.${suffix}`,
      action:
        'Prvi cilj: da troškovi ne pređu prilive. Najbrže se to postiže preko ostalih predloga (gotovina, sitne kupovine, kategorije iznad proseka).'
    };
  }
  if (savingsRate < 0.1) {
    return {
      id: 'savings-rate',
      severity: 'medium',
      title: `Ušteđeno samo ${pct(savingsRate)} priliva`,
      body: `${figures} Ušteđeno ${rsd(net)}.${suffix}`,
      action: `Postavi trajni nalog: na dan plate ${rsd(target)} automatski na štednju (oko 10% priliva). Ono što se ne vidi na tekućem, lakše se ne potroši.`
    };
  }
  if (savingsRate >= 0.2) {
    return {
      id: 'savings-rate',
      severity: 'positive',
      title: `Ušteđeno ${pct(savingsRate)} priliva`,
      body: `${figures} Ušteđeno ${rsd(net)} — preko 20%, odlično.${suffix}`
    };
  }
  return null;
}

function loansInsight(month: MonthData): Insight | null {
  const home = month.categoryTotals.get('HomeLoan') ?? 0;
  const car = month.categoryTotals.get('CarLoan') ?? 0;
  const loans = home + car;
  const { income } = month.summary;
  const hasSalary = month.transactions.some(tx => tx.flow === 'income' && tx.category === 'Salary');
  if (!hasSalary || income <= 0 || loans / income < 0.3) return null;

  return {
    id: 'loans',
    severity: 'low',
    title: `Krediti nose ${pct(loans / income)} prihoda`,
    body: `Stambeni ${rsd(home)} + auto ${rsd(car)} = ${rsd(loans)} ovog meseca. Od prihoda (${rsd(income)}) za sve ostalo ostaje ${rsd(income - loans)}.`,
    action: 'Kad se jedan kredit otplati, istu ratu nastavi da odvajaš — ali na štednju. Budžet je već navikao da bez nje živi.'
  };
}

function savingsTrendInsight(month: MonthData, history: MonthData[]): Insight | null {
  const { savingsOpening, savingsClosing } = month.summary;
  const change = savingsClosing - savingsOpening;
  if (Math.abs(change) < SAVINGS_MOVE_MIN_RSD) return null;

  const earliest = [...history, month].sort((a, b) => a.summary.period.localeCompare(b.summary.period))[0];
  const sinceStart =
    earliest !== month
      ? ` Od početka ${monthName(earliest.summary.period)}a: ${rsd(earliest.summary.savingsOpening)} → ${rsd(savingsClosing)}.`
      : '';

  if (change < 0) {
    return {
      id: 'savings-trend',
      severity: 'high',
      title: `Štednja je pala za ${rsd(-change)}`,
      body: `Na štednji je početkom meseca bilo ${rsd(savingsOpening)}, a na kraju ${rsd(savingsClosing)}.${sinceStart}`,
      action:
        'Sa štednje skidaj samo za unapred planirane veće troškove. Ako je štednja pokrivala svakodnevne troškove, to je znak da mesečni budžet treba spustiti.'
    };
  }
  return {
    id: 'savings-trend',
    severity: 'positive',
    title: `Štednja je porasla za ${rsd(change)}`,
    body: `Na štednji je početkom meseca bilo ${rsd(savingsOpening)}, a na kraju ${rsd(savingsClosing)}.${sinceStart}`
  };
}

function bankFeesInsight(month: MonthData): Insight | null {
  const fees = expensesIn(month, 'BankFees');
  const amount = total(fees);
  if (amount < 200) return null;
  return {
    id: 'bank-fees',
    severity: 'low',
    title: `Bankarske naknade: ${rsd(amount)}`,
    body: 'Provizije, porezi na kamatu i slične naknade banke ovog meseca.',
    action: 'Proveri da li je neka mogla da se izbegne, npr. plaćanje karticom umesto naloga ka inostranstvu.',
    items: merchantItems(fees)
  };
}

function uncategorizedInsight(month: MonthData): Insight | null {
  const other = expensesIn(month, 'Other');
  const amount = total(other);
  const { variable } = month.summary;
  if (amount < 10000 || variable <= 0 || amount / variable < 0.1) return null;
  return {
    id: 'uncategorized',
    severity: 'low',
    title: `${rsd(amount)} je u kategoriji „Ostalo“`,
    body: `To je ${pct(amount / variable)} promenljivih troškova za koje Troškić ne zna šta su.`,
    action:
      'U pregledu „Cela godina“ otvori „Razvrstaj Ostalo“ i izaberi kategoriju za svakog trgovca — važi za sve mesece, pa su i predlozi tačniji.',
    items: merchantItems(other, 4)
  };
}

export function buildMonthInsights(month: MonthData, history: MonthData[]): Insight[] {
  const insights = [
    savingsRateInsight(month, history),
    savingsTrendInsight(month, history),
    cashInsight(month, history),
    gamesInsight(month, history),
    smallPurchasesInsight(month),
    ...categorySpikeInsights(month, history),
    subscriptionsInsight(month),
    idleMoneyInsight(month),
    loansInsight(month),
    bankFeesInsight(month),
    uncategorizedInsight(month)
  ].filter((insight): insight is Insight => insight !== null);
  return sortInsights(insights);
}

// ----------------------------------------------------------------- year rules

export function buildYearInsights(year: number, months: MonthData[], calendar: YearMonth[]): Insight[] {
  const insights: Insight[] = [];
  const missing = calendar.filter(m => m.status === 'missing');

  if (missing.length > 0) {
    insights.push({
      id: 'missing-statements',
      severity: 'medium',
      title: `Fali ${missing.length} ${missing.length === 1 ? 'izvod' : 'izvoda'} za ${year}.`,
      body: `Nema izvoda za: ${missing.map(m => monthName(m.period)).join(', ')}. Bez njih godišnji zbirovi i proseci nisu potpuni.`,
      action: 'Preuzmi mesečne izvode iz Yettel aplikacije (PDF) i uvezi ih ovde.'
    });
  }
  if (months.length === 0) return insights;

  const cash = months.reduce((sum, m) => sum + m.summary.cash, 0);
  const deposits = months.reduce((sum, m) => sum + m.summary.cashDeposits, 0);
  const spending = months.reduce((sum, m) => sum + m.summary.spending, 0);
  const netCash = cash - deposits;
  if (cash >= CASH_MIN && spending > 0 && netCash / spending >= 0.1) {
    insights.push({
      id: 'year-cash',
      severity: netCash / spending >= 0.25 ? 'high' : 'medium',
      title: `Gotovina: ${rsd(netCash)} ${inMonths(months.length)}`,
      body:
        `Podignuto ${rsd(cash)}${deposits > 0 ? `, vraćeno na račun ${rsd(deposits)}` : ''}. ` +
        `Neto ${rsd(netCash)} (${pct(netCash / spending)} troškova, u proseku ${rsd(netCash / months.length)} mesečno) za koje se ne zna na šta je otišlo.`,
      action: 'Najveći pojedinačni korak ka jasnijem budžetu: manje podizanja, više plaćanja karticom.',
      items: months.map(m => ({
        label: monthName(m.summary.period),
        amount: m.summary.cash,
        note: m.summary.cashDeposits > 0 ? `uplaćeno ${rsd(m.summary.cashDeposits)}` : undefined
      }))
    });
  } else if (cash >= CASH_MIN && deposits > 0) {
    insights.push({
      id: 'year-cash',
      severity: 'low',
      title: `Gotovina: podignuto ${rsd(cash)}, vraćeno ${rsd(deposits)}`,
      body: 'Veći deo podignute gotovine je kasnije uplaćen nazad na račun (npr. evri na deviznu štednju), pa gotovina nije velika rupa u budžetu.',
      items: months.map(m => ({
        label: monthName(m.summary.period),
        amount: m.summary.cash,
        note: m.summary.cashDeposits > 0 ? `uplaćeno ${rsd(m.summary.cashDeposits)}` : undefined
      }))
    });
  }

  const subscriptions = months.flatMap(m => expensesIn(m, 'Subscriptions'));
  if (subscriptions.length > 0) {
    const perMonth = total(subscriptions) / months.length;
    insights.push({
      id: 'year-subscriptions',
      severity: 'low',
      title: `Pretplate: oko ${rsd(perMonth * 12)} godišnje`,
      body: `U proseku ${rsd(perMonth)} mesečno u uvezenim mesecima.`,
      action: 'Jednom godišnje prođi kroz listu i ugasi ono što se ne koristi.',
      items: merchantItems(subscriptions, 8).map(item => ({ ...item, amount: Math.round(item.amount / months.length), note: 'mesečno' }))
    });
  }

  const games = months.flatMap(m => expensesIn(m, 'Games'));
  if (total(games) >= 1000) {
    insights.push({
      id: 'year-games',
      severity: 'medium',
      title: `Igrice i aplikacije: ${rsd(total(games))}`,
      body: `${games.length} ${plural(games.length, 'kupovina', 'kupovine', 'kupovina')} ${inMonths(months.length)}, u proseku ${rsd(total(games) / months.length)} mesečno.`,
      action: 'Uključi potvrdu za svaku kupovinu u Google Play-u — ovaj trošak može potpuno da nestane.',
      monthlySaving: Math.round(total(games) / months.length),
      items: merchantItems(games, 3)
    });
  }

  const first = months[0];
  const last = months[months.length - 1];
  const savingsChange = last.summary.savingsClosing - first.summary.savingsOpening;
  if (months.length > 1 && Math.abs(savingsChange) >= SAVINGS_MOVE_MIN_RSD) {
    insights.push({
      id: 'year-savings-trend',
      severity: savingsChange < 0 ? 'high' : 'positive',
      title: savingsChange < 0 ? `Štednja je pala za ${rsd(-savingsChange)}` : `Štednja je porasla za ${rsd(savingsChange)}`,
      body: `Početkom ${monthName(first.summary.period)}a ${rsd(first.summary.savingsOpening)}, krajem ${monthName(last.summary.period)}a ${rsd(last.summary.savingsClosing)}.`,
      action:
        savingsChange < 0
          ? 'Odredi mesečni iznos koji ide na štednju odmah po prijemu plate i ne diraj ga za svakodnevne troškove.'
          : undefined,
      items: months.map(m => ({ label: monthName(m.summary.period), amount: m.summary.savingsClosing, note: 'na kraju meseca' }))
    });
  }

  const inflows = months.reduce((sum, m) => sum + m.summary.inflows, 0);
  const net = months.reduce((sum, m) => sum + m.summary.net, 0);
  const cashNote = deposits > 0 ? ` Prilivi uključuju ${rsd(deposits)} uplaćene gotovine.` : '';
  if (inflows > 0) {
    const rate = net / inflows;
    insights.push({
      id: 'year-savings-rate',
      severity: rate < 0 ? 'high' : rate < 0.1 ? 'medium' : rate >= 0.2 ? 'positive' : 'low',
      title: rate < 0 ? `Potrošeno ${rsd(-net)} više nego što je ušlo` : `Ušteđeno ${pct(rate)} priliva`,
      body: `${inMonths(months.length).replace(/^u/, 'U')}: prilivi ${rsd(inflows)}, troškovi ${rsd(spending)}, ušteđeno ${rsd(net)}.${cashNote}`,
      action:
        rate < 0.1
          ? `Cilj: bar 10% priliva (${rsd((inflows / months.length) * 0.1)} mesečno) automatski na štednju na dan plate.`
          : undefined
    });
  }

  return sortInsights(insights);
}
