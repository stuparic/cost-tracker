import { createHash } from 'crypto';
import { Injectable, Logger, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpensesService } from '../expenses/expenses.service';
import { ExpenseDraftsService } from '../expenses/expense-drafts.service';
import { UsersRepository } from '../users/users.repository';
import { NotificationParserService } from './notification-parser.service';
import { PaymentNotificationDto } from './dto/payment-notification.dto';
import type { ExpenseDraft } from '../expenses/interfaces/expense-draft.interface';
import type { UserProfile } from '../users/interfaces/user.interface';

export interface WebhookResult {
  status: 'created' | 'duplicate';
  draft?: ExpenseDraft;
}

/** Legacy shared token from before per-user tokens existed; maps to the owner account. */
const LEGACY_WEBHOOK_TOKEN = 'zuti-patak-broji-dinare-77';
const LEGACY_OWNER_EMAIL = 'dejan.stuparic@heydata.eu';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly expensesService: ExpensesService,
    private readonly draftsService: ExpenseDraftsService,
    private readonly usersRepository: UsersRepository,
    private readonly parser: NotificationParserService,
    private readonly config: ConfigService
  ) {}

  /** Resolves the phone's shared-secret header to a household member. */
  async resolveUser(rawToken: string | undefined): Promise<UserProfile> {
    // MacroDroid (and other HTTP clients) can append a trailing newline/space to
    // header values, which breaks the exact-match lookup. Normalize before use.
    const token = rawToken?.trim();
    if (!token) {
      throw new UnauthorizedException('Missing webhook token');
    }

    const byToken = await this.usersRepository.findUserByWebhookToken(token);
    if (byToken) return byToken;

    const legacy = this.config.get<string>('WEBHOOK_TOKEN') || LEGACY_WEBHOOK_TOKEN;
    if (token === legacy) {
      const owner = await this.usersRepository.findUserByEmail(LEGACY_OWNER_EMAIL);
      if (owner) return owner;
    }

    // Log a masked fingerprint so a persistent 401 tells us what actually arrived
    // (length + first/last chars) without dumping the secret in full.
    const masked = token.length <= 4 ? '****' : `${token.slice(0, 3)}…${token.slice(-2)}`;
    this.logger.warn(`Webhook token not recognized: len=${token.length}, value=${masked}`);
    throw new UnauthorizedException('Invalid webhook token');
  }

  async handlePaymentNotification(user: UserProfile, dto: PaymentNotificationDto): Promise<WebhookResult> {
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

    if ((await this.draftsService.existsByBankRef(bankRef)) || (await this.expensesService.existsByBankRef(bankRef, user.householdId))) {
      this.logger.log(`Skipping duplicate notification (${bankRef})`);
      return { status: 'duplicate' };
    }

    const createdBy = user.displayName.split(' ')[0] || user.displayName;
    const merchant = parsed.merchant ?? 'Nepoznato';

    // Notifications land as invisible drafts; the owner reviews them in the app
    const draft = await this.draftsService.create({
      amount: parsed.amount,
      currency: parsed.currency,
      shopName: merchant,
      productDescription: parsed.merchant ? undefined : `Notifikacija: ${dto.text.slice(0, 140)}`,
      paymentMethod: 'Card',
      tags: ['auto-notifikacija'],
      purchaseDate: new Date().toISOString(),
      createdBy,
      createdByUid: user.uid,
      householdId: user.householdId,
      bankRef,
      creationMethod: 'statement'
    });

    this.logger.log(`Created expense draft from notification: ${merchant} ${parsed.amount} ${parsed.currency} (${createdBy})`);
    return { status: 'created', draft };
  }
}
