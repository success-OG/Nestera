import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteMemberDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The UUID of the user to invite to the group',
  })
  @IsUUID('4', { message: 'A valid User UUID is required' })
  @IsNotEmpty({ message: 'User ID is required' })
  userId: string;
}
