import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AdminCancelProposalDto {
  @ApiProperty({
    description: 'Reason for emergency cancellation',
    example: 'Malicious proposal detected',
    minLength: 10,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  reason: string;
}
