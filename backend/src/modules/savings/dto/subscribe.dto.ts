import { IsUUID, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsStellarPublicKey } from '../../../common/validators/is-stellar-key.validator';
import { Trim } from '../../../common/decorators/trim.decorator';
import { IsPositiveAmount } from '../../../common/validators/is-positive-amount.validator';

export class SubscribeDto {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', description: 'Savings product ID to subscribe to' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 5000, description: 'Amount to subscribe' })
  @IsNumber()
  @IsPositiveAmount()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    example: 'GABCDEF234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHJKLMN',
    description:
      'Optional Stellar wallet address associated with this subscription',
  })
  @IsOptional()
  @Trim()
  @IsStellarPublicKey()
  walletAddress?: string;
}
