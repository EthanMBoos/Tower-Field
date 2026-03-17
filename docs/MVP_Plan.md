# MVP: Sloppy UI First Pass

> **Goal**: Get the entire interface visible ASAP so we can iterate on layout, sizing, colors. No real data, no WebSockets, no tests. Just visuals.

---

## Time Budget: ~2-3 hours

---

## Step 1: Scaffold (10 min)

```bash
npm create vite@latest . -- --template react-ts
npm install leaflet react-leaflet zustand
npm install -D @types/leaflet
```

Delete all boilerplate CSS/components.

---

## Step 2: Single File Prototype (30 min)

Put EVERYTHING in `App.tsx` initially. One file = fast iteration.

```tsx
// App.tsx - THE WHOLE APP (for now)
import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// MOCK DATA - inline, who cares
const MOCK_VEHICLES = [
  { id: '1', name: 'Drone Alpha', lat: 37.7749, lng: -122.4194, status: 'online', battery: 87 },
  { id: '2', name: 'Rover Beta', lat: 37.7751, lng: -122.4180, status: 'standby', battery: 45 },
  { id: '3', name: 'Drone Charlie', lat: 37.7745, lng: -122.4200, status: 'offline', battery: 12 },
];

export default function App() {
  const [selected, setSelected] = useState<string | null>(null);
  const [connected] = useState(true); // fake it

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* STATUS BANNER */}
      <div style={{
        padding: '12px 16px',
        background: connected ? '#e8f5e9' : '#ffebee',
        borderBottom: `3px solid ${connected ? '#00802b' : '#cc0000'}`,
        fontWeight: 600,
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>{connected ? '● Connected' : '○ Disconnected'}</span>
        <span>{MOCK_VEHICLES.length} vehicles</span>
      </div>

      {/* MAP */}
      <div style={{ flex: 1 }}>
        <MapContainer 
          center={[37.7749, -122.4194]} 
          zoom={15} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {MOCK_VEHICLES.map(v => (
            <Marker 
              key={v.id} 
              position={[v.lat, v.lng]}
              eventHandlers={{ click: () => setSelected(v.id) }}
            >
              <Popup>{v.name} - {v.battery}%</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* VEHICLE LIST */}
      <div style={{ 
        maxHeight: '25vh', 
        overflowY: 'auto', 
        background: '#f5f5f5',
        borderTop: '2px solid #999'
      }}>
        {MOCK_VEHICLES.map(v => (
          <div 
            key={v.id}
            onClick={() => setSelected(v.id)}
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #ddd',
              background: selected === v.id ? '#fff' : 'transparent',
              borderLeft: selected === v.id ? '4px solid #00802b' : '4px solid transparent',
              display: 'flex',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontWeight: 600 }}>{v.name}</span>
            <span style={{ 
              padding: '2px 8px', 
              borderRadius: '4px',
              background: v.status === 'online' ? '#c8e6c9' : v.status === 'standby' ? '#fff3e0' : '#ffcdd2',
              fontSize: '14px'
            }}>
              {v.status} • {v.battery}%
            </span>
          </div>
        ))}
      </div>

      {/* COMMAND BAR */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '8px',
        padding: '16px',
        background: '#fff',
        borderTop: '2px solid #333'
      }}>
        <button 
          disabled={!selected}
          onClick={() => alert(`GO -> ${selected}`)}
          style={{
            height: '56px',
            fontSize: '20px',
            fontWeight: 700,
            background: '#00802b',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            opacity: selected ? 1 : 0.4,
            cursor: selected ? 'pointer' : 'not-allowed'
          }}
        >
          GO
        </button>
        <button 
          disabled={!selected}
          onClick={() => alert(`STOP -> ${selected}`)}
          style={{
            height: '56px',
            fontSize: '20px',
            fontWeight: 700,
            background: '#cc0000',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            opacity: selected ? 1 : 0.4,
            cursor: selected ? 'pointer' : 'not-allowed'
          }}
        >
          STOP
        </button>
        <button 
          disabled={!selected}
          onClick={() => alert(`RTL -> ${selected}`)}
          style={{
            height: '56px',
            fontSize: '20px',
            fontWeight: 700,
            background: '#0055cc',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            opacity: selected ? 1 : 0.4,
            cursor: selected ? 'pointer' : 'not-allowed'
          }}
        >
          RTL
        </button>
      </div>
    </div>
  );
}
```

---

## Step 3: Fix Leaflet Icons (5 min)

Leaflet's default icons break in Vite. Quick fix in `main.tsx`:

```tsx
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

L.Marker.prototype.options.icon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
```

---

## Step 4: Basic Global Styles (5 min)

```css
/* index.css */
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; }
body { 
  font-family: -apple-system, system-ui, sans-serif;
  font-size: 18px;
  -webkit-tap-highlight-color: transparent;
}
```

---

## Step 5: Run & Iterate (rest of time)

```bash
npm run dev
```

Open on phone/tablet with local IP. Start tweaking:

- Button sizes feel right?
- Text readable in bright light?  
- Touch targets big enough?
- Vehicle list scrolling smooth?
- Map controls accessible?

---

## What We're NOT Doing Yet

| Skip For Now | Add Later |
|--------------|-----------|
| File organization | After UI locked |
| TypeScript strictness | After shapes known |
| Zustand stores | After state patterns emerge |
| WebSocket connection | After UI works with mocks |
| PWA manifest | After core features done |
| Tests | After refactor |
| Custom markers | After basic flow works |
| Dark mode | v2 |

---

## Iteration Checklist

When tweaking, ask:

- [ ] Can I read this in direct sunlight?
- [ ] Can I tap this with gloves?
- [ ] Is the most important info visible at a glance?
- [ ] Does it feel fast?
- [ ] What's confusing about the layout?

---

## After ~3 Iterations

Once the layout feels right:
1. Extract components to separate files
2. Add proper TypeScript types
3. Set up Zustand stores
4. Connect real WebSocket
5. Add PWA stuff

---

## Quick Reference: Colors That Work Outdoors

```
GO green:    #00802b (not too bright)
STOP red:    #cc0000 (saturated, visible)
RTL blue:    #0055cc (distinct from green)
Warning:     #cc6600 (amber)
Background:  #ffffff (max contrast)
Text:        #1a1a1a (near black)
```

Touch minimum: 48px, comfortable: 56px
Font minimum: 18px for field use
