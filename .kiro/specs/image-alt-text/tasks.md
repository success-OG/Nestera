# Implementation Plan: Missing Alt Text on Images (#623)

## Overview

Audit all `<img>` elements and inline SVGs, then add or improve `alt` attributes and `aria-hidden` as needed. Most images already have correct alt text; the changes are targeted.

## Tasks

- [ ] 1. Audit all `<img>` tags in the codebase
  - Search for all `<img` occurrences across `frontend/app/`
  - Confirm each has an `alt` attribute
  - Flag any missing or empty `alt` on informational images
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Improve SavingsProducts mockup alt text
  - Edit `frontend/app/components/SavingsProducts.tsx`
  - Update `alt="Nestera Mobile App Mockup"` to `alt="Nestera mobile app dashboard showing savings pools and portfolio overview"`
  - _Requirements: 3.1_

- [ ] 3. Verify Hero `imageAlt` prop is required
  - Edit `frontend/app/sections/Hero/Hero.tsx`
  - Confirm `imageAlt: string` in `HeroProps` interface is not optional (no `?`)
  - _Requirements: 2.1, 2.2, 5.1_

- [ ] 4. Add `aria-hidden` to decorative Lucide icons in savings page
  - Edit `frontend/app/savings/page.tsx`
  - Add `aria-hidden="true"` to each `<stat.icon>` usage in the stat cards grid
  - _Requirements: 4.1, 4.2_

- [ ] 5. Audit dashboard components for images
  - Scan all files in `frontend/app/components/dashboard/`
  - Add `alt` or `aria-hidden` to any `<img>` or decorative SVG found
  - _Requirements: 1.1, 4.1_

- [ ] 6. Final checkpoint — verify no missing alt attributes
  - Run a search for `<img` without `alt=` in the codebase
  - Ensure all tests pass, ask the user if questions arise.
