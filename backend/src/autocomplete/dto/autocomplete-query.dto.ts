import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AutocompleteQueryDto {
  @ApiPropertyOptional({
    example: 'max',
    description: 'Search prefix to filter suggestions'
  })
  @IsOptional()
  @IsString()
  search?: string;
}
