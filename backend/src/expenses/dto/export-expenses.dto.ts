import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class ExportExpensesDto {
  @ApiPropertyOptional({ example: 'Groceries', description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Maxi', description: 'Filter by shop name' })
  @IsOptional()
  @IsString()
  shopName?: string;

  @ApiPropertyOptional({ example: 'Dejan', description: 'Filter by expense creator' })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z', description: 'Filter expenses from this date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-01-31T23:59:59Z', description: 'Filter expenses until this date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
