import { ApiProperty } from '@nestjs/swagger';
import {
  LedgerTransactionStatus,
  LedgerTransactionType,
} from '../../blockchain/entities/transaction.entity';

export class TransactionResponseDto {
  @ApiProperty({ description: 'Transaction ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({
    description: 'Transaction type',
    enum: LedgerTransactionType,
  })
  type: LedgerTransactionType;

  @ApiProperty({
    description: 'Transaction status',
    enum: LedgerTransactionStatus,
  })
  status: LedgerTransactionStatus;

  @ApiProperty({ description: 'Transaction amount (raw decimal string)' })
  amount: string;

  @ApiProperty({
    description: 'Formatted amount with currency symbol and proper decimals',
    example: {
      raw: '100000000',
      numeric: 100,
      formatted: '100.00',
      display: '$100.00',
      symbol: 'USDC',
      decimals: 7,
    },
  })
  amountFormatted: {
    raw: string;
    numeric: number;
    formatted: string;
    display: string;
    symbol: string;
    decimals: number;
  };

  @ApiProperty({ description: 'Public key', nullable: true })
  publicKey: string | null;

  @ApiProperty({ description: 'Event ID' })
  eventId: string;

  @ApiProperty({ description: 'Transaction hash', nullable: true })
  transactionHash: string | null;

  @ApiProperty({
    description: 'Stellar Expert explorer links',
    example: {
      transaction: 'https://stellar.expert/explorer/testnet/tx/abc123...',
      search: 'https://stellar.expert/explorer/testnet/search?term=abc123...',
      network: 'https://stellar.expert/explorer/testnet',
    },
    nullable: true,
  })
  explorerLinks?: {
    transaction: string;
    search: string;
    network: string;
  };

  @ApiProperty({ description: 'Ledger sequence', nullable: true })
  ledgerSequence: string | null;

  @ApiProperty({ description: 'Pool ID', nullable: true })
  poolId: string | null;

  @ApiProperty({
    description: 'Asset contract ID for formatting',
    example: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
  })
  assetId: string;

  @ApiProperty({ description: 'Additional metadata', nullable: true })
  metadata: Record<string, unknown> | null;

  @ApiProperty({ description: 'Transaction category', nullable: true })
  category?: string | null;

  @ApiProperty({
    description: 'Tags attached to the transaction',
    nullable: true,
    isArray: true,
  })
  tags?: string[];

  @ApiProperty({ description: 'Transaction creation date (ISO 8601)' })
  createdAt: string;

  @ApiProperty({ description: 'Formatted date for display' })
  formattedDate: string;

  @ApiProperty({ description: 'Formatted time for display' })
  formattedTime: string;
}
