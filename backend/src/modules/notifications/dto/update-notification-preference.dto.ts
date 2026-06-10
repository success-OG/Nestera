import {
  IsOptional,
  IsBoolean,
  IsEnum,
  IsString,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  DigestFrequency,
  ProfileVisibility,
  ThemePreference,
  DateFormatPreference,
  PreferredContactChannel,
} from '../entities/notification-preference.entity';

export class UpdateUserPreferenceDto {
  // Channel preferences
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  inAppNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiPropertyOptional({ enum: PreferredContactChannel })
  @IsOptional()
  @IsEnum(PreferredContactChannel)
  preferredContactChannel?: PreferredContactChannel;

  // Notification type preferences
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  depositNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  withdrawalNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  goalNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  governanceNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  marketingNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sweepNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  claimNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  yieldNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  milestoneNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  newsletterSubscribed?: boolean;

  // Privacy preferences
  @ApiPropertyOptional({ enum: ProfileVisibility })
  @IsOptional()
  @IsEnum(ProfileVisibility)
  profileVisibility?: ProfileVisibility;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  dataSharingEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  personalizedAds?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  locationSharing?: boolean;

  // Display preferences
  @ApiPropertyOptional({ enum: ThemePreference })
  @IsOptional()
  @IsEnum(ThemePreference)
  theme?: ThemePreference;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/, {
    message: 'language must be a valid locale code',
  })
  language?: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'currency must be a 3-letter ISO code',
  })
  currency?: string;

  @ApiPropertyOptional({ enum: DateFormatPreference })
  @IsOptional()
  @IsEnum(DateFormatPreference)
  dateFormat?: DateFormatPreference;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  compactLayout?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  displayBalancesInFiat?: boolean;

  // Quiet hours
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  quietHoursEnabled?: boolean;

  @ApiPropertyOptional({ example: '22:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'quietHoursStart must be HH:MM',
  })
  quietHoursStart?: string;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'quietHoursEnd must be HH:MM',
  })
  quietHoursEnd?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  timezone?: string;

  // Digest frequency
  @ApiPropertyOptional({ enum: DigestFrequency })
  @IsOptional()
  @IsEnum(DigestFrequency)
  digestFrequency?: DigestFrequency;
}
