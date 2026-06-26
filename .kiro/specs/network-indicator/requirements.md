# Requirements Document: Network Indicator for Stellar Networks

## Introduction

This document specifies the requirements for a network indicator feature that displays which Stellar network (Mainnet or Testnet) the user is currently connected to. The feature aims to prevent user confusion and reduce the risk of accidental transactions on the wrong network by providing clear, persistent visual feedback about the active network connection.

The network indicator will be integrated into the existing TopNav component and will include visual badges, warnings for testnet connections, and network-specific styling to help users maintain awareness of their current network context.

## Glossary

- **Network_Indicator**: The UI component that displays the current Stellar network connection status
- **TopNav**: The top navigation bar component located in `frontend/app/components/dashboard/TopNav.tsx`
- **Stellar_Network**: Either "MAINNET" or "TESTNET" as returned by the Freighter wallet API
- **Network_Badge**: A visual element displaying the current network name
- **Testnet_Warning**: A visual alert displayed when connected to testnet
- **WalletContext**: The React context managing wallet state in `frontend/app/context/WalletContext.tsx`
- **Network_Switcher**: UI controls allowing users to change between networks
- **Network_Styling**: Visual design elements (colors, icons, borders) that differ between mainnet and testnet

## Requirements

### Requirement 1: Display Current Network

**User Story:** As a user, I want to see which Stellar network I am connected to, so that I know whether I am on Mainnet or Testnet.

#### Acceptance Criteria

1. WHEN the wallet is connected, THE Network_Indicator SHALL display the current Stellar_Network name
2. THE Network_Badge SHALL be visible in the TopNav component
3. THE Network_Badge SHALL display "MAINNET" when connected to Stellar mainnet
4. THE Network_Badge SHALL display "TESTNET" when connected to Stellar testnet
5. WHEN the wallet is not connected, THE Network_Indicator SHALL not be displayed

### Requirement 2: Testnet Warning Display

**User Story:** As a user, I want to see a clear warning when connected to testnet, so that I am aware I am not on the production network.

#### Acceptance Criteria

1. WHILE connected to testnet, THE Network_Indicator SHALL display a Testnet_Warning
2. THE Testnet_Warning SHALL be visually distinct from the mainnet display
3. THE Testnet_Warning SHALL include warning iconography
4. THE Testnet_Warning SHALL use colors that signal caution (e.g., yellow, orange)
5. WHEN switching from testnet to mainnet, THE Testnet_Warning SHALL be removed

### Requirement 3: Network-Specific Visual Styling

**User Story:** As a user, I want the interface to look different when on testnet versus mainnet, so that I can quickly identify which network I'm using at a glance.

#### Acceptance Criteria

1. WHEN connected to mainnet, THE Network_Badge SHALL use mainnet-specific colors
2. WHEN connected to testnet, THE Network_Badge SHALL use testnet-specific colors
3. THE Network_Styling SHALL include distinct border colors for each network
4. THE Network_Styling SHALL include distinct background colors for each network
5. THE Network_Styling SHALL maintain sufficient contrast for accessibility (WCAG AA minimum)

### Requirement 4: Network Badge Positioning

**User Story:** As a user, I want the network indicator to be prominently placed, so that I can always see which network I'm on without searching.

#### Acceptance Criteria

1. THE Network_Badge SHALL be positioned in the TopNav component
2. THE Network_Badge SHALL be visible on all screen sizes (mobile, tablet, desktop)
3. THE Network_Badge SHALL not obscure other TopNav elements
4. THE Network_Badge SHALL be positioned near the wallet address display
5. WHEN the viewport is resized, THE Network_Badge SHALL remain visible and properly positioned

### Requirement 5: Network Information Accuracy

**User Story:** As a user, I want the network indicator to always show accurate information, so that I can trust what network I'm connected to.

#### Acceptance Criteria

1. WHEN the WalletContext network value changes, THE Network_Indicator SHALL update within 100 milliseconds
2. THE Network_Indicator SHALL display the network value from WalletContext without transformation
3. WHEN the wallet connection is established, THE Network_Indicator SHALL display the correct network immediately
4. WHEN the wallet is disconnected, THE Network_Indicator SHALL be removed immediately
5. THE Network_Indicator SHALL handle null or undefined network values gracefully

### Requirement 6: Network Switcher UI

**User Story:** As a user, I want to switch between Mainnet and Testnet, so that I can test features without affecting real assets.

#### Acceptance Criteria

1. THE Network_Switcher SHALL provide options for both MAINNET and TESTNET
2. WHEN a user selects a different network, THE Network_Switcher SHALL trigger a network change request
3. THE Network_Switcher SHALL indicate the currently selected network
4. THE Network_Switcher SHALL be accessible from the Network_Badge or nearby UI element
5. WHEN the network change is in progress, THE Network_Switcher SHALL display a loading state

### Requirement 7: Network Switch Confirmation

**User Story:** As a user, I want to confirm before switching networks, so that I don't accidentally change networks.

#### Acceptance Criteria

1. WHEN a user initiates a network switch, THE Network_Switcher SHALL display a confirmation dialog
2. THE confirmation dialog SHALL clearly state which network the user is switching to
3. THE confirmation dialog SHALL include "Confirm" and "Cancel" options
4. WHEN the user clicks "Cancel", THE Network_Switcher SHALL abort the network change
5. WHEN the user clicks "Confirm", THE Network_Switcher SHALL proceed with the network change

### Requirement 8: Network Switch Error Handling

**User Story:** As a user, I want to see clear error messages if network switching fails, so that I understand what went wrong.

#### Acceptance Criteria

1. IF a network switch fails, THEN THE Network_Switcher SHALL display an error message
2. THE error message SHALL describe why the switch failed
3. THE error message SHALL provide actionable guidance (e.g., "Please try again" or "Check wallet connection")
4. WHEN an error occurs, THE Network_Indicator SHALL continue displaying the current network
5. THE error message SHALL be dismissible by the user

### Requirement 9: Responsive Design

**User Story:** As a mobile user, I want the network indicator to work well on my device, so that I have the same awareness of my network connection.

#### Acceptance Criteria

1. WHEN viewed on mobile devices (width < 640px), THE Network_Badge SHALL be displayed in a compact format
2. WHEN viewed on tablet devices (width 640px-1024px), THE Network_Badge SHALL be displayed with medium sizing
3. WHEN viewed on desktop devices (width > 1024px), THE Network_Badge SHALL be displayed with full details
4. THE Network_Badge SHALL use responsive typography that scales appropriately
5. THE Testnet_Warning SHALL remain visible and readable on all screen sizes

### Requirement 10: Accessibility Compliance

**User Story:** As a user with accessibility needs, I want the network indicator to be accessible, so that I can understand my network connection regardless of my abilities.

#### Acceptance Criteria

1. THE Network_Badge SHALL include appropriate ARIA labels
2. THE Network_Badge SHALL be keyboard navigable
3. THE Network_Badge SHALL have sufficient color contrast (WCAG AA minimum 4.5:1 for text)
4. THE Network_Switcher SHALL be operable via keyboard alone
5. THE Testnet_Warning SHALL include screen reader announcements

### Requirement 11: Integration with Existing TopNav

**User Story:** As a developer, I want the network indicator to integrate seamlessly with the existing TopNav, so that the UI remains cohesive.

#### Acceptance Criteria

1. THE Network_Indicator SHALL use the existing TopNav styling patterns
2. THE Network_Indicator SHALL use the same color palette as other TopNav elements
3. THE Network_Indicator SHALL maintain consistent spacing with other TopNav elements
4. THE Network_Indicator SHALL not require modifications to the WalletContext API
5. THE Network_Indicator SHALL use the existing `network` property from WalletContext

### Requirement 12: Performance Requirements

**User Story:** As a user, I want the network indicator to load quickly, so that it doesn't slow down the application.

#### Acceptance Criteria

1. THE Network_Indicator SHALL render within 50 milliseconds of TopNav mount
2. THE Network_Indicator SHALL not cause layout shifts during initial render
3. THE Network_Indicator SHALL not trigger unnecessary re-renders of TopNav
4. THE Network_Indicator SHALL use memoization for static elements
5. THE Network_Switcher SHALL debounce rapid network change requests

---

## Notes

- The Freighter wallet API returns network values as "MAINNET" or "TESTNET" (uppercase strings)
- The existing WalletContext already provides the `network` property, so no backend changes are required
- The feature is frontend-only and does not require API modifications
- Network switching functionality depends on Freighter wallet capabilities
- Consider adding analytics tracking for network switches to understand user behavior
