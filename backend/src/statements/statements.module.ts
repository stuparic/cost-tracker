import { Module } from '@nestjs/common';
import { StatementsController } from './statements.controller';
import { StatementsService } from './statements.service';
import { StatementParserService } from './statement-parser.service';
import { ExpensesModule } from '../expenses/expenses.module';
import { IncomesModule } from '../incomes/incomes.module';
import { CurrencyModule } from '../currency/currency.module';

@Module({
  imports: [ExpensesModule, IncomesModule, CurrencyModule],
  controllers: [StatementsController],
  providers: [StatementsService, StatementParserService]
})
export class StatementsModule {}
