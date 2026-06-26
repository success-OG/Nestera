# Contract Operations Guide

This guide defines the local workflow for building, documenting, deploying, and verifying the Soroban contracts in `contracts/`.

## Prerequisites

- Rust toolchain with the `wasm32-unknown-unknown` target installed.
- Soroban CLI available as `soroban`.
- A deployment environment with `NETWORK`, `CONTRACT_ID`, and account credentials set when executing real chain operations.

## Generated Documentation

Run the generated-docs script to assemble the current contract documentation bundle:

```bash
./scripts/generate-docs.sh
```

This writes a single generated reference to `docs/generated/contract-documentation.md` so reviewers can inspect the ABI, operational steps, and verification report from one place.

## Deployment Flow

The deployment script follows a narrow sequence:

1. Build the contract WASM artifact.
2. Flatten the source tree into a deterministic verification bundle.
3. Record a deployment manifest with hashes and metadata.
4. Optionally execute a chain deployment when the caller provides the required environment variables and CLI arguments.

Example:

```bash
NETWORK=testnet CONTRACT_ID=<CONTRACT_ID> ./scripts/deploy.sh
```

The script keeps the manifest under `target/nestera-contract-ops/deployments/` so later verification steps can compare the deployed artifact with the local tree.

## Verification Flow

The verification script performs two checks:

1. Recompute the current source hash.
2. Compare it against the latest deployment manifest.

If the hashes differ, the deployment is out of sync and should be redeployed from the current source.

Example:

```bash
NETWORK=testnet CONTRACT_ID=<CONTRACT_ID> ./scripts/verify.sh
```

## Status Check

The status script prints the most recent deployment manifest, including:

- network name
- contract ID
- source hash
- WASM hash
- source bundle location

Use it before posting release notes or explorer links.

## Rollback Flow

Rollback is implemented as a redeployment of a previous manifest or source bundle. The contract scripts do not mutate on-chain history; they prepare and document the previous known-good state so the operator can redeploy it cleanly.

Example:

```bash
ROLLBACK_MANIFEST=target/nestera-contract-ops/deployments/testnet/latest.json ./scripts/rollback.sh
```

## Block-Explorer Verification Notes

Explorer verification is a metadata problem for Soroban: the deployed WASM hash, source bundle, network, and contract ID must match. The flattening step provides a deterministic source artifact for explorer-side or auditor-side comparison.

## Suggested Release Checklist

1. Run the contract tests.
2. Generate the documentation bundle.
3. Build and deploy the WASM artifact.
4. Run the verification script against the manifest.
5. Record the explorer URL and manifest hash in the release notes.