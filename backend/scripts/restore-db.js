#!/usr/bin/env node
const { execFileSync } = require('child_process');
const { pipeline } = require('stream/promises');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');

const bucket = process.env.BACKUP_S3_BUCKET;
const region = process.env.BACKUP_S3_REGION || 'us-east-1';
const accessKeyId = process.env.BACKUP_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.BACKUP_AWS_SECRET_ACCESS_KEY;
const encryptionKeyHex = process.env.BACKUP_ENCRYPTION_KEY;
const tmpDir = process.env.BACKUP_TMP_DIR || path.join(__dirname, '..', 'tmp');

function fail(message) {
  console.error(`[restore-db] ${message}`);
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { latest: false };
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    if (key === '--latest') {
      opts.latest = true;
    } else if (key === '--file' || key === '--file-path') {
      opts.file = args[++i];
    } else if (key === '--target-db') {
      opts.targetDb = args[++i];
    } else if (key === '--help' || key === '-h') {
      opts.help = true;
    } else {
      fail(`Unknown option: ${key}`);
    }
  }
  return opts;
}

function printUsage() {
  console.log(`Usage: node restore-db.js [--latest | --file <path>] [--target-db <DATABASE_URL>]

Options:
  --latest          Restore the most recent backup from S3
  --file <path>     Restore from a local encrypted backup file
  --target-db <url> PostgreSQL target database URL (defaults to DATABASE_URL env)
  --help            Print this help message
`);
}

function assertEnv(options) {
  if (!options.file && !options.latest) {
    fail('Either --latest or --file must be provided.');
  }
  if (!options.file && options.latest) {
    if (!bucket) fail('BACKUP_S3_BUCKET is required for --latest restore.');
    if (!accessKeyId) fail('BACKUP_AWS_ACCESS_KEY_ID is required for --latest restore.');
    if (!secretAccessKey) fail('BACKUP_AWS_SECRET_ACCESS_KEY is required for --latest restore.');
  }
  if (!encryptionKeyHex) fail('BACKUP_ENCRYPTION_KEY is required.');
  if (encryptionKeyHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(encryptionKeyHex)) {
    fail('BACKUP_ENCRYPTION_KEY must be 64 hex characters.');
  }
}

async function downloadLatestFromS3(destination) {
  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  const listed = await client.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: 'backups/' }),
  );

  const files = (listed.Contents || []).filter((item) => item.Key && item.LastModified);
  if (!files.length) {
    fail('No backups found in S3.');
  }

  files.sort((a, b) => b.LastModified.getTime() - a.LastModified.getTime());
  const latest = files[0].Key;
  if (!latest) fail('No valid backup key was found.');

  console.log(`[restore-db] Downloading latest backup from S3: ${latest}`);
  const response = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: latest }),
  );

  if (!response.Body) fail('S3 response body was empty.');
  await pipeline(response.Body, fs.createWriteStream(destination));
  return latest;
}

async function decryptBackup(inputFile, outputFile) {
  const iv = Buffer.alloc(16);
  const fd = fs.openSync(inputFile, 'r');
  fs.readSync(fd, iv, 0, 16, 0);
  fs.closeSync(fd);

  const key = Buffer.from(encryptionKeyHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const input = fs.createReadStream(inputFile, { start: 16 });
  const output = fs.createWriteStream(outputFile);
  await pipeline(input, decipher, output);
}

function buildExecEnv() {
  const env = { ...process.env };
  if (process.env.DB_PASS) env.PGPASSWORD = process.env.DB_PASS;
  return env;
}

function restoreToDatabase(dumpFile, targetDbUrl) {
  console.log(`[restore-db] Restoring backup to ${targetDbUrl}`);
  execFileSync('pg_restore', [
    '--no-password',
    '--clean',
    '--if-exists',
    '--dbname',
    targetDbUrl,
    dumpFile,
  ], {
    env: buildExecEnv(),
    stdio: 'inherit',
  });
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    printUsage();
    process.exit(0);
  }

  assertEnv(options);

  const targetDbUrl = options.targetDb || process.env.DATABASE_URL;
  if (!targetDbUrl) fail('Target database URL must be provided using --target-db or DATABASE_URL.');

  fs.mkdirSync(tmpDir, { recursive: true });

  const sourceFile = options.file
    ? path.resolve(process.cwd(), options.file)
    : path.join(tmpDir, `latest-backup-${Date.now()}.enc`);

  if (options.latest) {
    await downloadLatestFromS3(sourceFile);
  }

  if (!fs.existsSync(sourceFile)) {
    fail(`Backup file not found: ${sourceFile}`);
  }

  const restoredFile = sourceFile.replace(/\.enc$/, '.dump');
  await decryptBackup(sourceFile, restoredFile);

  restoreToDatabase(restoredFile, targetDbUrl);

  fs.rmSync(restoredFile, { force: true });
  if (options.latest) fs.rmSync(sourceFile, { force: true });

  console.log('[restore-db] Restore completed successfully.');
}

main().catch((error) => {
  console.error('[restore-db] Restore failed:', error.message || error);
  process.exit(1);
});
