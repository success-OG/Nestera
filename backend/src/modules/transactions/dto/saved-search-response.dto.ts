import { ApiProperty } from '@nestjs/swagger';
import { TransactionSearchCriteriaDto } from './transaction-search-criteria.dto';

export class SavedSearchResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ type: TransactionSearchCriteriaDto })
  query: TransactionSearchCriteriaDto;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
