#!/bin/bash

# Nestera Frontend Cleanup Script
# Removes unnecessary features and dependencies for MVP

set -e

FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/frontend"

echo "🧹 Nestera Frontend Cleanup Script"
echo "===================================="
echo ""
echo "This will remove:"
echo "  - Storybook"
echo "  - PWA features"
echo "  - Analytics/Monitoring"
echo "  - Advanced dashboard features"
echo "  - Unused pages and components"
echo ""
echo "Frontend directory: $FRONTEND_DIR"
echo ""

read -p "Continue with cleanup? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 1
fi

cd "$FRONTEND_DIR"

echo ""
echo "📦 Phase 1: Removing Storybook..."
rm -rf .storybook/
rm -rf stories/
rm -rf storybook-static/
rm -f STORYBOOK.md
echo "✅ Storybook removed"

echo ""
echo "📱 Phase 2: Removing PWA features..."
rm -rf public/icons/
rm -rf public/splash/
rm -f public/manifest.json
rm -f public/sw.js
rm -f public/offline.html
rm -rf scripts/
echo "✅ PWA features removed"

echo ""
echo "📊 Phase 3: Removing Analytics & Monitoring..."
rm -f app/components/AnalyticsProvider.tsx
rm -f app/components/MonitoringProvider.tsx
rm -f app/lib/analytics.ts
rm -f app/lib/monitoring.ts
rm -f ANALYTICS.md
rm -f performance-budget.json
echo "✅ Analytics & Monitoring removed"

echo ""
echo "🔍 Phase 4: Removing SEO overkill..."
rm -f app/components/StructuredData.tsx
rm -rf app/og/
rm -f app/sitemap.ts
rm -f public/robots.txt
rm -f SEO_IMPLEMENTATION.md
rm -f SEO_QUICK_REFERENCE.md
rm -f SEO_VERIFICATION_TESTING.md
echo "✅ SEO features simplified"

echo ""
echo "🗑️  Phase 5: Removing unused pages..."
rm -rf app/community/
rm -rf app/docs/
rm -rf app/features/
rm -rf app/proposals/
rm -rf app/search-demo/
rm -rf app/privacy/
rm -rf app/terms/
rm -rf app/support/
echo "✅ Unused pages removed"

echo ""
echo "📊 Phase 6: Removing advanced dashboard features..."
rm -rf app/dashboard/webhooks/
rm -rf app/dashboard/contract-monitor/
rm -rf app/dashboard/staking/
rm -rf app/dashboard/analytics/
rm -rf app/dashboard/portfolio/
rm -rf app/dashboard/governance/
rm -rf app/dashboard/referrals/
rm -rf app/dashboard/savings-pools/
echo "✅ Advanced dashboard features removed"

echo ""
echo "🎨 Phase 7: Removing unnecessary components..."
rm -f app/components/FeatureFlagAdmin.tsx
rm -f app/components/KeyboardShortcutsModal.tsx
rm -f app/components/WalletReconnectBanner.tsx
rm -f app/components/ServiceWorkerRegistration.tsx
rm -f app/components/InstallPrompt.tsx
rm -f components/SearchFilter.tsx
echo "✅ Unnecessary components removed"

echo ""
echo "🪝 Phase 8: Removing advanced hooks..."
rm -f app/hooks/useCountUp.ts
rm -f app/hooks/useDebounce.ts
rm -f app/hooks/useExport.ts
rm -f app/hooks/useFeatureFlag.ts
rm -f app/hooks/useFocusTrap.ts
rm -f app/hooks/useKeyboardShortcuts.ts
rm -f app/hooks/usePrices.ts
rm -f app/hooks/useUndoRedo.ts
rm -f app/hooks/useWalletCache.ts
rm -f app/hooks/useWalletWebSocket.ts
rm -f app/hooks/useWebSocket.ts
echo "✅ Advanced hooks removed"

echo ""
echo "🔌 Phase 9: Removing unnecessary contexts..."
rm -f app/context/FeatureFlagContext.tsx
rm -f app/providers/KeyboardShortcutsProvider.tsx
echo "✅ Unnecessary contexts removed"

echo ""
echo "📚 Phase 10: Removing unnecessary lib files..."
rm -f app/lib/feature-flags.ts
rm -f app/lib/flags.config.ts
rm -f app/lib/formResolver.ts
echo "✅ Unnecessary lib files removed"

echo ""
echo "🗂️  Phase 11: Removing build artifacts and logs..."
rm -rf .next/
rm -f .codex-next-dev.err.log
rm -f .codex-next-dev.log
rm -f debug-storybook.log
rm -f tsconfig.tsbuildinfo
echo "✅ Build artifacts removed"

echo ""
echo "📝 Phase 12: Removing test configuration..."
rm -f vitest.config.ts
rm -f vitest.shims.d.ts
echo "✅ Test configuration removed"

echo ""
echo "🧹 Phase 13: Cleaning up empty directories..."
find app -type d -empty -delete 2>/dev/null || true
find components -type d -empty -delete 2>/dev/null || true
echo "✅ Empty directories removed"

echo ""
echo "✨ Cleanup complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Update package.json to remove unnecessary dependencies"
echo "  2. Run: cd frontend && pnpm install"
echo "  3. Update app/layout.tsx to remove PWA/Analytics imports"
echo "  4. Test: pnpm dev"
echo "  5. Build: pnpm build"
echo ""
echo "🎯 Your frontend is now lean and focused on the MVP!"
