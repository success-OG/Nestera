# Implementation Plan: Missing Open Graph Tags (#617)

## Overview

Add Open Graph and Twitter Card meta tags to all pages using the Next.js Metadata API. Work proceeds: shared config → root layout → per-route overrides → OG image asset.

## Tasks

- [ ] 1. Create `siteConfig` shared constant
  - Create `frontend/app/lib/siteConfig.ts`
  - Export `siteConfig` with `url` (from `NEXT_PUBLIC_SITE_URL` with fallback), `name`, `defaultTitle`, `defaultDescription`, `ogImage`
  - Add `NEXT_PUBLIC_SITE_URL=https://nestera.io` to `frontend/.env.example`
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 2. Update root layout with full OG and Twitter metadata
  - Edit `frontend/app/layout.tsx`
  - Add `openGraph` object: `type`, `siteName`, `title`, `description`, `url`, `images` (with width/height/alt)
  - Add `twitter` object: `card: "summary_large_image"`, `title`, `description`, `images`
  - Use `title.template: '%s | Nestera'` for automatic page title suffixing
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 4.1, 4.2_

- [ ] 3. Add OG image asset
  - Create `frontend/public/og-image.png` at 1200×630 px with Nestera branding
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 4. Add metadata to dashboard layout
  - Edit `frontend/app/dashboard/layout.tsx`
  - Export `metadata` with `title: 'Dashboard'`, `openGraph.title`, `openGraph.description`, `twitter.title`, `twitter.description`
  - _Requirements: 2.4_

- [ ] 5. Add metadata to goals layout
  - Edit `frontend/app/goals/layout.tsx`
  - Export `metadata` with `title: 'Goal Management'`, matching OG and Twitter fields
  - _Requirements: 2.3_

- [ ] 6. Add savings layout with metadata (client page workaround)
  - Create `frontend/app/savings/layout.tsx` (new file — savings/page.tsx is 'use client')
  - Export `metadata` with `title: 'Goal-Based Savings'`, matching OG and Twitter fields
  - _Requirements: 2.2, 2.10_

- [ ] 7. Add metadata to dashboard sub-pages
  - Edit `frontend/app/dashboard/settings/page.tsx` — add/update `metadata` export with OG + Twitter fields
  - Edit `frontend/app/dashboard/governance/page.tsx` — add `metadata` export
  - Edit `frontend/app/dashboard/analytics/page.tsx` — add `metadata` export
  - Edit `frontend/app/dashboard/savings-pools/page.tsx` — add `metadata` export
  - Edit `frontend/app/dashboard/transactions/page.tsx` — add `metadata` export
  - _Requirements: 2.5, 2.6, 2.7, 2.8, 2.9_

- [ ] 8. Final checkpoint — verify OG tags render correctly
  - Run `next build` and inspect generated HTML for OG meta tags on each route
  - Ensure all tests pass, ask the user if questions arise.
