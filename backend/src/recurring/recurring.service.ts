import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurringOccurrencesRepository } from './recurring-occurrences.repository';
import { RecurringOccurrence } from './interfaces/recurring-occurrence.interface';
import { IncomesService } from '../incomes/incomes.service';
import { ExpensesService } from '../expenses/expenses.service';

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(
    private occurrencesRepository: RecurringOccurrencesRepository,
    private incomesService: IncomesService,
    private expensesService: ExpensesService,
  ) {}

  // Runs every day at 9:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async processRecurringOccurrences() {
    this.logger.log('Starting recurring occurrence processing...');

    try {
      const today = new Date().toISOString();

      // Find all recurring occurrences where nextOccurrenceDate <= today
      const dueOccurrences = await this.occurrencesRepository.findDueOccurrences(today);

      this.logger.log(`Found ${dueOccurrences.length} due recurring occurrences`);

      for (const occurrence of dueOccurrences) {
        try {
          // Create income or expense based on occurrence type
          if (occurrence.occurrenceType === 'income') {
            await this.createIncomeFromOccurrence(occurrence);
          } else {
            await this.createExpenseFromOccurrence(occurrence);
          }

          // Update occurrence's next date
          await this.updateNextOccurrenceDate(occurrence);

          this.logger.log(`Created ${occurrence.occurrenceType} from occurrence: ${occurrence.id} for ${occurrence.createdBy}`);
        } catch (error) {
          this.logger.error(`Failed to process occurrence ${occurrence.id}:`, error);
        }
      }

      this.logger.log('Recurring occurrence processing completed');
    } catch (error) {
      this.logger.error('Failed to process recurring occurrences:', error);
    }
  }

  private async createIncomeFromOccurrence(occurrence: RecurringOccurrence) {
    const createDto = {
      amount: occurrence.amount,
      currency: occurrence.originalCurrency,
      source: occurrence.source,
      incomeType: occurrence.incomeType,
      dateReceived: new Date().toISOString(),
      createdBy: occurrence.createdBy,
      description: occurrence.description,
      recurringOccurrenceId: occurrence.id,
    };

    return this.incomesService.create(createDto);
  }

  private async createExpenseFromOccurrence(occurrence: RecurringOccurrence) {
    const createDto = {
      amount: occurrence.amount,
      currency: occurrence.originalCurrency,
      category: occurrence.expenseCategory,
      shopName: occurrence.store,
      purchaseDate: new Date().toISOString(),
      createdBy: occurrence.createdBy,
      productDescription: occurrence.description,
      recurringOccurrenceId: occurrence.id,
    };

    return this.expensesService.create(createDto);
  }

  private async updateNextOccurrenceDate(occurrence: RecurringOccurrence): Promise<void> {
    const nextDate = this.calculateNextDate(occurrence.nextOccurrenceDate, occurrence.frequency);

    await this.occurrencesRepository.update(occurrence.id, {
      nextOccurrenceDate: nextDate,
    });
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
