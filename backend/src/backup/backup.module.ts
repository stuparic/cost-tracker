import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';
import { ExpensesModule } from '../expenses/expenses.module';
import { IncomesModule } from '../incomes/incomes.module';
import { BudgetsModule } from '../budgets/budgets.module';

@Module({
  imports: [ExpensesModule, IncomesModule, BudgetsModule],
  controllers: [BackupController],
  providers: [BackupService]
})
export class BackupModule {}
