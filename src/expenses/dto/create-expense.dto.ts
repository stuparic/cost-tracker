import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsEnum,
  IsString,
  MinLength,
  IsArray,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ example: 1500, description: 'Amount in the specified currency' })
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @ApiProperty({ example: 'RSD', enum: ['EUR', 'RSD'], description: 'Currency of the amount' })
  @IsEnum(['EUR', 'RSD'], { message: 'Currency must be either EUR or RSD' })
  currency: string;

  @ApiProperty({ example: 'Maxi', description: 'Name of the shop' })
  @IsString()
  @MinLength(1, { message: 'Shop name cannot be empty' })
  shopName: string;

  @ApiProperty({
    example: 'Groceries - milk, bread, eggs',
    description: 'Description of the product(s) purchased',
  })
  @IsString()
  @MinLength(1, { message: 'Product description cannot be empty' })
  productDescription: string;

  @ApiProperty({ example: 'Groceries', description: 'Category of the expense' })
  @IsString()
  @MinLength(1, { message: 'Category cannot be empty' })
  category: string;

  @ApiProperty({ example: 'Cash', description: 'Payment method used' })
  @IsString()
  @MinLength(1, { message: 'Payment method cannot be empty' })
  paymentMethod: string;

  @ApiProperty({
    example: ['food', 'weekly-shopping'],
    description: 'Tags for organizing expenses',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiProperty({
    example: '2026-01-10T10:30:00Z',
    description: 'Date and time of purchase (ISO 8601 format)',
  })
  @IsDateString()
  purchaseDate: string;
}
