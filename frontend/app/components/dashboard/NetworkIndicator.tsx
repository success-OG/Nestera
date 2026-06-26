"use client";

import React, { useState, useCallback } from "react";
import NetworkBadge from "./NetworkBadge";
import NetworkSwitchModal from "./NetworkSwitchModal";
import { type StellarNetwork } from "../../constants/networks";

/**
 * NetworkIndicator Component
 * 
 * Container component that manages the network display and modal interactions.
 * Integrates NetworkBadge and NetworkSwitchModal to provide a complete
 * network awareness and switching experience.
 * 
 * Validates Requirements: 1.1, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.3
 * 
 * @component
 */

/**
 * Props interface for NetworkIndicator component
 */
export interface NetworkIndicatorProps {
  /** The current Stellar network from WalletContext */
  network: string | null;
  
  /** Whether the wallet is currently connected */
  isConnected: boolean;
}

/**
 * Error Boundary Component
 * Prevents NetworkIndicator errors from crashing the TopNav
 */
class NetworkIndicatorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('NetworkIndicator error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fail silently to prevent TopNav crashes
      return null;
    }
    return this.props.children;
  }
}

/**
 * NetworkIndicator Component
 * 
 * Manages the display of the current network and provides access to
 * network switching instructions through a modal interface.
 * 
 * Features:
 * - Displays NetworkBadge when wallet is connected
 * - Shows/hides NetworkSwitchModal on badge click
 * - Handles null/undefined network values gracefully
 * - Wrapped in error boundary to prevent TopNav crashes
 * 
 * @example
 * ```tsx
 * <NetworkIndicator 
 *   network={network} 
 *   isConnected={isConnected} 
 * />
 * ```
 */
const NetworkIndicatorContent: React.FC<NetworkIndicatorProps> = ({
  network,
  isConnected,
}) => {
  // State for modal visibility
  const [showModal, setShowModal] = useState(false);

  // Handle badge click to open modal
  const handleBadgeClick = useCallback(() => {
    setShowModal(true);
  }, []);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setShowModal(false);
  }, []);

  // Don't render if wallet is not connected
  if (!isConnected) {
    return null;
  }

  // Don't render if network is null or undefined
  if (!network) {
    return null;
  }

  return (
    <>
      {/* Network Badge */}
      <NetworkBadge
        network={network as StellarNetwork}
        onClick={handleBadgeClick}
      />

      {/* Network Switch Modal */}
      <NetworkSwitchModal
        isOpen={showModal}
        currentNetwork={network}
        onClose={handleModalClose}
      />
    </>
  );
};

/**
 * NetworkIndicator with Error Boundary
 * 
 * Wraps the NetworkIndicator component in an error boundary to ensure
 * that any errors in the network indicator don't crash the TopNav.
 */
const NetworkIndicator: React.FC<NetworkIndicatorProps> = (props) => {
  return (
    <NetworkIndicatorErrorBoundary>
      <NetworkIndicatorContent {...props} />
    </NetworkIndicatorErrorBoundary>
  );
};

export default NetworkIndicator;
