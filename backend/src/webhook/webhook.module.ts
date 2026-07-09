import { Module } from '@nestjs/common';
import { ExpensesModule } from '../expenses/expenses.module';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { NotificationParserService } from './notification-parser.service';

@Module({
  imports: [ExpensesModule],
  controllers: [WebhookController],
  providers: [WebhookService, NotificationParserService]
})
export class WebhookModule {}
