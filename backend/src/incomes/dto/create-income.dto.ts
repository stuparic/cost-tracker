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
  currency: string;

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
}
