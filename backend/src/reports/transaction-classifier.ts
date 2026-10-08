import {
  CAR_LOAN_PATTERN,
  HOME_LOAN_CAP_EUR,
  KNOWN_INCOME_SOURCES,
  OWN_NAME_PATTERN,
  SELF_TRANSFER_DEBIT_PATTERN
} from '../constants/household-rules';
import { ArchivedTransaction, CategoryOverrides, ParsedStatement } from './interfaces/statement-archive.interface';
import { IncomeCategory, INCOME_CATEGORIES, isSpendingCategory, SpendingCategory, TransactionFlow } from './report-categories';

/** Override value meaning "money moved to/from my own account elsewhere - not income, not spending" */
export const TRANSFER_OVERRIDE = 'Transfer';

export interface ClassifiedTransaction {
  id: string;
  accountNo: string;
  currency: string;
  bookingDate: string;
  description: string;
  merchant: string;
  merchantKey: string;
  direction: 'debit' | 'credit';
  /** In the account's own currency, always positive */
  amount: number;
  /** In RSD. Positive, except refunds which reduce spending (negative) */
  amountRsd: number;
  flow: TransactionFlow;
  /** SpendingCategory for expenses, IncomeCategory for income and transfers in, null for internal rows and transfers out */
  category: string | null;
  /** Paid abroad (foreign merchant, card in a foreign currency) */
  travel: boolean;
  overridden: boolean;
  originalAmount: number | null;
  originalCurrency: string | null;
}

/** Ordered: the first matching rule wins */
const SPENDING_RULES: Array<[SpendingCategory, RegExp]> = [
  ['BankFees', /provizij|naknad|porez - |porez na kamat|[cč]lanarin|odr[zž]avanj[ea] ra[cč]una/i],
  ['Taxes', /bud[žz]et|poresk|\btaks[ae]\b|kazn[ae]/i],
  ['Utilities', /trajn(og|i) nalog|infostan|elektrodistribuc|\beps\b|vodovod|toplan|\bsbb\b|\bmts\b|telenor|a1 srbija/i],
  ['Insurance', /osiguranj|generali|ddor|\bdunav\b|wiener|triglav|uniqa|grawe|allianz/i],
  [
    'Subscriptions',
    /netflix|youtube|spotify|deezer|claude\.ai|openai|chatgpt|theverge|\bhbo\b|disney|apple\.com|icloud|google one|google storage|microsoft|adobe|dropbox|patreon|substack|github|notion|1password|duolingo|amazon prime|arena sport|eon tv/i
  ],
  ['Games', /^google \*|google play|steam|playstation|xbox|nintendo|supercell|app store/i],
  ['Charity', /\bfond(a)?\b|de[cč]ijeg fo|unicef|crveni krst|humanitar|donacij|dobrotvor/i],
  ['Work', /\blynx\b|cowork/i],
  ['Travel', /\bkamp\b|camp|hotel|hostel|booking\.com|airbnb|apartman|aerodrom|airport|ryanair|wizz|air serbia|flixbus/i],
  [
    'Transport',
    /coral|\bomv\b|\bnis\b|petrol|\bmol\b|mol[a-z]*croatia|tifon|lukoil|gazprom|radun avia|knez petrol|parking|taxi|\d+tx\b|putarin|vinjet|vintrica|\bhac\b|novi sad \d|mtl auto|auto servis|vulkaniz|tehni[cč]ki pregled|bus plus/i
  ],
  ['Health', /apotek|pharm|\bbenu\b|lilly|dom zdravlja|bolnic|laborator|beo-lab|ordinacij|stomatolog|zubar|optik|medigroup|poliklinik/i],
  [
    'Groceries',
    /lidl|maxi|\bidea\b|tempo|univerexport|mikro ?market|mercator|metro|\baman\b|\bdis\b|\broda\b|gomex|\bvero\b|spar|aldi|samopostre|market|baker|pekar|mesar|^(googlepay )?mp\d+/i
  ],
  [
    'Dining',
    /restoran|restaurant|\bpub\b|caff?e|kafan|kavarn|pizz|napoletan|trattori|burger|kebab|shawarma|sushi|thai|glovo|wolt|donesi|bistro|gastro|grill|ugostitelj|^(googlepay )?ur |sladoled|slasti[cč]arn|slascicarn|snack|kitajska/i
  ],
  ['Fun', /cinestar|cineplexx|bioskop|skakaonica|aquapark|akvapark|teretan|fitness|\bgym\b|pozori|koncert|eventim/i],
  [
    'Shopping',
    /ikea|zara|h&m|decathlon|\bdm\b|converse|fashion|jysk|pepco|gigatron|tehnomanija|okov|hidroponika|suvenir|stampa sistem|bike|emmezeta|lesnina|new yorker|sport vision|intersport|amazon|aliexpress|temu|shein/i
  ]
];

/** Categories that stay what they are even when paid in a foreign currency (online services, fees) */
const NOT_TRAVEL: ReadonlySet<string> = new Set([
  'Subscriptions',
  'Games',
  'BankFees',
  'Insurance',
  'Taxes',
  'Utilities',
  'Charity',
  'Work'
]);

/** "Ivica s", "Petar P." - a private person, not a business */
const PRIVATE_PERSON = /^[A-ZČĆŽŠĐ][a-zčćžšđ]+ [A-Za-zČĆŽŠĐčćžšđ]\.?$/;
const REFUND = /po nalogu gra[dđ]ana|povra[cć]aj|storno|reklamacij/i;

/** Serbian banks print a company payer in capitals ("ACME DOO, BEOGRAD"); a large payment from one is the salary */
const COMPANY_PAYER = /^[A-ZŠĐČĆŽ0-9 .&-]{4,}$/;
const SALARY_MIN_RSD = 100000;

export function normalizeMerchant(merchant: string): string {
  return (merchant || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

function titleCase(value: string): string {
  if (/[a-zčćžšđ]/.test(value)) return value; // already mixed case - leave as printed
  return value
    .split(' ')
    .map(word =>
      word
        .split('-')
        .map(part => (/\d/.test(part) || part.length <= 2 ? part : part.charAt(0) + part.slice(1).toLowerCase()))
        .join('-')
    )
    .join(' ');
}

/** Human-friendly counterparty name from the raw statement description */
export function cleanMerchant(description: string): string {
  const text = description.replace(/\s*Kurs:.*$/i, '').trim();

  if (/^Podizanje gotovine/i.test(text)) return 'Podizanje gotovine';
  if (/^Uplata gotovine/i.test(text)) return 'Uplata gotovine';
  if (/^Interni transfer/i.test(text)) return 'Interni prenos';
  if (/^Naplata trajnog naloga/i.test(text)) return 'Trajni nalog';
  if (/^Kamata/i.test(text)) return 'Kamata na štednju';
  if (/^Porez - /i.test(text)) return 'Porez na kamatu';

  const google = text.match(/^GOOGLE \*([^,]+)/i);
  if (google) return /youtube/i.test(google[1]) ? 'YouTube' : `Google Play – ${google[1].trim()}`;

  const name = text
    .replace(/^GooglePay\s+/i, '')
    .replace(/^PAYSPOT\s+DOO\*/i, '')
    .replace(/^QR placanja\s*-\s*/i, '')
    .split(',')[0]
    .trim();
  return titleCase(name || text);
}

function toRsd(amount: number, currency: string, eurRate: number): number {
  return currency === 'EUR' ? Math.round(amount * eurRate * 100) / 100 : amount;
}

function spendingRule(text: string): SpendingCategory | null {
  for (const [category, pattern] of SPENDING_RULES) {
    if (pattern.test(text)) return category;
  }
  return null;
}

function isForeign(tx: ArchivedTransaction): boolean {
  return /Kurs:/i.test(tx.description) || (tx.originalCurrency !== null && tx.originalCurrency !== tx.currency);
}

function classifyCredit(tx: ArchivedTransaction, amountRsd: number): { flow: TransactionFlow; category: string | null; refund?: boolean } {
  const text = tx.description;
  if (/^Interni transfer/i.test(text)) return { flow: 'internal', category: null };
  if (/^Uplata gotovine/i.test(text)) return { flow: 'cash_deposit', category: 'CashDeposit' };
  if (/kamat/i.test(text)) return { flow: 'income', category: 'Interest' };
  if (/cashback/i.test(text)) return { flow: 'income', category: 'Cashback' };
  if (OWN_NAME_PATTERN.test(text)) return { flow: 'transfer_in', category: 'OwnAccount' };

  const known = KNOWN_INCOME_SOURCES.find(({ pattern }) => pattern.test(text));
  if (known && known.incomeType in INCOME_CATEGORIES) return { flow: 'income', category: known.incomeType };

  // Money coming back from a shop or a cancelled payment order reduces spending
  if (REFUND.test(text)) return { flow: 'expense', category: 'Other', refund: true };
  if (COMPANY_PAYER.test(text.split(',')[0].trim()) && amountRsd >= SALARY_MIN_RSD) return { flow: 'income', category: 'Salary' };
  const spending = spendingRule(text);
  if (spending) return { flow: 'expense', category: spending, refund: true };

  return { flow: 'income', category: 'OtherIncome' };
}

function classifyDebit(tx: ArchivedTransaction): { flow: TransactionFlow; category: string | null } {
  const text = tx.description;
  if (/^Interni transfer/i.test(text)) return { flow: 'internal', category: null };
  if (/^Podizanje gotovine/i.test(text)) return { flow: 'expense', category: 'Cash' };
  if (CAR_LOAN_PATTERN.test(text)) return { flow: 'expense', category: 'CarLoan' };

  const rule = spendingRule(text);
  if (rule) {
    if (isForeign(tx) && !NOT_TRAVEL.has(rule)) return { flow: 'expense', category: 'Travel' };
    return { flow: 'expense', category: rule };
  }
  if (isForeign(tx)) return { flow: 'expense', category: 'Travel' };
  if (PRIVATE_PERSON.test(cleanMerchant(text))) return { flow: 'expense', category: 'People' };
  return { flow: 'expense', category: 'Other' };
}

/**
 * Classifies every row of a statement: what kind of money movement it is and
 * which category it belongs to. Runs at read time, so better rules (and the
 * user's corrections) apply to statements uploaded earlier as well.
 */
export function classifyStatement(statement: ParsedStatement, overrides: CategoryOverrides, eurRate: number): ClassifiedTransaction[] {
  const homeLoanCapRsd = HOME_LOAN_CAP_EUR * eurRate;
  let homeLoanUsedRsd = 0;

  const rows = [...statement.transactions].sort((a, b) => a.bookingDate.localeCompare(b.bookingDate) || a.rowNo - b.rowNo);
  const result: ClassifiedTransaction[] = [];

  for (const tx of rows) {
    const direction: 'debit' | 'credit' = tx.debit > 0 ? 'debit' : 'credit';
    const amount = direction === 'debit' ? tx.debit : tx.credit;
    if (amount === 0) continue;

    const merchant = cleanMerchant(tx.description);
    const merchantKey = normalizeMerchant(merchant);
    const base = {
      id: tx.id,
      accountNo: tx.accountNo,
      currency: tx.currency,
      bookingDate: tx.bookingDate,
      description: tx.description,
      merchant,
      merchantKey,
      direction,
      amount,
      travel: isForeign(tx),
      originalAmount: tx.originalAmount,
      originalCurrency: tx.originalCurrency
    };
    const amountRsd = toRsd(amount, tx.currency, eurRate);

    const override = overrides.transactions[tx.id] ?? overrides.merchants[merchantKey];
    if (override && !/^Interni transfer/i.test(tx.description)) {
      result.push(applyOverride(base, amountRsd, override));
      continue;
    }

    if (direction === 'credit') {
      const { flow, category, refund } = classifyCredit(tx, amountRsd);
      result.push({ ...base, amountRsd: refund ? -amountRsd : amountRsd, flow, category, overridden: false });
      continue;
    }

    // Self-transfers to the other bank pay the apartment loan, up to the monthly cap
    if (SELF_TRANSFER_DEBIT_PATTERN.test(tx.description)) {
      const remaining = Math.max(homeLoanCapRsd - homeLoanUsedRsd, 0);
      const loanPart = Math.min(amountRsd, remaining);
      homeLoanUsedRsd += loanPart;
      if (loanPart > 0) {
        result.push({ ...base, amountRsd: round2(loanPart), flow: 'expense', category: 'HomeLoan', overridden: false });
      }
      if (amountRsd - loanPart > 0.005) {
        result.push({
          ...base,
          id: loanPart > 0 ? `${tx.id}:preko` : tx.id,
          amountRsd: round2(amountRsd - loanPart),
          flow: 'transfer_out',
          category: null,
          overridden: false
        });
      }
      continue;
    }

    const { flow, category } = classifyDebit(tx);
    result.push({ ...base, amountRsd, flow, category, overridden: false });
  }

  return result;
}

function applyOverride(
  base: Omit<ClassifiedTransaction, 'amountRsd' | 'flow' | 'category' | 'overridden'>,
  amountRsd: number,
  override: string
): ClassifiedTransaction {
  if (override === TRANSFER_OVERRIDE) {
    return {
      ...base,
      amountRsd,
      flow: base.direction === 'debit' ? 'transfer_out' : 'transfer_in',
      category: base.direction === 'debit' ? null : 'OwnAccount',
      overridden: true
    };
  }
  if (base.direction === 'credit' && override in INCOME_CATEGORIES) {
    return { ...base, amountRsd, flow: 'income', category: override as IncomeCategory, overridden: true };
  }
  if (isSpendingCategory(override)) {
    // A credit put into a spending category is a refund
    return {
      ...base,
      amountRsd: base.direction === 'credit' ? -amountRsd : amountRsd,
      flow: 'expense',
      category: override,
      overridden: true
    };
  }
  return {
    ...base,
    amountRsd,
    flow: base.direction === 'debit' ? 'expense' : 'income',
    category: base.direction === 'debit' ? 'Other' : 'OtherIncome',
    overridden: true
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
