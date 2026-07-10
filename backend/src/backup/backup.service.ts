import { Injectable } from '@nestjs/common';
import { ExpensesService } from '../expenses/expenses.service';
import { IncomesService } from '../incomes/incomes.service';
import { BudgetsService } from '../budgets/budgets.service';

@Injectable()
export class BackupService {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly incomesService: IncomesService,
    private readonly budgetsService: BudgetsService
  ) {}

  /**
   * Builds a full, unfiltered JSON snapshot of every expense, income and
   * budget in the system. Intended as a one-click manual backup, not a
   * paginated API response.
   */
  async buildFullBackup() {
    const [expenses, incomes, budgets] = await Promise.all([
      this.expensesService.exportAll(),
      this.incomesService.exportAll(),
      this.budgetsService.findAll()
    ]);

    return {
      generatedAt: new Date().toISOString(),
      counts: {
        expenses: expenses.length,
        incomes: incomes.length,
        budgets: budgets.length
      },
      expenses,
      incomes,
      budgets
    };
  }
}
