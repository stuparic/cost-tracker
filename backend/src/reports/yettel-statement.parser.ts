import { AccountKind, ArchivedTransaction, ParsedStatement, StatementAccount } from './interfaces/statement-archive.interface';

/**
 * Deterministic parser for Yettel Bank monthly statements ("IZVOD"), working on
 * the text pdf-parse extracts. pdf-parse drops the column layout, so a row's
 * dates and amounts come out glued together, e.g.
 *
 *   2GooglePay UNIVEREXPORT-MP046, NOVI SAD
 *   Ref. [94745377175001]
 *   01.06.202601.06.2026159,990,00527.508,08      <- booked, value, isplata, uplata, stanje
 *
 * Every amount has exactly two decimals after a comma, which makes the split
 * unambiguous. Each row is then checked against the running balance the bank
 * prints, so a mis-read row fails loudly instead of skewing the reports.
 */

export class StatementParseError extends Error {}

const DATE = String.raw`(\d{2})\.(\d{2})\.(\d{4})`;
const AMOUNT = String.raw`-?\d{1,3}(?:\.\d{3})*,\d{2}`;
const AMOUNTS_LINE = new RegExp(`^${DATE}${DATE}(${AMOUNT})(${AMOUNT})(${AMOUNT})$`);
const ACCOUNT_LINE = /^Broj računa:\s*(\d{6,})/;
const CURRENCY_LINE = /^Izvod po valuti:\s*([A-Z]{3})/;
const PERIOD_LINE = new RegExp(`^Promet za period:\\s*${DATE}\\s*-\\s*${DATE}`);
const CURRENT_RATE_LINE = /^Kamatna stopa na pozitivno stanje:\s*([\d.,]+)\s*%/;
const SAVINGS_RATE_LINE = /^Primenjena NKS:.*?([\d.,]+)\s*%/;
const STATEMENT_NO_LINE = /^Izvod broj:\s*(\d+)/;
const REF_LINE = /^Ref\.\s*\[(\d+)\](.*)$/;
const ORIGINAL_AMOUNT = /Originalni iznos\s*:\s*([\d.,]+)\s*Originalna valuta\s*:\s*([A-Z]{3})/;

/** Page furniture repeated on every page; never part of a transaction description */
const FOOTER_LINE =
  /^(Yettel Bank|Omladinskih brigada|11070 Novi Beograd|Račun Banke|PIB:|Matični Broj|www\.yettelbank|Korisnički servis|Datum izvoda|Izvod broj|Štampano|\d+\s*od\s*\d+$|Multivalutni račun|Dinarska štednja|Devizna štednja|Tekući račun)/;

const SAVINGS_LABELS: Record<string, string> = {
  RSD: 'Dinarska štednja po viđenju',
  EUR: 'Devizna štednja po viđenju'
};

export function parseAmount(value: string): number {
  return Number(value.replace(/\./g, '').replace(',', '.'));
}

function isoDate(day: string, month: string, year: string): string {
  return `${year}-${month}-${day}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

interface SectionBuilder {
  accountNo: string;
  currency: string | null;
  kind: AccountKind;
  interestRate: number | null;
  opening: number | null;
  closing: number | null;
  rows: ArchivedTransaction[];
}

interface PendingRow {
  rowNo: number;
  description: string[];
  ref: string | null;
  originalAmount: number | null;
  originalCurrency: string | null;
}

export function parseYettelStatement(text: string): ParsedStatement {
  if (!/IZVOD/.test(text) || !/yettel/i.test(text)) {
    throw new StatementParseError('Ovo ne izgleda kao Yettel Bank izvod');
  }

  const lines = text.split(/\r?\n/).map(line => line.replace(/\s+/g, ' ').trim());

  let statementNo: number | null = null;
  let periodStart: string | null = null;
  let periodEnd: string | null = null;

  const sections: SectionBuilder[] = [];
  let section: SectionBuilder | null = null;
  let mode: 'header' | 'opening' | 'rows' | 'closing' = 'header';
  let pending: PendingRow | null = null;

  for (const line of lines) {
    if (!line) continue;

    const statementNoMatch = line.match(STATEMENT_NO_LINE);
    if (statementNoMatch) {
      statementNo = statementNo ?? Number(statementNoMatch[1]);
      continue;
    }

    const accountMatch = line.match(ACCOUNT_LINE);
    if (accountMatch) {
      section = { accountNo: accountMatch[1], currency: null, kind: 'current', interestRate: null, opening: null, closing: null, rows: [] };
      sections.push(section);
      mode = 'header';
      pending = null;
      continue;
    }
    if (!section) continue;

    if (mode === 'header') {
      const currencyMatch = line.match(CURRENCY_LINE);
      if (currencyMatch) {
        section.currency = currencyMatch[1];
        continue;
      }
      const periodMatch = line.match(PERIOD_LINE);
      if (periodMatch) {
        periodStart = periodStart ?? isoDate(periodMatch[1], periodMatch[2], periodMatch[3]);
        periodEnd = periodEnd ?? isoDate(periodMatch[4], periodMatch[5], periodMatch[6]);
        continue;
      }
      const currentRate = line.match(CURRENT_RATE_LINE);
      if (currentRate) {
        section.kind = 'current';
        section.interestRate = Number(currentRate[1].replace(',', '.'));
        continue;
      }
      const savingsRate = line.match(SAVINGS_RATE_LINE);
      if (savingsRate) {
        section.kind = 'savings';
        section.interestRate = Number(savingsRate[1].replace(',', '.'));
        continue;
      }
      if (line === 'Prethodno stanje') mode = 'opening';
      continue;
    }

    if (mode === 'opening') {
      const amounts = line.match(AMOUNTS_LINE);
      if (amounts) section.opening = parseAmount(amounts[9]);
      if (line.startsWith('Izvršeni nalozi')) mode = 'rows';
      continue;
    }

    if (mode === 'closing') {
      const amounts = line.match(AMOUNTS_LINE);
      if (amounts) {
        section.closing = parseAmount(amounts[9]);
        mode = 'header';
      }
      continue;
    }

    // mode === 'rows'
    if (line === 'Novo stanje') {
      mode = 'closing';
      pending = null;
      continue;
    }

    const amounts = line.match(AMOUNTS_LINE);
    if (amounts && pending) {
      const bookingDate = isoDate(amounts[1], amounts[2], amounts[3]);
      section.rows.push({
        id: '', // assigned once the period is known
        accountNo: section.accountNo,
        currency: section.currency ?? 'RSD',
        rowNo: pending.rowNo,
        bookingDate,
        valueDate: isoDate(amounts[4], amounts[5], amounts[6]),
        description: pending.description.join(' ').trim(),
        ref: pending.ref,
        debit: parseAmount(amounts[7]),
        credit: parseAmount(amounts[8]),
        balanceAfter: parseAmount(amounts[9]),
        originalAmount: pending.originalAmount,
        originalCurrency: pending.originalCurrency
      });
      pending = null;
      continue;
    }

    const refMatch = line.match(REF_LINE);
    if (refMatch && pending) {
      pending.ref = refMatch[1];
      const original = refMatch[2].match(ORIGINAL_AMOUNT);
      if (original) {
        pending.originalAmount = parseAmount(original[1].includes(',') ? original[1] : `${original[1]},00`);
        pending.originalCurrency = original[2];
      }
      continue;
    }

    // Rows are numbered 1..n and the number is glued to the description. Match on
    // the expected number as a prefix, since a description may itself start with
    // digits ("5" + "213 - MAXI 217").
    const expectedRowNo = section.rows.length + 1;
    const rowPrefix = String(expectedRowNo);
    if (!pending && line.length > rowPrefix.length && line.startsWith(rowPrefix) && !FOOTER_LINE.test(line)) {
      const description = line.slice(rowPrefix.length).trim();
      pending = { rowNo: expectedRowNo, description: [description], ref: null, originalAmount: null, originalCurrency: null };
      continue;
    }

    // A wrapped description line ("... KNEZ MIHAILOVA 1, BEOGRAD" / "STARI GRAD"), or an
    // original-amount note that landed on its own line.
    if (pending && !pending.ref && !FOOTER_LINE.test(line)) {
      pending.description.push(line);
    } else if (pending?.ref && ORIGINAL_AMOUNT.test(line)) {
      const original = line.match(ORIGINAL_AMOUNT)!;
      pending.originalAmount = parseAmount(original[1].includes(',') ? original[1] : `${original[1]},00`);
      pending.originalCurrency = original[2];
    }
  }

  if (!periodStart || !periodEnd) {
    throw new StatementParseError('Na izvodu nije pronađen period prometa');
  }
  const period = periodStart.slice(0, 7);
  const lastDay = new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0)).getUTCDate();
  if (!periodStart.endsWith('-01') || periodEnd !== `${period}-${String(lastDay).padStart(2, '0')}`) {
    throw new StatementParseError(`Izvod mora da pokriva ceo jedan mesec (ovaj pokriva ${periodStart} – ${periodEnd})`);
  }

  const accounts: StatementAccount[] = [];
  const transactions: ArchivedTransaction[] = [];

  for (const s of sections) {
    const currency = s.currency ?? 'RSD';
    if (s.opening === null || s.closing === null) {
      throw new StatementParseError(`Nije pročitano početno/krajnje stanje za račun ${s.accountNo} (${currency})`);
    }
    verifyRunningBalance(s, currency);

    accounts.push({
      accountNo: s.accountNo,
      kind: s.kind,
      currency,
      label: s.kind === 'savings' ? (SAVINGS_LABELS[currency] ?? `Štednja (${currency})`) : `Tekući račun (${currency})`,
      interestRate: s.interestRate,
      openingBalance: s.opening,
      closingBalance: s.closing
    });
    for (const row of s.rows) {
      transactions.push({ ...row, id: `${period}:${s.accountNo}:${currency}:${row.rowNo}` });
    }
  }

  if (accounts.length === 0) {
    throw new StatementParseError('Na izvodu nije pronađen nijedan račun');
  }

  return { bank: 'yettel', statementNo, period, periodStart, periodEnd, accounts, transactions };
}

/** Opening balance + every row must reproduce each printed "Stanje" and the closing balance */
function verifyRunningBalance(section: SectionBuilder, currency: string): void {
  let balance = section.opening!;
  for (const row of section.rows) {
    balance = round2(balance - row.debit + row.credit);
    if (Math.abs(balance - row.balanceAfter) > 0.005) {
      throw new StatementParseError(
        `Saldo se ne slaže na računu ${section.accountNo} (${currency}), red ${row.rowNo}: izračunato ${balance}, na izvodu ${row.balanceAfter}`
      );
    }
  }
  if (Math.abs(balance - section.closing!) > 0.005) {
    throw new StatementParseError(
      `Krajnje stanje se ne slaže na računu ${section.accountNo} (${currency}): izračunato ${balance}, na izvodu ${section.closing}`
    );
  }
}
