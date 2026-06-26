import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SavingsProductType,
  RiskLevel,
} from '../entities/savings-product.entity';

export class CreateProductDto {
  @ApiProperty({ example: 'Fixed 12-Month Plan', description: 'Product name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ enum: SavingsProductType, description: 'Product type' })
  @IsEnum(SavingsProductType)
  type: SavingsProductType;

  @ApiPropertyOptional({ description: 'Product description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 8.5, description: 'Annual interest rate (%)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  interestRate: number;

  @ApiProperty({ example: 1000, description: 'Minimum subscription amount' })
  @IsNumber()
  @Min(0)
  minAmount: number;

  @ApiProperty({ example: 1000000, description: 'Maximum subscription amount' })
  @IsNumber()
  @Min(0)
  maxAmount: number;

  @ApiPropertyOptional({
    example: 12,
    description: 'Tenure in months (e.g. for fixed)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(360)
  tenureMonths?: number;

  @ApiPropertyOptional({
    example: 'contract1234567890abcdefghijklmnopqrstuvwxyz',
    description: 'Soroban contract ID for testnet/mainnet',
  })
  @IsOptional()
  @IsString()
  @MaxLength(56)
  contractId?: string;

  @ApiPropertyOptional({
    description: 'Total Value Locked amount',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tvlAmount?: number;

  @ApiPropertyOptional({
    example: 250000,
    description: 'Maximum liquidity-backed capacity for the product',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCapacity?: number;

  @ApiPropertyOptional({
    enum: RiskLevel,
    default: RiskLevel.LOW,
    description: 'Risk level classification',
  })
  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @ApiPropertyOptional({
    example: 3,
    description: 'Maximum active subscriptions allowed per user',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxSubscriptionsPerUser?: number;
  version?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  isActive?: boolean;
}
