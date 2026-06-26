# Requirements Document

## Introduction

This fix ensures all images in the Nestera Next.js frontend have appropriate `alt` attributes for accessibility and SEO. Missing or empty `alt` attributes on informational images prevent screen readers from conveying image content and reduce search engine indexability. Decorative images must use `alt=""` (empty string) rather than omitting the attribute entirely.

## Glossary

- **Informational_Image**: An image that conveys content or context meaningful to the user (e.g. a product mockup, hero illustration). Requires a descriptive `alt` string.
- **Decorative_Image**: An image that is purely visual and adds no informational value (e.g. a background texture). Requires `alt=""` (empty string).
- **Inline_SVG**: An SVG element rendered directly in JSX. Decorative inline SVGs should have `aria-hidden="true"`.
- **Alt_Text**: The string value of the `alt` attribute on an `<img>` element, read aloud by screen readers and indexed by search engines.

---

## Requirements

### Requirement 1: All `<img>` Elements Have an `alt` Attribute

**User Story:** As a screen reader user, I want every image to have an `alt` attribute, so that I understand what the image represents or know it is decorative.

#### Acceptance Criteria

1. EVERY `<img>` element in the codebase SHALL have an explicit `alt` attribute — the attribute must never be absent.
2. WHEN an image is informational, THE `alt` attribute SHALL contain a concise, descriptive string (non-empty).
3. WHEN an image is decorative, THE `alt` attribute SHALL be an empty string (`alt=""`).
4. THE `alt` text for informational images SHALL describe the image content, not its file name or generic phrases like "image" or "photo".

---

### Requirement 2: Hero Image Alt Text

**User Story:** As a screen reader user, I want the hero image to have descriptive alt text, so that I understand the visual context of the landing page.

#### Acceptance Criteria

1. THE `Hero` component in `frontend/app/sections/Hero/Hero.tsx` SHALL accept an `imageAlt` prop and apply it to the `<img>` element's `alt` attribute.
2. THE `imageAlt` prop SHALL be required (non-optional) in the `HeroProps` interface.
3. THE landing page SHALL pass `imageAlt="Glowing crypto vault representing decentralized savings on Stellar"` (or equivalent descriptive text) to the `Hero` component.

---

### Requirement 3: SavingsProducts Mockup Image Alt Text

**User Story:** As a screen reader user, I want the app mockup image in the Savings Products section to have descriptive alt text.

#### Acceptance Criteria

1. THE `<img>` in `frontend/app/components/SavingsProducts.tsx` with `src="/mockup.png"` SHALL have `alt="Nestera mobile app showing savings dashboard"` (or equivalent descriptive text).

---

### Requirement 4: Decorative SVG Icons Have `aria-hidden`

**User Story:** As a screen reader user, I want decorative SVG icons to be hidden from the accessibility tree, so that they do not create noise when navigating by screen reader.

#### Acceptance Criteria

1. EVERY inline `<svg>` element that is purely decorative SHALL have `aria-hidden="true"`.
2. EVERY inline `<svg>` element that conveys meaning (e.g. a standalone icon button with no visible label) SHALL have a descriptive `aria-label` or be accompanied by a visually hidden text label.
3. THE existing `aria-hidden` attributes already present on SVG icons in `HowItWorks.tsx`, `Footer.tsx`, and `Navbar.tsx` SHALL be preserved.

---

### Requirement 5: Future Image Governance

**User Story:** As a developer, I want a clear convention for adding images, so that new images always have appropriate alt text.

#### Acceptance Criteria

1. THE `HeroProps` interface SHALL keep `imageAlt` as a required string prop to enforce alt text at the component API level.
2. WHEN a new `<img>` element is added to any component, THE developer SHALL provide either a descriptive `alt` string or `alt=""` for decorative images.
