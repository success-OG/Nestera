import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { StellarWebhookController } from './stellar-webhook.controller';
import { WebhooksController } from './webhooks.controller';
import { WebhookService } from './webhook.service';
import { WebhookRetryScheduler } from './webhook-retry.scheduler';
import { WebhookSubscription } from './entities/webhook-subscription.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookSubscription, WebhookDelivery]),
    HttpModule,
  ],
  controllers: [StellarWebhookController, WebhooksController],
  providers: [WebhookService, WebhookRetryScheduler],
  exports: [WebhookService],
})
export class WebhooksModule {}
