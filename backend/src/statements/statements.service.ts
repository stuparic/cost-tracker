import { Injectable, Logger } from '@nestjs/common';
import { ExpensesService } from '../expenses/expenses.service';
import { CreateExpenseStatementDto } from '../expenses/dto/create-expense.dto';
import { Expense } from '../expenses/interfaces/expense.interface';
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

@Injectable()
export class StatementsService {
  private readonly logger = new Logger(StatementsService.name);

  constructor(
    private readonly parser: StatementParserService,
    private readonly expensesService: ExpensesService
  ) {}

  /**
   * Parses an uploaded statement PDF and annotates every transaction with
   * duplicate-detection info against already-recorded expenses.
   */
  async parseAndMatch(buffer: Buffer): Promise<ParseStatementResult> {
    const transactions = await this.parser.parsePdf(buffer);
    if (transactions.length === 0) {
      return { success: false, error: 'No transactions found in the statement', transactions: [] };
    }

    const dates = transactions.map(tx => tx.date).sort();
    const periodStart = dates[0];
    const periodEnd = dates[dates.length - 1];

    const existing = await this.fetchExistingExpenses(periodStart, periodEnd);
    const matched = transactions.map(tx => this.matchTransaction(tx, existing));

    return { success: true, periodStart, periodEnd, transactions: matched };
  }

  /** Creates expenses for the reviewed transactions; idempotent per bankRef. */
  async import(dto: ImportStatementDto): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    for (const tx of dto.transactions) {
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
        purchaseDate: `${tx.date}T12:00:00.000Z`,
        createdBy: dto.createdBy,
        bankRef: tx.ref,
        creationMethod: 'statement'
      };
      await this.expensesService.create(createDto);
      imported++;
    }

    this.logger.log(`Statement import finished: ${imported} imported, ${skipped} skipped`);
    return { imported, skipped };
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

  private matchTransaction(tx: StatementTransaction, existing: Expense[]): MatchedStatementTransaction {
    if (tx.direction === 'credit') {
      return { ...tx, matchStatus: 'new', suggestImport: false };
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
