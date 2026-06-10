import { Injectable, Logger } from '@nestjs/common';
import { RecurringOccurrencesRepository } from './recurring-occurrences.repository';
import { RecurringOccurrence } from './interfaces/recurring-occurrence.interface';
import { IncomesService } from '../incomes/incomes.service';
import { ExpensesService } from '../expenses/expenses.service';
import { CreateExpenseAutoDto } from '../expenses/dto/create-expense.dto';

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(
    private occurrencesRepository: RecurringOccurrencesRepository,
    private incomesService: IncomesService,
    private expensesService: ExpensesService
  ) {}

  /**
   * Processes all due recurring occurrences. Invoked over HTTP by Cloud
   * Scheduler - an in-process cron never fires reliably on Cloud Run with
   * scale-to-zero, because no instance is alive between requests.
   *
   * Catches up on missed periods: if a template is several months overdue,
   * one record per missed period is created, each dated with its own
   * occurrence date (not the processing date).
   */
  async processRecurringOccurrences(): Promise<{ templates: number; created: number }> {
    this.logger.log('Starting recurring occurrence processing...');

    const today = new Date().toISOString();
    const dueOccurrences = await this.occurrencesRepository.findDueOccurrences(today);
    this.logger.log(`Found ${dueOccurrences.length} due recurring occurrences`);

    let created = 0;
    for (const occurrence of dueOccurrences) {
      try {
        created += await this.catchUpOccurrence(occurrence, today);
      } catch (error) {
        this.logger.error(`Failed to process occurrence ${occurrence.id}:`, error);
      }
    }

    this.logger.log(`Recurring occurrence processing completed: ${created} records created`);
    return { templates: dueOccurrences.length, created };
  }

  /** Creates one record per missed period and advances the template past today. */
  private async catchUpOccurrence(occurrence: RecurringOccurrence, today: string): Promise<number> {
    // Safety cap: ~10 years of weekly occurrences; prevents runaway loops on bad data
    const MAX_CATCH_UP = 520;
    let nextDate = occurrence.nextOccurrenceDate;
    let created = 0;

    while (nextDate <= today && created < MAX_CATCH_UP) {
      if (occurrence.recurringUntil && nextDate > occurrence.recurringUntil) break;

      if (occurrence.occurrenceType === 'income') {
        await this.createIncomeFromOccurrence(occurrence, nextDate);
      } else {
        await this.createExpenseFromOccurrence(occurrence, nextDate);
      }
      created++;
      this.logger.log(
        `Created ${occurrence.occurrenceType} (${nextDate.slice(0, 10)}) from occurrence ${occurrence.id} for ${occurrence.createdBy}`
      );

      nextDate = this.calculateNextDate(nextDate, occurrence.frequency);
    }

    const expired = occurrence.recurringUntil ? nextDate > occurrence.recurringUntil : false;
    await this.occurrencesRepository.update(occurrence.id, {
      nextOccurrenceDate: nextDate,
      ...(expired ? { isActive: false } : {})
    });

    return created;
  }

  private async createIncomeFromOccurrence(occurrence: RecurringOccurrence, dateReceived: string) {
    const createDto = {
      amount: occurrence.amount,
      currency: occurrence.originalCurrency,
      source: occurrence.source,
      incomeType: occurrence.incomeType,
      dateReceived,
      createdBy: occurrence.createdBy,
      description: occurrence.description,
      recurringOccurrenceId: occurrence.id,
      creationMethod: 'auto' as const
    };

    return this.incomesService.create(createDto);
  }

  private async createExpenseFromOccurrence(occurrence: RecurringOccurrence, purchaseDate: string) {
    const createDto: CreateExpenseAutoDto = {
      amount: occurrence.amount,
      currency: occurrence.originalCurrency,
      category: occurrence.expenseCategory,
      shopName: occurrence.store,
      purchaseDate,
      createdBy: occurrence.createdBy,
      productDescription: occurrence.description,
      recurringOccurrenceId: occurrence.id,
      creationMethod: 'auto'
    };

    return this.expensesService.create(createDto);
  }

  private calculateNextDate(fromDate: string, frequency: string): string {
    const date = new Date(fromDate);

    switch (frequency) {
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'biweekly':
        date.setDate(date.getDate() + 14);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }

    return date.toISOString();
  }
}
