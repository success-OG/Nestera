import { Processor } from '@nestjs/bull';

@Processor('notifications')
export class NotificationProcessor {}
