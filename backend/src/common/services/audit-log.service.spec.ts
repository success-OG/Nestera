import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogService, CreateAuditLogDto } from './audit-log.service';
import {
  AuditLog,
  AuditAction,
  AuditResourceType,
} from '../entities/audit-log.entity';

const mockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
});

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repo: jest.Mocked<Pick<Repository<AuditLog>, 'create' | 'save'>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: getRepositoryToken(AuditLog), useFactory: mockRepository },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    repo = module.get(getRepositoryToken(AuditLog));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    const dto: CreateAuditLogDto = {
      action: AuditAction.LOGIN,
      actor: 'user@example.com',
      resourceType: AuditResourceType.USER,
      resourceId: 'user-uuid',
      success: true,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      description: 'User login',
    };

    it('should create and save an audit log entry', async () => {
      const entity = { ...dto, id: 'log-uuid' } as AuditLog;
      (repo.create as jest.Mock).mockReturnValue(entity);
      (repo.save as jest.Mock).mockResolvedValue(entity);

      await service.log(dto);

      expect(repo.create).toHaveBeenCalledWith({ ...dto, success: true });
      expect(repo.save).toHaveBeenCalledWith(entity);
    });

    it('should default success to true when not provided', async () => {
      const dtoWithoutSuccess: CreateAuditLogDto = {
        actor: 'user@example.com',
      };
      const entity = { ...dtoWithoutSuccess, success: true } as AuditLog;
      (repo.create as jest.Mock).mockReturnValue(entity);
      (repo.save as jest.Mock).mockResolvedValue(entity);

      await service.log(dtoWithoutSuccess);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it('should not throw when repository save fails', async () => {
      (repo.create as jest.Mock).mockReturnValue({});
      (repo.save as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(service.log(dto)).resolves.not.toThrow();
    });

    it('should not throw when repository create throws', async () => {
      (repo.create as jest.Mock).mockImplementation(() => {
        throw new Error('create error');
      });

      await expect(service.log(dto)).resolves.not.toThrow();
    });

    it('should log failed actions with success=false', async () => {
      const failedDto: CreateAuditLogDto = {
        action: AuditAction.LOGIN,
        actor: 'user@example.com',
        success: false,
        errorMessage: 'Invalid credentials',
      };
      const entity = { ...failedDto } as AuditLog;
      (repo.create as jest.Mock).mockReturnValue(entity);
      (repo.save as jest.Mock).mockResolvedValue(entity);

      await service.log(failedDto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: 'Invalid credentials',
        }),
      );
    });
  });
});
