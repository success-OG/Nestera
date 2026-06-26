import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SavingsProductType,
  RiskLevel,
} from '../entities/savings-product.entity';

/**
 * Detailed product response combining static DB attributes with live Soroban contract data
 */
export class ProductDetailsDto {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', description: 'Product UUID' })
  id: string;

  @ApiProperty({ example: 'Flexible Saver', description: 'Product name' })
  name: string;

  @ApiProperty({ enum: SavingsProductType, example: SavingsProductType.FLEXIBLE, description: 'Product type' })
  type: SavingsProductType;

  @ApiPropertyOptional({ example: 'Earn 6% APY with no lock-up period.', description: 'Product description' })
  description: string | null;

  @ApiProperty({ example: 6.0, description: 'Annual interest rate (%)' })
  interestRate: number;

  @ApiProperty({ example: 10, description: 'Minimum subscription amount (XLM)' })
  minAmount: number;

  @ApiProperty({ example: 100000, description: 'Maximum subscription amount (XLM)' })
  maxAmount: number;

  @ApiPropertyOptional({ example: null, description: 'Tenure in months (null for flexible)' })
  tenureMonths: number | null;

  @ApiProperty({ example: true, description: 'Whether product is active' })
  isActive: boolean;

  @ApiPropertyOptional({ example: 3, description: 'Maximum active subscriptions allowed per user' })
  maxSubscriptionsPerUser: number | null;

  @ApiProperty({ example: 1, description: 'Current product version' })
  version: number;

  @ApiPropertyOptional({ example: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA', description: 'Soroban vault contract ID' })
  contractId: string | null;

  @ApiProperty({ example: 12500000000, description: 'Live total assets from Soroban contract (in stroops)' })
  totalAssets: number;

  @ApiProperty({ example: 1250.0, description: 'Live total assets formatted as XLM' })
  totalAssetsXlm: number;

  @ApiPropertyOptional({ example: 5000000, description: 'Maximum liquidity-backed capacity for the product' })
  maxCapacity: number | null;

  @ApiProperty({ example: 1250000, description: 'Current utilized capacity amount' })
  utilizedCapacity: number;

  @ApiProperty({ example: 3750000, description: 'Remaining capacity amount' })
  availableCapacity: number;

  @ApiProperty({ example: 25.0, description: 'Capacity utilization percentage' })
  utilizationPercentage: number;

  @ApiProperty({ example: false, description: 'Whether the product is fully utilized' })
  isFull: boolean;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z', description: 'Product creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: RiskLevel.LOW, description: 'Risk level classification', enum: RiskLevel })
  riskLevel: RiskLevel;

  @ApiProperty({ example: '2026-03-20T14:30:00.000Z', description: 'Product last update timestamp' })
  updatedAt: Date;
}
