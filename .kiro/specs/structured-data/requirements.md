# Requirements Document

## Introduction

This feature adds JSON-LD structured data (Schema.org) to the Nestera Next.js frontend to enable rich search results in Google and other search engines. Currently no structured data exists anywhere in the codebase. The implementation injects `<script type="application/ld+json">` tags directly in component JSX, which is the recommended approach for Next.js App Router.

## Glossary

- **JSON-LD**: JavaScript Object Notation for Linked Data — the recommended format for embedding Schema.org structured data in HTML.
- **Schema.org**: A collaborative vocabulary for structured data on the web, used by Google, Bing, and others to generate rich search results.
- **Organization_Schema**: Schema.org type describing the Nestera company/platform.
- **WebSite_Schema**: Schema.org type describing the website, enabling the sitelinks search box in Google.
- **BreadcrumbList_Schema**: Schema.org type describing the navigational path to a page, displayed as breadcrumbs in search results.
- **FAQPage_Schema**: Schema.org type describing a page with FAQ content, enabling FAQ rich results in Google.
- **Rich_Result**: An enhanced search result with additional visual elements (breadcrumbs, FAQ dropdowns, etc.) generated from structured data.
- **NEXT_PUBLIC_SITE_URL**: Environment variable holding the canonical base URL.

---

## Requirements

### Requirement 1: Organization and WebSite Schema on Root Layout

**User Story:** As a platform operator, I want Organization and WebSite structured data on every page, so that search engines understand the Nestera brand and can display sitelinks.

#### Acceptance Criteria

1. THE root layout (`frontend/app/layout.tsx`) SHALL render a `<script type="application/ld+json">` tag containing an `Organization` schema object.
2. THE `Organization` schema SHALL include: `@type: "Organization"`, `name: "Nestera"`, `url` (from `NEXT_PUBLIC_SITE_URL`), `logo` (URL to `/logo.png`), `description: "Decentralized savings powered by Stellar & Soroban"`, and `sameAs` links to the platform's social profiles.
3. THE root layout SHALL render a second `<script type="application/ld+json">` tag containing a `WebSite` schema object.
4. THE `WebSite` schema SHALL include: `@type: "WebSite"`, `name: "Nestera"`, `url` (from `NEXT_PUBLIC_SITE_URL`), and a `potentialAction` of type `SearchAction` pointing to the site search URL.
5. BOTH schema scripts SHALL be rendered as Server Component output (not client-side) so they are present in the initial HTML.

---

### Requirement 2: FAQPage Schema on Landing Page

**User Story:** As a platform operator, I want FAQPage structured data on the landing page, so that Google can display FAQ rich results for Nestera's frequently asked questions.

#### Acceptance Criteria

1. THE landing page (`frontend/app/LandingPage/LandingPage.tsx` or its parent `frontend/app/page.tsx`) SHALL render a `<script type="application/ld+json">` tag containing a `FAQPage` schema object.
2. THE `FAQPage` schema SHALL include a `mainEntity` array with one `Question` object per FAQ item from `frontend/app/components/FAQ.tsx`.
3. EACH `Question` object SHALL have `@type: "Question"`, `name` (the question text), and `acceptedAnswer` with `@type: "Answer"` and `text` (the answer text).
4. THE FAQ data in the JSON-LD SHALL exactly match the questions and answers rendered in the `FAQ` component to avoid content mismatch penalties.
5. THE `FAQPage` schema SHALL be kept in sync with the `FAQ` component — if FAQ items are added or changed, the schema must be updated accordingly.

---

### Requirement 3: BreadcrumbList Schema on Inner Pages

**User Story:** As a platform operator, I want BreadcrumbList structured data on inner pages, so that Google displays breadcrumb navigation in search results.

#### Acceptance Criteria

1. THE `/savings` page SHALL render a `BreadcrumbList` schema with items: `Home (/)` → `Savings (/savings)`.
2. THE `/goals` layout SHALL render a `BreadcrumbList` schema with items: `Home (/)` → `Goals (/goals)`.
3. THE `/dashboard` layout SHALL render a `BreadcrumbList` schema with items: `Home (/)` → `Dashboard (/dashboard)`.
4. THE `/dashboard/settings` page SHALL render a `BreadcrumbList` schema with items: `Home (/)` → `Dashboard (/dashboard)` → `Settings (/dashboard/settings)`.
5. THE `/dashboard/governance` page SHALL render a `BreadcrumbList` schema with items: `Home (/)` → `Dashboard (/dashboard)` → `Governance (/dashboard/governance)`.
6. THE `/dashboard/analytics` page SHALL render a `BreadcrumbList` schema with items: `Home (/)` → `Dashboard (/dashboard)` → `Analytics (/dashboard/analytics)`.
7. EACH `BreadcrumbList` item SHALL include `@type: "ListItem"`, `position` (1-indexed integer), `name` (human-readable label), and `item` (absolute URL).
8. THE absolute URLs in breadcrumb items SHALL be constructed using `NEXT_PUBLIC_SITE_URL`.

---

### Requirement 4: Reusable JSON-LD Component

**User Story:** As a developer, I want a reusable component for injecting JSON-LD, so that structured data is added consistently without duplicating boilerplate.

#### Acceptance Criteria

1. A `JsonLd` component SHALL be created at `frontend/app/components/JsonLd.tsx`.
2. THE `JsonLd` component SHALL accept a `data` prop of type `Record<string, unknown>` and render `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />`.
3. THE `JsonLd` component SHALL be a Server Component (no `'use client'` directive).
4. ALL structured data in the codebase SHALL use the `JsonLd` component rather than inline script tags.
