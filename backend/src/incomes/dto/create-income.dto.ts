import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsString, MinLength, IsDateString, Min, IsOptional } from 'class-validator';

export class CreateIncomeDto {
  @ApiProperty({
    example: 50000,
    description: 'Amount in the specified currency',
  })
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @ApiProperty({
    example: 'RSD',
    enum: ['EUR', 'RSD'],
    description: 'Currency of the amount',
  })
  @IsEnum(['EUR', 'RSD'], { message: 'Currency must be either EUR or RSD' })
  currency: 'EUR' | 'RSD';

  @ApiProperty({
    example: 'Symphony',
    description: 'Income source or employer name',
  })
  @IsString()
  @MinLength(1, { message: 'Source cannot be empty' })
  source: string;

  @ApiProperty({
    example: 'Monthly salary payment',
    description: 'Additional notes about the income. Optional.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'Salary',
    enum: ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'],
    description: 'Type of income',
  })
  @IsEnum(['Salary', 'Freelance', 'Investment', 'Gift', 'Other'], {
    message: 'Income type must be one of: Salary, Freelance, Investment, Gift, Other',
  })
  incomeType: string;

  @ApiProperty({
    example: '2026-01-10T10:00:00Z',
    description: 'Date and time when income was received (ISO 8601 format)',
  })
  @IsDateString()
  dateReceived: string;

  @ApiProperty({
    example: 'Dejan',
    description: 'Name of the person who received the income',
  })
  @IsString()
  @MinLength(1, { message: 'Created by cannot be empty' })
  createdBy: string;

  @ApiProperty({
    required: false,
    description: 'ID of recurring occurrence if auto-created',
  })
  @IsOptional()
  @IsString()
  recurringOccurrenceId?: string;

  @ApiProperty({
    required: false,
    example: 'manual',
    enum: ['manual', 'voice', 'auto'],
    description: 'How this income was created. "auto" = recurring auto-created. Defaults to "manual" if not specified.',
  })
  @IsOptional()
  @IsEnum(['manual', 'voice', 'auto'], {
    message: 'Creation method must be one of: manual, voice, auto',
  })
  creationMethod?: 'manual' | 'voice' | 'auto';

  @ApiProperty({
    required: false,
    example: 'Primio sam platu 50000 dinara',
    description: 'Original voice transcript if created via voice input (for debugging)',
  })
  @IsOptional()
  @IsString()
  voiceTranscript?: string;
}
