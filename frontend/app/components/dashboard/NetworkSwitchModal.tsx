"use client";

import React, { useRef } from "react";
import { X, ExternalLink, AlertTriangle, Shield } from "lucide-react";
import { Button } from '@/app/components/ui/Button';
import { getNetworkConfig } from "../../constants/networks";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useToast } from "../../context/ToastContext";

/**
 * NetworkSwitchModal Component
 * 
 * Displays instructions for switching networks in the Freighter wallet extension.
 * Provides step-by-step guidance and action buttons for users to change their network.
 * 
 * Validates Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 10.2, 10.4
 */

export interface NetworkSwitchModalProps {
  /** Whether the modal is currently open */
  isOpen: boolean;
  
  /** The current network the user is connected to */
  currentNetwork: string;
  
  /** Callback function to close the modal */
  onClose: () => void;
}

const NetworkSwitchModal: React.FC<NetworkSwitchModalProps> = ({
  isOpen,
  currentNetwork,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const toast = useToast();

  // Get network configuration for styling
  const networkConfig = getNetworkConfig(currentNetwork);

  useFocusTrap({
    isOpen,
    containerRef: modalRef,
    initialFocusRef: closeButtonRef,
    onEscape: onClose,
  });

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle opening Freighter extension
  const handleOpenFreighter = () => {
    // Attempt to open Freighter extension
    // Note: This may not work in all browsers/contexts
    window.postMessage({ type: "FREIGHTER_OPEN" }, "*");

    toast.info(
      "Freighter instruction",
      "If no window opens, click the Freighter browser extension icon manually.",
    );
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="network-modal-title"
      aria-describedby="network-modal-description"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-[#0e2330] border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl"
        style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: networkConfig.colors.background,
                border: `1px solid ${networkConfig.colors.border}`,
              }}
            >
              {networkConfig.showWarning ? (
                <AlertTriangle
                  size={18}
                  style={{ color: networkConfig.colors.primary }}
                />
              ) : (
                <Shield
                  size={18}
                  style={{ color: networkConfig.colors.primary }}
                />
              )}
            </div>
            <div>
              <h2
                id="network-modal-title"
                className="text-white font-semibold text-lg m-0"
              >
                Switch Network
              </h2>
              <p className="text-slate-400 text-xs m-0 mt-0.5">
                Currently on{" "}
                <span
                  className="font-semibold"
                  style={{ color: networkConfig.colors.text }}
                >
                  {networkConfig.displayName}
                </span>
              </p>
            </div>
          </div>
          <Button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close modal"
            variant="ghost"
            size="sm"
            className="flex items-center justify-center text-slate-400 hover:text-white transition-colors bg-white/5 border border-white/10 rounded-lg"
            style={{ width: 32, height: 32 }}
          >
            <X size={16} />
          </Button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <p
            id="network-modal-description"
            className="text-slate-300 text-sm mb-5"
          >
            To switch between Stellar networks, you need to change the network
            setting in your Freighter wallet extension.
          </p>

          {/* Step-by-step instructions */}
          <div className="space-y-4">
            <div className="flex gap-3">
              <div
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: "#08c1c1",
                  color: "#021515",
                }}
              >
                1
              </div>
              <div className="flex-1">
                <p className="text-slate-200 text-sm font-medium m-0">
                  Open Freighter Extension
                </p>
                <p className="text-slate-400 text-xs m-0 mt-1">
                  Click the Freighter extension icon in your browser toolbar
                  (usually in the top-right corner).
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: "#08c1c1",
                  color: "#021515",
                }}
              >
                2
              </div>
              <div className="flex-1">
                <p className="text-slate-200 text-sm font-medium m-0">
                  Find Network Dropdown
                </p>
                <p className="text-slate-400 text-xs m-0 mt-1">
                  Look for the network dropdown menu at the top of the
                  Freighter window. It will show your current network.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: "#08c1c1",
                  color: "#021515",
                }}
              >
                3
              </div>
              <div className="flex-1">
                <p className="text-slate-200 text-sm font-medium m-0">
                  Select Your Network
                </p>
                <p className="text-slate-400 text-xs m-0 mt-1">
                  Click the dropdown and choose your desired network (Mainnet,
                  Testnet, Futurenet, or Standalone).
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  backgroundColor: "#08c1c1",
                  color: "#021515",
                }}
              >
                4
              </div>
              <div className="flex-1">
                <p className="text-slate-200 text-sm font-medium m-0">
                  Confirm the Change
                </p>
                <p className="text-slate-400 text-xs m-0 mt-1">
                  The page will automatically detect the network change and
                  update the indicator within a few seconds.
                </p>
              </div>
            </div>
          </div>

          {/* Warning message for testnet */}
          {networkConfig.showWarning && (
            <div
              className="mt-5 p-3 rounded-lg border"
              style={{
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                borderColor: "#f59e0b",
              }}
            >
              <div className="flex gap-2">
                <AlertTriangle size={16} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
                <p className="text-[#fbbf24] text-xs m-0">
                  <strong>Warning:</strong> You are currently on{" "}
                  {networkConfig.displayName}. Transactions on this network do
                  not affect real assets.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer - Action Buttons */}
        <div className="flex gap-3 p-6 pt-4 border-t border-white/5">
          <Button
            variant="secondary"
            size="md"
            className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/10 transition-colors"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            style={{ backgroundColor: "#08c1c1", color: "#021515" }}
            onClick={handleOpenFreighter}
            leftIcon={<ExternalLink size={14} />}
          >
            Open Freighter
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NetworkSwitchModal;
