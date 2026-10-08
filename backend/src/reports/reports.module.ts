import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { StatementArchiveRepository } from './statement-archive.repository';
import { CurrencyModule } from '../currency/currency.module';

@Module({
  imports: [CurrencyModule],
  controllers: [ReportsController],
  providers: [ReportsService, StatementArchiveRepository]
})
export class ReportsModule {}
