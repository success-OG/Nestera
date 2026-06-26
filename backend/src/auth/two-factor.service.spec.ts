import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TwoFactorService } from './two-factor.service';
import { User } from '../modules/user/entities/user.entity';

const mockUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-1',
    email: 'test@example.com',
    role: 'USER',
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorBackupCodes: null,
    ...overrides,
  }) as User;

describe('TwoFactorService', () => {
  let service: TwoFactorService;

  const mockUserRepository = {
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-access-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
    jest.clearAllMocks();
  });

  describe('enable()', () => {
    it('returns secret, otpauthUrl, and backupCodes', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser());

      const result = await service.enable('user-1');

      expect(result.secret).toBeDefined();
      expect(result.otpauthUrl).toMatch(/^otpauth:\/\/totp\/Nestera:/);
      expect(result.backupCodes).toHaveLength(8);
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', {
        twoFactorSecret: result.secret,
        twoFactorBackupCodes: result.backupCodes,
      });
    });

    it('throws BadRequestException if 2FA already enabled', async () => {
      mockUserRepository.findOne.mockResolvedValue(
        mockUser({ twoFactorEnabled: true }),
      );

      await expect(service.enable('user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.enable('user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('verify()', () => {
    it('activates 2FA when token is valid', async () => {
      // Generate a real TOTP token using the service's internal logic
      const secret = 'JBSWY3DPEHPK3PXP'; // well-known test secret
      mockUserRepository.findOne.mockResolvedValue(
        mockUser({ twoFactorSecret: secret }),
      );

      // Spy on verifyTotp to force it to return true
      jest.spyOn(service as any, 'verifyTotp').mockReturnValue(true);

      const result = await service.verify('user-1', '123456');

      expect(result.enabled).toBe(true);
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', {
        twoFactorEnabled: true,
      });
    });

    it('throws UnauthorizedException for invalid token', async () => {
      mockUserRepository.findOne.mockResolvedValue(
        mockUser({ twoFactorSecret: 'JBSWY3DPEHPK3PXP' }),
      );
      jest.spyOn(service as any, 'verifyTotp').mockReturnValue(false);

      await expect(service.verify('user-1', '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws BadRequestException if no secret set', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser());

      await expect(service.verify('user-1', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateLogin()', () => {
    it('returns true when 2FA is not enabled', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser());

      expect(await service.validateLogin('user-1', 'any')).toBe(true);
    });

    it('returns true for valid TOTP token', async () => {
      mockUserRepository.findOne.mockResolvedValue(
        mockUser({
          twoFactorEnabled: true,
          twoFactorSecret: 'JBSWY3DPEHPK3PXP',
        }),
      );
      jest.spyOn(service as any, 'verifyTotp').mockReturnValue(true);

      expect(await service.validateLogin('user-1', '123456')).toBe(true);
    });

    it('consumes a backup code and returns true', async () => {
      const backupCodes = ['aabbccdd', '11223344'];
      mockUserRepository.findOne.mockResolvedValue(
        mockUser({
          twoFactorEnabled: true,
          twoFactorSecret: 'JBSWY3DPEHPK3PXP',
          twoFactorBackupCodes: backupCodes,
        }),
      );
      jest.spyOn(service as any, 'verifyTotp').mockReturnValue(false);

      expect(await service.validateLogin('user-1', 'aabbccdd')).toBe(true);
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', {
        twoFactorBackupCodes: ['11223344'],
      });
    });

    it('nullifies backup codes when last one is used', async () => {
      mockUserRepository.findOne.mockResolvedValue(
        mockUser({
          twoFactorEnabled: true,
          twoFactorSecret: 'JBSWY3DPEHPK3PXP',
          twoFactorBackupCodes: ['aabbccdd'],
        }),
      );
      jest.spyOn(service as any, 'verifyTotp').mockReturnValue(false);

      await service.validateLogin('user-1', 'aabbccdd');

      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', {
        twoFactorBackupCodes: null,
      });
    });

    it('returns false for invalid token and no matching backup code', async () => {
      mockUserRepository.findOne.mockResolvedValue(
        mockUser({
          twoFactorEnabled: true,
          twoFactorSecret: 'JBSWY3DPEHPK3PXP',
          twoFactorBackupCodes: ['aabbccdd'],
        }),
      );
      jest.spyOn(service as any, 'verifyTotp').mockReturnValue(false);

      expect(await service.validateLogin('user-1', 'wrongcode')).toBe(false);
    });
  });

  describe('disable()', () => {
    it('disables 2FA and clears secret/backup codes', async () => {
      mockUserRepository.findOne.mockResolvedValue(
        mockUser({ twoFactorEnabled: true, twoFactorSecret: 'SECRET' }),
      );

      const result = await service.disable('user-1');

      expect(result.message).toBeDefined();
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      });
    });

    it('throws BadRequestException if 2FA not enabled', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser());

      await expect(service.disable('user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getStatus()', () => {
    it('returns enabled: false when 2FA is off', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser());

      expect(await service.getStatus('user-1')).toEqual({ enabled: false });
    });

    it('returns enabled: true when 2FA is on', async () => {
      mockUserRepository.findOne.mockResolvedValue(
        mockUser({ twoFactorEnabled: true }),
      );

      expect(await service.getStatus('user-1')).toEqual({ enabled: true });
    });
  });

  describe('completeLogin()', () => {
    it('returns a signed JWT access token', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser());

      const result = await service.completeLogin('user-1');

      expect(result.accessToken).toBe('mock-access-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'test@example.com',
        role: 'USER',
      });
    });
  });

  describe('adminDisable()', () => {
    it('disables 2FA for a target user', async () => {
      mockUserRepository.findOne.mockResolvedValue(
        mockUser({ twoFactorEnabled: true }),
      );

      const result = await service.adminDisable('user-1');

      expect(result.message).toContain('user-1');
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      });
    });

    it('throws BadRequestException if 2FA not enabled for target user', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser());

      await expect(service.adminDisable('user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
