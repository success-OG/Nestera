import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

export enum DigestFrequency {
  INSTANT = 'instant',
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

export enum ProfileVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  FRIENDS_ONLY = 'FRIENDS_ONLY',
}

export enum ThemePreference {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  SYSTEM = 'SYSTEM',
}

export enum DateFormatPreference {
  MM_DD_YYYY = 'MM/DD/YYYY',
  DD_MM_YYYY = 'DD/MM/YYYY',
  YYYY_MM_DD = 'YYYY-MM-DD',
}

export enum PreferredContactChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

@Entity('notification_preferences')
@Unique(['userId'])
export class UserPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  // ── Communication channel preferences ────────────────────────────────────
  @Column({ type: 'boolean', default: true })
  emailNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  inAppNotifications: boolean;

  @Column({ type: 'boolean', default: false })
  pushNotifications: boolean;

  @Column({ type: 'boolean', default: false })
  smsNotifications: boolean;

  @Column({
    type: 'enum',
    enum: PreferredContactChannel,
    default: PreferredContactChannel.EMAIL,
  })
  preferredContactChannel: PreferredContactChannel;

  // ── Notification type preferences ────────────────────────────────────────
  @Column({ type: 'boolean', default: true })
  depositNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  withdrawalNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  goalNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  governanceNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  badgeNotifications: boolean;

  @Column({ type: 'boolean', default: false })
  marketingNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  sweepNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  claimNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  yieldNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  milestoneNotifications: boolean;

  @Column({ type: 'boolean', default: false })
  newsletterSubscribed: boolean;

  // ── Privacy preferences ──────────────────────────────────────────────────
  @Column({
    type: 'enum',
    enum: ProfileVisibility,
    default: ProfileVisibility.PRIVATE,
  })
  profileVisibility: ProfileVisibility;

  @Column({ type: 'boolean', default: false })
  dataSharingEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  personalizedAds: boolean;

  @Column({ type: 'boolean', default: false })
  locationSharing: boolean;

  // ── Display preferences ──────────────────────────────────────────────────
  @Column({
    type: 'enum',
    enum: ThemePreference,
    default: ThemePreference.SYSTEM,
  })
  theme: ThemePreference;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: DateFormatPreference,
    default: DateFormatPreference.MM_DD_YYYY,
  })
  dateFormat: DateFormatPreference;

  @Column({ type: 'boolean', default: false })
  compactLayout: boolean;

  @Column({ type: 'boolean', default: true })
  displayBalancesInFiat: boolean;

  // ── Quiet hours ──────────────────────────────────────────────────────────
  @Column({ type: 'boolean', default: false })
  quietHoursEnabled: boolean;

  @Column({ type: 'varchar', length: 5, default: '22:00' })
  quietHoursStart: string; // HH:MM

  @Column({ type: 'varchar', length: 5, default: '08:00' })
  quietHoursEnd: string; // HH:MM

  @Column({ type: 'varchar', length: 50, default: 'UTC' })
  timezone: string;

  // ── Digest frequency ─────────────────────────────────────────────────────
  @Column({
    type: 'enum',
    enum: DigestFrequency,
    default: DigestFrequency.INSTANT,
  })
  digestFrequency: DigestFrequency;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
