# Design Document: Newsletter Backend Integration (#798)

## Overview

Wire the existing `Newsletter.tsx` form to a new `POST /newsletter/subscribe` backend endpoint. The frontend gains loading state, toast feedback, and duplicate-email handling. The backend gains a new `NewsletterModule` with a `NewsletterSubscription` entity and a public endpoint.

---

## Architecture

```
Newsletter.tsx
  │  onSubmit → fetch("POST /api/newsletter/subscribe", { email })
  │
  ├─ 201 Created      → toast.success("Subscribed!") + clear input
  ├─ 200 Already sub  → toast.info("Already subscribed") + clear input
  ├─ 400 Bad email    → toast.error("Invalid email") + retain input
  └─ Network error    → toast.error("Network error — please try again") + retain input
```

---

## Backend

### New Module: `NewsletterModule`

**Location:** `backend/src/modules/newsletter/`

| File | Purpose |
|---|---|
| `newsletter.module.ts` | Module definition |
| `newsletter.controller.ts` | `POST /newsletter/subscribe` endpoint |
| `newsletter.service.ts` | Business logic: upsert subscription |
| `entities/newsletter-subscription.entity.ts` | TypeORM entity |
| `dto/subscribe.dto.ts` | Request DTO with `@IsEmail()` validation |

### Entity: `NewsletterSubscription`

```typescript
@Entity('newsletter_subscriptions')
export class NewsletterSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @CreateDateColumn()
  subscribedAt: Date;
}
```

### Controller

```typescript
@Post('subscribe')
@HttpCode(HttpStatus.CREATED)
@ApiOperation({ summary: 'Subscribe to newsletter' })
@ApiResponse({ status: 201, description: 'Subscribed successfully' })
@ApiResponse({ status: 200, description: 'Already subscribed' })
@ApiResponse({ status: 400, description: 'Invalid email' })
async subscribe(@Body() dto: SubscribeDto, @Res() res: Response) {
  const result = await this.newsletterService.subscribe(dto.email);
  return res.status(result.alreadySubscribed ? 200 : 201).json(result);
}
```

### Service

```typescript
async subscribe(email: string): Promise<{ message: string; alreadySubscribed: boolean }> {
  const existing = await this.repo.findOneBy({ email });
  if (existing) {
    return { message: 'Already subscribed', alreadySubscribed: true };
  }
  await this.repo.save(this.repo.create({ email }));
  return { message: 'Subscribed successfully', alreadySubscribed: false };
}
```

### DTO

```typescript
export class SubscribeDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsNotEmpty()
  email: string;
}
```

### `app.module.ts` change

Add `NewsletterModule` to the imports array.

---

## Frontend

### Updated `Newsletter.tsx`

Key changes:
- Add `isLoading` state (`useState<boolean>(false)`)
- Add `emailError` state for inline validation
- Import and use `useToast` from `ToastContext`
- Replace the empty `handleSubmit` with a real `fetch` call
- Disable input and button while loading
- Show spinner on button while loading

```typescript
const { success, error, info } = useToast();
const [isLoading, setIsLoading] = useState(false);
const [emailError, setEmailError] = useState('');

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setEmailError('');

  // Client-side validation
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setEmailError('Please enter a valid email address');
    return;
  }

  setIsLoading(true);
  try {
    const res = await fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (res.status === 201) {
      success('Subscribed!', 'You\'ll receive our latest updates.');
      setEmail('');
    } else if (res.status === 200) {
      info('Already subscribed', 'This email is already on our list.');
      setEmail('');
    } else {
      error('Subscription failed', data?.message ?? 'Please try again.');
    }
  } catch {
    error('Network error', 'Please check your connection and try again.');
  } finally {
    setIsLoading(false);
  }
};
```

---

## Files Changed

| File | Change |
|---|---|
| `backend/src/modules/newsletter/newsletter.module.ts` | New |
| `backend/src/modules/newsletter/newsletter.controller.ts` | New |
| `backend/src/modules/newsletter/newsletter.service.ts` | New |
| `backend/src/modules/newsletter/entities/newsletter-subscription.entity.ts` | New |
| `backend/src/modules/newsletter/dto/subscribe.dto.ts` | New |
| `backend/src/app.module.ts` | Add `NewsletterModule` to imports |
| `frontend/app/components/Newsletter.tsx` | Add loading state, toast integration, fetch call |

---

## Correctness Properties

### Property 1: Valid email → 201 + success toast + form reset
For any valid email not already in the DB, the form submits, receives 201, shows a success toast, and clears the input.

### Property 2: Duplicate email → 200 + info toast + form reset
For any email already in the DB, the endpoint returns 200, the frontend shows an info toast, and clears the input.

### Property 3: Invalid email → 400 + error toast + input retained
For any malformed email, the backend returns 400 and the frontend shows an error toast without clearing the input.

### Property 4: Network failure → error toast + input retained
When fetch throws (network down), the frontend shows an error toast and retains the email value.

### Property 5: Loading state prevents double submission
While `isLoading` is true, the submit button and email input are disabled, preventing concurrent requests.
