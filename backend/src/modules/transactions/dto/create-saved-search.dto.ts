import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { TransactionSearchCriteriaDto } from './transaction-search-criteria.dto';

export class CreateSavedSearchDto {
  @ApiProperty({ description: 'Friendly name for the saved search' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  readonly name: string;

  @ApiPropertyOptional({ description: 'Optional short description' })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  readonly description?: string;

  @ApiProperty({
    description: 'Search filters and sorting to persist',
    type: TransactionSearchCriteriaDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => TransactionSearchCriteriaDto)
  readonly query: TransactionSearchCriteriaDto;

  @ApiPropertyOptional({
    description: 'Set this as the default saved search for the user',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  readonly isDefault?: boolean;
}
