# Webhook Integration Guide

Nestera supports outbound webhooks so your service can receive real-time notifications when platform events occur (deposits, withdrawals, goal completions, and more).

---

## Overview

| Feature | Detail |
|---|---|
| Protocol | HTTPS POST |
| Payload format | JSON |
| Signing | HMAC-SHA256 (`X-Nestera-Signature`) |
| Retry strategy | Exponential back-off — 1 min, 5 min, 30 min, 2 hrs (5 attempts max) |
| Delivery timeout | 10 seconds |

---

## Event Schema

Every webhook delivery has this envelope:

```json
{
  "event": "savings.deposit",
  "data": {
    "userId": "abc-123",
    "amount": "50.00",
    "currency": "USDC",
    "transactionHash": "0xabc...",
    "timestamp": "2026-06-02T03:00:00.000Z"
  }
}
```

### Available Events

| Event | Description |
|---|---|
| `savings.deposit` | A deposit was made to a savings account |
| `savings.withdrawal` | A withdrawal was processed |
| `savings.goal_completed` | A savings goal reached its target |
| `savings.goal_created` | A new savings goal was created |
| `savings.interest_accrued` | Interest was added to an account |
| `user.kyc_approved` | KYC verification approved |
| `user.kyc_rejected` | KYC verification rejected |
| `webhook.test` | Sent when you trigger a test delivery |

Use `*` to subscribe to all events, or `savings.*` to subscribe to all savings events.

---

## Authentication

All webhook management endpoints require a Bearer token:

```http
Authorization: Bearer <your-jwt-token>
```

---

## Registering a Webhook

```http
POST /webhooks
Content-Type: application/json
Authorization: Bearer <token>

{
  "url": "https://your-service.com/webhooks",
  "events": ["savings.deposit", "savings.withdrawal"],
  "description": "Production deposit notifications"
}
```

**Response:**

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "url": "https://your-service.com/webhooks",
  "events": ["savings.deposit", "savings.withdrawal"],
  "status": "ACTIVE",
  "secret": "a8f3b2c1...",
  "description": "Production deposit notifications",
  "createdAt": "2026-06-02T03:00:00.000Z"
}
```

> **Important:** Save the `secret` — it is shown only once and is used to verify incoming requests.

---

## Verifying Webhook Signatures

Every delivery includes these headers:

| Header | Value |
|---|---|
| `X-Nestera-Signature` | `sha256=<hmac-hex>` |
| `X-Nestera-Timestamp` | Unix timestamp in milliseconds |
| `X-Nestera-Event` | Event name, e.g. `savings.deposit` |

To verify, compute `HMAC-SHA256(rawBody, secret)` and compare with the signature:

### Node.js

```js
const crypto = require('crypto');

function verifySignature(rawBody, secret, signatureHeader) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expected),
  );
}
```

### Python

```python
import hmac, hashlib

def verify_signature(raw_body: bytes, secret: str, signature_header: str) -> bool:
    expected = 'sha256=' + hmac.new(
        secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature_header, expected)
```

> Always use the **raw request body** (before JSON parsing) when computing the HMAC.

---

## API Reference

### List webhooks
```
GET /webhooks
```

### Get a webhook
```
GET /webhooks/:id
```

### Update a webhook
```
PATCH /webhooks/:id
```
Body fields: `url`, `events`, `secret`, `description` (all optional).

### Delete a webhook
```
DELETE /webhooks/:id
```

### Disable a webhook
```
PATCH /webhooks/:id/disable
```

### Enable a webhook
```
PATCH /webhooks/:id/enable
```

### Get delivery logs
```
GET /webhooks/:id/deliveries
```
Returns up to 100 most recent delivery attempts in descending order.

### Send a test event
```
POST /webhooks/:id/test
```
Sends a `webhook.test` event to the configured URL and returns the delivery result immediately.

---

## Retry Logic

Failed deliveries (non-2xx response or connection error) are automatically retried with exponential back-off:

| Attempt | Delay after failure |
|---|---|
| 2nd | 1 minute |
| 3rd | 5 minutes |
| 4th | 30 minutes |
| 5th | 2 hours |

After 5 failed attempts the delivery is marked `FAILED` and no further retries are scheduled.

---

## Delivery Monitoring

Check the delivery log to see the status of recent events:

```http
GET /webhooks/:id/deliveries
```

Each delivery record includes:

```json
{
  "id": "...",
  "eventName": "savings.deposit",
  "status": "FAILED",
  "attempts": 3,
  "responseStatus": 503,
  "responseBody": "Service Unavailable",
  "errorMessage": null,
  "nextRetryAt": "2026-06-02T03:30:00.000Z",
  "createdAt": "2026-06-02T03:00:00.000Z"
}
```

### Delivery Statuses

| Status | Meaning |
|---|---|
| `PENDING` | Awaiting delivery or scheduled for retry |
| `SUCCESS` | Delivered with a 2xx HTTP response |
| `FAILED` | All retry attempts exhausted |

---

## Security Best Practices

1. **Always verify the signature** before processing any webhook payload.
2. **Respond quickly** — return a 2xx within 10 seconds. Do heavy work asynchronously.
3. **Use HTTPS** for your webhook endpoint.
4. **Rotate secrets periodically** using the `PATCH /webhooks/:id` endpoint.
5. **Deduplicate** using the delivery `id` if your endpoint may receive duplicates during retries.

---

## Example: Handling a Deposit Webhook

```ts
import { createHmac, timingSafeEqual } from 'crypto';
import express from 'express';

const app = express();
app.use(express.raw({ type: 'application/json' }));

app.post('/webhooks', (req, res) => {
  const sig = req.headers['x-nestera-signature'] as string;
  const secret = process.env.WEBHOOK_SECRET!;

  const expected = 'sha256=' + createHmac('sha256', secret)
    .update(req.body)
    .digest('hex');

  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return res.status(401).send('Invalid signature');
  }

  const { event, data } = JSON.parse(req.body.toString());
  console.log(`Received ${event}:`, data);

  res.json({ received: true });
});
```
