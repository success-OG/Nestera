# Nestera Frontend

Next.js frontend for Nestera's decentralized savings experience.

## Development

This project uses `pnpm`.

```bash
pnpm dev
pnpm build
```

## Internationalization

Localized URLs are supported with `/en` and `/es` prefixes. Middleware keeps the visible locale prefix and rewrites to the existing app routes internally.

Translation files live in:

- `app/locales/en.json`
- `app/locales/es.json`

To add a language:

1. Add the locale code to `app/i18n.ts`.
2. Add the locale to `middleware.ts`.
3. Create `app/locales/<locale>.json` with the same keys as `en.json`.
4. Add SEO metadata in the new file's `metadata` section.
5. Add the language to the navbar language switcher.

RTL is handled through the root layout `dir` attribute for Arabic, Hebrew, Persian, and Urdu locale codes.

## Forms

Forms use React Hook Form with Zod schemas through `app/lib/formResolver.ts`. Validation runs in real time and fields expose `aria-invalid`, `aria-describedby`, and alert/status regions for screen readers.

Covered forms include newsletter signup, support contact, goal creation, and dashboard notification settings.

## Storybook

Run Storybook locally:

```bash
pnpm storybook
```

Build static Storybook:

```bash
pnpm build-storybook
```

Storybook is configured with Next.js/Vite, docs, accessibility checks, and a `next-intl` decorator. See `STORYBOOK.md` for details.

## Component Library

Nestera uses a custom-built, accessible component library. All components are documented using JSDoc.

Key components:
- `Button`: Multiple variants, sizes, and loading states.
- `LoadingState` & `Skeleton`: Comprehensive loading indicators and skeleton screens.
- `ThemeToggle`: Accessible theme switching (Light/Dark/System).
- `ThemedImage`: Responsive images that adapt to the active theme.

For detailed documentation, visit the **/docs** section in the application or view the source code for JSDoc references.

## Analytics

Core Web Vitals and custom product events are reported from `app/components/AnalyticsProvider.tsx` and `app/lib/analytics.ts`.

Optional environment variables:

- `NEXT_PUBLIC_GA_ID`
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`

The performance budget is documented in `performance-budget.json`. See `ANALYTICS.md` for tracked events and privacy notes.
