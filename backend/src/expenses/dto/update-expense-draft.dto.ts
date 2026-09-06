import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, Min } from 'class-validator';
import { EXPENSE_CATEGORIES } from '../../constants/categories';

/** Editable fields of a pending draft (before confirmation). */
export class UpdateExpenseDraftDto {
  @ApiPropertyOptional({ example: 'Dining', enum: EXPENSE_CATEGORIES })
  @IsOptional()
  @IsIn(EXPENSE_CATEGORIES as unknown as string[])
  category?: string;

  @ApiPropertyOptional({ example: 980, description: 'Amount in the draft currency' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;
}
