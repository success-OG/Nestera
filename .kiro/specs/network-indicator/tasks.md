# Implementation Plan: Network Indicator for Stellar Networks

## Overview

This implementation plan breaks down the Network Indicator feature into discrete, sequential tasks. The feature adds visual network awareness to the TopNav component, displaying whether users are connected to Mainnet or Testnet with appropriate styling and warnings. The implementation follows a bottom-up approach: creating reusable components first, then integrating them into the existing TopNav, and finally adding network change detection and testing.

## Tasks

- [x] 1. Create network configuration constants and types
  - Create `frontend/app/constants/networks.ts` file
  - Define `StellarNetwork` type union ('MAINNET' | 'TESTNET' | 'FUTURENET' | 'STANDALONE')
  - Define `NetworkConfig` interface with colors, icons, and display properties
  - Implement `NETWORK_CONFIGS` constant with configuration for all network types
  - Export utility function `getNetworkConfig(network: string): NetworkConfig`
  - _Requirements: 1.1, 1.3, 3.1, 3.2, 3.3, 3.4_

- [x] 2. Implement NetworkBadge component
  - [x] 2.1 Create NetworkBadge component structure
    - Create `frontend/app/components/dashboard/NetworkBadge.tsx`
    - Define `NetworkBadgeProps` interface (network, onClick, className)
    - Implement component with responsive sizing (mobile/tablet/desktop)
    - Use network configuration to apply appropriate colors and styling
    - Import and render appropriate icons (Shield for mainnet, AlertTriangle for testnet)
    - Add click handler to trigger onClick prop
    - _Requirements: 1.1, 1.3, 3.1, 3.2, 3.3, 3.4, 4.2, 9.1, 9.2, 9.3_
  
  - [ ]* 2.2 Write unit tests for NetworkBadge
    - Create `frontend/app/components/dashboard/__tests__/NetworkBadge.test.tsx`
    - Test mainnet styling renders correctly
    - Test testnet styling renders correctly with warning indicator
    - Test onClick handler is called when badge is clicked
    - Test responsive classes are applied correctly
    - Test unknown network values display fallback styling
    - _Requirements: 1.1, 1.3, 3.1, 3.2, 3.3, 3.4_

- [x] 3. Implement NetworkSwitchModal component
  - [x] 3.1 Create NetworkSwitchModal component structure
    - Create `frontend/app/components/dashboard/NetworkSwitchModal.tsx`
    - Define `NetworkSwitchModalProps` interface (isOpen, currentNetwork, onClose)
    - Implement modal with backdrop and centered content container
    - Add modal header with title and current network display
    - Create step-by-step instructions for switching networks in Freighter
    - Add action buttons: "Close" and "Open Freighter Extension"
    - Implement keyboard navigation (Escape to close, Tab cycling)
    - Add focus management (focus modal on open, return focus on close)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 10.2, 10.4_
  
  - [ ]* 3.2 Write unit tests for NetworkSwitchModal
    - Create `frontend/app/components/dashboard/__tests__/NetworkSwitchModal.test.tsx`
    - Test modal renders when isOpen is true
    - Test modal does not render when isOpen is false
    - Test onClose is called when close button is clicked
    - Test onClose is called when backdrop is clicked
    - Test onClose is called when Escape key is pressed
    - Test current network is displayed in instructions
    - Test all instruction steps are rendered
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.3, 7.4_

- [x] 4. Implement NetworkIndicator container component
  - [x] 4.1 Create NetworkIndicator component structure
    - Create `frontend/app/components/dashboard/NetworkIndicator.tsx`
    - Define `NetworkIndicatorProps` interface (network, isConnected)
    - Implement component state for modal visibility (showModal)
    - Render NetworkBadge when wallet is connected and network is not null
    - Handle badge click to open NetworkSwitchModal
    - Render NetworkSwitchModal with appropriate props
    - Add error boundary wrapper to prevent TopNav crashes
    - Implement graceful handling of null/undefined network values
    - _Requirements: 1.1, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.3_
  
  - [ ]* 4.2 Write unit tests for NetworkIndicator
    - Create `frontend/app/components/dashboard/__tests__/NetworkIndicator.test.tsx`
    - Test component does not render when isConnected is false
    - Test component does not render when network is null
    - Test NetworkBadge renders when connected with valid network
    - Test modal opens when badge is clicked
    - Test modal closes when close handler is called
    - Test component updates when network prop changes
    - Test error boundary prevents crashes on component errors
    - _Requirements: 1.1, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. Checkpoint - Ensure all component tests pass
  - Run all unit tests for NetworkBadge, NetworkSwitchModal, and NetworkIndicator
  - Verify all components render correctly in isolation
  - Ensure all tests pass, ask the user if questions arise

- [x] 6. Integrate NetworkIndicator into TopNav component
  - [x] 6.1 Modify TopNav to include NetworkIndicator
    - Open `frontend/app/components/dashboard/TopNav.tsx`
    - Import NetworkIndicator component
    - Add NetworkIndicator between wallet address display and disconnect button
    - Pass network and isConnected props from useWallet hook
    - Ensure proper spacing and alignment with existing elements
    - Test responsive layout on mobile, tablet, and desktop viewports
    - _Requirements: 1.1, 1.2, 4.1, 4.2, 4.3, 4.4, 11.1, 11.2, 11.3, 11.5_
  
  - [ ]* 6.2 Write integration tests for TopNav with NetworkIndicator
    - Create or update `frontend/app/components/dashboard/__tests__/TopNav.test.tsx`
    - Test NetworkIndicator appears when wallet is connected
    - Test NetworkIndicator does not appear when wallet is disconnected
    - Test NetworkIndicator maintains proper spacing with adjacent elements
    - Test NetworkIndicator does not cause layout shifts
    - Test responsive behavior across different viewport sizes
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 11.1, 11.2, 11.3_

- [ ] 7. Implement network change detection in WalletContext
  - [-] 7.1 Add WatchWalletChanges integration to WalletContext
    - Open `frontend/app/context/WalletContext.tsx`
    - Import `WatchWalletChanges` from @stellar/freighter-api
    - Add useEffect hook to initialize watcher when wallet connects
    - Configure watcher to poll every 3 seconds
    - Update network state when watcher detects network changes
    - Clean up watcher on wallet disconnect or component unmount
    - Add error handling for watcher failures
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ]* 7.2 Write unit tests for WalletContext network watcher
    - Create or update `frontend/app/context/__tests__/WalletContext.test.tsx`
    - Test watcher initializes when wallet connects
    - Test network state updates when watcher detects changes
    - Test watcher stops when wallet disconnects
    - Test watcher cleans up on component unmount
    - Test error handling when watcher fails
    - Mock WatchWalletChanges API for testing
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 8. Add accessibility features
  - [ ] 8.1 Implement ARIA labels and roles
    - Add aria-label to NetworkBadge button describing current network
    - Add aria-describedby for testnet warning
    - Add role="dialog" and aria-modal="true" to NetworkSwitchModal
    - Add aria-labelledby and aria-describedby to modal
    - Add sr-only span for testnet warning announcement
    - _Requirements: 10.1, 10.3_
  
  - [ ] 8.2 Implement screen reader announcements for network changes
    - Add live region (role="status" aria-live="polite") to NetworkIndicator
    - Update announcement text when network changes
    - Include warning message for testnet connections
    - Ensure announcements are clear and concise
    - _Requirements: 10.1, 10.5_
  
  - [ ] 8.3 Add focus indicators and keyboard navigation
    - Add focus-visible styles to NetworkBadge button
    - Add focus-visible styles to modal buttons
    - Ensure focus indicators have sufficient contrast
    - Test keyboard navigation through all interactive elements
    - Verify Escape key closes modal
    - Verify focus returns to badge after modal closes
    - _Requirements: 10.2, 10.4_
  
  - [ ]* 8.4 Write accessibility tests
    - Create `frontend/app/components/dashboard/__tests__/NetworkIndicator.a11y.test.tsx`
    - Test ARIA labels are present and correct
    - Test keyboard navigation works correctly
    - Test focus management in modal
    - Test screen reader announcements
    - Use @testing-library/jest-dom for accessibility assertions
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 9. Implement performance optimizations
  - [ ] 9.1 Add memoization to components
    - Wrap NetworkBadge with React.memo and custom comparison function
    - Add useMemo for network config lookup in NetworkIndicator
    - Add useMemo for modal instructions in NetworkSwitchModal
    - Ensure components only re-render when necessary props change
    - _Requirements: 12.3, 12.4_
  
  - [ ] 9.2 Add debouncing for network updates
    - Implement debounce logic in NetworkIndicator for network prop changes
    - Set debounce delay to 300ms
    - Ensure rapid network switches don't cause flickering
    - Test debouncing behavior with rapid network changes
    - _Requirements: 12.5_
  
  - [ ]* 9.3 Write performance tests
    - Create `frontend/app/components/dashboard/__tests__/NetworkIndicator.perf.test.tsx`
    - Test NetworkIndicator renders within 50ms of mount
    - Test network updates complete within 100ms
    - Test no unnecessary re-renders of TopNav when network changes
    - Test modal opens within 16ms (1 frame at 60fps)
    - Use React Testing Library and performance.now() for measurements
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 10. Add responsive design and styling refinements
  - [ ] 10.1 Implement responsive badge sizing
    - Add Tailwind classes for mobile (icon only, 32px)
    - Add Tailwind classes for tablet (icon + abbreviated label, 36px × 80px)
    - Add Tailwind classes for desktop (icon + full label, 38px × 120px)
    - Test badge appearance at all breakpoints
    - Ensure warning indicator adapts to screen size
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ] 10.2 Implement responsive modal design
    - Add full-screen modal styling for mobile with slide-up animation
    - Add centered modal styling for tablet/desktop with backdrop
    - Ensure touch targets are minimum 44px on mobile
    - Make modal content scrollable if it exceeds viewport
    - Position action buttons appropriately for each screen size
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ] 10.3 Add reduced motion support
    - Add prefers-reduced-motion media query to disable animations
    - Remove pulse animation for testnet badge when reduced motion is preferred
    - Remove modal transition animations when reduced motion is preferred
    - Test with browser reduced motion settings enabled
    - _Requirements: 10.5_
  
  - [ ]* 10.4 Write visual regression tests
    - Create snapshot tests for mainnet badge (desktop)
    - Create snapshot tests for testnet badge (desktop)
    - Create snapshot tests for mainnet badge (mobile)
    - Create snapshot tests for testnet badge (mobile)
    - Create snapshot tests for network switch modal
    - Use Jest snapshots or visual regression testing tool
    - _Requirements: 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 9.1, 9.2, 9.3_

- [ ] 11. Checkpoint - Ensure all tests pass and feature is complete
  - Run full test suite (unit, integration, accessibility, performance)
  - Test feature manually in browser at all breakpoints
  - Test with Freighter extension installed and connected
  - Test network switching flow end-to-end
  - Verify accessibility with keyboard navigation and screen reader
  - Ensure all tests pass, ask the user if questions arise

- [ ] 12. Add error handling and edge cases
  - [ ] 12.1 Handle unknown network values
    - Add fallback configuration for unknown network types
    - Display generic "Unknown Network" badge with neutral styling
    - Log console warning when unknown network value is encountered
    - Test with mock unknown network values
    - _Requirements: 5.5_
  
  - [ ] 12.2 Handle Freighter extension not found
    - Detect when Freighter extension is not installed
    - Display appropriate error message in modal when "Open Freighter" is clicked
    - Provide fallback instructions for manual network switching
    - Test behavior when extension is not available
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 12.3 Handle rapid network switching
    - Ensure debouncing prevents flickering during rapid switches
    - Test with multiple rapid network changes
    - Verify UI remains stable and responsive
    - _Requirements: 12.5_
  
  - [ ]* 12.4 Write error handling tests
    - Test unknown network value handling
    - Test Freighter extension not found scenario
    - Test rapid network switching behavior
    - Test network watcher failure recovery
    - Test error boundary catches component errors
    - _Requirements: 5.5, 8.1, 8.2, 8.3, 8.4_

- [ ] 13. Final integration and polish
  - [ ] 13.1 Verify color contrast compliance
    - Test mainnet badge text contrast (target: ≥ 4.5:1)
    - Test testnet badge text contrast (target: ≥ 4.5:1)
    - Test warning text contrast (target: ≥ 4.5:1)
    - Test modal text contrast (target: ≥ 4.5:1)
    - Use browser DevTools or contrast checker tool
    - Adjust colors if necessary to meet WCAG AA standards
    - _Requirements: 3.5, 10.3_
  
  - [ ] 13.2 Add testnet pulse animation
    - Implement CSS keyframes for testnet badge pulse effect
    - Apply animation to testnet badge border and shadow
    - Set duration to 2s with ease-in-out easing
    - Ensure animation respects prefers-reduced-motion
    - Test animation performance (should not cause jank)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ] 13.3 Verify TopNav layout integration
    - Test NetworkIndicator positioning in TopNav
    - Ensure no layout shifts during initial render
    - Verify proper spacing with wallet address and disconnect button
    - Test responsive behavior across all breakpoints
    - Ensure NetworkIndicator doesn't break existing TopNav functionality
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 11.1, 11.2, 11.3, 11.4_

- [ ] 14. Final checkpoint - Complete feature verification
  - Run complete test suite and ensure all tests pass
  - Perform manual testing across all supported browsers
  - Test with real Freighter wallet connection and network switching
  - Verify accessibility with keyboard and screen reader
  - Test responsive design on actual mobile, tablet, and desktop devices
  - Verify performance meets requirements (render times, no jank)
  - Ensure all acceptance criteria from requirements are met
  - Ask the user if questions arise or if feature is ready for deployment

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- The implementation follows a bottom-up approach: components first, then integration, then enhancements
- All components use TypeScript with strict typing (no `any` types)
- Styling uses Tailwind CSS consistent with existing codebase
- No new dependencies are required beyond what's already in the project
- The feature is additive and does not modify existing WalletContext API
- Network switching is read-only; actual switching happens through Freighter extension UI
- Testing strategy includes unit tests, integration tests, accessibility tests, and performance tests
- The feature gracefully handles edge cases like missing Freighter extension or unknown network values
