import { Module } from '@nestjs/common';
import { ConnectionPoolService } from './connection-pool.config';
import { ConnectionPoolController } from './connection-pool.controller';
import { ConnectionRetryService } from './connection-retry.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ConnectionPoolController],
  providers: [ConnectionPoolService, ConnectionRetryService],
  exports: [ConnectionPoolService, ConnectionRetryService],
})
export class ConnectionPoolModule {}
