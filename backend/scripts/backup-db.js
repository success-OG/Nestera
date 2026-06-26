#!/usr/bin/env node
const { execFileSync } = require('child_process');
const { pipeline } = require('stream/promises');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

const backupPrefix = 'backups/';
const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
const bucket = process.env.BACKUP_S3_BUCKET;
const region = process.env.BACKUP_S3_REGION || 'us-east-1';
const accessKeyId = process.env.BACKUP_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.BACKUP_AWS_SECRET_ACCESS_KEY;
const encryptionKeyHex = process.env.BACKUP_ENCRYPTION_KEY;
const tmpDir = process.env.BACKUP_TMP_DIR || path.join(__dirname, '..', 'tmp');

function fail(message) {
  console.error(`[backup-db] ${message}`);
  process.exit(1);
}

function assertEnv() {
  if (!bucket) fail('BACKUP_S3_BUCKET is required.');
  if (!accessKeyId) fail('BACKUP_AWS_ACCESS_KEY_ID is required.');
  if (!secretAccessKey) fail('BACKUP_AWS_SECRET_ACCESS_KEY is required.');
  if (!encryptionKeyHex) fail('BACKUP_ENCRYPTION_KEY is required.');
  if (encryptionKeyHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(encryptionKeyHex)) {
    fail('BACKUP_ENCRYPTION_KEY must be 64 hex characters.');
  }
}

function buildPgDumpArgs(dumpFile) {
  if (process.env.DATABASE_URL) {
    return [
      '--format=custom',
      '--no-password',
      `--dbname=${process.env.DATABASE_URL}`,
      `--file=${dumpFile}`,
    ];
  }

  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || '5432';
  const user = process.env.DB_USER;
  const database = process.env.DB_NAME;

  if (!host || !user || !database) {
    fail('DATABASE_URL or DB_HOST/DB_NAME/DB_USER must be set.');
  }

  return [
    '--format=custom',
    '--no-password',
    `--host=${host}`,
    `--port=${port}`,
    `--username=${user}`,
    `--dbname=${database}`,
    `--file=${dumpFile}`,
  ];
}

function buildExecEnv() {
  const env = { ...process.env };
  if (process.env.DB_PASS) {
    env.PGPASSWORD = process.env.DB_PASS;
  }
  return env;
}

async function encryptFile(inputFile, outputFile) {
  const key = Buffer.from(encryptionKeyHex, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const input = fs.createReadStream(inputFile);
  const output = fs.createWriteStream(outputFile);

  output.write(iv);
  await pipeline(input, cipher, output);
}

async function uploadToS3(filePath, key) {
  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  const body = fs.createReadStream(filePath);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ServerSideEncryption: 'AES256',
      StorageClass: 'STANDARD_IA',
    }),
  );
}

async function pruneExpiredBackups() {
  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  const now = Date.now();
  const expiryMs = now - retentionDays * 24 * 60 * 60 * 1000;

  const response = await client.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: backupPrefix }),
  );

  const oldObjects = (response.Contents || []).filter(
    (item) => item.Key && item.LastModified && item.LastModified.getTime() < expiryMs,
  );

  for (const object of oldObjects) {
    if (!object.Key) continue;
    await client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: object.Key }),
    );
    console.log(`[backup-db] Deleted expired backup from S3: ${object.Key}`);
  }
}

async function main() {
  assertEnv();
  fs.mkdirSync(tmpDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dumpFile = path.join(tmpDir, `nestera-${timestamp}.dump`);
  const encryptedFile = `${dumpFile}.enc`;
  const s3Key = `${backupPrefix}${path.basename(encryptedFile)}`;

  console.log(`[backup-db] Creating backup file: ${dumpFile}`);
  execFileSync('pg_dump', buildPgDumpArgs(dumpFile), {
    env: buildExecEnv(),
    stdio: 'inherit',
  });

  console.log('[backup-db] Encrypting backup');
  await encryptFile(dumpFile, encryptedFile);
  fs.unlinkSync(dumpFile);

  console.log(`[backup-db] Uploading encrypted backup to s3://${bucket}/${s3Key}`);
  await uploadToS3(encryptedFile, s3Key);

  const size = fs.statSync(encryptedFile).size;
  console.log(`[backup-db] Uploaded ${path.basename(encryptedFile)} (${(size / 1024 / 1024).toFixed(2)} MB)`);

  console.log('[backup-db] Pruning expired backups');
  await pruneExpiredBackups();

  fs.unlinkSync(encryptedFile);
  console.log('[backup-db] Backup completed');
}

main().catch((error) => {
  console.error('[backup-db] Backup failed:', error.message || error);
  process.exit(1);
});
