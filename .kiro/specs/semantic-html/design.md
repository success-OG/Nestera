# Design Document: Poor Semantic HTML Structure

## Overview

Replace generic `<div>` elements with appropriate semantic HTML5 elements across the Nestera frontend. Changes are surgical — only the element type and any required ARIA attributes change; all Tailwind classes and visual appearance remain identical.

## Architecture

No new files or dependencies are needed. Changes are confined to existing component and page files. The approach is:

1. Add `<main>` to layouts/pages that lack it
2. Replace `<div>` product cards with `<article>`
3. Fix heading hierarchy where levels are skipped
4. Replace `<div>` grid tables with `<table>` markup
5. Replace `<p>` label+value stat pairs with `<dl>/<dt>/<dd>`

## File-by-File Changes

### `frontend/app/dashboard/layout.tsx`

The content wrapper `<div className="min-h-screen px-4 py-5 ...">` becomes `<main className="min-h-screen px-4 py-5 ...">`.

```tsx
// Before
<div className="min-h-screen px-4 py-5 md:ml-[180px] md:px-6 max-w-full">
  <TopNav />
  <div className="mt-2">{children}</div>
</div>

// After
<main className="min-h-screen px-4 py-5 md:ml-[180px] md:px-6 max-w-full">
  <TopNav />
  <div className="mt-2">{children}</div>
</main>
```

### `frontend/app/savings/page.tsx`

Top-level `<section>` becomes `<main>`. The inner sections keep their `<section>` tags.

```tsx
// Before
<section className="min-h-screen w-full bg-[#0b1f20]">

// After
<main className="min-h-screen w-full bg-[#0b1f20]">
```

### `frontend/app/goals/layout.tsx`

Wrap children in `<main>`:

```tsx
// Before
<div className="min-h-screen bg-[#061218]">{children}</div>

// After
<main className="min-h-screen bg-[#061218]">{children}</main>
```

### `frontend/app/components/SavingsProducts.tsx` — ProductCard

```tsx
// Before
<div className="bg-[#061a1a] border border-white/5 rounded-2xl p-8 ...">

// After
<article
  className="bg-[#061a1a] border border-white/5 rounded-2xl p-8 ..."
  aria-labelledby={`product-${title.replace(/\s+/g, '-').toLowerCase()}`}
>
  {/* h3 gets the matching id */}
  <h3 id={`product-${title.replace(/\s+/g, '-').toLowerCase()}`} ...>
```

### `frontend/app/savings/page.tsx` — Heading Hierarchy

Current structure has `<h1>` → `<h3>` (skips h2). Fix:

```
h1: "Goal-Based Savings"
  h2: "Featured Goal"        (was h3)
  h2: "Your Savings Goals"   (already h2 — keep)
  h2: "Smart Insights"       (was h3)
  h2: "Recent Contributions" (was h3)
```

### `frontend/app/savings/page.tsx` — Recent Contributions Table

Replace the `<div>` grid with a proper `<table>`:

```tsx
<table className="w-full" aria-label="Recent Contributions">
  <thead>
    <tr className="border-b border-white/10 text-[#6a8a93] text-xs font-bold uppercase tracking-widest">
      <th scope="col" className="px-6 py-3 text-left">Date</th>
      <th scope="col" className="px-6 py-3 text-left">Goal Name</th>
      <th scope="col" className="px-6 py-3 text-left">Type</th>
      <th scope="col" className="px-6 py-3 text-left">Amount</th>
      <th scope="col" className="px-6 py-3 text-right">Status</th>
    </tr>
  </thead>
  <tbody>
    {contributions.map((c, i) => (
      <tr key={i} className="border-b border-white/10 last:border-0 hover:bg-white/5 transition-colors">
        <td className="px-6 py-4 text-sm text-[#b1d7da]">{c.date}</td>
        <td className="px-6 py-4 text-sm text-white font-medium">{c.goalName}</td>
        <td className="px-6 py-4 text-sm text-[#6faab0]">{c.type}</td>
        <td className="px-6 py-4 text-sm text-emerald-300 font-semibold">{c.amount}</td>
        <td className="px-6 py-4 text-right">
          <span className={`inline-flex ... ${c.statusStyle}`}>{c.status}</span>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

### `frontend/app/savings/page.tsx` — Stat Cards

Replace `<p>` label+value pairs with `<dl>/<dt>/<dd>`:

```tsx
// Before
<div className="rounded-2xl border ...">
  <div className={stat.color}><stat.icon /></div>
  <p className="text-[#6a8a93] text-xs mt-3 mb-2">{stat.label}</p>
  <p className="text-white text-2xl font-semibold">{stat.value}</p>
</div>

// After
<div className="rounded-2xl border ...">
  <div className={stat.color} aria-hidden="true"><stat.icon /></div>
  <dl>
    <dt className="text-[#6a8a93] text-xs mt-3 mb-2">{stat.label}</dt>
    <dd className="text-white text-2xl font-semibold m-0">{stat.value}</dd>
  </dl>
</div>
```

## Correctness Properties

### Property 1: Exactly one `<main>` per page

For any rendered page, the DOM should contain exactly one `<main>` element.

### Property 2: No skipped heading levels

For any page, the sequence of heading levels in document order should never skip a level (e.g. h1 → h3 without h2).

### Property 3: Table has `<thead>` with `scope="col"` headers

For any `<table>` in the codebase, every `<th>` in the header row should have `scope="col"`.

### Property 4: ProductCard `<article>` has accessible name

For any `<article>` rendered by `ProductCard`, the element should have an accessible name via `aria-labelledby` pointing to a valid `id` on its `<h3>`.
