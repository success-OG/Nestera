import { ApiProperty } from '@nestjs/swagger';
import { VoteDirection } from '../entities/vote.entity';

export class CastVoteDto {
  @ApiProperty({
    enum: VoteDirection,
    description: 'The direction of the vote',
    example: VoteDirection.FOR,
  })
  direction!: VoteDirection;
}
