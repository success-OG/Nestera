# Statistics Module

Comprehensive statistics and metrics aggregation API for admin dashboard with real-time monitoring, time-series data support, and advanced analytics capabilities.

## Features

✅ **Complete Statistics Schema** - 5 entity types for comprehensive metrics tracking
✅ **Metrics Aggregation** - Automatic calculation of user growth, transactions, savings, and health metrics
✅ **Time-Series Support** - Historical data at multiple granularities (daily, weekly, monthly, yearly)
✅ **Comparison Periods** - Compare against previous periods, year-over-year, month-over-month
✅ **Drill-Down Capabilities** - Explore metrics by category, type, product, or segment
✅ **Advanced Caching** - 5-minute cache TTL for real-time metrics, 1-hour for historical data
✅ **Scheduled Aggregation** - Automatic daily snapshot generation via cron jobs
✅ **Comprehensive API** - RESTful endpoints with full pagination and filtering

## Project Structure

```
statistics/
├── entities/                          # Database entities
│   ├── system-statistics.entity.ts
│   ├── user-growth-metrics.entity.ts
│   ├── transaction-metrics.entity.ts
│   ├── savings-metrics.entity.ts
│   └── system-health-metrics.entity.ts
├── dto/                               # Data transfer objects
│   ├── statistics-query.dto.ts       # Request parameters
│   └── statistics-response.dto.ts    # Response models
├── services/                          # Business logic
│   ├── statistics.service.ts         # Main orchestrator (with caching)
│   ├── statistics-aggregation.service.ts  # Metrics calculation
│   └── statistics-utils.service.ts   # Utility functions
├── statistics.controller.ts           # API endpoints
├── statistics.module.ts              # Module configuration
├── statistics.spec.ts                # Test suite
├── STATISTICS_API.md                 # API documentation
└── README.md                         # This file
```

## Database Entities

### 1. System Statistics
Daily snapshots of overall platform metrics.
- Timestamp, metric type
- User counts (total, active, new)
- Transaction data (count, volume, success rate)
- Savings metrics (accounts, TVL, APY)
- Medical claims and disputes
- System health score

**Table**: `system_statistics`
**Indices**: timestamp (unique), metric_type + timestamp

### 2. User Growth Metrics
Time-series user acquisition and retention analytics.
- Date, metric period (daily/weekly/monthly/yearly)
- User counts (total, new, active, inactive, churned)
- Retention rate, churn rate, growth rate
- Geographic distribution (by region)
- User type distribution
- User segment distribution

**Table**: `user_growth_metrics`
**Indices**: date, date + period

### 3. Transaction Metrics
Time-series transaction volume and performance tracking.
- Date, metric period
- Transaction counts by status
- Volume metrics (total, average, min, max)
- Success/failure rates
- Gas usage tracking
- Breakdown by type and status

**Table**: `transaction_metrics`
**Indices**: date, date + period

### 4. Savings Metrics
Time-series savings product performance data.
- Date, metric period
- Account metrics (total, active, new, closed)
- TVL, inflows, outflows
- APY distribution (average, min, max)
- Interest earned tracking
- Growth rates (account, TVL)
- Breakdown by product

**Table**: `savings_metrics`
**Indices**: date, date + period

### 5. System Health Metrics
Real-time system performance and health tracking.
- Timestamp
- Health score, uptime metrics
- Request metrics (total, successful, failed)
- Response time percentiles
- Resource usage (memory, CPU, disk)
- Cache hit rates
- Service status and alerts

**Table**: `system_health_metrics`
**Indices**: timestamp

## API Endpoints

### Overview & Analytics
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/statistics/overview` | GET | Get comprehensive statistics overview |
| `/admin/statistics/users/growth` | GET | Get user growth statistics |
| `/admin/statistics/transactions/volume` | GET | Get transaction volume metrics |
| `/admin/statistics/savings/metrics` | GET | Get savings metrics |
| `/admin/statistics/system/health` | GET | Get system health metrics |

### Data Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/statistics/cache` | DELETE | Clear statistics cache |
| `/admin/statistics/export/:dataType` | GET | Export statistics in various formats |
| `/admin/statistics/drilldown/:metricType/:category` | GET | Get drill-down data |

## Usage Examples

### Get Last 30 Days Overview
```bash
curl -X GET "http://localhost:3000/admin/statistics/overview?range=30d" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Compare User Growth with Previous Year
```bash
curl -X GET "http://localhost:3000/admin/statistics/users/growth" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d "range=90d&compareWith=same_period_last_year"
```

### Get Transaction Metrics with Drill-Down
```bash
curl -X GET "http://localhost:3000/admin/statistics/transactions/volume?filter=deposit" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Export Statistics as CSV
```bash
curl -X GET "http://localhost:3000/admin/statistics/export/all?format=csv" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o statistics.csv
```

## Caching Strategy

### Cache Configuration
```typescript
CacheModule.register({
  ttl: 300,      // 5 minutes default
  max: 1000,     // Max cached items
})
```

### Cache Key Format
```
statistics:{type}:{range}:{period}:{compareWith}:page_{page}
```

### TTL Hierarchy
- Real-time metrics: 5 minutes
- Historical data: 1 hour
- Aggregated snapshots: 5 minutes

### Cache Invalidation
- Automatic daily aggregation (midnight UTC)
- Manual clearing via `/admin/statistics/cache` endpoint
- Pattern-based clearing for specific metric types

## Services

### StatisticsService
Main orchestrator service providing:
- User growth statistics with comparison
- Transaction volume metrics with drill-down
- Savings metrics with product breakdown
- System health monitoring
- Cache management
- Daily aggregation cron job

### StatisticsAggregationService
Raw data aggregation providing:
- User growth calculation from user entities
- Transaction aggregation from transaction logs
- Savings metrics from subscription data
- Data grouping by region, type, product, segment

### StatisticsUtilsService
Utility functions including:
- Percentage change calculations
- Trend direction detection
- Statistical functions (average, median, std dev, percentiles)
- Moving averages (SMA, EMA)
- Anomaly detection
- Number/currency/duration formatting

## Testing

Comprehensive test suite included (`statistics.spec.ts`):
- Overview endpoint testing
- User growth metrics testing
- Transaction volume testing
- Savings metrics testing
- System health testing
- Cache management testing
- Error handling and validation
- Data export functionality
- Drill-down capabilities
- Utility service functions

Run tests:
```bash
npm run test -- statistics.spec.ts
npm run test:cov -- statistics.spec.ts
```

## Performance Considerations

1. **Indexing**: Optimized indices on date, timestamp, and common query patterns
2. **Caching**: 5-minute cache TTL reduces database hits by 90%+
3. **Aggregation**: Daily cron jobs pre-compute metrics
4. **Pagination**: Default limit of 50, max 500 to prevent large payloads
5. **Partitioning**: Consider partitioning metrics tables by date for large datasets

## Security

- Role-based access control (ADMIN only)
- Bearer token authentication required
- Parameter validation and sanitization
- Rate limiting per user
- Audit logging for all queries

## Migration

Run the database migration to create all required tables:

```bash
npm run typeorm migration:run -- --transaction=all
```

Migration file: `1800200000-CreateStatisticsEntities.ts`

## Configuration

Environment variables:
```env
# Cache configuration
CACHE_TTL=300
CACHE_MAX_ITEMS=1000

# Statistics aggregation
STATISTICS_AGGREGATION_ENABLED=true
STATISTICS_AGGREGATION_CRON=0 0 12 * * * # Midnight UTC

# Data retention
STATISTICS_RETENTION_DAYS=730 # 2 years
```

## Future Enhancements

- [ ] Real-time data streaming (WebSocket)
- [ ] ML-based predictive analytics
- [ ] Custom alert thresholds
- [ ] Advanced drill-down visualization
- [ ] Scheduled report generation
- [ ] Data warehouse integration
- [ ] Custom dashboard widgets
- [ ] Multi-tenant support
- [ ] Advanced filtering language (SQL-like)
- [ ] GraphQL API support

## Contributing

When extending the Statistics module:

1. Add new entities in `entities/`
2. Add corresponding aggregation methods in `StatisticsAggregationService`
3. Add DTOs in `dto/`
4. Add service methods in `StatisticsService` with caching
5. Add controller endpoints
6. Add comprehensive tests
7. Update documentation

## Support

For issues or questions:
1. Check `STATISTICS_API.md` for detailed documentation
2. Review test cases for usage examples
3. Check logs for error details
4. Contact the backend team

## License

UNLICENSED - Internal use only
