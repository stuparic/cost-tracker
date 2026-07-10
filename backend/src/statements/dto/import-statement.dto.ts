import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';

export class ImportTransactionDto {
  @ApiProperty({ example: '94735212551001', description: 'Bank transaction reference' })
  @IsString()
  @MinLength(1)
  ref: string;

  @ApiProperty({ example: '2026-04-01', description: 'Value date (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Maxi' })
  @IsString()
  @MinLength(1)
  merchant: string;

  @ApiProperty({ example: 'GooglePay 213 - MAXI 217, NOVI SAD', required: false })
  @IsOptional()
  @IsString()
  rawDescription?: string;

  @ApiProperty({ example: 'Groceries', required: false, description: 'Expense category (debits only)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    example: 'Salary',
    required: false,
    enum: ['Salary', 'Freelance', 'Rent', 'Investment', 'Gift', 'Other'],
    description: 'Income type (credits only)'
  })
  @IsOptional()
  @IsEnum(['Salary', 'Freelance', 'Rent', 'Investment', 'Gift', 'Other'])
  incomeType?: string;

  @ApiProperty({ example: 733.46, description: 'Amount in RSD' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    example: 'debit',
    enum: ['debit', 'credit'],
    required: false,
    description: 'Transaction direction. Defaults to "debit" (creates an expense); "credit" creates an income.'
  })
  @IsOptional()
  @IsEnum(['debit', 'credit'])
  direction?: 'debit' | 'credit';

  @ApiProperty({
    example: true,
    required: false,
    description: 'True when the transaction happened on a trip/abroad; adds the "putovanje" tag to the created expense'
  })
  @IsOptional()
  @IsBoolean()
  travel?: boolean;

  @ApiProperty({ example: 'Ljubljana, Slovenija', required: false, description: 'Trip location, stored as an extra tag' })
  @IsOptional()
  @IsString()
  travelPlace?: string;
}

export class ImportStatementDto {
  @ApiProperty({ example: 'Dejan', description: 'User importing the statement' })
  @IsString()
  @MinLength(1)
  createdBy: string;

  @ApiProperty({ type: [ImportTransactionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportTransactionDto)
  transactions: ImportTransactionDto[];
}
