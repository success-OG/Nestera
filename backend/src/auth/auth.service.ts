import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../modules/user/user.service';
import {
  RegisterDto,
  LoginDto,
  VerifySignatureDto,
  LinkWalletDto,
} from './dto/auth.dto';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import * as StellarSdk from '@stellar/stellar-sdk';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.userService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.userService.create({
      ...dto,
      password: hashedPassword,
    });

    // Apply referral code if provided
    if (dto.referralCode) {
      this.eventEmitter.emit('user.signup-with-referral', {
        userId: user.id,
        referralCode: dto.referralCode,
      });
    }

    return {
      user,
      accessToken: this.generateToken(user.id, user.email, user.role),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if 2FA is enabled
    const fullUser = await this.userService.findByEmail(dto.email);
    if (fullUser?.twoFactorEnabled) {
      return {
        requiresTwoFactor: true,
        userId: user.id,
        message: 'Please provide your 2FA token',
      };
    }

    return {
      accessToken: this.generateToken(
        user.id,
        user.email,
        user.role,
        user.kycStatus,
      ),
    };
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userService.findByEmail(email);
    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  private generateToken(
    userId: string,
    email: string,
    role = 'USER',
    kycStatus = 'NOT_SUBMITTED',
  ) {
    return this.jwtService.sign({ sub: userId, email, role, kycStatus });
  }

  async generateNonce(publicKey: string): Promise<{ nonce: string }> {
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
      throw new BadRequestException('Invalid Stellar public key format');
    }

    const rateLimitKey = `nonce:ratelimit:${publicKey}`;
    const rateLimitCount = await this.cacheManager.get<number>(rateLimitKey);
    if (
      rateLimitCount !== undefined &&
      rateLimitCount !== null &&
      rateLimitCount >= 5
    ) {
      throw new UnauthorizedException('Too many nonce requests');
    }

    const newCount = (rateLimitCount ?? 0) + 1;
    await this.cacheManager.set(rateLimitKey, newCount, 900000);

    const nonce = randomUUID();
    const cacheKey = `nonce:${publicKey}`;
    await this.cacheManager.set(
      cacheKey,
      { nonce, timestamp: Date.now() },
      300000,
    );

    return { nonce };
  }

  async verifySignature(
    dto: VerifySignatureDto,
  ): Promise<{ accessToken: string }> {
    const { publicKey, signature, nonce } = dto;

    if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
      throw new BadRequestException('Invalid Stellar public key format');
    }

    const cacheKey = `nonce:${publicKey}`;
    const stored = await this.cacheManager.get<{
      nonce: string;
      timestamp: number;
    }>(cacheKey);
    if (!stored) {
      throw new UnauthorizedException('Nonce not found or expired');
    }

    if (Date.now() - stored.timestamp > 300000) {
      await this.cacheManager.del(cacheKey);
      throw new UnauthorizedException('Nonce not found or expired');
    }

    if (stored.nonce !== nonce) {
      throw new UnauthorizedException('Nonce mismatch');
    }

    const isValidSignature = this.verifyWalletSignature(
      publicKey,
      signature,
      nonce,
    );

    if (!isValidSignature) {
      throw new UnauthorizedException('Invalid signature');
    }

    await this.cacheManager.del(cacheKey);

    let user = await this.userService.findByPublicKey(publicKey);

    if (!user) {
      user = await this.userService.create({
        publicKey,
        email: `${publicKey.substring(0, 10)}@stellar.wallet`,
        name: `Stellar Wallet User`,
      });
    }

    return {
      accessToken: this.generateToken(user.id, user.email, user.role),
    };
  }

  async linkWallet(
    userId: string,
    dto: LinkWalletDto,
  ): Promise<{ walletAddress: string; message: string }> {
    const { publicKey, nonce, signature } = dto;

    if (!StellarSdk.StrKey.isValidEd25519PublicKey(publicKey)) {
      throw new BadRequestException('Invalid Stellar public key format');
    }

    const cacheKey = `nonce:${publicKey}`;
    const stored = await this.cacheManager.get<{
      nonce: string;
      timestamp: number;
    }>(cacheKey);
    if (!stored) {
      throw new UnauthorizedException('Nonce not found or expired');
    }

    if (Date.now() - stored.timestamp > 300000) {
      await this.cacheManager.del(cacheKey);
      throw new UnauthorizedException('Nonce has expired');
    }

    if (stored.nonce !== nonce) {
      throw new UnauthorizedException('Nonce mismatch');
    }

    const isValid = this.verifyWalletSignature(publicKey, signature, nonce);
    if (!isValid) {
      throw new UnauthorizedException('Signature verification failed');
    }

    await this.cacheManager.del(cacheKey);

    const updatedUser = await this.userService.linkWalletAddress(
      userId,
      publicKey,
    );

    return {
      walletAddress: updatedUser.walletAddress,
      message: 'Wallet linked successfully',
    };
  }

  private verifyWalletSignature(
    publicKey: string,
    signature: string,
    nonce: string,
  ): boolean {
    try {
      // Convert public key string to Keypair
      const keypair = StellarSdk.Keypair.fromPublicKey(publicKey);

      // Convert signature from hex to Buffer
      const signatureBuffer = Buffer.from(signature, 'hex');

      // Verify the signature against the nonce
      return keypair.verify(Buffer.from(nonce), signatureBuffer);
    } catch (error) {
      return false;
    }
  }
}
