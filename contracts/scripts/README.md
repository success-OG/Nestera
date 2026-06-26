# Contract Ops - Scripts

Small operational guide for the contract scripts in this repository.

Prerequisites
- `bash`, `sha256sum`, and `cargo` in PATH (for builds).

Common commands
- Generate combined docs bundle:
  `bash contracts/scripts/generate-docs.sh`
- Flatten sources (used for verification):
  `bash contracts/scripts/flatten-source.sh`
- Produce deployment manifest (build + record hashes):
  `NETWORK=testnet bash contracts/scripts/deploy.sh`
  Set `DEPLOY_COMMAND` to a command that performs on-chain deployment if desired.
- Verify a recorded deployment manifest against current sources:
  `NETWORK=testnet bash contracts/scripts/verify.sh`
- Check status and rollback helper scripts:
  `bash contracts/scripts/status.sh`
  `bash contracts/scripts/rollback.sh`

Environment notes
- `CONTRACT_ID` (optional): recorded in manifests when provided.
- `ARTIFACT_ROOT` and `DEPLOYMENT_ROOT` are configured in `common.sh` used by the scripts.

Security and verification
- `flatten-source.sh` creates a single, auditable source bundle used to verify source→WASM mappings.
- `verify.sh` compares the current flattened source hash to the deployment manifest to ensure source integrity.

If you want, I can run the full build + manifest generation on your behalf (requires wasm target/toolchain). 
