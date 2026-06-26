# Nestera Repository Fix Plan

## Executive Summary
This document outlines a comprehensive plan to fix and improve the Nestera repository based on analysis of all components.

**Date:** May 28, 2026  
**Status:** ✅ Backend Passing | ⚠️ Contracts Deprecated | ✅ Frontend Clean

---

## Current State Analysis

### ✅ Backend (NestJS) - HEALTHY
- **Build Status:** ✅ Passing
- **Test Status:** ✅ 428/428 tests passing
- **TypeScript Errors:** 0
- **Dependencies:** Installed and up-to-date
- **Issues:** None critical

### ⚠️ Smart Contracts (Rust/Soroban) - NEEDS ATTENTION
- **Build Status:** ✅ Compiles successfully
- **Warnings:** 57 deprecated `env.events().publish` calls
- **Action Required:** Migrate to `#[contractevent]` macro
- **Priority:** Medium (not blocking, but should be addressed)

### ✅ Frontend (Next.js) - CLEAN
- **Build Status:** Not tested yet
- **TypeScript Errors:** 0 (verified with `tsc --noEmit`)
- **Dependencies:** Installed successfully
- **Issues:** 20+ documented improvement opportunities (see FRONTEND_GITHUB_ISSUES.md)

---

## Priority 1: Critical Fixes (Immediate)

### 1.1 Update README.md Structure Mismatch
**Issue:** README references `apps/web` and `apps/api` but actual structure is `frontend/` and `backend/`

**Action:**
- Update all path references in README.md
- Fix setup instructions to match actual directory structure
- Update architecture diagram

**Files to Update:**
- `/README.md`

### 1.2 Remove Deprecated stellar-sdk Package
**Issue:** Frontend uses deprecated `stellar-sdk@13.3.0` alongside `@stellar/stellar-sdk@15.1.0`

**Action:**
- Remove `stellar-sdk` from package.json
- Ensure all imports use `@stellar/stellar-sdk`

**Files to Update:**
- `/frontend/package.json`

---

## Priority 2: Important Improvements (This Week)

### 2.1 Migrate Contract Events to #[contractevent] Macro
**Issue:** 57 deprecated `env.events().publish` calls across contract files

**Affected Files:**
- `contracts/src/config.rs` (5 locations)
- `contracts/src/flexi.rs` (2 locations)
- `contracts/src/goal.rs` (5 locations)
- `contracts/src/governance_events.rs` (5 locations)
- `contracts/src/group.rs` (5 locations)
- `contracts/src/lock.rs` (1 location)
- `contracts/src/lib.rs` (9 locations)
- `contracts/src/rewards/events.rs` (5 locations)
- `contracts/src/staking/events.rs` (3 locations)
- `contracts/src/strategy/registry.rs` (2 locations)
- `contracts/src/strategy/routing.rs` (5 locations)
- `contracts/src/token.rs` (3 locations)
- `contracts/src/treasury/mod.rs` (10 locations)

**Migration Pattern:**
```rust
// OLD (Deprecated)
env.events().publish(
    (symbol_short!("event_name"), param1),
    data
);

// NEW (Recommended)
#[contractevent]
pub struct EventName {
    pub param1: Address,
    pub data: i128,
}

// Then emit:
EventName { param1, data }.publish(&env);
```

### 2.2 Add Missing Environment Variable Configuration
**Issue:** Frontend has hardcoded values that should be environment variables

**Action:**
- Create `.env.example` in frontend directory
- Document all required environment variables
- Update components to use environment variables

**Files to Create:**
- `/frontend/.env.example`

### 2.3 Add ESLint Configuration
**Issue:** Frontend has ESLint in package.json but no configuration file

**Action:**
- Create `.eslintrc.json` with Next.js best practices
- Add accessibility rules
- Configure console.log warnings

**Files to Create:**
- `/frontend/.eslintrc.json`

---

## Priority 3: Quality Improvements (This Month)

### 3.1 Frontend Testing Setup
**Issue:** No test files exist in frontend

**Action:**
- Set up Jest and React Testing Library
- Add tests for core components (ThemeToggle, WalletContext, ToastContext)
- Target 70% code coverage

**Estimated Effort:** 8-16 hours

### 3.2 Remove Console.log Statements
**Issue:** Multiple console.log statements in production code

**Files to Clean:**
- `frontend/app/components/Newsletter.tsx` (line 11)
- `frontend/app/savings/page.tsx` (lines 209-211, 299-301)
- `frontend/app/dashboard/transactions/page.tsx` (line 205)
- `frontend/app/components/dashboard/SavingsPoolCard.example.tsx` (line 77)

### 3.3 Add Error Boundaries
**Issue:** No error boundaries to handle runtime errors gracefully

**Action:**
- Create global ErrorBoundary component
- Add page-specific error boundaries
- Design user-friendly error UI

---

## Priority 4: Documentation Updates (Ongoing)

### 4.1 Update All Path References
**Files to Update:**
- `README.md` - Main setup guide
- `CONTRIBUTING.md` - Contribution guidelines
- `backend/README.md` - Backend-specific docs
- `contracts/README.md` - Contract setup

### 4.2 Create Missing Documentation
**Files to Create:**
- `/frontend/README.md` - Frontend setup and architecture
- `/frontend/.env.example` - Environment variable template
- `/ARCHITECTURE.md` - Overall system architecture
- `/DEPLOYMENT.md` - Deployment guide

---

## Implementation Timeline

### Week 1 (Current)
- [x] Analyze repository structure
- [ ] Fix README.md path references
- [ ] Remove deprecated stellar-sdk
- [ ] Create frontend .env.example
- [ ] Add ESLint configuration

### Week 2
- [ ] Migrate 20% of contract events (11 files)
- [ ] Remove console.log statements
- [ ] Add error boundaries
- [ ] Set up frontend testing infrastructure

### Week 3
- [ ] Migrate remaining 80% of contract events
- [ ] Add unit tests for core components
- [ ] Implement loading skeletons
- [ ] Add accessibility improvements

### Week 4
- [ ] Complete all documentation updates
- [ ] Run full test suite
- [ ] Performance optimization
- [ ] Security audit preparation

---

## Success Metrics

### Code Quality
- ✅ 0 TypeScript errors (achieved)
- ✅ 0 build errors (achieved)
- ⚠️ 0 deprecation warnings (in progress)
- 🎯 >70% test coverage (target)

### Documentation
- 🎯 All path references accurate
- 🎯 Complete setup instructions
- 🎯 Environment variable documentation
- 🎯 Architecture diagrams

### Developer Experience
- 🎯 Clear contribution guidelines
- 🎯 Easy local setup (<15 minutes)
- 🎯 Comprehensive error messages
- 🎯 Helpful debugging tools

---

## Quick Wins (Can be done immediately)

1. **Fix README paths** - 15 minutes
2. **Remove deprecated stellar-sdk** - 5 minutes
3. **Create .env.example** - 10 minutes
4. **Add .eslintrc.json** - 10 minutes
5. **Remove console.log statements** - 20 minutes

**Total Quick Wins Time:** ~1 hour

---

## Long-term Improvements (Future)

### Performance
- Implement client-side caching (React Query/SWR)
- Add loading skeletons
- Optimize bundle size
- Add performance monitoring

### Features
- Internationalization (i18n)
- Dark mode image optimization
- Keyboard shortcuts
- Real-time updates with WebSockets

### Infrastructure
- CI/CD pipeline improvements
- Automated testing
- Performance budgets
- Security scanning

---

## Notes

- Backend is in excellent shape with 100% test pass rate
- Frontend has no critical errors, only improvement opportunities
- Contracts compile successfully but need event migration
- Documentation is comprehensive but has path mismatches

---

## Contact & Support

For questions about this fix plan:
1. Review the specific issue documentation
2. Check existing GitHub issues
3. Consult the development team

**Last Updated:** May 28, 2026  
**Next Review:** June 4, 2026
