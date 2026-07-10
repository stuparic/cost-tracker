import { Module } from '@nestjs/common';
import { ExpensesModule } from '../expenses/expenses.module';
import { UsersModule } from '../users/users.module';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { NotificationParserService } from './notification-parser.service';

@Module({
  imports: [ExpensesModule, UsersModule],
  controllers: [WebhookController],
  providers: [WebhookService, NotificationParserService]
})
export class WebhookModule {}
