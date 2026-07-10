import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpsertBudgetDto {
  @ApiProperty({
    example: 30000,
    description: 'Monthly spending limit for this category, in RSD'
  })
  @IsNumber()
  @Min(0, { message: 'Monthly limit must be 0 or greater' })
  monthlyLimit: number;
}
