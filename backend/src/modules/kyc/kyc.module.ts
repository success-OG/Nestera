import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { KycComplianceReport } from './entities/kyc-compliance-report.entity';
import { KycVerification } from './entities/kyc-verification.entity';
import { KycDocument } from './entities/kyc-document.entity';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { KycDocumentService } from './kyc-document.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KycVerification,
      KycComplianceReport,
      KycDocument,
      User,
    ]),
  ],
  controllers: [KycController],
  providers: [KycService, KycDocumentService],
  exports: [KycService, KycDocumentService],
})
export class KycModule {}
