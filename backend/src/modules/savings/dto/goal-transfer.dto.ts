import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import {
  GoalTransferFrequency,
  GoalTransferStatus,
} from '../entities/goal-transfer-schedule.entity';
import { IsPositiveAmount } from '../../../common/validators/is-positive-amount.validator';

export class CreateGoalTransferScheduleDto {
  @ApiProperty({ example: 'uuid-goal-id' })
  @IsUUID()
  goalId: string;

  @ApiPropertyOptional({ example: 'uuid-product-id' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({ example: 50, minimum: 0.01 })
  @IsNumber()
  @IsPositiveAmount()
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: GoalTransferFrequency })
  @IsEnum(GoalTransferFrequency)
  frequency: GoalTransferFrequency;
}

export class GoalTransferScheduleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() goalId: string;
  @ApiPropertyOptional() productId: string | null;
  @ApiProperty() amount: number;
  @ApiProperty({ enum: GoalTransferFrequency })
  frequency: GoalTransferFrequency;
  @ApiProperty({ enum: GoalTransferStatus }) status: GoalTransferStatus;
  @ApiProperty() nextRunAt: Date;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
