import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { BaseCreateExpenseDto } from './create-expense.dto';

export class UpdateExpenseDto extends PartialType(BaseCreateExpenseDto) {
  @IsOptional()
  @IsBoolean()
  private?: boolean;
}
