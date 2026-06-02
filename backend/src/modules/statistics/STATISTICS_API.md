# Statistics API Documentation

## Overview

The Statistics API provides comprehensive metrics aggregation, time-series data support, and real-time monitoring for the admin dashboard. It includes user growth analytics, transaction volume metrics, savings performance data, and system health monitoring.

## Architecture

### Module Structure

```
statistics/
├── entities/
│   ├── system-statistics.entity.ts
│   ├── user-growth-metrics.entity.ts
│   ├── transaction-metrics.entity.ts
│   ├── savings-metrics.entity.ts
│   └── system-health-metrics.entity.ts
├── dto/
│   ├── statistics-query.dto.ts
│   └── statistics-response.dto.ts
├── services/
│   ├── statistics.service.ts
│   ├── statistics-aggregation.service.ts
├── statistics.controller.ts
└── statistics.module.ts
```

### Key Features

#### 1. **Statistics Schema**
- **System Statistics**: Daily snapshots of overall metrics
- **User Growth Metrics**: Time-series user acquisition, retention, churn
- **Transaction Metrics**: Transaction volumes, success rates, gas usage
- **Savings Metrics**: Account counts, TVL, APY distribution, inflows/outflows
- **System Health Metrics**: Uptime, response times, resource usage, alerts

#### 2. **Metrics Aggregation**
The `StatisticsAggregationService` aggregates metrics from raw data:
- Calculates user growth rates and retention metrics
- Aggregates transaction data with success/failure analysis
- Computes savings metrics from subscription data
- Groups data by product, region, segment, and type

#### 3. **Time-Series Data Support**
- Store metrics at multiple granularities: daily, weekly, monthly, yearly
- Retrieve historical trends for analysis
- Calculate period-over-period changes
- Support custom date ranges

#### 4. **Comparison Periods**
- **Previous Period**: Compare with immediately preceding period
- **Same Period Last Year**: Year-over-year comparison
- **Same Period Last Month**: Month-over-month comparison
- Automatic calculation of change and percentage change

#### 5. **Drill-Down Capabilities**
- Drill down by transaction type, region, product
- Analyze subcategories within main metrics
- Support filtering by custom segments
- Hierarchical data exploration

#### 6. **Caching Strategy**
- **Default TTL**: 5 minutes for real-time metrics
- **Long TTL**: 1 hour for historical data
- Cache invalidation on data updates
- Pattern-based cache clearing
- Configurable cache patterns

## API Endpoints

### Overview Endpoint
```
GET /admin/statistics/overview
```
Returns comprehensive statistics across all metrics.

**Query Parameters:**
- `range`: Time range (7d, 30d, 90d, 365d, custom) - default: 30d
- `period`: Granularity (daily, weekly, monthly, yearly) - default: daily
- `compareWith`: Comparison period (previous_period, same_period_last_year, same_period_last_month)
- `fromDate`: Custom range start (YYYY-MM-DD)
- `toDate`: Custom range end (YYYY-MM-DD)
- `page`: Pagination page - default: 1
- `limit`: Items per page (1-500) - default: 50

**Response:**
```json
{
  "userGrowth": {
    "totalUsers": 15000,
    "activeUsers": 12500,
    "newUsersCount": 250,
    "inactiveUsers": 2500,
    "churnedUsers": 120,
    "retentionRate": 95.2,
    "churnRate": 4.8,
    "growthRate": 2.3,
    "usersByRegion": {...},
    "usersBySegment": {...},
    "timeSeries": [...],
    "comparison": {...}
  },
  "transactionVolume": {...},
  "savingsMetrics": {...},
  "systemHealth": {...},
  "generatedAt": "2024-01-15T10:30:00Z"
}
```

### User Growth Endpoint
```
GET /admin/statistics/users/growth
```
Get detailed user growth statistics with optional comparison and time-series data.

**Response Fields:**
- `totalUsers`: Total active users
- `newUsersCount`: New users in period
- `activeUsers`: Currently active users
- `retentionRate`: User retention percentage
- `churnRate`: User churn percentage
- `growthRate`: Growth rate percentage
- `usersByRegion`: Distribution by geographic region
- `usersBySegment`: Distribution by user segment
- `timeSeries`: Historical data points with timestamps

### Transaction Volume Endpoint
```
GET /admin/statistics/transactions/volume
```
Get transaction volume metrics with drill-down capabilities.

**Additional Query Parameters:**
- `filter`: Transaction type filter for drill-down

**Response Fields:**
- `totalTransactions`: Total transaction count
- `successfulTransactions`: Successful transactions
- `failedTransactions`: Failed transactions
- `totalVolume`: Sum of all transaction amounts
- `avgTransactionAmount`: Average transaction size
- `successRate`: Success rate percentage
- `failureRate`: Failure rate percentage
- `avgGasUsed`: Average gas per transaction
- `transactionsByType`: Breakdown by transaction type
- `volumeByType`: Volume breakdown by type
- `drillDown`: Detailed breakdown if filter provided

### Savings Metrics Endpoint
```
GET /admin/statistics/savings/metrics
```
Get savings product performance and TVL metrics.

**Additional Query Parameters:**
- `filter`: Product filter for drill-down

**Response Fields:**
- `totalAccounts`: Total savings accounts
- `activeAccounts`: Currently active accounts
- `totalValueLocked`: Total TVL in platform
- `avgApy`: Average APY across products
- `accountsByProduct`: Accounts per product
- `tvlByProduct`: TVL per product
- `apyByProduct`: APY per product
- `accountGrowthRate`: Account growth rate
- `tvlGrowthRate`: TVL growth rate

### System Health Endpoint
```
GET /admin/statistics/system/health
```
Get real-time system health metrics.

**Response Fields:**
- `healthScore`: Overall health score (0-100)
- `apiUptime`: API service uptime percentage
- `blockchainUptime`: Blockchain connectivity uptime
- `avgResponseTime`: Average API response time (ms)
- `p95ResponseTime`: 95th percentile response time
- `p99ResponseTime`: 99th percentile response time
- `cpuUsage`: CPU usage percentage
- `memoryUsage`: Memory usage percentage
- `cacheHitRate`: Cache hit rate percentage
- `serviceStatus`: Status of each service
- `alerts`: Active alerts and warnings

### Cache Management Endpoint
```
DELETE /admin/statistics/cache
```
Clear statistics cache.

**Query Parameters:**
- `pattern`: Optional pattern to match cache keys (max 100 chars)

**Response:** 204 No Content

### Data Export Endpoint
```
GET /admin/statistics/export/:dataType
```
Export statistics in various formats.

**Parameters:**
- `dataType`: all | users | transactions | savings | health
- `format`: json | csv | xlsx

**Response:** Exported data in requested format

### Drill-Down Endpoint
```
GET /admin/statistics/drilldown/:metricType/:category
```
Get detailed drill-down data for a specific metric.

**Parameters:**
- `metricType`: users | transactions | savings
- `category`: Category to drill into

## Usage Examples

### 1. Get Last 30 Days Overview
```bash
curl -X GET "http://localhost:3000/admin/statistics/overview?range=30d&period=daily" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Compare with Previous Year
```bash
curl -X GET "http://localhost:3000/admin/statistics/users/growth?range=90d&compareWith=same_period_last_year" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Get Transaction Volume with Drill-Down by Type
```bash
curl -X GET "http://localhost:3000/admin/statistics/transactions/volume?filter=deposit&limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Export User Data as CSV
```bash
curl -X GET "http://localhost:3000/admin/statistics/export/users?format=csv&range=30d" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o statistics_users.csv
```

### 5. Clear Cache
```bash
curl -X DELETE "http://localhost:3000/admin/statistics/cache" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Caching Strategy

### Cache Keys Format
```
statistics:{type}:{range}:{period}:{compareWith}:page_{page}
```

### TTL Configuration
- **Real-time metrics**: 5 minutes (300 seconds)
- **Historical data**: 1 hour (3600 seconds)
- **Aggregated snapshots**: 5 minutes

### Cache Invalidation
- Automatic on daily aggregation cron job (midnight UTC)
- Manual clearing via `/admin/statistics/cache` endpoint
- Pattern-based clearing for specific metric types

### Examples
```typescript
// Cache for 30-day daily metrics
Key: statistics:user_growth:30d:daily:none:page_1
TTL: 300 seconds

// Cache for 365-day data
Key: statistics:savings_metrics:365d:monthly:same_period_last_year:page_1
TTL: 3600 seconds
```

## Database Schema

### Indices for Performance
- `system_statistics`: timestamp (unique), metric_type + timestamp
- `user_growth_metrics`: date, date + period
- `transaction_metrics`: date, date + period
- `savings_metrics`: date, date + period
- `system_health_metrics`: timestamp

### Data Retention
- Daily snapshots: Keep for 2 years
- Weekly/Monthly aggregates: Keep for 5 years
- System health: Keep for 30 days
- Implement archival strategy for older data

## Scheduled Tasks

### Daily Aggregation (Midnight UTC)
```typescript
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
async aggregateStatisticsCron(): Promise<void>
```

Aggregates:
- User growth metrics
- Transaction metrics
- Savings metrics

## Integration with Admin Dashboard

The Statistics API is designed to power the admin dashboard with:
- Real-time monitoring of key metrics
- Trend analysis and comparisons
- Performance tracking by product/segment
- System health monitoring
- Data export for reports

## Error Handling

### HTTP Status Codes
- `200`: Successful request
- `204`: Cache cleared successfully
- `400`: Invalid parameters
- `401`: Unauthorized - missing authentication token
- `403`: Forbidden - insufficient permissions (non-admin)
- `404`: No data found for specified period
- `500`: Internal server error

### Error Response Format
```json
{
  "statusCode": 400,
  "message": "Invalid date range",
  "error": "Bad Request"
}
```

## Best Practices

1. **Query Optimization**
   - Use appropriate time ranges for your use case
   - Leverage caching for repeated queries
   - Use pagination for large datasets

2. **Data Freshness**
   - Real-time metrics have 5-minute staleness
   - Historical data can be up to 1 hour stale
   - Clear cache manually if immediate refresh needed

3. **Performance**
   - Use `limit` parameter to reduce payload size
   - Cache results on frontend when appropriate
   - Use `period=monthly` for yearly comparisons

4. **Monitoring**
   - Check `/system/health` endpoint regularly
   - Set up alerts for health score drops
   - Monitor response times for dashboard performance

## Migration and Deployment

### Prerequisites
- PostgreSQL with UUID and JSON extensions
- Redis for caching
- Proper role-based access control configured

### Running Migrations
```bash
npm run typeorm migration:run
```

### Seed Initial Data
```bash
npm run seed:statistics
```

## Future Enhancements

- [ ] Custom alert thresholds
- [ ] Predictive analytics with ML models
- [ ] Advanced filtering and search
- [ ] Real-time data streaming (WebSocket)
- [ ] Custom dashboard widget builder
- [ ] Scheduled report generation
- [ ] Data warehouse integration
- [ ] Advanced drill-down visualization

## Support

For issues or questions regarding the Statistics API:
1. Check the API documentation
2. Review error messages and logs
3. Contact the backend team
4. File an issue in the repository
