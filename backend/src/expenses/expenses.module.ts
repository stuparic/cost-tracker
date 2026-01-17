import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { ExpensesRepository } from './expenses.repository';
import { CurrencyModule } from '../currency/currency.module';
import { CategoryInferenceModule } from '../category-inference/category-inference.module';

@Module({
  imports: [CurrencyModule, CategoryInferenceModule],
  controllers: [ExpensesController],
  providers: [ExpensesService, ExpensesRepository],
  exports: [ExpensesService]
})
export class ExpensesModule {}
