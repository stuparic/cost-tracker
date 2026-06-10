import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { RecurringFrequency } from '../interfaces/recurring-occurrence.interface';

export class UpdateRecurringOccurrenceDto {
  @ApiProperty({ required: false, description: 'Enable or disable the recurring occurrence' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, enum: ['monthly', 'weekly', 'biweekly', 'yearly'] })
  @IsOptional()
  @IsEnum(['monthly', 'weekly', 'biweekly', 'yearly'])
  frequency?: RecurringFrequency;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  recurringUntil?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  nextOccurrenceDate?: string;
}
