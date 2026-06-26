# Requirements Document

## Introduction

The Newsletter component (`frontend/app/components/Newsletter.tsx`) currently has a form that clears the email field on submit but makes no API call. This feature wires the form to a new backend endpoint, adds loading and error states, integrates the existing `ToastContext`, and handles edge cases such as duplicate emails and network failures.

## Glossary

- **Newsletter component**: `frontend/app/components/Newsletter.tsx` — the email subscription form rendered on the landing page.
- **ToastContext**: `frontend/app/context/ToastContext.tsx` — provides `success()` and `error()` helper methods for showing dismissible toast notifications.
- **NewsletterModule**: The new NestJS module at `backend/src/modules/newsletter/` that owns the subscription endpoint.
- **SubscribeDto**: The request body DTO for `POST /newsletter/subscribe` — contains a validated email field.
- **Duplicate email**: A subscription attempt for an email address that is already registered in the newsletter list.

---

## Requirements

### Requirement 1: Backend subscription endpoint

**User Story:** As a platform operator, I want a backend endpoint that stores newsletter subscriptions, so that user emails are persisted and can be used for future campaigns.

#### Acceptance Criteria

1. THE NewsletterModule SHALL expose a `POST /newsletter/subscribe` endpoint that accepts a JSON body with an `email` field.
2. THE endpoint SHALL validate that `email` is a non-empty string in valid email format using `class-validator`; invalid emails SHALL return HTTP 400 with a descriptive error.
3. WHEN a new email is submitted, THE endpoint SHALL persist the subscription and return HTTP 201.
4. WHEN an already-subscribed email is submitted, THE endpoint SHALL return HTTP 200 with a message indicating the email is already subscribed — it SHALL NOT return HTTP 409 or throw an unhandled error.
5. THE endpoint SHALL NOT require JWT authentication.
6. THE endpoint SHALL be documented with Swagger/OpenAPI `@ApiTags`, `@ApiOperation`, and `@ApiResponse` decorators.

---

### Requirement 2: Frontend loading state

**User Story:** As a user, I want to see a loading indicator while my subscription is being processed, so that I know the form is working.

#### Acceptance Criteria

1. WHEN the form is submitted, THE Newsletter component SHALL set a loading state to `true` and disable the submit button until the request completes or fails.
2. WHILE loading is `true`, THE submit button SHALL display a loading indicator (spinner or changed label) instead of the default "Submit" text.
3. THE email input SHALL also be disabled while loading is `true` to prevent duplicate submissions.

---

### Requirement 3: Success and error toast notifications

**User Story:** As a user, I want clear feedback after submitting the newsletter form, so that I know whether my subscription was successful.

#### Acceptance Criteria

1. WHEN the API returns a success response (HTTP 201 or 200), THE Newsletter component SHALL call `toast.success()` with a confirmation message.
2. WHEN the API returns an error response or the network request fails, THE Newsletter component SHALL call `toast.error()` with a helpful message.
3. WHEN the API indicates the email is already subscribed (HTTP 200 with already-subscribed message), THE Newsletter component SHALL call `toast.info()` rather than `toast.success()`.
4. THE Newsletter component SHALL import and use the `useToast` hook from `ToastContext`.

---

### Requirement 4: Form reset and duplicate handling

**User Story:** As a user, I want the form to reset after a successful submission and to receive a clear message if I try to subscribe with an already-registered email.

#### Acceptance Criteria

1. AFTER a successful new subscription (HTTP 201), THE Newsletter component SHALL clear the email input field.
2. AFTER an error response, THE Newsletter component SHALL retain the email value in the input so the user can correct and resubmit.
3. WHEN a duplicate email is submitted, THE Newsletter component SHALL display an informational toast (not an error toast) and SHALL clear the email field.
4. WHEN a network error occurs (fetch throws), THE Newsletter component SHALL display an error toast with a message such as "Network error — please try again."

---

### Requirement 5: Client-side email validation

**User Story:** As a user, I want the form to validate my email before submitting, so that I get immediate feedback without waiting for a server round-trip.

#### Acceptance Criteria

1. THE Newsletter component SHALL validate that the email field is non-empty and matches a basic email pattern before calling the API.
2. IF client-side validation fails, THE component SHALL NOT make an API call and SHALL display an inline error message below the input.
3. THE existing `type="email"` and `required` HTML attributes SHALL be retained as a first layer of validation.
