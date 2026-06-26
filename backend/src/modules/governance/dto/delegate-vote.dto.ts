import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DelegateVoteDto {
  @ApiProperty({
    description: 'The Stellar wallet address to delegate voting power to',
    example: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
  })
  @IsString()
  @IsNotEmpty()
  delegateAddress: string;
}
