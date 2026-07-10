import { createHash } from 'crypto';
import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpensesService } from '../expenses/expenses.service';
import { normalizeCreatedBy } from '../common/utils/normalize-created-by';
import { NotificationParserService } from './notification-parser.service';
import { PaymentNotificationDto } from './dto/payment-notification.dto';
import type { Expense } from '../expenses/interfaces/expense.interface';

export interface WebhookResult {
  status: 'created' | 'duplicate';
  expense?: Expense;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly expensesService: ExpensesService,
    private readonly parser: NotificationParserService,
    private readonly config: ConfigService
  ) {}

  async handlePaymentNotification(dto: PaymentNotificationDto): Promise<WebhookResult> {
    const parsed = this.parser.parse(dto.text, dto.title);

    if (!parsed) {
      this.logger.warn(`Could not parse payment notification: "${dto.title ?? ''}" / "${dto.text}"`);
      throw new UnprocessableEntityException('Could not extract an amount from the notification text');
    }

    // Same notification within the same minute = duplicate (MacroDroid can fire twice)
    const minuteBucket = new Date().toISOString().slice(0, 16);
    const bankRef =
      'notif-' +
      createHash('sha1')
        .update(`${dto.app ?? ''}|${dto.title ?? ''}|${dto.text}|${minuteBucket}`)
        .digest('hex')
        .slice(0, 20);

    if (await this.expensesService.existsByBankRef(bankRef)) {
      this.logger.log(`Skipping duplicate notification (${bankRef})`);
      return { status: 'duplicate' };
    }

    const createdBy = normalizeCreatedBy(dto.createdBy || this.config.get<string>('WEBHOOK_DEFAULT_USER') || 'Dejan');
    const merchant = parsed.merchant ?? 'Nepoznato';

    const expense = await this.expensesService.create({
      amount: parsed.amount,
      currency: parsed.currency,
      shopName: merchant,
      productDescription: parsed.merchant ? undefined : `Notifikacija: ${dto.text.slice(0, 140)}`,
      paymentMethod: 'Card',
      tags: ['auto-notifikacija'],
      purchaseDate: new Date().toISOString(),
      createdBy,
      bankRef,
      creationMethod: 'statement'
    });

    this.logger.log(`Created expense from notification: ${merchant} ${parsed.amount} ${parsed.currency} (${createdBy})`);
    return { status: 'created', expense };
  }
}
