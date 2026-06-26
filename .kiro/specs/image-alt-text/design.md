# Design Document: Missing Alt Text on Images

## Overview

Audit all `<img>` elements and inline SVGs in the Nestera frontend and ensure every image has an appropriate `alt` attribute. The codebase uses standard HTML `<img>` tags (not `next/image`). Most images already have alt text; this fix closes the remaining gaps and establishes a clear convention.

## Architecture

No new files or dependencies. Changes are confined to existing component files. The audit covers:

1. All `<img>` tags in the codebase
2. All inline `<svg>` elements (decorative ones need `aria-hidden="true"`)

## Audit Results and Required Changes

### Images Already Correct

| File | Element | Status |
|---|---|---|
| `Hero.tsx` | `<img src={imageSrc} alt={imageAlt}>` | ✅ alt prop passed from parent |
| `SavingsProducts.tsx` | `<img src="/mockup.png" alt="Nestera Mobile App Mockup">` | ✅ has alt |
| `HowItWorks.tsx` | SVG icons | ✅ `aria-hidden` present |
| `Footer.tsx` | SVG social icons | ✅ `aria-hidden` + `aria-label` on links |
| `Navbar.tsx` | SVG hamburger/close | ✅ `aria-hidden` + sr-only text |

### Changes Required

#### `frontend/app/sections/Hero/Hero.tsx`

The `imageAlt` prop is already used correctly. However, the `HeroProps` interface should mark it as required (currently it may be optional in some usages). Verify the interface:

```typescript
interface HeroProps {
  imageAlt: string;  // must be required, not optional
  // ...
}
```

#### `frontend/app/components/SavingsProducts.tsx`

Update alt text to be more descriptive:

```tsx
// Before
alt="Nestera Mobile App Mockup"

// After
alt="Nestera mobile app dashboard showing savings pools and portfolio overview"
```

#### Dashboard Components — Audit Required

Scan all files in `frontend/app/components/dashboard/` for any `<img>` tags. Based on the current codebase, dashboard components appear to use SVG icons and no `<img>` tags, but this must be confirmed during implementation.

#### Inline SVGs Without `aria-hidden`

Any inline `<svg>` used as a decorative icon that does not already have `aria-hidden="true"` should have it added. The stat card icons in `frontend/app/savings/page.tsx` use Lucide React components — these render as SVGs and should be wrapped or have `aria-hidden` applied:

```tsx
// Lucide icons in stat cards are decorative
<stat.icon size={20} strokeWidth={2} aria-hidden="true" />
```

## Conventions Established

1. Informational `<img>` → descriptive `alt` string
2. Decorative `<img>` → `alt=""`
3. Decorative inline SVG → `aria-hidden="true"`
4. Interactive icon-only button → `aria-label` on the `<button>`, SVG gets `aria-hidden="true"`
5. `HeroProps.imageAlt` is a required string — enforces alt text at the component API level

## Correctness Properties

### Property 1: No `<img>` without `alt` attribute

For any `<img>` element in the rendered DOM, the `alt` attribute should be present (even if empty string for decorative images).

### Property 2: Informational images have non-empty alt text

For any `<img>` that conveys content (hero image, mockup), the `alt` attribute should be a non-empty, descriptive string.

### Property 3: Decorative SVGs have `aria-hidden="true"`

For any inline `<svg>` that is purely decorative, the element should have `aria-hidden="true"` in the rendered DOM.
