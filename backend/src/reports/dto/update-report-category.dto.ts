import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateReportCategoryDto {
  @ApiProperty({
    enum: ['transaction', 'merchant'],
    description: '"transaction" changes one row, "merchant" every row of that merchant in every month'
  })
  @IsIn(['transaction', 'merchant'])
  scope: 'transaction' | 'merchant';

  @ApiProperty({ required: false, example: '2026-06:115000000001234567:RSD:12' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  transactionId?: string;

  @ApiProperty({ required: false, example: 'river' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  merchantKey?: string;

  @ApiProperty({
    nullable: true,
    example: 'Dining',
    description: 'Report category (spending or income), "Transfer" for own-account transfers, or null to go back to the automatic category'
  })
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(40)
  category: string | null;
}
