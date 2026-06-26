# Implementation Plan: Newsletter Backend Integration (#798)

## Tasks

- [ ] 1. Create backend `NewsletterSubscription` entity and DTO
  - Create `backend/src/modules/newsletter/entities/newsletter-subscription.entity.ts` with `id` (uuid PK), `email` (unique varchar), `subscribedAt` (CreateDateColumn)
  - Create `backend/src/modules/newsletter/dto/subscribe.dto.ts` with `email` field decorated with `@IsEmail()` and `@IsNotEmpty()`
  - _Requirements: 1.1, 1.2_

- [ ] 2. Create `NewsletterService`
  - Create `backend/src/modules/newsletter/newsletter.service.ts`
  - Implement `subscribe(email: string)` method: check for existing record, return `{ message, alreadySubscribed: true }` if found, otherwise insert and return `{ message, alreadySubscribed: false }`
  - _Requirements: 1.3, 1.4_

- [ ] 3. Create `NewsletterController`
  - Create `backend/src/modules/newsletter/newsletter.controller.ts`
  - Implement `POST /newsletter/subscribe` with `@HttpCode(HttpStatus.CREATED)`, `@Body() dto: SubscribeDto`
  - Return HTTP 200 when `alreadySubscribed: true`, HTTP 201 otherwise
  - Add `@ApiTags('newsletter')`, `@ApiOperation`, `@ApiResponse` Swagger decorators
  - No `JwtAuthGuard` — endpoint is public
  - _Requirements: 1.1, 1.5, 1.6_

- [ ] 4. Create `NewsletterModule` and register in `AppModule`
  - Create `backend/src/modules/newsletter/newsletter.module.ts` importing `TypeOrmModule.forFeature([NewsletterSubscription])`
  - Add `NewsletterModule` to `backend/src/app.module.ts` imports
  - _Requirements: 1.1_

- [ ] 5. Update `Newsletter.tsx` — add loading state and toast integration
  - Import `useToast` from `../../context/ToastContext`
  - Add `isLoading` state (`useState<boolean>(false)`)
  - Add `emailError` state (`useState<string>('')`)
  - Disable the email input and submit button while `isLoading` is true
  - Show a loading indicator on the button while `isLoading` is true
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 6. Update `Newsletter.tsx` — implement `handleSubmit` with fetch
  - Add client-side email regex validation; set `emailError` and return early if invalid
  - Call `fetch('/api/newsletter/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })`
  - On HTTP 201: call `toast.success(...)`, clear email input
  - On HTTP 200 (already subscribed): call `toast.info(...)`, clear email input
  - On HTTP 400 or other error: call `toast.error(...)`, retain email input
  - On fetch throw (network error): call `toast.error('Network error', 'Please check your connection and try again.')`
  - Wrap in try/finally to always set `isLoading(false)`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2_

- [ ] 7. Checkpoint — verify end-to-end flow
  - Start the backend and frontend locally
  - Submit a new email → confirm 201 response and success toast
  - Submit the same email again → confirm 200 response and info toast
  - Submit an invalid email → confirm inline error message appears, no API call made
  - Disconnect network → confirm error toast appears
  - _Requirements: all_
