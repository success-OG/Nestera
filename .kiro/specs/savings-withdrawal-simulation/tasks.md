# Implementation Plan: Savings Withdrawal Simulation API

## Overview

Add `POST /savings/withdrawal/simulate` to the existing `SavingsModule`. Work proceeds: DTOs → service → controller wiring → module registration.

## Tasks

- [ ] 1. Create DTOs
  - [ ] 1.1 Create `dto/simulate-withdrawal.dto.ts`
    - Fields: `subscriptionId` (`@IsUUID()`), `requestedAmount` (`@IsNumber()`, `@Min(0.01)`)
    - Add Swagger `@ApiProperty` decorators
    - _Requirements: 1.2_
  - [ ] 1.2 Create `dto/simulation-result.dto.ts`
    - Fields: `requestedAmount`, `earlyWithdrawalPenalty`, `processingFee`, `taxWithholding`, `taxableInterest`, `taxDisclaimer`, `netAmount`, `warning?`, `maturityDate`, `amountAtMaturity`, `estimatedProcessingDays`, `recommendation`, `recommendationReason`
    - Add Swagger `@ApiProperty` decorators
    - _Requirements: 2.5, 3.2, 4.3, 5.3, 6.3, 7.4, 8.4_

- [ ] 2. Implement `WithdrawalSimulationService`
  - [ ] 2.1 Create `services/withdrawal-simulation.service.ts`
    - Inject `subscriptionRepository`, `SavingsService` (for product lookup), `PredictiveEvaluatorService`
    - Implement `simulate(userId, dto)` method
    - _Requirements: 1.1–1.5_
  - [ ] 2.2 Implement ownership + status validation
    - Fetch subscription by `subscriptionId` where `userId` matches; throw `NotFoundException` (404) if not found
    - Throw `UnprocessableEntityException` (422) if `status !== ACTIVE`
    - Throw `UnprocessableEntityException` (422) if `requestedAmount > subscription.amount`
    - _Requirements: 1.3, 1.4, 1.5_
  - [ ] 2.3 Implement penalty calculation
    - `isEarly = product.type === 'FIXED' && endDate && now < endDate`
    - `earlyWithdrawalPenalty = isEarly ? requestedAmount * 0.05 : 0`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ]* 2.4 Write property test — Property 1: Penalty is zero for FLEXIBLE products
    - **Validates: Requirement 2.3**
    - Tag: `// Feature: savings-withdrawal-simulation, Property 1: Penalty is zero for FLEXIBLE products`
  - [ ]* 2.5 Write property test — Property 2: Penalty is zero after maturity
    - **Validates: Requirement 2.4**
    - Tag: `// Feature: savings-withdrawal-simulation, Property 2: Penalty is zero after maturity`
  - [ ] 2.6 Implement tax withholding calculation
    - `taxableInterest = min(requestedAmount, totalInterestEarned)`
    - `taxWithholding = taxableInterest * 0.10`
    - _Requirements: 5.1, 5.2_
  - [ ]* 2.7 Write property test — Property 6: taxWithholding bounded by interest
    - **Validates: Requirements 5.1, 5.2**
    - Tag: `// Feature: savings-withdrawal-simulation, Property 6: taxWithholding bounded by interest`
  - [ ] 2.8 Implement net amount calculation
    - `netAmount = max(0, requestedAmount - earlyWithdrawalPenalty - processingFee - taxWithholding)`
    - Set `warning` when fees exceed requestedAmount
    - _Requirements: 4.1, 4.2_
  - [ ]* 2.9 Write property test — Property 3: netAmount is non-negative
    - **Validates: Requirement 4.2**
    - Tag: `// Feature: savings-withdrawal-simulation, Property 3: netAmount is non-negative`
  - [ ]* 2.10 Write property test — Property 4: netAmount formula
    - **Validates: Requirement 4.1**
    - Tag: `// Feature: savings-withdrawal-simulation, Property 4: netAmount formula`
  - [ ] 2.11 Implement maturity projection
    - `maturityDate = subscription.endDate ?? addMonths(now, 12)`
    - `amountAtMaturity = predictiveEvaluatorService.calculateProjectedBalance(amount, interestRate, maturityDate)`
    - _Requirements: 6.1, 6.2_
  - [ ] 2.12 Implement recommendation logic
    - `recommendation = amountAtMaturity > netAmount ? 'wait' : 'withdraw'`
    - Build `recommendationReason` string
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ]* 2.13 Write property test — Property 5: Recommendation is "wait" when maturity beats net
    - **Validates: Requirement 7.1**
    - Tag: `// Feature: savings-withdrawal-simulation, Property 5: Recommendation is "wait" when maturity beats net`
  - [ ] 2.14 Implement processing days logic
    - FLEXIBLE → 1; FIXED early → 3; matured → 1
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 3. Checkpoint — Ensure all service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Wire controller and module
  - [ ] 4.1 Add `POST /savings/withdrawal/simulate` to `savings.controller.ts`
    - `@UseGuards(JwtAuthGuard)`, `@HttpCode(HttpStatus.OK)`, full Swagger decorators
    - _Requirements: 1.1, 1.6_
  - [ ] 4.2 Register `WithdrawalSimulationService` in `savings.module.ts`
  - [ ]* 4.3 Write integration tests
    - No JWT → 401; FIXED early withdrawal → penalty > 0; FLEXIBLE → penalty = 0; requestedAmount > amount → 422

- [ ] 5. Final checkpoint — Ensure all tests pass

## Notes

- Tasks marked `*` are optional for MVP
- Processing fee is a hardcoded constant `10.00` — no config needed for now
- Tax disclaimer string: `"Tax estimate is indicative only and does not constitute financial advice."`
