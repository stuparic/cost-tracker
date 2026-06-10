import { Module } from '@nestjs/common';
import { RecurringService } from './recurring.service';
import { RecurringOccurrencesRepository } from './recurring-occurrences.repository';
import { RecurringOccurrencesController } from './recurring-occurrences.controller';
import { IncomesModule } from '../incomes/incomes.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [IncomesModule, ExpensesModule, FirebaseModule],
  controllers: [RecurringOccurrencesController],
  providers: [RecurringService, RecurringOccurrencesRepository],
  exports: [RecurringService, RecurringOccurrencesRepository]
})
export class RecurringModule {}
