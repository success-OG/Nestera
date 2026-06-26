# Nestera Contract Fixes TODO

## Completed
- [x] Fix compile error: `effective_last_update` → `last_update` in `contracts/src/staking/storage.rs`
- [x] Remove unused import in `contracts/src/governance.rs`

## Pending
1. Migrate 57 deprecated `env.events().publish` calls to `#[contractevent]` macro across:
   - contracts/src/config.rs (5 locations)
   - contracts/src/flexi.rs (2)
   - contracts/src/goal.rs (5)
   - contracts/src/governance_events.rs (5)
   - contracts/src/group.rs (5)
   - contracts/src/lock.rs (1)
   - contracts/src/lib.rs (9)
   - contracts/src/rewards/events.rs (5)
   - contracts/src/staking/events.rs (3)
   - contracts/src/strategy/registry.rs (2)
   - contracts/src/strategy/routing.rs (5)
   - contracts/src/token.rs (3)
   - contracts/src/treasury/mod.rs (10)
2. Run `cargo test` after fixes
3. Update contract tests if events change
4. Verify invariants and storage TTLs
