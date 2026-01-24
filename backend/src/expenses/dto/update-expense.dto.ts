import { PartialType } from '@nestjs/swagger';
import { BaseCreateExpenseDto } from './create-expense.dto';

export class UpdateExpenseDto extends PartialType(BaseCreateExpenseDto) {}
