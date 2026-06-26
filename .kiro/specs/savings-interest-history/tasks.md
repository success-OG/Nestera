# Implementation Plan: Savings Interest History API

## Overview

Add `GET /savings/subscriptions/:id/interest-history` to the existing `SavingsModule`. Work proceeds: DTOs → service → controller wiring → module registration.

## Tasks

- [ ] 1. Create DTOs
  - [ ] 1.1 Create `dto/interest-history-query.dto.ts`
    - Fields: `startDate?` (`@IsOptional()`, `@IsDateString()`), `endDate?` (`@IsOptional()`, `@IsDateString()`), `export?` (`@IsOptional()`, `@IsIn(['csv'])`)
    - _Requirements: 1.2_
  - [ ] 1.2 Create `dto/interest-history-response.dto.ts`
    - `DataPointDto`: `date`, `dailyInterest`, `cumulativeInterest`, `apy`
    - `InterestHistoryResponseDto`: `summary` object + `dataPoints` array
    - Add Swagger `@ApiProperty` decorators
    - _Requirements: 2.4, 3.2, 4.2, 5.1, 5.2_

- [ ] 2. Implement `InterestHistoryService`
  - [ ] 2.1 Create `services/interest-history.service.ts`
    - Inject `subscriptionRepository`, `CACHE_MANAGER`
    - _Requirements: 1.1_
  - [ ] 2.2 Implement ownership validation
    - Fetch subscription by `id` where `userId` matches; throw `NotFoundException` (404) if not found
    - Throw `BadRequestException` (400) if `endDate < startDate`
    - _Requirements: 1.5_
  - [ ] 2.3 Implement date range defaults
    - `startDate` defaults to `subscription.startDate`; `endDate` defaults to today
    - _Requirements: 1.3, 1.4_
  - [ ] 2.4 Implement daily interest loop
    - `dailyRate = annualRate / 100 / 365`
    - Pre-compute cumulative baseline from `subscription.startDate` to `rangeStart`
    - Iterate each day in `[rangeStart, rangeEnd]`; compute `dailyInterest`, `cumulativeInterest`, `apy`
    - Round all values to 6 decimal places
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 4.1, 4.2_
  - [ ]* 2.5 Write property test — Property 1: dailyInterest formula
    - **Validates: Requirement 2.1**
    - Tag: `// Feature: savings-interest-history, Property 1: dailyInterest formula`
  - [ ]* 2.6 Write property test — Property 2: cumulativeInterest is monotonically non-decreasing
    - **Validates: Requirement 3.1**
    - Tag: `// Feature: savings-interest-history, Property 2: cumulativeInterest is monotonically non-decreasing`
  - [ ]* 2.7 Write property test — Property 3: totalInterestInRange equals sum of dailyInterest
    - **Validates: Requirement 3.3**
    - Tag: `// Feature: savings-interest-history, Property 3: totalInterestInRange equals sum of dailyInterest`
  - [ ]* 2.8 Write property test — Property 4: APY formula
    - **Validates: Requirement 4.1**
    - Tag: `// Feature: savings-interest-history, Property 4: APY formula`
  - [ ]* 2.9 Write property test — Property 5: dataPoints count equals days in range
    - **Validates: Requirement 1.6**
    - Tag: `// Feature: savings-interest-history, Property 5: dataPoints count equals days in range`
  - [ ] 2.10 Implement Redis caching
    - Cache key: `interest-history:{subscriptionId}:{startDate}:{endDate}`, TTL 3600 s
    - Skip cache for `export=csv` requests
    - Wrap in try/catch; degrade gracefully
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ] 2.11 Implement CSV generation
    - Build header + rows as `Buffer`; return with `Content-Type: text/csv` and `Content-Disposition` header
    - _Requirements: 6.1, 6.2, 6.3_
  - [ ]* 2.12 Write property test — Property 6: CSV row count equals dataPoints count
    - **Validates: Requirement 6.2**
    - Tag: `// Feature: savings-interest-history, Property 6: CSV row count equals dataPoints count`

- [ ] 3. Checkpoint — Ensure all service tests pass

- [ ] 4. Wire controller and module
  - [ ] 4.1 Add `GET /savings/subscriptions/:id/interest-history` to `savings.controller.ts`
    - `@UseGuards(JwtAuthGuard)`, `@Res()` for CSV branch, full Swagger decorators
    - When `export=csv`: set headers and send buffer; otherwise return JSON
    - _Requirements: 1.1, 1.7, 6.1_
  - [ ] 4.2 Register `InterestHistoryService` in `savings.module.ts`
  - [ ]* 4.3 Write integration tests
    - No JWT → 401; valid request → correct dataPoints count; `export=csv` → `Content-Type: text/csv`; endDate before startDate → 400

- [ ] 5. Final checkpoint — Ensure all tests pass

## Notes

- Tasks marked `*` are optional for MVP
- Use `date-fns` (`eachDayOfInterval`, `differenceInCalendarDays`, `formatISO`) for date arithmetic — already available in the Node.js ecosystem
- Large date ranges (e.g. multi-year) can produce thousands of data points; consider adding a max range limit (e.g. 365 days) as a future enhancement
