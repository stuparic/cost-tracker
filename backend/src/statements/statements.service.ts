import { Injectable, Logger } from '@nestjs/common';
import { ExpensesService } from '../expenses/expenses.service';
import { CreateExpenseStatementDto } from '../expenses/dto/create-expense.dto';
import { Expense } from '../expenses/interfaces/expense.interface';
import { IncomesService } from '../incomes/incomes.service';
import { CurrencyService } from '../currency/currency.service';
import { StatementParserService } from './statement-parser.service';
import { ImportStatementDto } from './dto/import-statement.dto';
import { MatchedStatementTransaction, ParseStatementResult, StatementTransaction } from './interfaces/statement-transaction.interface';

/** Max difference for an amount to be considered the same transaction (RSD) */
const AMOUNT_TOLERANCE_RSD = 1;
/** How many days apart a manual entry and a statement entry may be and still match */
const DATE_TOLERANCE_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Descriptions that move money around without being real household expenses */
const NON_EXPENSE_PATTERNS = /(podizanje gotovine|interni transfer|prenos sredstava|menjacnica|exchange)/i;

/**
 * Credits (uplate) that just move the account holder's own money around and
 * are never real income: internal transfers between own accounts (savings <-> current),
 * cash deposits at an ATM, and transfers where the counterparty is the account holder
 * themselves (e.g. moving money in from another bank).
 */
const NON_INCOME_CREDIT_PATTERNS = /(interni transfer|prenos sredstava|uplata gotovine|polog gotovine|sopstveni racun)/i;
/** The account holder's own name - a credit "from" this name is a self-transfer, not income */
const OWN_NAME_PATTERN = /dejan\s+stupari[cć]/i;

const CASHBACK_PATTERN = /cashback/i;
const INTEREST_PATTERN = /kamat/i;

/**
 * Loan classification rules (agreed with the user, July 2026):
 * - Debits to OTP banka are the car loan installment.
 * - Debits transferring money to the account holder's own account at another
 *   bank ("Dejan S...") service the apartment loan, up to HOME_LOAN_CAP_EUR per
 *   monthly statement. Whatever exceeds the cap within one statement is "Other";
 *   a transaction crossing the cap is split into two rows at parse time.
 */
const CAR_LOAN_PATTERN = /otp\s*bank/i;
const SELF_TRANSFER_DEBIT_PATTERN = /(^|\s)dejan\s+s(\b|tupari)/i;
const HOME_LOAN_CAP_EUR = 780;

/**
 * Known recurring counterparties with a fixed income type, learned from real
 * statements reviewed with the user (see FUTURE_IDEAS discussion). Anything
 * not matched here defaults to "Other" and can be re-typed in the review screen.
 */
const KNOWN_INCOME_SOURCES: Array<{ pattern: RegExp; incomeType: string }> = [{ pattern: /milo[sš]\s+orli[cć]/i, incomeType: 'Rent' }];

@Injectable()
export class StatementsService {
  private readonly logger = new Logger(StatementsService.name);

  constructor(
    private readonly parser: StatementParserService,
    private readonly expensesService: ExpensesService,
    private readonly incomesService: IncomesService,
    private readonly currencyService: CurrencyService
  ) {}

  /**
   * Parses an uploaded statement PDF and annotates every transaction with
   * duplicate-detection info against already-recorded expenses/incomes.
   */
  async parseAndMatch(buffer: Buffer): Promise<ParseStatementResult> {
    const parsed = await this.parser.parsePdf(buffer);
    if (parsed.length === 0) {
      return { success: false, error: 'No transactions found in the statement', transactions: [] };
    }

    const transactions = this.applyLoanRules(parsed);

    const dates = transactions.map(tx => tx.date).sort();
    const periodStart = dates[0];
    const periodEnd = dates[dates.length - 1];

    const existing = await this.fetchExistingExpenses(periodStart, periodEnd);
    const matched = await Promise.all(transactions.map(tx => this.matchTransaction(tx, existing)));

    return { success: true, periodStart, periodEnd, transactions: matched };
  }

  /**
   * Applies the user's loan-classification rules to debit transactions before
   * matching: OTP banka debits become the car-loan installment, self-transfers
   * ("Dejan S...") count towards the apartment loan up to HOME_LOAN_CAP_EUR per
   * statement. A transaction that crosses the cap is split into a HomeLoan part
   * and an "Other" part (the split row gets a derived, stable bank ref so
   * re-uploading the same statement stays idempotent).
   */
  private applyLoanRules(transactions: StatementTransaction[]): StatementTransaction[] {
    const capRsd = this.currencyService.convertEurToRsd(HOME_LOAN_CAP_EUR);
    let homeLoanUsedRsd = 0;

    const result: StatementTransaction[] = [];

    const chronological = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    const order = new Map(chronological.map((tx, index) => [tx.ref, index]));
    const sorted = [...transactions].sort((a, b) => (order.get(a.ref) ?? 0) - (order.get(b.ref) ?? 0));

    for (const tx of sorted) {
      if (tx.direction !== 'debit') {
        result.push(tx);
        continue;
      }

      const text = `${tx.merchant} ${tx.rawDescription}`;

      if (CAR_LOAN_PATTERN.test(text)) {
        result.push({ ...tx, category: 'CarLoan' });
        continue;
      }

      if (!SELF_TRANSFER_DEBIT_PATTERN.test(text)) {
        result.push(tx);
        continue;
      }

      const remaining = capRsd - homeLoanUsedRsd;

      if (remaining <= 0) {
        result.push({ ...tx, category: 'Other' });
        continue;
      }

      if (tx.amount <= remaining) {
        homeLoanUsedRsd += tx.amount;
        result.push({ ...tx, category: 'HomeLoan' });
        continue;
      }

      // Crosses the cap: split into the HomeLoan remainder and an "Other" rest
      homeLoanUsedRsd = capRsd;
      const homeLoanPart = Math.round(remaining * 100) / 100;
      const otherPart = Math.round((tx.amount - remaining) * 100) / 100;
      result.push({
        ...tx,
        amount: homeLoanPart,
        category: 'HomeLoan',
        rawDescription: `${tx.rawDescription} (deo rate do ${HOME_LOAN_CAP_EUR} EUR)`
      });
      result.push({
        ...tx,
        ref: `${tx.ref}-preko`,
        amount: otherPart,
        category: 'Other',
        rawDescription: `${tx.rawDescription} (iznad ${HOME_LOAN_CAP_EUR} EUR mesečno)`
      });
    }

    return result;
  }

  /** Creates expenses/incomes for the reviewed transactions; idempotent per bankRef. */
  async import(dto: ImportStatementDto): Promise<{ expensesImported: number; incomesImported: number; skipped: number }> {
    let expensesImported = 0;
    let incomesImported = 0;
    let skipped = 0;

    for (const tx of dto.transactions) {
      if (tx.direction === 'credit') {
        const alreadyImported = await this.incomesService.existsByBankRef(tx.ref);
        if (alreadyImported) {
          skipped++;
          continue;
        }

        await this.incomesService.create({
          amount: tx.amount,
          currency: 'RSD',
          source: tx.merchant,
          description: tx.rawDescription || tx.merchant,
          incomeType: tx.incomeType || 'Other',
          dateReceived: `${tx.date}T12:00:00.000Z`,
          createdBy: dto.createdBy,
          bankRef: tx.ref,
          creationMethod: 'statement'
        });
        incomesImported++;
        continue;
      }

      const alreadyImported = await this.expensesService.existsByBankRef(tx.ref);
      if (alreadyImported) {
        skipped++;
        continue;
      }

      const createDto: CreateExpenseStatementDto = {
        amount: tx.amount,
        currency: 'RSD',
        shopName: tx.merchant,
        productDescription: tx.rawDescription || tx.merchant,
        category: tx.category,
        paymentMethod: 'Kartica',
        tags: tx.travel ? ['putovanje'] : undefined,
        purchaseDate: `${tx.date}T12:00:00.000Z`,
        createdBy: dto.createdBy,
        bankRef: tx.ref,
        creationMethod: 'statement'
      };
      await this.expensesService.create(createDto);
      expensesImported++;
    }

    this.logger.log(`Statement import finished: ${expensesImported} expenses, ${incomesImported} incomes imported, ${skipped} skipped`);
    return { expensesImported, incomesImported, skipped };
  }

  private async fetchExistingExpenses(periodStart: string, periodEnd: string): Promise<Expense[]> {
    const start = new Date(new Date(periodStart).getTime() - DATE_TOLERANCE_DAYS * MS_PER_DAY);
    const end = new Date(new Date(periodEnd).getTime() + (DATE_TOLERANCE_DAYS + 1) * MS_PER_DAY);

    const { data } = await this.expensesService.findAll({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 1000
    });
    return data;
  }

  private async matchTransaction(tx: StatementTransaction, existing: Expense[]): Promise<MatchedStatementTransaction> {
    if (tx.direction === 'credit') {
      return this.matchCreditTransaction(tx);
    }

    const refMatch = existing.find(expense => expense.bankRef === tx.ref);
    if (refMatch) {
      return {
        ...tx,
        matchStatus: 'already_imported',
        matchedExpenseId: refMatch.id,
        matchReason: 'Ova transakcija je već uvezena iz izvoda',
        suggestImport: false
      };
    }

    const candidate = this.findBestCandidate(tx, existing);
    if (candidate) {
      return {
        ...tx,
        matchStatus: 'duplicate',
        matchedExpenseId: candidate.id,
        matchReason: `Poklapa se sa postojećim troškom: ${candidate.shopName}, ${Math.round(candidate.rsdAmount)} RSD (${candidate.purchaseDate.slice(0, 10)})`,
        suggestImport: false
      };
    }

    return {
      ...tx,
      matchStatus: 'new',
      suggestImport: !NON_EXPENSE_PATTERNS.test(`${tx.merchant} ${tx.rawDescription}`)
    };
  }

  /**
   * Classifies a credit (uplata): already-imported (by bankRef), a self-transfer/cash
   * movement that should stay excluded from income, or a suggested new income with
   * a best-guess type the user can still override in the review screen.
   */
  private async matchCreditTransaction(tx: StatementTransaction): Promise<MatchedStatementTransaction> {
    const alreadyImported = await this.incomesService.existsByBankRef(tx.ref);
    if (alreadyImported) {
      return {
        ...tx,
        matchStatus: 'already_imported',
        matchReason: 'Ova uplata je već uvezena iz izvoda',
        suggestImport: false
      };
    }

    const text = `${tx.merchant} ${tx.rawDescription}`;

    if (OWN_NAME_PATTERN.test(text)) {
      return {
        ...tx,
        matchStatus: 'skipped',
        matchReason: 'Prebacivanje sa sopstvenog računa - nije prihod',
        suggestImport: false
      };
    }

    if (NON_INCOME_CREDIT_PATTERNS.test(text)) {
      return {
        ...tx,
        matchStatus: 'skipped',
        matchReason: 'Interni transfer / podizanje-uplata gotovine - nije prihod',
        suggestImport: false
      };
    }

    let incomeType = 'Other';
    if (CASHBACK_PATTERN.test(text)) {
      incomeType = 'Other';
    } else if (INTEREST_PATTERN.test(text)) {
      incomeType = 'Investment';
    } else {
      const known = KNOWN_INCOME_SOURCES.find(({ pattern }) => pattern.test(text));
      if (known) {
        incomeType = known.incomeType;
      } else if (/^[A-ZŠĐČĆŽ0-9 .,&-]{4,}$/.test(tx.merchant.trim())) {
        // All-caps multi-word counterparty on a Serbian statement is almost always
        // a registered company/employer paying in - default to salary/freelance income.
        incomeType = 'Salary';
      }
    }

    return {
      ...tx,
      incomeType,
      matchStatus: 'new',
      suggestImport: true
    };
  }

  /**
   * A manually/voice-entered expense matches a statement transaction when the
   * RSD amount is (nearly) identical and the dates are within a few days.
   * Merchant-name similarity breaks ties but is not required - users rarely
   * type the exact name printed on the statement.
   */
  private findBestCandidate(tx: StatementTransaction, existing: Expense[]): Expense | undefined {
    const txTime = new Date(tx.date).getTime();

    const candidates = existing.filter(expense => {
      if (expense.bankRef) return false; // belongs to another bank transaction
      if (Math.abs(expense.rsdAmount - tx.amount) > AMOUNT_TOLERANCE_RSD) return false;
      const dayDiff = Math.abs(new Date(expense.purchaseDate).getTime() - txTime) / MS_PER_DAY;
      return dayDiff <= DATE_TOLERANCE_DAYS + 0.5;
    });

    if (candidates.length === 0) return undefined;

    const scored = candidates.map(expense => {
      const dayDiff = Math.abs(new Date(expense.purchaseDate).getTime() - txTime) / MS_PER_DAY;
      const nameScore = this.nameSimilarity(`${tx.merchant} ${tx.rawDescription}`, expense.shopName);
      return { expense, score: nameScore * 10 - dayDiff };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].expense;
  }

  /** Cheap token-overlap similarity between statement text and a shop name */
  private nameSimilarity(statementText: string, shopName: string): number {
    const normalize = (value: string) =>
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9 ]/g, ' ');

    const haystack = normalize(statementText);
    const tokens = normalize(shopName)
      .split(/\s+/)
      .filter(token => token.length >= 3);
    if (tokens.length === 0) return 0;

    const hits = tokens.filter(token => haystack.includes(token)).length;
    return hits / tokens.length;
  }
}
