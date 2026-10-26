import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  Matches,
  Min,
} from 'class-validator';

export class FilterExpensesDto {
  @ApiPropertyOptional({ example: 1, description: 'Filter by category ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @ApiPropertyOptional({
    example: '2026-10-01',
    description: 'Include expenses on or after this date',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  fromDate?: string;

  @ApiPropertyOptional({
    example: '2026-10-31',
    description: 'Include expenses on or before this date',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  toDate?: string;
}
