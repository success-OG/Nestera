# Design Document: Savings Withdrawal Simulation API

## Overview

Adds `POST /savings/withdrawal/simulate` to the existing `SavingsModule`. A new `WithdrawalSimulationService` handles all calculation logic, keeping `SavingsService` focused on its existing responsibilities. No blockchain transaction is performed — this is a pure read/compute operation.

---

## Architecture

```
Client → SavingsController.simulateWithdrawal()
           → WithdrawalSimulationService.simulate(userId, dto)
               → SavingsService.findOneProduct() / subscriptionRepo
               → PredictiveEvaluatorService.calculateProjectedBalance()
           ← SimulationResultDto
```

---

## New Files

| File | Purpose |
|---|---|
| `dto/simulate-withdrawal.dto.ts` | Request DTO |
| `dto/simulation-result.dto.ts` | Response DTO |
| `services/withdrawal-simulation.service.ts` | Calculation logic |

## Modified Files

| File | Change |
|---|---|
| `savings.controller.ts` | Add `POST /savings/withdrawal/simulate` |
| `savings.module.ts` | Register `WithdrawalSimulationService` |

---

## Data Models

### Request DTO

```typescript
class SimulateWithdrawalDto {
  @IsUUID()
  subscriptionId: string;

  @IsNumber()
  @Min(0.01)
  requestedAmount: number;
}
```

### Response DTO

```typescript
class SimulationResultDto {
  requestedAmount: number;
  earlyWithdrawalPenalty: number;   // 5% of requestedAmount for early FIXED, else 0
  processingFee: number;            // flat 10.00
  taxWithholding: number;           // 10% of taxableInterest
  taxableInterest: number;          // min(requestedAmount, totalInterestEarned)
  taxDisclaimer: string;
  netAmount: number;                // requestedAmount - penalty - fee - tax (min 0)
  warning?: string;                 // present when fees exceed requestedAmount
  maturityDate: string | null;      // ISO 8601 date
  amountAtMaturity: number;
  estimatedProcessingDays: number;
  recommendation: 'wait' | 'withdraw';
  recommendationReason: string;
}
```

---

## Calculation Logic

### Early Withdrawal Penalty

```typescript
const isEarly = product.type === 'FIXED' && subscription.endDate && new Date() < new Date(subscription.endDate);
const earlyWithdrawalPenalty = isEarly ? requestedAmount * 0.05 : 0;
```

### Tax Withholding

```typescript
const taxableInterest = Math.min(requestedAmount, Number(subscription.totalInterestEarned));
const taxWithholding = taxableInterest * 0.10;
```

### Net Amount

```typescript
const netAmount = Math.max(0, requestedAmount - earlyWithdrawalPenalty - processingFee - taxWithholding);
```

### Amount at Maturity

```typescript
const maturityDate = subscription.endDate ?? addMonths(new Date(), 12);
const amountAtMaturity = predictiveEvaluatorService.calculateProjectedBalance(
  Number(subscription.amount),
  Number(product.interestRate),
  maturityDate,
);
```

### Recommendation

```typescript
const recommendation = amountAtMaturity > netAmount ? 'wait' : 'withdraw';
```

### Processing Days

| Condition | Days |
|---|---|
| FLEXIBLE product | 1 |
| FIXED, early withdrawal | 3 |
| FIXED, matured | 1 |

---

## Correctness Properties

### Property 1: Penalty is zero for FLEXIBLE products
*For any* FLEXIBLE subscription, `earlyWithdrawalPenalty` should always equal `0`.
**Validates: Requirement 2.3**

### Property 2: Penalty is zero after maturity
*For any* FIXED subscription where `currentDate >= endDate`, `earlyWithdrawalPenalty` should equal `0`.
**Validates: Requirement 2.4**

### Property 3: netAmount is non-negative
*For any* valid simulation, `netAmount >= 0`.
**Validates: Requirement 4.2**

### Property 4: netAmount formula
*For any* simulation, `netAmount = max(0, requestedAmount - earlyWithdrawalPenalty - processingFee - taxWithholding)`.
**Validates: Requirement 4.1**

### Property 5: Recommendation is "wait" when maturity beats net
*For any* simulation where `amountAtMaturity > netAmount`, `recommendation === "wait"`.
**Validates: Requirement 7.1**

### Property 6: taxWithholding bounded by interest
*For any* simulation, `taxableInterest <= totalInterestEarned` and `taxWithholding = taxableInterest * 0.10`.
**Validates: Requirement 5.1, 5.2**

---

## Error Handling

| Scenario | Status | Behavior |
|---|---|---|
| No JWT | 401 | JwtAuthGuard rejects |
| Subscription not found / wrong user | 404 | NotFoundException |
| requestedAmount > subscription.amount | 422 | UnprocessableEntityException |
| Subscription not ACTIVE | 422 | UnprocessableEntityException |
| requestedAmount <= 0 | 400 | class-validator rejects |

---

## Testing Strategy

- Unit tests for each calculation helper (penalty, tax, net, recommendation, processing days)
- Property-based tests with `fast-check` for Properties 1–6 (min 100 iterations each)
- Integration test: `POST /savings/withdrawal/simulate` without JWT → 401
- Integration test: valid FIXED early withdrawal → penalty > 0, recommendation = "wait"
- Integration test: valid FLEXIBLE withdrawal → penalty = 0
