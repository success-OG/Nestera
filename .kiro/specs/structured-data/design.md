# Design Document: No Structured Data (Schema.org)

## Overview

Add JSON-LD structured data to the Nestera Next.js frontend using a reusable `JsonLd` Server Component. Four schema types are added: `Organization` and `WebSite` in the root layout (sitewide), `FAQPage` on the landing page, and `BreadcrumbList` on inner pages.

## Architecture

JSON-LD is injected as `<script type="application/ld+json">` tags directly in component JSX. This is the recommended approach for Next.js App Router — it works in both Server and Client Components and is present in the initial HTML for crawlers.

```
app/layout.tsx              ← Organization + WebSite schemas
app/page.tsx                ← FAQPage schema (landing page)
app/savings/layout.tsx      ← BreadcrumbList: Home → Savings
app/goals/layout.tsx        ← BreadcrumbList: Home → Goals
app/dashboard/layout.tsx    ← BreadcrumbList: Home → Dashboard
app/dashboard/settings/page.tsx     ← BreadcrumbList: Home → Dashboard → Settings
app/dashboard/governance/page.tsx   ← BreadcrumbList: Home → Dashboard → Governance
app/dashboard/analytics/page.tsx    ← BreadcrumbList: Home → Dashboard → Analytics
```

## Components and Interfaces

### `JsonLd` Component (`frontend/app/components/JsonLd.tsx`)

```typescript
// Server Component — no 'use client'
interface JsonLdProps {
  data: Record<string, unknown>;
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

### Schema Factory Functions (`frontend/app/lib/schemas.ts`)

Pure functions that return typed schema objects, keeping schema logic out of components:

```typescript
import { siteConfig } from './siteConfig';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Nestera',
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    description: 'Decentralized savings powered by Stellar & Soroban',
    sameAs: [
      'https://twitter.com/nestera',
      'https://discord.gg/nestera',
      'https://github.com/nestera',
    ],
  };
}

export function webSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Nestera',
    url: siteConfig.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteConfig.url}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function faqPageSchema(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteConfig.url}${item.path}`,
    })),
  };
}
```

### FAQ Data (`frontend/app/lib/faqData.ts`)

Extract FAQ items into a shared constant so both the `FAQ` component and the `FAQPage` schema use the same source of truth:

```typescript
export const faqItems = [
  {
    question: 'How do I get started with Nestera?',
    answer: 'Getting started with Nestera is simple...',
  },
  // ... remaining items
] as const;
```

The `FAQ` component is updated to import from `faqData.ts` instead of defining the array inline.

### Usage in Root Layout

```typescript
// app/layout.tsx
import JsonLd from './components/JsonLd';
import { organizationSchema, webSiteSchema } from './lib/schemas';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <JsonLd data={organizationSchema()} />
        <JsonLd data={webSiteSchema()} />
        {children}
      </body>
    </html>
  );
}
```

### Usage on Landing Page

```typescript
// app/page.tsx
import JsonLd from './components/JsonLd';
import { faqPageSchema } from './lib/schemas';
import { faqItems } from './lib/faqData';

export default function Home() {
  return (
    <>
      <JsonLd data={faqPageSchema(faqItems)} />
      <LandingPage />
    </>
  );
}
```

## Correctness Properties

### Property 1: JSON-LD is valid JSON

For any rendered page, the content of `<script type="application/ld+json">` tags should be parseable by `JSON.parse()` without throwing.

### Property 2: FAQ schema matches rendered FAQ content

The `mainEntity` array in the `FAQPage` schema should have the same length and the same question/answer strings as the items rendered by the `FAQ` component.

### Property 3: Breadcrumb positions are sequential

For any `BreadcrumbList`, the `position` values should be `1, 2, 3, ...` with no gaps or duplicates.

### Property 4: All URLs in schemas are absolute

For any schema object, all URL fields (`url`, `item`, `logo`, `target`) should start with `https://`.
