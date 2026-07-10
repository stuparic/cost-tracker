import { Injectable } from '@nestjs/common';
import { ExpensesService } from '../expenses/expenses.service';
import { IncomesService } from '../incomes/incomes.service';
import { BudgetsService } from '../budgets/budgets.service';
import { HouseholdContext } from '../common/interfaces/household-context.interface';

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
  async buildFullBackup(ctx: HouseholdContext) {
    const [expenses, incomes, budgets] = await Promise.all([
      this.expensesService.exportAll(ctx),
      this.incomesService.exportAll(ctx),
      this.budgetsService.findAll(ctx.householdId)
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
