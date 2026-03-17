# Field App Technical Plan

> **Purpose**: Scaffold and implementation plan for a lightweight, field-deployable PWA companion to OpenC2. Designed for high-daylight visibility, touch operation, low-compute devices, and less-technical operators.

---

## Overview

| Attribute | OpenC2 (Desktop) | Field App |
|-----------|------------------|-----------|
| Platform | Electron | PWA (any browser) |
| Target user | Trained power user | Field operator |
| UI complexity | Dense, multi-panel | Single-screen, 3-action max |
| Map | MapLibre + Deck.gl + 3D | Leaflet 2D |
| Bundle size | ~2MB+ | Target <500kb |
| Compute | Desktop GPU | Any device |

---

## Tech Stack

```
┌─────────────────────────────────────────┐
│              FIELD APP                  │
├─────────────────────────────────────────┤
│  Runtime:      Browser (PWA)            │
│  Framework:    React 19 + TypeScript    │
│  State:        Zustand                  │
│  Map:          Leaflet + react-leaflet  │
│  Build:        Vite                     │
│  Install:      PWA manifest             │
│  Linting:      ESLint + Prettier        │
│  Testing:      Vitest                   │
└─────────────────────────────────────────┘
```

---

## Technology Selection Rationale

### PWA vs Native App

| Factor | PWA | React Native | Native (Swift/Kotlin) |
|--------|-----|--------------|----------------------|
| Bundle size | ~500kb | 7-15MB | 5-20MB |
| Cold start | <1s | 2-4s | 1-2s |
| Memory baseline | ~50MB | ~150MB | ~80MB |
| Device coverage | Any browser | iOS/Android only | Per-platform |
| Map library options | Full web ecosystem | Limited, buggy | Platform SDKs |

**Decision: PWA**
- No JavaScript bridge overhead (React Native's main perf bottleneck)
- WebSocket connections are native browser APIs — no serialization penalty
- Works on rugged devices that only guarantee a browser
- Instant updates without app store deployment

### Leaflet vs MapLibre GL vs Google Maps

| Library | Bundle | Render method | Memory (1000 markers) | Low-end device |
|---------|--------|---------------|----------------------|----------------|
| Leaflet | 42kb | DOM/Canvas | ~80MB | ✅ Smooth |
| MapLibre GL | 800kb | WebGL | ~200MB | ⚠️ Choppy |
| Google Maps | External | WebGL | ~150MB | ⚠️ Variable |
| Deck.gl | 400kb+ | WebGL | ~300MB | ❌ Unusable |

**Decision: Leaflet**
- **No WebGL requirement**: Works on devices without GPU acceleration
- **CPU rendering**: Canvas fallback means consistent perf on any hardware
- **42kb vs 800kb**: 19x smaller than MapLibre — critical for slow networks
- **Memory efficient**: DOM-based markers are lighter than WebGL buffers
- **Battle-tested**: 10+ years of production use on every device imaginable
- **Plugin ecosystem**: Offline tiles, clustering, heatmaps all available

*WebGL libraries (MapLibre, Deck.gl) are designed for 60fps 3D rendering on desktop GPUs. Overkill for 2D vehicle markers, and a liability on field hardware.*

### Drawing

Use **Leaflet.draw** (~15kb) or **react-leaflet-draw** for mission planning. Supports polygons, polylines, and waypoint markers with built-in edit/delete. Touch handles will need CSS enlargement for gloved operation. Altitude configuration per waypoint/route is straightforward — modal or inline input after placement.

### TAK / External Map Integration

The field app is designed as a **transparent overlay system**. The base map layer is optional — all drawing, vehicle markers, and mission geometry render on a transparent canvas. This allows the app to run as a WebView overlay on top of existing C2 systems.

```
┌─────────────────────────────────────────────────────────────┐
│                    OVERLAY ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │     Field App (transparent PWA / WebView)           │   │
│   │     - Vehicle markers                               │   │
│   │     - Mission drawing                               │   │
│   │     - Command interface                             │   │
│   └─────────────────────────────────────────────────────┘   │
│                           ▲                                 │
│                           │ overlay                         │
│   ┌─────────────────────────────────────────────────────┐   │
│   │     TAK / WinTAK / ATAK / Other C2                  │   │
│   │     - Base map tiles                                │   │
│   │     - Existing SA picture                           │   │
│   │     - Native CoT integration                        │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**

```tsx
// Transparent background - no tile layer
<MapContainer 
  style={{ background: 'transparent' }}
  zoomControl={false}
>
  {/* Optionally include tiles for standalone mode */}
  {!overlayMode && <TileLayer url="..." />}
  
  {/* These render on top of whatever's behind */}
  <VehicleMarkers />
  <MissionDrawing />
</MapContainer>
```

**Supported integration modes:**
| Mode | Use case |
|------|----------|
| Standalone | Leaflet + OSM tiles, self-contained |
| TAK Overlay | WebView on ATAK/WinTAK, transparent background |
| Browser Tab | Side-by-side with any web map |
| Embedded | iframe in existing web C2 system |

This architecture means operators don't abandon existing workflows — the field app adds mission planning and vehicle control on top of their current SA picture.

---

## Project Structure

```
field-app/
├── index.html
├── manifest.json                 # PWA manifest
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── eslint.config.mjs
│
├── public/
│   ├── icons/                    # PWA icons (192x192, 512x512)
│   └── favicon.ico
│
├── src/
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Root component
│   ├── constants.ts              # Colors, sizes, config
│   │
│   ├── stores/
│   │   ├── index.ts
│   │   ├── appStore.ts           # UI state
│   │   └── vehicleStore.ts       # Vehicle instances
│   │
│   ├── components/
│   │   ├── index.ts
│   │   ├── Map.tsx               # Leaflet wrapper
│   │   ├── VehicleMarker.tsx     # Single vehicle on map
│   │   ├── VehicleList.tsx       # Bottom sheet vehicle list
│   │   ├── CommandBar.tsx        # 3 primary actions
│   │   ├── StatusBanner.tsx      # Connection/alert status
│   │   └── FullscreenButton.tsx
│   │
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── useGateway.ts         # WebSocket connection
│   │   └── useWakeLock.ts        # Prevent screen sleep
│   │
│   ├── types/
│   │   └── index.ts              # Vehicle, Command types
│   │
│   └── styles/
│       ├── index.css             # Global styles
│       ├── variables.css         # Design tokens
│       └── field-theme.css       # High-contrast field theme
│
└── docs/
    └── FIELD_UI_GUIDELINES.md
```

---

## Package.json

```json
{
  "name": "field-app",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/",
    "test": "vitest"
  },
  "dependencies": {
    "leaflet": "^1.9.4",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-leaflet": "^5.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.12",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^6.0.0",
    "typescript": "^5.9.0",
    "vite": "^8.0.0",
    "vitest": "^4.0.0"
  }
}
```

---

## Core Components

### App.tsx

```tsx
import { Map } from './components/Map';
import { CommandBar } from './components/CommandBar';
import { StatusBanner } from './components/StatusBanner';
import { VehicleList } from './components/VehicleList';
import { useGateway } from './hooks/useGateway';
import './styles/index.css';

export function App() {
  useGateway(); // Connect to gateway on mount

  return (
    <div className="app">
      <StatusBanner />
      <Map />
      <VehicleList />
      <CommandBar />
    </div>
  );
}
```

### Map.tsx

```tsx
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { VehicleMarker } from './VehicleMarker';
import { useVehicleStore } from '../stores';
import 'leaflet/dist/leaflet.css';

export function Map() {
  const instances = useVehicleStore((s) => s.instances);
  
  return (
    <MapContainer
      center={[0, 0]}
      zoom={13}
      className="map-container"
      zoomControl={false}      // Custom controls for touch
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {instances.map((v) => (
        <VehicleMarker key={v.id} vehicle={v} />
      ))}
    </MapContainer>
  );
}
```

### CommandBar.tsx

```tsx
import { useVehicleStore } from '../stores';

export function CommandBar() {
  const selectedId = useVehicleStore((s) => s.selectedVehicleId);
  const sendCommand = useVehicleStore((s) => s.sendCommand);

  return (
    <div className="command-bar">
      <button
        className="command-btn command-btn--go"
        onClick={() => sendCommand(selectedId, 'START')}
        disabled={!selectedId}
      >
        GO
      </button>
      <button
        className="command-btn command-btn--stop"
        onClick={() => sendCommand(selectedId, 'STOP')}
        disabled={!selectedId}
      >
        STOP
      </button>
      <button
        className="command-btn command-btn--rtl"
        onClick={() => sendCommand(selectedId, 'RTL')}
        disabled={!selectedId}
      >
        RTL
      </button>
    </div>
  );
}
```

### useGateway.ts

```tsx
import { useEffect, useRef } from 'react';
import { useVehicleStore, useAppStore } from '../stores';

const GATEWAY_URL = 'ws://gateway.local:9000';
const RECONNECT_DELAY = 3000;

export function useGateway() {
  const wsRef = useRef<WebSocket | null>(null);
  const setConnected = useAppStore((s) => s.setConnected);
  const updateInstance = useVehicleStore((s) => s.updateInstance);

  useEffect(() => {
    let reconnectTimer: number;

    function connect() {
      const ws = new WebSocket(GATEWAY_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'telemetry') {
          updateInstance(msg.vehicleId, msg.payload);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimer = window.setTimeout(connect, RECONNECT_DELAY);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [setConnected, updateInstance]);

  return wsRef;
}
```

---

## Field UI CSS

### variables.css

```css
:root {
  /* Touch targets - minimum 48px per WCAG */
  --touch-min: 48px;
  --touch-comfortable: 56px;
  
  /* Typography - readable in daylight */
  --font-base: 18px;
  --font-lg: 22px;
  --font-xl: 28px;
  --font-family: -apple-system, system-ui, sans-serif;
  
  /* High contrast colors - 7:1+ ratio */
  --bg-primary: #ffffff;
  --bg-secondary: #f0f0f0;
  --text-primary: #1a1a1a;
  --text-muted: #4a4a4a;
  
  /* Semantic colors - bold, saturated */
  --color-go: #00802b;
  --color-stop: #cc0000;
  --color-rtl: #0055cc;
  --color-warning: #cc6600;
  --color-connected: #00802b;
  --color-disconnected: #cc0000;
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  
  /* Borders */
  --border-radius: 8px;
  --border-width: 2px;
}
```

### field-theme.css

```css
/* Full viewport, no scroll */
html, body, #root, .app {
  height: 100%;
  margin: 0;
  overflow: hidden;
  font-family: var(--font-family);
  font-size: var(--font-base);
  background: var(--bg-primary);
  color: var(--text-primary);
  -webkit-tap-highlight-color: transparent;
}

.app {
  display: grid;
  grid-template-rows: auto 1fr auto auto;
}

/* Map fills available space */
.map-container {
  width: 100%;
  height: 100%;
}

/* Status banner - always visible */
.status-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-secondary);
  font-weight: 600;
}

.status-banner--connected {
  border-bottom: 3px solid var(--color-connected);
}

.status-banner--disconnected {
  border-bottom: 3px solid var(--color-disconnected);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  50% { opacity: 0.6; }
}

/* Command bar - fixed bottom */
.command-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-primary);
  border-top: var(--border-width) solid var(--text-muted);
}

.command-btn {
  min-height: var(--touch-comfortable);
  font-size: var(--font-lg);
  font-weight: 700;
  text-transform: uppercase;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  color: white;
}

.command-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.command-btn--go { background: var(--color-go); }
.command-btn--stop { background: var(--color-stop); }
.command-btn--rtl { background: var(--color-rtl); }

/* No hover states - touch only */
@media (hover: hover) {
  .command-btn:not(:disabled):hover {
    filter: brightness(1.1);
  }
}

/* Active state for touch feedback */
.command-btn:active:not(:disabled) {
  transform: scale(0.97);
}

/* Vehicle list - swipeable bottom sheet */
.vehicle-list {
  max-height: 30vh;
  overflow-y: auto;
  background: var(--bg-secondary);
  border-top: var(--border-width) solid var(--text-muted);
}

.vehicle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--touch-min);
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--bg-primary);
}

.vehicle-item--selected {
  background: var(--bg-primary);
  border-left: 4px solid var(--color-go);
}

.vehicle-item__name {
  font-weight: 600;
}

.vehicle-item__status {
  font-size: var(--font-base);
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--border-radius);
}
```

---

## PWA Manifest

### manifest.json

```json
{
  "name": "Field Control",
  "short_name": "Field",
  "description": "Field vehicle control interface",
  "start_url": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#ffffff",
  "theme_color": "#1a1a1a",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#1a1a1a" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />
    <title>Field Control</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## Types

### types/index.ts

```ts
export type VehicleStatus = 'online' | 'offline' | 'standby' | 'error';

export interface VehicleInstance {
  id: string;
  name: string;
  status: VehicleStatus;
  position: {
    lat: number;
    lng: number;
  };
  heading: number;         // degrees
  speed: number;           // m/s
  battery: number;         // 0-100
  lastUpdate: number;      // timestamp
}

export type CommandType = 'START' | 'STOP' | 'RTL';

export interface Command {
  vehicleId: string;
  type: CommandType;
  timestamp: number;
}

// Gateway message types
export interface TelemetryMessage {
  type: 'telemetry';
  vehicleId: string;
  payload: Partial<VehicleInstance>;
}

export interface CommandAckMessage {
  type: 'command_ack';
  commandId: string;
  success: boolean;
}

export type GatewayMessage = TelemetryMessage | CommandAckMessage;
```

---

## Stores

### stores/vehicleStore.ts

```ts
import { create } from 'zustand';
import type { VehicleInstance, CommandType } from '../types';

interface VehicleStore {
  instances: VehicleInstance[];
  selectedVehicleId: string | null;
  
  // Actions
  setInstances: (instances: VehicleInstance[]) => void;
  updateInstance: (id: string, update: Partial<VehicleInstance>) => void;
  selectVehicle: (id: string | null) => void;
  sendCommand: (vehicleId: string | null, type: CommandType) => void;
}

export const useVehicleStore = create<VehicleStore>((set, get) => ({
  instances: [],
  selectedVehicleId: null,

  setInstances: (instances) => set({ instances }),

  updateInstance: (id, update) => set((state) => ({
    instances: state.instances.map((v) =>
      v.id === id ? { ...v, ...update, lastUpdate: Date.now() } : v
    ),
  })),

  selectVehicle: (id) => set({ selectedVehicleId: id }),

  sendCommand: (vehicleId, type) => {
    if (!vehicleId) return;
    // Command dispatch handled by gateway hook
    console.log(`Command: ${type} -> ${vehicleId}`);
  },
}));
```

### stores/appStore.ts

```ts
import { create } from 'zustand';

interface AppStore {
  connected: boolean;
  showVehicleList: boolean;
  
  setConnected: (connected: boolean) => void;
  toggleVehicleList: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  connected: false,
  showVehicleList: true,

  setConnected: (connected) => set({ connected }),
  toggleVehicleList: () => set((s) => ({ showVehicleList: !s.showVehicleList })),
}));
```

---

## Implementation Phases

### Phase 1: Foundation (3-4 days)
- [ ] Initialize Vite project with React + TypeScript
- [ ] Set up ESLint, Prettier (copy from OpenC2)
- [ ] Create PWA manifest and icons
- [ ] Implement high-contrast CSS variables
- [ ] Basic Leaflet map rendering

### Phase 2: Core Features (4-5 days)
- [ ] Vehicle store with Zustand
- [ ] Gateway WebSocket hook with reconnection
- [ ] Vehicle markers on map
- [ ] Vehicle list component
- [ ] Command bar (GO/STOP/RTL)
- [ ] Status banner (connection state)

### Phase 3: Field Hardening (3-4 days)
- [ ] Touch gesture optimization
- [ ] Wake lock hook (prevent screen sleep)
- [ ] Large text mode toggle
- [ ] Landscape/portrait layout handling
- [ ] PWA install prompt

### Phase 4: Testing (2-3 days)
- [ ] Unit tests for stores
- [ ] Test on target devices (iPad, Android tablet, rugged)
- [ ] Daylight visibility testing
- [ ] Network drop/reconnect scenarios

---

## Device Testing Checklist

| Device | Screen | Notes |
|--------|--------|-------|
| iPad Pro 12.9" | High PPI | Primary tablet target |
| iPad Mini | Small tablet | Touch target validation |
| Samsung Galaxy Tab Active | Rugged Android | Field durability |
| Panasonic Toughbook tablet | Windows/Android | Enterprise rugged |
| iPhone SE | Small phone | Minimum viable screen |
| Desktop Chrome | Large | Admin/monitoring use |

---

## Gateway Integration Notes

The field app connects to the same Go gateway as OpenC2. Gateway URL should be configurable:

```ts
// Environment-based or runtime config
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'ws://gateway.local:9000';
```

Field deployments typically run gateway on:
- Raspberry Pi on vehicle network
- Edge compute device in command vehicle
- Cloud relay for remote operations

---

## Future Considerations

**Not in v1, but plan for:**
- Voice commands (Web Speech API)
- Haptic feedback for confirmations
- Geofence visualization (simplified)
- Multi-vehicle selection
- Mission status display
- Dark mode toggle (night ops)
