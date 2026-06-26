import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { UpdateUserPreferenceDto } from './dto/update-notification-preference.dto';
import { User } from '../user/entities/user.entity';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users/notifications')
@UseGuards(JwtAuthGuard)
export class UserNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Get all notification preference settings' })
  getPreferences(@CurrentUser() user: User) {
    return this.notificationsService.getOrCreatePreferences(user.id);
  }

  @Post('preferences')
  @ApiOperation({ summary: 'Create or restore user preference settings' })
  createPreferences(@CurrentUser() user: User) {
    return this.notificationsService.createPreferences(user.id);
  }

  @Patch('preferences')
  @ApiOperation({
    summary:
      'Update user preferences (notifications, privacy, display, channels, quiet hours, digest frequency)',
  })
  updatePreferences(
    @CurrentUser() user: User,
    @Body() dto: UpdateUserPreferenceDto,
  ) {
    return this.notificationsService.updatePreferences(user.id, dto);
  }

  @Delete('preferences')
  @ApiOperation({ summary: 'Reset user preferences to defaults' })
  deletePreferences(@CurrentUser() user: User) {
    return this.notificationsService.deletePreferences(user.id);
  }
}
