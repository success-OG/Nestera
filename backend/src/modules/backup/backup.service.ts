import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { BackupRecord, BackupStatus } from './entities/backup-record.entity';
import { ShutdownTrackedTask } from '../../common/decorators/shutdown-task.decorator';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly encryptionKey: Buffer;
  private readonly retentionDays: number;
  private readonly tmpDir: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(BackupRecord)
    private readonly backupRepo: Repository<BackupRecord>,
  ) {
    this.bucket = this.config.get<string>('backup.s3Bucket')!;
    this.encryptionKey = Buffer.from(
      this.config.get<string>('backup.encryptionKey')!,
      'hex',
    );
    this.retentionDays = this.config.get<number>('backup.retentionDays') ?? 30;
    this.tmpDir = this.config.get<string>('backup.tmpDir') ?? '/tmp';

    this.s3 = new S3Client({
      region: this.config.get<string>('backup.s3Region') ?? 'us-east-1',
      credentials: {
        accessKeyId: this.config.get<string>('backup.awsAccessKeyId')!,
        secretAccessKey: this.config.get<string>('backup.awsSecretAccessKey')!,
      },
    });
  }

  // Daily at 02:00 UTC
  @ShutdownTrackedTask()
  @Cron('0 2 * * *')
  async runDailyBackup(): Promise<BackupRecord> {
    this.logger.log('Starting daily database backup...');
    return this.createBackup();
  }

  async createBackup(): Promise<BackupRecord> {
    const start = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dumpFile = path.join(this.tmpDir, `nestera-${timestamp}.dump`);
    const encFile = `${dumpFile}.enc`;

    const record = this.backupRepo.create({
      filename: path.basename(encFile),
      s3Key: `backups/${path.basename(encFile)}`,
      sizeBytes: 0,
      durationMs: 0,
      status: BackupStatus.FAILED,
      expiresAt: this.retentionExpiry(),
    });

    try {
      await this.pgDump(dumpFile);
      await this.encrypt(dumpFile, encFile);
      fs.unlinkSync(dumpFile);

      const sizeBytes = fs.statSync(encFile).size;
      await this.uploadToS3(encFile, record.s3Key);
      fs.unlinkSync(encFile);

      record.sizeBytes = sizeBytes;
      record.durationMs = Date.now() - start;
      record.status = BackupStatus.SUCCESS;

      this.logger.log(
        `Backup complete: ${record.filename} (${(sizeBytes / 1024 / 1024).toFixed(2)} MB, ${record.durationMs}ms)`,
      );
    } catch (err) {
      record.errorMessage = (err as Error).message;
      record.durationMs = Date.now() - start;
      this.logger.error(`Backup failed: ${record.errorMessage}`);
      this.cleanupFiles(dumpFile, encFile);
    }

    return this.backupRepo.save(record);
  }

  // Purge backups older than retention window — runs daily at 03:00 UTC
  @ShutdownTrackedTask()
  @Cron('0 3 * * *')
  async purgeExpiredBackups(): Promise<void> {
    const expired = await this.backupRepo
      .createQueryBuilder('b')
      .where('b.expiresAt < :now', { now: new Date() })
      .andWhere('b.status = :status', { status: BackupStatus.SUCCESS })
      .getMany();

    for (const record of expired) {
      try {
        await this.s3.send(
          new DeleteObjectCommand({ Bucket: this.bucket, Key: record.s3Key }),
        );
        await this.backupRepo.remove(record);
        this.logger.log(`Purged expired backup: ${record.filename}`);
      } catch (err) {
        this.logger.error(
          `Failed to purge ${record.filename}: ${(err as Error).message}`,
        );
      }
    }
  }

  async getRecentBackups(limit = 10): Promise<BackupRecord[]> {
    return this.backupRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getLastSuccessful(): Promise<BackupRecord | null> {
    return this.backupRepo.findOne({
      where: { status: BackupStatus.SUCCESS },
      order: { createdAt: 'DESC' },
    });
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async pgDump(outFile: string): Promise<void> {
    const dbUrl =
      this.config.get<string>('database.url') ??
      `postgresql://${this.config.get('database.user')}:${this.config.get('database.pass')}@${this.config.get('database.host')}:${this.config.get('database.port')}/${this.config.get('database.name')}`;

    const { stderr } = await execAsync(
      `pg_dump --format=custom --no-password "${dbUrl}" -f "${outFile}"`,
    );
    if (stderr) this.logger.warn(`pg_dump stderr: ${stderr}`);
  }

  private async encrypt(inputFile: string, outputFile: string): Promise<void> {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    const input = fs.createReadStream(inputFile);
    const output = fs.createWriteStream(outputFile);

    // Prepend IV to the encrypted file
    output.write(iv);
    await new Promise<void>((resolve, reject) => {
      input.pipe(cipher).pipe(output);
      output.on('finish', resolve);
      output.on('error', reject);
    });
  }

  private async uploadToS3(filePath: string, key: string): Promise<void> {
    const body = fs.createReadStream(filePath);
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ServerSideEncryption: 'AES256',
        StorageClass: 'STANDARD_IA',
      }),
    );
  }

  private retentionExpiry(): Date {
    const d = new Date();
    d.setDate(d.getDate() + this.retentionDays);
    return d;
  }

  private cleanupFiles(...files: string[]): void {
    for (const f of files) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch (_) {
        // best-effort cleanup
      }
    }
  }
}
