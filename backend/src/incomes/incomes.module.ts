import { Module } from '@nestjs/common';
import { IncomesService } from './incomes.service';
import { IncomesController } from './incomes.controller';
import { IncomesRepository } from './incomes.repository';
import { CurrencyModule } from '../currency/currency.module';

@Module({
  imports: [CurrencyModule],
  controllers: [IncomesController],
  providers: [IncomesService, IncomesRepository],
})
export class IncomesModule {}
