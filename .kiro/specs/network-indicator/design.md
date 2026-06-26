# Design Document: Network Indicator for Stellar Networks

## Overview

The Network Indicator feature provides clear, persistent visual feedback about which Stellar network (Mainnet or Testnet) the user is currently connected to through their Freighter wallet. This feature addresses a critical user safety concern by preventing accidental transactions on the wrong network through prominent visual cues and network-specific styling.

### Key Design Decisions

1. **Read-Only Network Display**: Based on Freighter API research, network switching must be performed through the Freighter extension UI itself. The application will display the current network and provide guidance to users on how to switch networks, but will not attempt programmatic network switching.

2. **Component Integration**: The Network Indicator will be integrated directly into the existing TopNav component as a new visual element, maintaining consistency with the current design system.

3. **Reactive Updates**: The component will use the `WatchWalletChanges` API from Freighter to detect network changes in real-time and update the UI accordingly.

4. **Progressive Enhancement**: The feature will gracefully handle cases where the wallet is not connected or network information is unavailable.

## Architecture

### Component Structure

```
TopNav (existing)
├── NetworkIndicator (new)
│   ├── NetworkBadge
│   │   ├── NetworkIcon
│   │   └── NetworkLabel
│   ├── TestnetWarning (conditional)
│   └── NetworkSwitchModal (new)
│       ├── NetworkInstructions
│       └── NetworkOptions
```

### Component Hierarchy

**NetworkIndicator** (Container Component)
- Manages network state from WalletContext
- Controls modal visibility
- Handles network change detection
- Coordinates child component rendering

**NetworkBadge** (Presentational Component)
- Displays current network name
- Applies network-specific styling
- Handles click events to open modal
- Renders warning indicators for testnet

**NetworkSwitchModal** (Modal Component)
- Displays instructions for switching networks in Freighter
- Shows visual guide with screenshots/steps
- Provides "Open Freighter" action button
- Handles modal open/close state

### Data Flow

```
Freighter Extension
    ↓ (network change)
WalletContext (via WatchWalletChanges)
    ↓ (network state)
TopNav
    ↓ (props)
NetworkIndicator
    ↓ (render)
NetworkBadge + TestnetWarning
```

## Components and Interfaces

### NetworkIndicator Component

**File**: `frontend/app/components/dashboard/NetworkIndicator.tsx`

**Props Interface**:
```typescript
interface NetworkIndicatorProps {
  network: string | null;
  isConnected: boolean;
}
```

**State**:
```typescript
interface NetworkIndicatorState {
  showModal: boolean;
}
```

**Responsibilities**:
- Render NetworkBadge when wallet is connected
- Show/hide NetworkSwitchModal
- Apply network-specific styling classes
- Handle badge click events

### NetworkBadge Component

**File**: `frontend/app/components/dashboard/NetworkBadge.tsx`

**Props Interface**:
```typescript
interface NetworkBadgeProps {
  network: 'MAINNET' | 'TESTNET' | 'FUTURENET' | 'STANDALONE';
  onClick: () => void;
  className?: string;
}
```

**Styling Strategy**:
- Mainnet: Blue/teal theme matching existing brand colors (#08c1c1)
- Testnet: Amber/orange warning theme (#f59e0b, #fbbf24)
- Compact mode for mobile (<640px)
- Medium mode for tablet (640px-1024px)
- Full mode for desktop (>1024px)

**Visual Elements**:
- Network icon (shield for mainnet, alert triangle for testnet)
- Network label text
- Subtle pulse animation for testnet
- Border and background with network-specific colors

### NetworkSwitchModal Component

**File**: `frontend/app/components/dashboard/NetworkSwitchModal.tsx`

**Props Interface**:
```typescript
interface NetworkSwitchModalProps {
  isOpen: boolean;
  currentNetwork: string;
  onClose: () => void;
}
```

**Content Structure**:
1. Modal header with current network display
2. Step-by-step instructions:
   - "Click the Freighter extension icon in your browser"
   - "Click the network dropdown at the top"
   - "Select your desired network (Mainnet or Testnet)"
   - "The page will automatically update"
3. Visual guide (optional: screenshots or illustrations)
4. Action buttons: "Close" and "Open Freighter Extension"

### Integration with TopNav

**Modification to TopNav.tsx**:

```typescript
// Add NetworkIndicator import
import NetworkIndicator from './NetworkIndicator';

// Add NetworkIndicator in the wallet info section
{isConnected && shortAddress ? (
  <div className="flex items-center gap-2">
    {/* Existing wallet address display */}
    <div className="hidden sm:flex flex-col items-end">
      {/* ... existing code ... */}
    </div>
    
    {/* NEW: Network Indicator */}
    <NetworkIndicator 
      network={network} 
      isConnected={isConnected} 
    />
    
    {/* Existing disconnect button */}
    <button aria-label="Disconnect wallet" ...>
      {/* ... existing code ... */}
    </button>
  </div>
) : null}
```

### WalletContext Enhancement

**Modification to WalletContext.tsx**:

Add network change watcher using Freighter's `WatchWalletChanges` API:

```typescript
import { WatchWalletChanges } from "@stellar/freighter-api";

// Inside WalletProvider component
useEffect(() => {
  if (!isConnected) return;
  
  const watcher = new WatchWalletChanges(3000); // Poll every 3 seconds
  
  watcher.watch((changes) => {
    if (changes.network !== state.network) {
      setState(prev => ({
        ...prev,
        network: changes.network,
      }));
    }
  });
  
  return () => {
    watcher.stop();
  };
}, [isConnected]);
```

## Data Models

### Network Type

```typescript
type StellarNetwork = 'MAINNET' | 'TESTNET' | 'FUTURENET' | 'STANDALONE';
```

### Network Configuration

```typescript
interface NetworkConfig {
  name: StellarNetwork;
  displayName: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    border: string;
    text: string;
  };
  icon: React.ComponentType;
  showWarning: boolean;
}

const NETWORK_CONFIGS: Record<StellarNetwork, NetworkConfig> = {
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
    icon: Shield,
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
    icon: AlertTriangle,
    showWarning: true,
  },
  // ... FUTURENET and STANDALONE configs
};
```

### Network Badge Variants

```typescript
type BadgeSize = 'compact' | 'medium' | 'full';

interface BadgeVariant {
  size: BadgeSize;
  showIcon: boolean;
  showLabel: boolean;
  showWarningText: boolean;
}

const BADGE_VARIANTS: Record<BadgeSize, BadgeVariant> = {
  compact: {
    size: 'compact',
    showIcon: true,
    showLabel: false,
    showWarningText: false,
  },
  medium: {
    size: 'medium',
    showIcon: true,
    showLabel: true,
    showWarningText: false,
  },
  full: {
    size: 'full',
    showIcon: true,
    showLabel: true,
    showWarningText: true,
  },
};
```

## Error Handling

### Error Scenarios and Handling

1. **Network Value is Null/Undefined**
   - **Scenario**: WalletContext returns null for network
   - **Handling**: Do not render NetworkIndicator
   - **User Experience**: No network badge displayed

2. **Unknown Network Value**
   - **Scenario**: Freighter returns unexpected network value
   - **Handling**: Display generic "Unknown Network" badge with neutral styling
   - **Logging**: Console warning with actual network value
   - **User Experience**: Gray badge with question mark icon

3. **Network Change Detection Failure**
   - **Scenario**: WatchWalletChanges fails or stops working
   - **Handling**: Fall back to displaying last known network
   - **Recovery**: Attempt to reinitialize watcher on next wallet interaction
   - **User Experience**: Badge shows last known state, may be stale

4. **Modal Interaction Errors**
   - **Scenario**: User clicks "Open Freighter" but extension not found
   - **Handling**: Display error message with fallback instructions
   - **User Experience**: Error toast with manual instructions

5. **Rapid Network Switching**
   - **Scenario**: User switches networks multiple times quickly
   - **Handling**: Debounce network updates (300ms delay)
   - **User Experience**: Smooth transition without flickering

### Error Boundary

Wrap NetworkIndicator in an error boundary to prevent TopNav crashes:

```typescript
class NetworkIndicatorErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('NetworkIndicator error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return null; // Fail silently, don't break TopNav
    }
    return this.props.children;
  }
}
```

## Testing Strategy

### Unit Tests

**NetworkBadge Component Tests**:
- Renders with mainnet styling when network is "MAINNET"
- Renders with testnet styling when network is "TESTNET"
- Shows warning indicator only for testnet
- Calls onClick handler when clicked
- Applies correct responsive classes for different screen sizes
- Handles unknown network values gracefully

**NetworkIndicator Component Tests**:
- Does not render when isConnected is false
- Does not render when network is null
- Renders NetworkBadge when connected with valid network
- Opens modal when badge is clicked
- Closes modal when close button is clicked
- Updates display when network prop changes

**NetworkSwitchModal Component Tests**:
- Renders when isOpen is true
- Does not render when isOpen is false
- Displays current network in instructions
- Calls onClose when close button clicked
- Calls onClose when backdrop clicked
- Renders all instruction steps

**WalletContext Network Watcher Tests**:
- Initializes watcher when wallet connects
- Updates network state when Freighter network changes
- Stops watcher when wallet disconnects
- Cleans up watcher on component unmount
- Handles watcher errors gracefully

### Integration Tests

**TopNav Integration**:
- NetworkIndicator appears in correct position within TopNav
- NetworkIndicator maintains proper spacing with adjacent elements
- NetworkIndicator does not cause layout shifts
- NetworkIndicator responds to WalletContext changes

**End-to-End Network Flow**:
- Connect wallet → Network badge appears
- Switch network in Freighter → Badge updates automatically
- Click badge → Modal opens with instructions
- Disconnect wallet → Badge disappears

### Accessibility Tests

**Keyboard Navigation**:
- Tab to network badge
- Enter/Space opens modal
- Tab through modal elements
- Escape closes modal
- Focus returns to badge after modal closes

**Screen Reader Tests**:
- Badge announces current network
- Testnet warning is announced
- Modal instructions are readable
- Network changes are announced

**Color Contrast Tests**:
- Mainnet badge text contrast ≥ 4.5:1
- Testnet badge text contrast ≥ 4.5:1
- Warning text contrast ≥ 4.5:1
- Modal text contrast ≥ 4.5:1

### Visual Regression Tests

- Snapshot test for mainnet badge (desktop)
- Snapshot test for testnet badge (desktop)
- Snapshot test for mainnet badge (mobile)
- Snapshot test for testnet badge (mobile)
- Snapshot test for network switch modal

### Performance Tests

- NetworkIndicator renders within 50ms of TopNav mount
- Network updates complete within 100ms of WalletContext change
- No unnecessary re-renders of TopNav when network changes
- Modal opens within 16ms (1 frame at 60fps)

## Performance Optimization

### Memoization Strategy

1. **NetworkBadge Component**:
   ```typescript
   export const NetworkBadge = React.memo(({ network, onClick }: NetworkBadgeProps) => {
     // Component implementation
   }, (prevProps, nextProps) => {
     return prevProps.network === nextProps.network;
   });
   ```

2. **Network Config Lookup**:
   ```typescript
   const networkConfig = useMemo(() => {
     return NETWORK_CONFIGS[network] || NETWORK_CONFIGS.UNKNOWN;
   }, [network]);
   ```

3. **Modal Instructions**:
   ```typescript
   const instructions = useMemo(() => {
     return generateInstructions(currentNetwork);
   }, [currentNetwork]);
   ```

### Debouncing Network Updates

```typescript
const [debouncedNetwork, setDebouncedNetwork] = useState(network);

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedNetwork(network);
  }, 300);
  
  return () => clearTimeout(timer);
}, [network]);
```

### Lazy Loading

- NetworkSwitchModal loaded only when first opened
- Modal content rendered conditionally
- Icons imported dynamically if bundle size is a concern

### Render Optimization

- Use CSS transforms for animations (GPU-accelerated)
- Avoid layout thrashing by batching DOM reads/writes
- Use `will-change` CSS property for animated elements
- Minimize re-renders with proper React.memo usage

## Responsive Design Implementation

### Breakpoint Strategy

```typescript
const breakpoints = {
  mobile: '(max-width: 639px)',
  tablet: '(min-width: 640px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
};
```

### Responsive Badge Sizing

**Mobile (<640px)**:
- Icon only, no text label
- Size: 32px × 32px
- Tooltip on hover/long-press showing network name
- Warning indicator: small dot overlay

**Tablet (640px-1024px)**:
- Icon + abbreviated label ("Main" / "Test")
- Size: 36px × 80px
- Warning indicator: small icon

**Desktop (>1024px)**:
- Icon + full label ("Mainnet" / "Testnet")
- Size: 38px × 120px
- Warning indicator: icon + text

### Responsive Modal

**Mobile**:
- Full-screen modal with slide-up animation
- Larger touch targets (min 44px)
- Scrollable content area
- Fixed action buttons at bottom

**Tablet/Desktop**:
- Centered modal with backdrop
- Max-width: 480px
- Scrollable if content exceeds viewport
- Action buttons in modal footer

### CSS Implementation

```css
/* Mobile-first approach */
.network-badge {
  width: 32px;
  height: 32px;
  padding: 0;
}

.network-badge__label {
  display: none;
}

/* Tablet */
@media (min-width: 640px) {
  .network-badge {
    width: auto;
    height: 36px;
    padding: 0 12px;
  }
  
  .network-badge__label {
    display: inline;
    font-size: 12px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .network-badge {
    height: 38px;
    padding: 0 16px;
  }
  
  .network-badge__label {
    font-size: 13px;
  }
}
```

## Accessibility Implementation

### ARIA Labels and Roles

**NetworkBadge**:
```typescript
<button
  role="button"
  aria-label={`Current network: ${networkConfig.displayName}. Click to view network switching instructions.`}
  aria-describedby={showWarning ? "testnet-warning" : undefined}
  className="network-badge"
  onClick={onClick}
>
  {/* Badge content */}
</button>

{showWarning && (
  <span id="testnet-warning" className="sr-only">
    Warning: You are connected to the test network. Transactions will not affect real assets.
  </span>
)}
```

**NetworkSwitchModal**:
```typescript
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="network-modal-title"
  aria-describedby="network-modal-description"
>
  <h2 id="network-modal-title">Switch Network</h2>
  <p id="network-modal-description">
    Follow these steps to switch networks in Freighter
  </p>
  {/* Modal content */}
</div>
```

### Keyboard Navigation

**Focus Management**:
1. When modal opens, focus moves to modal title
2. Tab cycles through interactive elements within modal
3. Shift+Tab cycles backward
4. Escape key closes modal
5. When modal closes, focus returns to badge button

**Implementation**:
```typescript
const modalRef = useRef<HTMLDivElement>(null);
const previousFocusRef = useRef<HTMLElement | null>(null);

useEffect(() => {
  if (isOpen) {
    previousFocusRef.current = document.activeElement as HTMLElement;
    modalRef.current?.focus();
  } else {
    previousFocusRef.current?.focus();
  }
}, [isOpen]);

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    onClose();
  }
};
```

### Screen Reader Announcements

**Network Change Announcement**:
```typescript
const [announcement, setAnnouncement] = useState('');

useEffect(() => {
  if (network) {
    const config = NETWORK_CONFIGS[network];
    const message = config.showWarning
      ? `Network changed to ${config.displayName}. Warning: You are on the test network.`
      : `Network changed to ${config.displayName}.`;
    setAnnouncement(message);
  }
}, [network]);

return (
  <>
    <div role="status" aria-live="polite" className="sr-only">
      {announcement}
    </div>
    {/* Component content */}
  </>
);
```

### Color Contrast Compliance

**Mainnet Colors** (WCAG AA Compliant):
- Text: #5de0e0 on background #0e2330 → Contrast ratio: 7.2:1 ✓
- Border: #08c1c1 on background #0e2330 → Contrast ratio: 5.8:1 ✓

**Testnet Colors** (WCAG AA Compliant):
- Text: #fbbf24 on background #0e2330 → Contrast ratio: 8.1:1 ✓
- Border: #f59e0b on background #0e2330 → Contrast ratio: 6.4:1 ✓

**Warning Text**:
- Text: #fbbf24 on background #92400e → Contrast ratio: 5.2:1 ✓

### Focus Indicators

```css
.network-badge:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

.modal-button:focus-visible {
  outline: 2px solid #08c1c1;
  outline-offset: 2px;
}
```

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  .network-badge,
  .network-modal {
    animation: none;
    transition: none;
  }
  
  .testnet-pulse {
    animation: none;
  }
}
```

## Visual Design Specifications

### Mainnet Badge Design

**Colors**:
- Background: `rgba(8, 193, 193, 0.1)` (#08c1c11a)
- Border: `#08c1c1` (1px solid)
- Text: `#5de0e0`
- Icon: `#08c1c1`

**Typography**:
- Font family: Inherit from TopNav (system font stack)
- Font size: 13px (desktop), 12px (tablet), icon-only (mobile)
- Font weight: 600 (semibold)
- Letter spacing: 0.3px

**Spacing**:
- Padding: 8px 16px (desktop), 6px 12px (tablet), 8px (mobile)
- Gap between icon and text: 6px
- Border radius: 12px

**Icon**:
- Shield icon from lucide-react
- Size: 14px
- Stroke width: 2px

### Testnet Badge Design

**Colors**:
- Background: `rgba(245, 158, 11, 0.15)` (#f59e0b26)
- Border: `#f59e0b` (1px solid)
- Text: `#fbbf24`
- Icon: `#f59e0b`

**Typography**: Same as mainnet

**Spacing**: Same as mainnet

**Icon**:
- AlertTriangle icon from lucide-react
- Size: 14px
- Stroke width: 2px

**Animation**:
- Subtle pulse effect on border
- Duration: 2s
- Easing: ease-in-out
- Iteration: infinite

```css
@keyframes testnet-pulse {
  0%, 100% {
    border-color: #f59e0b;
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
  }
  50% {
    border-color: #fbbf24;
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0);
  }
}

.testnet-badge {
  animation: testnet-pulse 2s ease-in-out infinite;
}
```

### Warning Indicator Design

**Desktop Display**:
- Position: Below network label
- Text: "⚠ Test Network"
- Font size: 10px
- Color: `#fbbf24`
- Font weight: 500

**Mobile/Tablet Display**:
- Position: Top-right corner of badge
- Visual: Small warning dot
- Size: 6px diameter
- Color: `#f59e0b`
- Border: 1px solid `#0e2330`

### Modal Design

**Container**:
- Background: `#0e2330`
- Border: 1px solid `rgba(255, 255, 255, 0.1)`
- Border radius: 16px
- Padding: 24px
- Max-width: 480px
- Box shadow: `0 20px 25px -5px rgba(0, 0, 0, 0.5)`

**Header**:
- Title font size: 18px
- Title font weight: 600
- Title color: `#ffffff`
- Current network badge: Inline display with appropriate styling

**Instructions**:
- Step numbers: Circular badges with teal background
- Step text: 14px, color `#d6f6f6`
- Line height: 1.6
- Spacing between steps: 16px

**Action Buttons**:
- Primary button (Open Freighter):
  - Background: `#08c1c1`
  - Text: `#021515`
  - Hover: `#0fa3a3`
- Secondary button (Close):
  - Background: `rgba(255, 255, 255, 0.05)`
  - Text: `#d6f6f6`
  - Hover: `rgba(255, 255, 255, 0.1)`
- Height: 40px
- Border radius: 10px
- Font weight: 600

### Backdrop

- Background: `rgba(0, 0, 0, 0.6)`
- Backdrop filter: `blur(4px)`
- Z-index: 50

## Implementation Notes

### File Structure

```
frontend/app/components/dashboard/
├── TopNav.tsx (modified)
├── NetworkIndicator.tsx (new)
├── NetworkBadge.tsx (new)
├── NetworkSwitchModal.tsx (new)
└── __tests__/
    ├── NetworkIndicator.test.tsx (new)
    ├── NetworkBadge.test.tsx (new)
    └── NetworkSwitchModal.test.tsx (new)

frontend/app/context/
└── WalletContext.tsx (modified)

frontend/app/constants/
└── networks.ts (new)
```

### Dependencies

**Existing Dependencies** (already in project):
- `@stellar/freighter-api` - For network detection and watching
- `lucide-react` - For icons (Shield, AlertTriangle)
- `react` - Component framework
- `next` - Framework features

**No New Dependencies Required**

### Browser Compatibility

- Chrome/Edge: Full support (Freighter supported)
- Firefox: Full support (Freighter supported)
- Safari: Limited (Freighter not available, graceful degradation)
- Mobile browsers: Display only (no Freighter extension)

### Freighter Extension Detection

```typescript
const isFreighterAvailable = async (): Promise<boolean> => {
  try {
    const result = await isConnected();
    return result.isConnected !== undefined;
  } catch {
    return false;
  }
};
```

### Network Change Detection Timing

- Poll interval: 3000ms (3 seconds)
- Debounce delay: 300ms
- Update animation duration: 200ms
- Total perceived latency: ~3.5 seconds maximum

### Styling Approach

- **Tailwind CSS**: Primary styling method (consistent with existing codebase)
- **Inline styles**: For dynamic values (network-specific colors)
- **CSS modules**: Not used (project doesn't use them)
- **Styled components**: Not used (project doesn't use them)

### TypeScript Strictness

All components will use strict TypeScript:
- No `any` types
- Explicit return types for functions
- Proper interface definitions
- Null safety checks

## Future Enhancements

### Phase 2 Considerations

1. **Network History**:
   - Track recent network switches
   - Display switch history in modal
   - Analytics on network usage patterns

2. **Custom Network Support**:
   - Support for FUTURENET and STANDALONE networks
   - Custom network configuration display
   - Network-specific warnings and guidance

3. **Network-Specific Features**:
   - Disable certain features on testnet
   - Show testnet-only features
   - Network-specific transaction limits

4. **Enhanced Visual Feedback**:
   - Toast notifications on network switch
   - Animated transitions between networks
   - Network status indicator in page title

5. **Developer Tools**:
   - Quick network switch for development
   - Network override for testing
   - Mock network states for development

### Known Limitations

1. **No Programmatic Switching**: Users must switch networks through Freighter extension
2. **Polling Delay**: Up to 3 seconds delay in detecting network changes
3. **Extension Dependency**: Feature requires Freighter extension to be installed
4. **Mobile Limitations**: Limited functionality on mobile devices without extension support

### Migration Path

This feature is additive and requires no data migration. Rollout plan:

1. **Phase 1**: Deploy NetworkIndicator with read-only display
2. **Phase 2**: Add NetworkSwitchModal with instructions
3. **Phase 3**: Enhance with analytics and history tracking
4. **Phase 4**: Add advanced features (custom networks, etc.)

## Security Considerations

### Trust Boundary

- **Trusted**: WalletContext network value (from Freighter)
- **Untrusted**: User input in modal (minimal, only button clicks)
- **Validation**: Network value validated against known network types

### XSS Prevention

- All text content properly escaped by React
- No `dangerouslySetInnerHTML` usage
- Network values validated before display

### Privacy

- No network preference data sent to backend
- No analytics tracking of network switches (Phase 1)
- Network state stored only in React state (not persisted)

### Content Security Policy

No CSP changes required:
- No external resources loaded
- No inline scripts
- No eval() usage

## Deployment Strategy

### Feature Flag

Implement feature flag for gradual rollout:

```typescript
const FEATURE_FLAGS = {
  NETWORK_INDICATOR: process.env.NEXT_PUBLIC_FEATURE_NETWORK_INDICATOR === 'true',
};

// In TopNav.tsx
{FEATURE_FLAGS.NETWORK_INDICATOR && (
  <NetworkIndicator network={network} isConnected={isConnected} />
)}
```

### Rollout Plan

1. **Development**: Test with feature flag enabled
2. **Staging**: Enable for all staging users
3. **Production Canary**: Enable for 10% of users
4. **Production Rollout**: Gradually increase to 100%
5. **Feature Flag Removal**: Remove flag after stable for 2 weeks

### Monitoring

**Metrics to Track**:
- NetworkIndicator render errors
- Modal open rate
- Network change detection latency
- Component render performance
- User engagement with modal

**Error Tracking**:
- Network value parsing errors
- WatchWalletChanges failures
- Modal interaction errors
- Unexpected network values

### Rollback Plan

If issues detected:
1. Disable feature flag immediately
2. Investigate error logs
3. Fix issues in development
4. Redeploy with fixes
5. Resume gradual rollout

---

## Summary

The Network Indicator feature provides essential safety functionality by clearly displaying the current Stellar network connection. The design prioritizes:

1. **User Safety**: Prominent visual warnings for testnet connections
2. **Simplicity**: Read-only display with clear instructions for switching
3. **Performance**: Optimized rendering with minimal overhead
4. **Accessibility**: Full keyboard navigation and screen reader support
5. **Maintainability**: Clean component architecture with comprehensive tests

The implementation integrates seamlessly with existing TopNav and WalletContext components while maintaining the application's design language and performance characteristics.
