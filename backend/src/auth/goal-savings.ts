import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac, randomBytes } from 'crypto';
import { User } from '../modules/user/entities/user.entity';

const TOTP_STEP = 30; // seconds
const TOTP_DIGITS = 6;
const ISSUER = 'Nestera';
const BACKUP_CODE_COUNT = 8;

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async enable(userId: string): Promise<{
    secret: string;
    otpauthUrl: string;
    backupCodes: string[];
  }> {
    const user = await this.findUser(userId);

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    // Generate a 20-byte secret, encode as base32
    const secretBuffer = randomBytes(20);
    const secret = this.base32Encode(secretBuffer);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Store secret and backup codes (not yet enabled until verified)
    await this.userRepository.update(userId, {
      twoFactorSecret: secret,
      twoFactorBackupCodes: backupCodes,
    });

    // Build otpauth:// URI for QR code generation by the client
    const otpauthUrl = `otpauth://totp/${ISSUER}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${ISSUER}&digits=${TOTP_DIGITS}&period=${TOTP_STEP}`;

    this.logger.log(`2FA setup initiated for user ${userId}`);

    return { secret, otpauthUrl, backupCodes };
  }

  async verify(
    userId: string,
    token: string,
  ): Promise<{ enabled: boolean; message: string }> {
    const user = await this.findUser(userId);

    if (!user.twoFactorSecret) {
      throw new BadRequestException(
        'Call POST /auth/2fa/enable first to generate a secret',
      );
    }

    if (!this.verifyTotp(user.twoFactorSecret, token)) {
      throw new UnauthorizedException('Invalid 2FA token');
    }

    // Activate 2FA
    await this.userRepository.update(userId, { twoFactorEnabled: true });

    this.logger.log(`2FA enabled for user ${userId}`);

    return { enabled: true, message: '2FA has been enabled successfully' };
  }

  async validateLogin(userId: string, token: string): Promise<boolean> {
    const user = await this.findUser(userId);

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return true; // 2FA not enabled, skip
    }

    // Try TOTP first
    if (this.verifyTotp(user.twoFactorSecret, token)) {
      return true;
    }

    // Try backup code
    if (user.twoFactorBackupCodes?.includes(token)) {
      // Consume the backup code
      const remaining = user.twoFactorBackupCodes.filter((c) => c !== token);
      await this.userRepository.update(userId, {
        twoFactorBackupCodes: remaining.length > 0 ? remaining : null,
      });
      this.logger.log(`Backup code used for user ${userId}`);
      return true;
    }

    return false;
  }

  async disable(userId: string): Promise<{ message: string }> {
    const user = await this.findUser(userId);

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled');
    }

    await this.userRepository.update(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
    });

    this.logger.log(`2FA disabled for user ${userId}`);

    return { message: '2FA has been disabled' };
  }

  async adminDisable(targetUserId: string): Promise<{ message: string }> {
    const user = await this.findUser(targetUserId);

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('2FA is not enabled for this user');
    }

    await this.userRepository.update(targetUserId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
    });

    this.logger.log(`2FA admin-disabled for user ${targetUserId}`);

    return { message: `2FA disabled for user ${targetUserId}` };
  }

  async getStatus(userId: string): Promise<{ enabled: boolean }> {
    const user = await this.findUser(userId);
    return { enabled: user.twoFactorEnabled };
  }

  async completeLogin(userId: string): Promise<{ accessToken: string }> {
    const user = await this.findUser(userId);
    return {
      accessToken: this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
    };
  }

  // --- TOTP Implementation using Node.js crypto ---

  private verifyTotp(secret: string, token: string): boolean {
    const secretBuffer = this.base32Decode(secret);
    const now = Math.floor(Date.now() / 1000);

    // Check current window and ±1 step for clock drift
    for (let offset = -1; offset <= 1; offset++) {
      const counter = Math.floor((now + offset * TOTP_STEP) / TOTP_STEP);
      const expected = this.generateHotp(secretBuffer, counter);
      if (expected === token) {
        return true;
      }
    }
    return false;
  }

  private generateHotp(secret: Buffer, counter: number): string {
    // Convert counter to 8-byte big-endian buffer
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    counterBuffer.writeUInt32BE(counter & 0xffffffff, 4);

    const hmac = createHmac('sha1', secret).update(counterBuffer).digest();

    // Dynamic truncation
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    return (code % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, '0');
  }

  private base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';

    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) {
      output += alphabet[(value << (5 - bits)) & 31];
    }
    return output;
  }

  private base32Decode(encoded: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (const char of encoded.toUpperCase()) {
      const idx = alphabet.indexOf(char);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return Buffer.from(output);
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const code = randomBytes(4).toString('hex'); // 8-char hex codes
      codes.push(code);
    }
    return codes;
  }

  private async findUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
