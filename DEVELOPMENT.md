# Local Development Setup Guide

This guide walks you through setting up Nestera for local development. By the end, you'll have the frontend, backend, and smart contracts running on your machine.

---

## Prerequisites

Install the following tools before proceeding:

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | v18+ | [nodejs.org](https://nodejs.org/) |
| **pnpm** | v8+ | `npm install -g pnpm` |
| **Rust** | stable | [rustup.rs](https://rustup.rs/) |
| **Soroban CLI** | latest | `cargo install soroban-cli` (see below) |
| **Docker** | v24+ | [docker.com](https://docs.docker.com/get-docker/) |
| **Git** | v2+ | [git-scm.com](https://git-scm.com/) |

### Installing Soroban CLI

```bash
# Install via cargo (requires Rust stable)
cargo install --locked soroban-cli

# Verify installation
soroban --version

# Add the Stellar testnet network
soroban network add \
  --global testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015"
```

### Creating a Stellar Testnet Account

You'll need a funded testnet account for deploying and interacting with contracts:

```bash
# Generate a new key pair
soroban keys generate --global --network testnet my-key

# Fund it via the Friendbot (testnet faucet)
curl "https://friendbot.stellar.org?addr=$(soroban keys address my-key)"
```

---

## 1. Clone the Repository

```bash
# Shallow clone (faster, recommended for contributors)
git clone --depth 1 https://github.com/Devsol-01/Nestera.git
cd Nestera

# Or full clone (if you need full git history)
git clone https://github.com/Devsol-01/Nestera.git
cd Nestera
```

---

## 2. Smart Contracts (Soroban / Rust)

The contracts live in `contracts/` and are written in Rust using the Soroban SDK.

### Build

```bash
cd contracts

# Build all contracts
cargo build --target wasm32-unknown-unknown --release

# Or build with the Soroban CLI
soroban contract build
```

### Run Tests

```bash
cd contracts
cargo test
```

### Deploy to Testnet

```bash
cd contracts

# Deploy a contract (replace with actual contract .wasm path)
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/nestera.wasm \
  --source-account my-key \
  --network testnet
```

> **Note:** Save the contract ID returned after deployment — you'll need it for the backend and frontend configuration.

---

## 3. Backend (NestJS)

The backend is a NestJS API in `backend/`.

### Environment Setup

```bash
cd backend

# Copy the example env file
cp .env.example .env

# Edit .env with your local settings
# At minimum, configure:
#   DATABASE_URL=postgresql://nestera:nestera@localhost:5432/nestera
#   SOROBAN_RPC_URL=https://soroban-testnet.stellar.org:443
#   CONTRACT_ID=<your-deployed-contract-id>
```

### Start Database (Docker)

```bash
cd backend

# Start PostgreSQL and other services via Docker Compose
docker compose up -d postgres

# Verify it's running
docker compose ps
```

This starts a PostgreSQL 15 instance on `localhost:5432` with:
- **User:** `nestera`
- **Password:** `nestera`
- **Database:** `nestera`

### Install Dependencies & Run

```bash
cd backend

# Install dependencies
pnpm install

# Run database migrations (if applicable)
pnpm run build

# Start in development mode (hot-reload)
pnpm run start:dev
```

The API will be available at `http://localhost:3000` (default NestJS port).

### Run Tests

```bash
cd backend

# Unit tests
pnpm run test

# Watch mode
pnpm run test:watch

# Coverage report
pnpm run test:cov

# E2E tests
pnpm run test:e2e
```

---

## 4. Frontend (Next.js)

The frontend is a Next.js app in `frontend/`.

### Install Dependencies & Run

```bash
cd frontend

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

The frontend will be available at `http://localhost:3000`.

### Useful Commands

```bash
# Type checking
pnpm run type-check

# Linting
pnpm run lint

# Fix lint issues
pnpm run lint:fix

# Production build
pnpm run build
```

---

## 5. Running Everything Together

Open three terminal tabs:

```bash
# Tab 1: Database
cd backend && docker compose up -d postgres

# Tab 2: Backend API
cd backend && pnpm run start:dev

# Tab 3: Frontend
cd frontend && pnpm run dev
```

Or use Docker Compose to run the full stack:

```bash
cd backend
docker compose up -d
```

---

## Troubleshooting

### Soroban CLI: `wasm32-unknown-unknown` target not found

```bash
rustup target add wasm32-unknown-unknown
```

### PostgreSQL connection refused

Make sure Docker is running and the container is up:

```bash
docker compose ps
docker compose logs postgres
```

### Port already in use

If port 3000 or 5432 is occupied, either stop the conflicting service or update the port in:
- Backend: `backend/.env` (DATABASE_URL port)
- Frontend: `frontend/next.config.ts` (if custom port configured)

### Frontend build errors after pulling latest changes

```bash
cd frontend
rm -rf node_modules .next
pnpm install
pnpm run dev
```

### Contract deployment fails with "insufficient balance"

Fund your testnet account:

```bash
curl "https://friendbot.stellar.org?addr=$(soroban keys address my-key)"
```

---

## Project Structure Reference

```
Nestera/
├── frontend/          # Next.js frontend (React, TailwindCSS)
│   ├── app/           # App router pages
│   ├── public/        # Static assets
│   └── package.json
├── backend/           # NestJS API server
│   ├── src/           # Source code
│   ├── docker-compose.yml
│   └── package.json
├── contracts/         # Soroban smart contracts (Rust)
│   ├── src/           # Contract source
│   ├── tests/         # Contract tests
│   └── Cargo.toml
├── scripts/           # Deployment & automation scripts
├── tests/             # Integration & E2E tests
└── DEVELOPMENT.md     # ← You are here
```

---

## Need Help?

- Check the [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines
- Open an [issue](https://github.com/Devsol-01/Nestera/issues) if you hit a bug
- Read the [contracts documentation](contracts/README.md) for smart contract details
