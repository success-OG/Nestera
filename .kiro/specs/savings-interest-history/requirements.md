# Requirements Document

## Introduction

This feature adds a detailed interest accrual history endpoint to the savings module. It allows users to view daily and cumulative interest earned on a specific subscription over a date range, export the data as CSV for tax reporting, and receive chart-friendly data points including APY changes over time.

## Glossary

- **InterestHistory_API**: The `GET /savings/subscriptions/:id/interest-history` endpoint.
- **UserSubscription**: The entity tracking a user's savings product subscription.
- **SavingsProduct**: The entity describing a savings product with an `interestRate`.
- **DailyInterest**: Interest accrued on a single calendar day, computed as `principal × (annualRate / 365)`.
- **CumulativeInterest**: The running total of `DailyInterest` from the subscription's `startDate` to the queried date.
- **APY**: Annual Percentage Yield — `(1 + annualRate/100/12)^12 - 1`.
- **DataPoint**: A single chart-friendly record with fields `date`, `dailyInterest`, `cumulativeInterest`, `apy`.
- **DateRange**: The `startDate` and `endDate` query parameters bounding the returned data points.
- **CSVExport**: A downloadable CSV file containing the interest history data.
- **Cache**: Redis-backed cache via `CACHE_MANAGER`.

---

## Requirements

### Requirement 1: Retrieve Interest History

**User Story:** As an authenticated user, I want to view the interest accrual history for a subscription, so that I can track my earnings over time.

#### Acceptance Criteria

1. THE InterestHistory_API SHALL expose `GET /savings/subscriptions/:id/interest-history` protected by `JwtAuthGuard`.
2. THE InterestHistory_API SHALL accept optional `startDate` and `endDate` query parameters in ISO 8601 date format.
3. IF `startDate` is omitted, THE InterestHistory_API SHALL default to the subscription's `startDate`.
4. IF `endDate` is omitted, THE InterestHistory_API SHALL default to today's date.
5. IF the subscription identified by `:id` does not belong to the authenticated user, THE InterestHistory_API SHALL return HTTP 404.
6. THE InterestHistory_API SHALL return an array of `DataPoint` records, one per calendar day in the requested range.
7. THE InterestHistory_API SHALL be documented with Swagger/OpenAPI annotations.

---

### Requirement 2: Daily Interest Calculation

**User Story:** As a user, I want to see how much interest I earned each day, so that I can understand my daily accrual rate.

#### Acceptance Criteria

1. THE InterestHistory_API SHALL compute `dailyInterest` for each day as `subscriptionAmount × (annualRate / 100 / 365)`.
2. THE InterestHistory_API SHALL use the subscription's `amount` as the principal for all calculations.
3. THE InterestHistory_API SHALL use the associated `SavingsProduct.interestRate` as the annual rate.
4. THE InterestHistory_API SHALL round `dailyInterest` to 6 decimal places.

---

### Requirement 3: Cumulative Interest Calculation

**User Story:** As a user, I want to see the running total of interest earned, so that I can track my cumulative earnings.

#### Acceptance Criteria

1. THE InterestHistory_API SHALL compute `cumulativeInterest` for each day as the sum of all `dailyInterest` values from the subscription's `startDate` up to and including that day.
2. THE InterestHistory_API SHALL round `cumulativeInterest` to 6 decimal places.
3. THE InterestHistory_API SHALL include a `totalInterestInRange` field in the response summary representing the sum of `dailyInterest` values within the requested date range only.

---

### Requirement 4: APY in Data Points

**User Story:** As a user, I want to see the APY for each data point, so that I can track rate changes over time.

#### Acceptance Criteria

1. THE InterestHistory_API SHALL include `apy` in each `DataPoint`, computed as `(1 + annualRate/100/12)^12 - 1`.
2. THE InterestHistory_API SHALL round `apy` to 6 decimal places.
3. THE InterestHistory_API SHALL include a `currentApy` field in the response summary.

---

### Requirement 5: Response Summary

**User Story:** As a user, I want a summary alongside the data points, so that I can quickly see key metrics without parsing the full array.

#### Acceptance Criteria

1. THE InterestHistory_API SHALL include a `summary` object in the response with: `subscriptionId`, `productName`, `principal`, `annualRate`, `currentApy`, `totalInterestInRange`, `cumulativeInterestToDate`, `dateRangeStart`, `dateRangeEnd`.
2. THE InterestHistory_API SHALL include a `dataPoints` array containing the per-day records.

---

### Requirement 6: CSV Export

**User Story:** As a user, I want to export my interest history as a CSV file, so that I can use it for tax reporting.

#### Acceptance Criteria

1. WHEN the `export=csv` query parameter is present, THE InterestHistory_API SHALL return the response with `Content-Type: text/csv` and `Content-Disposition: attachment; filename="interest-history-{subscriptionId}-{date}.csv"`.
2. THE CSV SHALL include a header row: `date,dailyInterest,cumulativeInterest,apy`.
3. WHEN `export=csv` is absent or set to any other value, THE InterestHistory_API SHALL return `application/json`.

---

### Requirement 7: Redis Caching

**User Story:** As a platform operator, I want interest history responses cached, so that repeated queries for the same date range do not overload the database.

#### Acceptance Criteria

1. THE InterestHistory_API SHALL cache responses in Redis keyed by `interest-history:{subscriptionId}:{startDate}:{endDate}`.
2. THE InterestHistory_API SHALL set a TTL of 3600 seconds (1 hour) on cached entries.
3. WHEN a cache hit occurs, THE InterestHistory_API SHALL return the cached response without recomputing.
4. Cache operations SHALL be wrapped in try/catch and degrade gracefully if Redis is unavailable.
