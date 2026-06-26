/**
 * Network Configuration Constants and Types
 * 
 * This file defines the types and configurations for Stellar network support,
 * including visual styling, display properties, and utility functions.
 * 
 * Validates Requirements: 1.1, 1.3, 3.1, 3.2, 3.3, 3.4
 */

/**
 * Stellar network type union
 * Represents all supported Stellar network environments
 */
export type StellarNetwork = 'MAINNET' | 'TESTNET' | 'FUTURENET' | 'STANDALONE';

/**
 * Network configuration interface
 * Defines the structure for network-specific visual and display properties
 */
export interface NetworkConfig {
  /** The network identifier */
  name: StellarNetwork;
  
  /** Human-readable network name for display */
  displayName: string;
  
  /** Network-specific color scheme */
  colors: {
    /** Primary brand color for the network */
    primary: string;
    
    /** Secondary/darker shade for accents */
    secondary: string;
    
    /** Background color with transparency */
    background: string;
    
    /** Border color */
    border: string;
    
    /** Text color for labels */
    text: string;
  };
  
  /** Icon identifier for the network (e.g., 'Shield', 'AlertTriangle') */
  icon: string;
  
  /** Whether to display warning indicators for this network */
  showWarning: boolean;
}

/**
 * Network configurations for all supported Stellar networks
 * Maps each network type to its visual and display configuration
 */
export const NETWORK_CONFIGS: Record<StellarNetwork, NetworkConfig> = {
  MAINNET: {
    name: 'MAINNET',
    displayName: 'Mainnet',
    colors: {
      primary: '#08c1c1',
      secondary: '#0d4f4f',
      background: 'rgba(8, 193, 193, 0.1)',
      border: '#08c1c1',
      text: '#5de0e0',
    },
    icon: 'Shield',
    showWarning: false,
  },
  TESTNET: {
    name: 'TESTNET',
    displayName: 'Testnet',
    colors: {
      primary: '#f59e0b',
      secondary: '#92400e',
      background: 'rgba(245, 158, 11, 0.1)',
      border: '#f59e0b',
      text: '#fbbf24',
    },
    icon: 'AlertTriangle',
    showWarning: true,
  },
  FUTURENET: {
    name: 'FUTURENET',
    displayName: 'Futurenet',
    colors: {
      primary: '#8b5cf6',
      secondary: '#5b21b6',
      background: 'rgba(139, 92, 246, 0.1)',
      border: '#8b5cf6',
      text: '#c4b5fd',
    },
    icon: 'Rocket',
    showWarning: true,
  },
  STANDALONE: {
    name: 'STANDALONE',
    displayName: 'Standalone',
    colors: {
      primary: '#6b7280',
      secondary: '#374151',
      background: 'rgba(107, 114, 128, 0.1)',
      border: '#6b7280',
      text: '#9ca3af',
    },
    icon: 'Server',
    showWarning: true,
  },
};

/**
 * Default configuration for unknown networks
 * Used as a fallback when an unrecognized network value is encountered
 */
const UNKNOWN_NETWORK_CONFIG: NetworkConfig = {
  name: 'MAINNET', // Default to mainnet for safety
  displayName: 'Unknown Network',
  colors: {
    primary: '#6b7280',
    secondary: '#374151',
    background: 'rgba(107, 114, 128, 0.1)',
    border: '#6b7280',
    text: '#9ca3af',
  },
  icon: 'HelpCircle',
  showWarning: true,
};

/**
 * Get network configuration for a given network string
 * 
 * @param network - The network identifier string (case-insensitive)
 * @returns NetworkConfig object for the specified network
 * 
 * @example
 * ```typescript
 * const config = getNetworkConfig('MAINNET');
 * console.log(config.displayName); // "Mainnet"
 * console.log(config.colors.primary); // "#08c1c1"
 * ```
 * 
 * @example
 * ```typescript
 * // Handles unknown networks gracefully
 * const config = getNetworkConfig('UNKNOWN');
 * console.log(config.displayName); // "Unknown Network"
 * console.log(config.showWarning); // true
 * ```
 */
export function getNetworkConfig(network: string): NetworkConfig {
  // Handle null, undefined, or empty string
  if (!network) {
    console.warn('getNetworkConfig called with empty network value');
    return UNKNOWN_NETWORK_CONFIG;
  }

  // Normalize to uppercase for case-insensitive matching
  let normalizedNetwork = network.toUpperCase();

  // Map 'PUBLIC' to 'MAINNET' (Freighter uses 'PUBLIC')
  if (normalizedNetwork === 'PUBLIC') {
    normalizedNetwork = 'MAINNET';
  }

  // Check if the network exists in our configurations
  if (normalizedNetwork in NETWORK_CONFIGS) {
    return NETWORK_CONFIGS[normalizedNetwork as StellarNetwork];
  }

  // Log warning for unknown network values
  console.warn(`Unknown network value: "${network}". Using default configuration.`);
  return UNKNOWN_NETWORK_CONFIG;
}


/**
 * Type guard to check if a string is a valid StellarNetwork
 * 
 * @param network - The network string to validate
 * @returns True if the network is a valid StellarNetwork type
 * 
 * @example
 * ```typescript
 * if (isValidNetwork('MAINNET')) {
 *   // TypeScript knows network is StellarNetwork here
 * }
 * ```
 */
export function isValidNetwork(network: string): network is StellarNetwork {
  return network.toUpperCase() in NETWORK_CONFIGS;
}
