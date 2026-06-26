import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ContributeSavingsGroupDto {
  @ApiProperty({
    example: 100,
    description: 'The amount to contribute to the group',
    minimum: 1,
  })
  @IsNumber({}, { message: 'Contribution amount must be a valid number' })
  @Min(1, { message: 'Contribution amount must be at least 1' })
  amount: number;
}
