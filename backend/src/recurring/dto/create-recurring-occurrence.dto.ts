import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsString, MinLength, IsDateString, Min, IsOptional } from 'class-validator';

export class CreateRecurringOccurrenceDto {
  @ApiProperty({ example: 'income', enum: ['income', 'expense'] })
  @IsEnum(['income', 'expense'])
  occurrenceType: string;

  @ApiProperty({ example: 50000, description: 'Amount in the specified currency' })
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @ApiProperty({ example: 'RSD', enum: ['EUR', 'RSD'] })
  @IsEnum(['EUR', 'RSD'])
  currency: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Income-specific
  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsEnum(['Salary', 'Freelance', 'Investment', 'Gift', 'Other'])
  incomeType?: string;

  // Expense-specific
  @IsOptional()
  @IsString()
  expenseCategory?: string;

  @IsOptional()
  @IsString()
  store?: string;

  // Recurrence config
  @ApiProperty({
    example: 'monthly',
    enum: ['monthly', 'weekly', 'biweekly', 'yearly'],
    description: 'Frequency of recurrence'
  })
  @IsEnum(['monthly', 'weekly', 'biweekly', 'yearly'])
  frequency: string;

  @IsOptional()
  @IsString()
  recurringAt?: string;

  @IsOptional()
  @IsDateString()
  recurringUntil?: string;

  @ApiProperty({ example: '2026-02-01T00:00:00Z', description: 'Date for first occurrence' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: 'Dejan', description: 'User who created this occurrence' })
  @IsString()
  @MinLength(1)
  createdBy: string;
}
