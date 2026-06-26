import {
  IsString,
  IsNumber,
  IsDate,
  IsOptional,
  IsObject,
  Min,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ApiExample } from '../../../common/decorators/api-example.decorator';
import { SavingsGoalMetadata } from '../entities/savings-goal.entity';
import { IsFutureDate } from '../../../common/validators/is-future-date.validator';
import { Trim } from '../../../common/decorators/trim.decorator';
import { IsPositiveAmount } from '../../../common/validators/is-positive-amount.validator';

export class CreateGoalDto {
  @ApiProperty({
    example: 'Buy a Car',
    description: 'Human-readable label for the savings goal',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Goal name is required' })
  @Trim()
  @MaxLength(255, { message: 'Goal name must not exceed 255 characters' })
  goalName: string;

  @ApiProperty({
    example: 50000,
    description: 'Target amount to accumulate (in XLM)',
    minimum: 0.01,
  })
  @IsNumber({}, { message: 'Target amount must be a valid number' })
  @IsPositiveAmount()
  @Min(0.01, { message: 'Target amount must be at least 0.01 XLM' })
  targetAmount: number;

  @ApiProperty({
    example: '2026-12-31T00:00:00.000Z',
    description:
      'Target date to reach the goal (ISO 8601 format). Must be a date in the future.',
    type: String,
    format: 'date-time',
  })
  @Transform(({ value }) => {
    // Ensure we handle both ISO strings and Date objects
    if (typeof value === 'string') {
      return new Date(value);
    }
    return value;
  })
  @Type(() => Date)
  @IsDate({ message: 'Target date must be a valid date' })
  @IsFutureDate({ message: 'Target date must be in the future' })
  targetDate: Date;

  @ApiProperty({
    example: {
      imageUrl: 'https://cdn.nestera.io/goals/car.jpg',
      iconRef: 'car-icon',
      color: '#4F46E5',
    },
    description:
      'Optional frontend-controlled metadata (imageUrl, iconRef, color, etc.)',
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Metadata must be a valid object' })
  metadata?: SavingsGoalMetadata;
}

/**
 * @example
 * {
 *   "goalName": "Emergency Fund",
 *   "targetAmount": 10000,
 *   "targetDate": "2026-12-31T00:00:00.000Z",
 *   "metadata": {
 *     "imageUrl": "https://cdn.nestera.io/goals/emergency.jpg",
 *     "iconRef": "shield-icon",
 *     "color": "#EF4444"
 *   }
 * }
 */
