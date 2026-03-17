# OpenC2 Field

A lightweight, field-deployable PWA companion to OpenC2. Designed for high-daylight visibility, touch operation, low-compute devices, and less-technical operators.

![OpenC2 Field Screenshot](assets/OpenC2-Field-Screenshot.png)

## Overview

| Attribute | OpenC2 (Desktop) | Field App |
|-----------|------------------|-----------|
| Platform | Electron | PWA (any browser) |
| Target user | Trained power user | Field operator |
| UI complexity | Dense, multi-panel | Single-screen, 3-action max |
| Map | MapLibre + Deck.gl + 3D | Leaflet 2D |
| Bundle size | ~2MB+ | Target <500kb |
| Compute | Desktop GPU | Any device |

## Features

- **Real-time vehicle tracking** — View all connected vehicles on an interactive map
- **Simple command interface** — Three primary actions: GO, STOP, RTL (Return to Launch)
- **WebSocket connectivity** — Live telemetry from gateway
- **High-contrast field theme** — Readable in direct sunlight
- **Touch-optimized** — 48px+ touch targets for gloved operation
- **Offline capable** — PWA with installable manifest
- **TAK/C2 overlay mode** — Transparent background for WebView overlay on ATAK/WinTAK

## Tech Stack

- **Runtime:** Browser (PWA)
- **Framework:** React 19 + TypeScript
- **State:** Zustand
- **Map:** Leaflet + react-leaflet
- **Build:** Vite

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/OpenC2-Field.git
cd OpenC2-Field

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
npm run test     # Run tests (Vitest)
```

## Architecture

### Integration Modes

| Mode | Use case |
|------|----------|
| Standalone | Leaflet + OSM tiles, self-contained |
| TAK Overlay | WebView on ATAK/WinTAK, transparent background |
| Browser Tab | Side-by-side with any web map |
| Embedded | iframe in existing web C2 system |

### Overlay Architecture

The field app is designed as a transparent overlay system — the base map layer is optional. All drawing, vehicle markers, and mission geometry render on a transparent canvas, allowing the app to run as a WebView overlay on top of existing C2 systems.

```
┌─────────────────────────────────────────────────────────────┐
│     Field App (transparent PWA / WebView)                   │
│     - Vehicle markers                                       │
│     - Mission drawing                                       │
│     - Command interface                                     │
├─────────────────────────────────────────────────────────────┤
│     TAK / WinTAK / ATAK / Other C2                          │
│     - Base map tiles                                        │
│     - Existing SA picture                                   │
│     - Native CoT integration                                │
└─────────────────────────────────────────────────────────────┘
```

## Why These Technologies?

### PWA over Native

- No JavaScript bridge overhead (React Native's main perf bottleneck)
- WebSocket connections are native browser APIs — no serialization penalty
- Works on rugged devices that only guarantee a browser
- Instant updates without app store deployment

### Leaflet over WebGL Libraries

- **No WebGL requirement:** Works on devices without GPU acceleration
- **CPU rendering:** Canvas fallback means consistent perf on any hardware
- **42kb vs 800kb:** 19x smaller than MapLibre — critical for slow networks
- **Memory efficient:** DOM-based markers are lighter than WebGL buffers

## Documentation

See the [docs/](docs/) folder for detailed planning documents:

- [High Level Plan](docs/High_Level_Plan.md) — Full technical architecture
- [MVP Plan](docs/MVP_Plan.md) — Quick start implementation guide

## License

See [LICENSE](LICENSE) for details.
