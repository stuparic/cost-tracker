import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from './webhook.service';
import { PaymentNotificationDto } from './dto/payment-notification.dto';
import { Public } from '../auth/public.decorator';

@ApiTags('webhook')
@Public()
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
    // Per-user tokens: the token identifies who paid (each member has their own in the app settings)
    const user = await this.webhookService.resolveUser(token);
    return this.webhookService.handlePaymentNotification(user, dto);
  }
}
