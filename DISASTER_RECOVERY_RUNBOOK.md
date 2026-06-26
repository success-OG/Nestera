# Nestera — Disaster Recovery Runbook

## Overview

| Item | Value |
|---|---|
| Backup schedule | Daily at 02:00 UTC |
| Retention | 30 days |
| Storage | AWS S3 (`nestera-db-backups`) with `STANDARD_IA` storage class |
| Encryption | AES-256-CBC (key stored in `BACKUP_ENCRYPTION_KEY`) + S3 SSE-AES256 |
| PITR | PostgreSQL WAL archiving enabled (see `docker-compose.yml`) |
| RTO target | < 2 hours |
| RPO target | < 24 hours (daily backup) / near-zero with WAL replay |

---

## 1. Assess the Incident

1. Check backup status: `GET /api/backup/status` (admin token required)
2. Check recent backup records: `GET /api/backup/records`
3. Identify the last successful backup and its `createdAt` timestamp
4. Determine target recovery point (latest backup vs. specific point-in-time)

---

## 2. Point-in-Time Recovery (WAL-based)

Use this when you need to recover to a specific timestamp between backups.

```bash
# 1. Stop the application
docker compose stop api

# 2. Restore the base backup (see Section 3 first)

# 3. Create recovery config
cat > /var/lib/postgresql/data/recovery.conf <<EOF
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
recovery_target_time = '2026-03-29 14:30:00 UTC'
recovery_target_action = 'promote'
EOF

# 4. Start PostgreSQL — it will replay WAL up to the target time
docker compose start postgres

# 5. Monitor recovery progress
docker compose logs -f postgres | grep -E "recovery|redo"
```

---

## 3. Full Backup Restore

### 3a. Download and decrypt the backup

```bash
# Download from S3
aws s3 cp s3://nestera-db-backups/backups/<filename>.dump.enc /tmp/restore.dump.enc \
  --region us-east-1

# Decrypt (requires BACKUP_ENCRYPTION_KEY as 64 hex chars)
node -e "
const fs = require('fs');
const crypto = require('crypto');
const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY, 'hex');
const data = fs.readFileSync('/tmp/restore.dump.enc');
const iv = data.subarray(0, 16);
const enc = data.subarray(16);
const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
fs.writeFileSync('/tmp/restore.dump', Buffer.concat([decipher.update(enc), decipher.final()]));
console.log('Decrypted successfully');
"
```

### 3b. Restore to PostgreSQL

```bash
# Drop and recreate the target database
psql "$DATABASE_URL" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='nestera' AND pid <> pg_backend_pid();"
psql "postgresql://nestera:nestera@localhost:5432/postgres" -c "DROP DATABASE IF EXISTS nestera;"
psql "postgresql://nestera:nestera@localhost:5432/postgres" -c "CREATE DATABASE nestera;"

# Restore
pg_restore --no-password -d "$DATABASE_URL" /tmp/restore.dump

# Verify
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"
```

### 3c. Restart the application

```bash
docker compose up -d api
curl http://localhost:3001/health
```

---

## 4. Trigger On-Demand Backup

```bash
curl -X POST https://api.nestera.io/api/backup/trigger \
  -H "Authorization: Bearer <admin_token>"
```

---

## 5. Trigger On-Demand Restore Test

```bash
curl -X POST https://api.nestera.io/api/backup/restore-test \
  -H "Authorization: Bearer <admin_token>"
```

---

## 6. Monitoring & Alerts

- Backup monitor runs **every hour** — alerts ops@nestera.io if no successful backup in 26h
- Failed backup check runs at **02:30 UTC** daily
- Monthly restore test runs on the **first Sunday of each month at 04:00 UTC**
- All backup events are logged with size (MB) and duration (ms) metrics

---

## 7. Encryption Key Rotation

1. Generate a new key: `openssl rand -hex 32`
2. Update `BACKUP_ENCRYPTION_KEY` in your secrets manager / `.env`
3. Restart the API service
4. Old backups remain decryptable with the old key — store it securely until all old backups expire (30 days)

---

## 8. Contacts

| Role | Contact |
|---|---|
| On-call engineer | ops@nestera.io |
| AWS account owner | devops@nestera.io |
| Escalation | dev@nestera.io |


// Working on task