import { ApiProperty } from '@nestjs/swagger';
import { WithdrawalStatus } from '../../savings/entities/withdrawal-request.entity';

export interface WithdrawalStatsDto {
  total: number;
  byStatus: Record<WithdrawalStatus, number>;
  approvalRate: number; // percentage 0–100
  averageProcessingTimeMs: number;
}

export class WithdrawalStatsResponseDto implements WithdrawalStatsDto {
  @ApiProperty({ description: 'Total number of withdrawal requests' })
  total: number;

  @ApiProperty({
    description: 'Count of withdrawal requests by status',
    example: {
      PENDING: 5,
      PROCESSING: 2,
      COMPLETED: 10,
      FAILED: 3,
    },
  })
  byStatus: Record<WithdrawalStatus, number>;

  @ApiProperty({
    description: 'Approval rate as a percentage (0-100)',
    example: 76.92,
  })
  approvalRate: number;

  @ApiProperty({
    description:
      'Average processing time in milliseconds for completed requests',
    example: 3600000,
  })
  averageProcessingTimeMs: number;
}
