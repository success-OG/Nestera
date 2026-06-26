# Implementation Plan: Poor Semantic HTML Structure (#622)

## Overview

Replace generic `<div>` elements with semantic HTML5 equivalents. All Tailwind classes and visual appearance remain unchanged — only element types and ARIA attributes are updated.

## Tasks

- [ ] 1. Add `<main>` to dashboard layout
  - Edit `frontend/app/dashboard/layout.tsx`
  - Change the content wrapper `<div className="min-h-screen px-4 py-5 md:ml-[180px] ...">` to `<main className="...">`
  - _Requirements: 1.1, 1.3_

- [ ] 2. Add `<main>` to savings page
  - Edit `frontend/app/savings/page.tsx`
  - Change top-level `<section className="min-h-screen ...">` to `<main className="...">`
  - _Requirements: 1.1, 1.4_

- [ ] 3. Add `<main>` to goals layout
  - Edit `frontend/app/goals/layout.tsx`
  - Change `<div className="min-h-screen bg-[#061218]">` to `<main className="...">`
  - _Requirements: 1.1, 1.5_

- [ ] 4. Replace `<div>` with `<article>` in ProductCard
  - Edit `frontend/app/components/SavingsProducts.tsx`
  - Change `ProductCard` root element from `<div>` to `<article>`
  - Add `aria-labelledby` on `<article>` pointing to the card's `<h3>` id
  - Add matching `id` to the `<h3>` element
  - _Requirements: 2.1, 2.2_

- [ ] 5. Fix heading hierarchy in savings page
  - Edit `frontend/app/savings/page.tsx`
  - Change "Featured Goal" heading from `<h3>` to `<h2>`
  - Change "Smart Insights" heading from `<h3>` to `<h2>`
  - Change "Recent Contributions" heading from `<h3>` to `<h2>`
  - Verify `<h1>` (Goal-Based Savings) → `<h2>` (sections) → `<h3>` (subsections) hierarchy is correct
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 6. Replace contributions `<div>` grid with `<table>`
  - Edit `frontend/app/savings/page.tsx`
  - Replace the header `<div className="grid grid-cols-5 ...">` with `<table aria-label="Recent Contributions"><thead><tr>`
  - Replace each row `<div className="grid grid-cols-5 ...">` with `<tbody><tr><td>` elements
  - Add `scope="col"` to each `<th>` in the header row
  - Preserve all existing Tailwind classes on the wrapper and cell elements
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 7. Replace stat card `<p>` pairs with `<dl>/<dt>/<dd>`
  - Edit `frontend/app/savings/page.tsx`
  - In the summary stats grid, replace each stat card's label `<p>` with `<dt>` and value `<p>` with `<dd>`, wrapped in `<dl>`
  - Add `aria-hidden="true"` to the icon element in each stat card
  - _Requirements: 5.1, 5.2_

- [ ] 8. Final checkpoint — verify landmark and heading structure
  - Inspect each page with a screen reader or browser accessibility tree
  - Confirm exactly one `<main>` per page, no skipped heading levels, table markup is correct
  - Ensure all tests pass, ask the user if questions arise.
