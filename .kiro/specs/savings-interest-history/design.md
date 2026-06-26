# Design Document: Savings Interest History API

## Overview

Adds `GET /savings/subscriptions/:id/interest-history` to the existing `SavingsModule`. A new `InterestHistoryService` handles all computation. Interest is calculated purely from the subscription's stored `amount` and the product's `interestRate` — no blockchain calls are needed. Results are cached in Redis and optionally exported as CSV.

---

## Architecture

```
Client → SavingsController.getInterestHistory()
           → InterestHistoryService.compute(userId, subscriptionId, query)
               → subscriptionRepo + productRepo (via eager load)
               → Redis cache check
               → daily interest loop
               → Redis cache set
           ← InterestHistoryResponseDto | CSV Buffer
```

---

## New Files

| File | Purpose |
|---|---|
| `dto/interest-history-query.dto.ts` | Query params DTO |
| `dto/interest-history-response.dto.ts` | JSON response DTO |
| `services/interest-history.service.ts` | Computation + caching |

## Modified Files

| File | Change |
|---|---|
| `savings.controller.ts` | Add `GET /savings/subscriptions/:id/interest-history` |
| `savings.module.ts` | Register `InterestHistoryService` |

---

## Data Models

### Query DTO

```typescript
class InterestHistoryQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;   // ISO 8601 date, defaults to subscription.startDate

  @IsOptional()
  @IsDateString()
  endDate?: string;     // ISO 8601 date, defaults to today

  @IsOptional()
  @IsIn(['csv'])
  export?: 'csv';
}
```

### DataPoint

```typescript
class DataPointDto {
  date: string;               // "YYYY-MM-DD"
  dailyInterest: number;      // principal × (rate/100/365), 6dp
  cumulativeInterest: number; // running total from startDate, 6dp
  apy: number;                // (1 + rate/100/12)^12 - 1, 6dp
}
```

### Response DTO

```typescript
class InterestHistoryResponseDto {
  summary: {
    subscriptionId: string;
    productName: string;
    principal: number;
    annualRate: number;
    currentApy: number;
    totalInterestInRange: number;
    cumulativeInterestToDate: number;
    dateRangeStart: string;
    dateRangeEnd: string;
  };
  dataPoints: DataPointDto[];
}
```

---

## Calculation Logic

```typescript
const dailyRate = annualRate / 100 / 365;
const apy = Math.pow(1 + annualRate / 100 / 12, 12) - 1;

let cumulative = 0;
// Accumulate from subscription.startDate to rangeStart first (for cumulativeInterest baseline)
// Then iterate day by day through [rangeStart, rangeEnd]
for (const day of eachDayOfInterval({ start: rangeStart, end: rangeEnd })) {
  const daily = round6(principal * dailyRate);
  cumulative = round6(cumulative + daily);
  dataPoints.push({ date: formatISO(day, { representation: 'date' }), dailyInterest: daily, cumulativeInterest: cumulative, apy: round6(apy) });
}
```

`cumulativeInterest` in each data point represents the total from `subscription.startDate`, not just the range start, so the baseline is pre-computed before the range loop.

### CSV Generation

```typescript
const header = 'date,dailyInterest,cumulativeInterest,apy\n';
const rows = dataPoints.map(p => `${p.date},${p.dailyInterest},${p.cumulativeInterest},${p.apy}`).join('\n');
return Buffer.from(header + rows, 'utf-8');
```

### Cache Key

`interest-history:{subscriptionId}:{startDate}:{endDate}` — TTL 3600 s. CSV export bypasses cache (always fresh).

---

## Correctness Properties

### Property 1: dailyInterest formula
*For any* principal and annualRate, `dailyInterest = round6(principal × annualRate / 100 / 365)`.
**Validates: Requirement 2.1**

### Property 2: cumulativeInterest is monotonically non-decreasing
*For any* valid response, `dataPoints[i].cumulativeInterest >= dataPoints[i-1].cumulativeInterest` for all i.
**Validates: Requirement 3.1**

### Property 3: totalInterestInRange equals sum of dailyInterest in range
*For any* response, `summary.totalInterestInRange === sum(dataPoints.map(p => p.dailyInterest))`.
**Validates: Requirement 3.3**

### Property 4: APY formula
*For any* annualRate r, `apy = round6((1 + r/100/12)^12 - 1)`.
**Validates: Requirement 4.1**

### Property 5: dataPoints count equals days in range
*For any* valid date range [start, end], `dataPoints.length === differenceInCalendarDays(end, start) + 1`.
**Validates: Requirement 1.6**

### Property 6: CSV row count equals dataPoints count
*For any* export=csv response, the number of data rows (excluding header) equals `dataPoints.length`.
**Validates: Requirement 6.2**

---

## Error Handling

| Scenario | Status | Behavior |
|---|---|---|
| No JWT | 401 | JwtAuthGuard rejects |
| Subscription not found / wrong user | 404 | NotFoundException |
| Invalid date format | 400 | class-validator rejects |
| endDate before startDate | 400 | service throws BadRequestException |
| Redis unavailable | 200 (degraded) | try/catch, proceeds without cache |

---

## Testing Strategy

- Unit tests for daily interest, cumulative, APY, CSV generation
- Property-based tests with `fast-check` for Properties 1–6 (min 100 iterations)
- Integration: `GET .../interest-history` without JWT → 401
- Integration: `export=csv` → `Content-Type: text/csv`, correct header row
- Integration: date range filter returns correct number of data points
