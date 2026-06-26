import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { NotificationProcessor } from './processors/notification.processor';
import { BlockchainProcessor } from './processors/blockchain.processor';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        url: config.get<string>('REDIS_URL') || 'redis://localhost:6379',
        // additional options can be added here
      }),
    }),
    BullModule.registerQueue({ name: 'notifications' }),
    BullModule.registerQueue({ name: 'blockchain' }),
  ],
  providers: [NotificationProcessor, BlockchainProcessor],
})
export class JobsModule {}
