import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { ExpensesRepository } from './expenses.repository';
import { ExpenseDraftsService } from './expense-drafts.service';
import { ExpenseDraftsController } from './expense-drafts.controller';
import { ExpenseDraftsRepository } from './expense-drafts.repository';
import { CurrencyModule } from '../currency/currency.module';
import { CategoryInferenceModule } from '../category-inference/category-inference.module';

@Module({
  imports: [CurrencyModule, CategoryInferenceModule],
  controllers: [ExpensesController, ExpenseDraftsController],
  providers: [ExpensesService, ExpensesRepository, ExpenseDraftsService, ExpenseDraftsRepository],
  exports: [ExpensesService, ExpenseDraftsService]
})
export class ExpensesModule {}
