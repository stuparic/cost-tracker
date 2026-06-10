import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';

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

  @ApiProperty({ example: 'Groceries', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 733.46, description: 'Amount in RSD' })
  @IsNumber()
  @Min(0.01)
  amount: number;
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
