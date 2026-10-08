import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- pdf-parse is CJS-only; default import breaks at runtime
import pdfParse = require('pdf-parse');
import { CurrencyService } from '../currency/currency.service';
import { HouseholdContext } from '../common/interfaces/household-context.interface';
import { StatementArchiveRepository } from './statement-archive.repository';
import { parseYettelStatement, StatementParseError } from './yettel-statement.parser';
import { buildMonthData, buildMonthReport, buildYearOverview, MonthData } from './report-builder';
import { StatementArchive } from './interfaces/statement-archive.interface';
import { MonthReport, YearOverview } from './interfaces/report.interface';
import { INCOME_CATEGORIES, isSpendingCategory } from './report-categories';
import { TRANSFER_OVERRIDE } from './transaction-classifier';
import { UpdateReportCategoryDto } from './dto/update-report-category.dto';

export interface UploadStatementResult {
  id: string;
  period: string;
  statementNo: number | null;
  accounts: number;
  transactions: number;
  replaced: boolean;
}

export interface StatementListItem {
  id: string;
  period: string;
  statementNo: number | null;
  uploadedBy: string;
  createdAt: string;
  transactions: number;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly repository: StatementArchiveRepository,
    private readonly currencyService: CurrencyService
  ) {}

  async upload(buffer: Buffer, fileName: string | null, ctx: HouseholdContext): Promise<UploadStatementResult> {
    const pdf = await pdfParse(buffer);
    let statement;
    try {
      statement = parseYettelStatement(pdf.text || '');
    } catch (error) {
      if (error instanceof StatementParseError) throw new BadRequestException(error.message);
      throw error;
    }

    const { archive, replaced } = await this.repository.save(ctx.householdId, statement, {
      uploadedByUid: ctx.uid,
      uploadedBy: ctx.displayName || '',
      fileName
    });
    this.logger.log(
      `Statement ${archive.period} (#${archive.statementNo}) ${replaced ? 'replaced' : 'stored'}: ${archive.transactions.length} rows`
    );

    return {
      id: archive.id,
      period: archive.period,
      statementNo: archive.statementNo,
      accounts: archive.accounts.length,
      transactions: archive.transactions.length,
      replaced
    };
  }

  async list(ctx: HouseholdContext): Promise<StatementListItem[]> {
    const archives = await this.repository.findAll(ctx.householdId);
    return archives.map(archive => ({
      id: archive.id,
      period: archive.period,
      statementNo: archive.statementNo,
      uploadedBy: archive.uploadedBy,
      createdAt: archive.createdAt,
      transactions: archive.transactions.length
    }));
  }

  remove(id: string, ctx: HouseholdContext): Promise<void> {
    return this.repository.delete(ctx.householdId, id);
  }

  async year(year: number, ctx: HouseholdContext): Promise<YearOverview> {
    const months = await this.loadMonths(ctx);
    return buildYearOverview(year, months, new Date());
  }

  async month(period: string, ctx: HouseholdContext): Promise<MonthReport> {
    const months = await this.loadMonths(ctx);
    const current = months.find(month => month.statement.period === period);
    if (!current) throw new NotFoundException(`Nema uvezenog izvoda za ${period}`);
    return buildMonthReport(
      current,
      months.filter(month => month !== current)
    );
  }

  async updateCategory(dto: UpdateReportCategoryDto, ctx: HouseholdContext): Promise<void> {
    const category = dto.category ?? null;
    if (category !== null && category !== TRANSFER_OVERRIDE && !isSpendingCategory(category) && !(category in INCOME_CATEGORIES)) {
      throw new BadRequestException(`Nepoznata kategorija: ${category}`);
    }
    if (dto.scope === 'merchant') {
      if (!dto.merchantKey) throw new BadRequestException('merchantKey je obavezan za scope "merchant"');
      await this.repository.setOverride(ctx.householdId, 'merchants', dto.merchantKey, category);
      // A per-row correction would otherwise keep shadowing the new merchant rule
      if (dto.transactionId)
        await this.repository.setOverride(ctx.householdId, 'transactions', dto.transactionId.replace(/:preko$/, ''), null);
      return;
    }
    if (!dto.transactionId) throw new BadRequestException('transactionId je obavezan za scope "transaction"');
    // The part of a home-loan transfer above the cap is shown as its own row ("…:preko"); corrections apply to the whole row
    await this.repository.setOverride(ctx.householdId, 'transactions', dto.transactionId.replace(/:preko$/, ''), category);
  }

  /** Every imported month, classified with the household's corrections. Statements of the same month (two accounts) are merged. */
  private async loadMonths(ctx: HouseholdContext): Promise<MonthData[]> {
    const [archives, overrides] = await Promise.all([
      this.repository.findAll(ctx.householdId),
      this.repository.getOverrides(ctx.householdId)
    ]);
    return this.mergeByPeriod(archives).map(statement => buildMonthData(statement, overrides, this.currencyService.getCurrentRate()));
  }

  private mergeByPeriod(archives: StatementArchive[]): MonthData['statement'][] {
    const byPeriod = new Map<string, StatementArchive[]>();
    for (const archive of archives) byPeriod.set(archive.period, [...(byPeriod.get(archive.period) ?? []), archive]);

    return [...byPeriod.values()].map(group => {
      const [first, ...rest] = group;
      if (rest.length === 0) return first;
      return {
        ...first,
        uploadedBy: [...new Set(group.map(archive => archive.uploadedBy))].join(', '),
        accounts: group.flatMap(archive => archive.accounts),
        transactions: group.flatMap(archive => archive.transactions)
      };
    });
  }
}
