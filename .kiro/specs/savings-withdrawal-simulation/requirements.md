# Requirements Document

## Introduction

This feature adds a withdrawal simulation endpoint to the savings module. It allows users to model what would happen if they withdrew funds from a savings subscription today — including early withdrawal penalties, processing fees, tax withholding estimates, and a comparison against waiting until maturity. No actual withdrawal is performed.

## Glossary

- **Simulation_API**: The `POST /savings/withdrawal/simulate` endpoint.
- **UserSubscription**: The entity tracking a user's savings product subscription.
- **SavingsProduct**: The entity describing a savings product (FIXED or FLEXIBLE type).
- **EarlyWithdrawalPenalty**: A fee charged when a FIXED-type subscription is withdrawn before its `endDate`.
- **ProcessingFee**: A flat fee applied to all withdrawal transactions.
- **TaxWithholding**: An estimated tax amount withheld from interest earnings at withdrawal.
- **NetAmount**: The amount the user receives after deducting penalty, processing fee, and tax withholding from the requested amount.
- **AmountAtMaturity**: The projected balance if the user waits until the subscription's `endDate`.
- **Recommendation**: A system-generated suggestion (`"wait"` or `"withdraw"`) based on comparing net amount now vs. amount at maturity.
- **PredictiveEvaluatorService**: Existing service providing `calculateProjectedBalance`.

---

## Requirements

### Requirement 1: Accept and Validate Simulation Request

**User Story:** As an authenticated user, I want to submit a withdrawal simulation request, so that I can understand the financial impact before committing.

#### Acceptance Criteria

1. THE Simulation_API SHALL expose `POST /savings/withdrawal/simulate` protected by `JwtAuthGuard`.
2. THE Simulation_API SHALL accept a request body with `subscriptionId` (UUID) and `requestedAmount` (number, > 0).
3. IF `subscriptionId` does not correspond to a `UserSubscription` owned by the authenticated user, THEN THE Simulation_API SHALL return HTTP 404.
4. IF `requestedAmount` exceeds the subscription's current `amount`, THEN THE Simulation_API SHALL return HTTP 422 with a descriptive error.
5. IF the subscription `status` is not `ACTIVE`, THEN THE Simulation_API SHALL return HTTP 422 indicating the subscription is not eligible for withdrawal.
6. THE Simulation_API SHALL be documented with Swagger/OpenAPI annotations.

---

### Requirement 2: Calculate Early Withdrawal Penalty

**User Story:** As a user, I want to see the early withdrawal penalty, so that I know the cost of withdrawing before maturity.

#### Acceptance Criteria

1. WHEN the subscription's associated `SavingsProduct.type` is `FIXED` AND the current date is before the subscription's `endDate`, THE Simulation_API SHALL calculate an early withdrawal penalty.
2. THE early withdrawal penalty SHALL be computed as 5% of the `requestedAmount`.
3. WHEN the subscription's `SavingsProduct.type` is `FLEXIBLE`, THE Simulation_API SHALL set the early withdrawal penalty to `0`.
4. WHEN the current date is on or after the subscription's `endDate`, THE Simulation_API SHALL set the early withdrawal penalty to `0` regardless of product type.
5. THE Simulation_API SHALL include `earlyWithdrawalPenalty` in the response.

---

### Requirement 3: Calculate Processing Fee

**User Story:** As a user, I want to see the processing fee, so that I can account for all costs.

#### Acceptance Criteria

1. THE Simulation_API SHALL apply a flat processing fee of `10.00` to every simulation regardless of amount or product type.
2. THE Simulation_API SHALL include `processingFee` in the response.

---

### Requirement 4: Calculate Net Amount

**User Story:** As a user, I want to see the net amount I would receive, so that I can make an informed decision.

#### Acceptance Criteria

1. THE Simulation_API SHALL compute `netAmount = requestedAmount - earlyWithdrawalPenalty - processingFee - taxWithholding`.
2. IF `netAmount` would be negative, THE Simulation_API SHALL set `netAmount` to `0` and include a `warning` field in the response indicating fees exceed the requested amount.
3. THE Simulation_API SHALL include `netAmount` in the response.

---

### Requirement 5: Tax Withholding Estimate

**User Story:** As a user, I want an estimated tax withholding amount, so that I can plan for tax obligations.

#### Acceptance Criteria

1. THE Simulation_API SHALL estimate tax withholding as 10% of the interest portion of the `requestedAmount`.
2. THE interest portion SHALL be computed as `min(requestedAmount, totalInterestEarned)` from the subscription.
3. THE Simulation_API SHALL include `taxWithholding` and `taxableInterest` in the response.
4. THE Simulation_API SHALL include a `taxDisclaimer` string noting that the estimate is indicative only and not financial advice.

---

### Requirement 6: Maturity Comparison

**User Story:** As a user, I want to see what I would receive at maturity, so that I can compare it against withdrawing now.

#### Acceptance Criteria

1. WHEN the subscription has an `endDate`, THE Simulation_API SHALL compute `amountAtMaturity` using `PredictiveEvaluatorService.calculateProjectedBalance` with the subscription's current `amount`, the product's `interestRate`, and the `endDate`.
2. WHEN the subscription has no `endDate` (FLEXIBLE product), THE Simulation_API SHALL project `amountAtMaturity` using a 12-month horizon from today.
3. THE Simulation_API SHALL include `maturityDate` and `amountAtMaturity` in the response.

---

### Requirement 7: Recommendation

**User Story:** As a user, I want a recommendation on whether to withdraw now or wait, so that I have a clear suggested action.

#### Acceptance Criteria

1. WHEN `amountAtMaturity > netAmount`, THE Simulation_API SHALL set `recommendation` to `"wait"`.
2. WHEN `netAmount >= amountAtMaturity`, THE Simulation_API SHALL set `recommendation` to `"withdraw"`.
3. THE Simulation_API SHALL include a `recommendationReason` string explaining the basis for the recommendation.
4. THE Simulation_API SHALL include `recommendation` and `recommendationReason` in the response.

---

### Requirement 8: Processing Time Estimate

**User Story:** As a user, I want to know how long the withdrawal would take to process, so that I can plan accordingly.

#### Acceptance Criteria

1. WHEN the subscription's `SavingsProduct.type` is `FLEXIBLE`, THE Simulation_API SHALL set `estimatedProcessingDays` to `1`.
2. WHEN the subscription's `SavingsProduct.type` is `FIXED` and the withdrawal is early, THE Simulation_API SHALL set `estimatedProcessingDays` to `3`.
3. WHEN the subscription has matured, THE Simulation_API SHALL set `estimatedProcessingDays` to `1`.
4. THE Simulation_API SHALL include `estimatedProcessingDays` in the response.
