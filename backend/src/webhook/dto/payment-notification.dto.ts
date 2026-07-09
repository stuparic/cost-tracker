import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class PaymentNotificationDto {
  @ApiProperty({
    example: '702,00 RSD sa Visa •• 1234 kod MAXI BEOGRAD',
    description: 'Full notification text captured by MacroDroid'
  })
  @IsString()
  @MinLength(3)
  text: string;

  @ApiProperty({
    example: 'MAXI',
    description: 'Notification title (often the merchant name in Google Wallet notifications)',
    required: false
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    example: 'com.google.android.apps.walletnfcrel',
    description: 'Package name of the app that posted the notification',
    required: false
  })
  @IsOptional()
  @IsString()
  app?: string;

  @ApiProperty({
    example: 'Dejan',
    description: 'Who made the payment. Defaults to WEBHOOK_DEFAULT_USER env var.',
    required: false
  })
  @IsOptional()
  @IsString()
  createdBy?: string;
}
