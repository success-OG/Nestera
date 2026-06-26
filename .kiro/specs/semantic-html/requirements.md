# Requirements Document

## Introduction

This fix improves the semantic HTML structure of the Nestera Next.js frontend. Many components use generic `<div>` elements where semantic HTML5 elements (`<main>`, `<article>`, `<table>`, `<dl>`, etc.) would be more appropriate. Proper semantic HTML improves accessibility for screen reader users, helps search engines understand page structure, and ensures a correct landmark hierarchy.

## Glossary

- **Landmark**: An ARIA landmark role (or its implicit HTML equivalent) that allows screen reader users to navigate directly to major page regions (e.g. `<main>`, `<nav>`, `<footer>`).
- **Heading_Hierarchy**: The ordered sequence of heading levels (h1 → h2 → h3) that must not skip levels.
- **Data_Table**: A tabular data structure that should use `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` elements.
- **Description_List**: A list of term–value pairs that should use `<dl>`, `<dt>`, `<dd>` elements (e.g. stat cards with label + value).
- **Article**: A self-contained, independently distributable piece of content — appropriate for product cards, step cards, goal cards.

---

## Requirements

### Requirement 1: Every Page Has Exactly One `<main>` Landmark

**User Story:** As a screen reader user, I want a `<main>` landmark on every page, so that I can skip directly to the primary content.

#### Acceptance Criteria

1. EVERY page route SHALL have exactly one `<main>` element wrapping the primary page content.
2. THE landing page (`LandingPage.tsx`) already uses `<main>` — this SHALL be preserved.
3. THE dashboard layout (`frontend/app/dashboard/layout.tsx`) SHALL wrap the content area in `<main>` instead of a generic `<div>`.
4. THE `/savings` page (`frontend/app/savings/page.tsx`) SHALL use `<main>` as its top-level element instead of `<section>`.
5. THE `/goals` page (`frontend/app/goals/page.tsx`) SHALL be wrapped in `<main>` via its layout or the page component itself.
6. NO page SHALL have more than one `<main>` element.

---

### Requirement 2: Product Cards Use `<article>` Elements

**User Story:** As a screen reader user, I want savings product cards to be marked as articles, so that I can navigate between self-contained content items.

#### Acceptance Criteria

1. THE `ProductCard` component in `frontend/app/components/SavingsProducts.tsx` SHALL use `<article>` as its root element instead of `<div>`.
2. EACH `<article>` SHALL have an accessible name via `aria-labelledby` pointing to the card's `<h3>` heading.

---

### Requirement 3: Correct Heading Hierarchy

**User Story:** As a screen reader user, I want headings to follow a logical hierarchy without skipping levels, so that I can understand the page structure.

#### Acceptance Criteria

1. EACH page SHALL have exactly one `<h1>` element.
2. `<h2>` elements SHALL be used for major sections within a page.
3. `<h3>` elements SHALL be used for subsections within an `<h2>` section.
4. NO heading level SHALL be skipped (e.g. jumping from `<h1>` to `<h3>` without an intervening `<h2>`).
5. THE `/savings` page heading hierarchy SHALL be: `<h1>` (Goal-Based Savings) → `<h2>` (Your Savings Goals, Smart Insights, Recent Contributions) → `<h3>` (Featured Goal, individual insight titles).

---

### Requirement 4: Tabular Data Uses `<table>` Elements

**User Story:** As a screen reader user, I want tabular data to use proper table markup, so that I can navigate columns and rows with table-navigation commands.

#### Acceptance Criteria

1. THE "Recent Contributions" section in `frontend/app/savings/page.tsx` SHALL use a `<table>` element with `<thead>`, `<tbody>`, `<tr>`, `<th>` (for column headers), and `<td>` elements instead of the current `<div>` grid layout.
2. EACH `<th>` in the table header SHALL have `scope="col"`.
3. THE `<table>` SHALL have a `<caption>` element or be labelled via `aria-label` or `aria-labelledby`.

---

### Requirement 5: Stat Cards Use Description Lists

**User Story:** As a screen reader user, I want stat cards (label + value pairs) to use description list markup, so that the relationship between labels and values is semantically clear.

#### Acceptance Criteria

1. THE summary stats grid in `frontend/app/savings/page.tsx` (Total Goals, Active Goals, Total Saved, etc.) SHALL use `<dl>` as the container for each stat card's label–value pair, with `<dt>` for the label and `<dd>` for the value.
2. THE visual appearance of the stat cards SHALL remain unchanged after the semantic update.
