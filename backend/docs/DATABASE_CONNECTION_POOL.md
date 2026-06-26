# Database Connection Pooling

This document describes how Nestera configures, monitors, and scales PostgreSQL connection pooling in the NestJS backend.

## Overview

The backend uses **TypeORM** with the **node-pg** driver. Pool settings are passed through TypeORM's `extra` option and applied at application startup via `buildTypeOrmModuleOptions()`.

Monitoring, leak detection, auto-scaling, and alerts are handled by `ConnectionPoolService`, which publishes metrics to the APM module and exposes admin endpoints.

## Connection Modes

The application supports two connection styles (URL takes precedence):

| Mode | Environment variables |
|------|----------------------|
| URL-based | `DATABASE_URL` |
| Host-based | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` |

## Pool Configuration

| Variable | Default (dev / prod) | Description |
|----------|----------------------|-------------|
| `DATABASE_POOL_MAX` | 10 / 30 | Maximum connections in the pool |
| `DATABASE_POOL_MIN` | 2 / 5 | Minimum idle connections kept warm |
| `DATABASE_POOL_MAX_CEILING` | 50 | Upper bound for auto-scaling |
| `DATABASE_IDLE_TIMEOUT` | 30000 | Idle connection timeout (ms) |
| `DATABASE_CONNECTION_TIMEOUT` | 2000 | Time to wait for a new connection (ms) |
| `DATABASE_STATEMENT_TIMEOUT` | 30000 | PostgreSQL statement timeout (ms) |
| `DATABASE_QUERY_TIMEOUT` | 30000 | Query timeout passed to the driver (ms) |
| `DATABASE_POOL_ALLOW_EXIT_ON_IDLE` | false | Allow the pool to release all idle connections |
| `DATABASE_POOL_AUTO_SCALE` | true | Enable runtime pool size adjustments |

### Monitoring & Alerts

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_POOL_MONITOR_INTERVAL` | 30000 | Metrics collection interval (ms) |
| `DATABASE_POOL_SCALE_UP_THRESHOLD` | 80 | Utilization % that triggers scale-up |
| `DATABASE_POOL_SCALE_DOWN_THRESHOLD` | 30 | Utilization % that triggers scale-down |
| `DATABASE_POOL_EXHAUSTION_WAITING_THRESHOLD` | 1 | Waiting requests that trigger exhaustion alert |
| `DATABASE_POOL_LEAK_THRESHOLD` | 90 | Utilization % for leak suspicion |
| `DATABASE_POOL_ALERT_THRESHOLD` | 80% of max | Active connections alert threshold |

### Retry Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_MAX_RETRIES` | 5 | Max retries for transient DB errors |
| `DB_RETRY_INITIAL_DELAY` | 500 | Initial retry delay (ms) |
| `DB_RETRY_MAX_DELAY` | 30000 | Maximum retry delay (ms) |
| `DB_RETRY_BACKOFF` | 2.0 | Exponential backoff multiplier |
| `DB_RETRY_JITTER` | 100 | Random jitter added to retry delay (ms) |

## Auto-Scaling Behavior

When `DATABASE_POOL_AUTO_SCALE=true`:

1. **Scale up** — If utilization stays above `DATABASE_POOL_SCALE_UP_THRESHOLD` for two consecutive monitoring intervals *and* requests are waiting, `pool.options.max` increases by ~20% (minimum 2), capped at `DATABASE_POOL_MAX_CEILING`.
2. **Scale down** — If utilization stays below `DATABASE_POOL_SCALE_DOWN_THRESHOLD` for four consecutive intervals and the current max exceeds the configured `DATABASE_POOL_MAX`, the max is reduced toward the baseline.

Scaling is logged and recorded as APM pool alerts (`pool_scaled_up`, `pool_scaled_down`).

## Monitoring Endpoints

### Health checks (public)

| Endpoint | Description |
|----------|-------------|
| `GET /api/v2/health` | Full health check including pool status |
| `GET /api/v2/health/ready` | Readiness probe (DB + pool) |

### Admin pool API (JWT required)

| Endpoint | Description |
|----------|-------------|
| `GET /api/v2/db/pool/summary` | Utilization summary and current max |
| `GET /api/v2/db/pool/metrics` | Raw metrics history |
| `GET /api/v2/db/pool/health` | Pool health with leak status |
| `GET /api/v2/db/pool/leaks` | Run leak detection |
| `GET /api/v2/db/pool/retry-stats` | Connection retry statistics |
| `POST /api/v2/db/pool/reconnect` | Force reconnection check |

### Prometheus metrics

`GET /api/v2/apm/metrics` exposes:

- `db_pool_active_connections`
- `db_pool_idle_connections`
- `db_pool_waiting_connections`
- `db_pool_utilization_percent`
- `db_pool_max_size`
- `db_pool_alerts_total`

## Alerts

The APM module evaluates pool metrics every 60 seconds and logs alerts for:

| Alert | Severity | Trigger |
|-------|----------|---------|
| `high_db_pool_usage` | warning | Active connections exceed threshold |
| `high_pool_utilization` | warning | Utilization % above scale-up threshold |
| `pool_exhaustion` | critical | Waiting requests with pool at capacity |
| `connection_leak_suspected` | warning | Sustained high utilization with queued requests |

`ConnectionPoolService` also emits real-time log warnings and increments `db_pool_alerts_total`.

## Production Recommendations

1. Set `DATABASE_POOL_MAX` based on `(Postgres max_connections - overhead) / number_of_app_instances`.
2. Keep `DATABASE_POOL_MAX_CEILING` below your Postgres connection budget.
3. Use `DATABASE_URL` in container platforms; use host-based vars in Kubernetes when secrets are split.
4. Monitor `db_pool_waiting_connections` and `pool_exhaustion` alerts in your observability stack.
5. Disable `synchronize` in production (already enforced when `NODE_ENV=production`).

## Related Files

- `backend/src/common/database/typeorm-pool.config.ts` — TypeORM bootstrap with pool settings
- `backend/src/common/database/connection-pool.config.ts` — Monitoring, scaling, leak detection
- `backend/src/common/database/connection-pool.controller.ts` — Admin API
- `backend/src/common/database/connection-retry.service.ts` — Transient error retry
- `backend/src/modules/health/indicators/connection-pool.health.ts` — Health indicator
- `backend/src/modules/apm/apm.service.ts` — Metrics and alert evaluation
