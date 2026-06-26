# Frontend Cleanup Plan

## 🎯 Goal
Remove unnecessary code, features, and dependencies while keeping only the essential MVP functionality for Nestera.

## ✅ What to KEEP (Essential MVP)

### Core Pages
- ✅ Landing Page (`app/page.tsx`, `app/LandingPage/`)
- ✅ Dashboard core (`app/dashboard/page.tsx` - simplified)
- ✅ Savings page (`app/savings/page.tsx`)
- ✅ Basic layout and navigation

### Essential Components
- ✅ Navbar
- ✅ Footer
- ✅ Hero
- ✅ HowItWorks
- ✅ WhyTrust
- ✅ SavingsProducts
- ✅ FAQ
- ✅ Newsletter
- ✅ Basic UI components (buttons, forms, loading states)
- ✅ ThemeToggle
- ✅ ErrorBoundary

### Core Functionality
- ✅ Basic wallet connection (WalletContext)
- ✅ Theme switching (ThemeContext)
- ✅ Basic toast notifications (ToastContext)
- ✅ Internationalization (i18n with en/es)
- ✅ Basic form handling

### Dependencies to Keep
- next, react, react-dom
- tailwindcss, clsx
- lucide-react (icons)
- react-hook-form, zod
- next-intl

---

## ❌ What to REMOVE (Unnecessary/Overkill)

### 1. Complete Feature Removals

#### Storybook (Development Tool - Not Needed)
- ❌ `.storybook/` folder
- ❌ `stories/` folder
- ❌ `storybook-static/` folder
- ❌ All storybook dependencies
- ❌ Storybook scripts from package.json

#### PWA Features (Premature Optimization)
- ❌ `public/manifest.json`
- ❌ `public/sw.js` (service worker)
- ❌ `public/offline.html`
- ❌ `public/icons/` (PWA icons)
- ❌ `public/splash/` (splash screens)
- ❌ `scripts/generate-pwa-assets.js`
- ❌ `components/ServiceWorkerRegistration.tsx`
- ❌ `components/InstallPrompt.tsx`
- ❌ All PWA meta tags from layout

#### Analytics & Monitoring (Premature)
- ❌ `components/AnalyticsProvider.tsx`
- ❌ `components/MonitoringProvider.tsx`
- ❌ `lib/analytics.ts`
- ❌ `lib/monitoring.ts`
- ❌ `ANALYTICS.md`
- ❌ `performance-budget.json`

#### SEO Overkill
- ❌ `components/StructuredData.tsx`
- ❌ Most of `lib/seo.ts` (keep basic metadata only)
- ❌ `SEO_IMPLEMENTATION.md`
- ❌ `SEO_QUICK_REFERENCE.md`
- ❌ `SEO_VERIFICATION_TESTING.md`
- ❌ `app/sitemap.ts`
- ❌ `app/og/` (Open Graph image generation)
- ❌ `public/robots.txt`

#### Advanced Features Not Needed Yet
- ❌ `app/dashboard/webhooks/` - Webhooks management
- ❌ `app/dashboard/contract-monitor/` - Contract monitoring
- ❌ `app/dashboard/staking/` - Staking
- ❌ `app/dashboard/analytics/` - Advanced analytics
- ❌ `app/proposals/` - Governance proposals
- ❌ `app/community/` - Community features
- ❌ `app/docs/` - Documentation section
- ❌ `app/features/` - Features showcase
- ❌ `app/search-demo/` - Search demo

#### Dashboard Modules to Remove
- ❌ `dashboard/portfolio/` - Portfolio tracking
- ❌ `dashboard/governance/` - Governance
- ❌ `dashboard/referrals/` - Referral system
- ❌ `dashboard/savings-pools/` - Advanced pools
- ❌ `dashboard/webhooks/` - Webhook config
- ❌ `dashboard/contract-monitor/` - Contract monitoring
- ❌ `dashboard/staking/` - Staking interface

#### Unnecessary Components
- ❌ `components/FeatureFlagAdmin.tsx` - Feature flags admin
- ❌ `components/KeyboardShortcutsModal.tsx` - Keyboard shortcuts
- ❌ `components/WalletReconnectBanner.tsx` - Advanced wallet features
- ❌ `components/dashboard/` - Advanced dashboard components (keep only basic)
- ❌ `SearchFilter.tsx` - Search functionality

#### Advanced Hooks
- ❌ `hooks/useCountUp.ts` - Animation hook
- ❌ `hooks/useDebounce.ts` - Can be simple inline
- ❌ `hooks/useExport.ts` - Export functionality
- ❌ `hooks/useFeatureFlag.ts` - Feature flags
- ❌ `hooks/useFocusTrap.ts` - Advanced a11y
- ❌ `hooks/useKeyboardShortcuts.ts` - Keyboard shortcuts
- ❌ `hooks/usePrices.ts` - Price tracking
- ❌ `hooks/useUndoRedo.ts` - Undo/redo functionality
- ❌ `hooks/useWalletCache.ts` - Advanced wallet caching
- ❌ `hooks/useWalletWebSocket.ts` - WebSocket wallet
- ❌ `hooks/useWebSocket.ts` - WebSocket

#### Context Providers to Remove
- ❌ `context/FeatureFlagContext.tsx` - Feature flags
- ❌ `providers/KeyboardShortcutsProvider.tsx` - Keyboard shortcuts

#### Library Files to Remove
- ❌ `lib/feature-flags.ts` - Feature flag system
- ❌ `lib/flags.config.ts` - Flag configuration
- ❌ `lib/formResolver.ts` - Can use simpler approach

#### Static Pages to Remove
- ❌ `app/privacy/` - Privacy policy (add later)
- ❌ `app/terms/` - Terms of service (add later)
- ❌ `app/support/` - Support page (add later)

### 2. Dependencies to Remove

```json
// Remove from devDependencies:
"storybook": "^10.4.1",
"@storybook/nextjs-vite": "^10.4.1",
"@chromatic-com/storybook": "^5.2.1",
"@storybook/addon-vitest": "^10.4.1",
"@storybook/addon-a11y": "^10.4.1",
"@storybook/addon-docs": "^10.4.1",
"@storybook/addon-mcp": "^0.6.0",
"eslint-plugin-storybook": "^10.4.1",
"vitest": "^4.1.7",
"playwright": "^1.60.0",
"@vitest/browser-playwright": "^4.1.7",
"@vitest/coverage-v8": "^4.1.7",
"vite": "^8.0.14"

// Potentially remove (if not used):
"recharts": "^3.8.1" // Only if dashboard doesn't need charts
```

### 3. Configuration Files to Clean

- ❌ `.storybook/main.ts`
- ❌ `.storybook/preview.tsx`
- ❌ `vitest.config.ts`
- ❌ `vitest.shims.d.ts`
- ❌ `performance-budget.json`
- ❌ `STORYBOOK.md`

### 4. Build Artifacts to Remove
- ❌ `.next/` (regenerated on build)
- ❌ `storybook-static/`
- ❌ `.codex-next-dev.err.log`
- ❌ `.codex-next-dev.log`
- ❌ `debug-storybook.log`
- ❌ `tsconfig.tsbuildinfo`

---

## 📊 Cleanup Impact

### Before Cleanup
- ~50+ pages/routes
- ~100+ components
- ~30+ dependencies
- ~500+ MB node_modules

### After Cleanup (Estimated)
- ~10 essential pages
- ~30 core components
- ~15 dependencies
- ~200 MB node_modules

### Benefits
- ✅ 60% faster installation
- ✅ 50% faster builds
- ✅ Easier to understand codebase
- ✅ Reduced maintenance burden
- ✅ Focus on core features
- ✅ Better performance

---

## 🚀 Execution Plan

### Phase 1: Remove Development Tools
1. Remove Storybook
2. Remove Vitest/Playwright
3. Remove analytics/monitoring

### Phase 2: Remove Advanced Features
1. Remove PWA setup
2. Remove SEO overkill
3. Remove advanced dashboard features

### Phase 3: Remove Unused Pages
1. Remove documentation pages
2. Remove community features
3. Remove demos

### Phase 4: Simplify Core
1. Clean up providers
2. Remove unused hooks
3. Simplify contexts

### Phase 5: Clean Dependencies
1. Update package.json
2. Run pnpm install
3. Test build

### Phase 6: Verify & Test
1. Test landing page
2. Test basic dashboard
3. Test wallet connection
4. Build production

---

## 🎯 Final MVP Structure

```
frontend/
├── app/
│   ├── components/          # Essential UI components
│   │   ├── ui/             # Button, Input, Card, etc.
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── Hero.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── WhyTrust.tsx
│   │   ├── SavingsProducts.tsx
│   │   ├── FAQ.tsx
│   │   └── Newsletter.tsx
│   ├── context/            # Essential contexts only
│   │   ├── WalletContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── ToastContext.tsx
│   ├── dashboard/          # Simplified dashboard
│   │   ├── page.tsx
│   │   ├── settings/
│   │   ├── transactions/
│   │   └── notifications/
│   ├── savings/            # Core savings features
│   │   ├── page.tsx
│   │   └── create-goal/
│   ├── i18n/               # Internationalization
│   ├── lib/                # Utilities
│   │   ├── api-client.ts
│   │   ├── utils.ts
│   │   └── env.ts
│   ├── locales/            # Translations
│   ├── globals.css
│   ├── layout.tsx          # Simplified layout
│   └── page.tsx            # Landing page
├── public/
│   ├── hero.png
│   ├── mockup.png
│   └── file.svg
├── package.json            # Minimal dependencies
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## ⚠️ Notes

- Keep `.gitignore` intact
- Backup before running cleanup
- Test thoroughly after cleanup
- Can always add features back later when needed
- Focus: Working MVP > Feature-complete product

---

**Ready to execute? Run the cleanup script!**
