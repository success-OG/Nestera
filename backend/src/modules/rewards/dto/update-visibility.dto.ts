import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVisibilityDto {
  @ApiProperty()
  @IsBoolean()
  isLeaderboardVisible: boolean;
}
