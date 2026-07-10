import { Module } from '@nestjs/common';
import { StatementsController } from './statements.controller';
import { StatementsService } from './statements.service';
import { StatementParserService } from './statement-parser.service';
import { ExpensesModule } from '../expenses/expenses.module';
import { IncomesModule } from '../incomes/incomes.module';

@Module({
  imports: [ExpensesModule, IncomesModule],
  controllers: [StatementsController],
  providers: [StatementsService, StatementParserService]
})
export class StatementsModule {}
