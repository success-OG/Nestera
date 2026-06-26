import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  KycDocumentType,
  KycDocumentStatus,
} from '../entities/kyc-document.entity';

export class UploadKycDocumentDto {
  @ApiProperty({ enum: KycDocumentType })
  @IsEnum(KycDocumentType)
  documentType!: KycDocumentType;
}

export class ReviewKycDocumentDto {
  @ApiProperty({
    enum: [KycDocumentStatus.APPROVED, KycDocumentStatus.REJECTED],
  })
  @IsIn([KycDocumentStatus.APPROVED, KycDocumentStatus.REJECTED])
  status!: KycDocumentStatus.APPROVED | KycDocumentStatus.REJECTED;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;
}
