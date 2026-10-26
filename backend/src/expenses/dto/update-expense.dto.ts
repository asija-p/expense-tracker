import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateExpenseDto {
  @ApiPropertyOptional({ example: 'Coffee', maxLength: 255 })
  @IsOptional()
  @IsString()
  @Matches(/\S/)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    example: '24.99',
    description: 'Amount greater than zero, up to 2 decimal places',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(?=.*[1-9])\d{1,10}(?:\.\d{1,2})?$/)
  amount?: string;

  @ApiPropertyOptional({
    example: '2026-10-26',
    description: 'Date in YYYY-MM-DD format',
  })
  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Must be one of your categories',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number;

  @ApiPropertyOptional({
    example: 'Lunch at the cafe',
    maxLength: 255,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string | null;
}
