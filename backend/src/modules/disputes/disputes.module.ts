import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import {
  Dispute,
  DisputeMessage,
  DisputeTimeline,
} from './entities/dispute.entity';
import { MedicalClaim } from '../claims/entities/medical-claim.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Dispute,
      DisputeMessage,
      DisputeTimeline,
      MedicalClaim,
    ]),
  ],
  controllers: [DisputesController],
  providers: [DisputesService],
  exports: [DisputesService, Dispute, DisputeTimeline],
})
export class DisputesModule {}
