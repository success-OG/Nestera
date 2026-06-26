# Constants Directory

This directory contains application-wide constants and configuration values.

## Files

### `networks.ts`

Network configuration constants and types for Stellar network support.

**Exports:**
- `StellarNetwork` - Type union for supported networks ('MAINNET' | 'TESTNET' | 'FUTURENET' | 'STANDALONE')
- `NetworkConfig` - Interface defining network configuration structure
- `NETWORK_CONFIGS` - Record mapping each network to its configuration
- `getNetworkConfig(network: string)` - Utility function to retrieve network config (case-insensitive)
- `isValidNetwork(network: string)` - Type guard to validate network strings

**Usage Example:**
```typescript
import { getNetworkConfig, StellarNetwork } from '@/constants/networks';

const network: StellarNetwork = 'MAINNET';
const config = getNetworkConfig(network);

console.log(config.displayName); // "Mainnet"
console.log(config.colors.primary); // "#08c1c1"
console.log(config.showWarning); // false
```

**Features:**
- Case-insensitive network matching
- Graceful handling of unknown network values
- Type-safe network configurations
- Comprehensive color schemes for each network
- Icon identifiers for visual representation
- Warning flags for non-production networks
