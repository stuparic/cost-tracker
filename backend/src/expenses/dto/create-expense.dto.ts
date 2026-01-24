import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsString, MinLength, IsArray, IsDateString, Min, IsOptional } from 'class-validator';

// Base class with common fields
export class BaseCreateExpenseDto {
  @ApiProperty({
    example: 1500,
    description: 'Amount in the specified currency'
  })
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @ApiProperty({
    example: 'RSD',
    enum: ['EUR', 'RSD'],
    description: 'Currency of the amount'
  })
  @IsEnum(['EUR', 'RSD'], { message: 'Currency must be either EUR or RSD' })
  currency: 'EUR' | 'RSD';

  @ApiProperty({ example: 'Maxi', description: 'Name of the shop' })
  @IsString()
  @MinLength(1, { message: 'Shop name cannot be empty' })
  shopName: string;

  @ApiProperty({
    example: 'Groceries - milk, bread, eggs',
    description: 'Description of the product(s) purchased. Defaults to "Purchase at {shopName}" if not provided.',
    required: false
  })
  @IsOptional()
  @IsString()
  productDescription?: string;

  @ApiProperty({
    example: 'Groceries',
    description: 'Category of the expense. Auto-inferred from shop name if not provided, defaults to "General".',
    required: false
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    example: 'Card',
    description: 'Payment method used. Defaults to "Card" if not provided.',
    required: false
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({
    example: ['food', 'weekly-shopping'],
    description: 'Tags for organizing expenses. Defaults to empty array if not provided.',
    required: false,
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({
    example: '2026-01-10T10:30:00Z',
    description: 'Date and time of purchase (ISO 8601 format)'
  })
  @IsDateString()
  purchaseDate: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Name of the person who created the expense'
  })
  @IsString()
  @MinLength(1, { message: 'Created by cannot be empty' })
  createdBy: string;
}

// Manual creation DTO - user enters data manually
export class CreateExpenseManualDto extends BaseCreateExpenseDto {
  creationMethod: 'manual' = 'manual';
}

// Auto creation DTO - created from recurring template
export class CreateExpenseAutoDto extends BaseCreateExpenseDto {
  @ApiProperty({
    description: 'ID of the recurring template that generated this expense'
  })
  @IsString()
  @MinLength(1)
  recurringOccurrenceId: string;

  creationMethod: 'auto' = 'auto';
}

// Voice creation DTO - created from voice input
export class CreateExpenseVoiceDto extends BaseCreateExpenseDto {
  @ApiProperty({
    example: 'Kupio sam kafu za 250 dinara',
    description: 'Original voice transcript'
  })
  @IsString()
  @MinLength(1)
  voiceTranscript: string;

  creationMethod: 'voice' = 'voice';
}

// Union type for all creation methods
export type CreateExpenseDto = CreateExpenseManualDto | CreateExpenseAutoDto | CreateExpenseVoiceDto;
