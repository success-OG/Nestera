# Implementation Plan: No Structured Data (Schema.org) (#624)

## Overview

Add JSON-LD structured data via a reusable `JsonLd` Server Component. Work proceeds: shared utilities → root layout schemas → landing page FAQ schema → inner page breadcrumbs.

## Tasks

- [ ] 1. Create `siteConfig` (if not already created by #617)
  - Create `frontend/app/lib/siteConfig.ts` with `url`, `name`, etc.
  - If #617 was implemented first, skip this task — reuse the existing file
  - _Requirements: 1.2, 1.4, 3.8_

- [ ] 2. Create `JsonLd` Server Component
  - Create `frontend/app/components/JsonLd.tsx`
  - Accept `data: Record<string, unknown>` prop
  - Render `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />`
  - No `'use client'` directive
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 3. Create schema factory functions
  - Create `frontend/app/lib/schemas.ts`
  - Implement `organizationSchema()`, `webSiteSchema()`, `faqPageSchema(items)`, `breadcrumbSchema(items)`
  - All URL fields use `siteConfig.url` as base
  - _Requirements: 1.2, 1.3, 1.4, 2.2, 2.3, 3.7, 3.8_

- [ ] 4. Extract FAQ data to shared constant
  - Create `frontend/app/lib/faqData.ts` with the `faqItems` array
  - Update `frontend/app/components/FAQ.tsx` to import from `faqData.ts` instead of defining inline
  - _Requirements: 2.4, 2.5_

- [ ] 5. Add Organization and WebSite schemas to root layout
  - Edit `frontend/app/layout.tsx`
  - Import `JsonLd` and schema factories
  - Render `<JsonLd data={organizationSchema()} />` and `<JsonLd data={webSiteSchema()} />` inside `<body>`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 6. Add FAQPage schema to landing page
  - Edit `frontend/app/page.tsx`
  - Import `JsonLd`, `faqPageSchema`, `faqItems`
  - Render `<JsonLd data={faqPageSchema(faqItems)} />` before `<LandingPage />`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 7. Add BreadcrumbList schemas to inner pages/layouts
  - Edit `frontend/app/savings/layout.tsx` (create if needed) — add `<JsonLd data={breadcrumbSchema([{name:'Home',path:'/'},{name:'Savings',path:'/savings'}])} />`
  - Edit `frontend/app/goals/layout.tsx` — add breadcrumb: Home → Goals
  - Edit `frontend/app/dashboard/layout.tsx` — add breadcrumb: Home → Dashboard
  - Edit `frontend/app/dashboard/settings/page.tsx` — add breadcrumb: Home → Dashboard → Settings
  - Edit `frontend/app/dashboard/governance/page.tsx` — add breadcrumb: Home → Dashboard → Governance
  - Edit `frontend/app/dashboard/analytics/page.tsx` — add breadcrumb: Home → Dashboard → Analytics
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ] 8. Final checkpoint — validate JSON-LD output
  - Inspect rendered HTML source for `<script type="application/ld+json">` tags on each route
  - Validate schemas using Google's Rich Results Test tool
  - Ensure all tests pass, ask the user if questions arise.
