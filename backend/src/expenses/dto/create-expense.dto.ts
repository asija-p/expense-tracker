import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ example: 'Coffee', maxLength: 255 })
  @IsString()
  @Matches(/\S/)
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    example: '24.99',
    description: 'Amount greater than zero, up to 2 decimal places',
  })
  @IsString()
  @Matches(/^(?=.*[1-9])\d{1,10}(?:\.\d{1,2})?$/)
  amount!: string;

  @ApiProperty({
    example: '2026-10-26',
    description: 'Date in YYYY-MM-DD format',
  })
  @IsDateString()
  expenseDate!: string;

  @ApiProperty({ example: 1, description: 'Must be one of your categories' })
  @IsInt()
  @Min(1)
  categoryId!: number;

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
