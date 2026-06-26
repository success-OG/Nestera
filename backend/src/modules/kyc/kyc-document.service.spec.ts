import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { KycDocumentService } from './kyc-document.service';
import {
  KycDocument,
  KycDocumentType,
  KycDocumentStatus,
} from './entities/kyc-document.entity';
import { KycVerification } from './entities/kyc-verification.entity';
import { User } from '../user/entities/user.entity';
import { PiiEncryptionService } from '../../common/services/pii-encryption.service';

const mockRepo = () => ({
  create: jest.fn((v) => v),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
});

describe('KycDocumentService', () => {
  let service: KycDocumentService;
  let docRepo: ReturnType<typeof mockRepo>;
  let userRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    docRepo = mockRepo();
    userRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycDocumentService,
        { provide: getRepositoryToken(KycDocument), useValue: docRepo },
        { provide: getRepositoryToken(KycVerification), useValue: mockRepo() },
        { provide: getRepositoryToken(User), useValue: userRepo },
        {
          provide: PiiEncryptionService,
          useValue: { encrypt: jest.fn(() => 'encrypted-data') },
        },
      ],
    }).compile();

    service = module.get<KycDocumentService>(KycDocumentService);
  });

  describe('uploadDocument', () => {
    it('rejects invalid mime type for SELFIE', async () => {
      await expect(
        service.uploadDocument('u1', KycDocumentType.SELFIE, {
          buffer: Buffer.from('test'),
          originalname: 'doc.pdf',
          mimetype: 'application/pdf',
          size: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('saves document with PENDING_REVIEW status', async () => {
      docRepo.save.mockImplementation((d) =>
        Promise.resolve({ id: 'doc-1', ...d }),
      );

      const result = await service.uploadDocument(
        'u1',
        KycDocumentType.PASSPORT,
        {
          buffer: Buffer.from('test'),
          originalname: 'passport.jpg',
          mimetype: 'image/jpeg',
          size: 1024,
        },
      );

      expect(result.status).toBe(KycDocumentStatus.PENDING_REVIEW);
      expect(userRepo.update).toHaveBeenCalledWith('u1', {
        kycStatus: 'PENDING',
      });
    });
  });

  describe('reviewDocument', () => {
    it('approves pending document', async () => {
      docRepo.findOne.mockResolvedValue({
        id: 'doc-1',
        userId: 'u1',
        status: KycDocumentStatus.PENDING_REVIEW,
      });
      docRepo.save.mockImplementation((d) => Promise.resolve(d));

      const result = await service.reviewDocument('doc-1', 'admin-1', {
        status: KycDocumentStatus.APPROVED,
      });

      expect(result.status).toBe(KycDocumentStatus.APPROVED);
    });

    it('throws when document not found', async () => {
      docRepo.findOne.mockResolvedValue(null);
      await expect(
        service.reviewDocument('bad', 'admin', {
          status: KycDocumentStatus.APPROVED,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
