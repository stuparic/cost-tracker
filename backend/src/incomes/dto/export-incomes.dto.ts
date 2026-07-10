import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class ExportIncomesDto {
  @ApiPropertyOptional({ example: 'Salary', description: 'Filter by income type' })
  @IsOptional()
  @IsString()
  incomeType?: string;

  @ApiPropertyOptional({ example: 'Symphony', description: 'Filter by income source' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: 'Dejan', description: 'Filter by income earner' })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z', description: 'Filter incomes from this date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-01-31T23:59:59Z', description: 'Filter incomes until this date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
