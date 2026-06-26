# Design Document: Missing Open Graph Tags

## Overview

Add Open Graph and Twitter Card meta tags to all pages using the Next.js App Router Metadata API. The root layout provides sitewide defaults; individual layouts and pages override title/description as needed. A shared `siteConfig` constant centralises the base URL and default values.

## Architecture

Next.js App Router merges `metadata` exports from the root layout down through nested layouts to the page. This means:
- Root layout sets defaults for all pages
- Nested layouts override for their subtree
- Pages override for a single route

No new dependencies are required — this is pure Next.js Metadata API.

```
app/layout.tsx          ← Organization defaults (title, description, og:*, twitter:*)
  app/dashboard/layout.tsx   ← Dashboard OG overrides
    app/dashboard/settings/page.tsx  ← Settings OG overrides
    app/dashboard/governance/page.tsx
    app/dashboard/analytics/page.tsx
    app/dashboard/savings-pools/page.tsx
    app/dashboard/transactions/page.tsx
  app/goals/layout.tsx       ← Goals OG overrides
  app/savings/page.tsx       ← Savings OG overrides (via layout or generateMetadata)
```

## Components and Interfaces

### `frontend/app/lib/siteConfig.ts` (new)

```typescript
export const siteConfig = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nestera.io',
  name: 'Nestera',
  defaultTitle: 'Nestera – Decentralized Savings on Stellar',
  defaultDescription:
    'Secure, transparent savings powered by Stellar & Soroban. Earn yield on your stablecoins with no lock-up periods.',
  ogImage: '/og-image.png',
} as const;
```

### Root Layout Metadata (`app/layout.tsx`)

```typescript
import type { Metadata } from 'next';
import { siteConfig } from './lib/siteConfig';

export const metadata: Metadata = {
  title: {
    default: siteConfig.defaultTitle,
    template: '%s | Nestera',
  },
  description: siteConfig.defaultDescription,
  openGraph: {
    type: 'website',
    siteName: siteConfig.name,
    title: siteConfig.defaultTitle,
    description: siteConfig.defaultDescription,
    url: siteConfig.url,
    images: [
      {
        url: `${siteConfig.url}${siteConfig.ogImage}`,
        width: 1200,
        height: 630,
        alt: siteConfig.defaultTitle,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.defaultTitle,
    description: siteConfig.defaultDescription,
    images: [`${siteConfig.url}${siteConfig.ogImage}`],
  },
};
```

### Per-Page/Layout Metadata Pattern

Each nested layout or page exports a partial `Metadata` object. Next.js deep-merges it with the root defaults:

```typescript
// app/dashboard/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',   // becomes "Dashboard | Nestera" via template
  openGraph: {
    title: 'Dashboard – Nestera',
    description: 'Manage your savings, track goals, and monitor your portfolio.',
  },
  twitter: {
    title: 'Dashboard – Nestera',
    description: 'Manage your savings, track goals, and monitor your portfolio.',
  },
};
```

### Handling `'use client'` Pages

Pages marked `'use client'` cannot export `metadata`. The solution is to export metadata from the nearest parent Server Component layout. For example, `/savings/page.tsx` is `'use client'`, so metadata goes in a new `frontend/app/savings/layout.tsx`.

### OG Image

A static PNG at `frontend/public/og-image.png` (1200×630 px). Can be created with any design tool. Should include the Nestera wordmark and tagline on a dark teal background matching the brand.

## Correctness Properties

### Property 1: Every page has og:title and og:description

For any route in the app, the rendered HTML `<head>` should contain `<meta property="og:title">` and `<meta property="og:description">` tags with non-empty content.

**Validates: Requirements 1.1, 2.x**

### Property 2: og:image is an absolute URL

For any page, the `og:image` content value should be an absolute URL (starting with `https://`), not a relative path.

**Validates: Requirements 1.5**

### Property 3: twitter:card is always summary_large_image

For any page, `<meta name="twitter:card">` should have content `"summary_large_image"`.

**Validates: Requirements 4.1**

### Property 4: Client pages inherit metadata from parent layout

For any `'use client'` page, the rendered HTML should still contain OG tags sourced from the parent layout.

**Validates: Requirements 2.10**

## Error Handling

- If `NEXT_PUBLIC_SITE_URL` is not set, `siteConfig.url` falls back to `'https://nestera.io'` — no runtime error.
- OG image 404: the image must exist at `public/og-image.png` before deployment. A missing image causes social platforms to show no preview image but does not break the page.
