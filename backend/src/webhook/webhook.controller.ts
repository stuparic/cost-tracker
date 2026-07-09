import { Body, Controller, Headers, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from './webhook.service';
import { PaymentNotificationDto } from './dto/payment-notification.dto';

// Hardcoded for convenience (personal app). Can be overridden with the
// WEBHOOK_TOKEN env var without touching code. Easy to type on a phone.
const DEFAULT_WEBHOOK_TOKEN = 'zuti-patak-broji-dinare-77';

@ApiTags('webhook')
@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly config: ConfigService
  ) {}

  @Post('payment-notification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create an expense from a payment notification',
    description:
      'Receives raw notification text (e.g. forwarded by MacroDroid from Google Wallet or a banking app), ' +
      'parses the amount, currency and merchant, and creates an expense. Idempotent per notification.'
  })
  @ApiHeader({ name: 'x-webhook-token', description: 'Shared secret, must match the WEBHOOK_TOKEN env var' })
  @ApiResponse({ status: 200, description: 'Expense created, or duplicate skipped' })
  @ApiResponse({ status: 401, description: 'Missing or invalid webhook token' })
  @ApiResponse({ status: 422, description: 'No amount could be parsed from the text' })
  async paymentNotification(@Headers('x-webhook-token') token: string | undefined, @Body() dto: PaymentNotificationDto) {
    const expected = this.config.get<string>('WEBHOOK_TOKEN') || DEFAULT_WEBHOOK_TOKEN;
    if (token !== expected) {
      throw new UnauthorizedException('Invalid webhook token');
    }

    return this.webhookService.handlePaymentNotification(dto);
  }
}
