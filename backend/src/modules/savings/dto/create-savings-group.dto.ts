import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSavingsGroupDto {
  @ApiProperty({
    example: 'Family Vacation',
    description: 'The name of the savings group',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Group name is required' })
  @MaxLength(255, { message: 'Group name must not exceed 255 characters' })
  name: string;

  @ApiProperty({
    example: 'Saving up for our summer trip to Japan',
    description: 'A brief description of the group goal',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 5000,
    description: 'The total target amount for the group',
    minimum: 1,
  })
  @IsNumber({}, { message: 'Target amount must be a valid number' })
  @Min(1, { message: 'Target amount must be at least 1' })
  targetAmount: number;
}
