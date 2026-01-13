import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RecurringService } from './recurring.service';
import { RecurringOccurrencesRepository } from './recurring-occurrences.repository';
import { RecurringOccurrencesController } from './recurring-occurrences.controller';
import { IncomesModule } from '../incomes/incomes.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    IncomesModule,
    ExpensesModule,
    FirebaseModule,
  ],
  controllers: [RecurringOccurrencesController],
  providers: [RecurringService, RecurringOccurrencesRepository],
  exports: [RecurringService, RecurringOccurrencesRepository],
})
export class RecurringModule {}
