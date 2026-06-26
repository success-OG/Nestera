# Requirements Document

## Introduction

This feature adds Open Graph (OG) meta tags to all pages of the Nestera Next.js frontend. OG tags enable rich previews when links are shared on social media platforms (Twitter/X, LinkedIn, Facebook, Discord, etc.). Currently no OG tags exist anywhere in the codebase. The implementation uses the Next.js App Router Metadata API (`export const metadata`) in layout and page files.

## Glossary

- **Open_Graph**: The OG protocol (ogp.me) that defines meta tags controlling how URLs are displayed when shared on social platforms.
- **Metadata_API**: Next.js App Router's built-in mechanism for exporting `metadata` objects from layout and page files to generate `<meta>` tags in `<head>`.
- **Root_Layout**: `frontend/app/layout.tsx` — the top-level layout applied to every page.
- **OG_Image**: A static image (recommended 1200×630 px) served from `/public/` and referenced in `og:image`.
- **NEXT_PUBLIC_SITE_URL**: An environment variable holding the canonical base URL (e.g. `https://nestera.io`).
- **Static_Metadata**: A `metadata` export that is a plain object (not a function), used in Server Components and layouts.
- **Dynamic_Metadata**: A `generateMetadata` async function used in pages that need route-specific values.

---

## Requirements

### Requirement 1: Root-Level Open Graph Defaults

**User Story:** As a platform operator, I want every page to have baseline OG tags even if no page-specific overrides exist, so that any shared link produces a recognisable preview.

#### Acceptance Criteria

1. THE Root_Layout SHALL export a `metadata` object that includes `openGraph.title`, `openGraph.description`, `openGraph.url`, `openGraph.siteName`, `openGraph.images`, and `openGraph.type`.
2. THE `openGraph.title` SHALL be `"Nestera – Decentralized Savings on Stellar"`.
3. THE `openGraph.description` SHALL be `"Secure, transparent savings powered by Stellar & Soroban. Earn yield on your stablecoins with no lock-up periods."`.
4. THE `openGraph.url` SHALL be derived from the `NEXT_PUBLIC_SITE_URL` environment variable, defaulting to `"https://nestera.io"` when the variable is absent.
5. THE `openGraph.images` SHALL reference a single OG image at `{NEXT_PUBLIC_SITE_URL}/og-image.png` with `width: 1200`, `height: 630`, and `alt: "Nestera – Decentralized Savings on Stellar"`.
6. THE `openGraph.type` SHALL be `"website"`.
7. THE Root_Layout metadata SHALL also include `twitter.card: "summary_large_image"`, `twitter.title`, and `twitter.description` mirroring the OG values.

---

### Requirement 2: Page-Specific Open Graph Overrides

**User Story:** As a frontend developer, I want each distinct page to override the default OG title and description, so that shared links accurately describe the specific page content.

#### Acceptance Criteria

1. THE landing page (`/`) SHALL NOT need a separate metadata export because the Root_Layout defaults apply and are accurate for the home page.
2. THE `/savings` route SHALL have a layout or page metadata export with `openGraph.title: "Goal-Based Savings – Nestera"` and a matching description.
3. THE `/goals` layout SHALL have `openGraph.title: "Goal Management – Nestera"` and a matching description.
4. THE `/dashboard` layout SHALL have `openGraph.title: "Dashboard – Nestera"` and `openGraph.description: "Manage your savings, track goals, and monitor your portfolio."`.
5. THE `/dashboard/settings` page SHALL have `openGraph.title: "Settings – Nestera"` and a matching description.
6. THE `/dashboard/governance` page SHALL have `openGraph.title: "Governance – Nestera"` and a matching description.
7. THE `/dashboard/analytics` page SHALL have `openGraph.title: "Analytics – Nestera"` and a matching description.
8. THE `/dashboard/savings-pools` page SHALL have `openGraph.title: "Savings Pools – Nestera"` and a matching description.
9. THE `/dashboard/transactions` page SHALL have `openGraph.title: "Transactions – Nestera"` and a matching description.
10. WHEN a page is a `'use client'` component and cannot export `metadata` directly, THE metadata SHALL be exported from the nearest parent Server Component layout file instead.

---

### Requirement 3: OG Image Asset

**User Story:** As a platform operator, I want a dedicated OG image that renders well in social media previews, so that shared links look professional and on-brand.

#### Acceptance Criteria

1. AN OG image file SHALL exist at `frontend/public/og-image.png`.
2. THE OG image SHALL have dimensions of 1200×630 pixels.
3. THE OG image SHALL include the Nestera brand name and a brief tagline.
4. THE OG image SHALL be referenced in the Root_Layout metadata as described in Requirement 1.5.

---

### Requirement 4: Twitter Card Tags

**User Story:** As a platform operator, I want Twitter Card meta tags on all pages, so that links shared on Twitter/X display a large image preview.

#### Acceptance Criteria

1. THE Root_Layout metadata SHALL include a `twitter` object with `card: "summary_large_image"`.
2. THE `twitter.title` and `twitter.description` SHALL mirror the `openGraph.title` and `openGraph.description` values for each page.
3. WHEN a page overrides `openGraph.title`, THE `twitter.title` SHALL also be updated to match.

---

### Requirement 5: Environment Variable Configuration

**User Story:** As a developer, I want the site URL to be configurable via an environment variable, so that OG tags work correctly across development, staging, and production environments.

#### Acceptance Criteria

1. THE codebase SHALL read the base URL from `process.env.NEXT_PUBLIC_SITE_URL`.
2. WHEN `NEXT_PUBLIC_SITE_URL` is not set, THE code SHALL fall back to `"https://nestera.io"`.
3. THE `frontend/.env.example` file SHALL document the `NEXT_PUBLIC_SITE_URL` variable with an example value.
