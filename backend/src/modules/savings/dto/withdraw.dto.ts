import { IsUUID, IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Trim } from '../../../common/decorators/trim.decorator';
import { IsPositiveAmount } from '../../../common/validators/is-positive-amount.validator';

export class WithdrawDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Subscription ID to withdraw from' })
  @IsUUID()
  subscriptionId: string;

  @ApiProperty({ example: 1000.5, description: 'Amount to withdraw' })
  @IsNumber()
  @IsPositiveAmount()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    example: 'emergency',
    description: 'Optional reason for withdrawal',
  })
  @IsOptional()
  @IsString()
  @Trim()
  reason?: string;
}
