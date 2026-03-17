import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, FeatureGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

// ============ TACTICAL LIGHT - SUNLIGHT OPTIMIZED ============
const COLORS = {
  // Backgrounds - WHITE for max sunlight contrast
  bgWhite: '#ffffff',
  bgLight: '#f0f0f0',
  bgPanel: '#ffffff',
  
  // Text - BLACK for max contrast
  textPrimary: '#000000',
  textSecondary: '#1a1a1a',
  textMuted: '#444444',
  
  // Borders - HEAVY BLACK
  border: '#000000',
  borderLight: '#333333',
  
  // Semantic - SATURATED for sunlight
  danger: '#cc0000',       // Deep red
  warning: '#cc5500',      // Burnt orange  
  success: '#007722',      // Forest green
  info: '#0055aa',         // Deep blue
  
  // Aviation standard - BOLD
  flightPath: '#006666',   // Dark cyan
  breadcrumb: '#cc5500',   // Dark amber
  aircraft: '#990099',     // Dark magenta
  selected: '#006633',     // Dark green
};

// ============ TACTICAL CLIP PATHS ============
const CLIP = {
  chamfer: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
  chamferLg: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
  chamferAll: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
};

// ============ MOCK DATA ============
const VEHICLE = {
  id: 'vector-01',
  name: 'VECTOR-01',
  mode: 'HOLD',
  safetyStatus: 'ARMED',
  lat: 37.7749,
  lng: -122.4194,
  heading: 344,
  groundSpeed: 12.4,
  airSpeed: 14.2,
  verticalSpeed: 0.3,
  altitudeAGL: 120,
  batteryAircraft: 78,
  batteryController: 92,
  gpsLock: '3D',
  satellites: 14,
  signalStrength: 4,
};

const FLIGHT_PATH = [
  [37.7749, -122.4194],
  [37.7760, -122.4180],
  [37.7772, -122.4195],
  [37.7765, -122.4220],
  [37.7749, -122.4194],
] as [number, number][];

const BREADCRUMB_TRAIL = [
  [37.7749, -122.4194],
  [37.7752, -122.4190],
  [37.7756, -122.4185],
  [37.7760, -122.4180],
] as [number, number][];

// ============ AIRCRAFT MARKER ============
const aircraftIcon = L.divIcon({
  className: 'aircraft-marker',
  html: `<div style="
    width: 0; height: 0;
    border-left: 14px solid transparent;
    border-right: 14px solid transparent;
    border-bottom: 32px solid ${COLORS.aircraft};
    filter: drop-shadow(0 0 4px #fff) drop-shadow(0 0 8px #000);
    transform: rotate(${VEHICLE.heading}deg);
  "></div>`,
  iconSize: [28, 32],
  iconAnchor: [14, 16],
});

// ============ MAP CONTROLLER COMPONENT ============
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// ============ DRAW CONTROLLER ============
// Programmatically starts drawing when drawMode changes
interface DrawControllerProps {
  drawMode: string | null;
  color: string;
  onCreated: (e: L.DrawEvents.Created, mode: string) => void;
  onDrawEnd: () => void;
}

function DrawController({ drawMode, color, onCreated, onDrawEnd }: DrawControllerProps) {
  const map = useMap();
  const currentModeRef = useRef<string | null>(null);
  const handlerRef = useRef<L.Draw.Polygon | L.Draw.Polyline | L.Draw.Marker | null>(null);
  
  // Track current mode for event handler
  useEffect(() => {
    currentModeRef.current = drawMode;
  }, [drawMode]);
  
  // Listen for draw:created events (stable, only depends on map)
  useEffect(() => {
    if (!map) return;
    
    const handleCreated = (e: L.DrawEvents.Created) => {
      if (currentModeRef.current) {
        onCreated(e, currentModeRef.current);
      }
      onDrawEnd();
    };
    
    map.on('draw:created', handleCreated as L.LeafletEventHandlerFn);
    
    return () => {
      map.off('draw:created', handleCreated as L.LeafletEventHandlerFn);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]); // Intentionally exclude onCreated/onDrawEnd - they're stable via refs
  
  // Enable draw handler when mode changes
  useEffect(() => {
    // Disable previous handler if any
    if (handlerRef.current) {
      handlerRef.current.disable();
      handlerRef.current = null;
    }
    
    if (!drawMode || !map) return;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const drawMap = map as any;
    
    // Create the appropriate draw handler based on mode
    switch (drawMode) {
      case 'geofence':
        handlerRef.current = new L.Draw.Polygon(drawMap, {
          shapeOptions: {
            color: color,
            fillColor: color,
            fillOpacity: 0,
            opacity: 1,
            weight: 4,
          },
          showArea: true,
        });
        break;
      case 'nogo':
      case 'search':
        handlerRef.current = new L.Draw.Polygon(drawMap, {
          shapeOptions: {
            color: color,
            fillColor: color,
            fillOpacity: 0.3,
            opacity: 1,
            weight: 4,
            dashArray: drawMode === 'nogo' ? '10, 5' : undefined,
          },
          showArea: true,
        });
        break;
      case 'point':
        handlerRef.current = new L.Draw.Marker(drawMap, {});
        break;
      case 'ground':
      case 'air':
        handlerRef.current = new L.Draw.Polyline(drawMap, {
          shapeOptions: {
            color: color,
            opacity: 1,
            weight: 5,
            dashArray: drawMode === 'air' ? '15, 10' : undefined,
          },
        });
        break;
    }
    
    if (handlerRef.current) {
      handlerRef.current.enable();
    }
    
    return () => {
      if (handlerRef.current) {
        handlerRef.current.disable();
        handlerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawMode, map]); // Only re-run when drawMode or map changes, NOT color
  
  return null;
}

// ============ SHAPE TYPES ============
interface DrawnShape {
  id: string;
  type: string;       // geofence, nogo, search, point, ground, air
  layerType: string;  // polygon, polyline, marker
  latlngs: L.LatLng[] | L.LatLng;
  color: string;
  name: string;
  altitude?: number;
}

// ============ MAIN APP ============
export default function App() {
  const [missionTime, setMissionTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [showDrawTools, setShowDrawTools] = useState(false);
  const [drawMode, setDrawMode] = useState<string | null>(null);
  const [mapZoom, setMapZoom] = useState(16);
  
  // Drawing state
  const [shapes, setShapes] = useState<DrawnShape[]>([]);
  const featureGroupRef = useRef<L.FeatureGroup>(null);

  // Drawing tools configuration - BRIGHT colors for satellite map visibility
  const DRAW_TOOLS = [
    { id: 'geofence', label: 'GEOFENCE', icon: '⬡', color: '#FFD700' },  // Bright gold/yellow
    { id: 'nogo', label: 'NO-GO', icon: '⊘', color: '#FF3333' },         // Bright red
    { id: 'search', label: 'SEARCH', icon: '⌗', color: '#00DDFF' },      // Bright cyan
    { id: 'point', label: 'POINT', icon: '◎', color: '#00DDFF' },        // Bright cyan
    { id: 'ground', label: 'GND RTE', icon: '━', color: '#FF8800' },     // Bright orange
    { id: 'air', label: 'AIR RTE', icon: '✢', color: '#00FF66' },        // Bright green
  ];

  useEffect(() => {
    const interval = setInterval(() => setMissionTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => setRecordTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Get color for current draw mode
  const getDrawModeColor = (mode: string | null): string => {
    const tool = DRAW_TOOLS.find(t => t.id === mode);
    return tool?.color || COLORS.info;
  };

  // Handle shape creation from DrawController (programmatic drawing)
  const handleDrawCreatedFromController = (e: L.DrawEvents.Created, mode: string) => {
    const layer = e.layer;
    const layerType = e.layerType;
    const color = getDrawModeColor(mode);
    
    let latlngs: L.LatLng[] | L.LatLng;
    if (layerType === 'marker') {
      latlngs = (layer as L.Marker).getLatLng();
    } else if (layerType === 'polyline') {
      latlngs = (layer as L.Polyline).getLatLngs() as L.LatLng[];
    } else {
      latlngs = (layer as L.Polygon).getLatLngs()[0] as L.LatLng[];
    }
    
    const newShape: DrawnShape = {
      id: `${mode}-${Date.now()}`,
      type: mode,
      layerType,
      latlngs,
      color,
      name: `${mode.toUpperCase()}-${shapes.length + 1}`,
    };
    
    setShapes(prev => [...prev, newShape]);
    
    // Style the layer with the appropriate color
    if ('setStyle' in layer) {
      const isPolygon = layerType === 'polygon' || layerType === 'rectangle';
      const isRoute = mode === 'ground' || mode === 'air';
      const fillOpacity = mode === 'geofence' ? 0 : (isPolygon ? 0.3 : 0);
      
      (layer as L.Path).setStyle({
        color: color,
        fillColor: color,
        fillOpacity: fillOpacity,
        opacity: 1,
        weight: isRoute ? 5 : 4,
        dashArray: mode === 'nogo' ? '10, 5' : (mode === 'air' ? '15, 10' : undefined),
      });
    }
    
    // Add layer to the feature group so it persists on the map
    if (featureGroupRef.current) {
      featureGroupRef.current.addLayer(layer);
    }
  };

  // Tactical button base style
  const tacticalBtn = {
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontWeight: 800,
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
  };

  // Panel shadow for depth
  const panelShadow = '0 2px 8px rgba(0,0,0,0.25)';

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      flexDirection: 'column',
      background: COLORS.bgLight,
      color: COLORS.textPrimary,
      fontFamily: 'monospace, "Courier New", Courier',
      fontWeight: 700,
      overflow: 'hidden',
    }}>
      
      {/* ============ HEADER ============ */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 20px',
        background: COLORS.bgWhite,
        borderBottom: `4px solid ${COLORS.border}`,
        zIndex: 1000,
        height: '68px',
        boxShadow: panelShadow,
      }}>
        {/* Left: Vehicle Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: COLORS.bgWhite,
            border: `3px solid ${COLORS.border}`,
            padding: '10px 20px',
            clipPath: CLIP.chamfer,
          }}>
            <span style={{ 
              color: COLORS.textPrimary, 
              fontSize: '22px',
              fontWeight: 900,
              letterSpacing: '2px',
            }}>{VEHICLE.name}</span>
          </div>
          
          <div style={{ 
            background: COLORS.bgLight,
            border: `3px solid ${COLORS.borderLight}`,
            padding: '8px 16px',
            color: COLORS.textPrimary,
            fontSize: '16px',
            fontWeight: 800,
          }}>{VEHICLE.mode}</div>
          
          <div style={{ 
            background: VEHICLE.safetyStatus === 'ARMED' ? COLORS.warning : COLORS.bgLight,
            border: `3px solid ${VEHICLE.safetyStatus === 'ARMED' ? COLORS.warning : COLORS.borderLight}`,
            padding: '8px 16px',
            color: VEHICLE.safetyStatus === 'ARMED' ? '#fff' : COLORS.textPrimary,
            fontSize: '14px',
            fontWeight: 900,
            letterSpacing: '2px',
            clipPath: CLIP.chamfer,
          }}>{VEHICLE.safetyStatus}</div>
        </div>

        {/* Center: Emergency + Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button style={{
            ...tacticalBtn,
            background: COLORS.danger,
            color: '#fff',
            padding: '14px 36px',
            fontSize: '18px',
            fontWeight: 900,
            border: `3px solid #880000`,
            clipPath: CLIP.chamferLg,
            boxShadow: panelShadow,
          }}>◼ EMERGENCY</button>
          
          <div style={{ 
            background: COLORS.bgWhite, 
            border: `4px solid ${COLORS.border}`,
            padding: '12px 28px',
            color: COLORS.textPrimary,
            fontSize: '26px',
            fontWeight: 900,
            letterSpacing: '3px',
          }}>
            T+{formatTime(missionTime)}
          </div>
        </div>

        {/* Right: System Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* GPS */}
          <div style={{ 
            background: COLORS.bgWhite,
            border: `3px solid ${COLORS.success}`,
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              background: COLORS.success,
            }} />
            <span style={{ color: COLORS.textPrimary, fontSize: '16px', fontWeight: 900 }}>
              GPS:{VEHICLE.gpsLock}
            </span>
            <span style={{ color: COLORS.textMuted, fontSize: '14px', fontWeight: 700 }}>
              [{VEHICLE.satellites}]
            </span>
          </div>
          
          {/* Signal */}
          <div style={{ 
            background: COLORS.bgWhite,
            border: `3px solid ${COLORS.borderLight}`,
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
          }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{
                width: '6px',
                height: `${8 + i * 4}px`,
                background: i <= VEHICLE.signalStrength ? COLORS.textPrimary : COLORS.bgLight,
                border: `1px solid ${COLORS.borderLight}`,
              }} />
            ))}
          </div>
          
          {/* Aircraft Battery */}
          <div style={{ 
            background: COLORS.bgWhite,
            border: `3px solid ${VEHICLE.batteryAircraft > 30 ? COLORS.success : COLORS.danger}`,
            padding: '8px 14px',
            clipPath: CLIP.chamfer,
          }}>
            <span style={{ 
              color: VEHICLE.batteryAircraft > 30 ? COLORS.success : COLORS.danger, 
              fontSize: '18px',
              fontWeight: 900,
            }}>
              ⚡{VEHICLE.batteryAircraft}%
            </span>
          </div>
          
          {/* Controller Battery */}
          <div style={{ 
            background: COLORS.bgWhite,
            border: `3px solid ${COLORS.borderLight}`,
            padding: '8px 14px',
          }}>
            <span style={{ color: COLORS.textPrimary, fontSize: '16px', fontWeight: 800 }}>
              GCS:{VEHICLE.batteryController}%
            </span>
          </div>
          
          {/* Alert */}
          <button style={{
            ...tacticalBtn,
            background: COLORS.bgWhite,
            border: `3px solid ${COLORS.borderLight}`,
            padding: '10px 14px',
            color: COLORS.textPrimary,
            fontSize: '18px',
          }}>⚠</button>
        </div>
      </div>

      {/* ============ MAIN CONTENT ============ */}
      <div style={{ flex: 1, position: 'relative' }}>
        
        {/* MAP */}
        <MapContainer 
          center={[VEHICLE.lat, VEHICLE.lng]} 
          zoom={16} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer 
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <MapController center={[VEHICLE.lat, VEHICLE.lng]} zoom={mapZoom} />
          <DrawController 
            drawMode={drawMode} 
            color={getDrawModeColor(drawMode)}
            onCreated={handleDrawCreatedFromController}
            onDrawEnd={() => setDrawMode(null)}
          />
          
          <Polyline 
            positions={FLIGHT_PATH} 
            pathOptions={{ 
              color: COLORS.flightPath, 
              weight: 5, 
              dashArray: '15, 10',
              opacity: 1,
            }} 
          />
          
          <Polyline 
            positions={BREADCRUMB_TRAIL} 
            pathOptions={{ 
              color: COLORS.breadcrumb, 
              weight: 4,
              opacity: 1,
            }} 
          />
          
          <Marker position={[VEHICLE.lat, VEHICLE.lng]} icon={aircraftIcon} />
          
          {/* Drawing Layer - holds all drawn shapes */}
          <FeatureGroup ref={featureGroupRef} />
        </MapContainer>

        {/* ============ LEFT SIDEBAR ============ */}
        <div style={{
          position: 'absolute',
          left: '20px',
          top: '50%',
          transform: 'translateY(-65%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          zIndex: 1000,
        }}>
          {/* RTL */}
          <button onClick={() => alert('RTL')} style={{
            ...tacticalBtn,
            width: '88px',
            height: '80px',
            background: COLORS.bgWhite,
            border: `4px solid ${COLORS.warning}`,
            color: COLORS.warning,
            fontSize: '14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            clipPath: CLIP.chamferAll,
            boxShadow: panelShadow,
          }}>
            <span style={{ fontSize: '28px' }}>⌂</span>
            RTL
          </button>
          
          {/* PAUSE */}
          <button onClick={() => setIsPaused(true)} style={{
            ...tacticalBtn,
            width: '88px',
            height: '80px',
            background: isPaused ? COLORS.warning : COLORS.bgWhite,
            border: `4px solid ${COLORS.warning}`,
            color: isPaused ? '#fff' : COLORS.warning,
            fontSize: '14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            clipPath: CLIP.chamferAll,
            boxShadow: panelShadow,
          }}>
            <span style={{ fontSize: '24px' }}>▮▮</span>
            PAUSE
          </button>
          
          {/* EXEC */}
          <button onClick={() => setIsPaused(false)} style={{
            ...tacticalBtn,
            width: '88px',
            height: '80px',
            background: !isPaused ? COLORS.success : COLORS.bgWhite,
            border: `4px solid ${COLORS.success}`,
            color: !isPaused ? '#fff' : COLORS.success,
            fontSize: '14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            clipPath: CLIP.chamferAll,
            boxShadow: panelShadow,
          }}>
            <span style={{ fontSize: '28px' }}>▶</span>
            EXEC
          </button>
        </div>

        {/* ============ RIGHT SIDEBAR ============ */}
        <div style={{
          position: 'absolute',
          right: '20px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 1000,
        }}>
          {/* Sensor Modes */}
          {['TRK', 'POI', 'OBS'].map(mode => (
            <button 
              key={mode} 
              onClick={() => setActiveMode(activeMode === mode ? null : mode)}
              style={{
                ...tacticalBtn,
                width: '80px',
                height: '64px',
                background: activeMode === mode ? COLORS.selected : COLORS.bgWhite,
                border: `3px solid ${activeMode === mode ? COLORS.selected : COLORS.border}`,
                color: activeMode === mode ? '#fff' : COLORS.textPrimary,
                fontSize: '16px',
                clipPath: CLIP.chamfer,
                boxShadow: panelShadow,
              }}>{mode}</button>
          ))}
          
          {/* EO/IR */}
          <button style={{
            ...tacticalBtn,
            width: '80px',
            height: '64px',
            background: COLORS.info,
            border: `3px solid ${COLORS.info}`,
            color: '#fff',
            fontSize: '14px',
            fontWeight: 900,
            clipPath: CLIP.chamfer,
            boxShadow: panelShadow,
          }}>EO/IR</button>
          
          <div style={{ height: '10px' }} />
          
          {/* Record */}
          <button 
            onClick={() => {
              if (!isRecording) setRecordTime(0);
              setIsRecording(!isRecording);
            }}
            style={{
              ...tacticalBtn,
              width: '80px',
              height: '80px',
              background: isRecording ? COLORS.danger : COLORS.bgWhite,
              border: `4px solid ${isRecording ? COLORS.danger : COLORS.border}`,
              color: isRecording ? '#fff' : COLORS.danger,
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              boxShadow: panelShadow,
            }}>
            <span style={{ fontSize: '32px' }}>{isRecording ? '◼' : '●'}</span>
            {isRecording ? 'STOP' : 'REC'}
          </button>
          
          {isRecording && (
            <div style={{ 
              background: COLORS.bgWhite,
              border: `3px solid ${COLORS.danger}`,
              padding: '6px 10px',
              textAlign: 'center',
              color: COLORS.danger,
              fontSize: '16px',
              fontWeight: 900,
            }}>{formatTime(recordTime)}</div>
          )}
          
          <div style={{ height: '10px' }} />
          
          {/* Zoom */}
          <button 
            onClick={() => setMapZoom(z => Math.min(z + 1, 20))}
            style={{
              ...tacticalBtn,
              width: '80px',
              height: '56px',
              background: COLORS.bgWhite,
              border: `3px solid ${COLORS.border}`,
              borderBottom: 'none',
              color: COLORS.textPrimary,
              fontSize: '28px',
            }}>+</button>
          <button 
            onClick={() => setMapZoom(z => Math.max(z - 1, 3))}
            style={{
              ...tacticalBtn,
              width: '80px',
              height: '56px',
              background: COLORS.bgWhite,
              border: `3px solid ${COLORS.border}`,
              color: COLORS.textPrimary,
              fontSize: '28px',
            }}>−</button>
        </div>

        {/* ============ BOTTOM LEFT - Camera PIP ============ */}
        <div style={{
          position: 'absolute',
          left: '20px',
          bottom: '20px',
          width: '360px',
          background: COLORS.bgWhite,
          border: `4px solid ${COLORS.border}`,
          overflow: 'hidden',
          zIndex: 1000,
          clipPath: CLIP.chamferLg,
          boxShadow: panelShadow,
        }}>
          {/* Dark video area */}
          <div style={{
            width: '100%',
            height: '200px',
            background: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
            {/* No Feed Message */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              color: '#666',
            }}>
              <span style={{ fontSize: '32px' }}>⦻</span>
              <span style={{ 
                fontSize: '18px', 
                fontWeight: 900, 
                letterSpacing: '3px',
              }}>NO FEED</span>
            </div>
            
            {/* Recording indicator */}
            <div style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <div style={{ 
                width: '14px', 
                height: '14px', 
                background: isRecording ? COLORS.danger : '#444',
                animation: isRecording ? 'blink 1s infinite' : 'none',
              }} />
              <span style={{ 
                color: isRecording ? COLORS.danger : '#888',
                fontSize: '16px',
                fontWeight: 900,
              }}>
                {isRecording ? 'REC' : 'STBY'}
              </span>
            </div>
            
            {/* Camera label */}
            <div style={{
              position: 'absolute',
              top: '14px',
              left: '14px',
              color: '#666',
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: '1px',
            }}>
              CAM-01
            </div>
          </div>
          
          {/* Telemetry strip embedded in camera box */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '4px',
            padding: '8px 12px',
            background: COLORS.bgWhite,
            borderTop: `2px solid ${COLORS.borderLight}`,
          }}>
            {[
              { label: 'GS', value: VEHICLE.groundSpeed, unit: 'M/S' },
              { label: 'AS', value: VEHICLE.airSpeed, unit: 'M/S' },
              { label: 'VS', value: VEHICLE.verticalSpeed, unit: 'M/S' },
              { label: 'AGL', value: VEHICLE.altitudeAGL, unit: 'M' },
            ].map(item => (
              <div key={item.label} style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '10px', 
                  color: COLORS.textMuted, 
                  letterSpacing: '1px',
                  fontWeight: 800,
                }}>{item.label}</div>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 900, 
                  color: COLORS.textPrimary,
                  lineHeight: 1.1,
                }}>
                  {item.value}
                  <span style={{ fontSize: '10px', color: COLORS.textMuted, marginLeft: '2px' }}>{item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ============ BOTTOM RIGHT - Heading Indicator ============ */}
        <div style={{
          position: 'absolute',
          right: '116px',
          bottom: '20px',
          zIndex: 1000,
        }}>
          {/* Heading Indicator */}
          <div style={{
            width: '130px',
            height: '130px',
            background: COLORS.bgWhite,
            border: `4px solid ${COLORS.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: panelShadow,
          }}>
            {/* Corner markers */}
            <div style={{ position: 'absolute', top: 6, left: 6, width: '10px', height: '10px', borderTop: `3px solid ${COLORS.border}`, borderLeft: `3px solid ${COLORS.border}` }} />
            <div style={{ position: 'absolute', top: 6, right: 6, width: '10px', height: '10px', borderTop: `3px solid ${COLORS.border}`, borderRight: `3px solid ${COLORS.border}` }} />
            <div style={{ position: 'absolute', bottom: 6, left: 6, width: '10px', height: '10px', borderBottom: `3px solid ${COLORS.border}`, borderLeft: `3px solid ${COLORS.border}` }} />
            <div style={{ position: 'absolute', bottom: 6, right: 6, width: '10px', height: '10px', borderBottom: `3px solid ${COLORS.border}`, borderRight: `3px solid ${COLORS.border}` }} />
            
            {/* Compass markings */}
            <div style={{ position: 'absolute', top: '14px', color: COLORS.danger, fontSize: '16px', fontWeight: 900 }}>N</div>
            <div style={{ position: 'absolute', right: '14px', color: COLORS.textMuted, fontSize: '14px', fontWeight: 800 }}>E</div>
            <div style={{ position: 'absolute', bottom: '14px', color: COLORS.textMuted, fontSize: '14px', fontWeight: 800 }}>S</div>
            <div style={{ position: 'absolute', left: '14px', color: COLORS.textMuted, fontSize: '14px', fontWeight: 800 }}>W</div>
            
            {/* Heading value */}
            <div style={{
              fontSize: '36px',
              fontWeight: 900,
              color: COLORS.textPrimary,
            }}>{VEHICLE.heading}°</div>
            
            {/* Aircraft indicator */}
            <div style={{
              position: 'absolute',
              top: '32px',
              width: '0',
              height: '0',
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderBottom: `16px solid ${COLORS.aircraft}`,
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
            }} />
          </div>
        </div>

        {/* ============ DRAWING TOOLBAR (Bottom Center) ============ */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: 'calc(50% + 40px)',
          transform: 'translateX(-50%)',
          zIndex: 1001,
        }}>
          {showDrawTools ? (
            // Expanded toolbar
            <div style={{
              background: COLORS.bgWhite,
              border: `4px solid ${COLORS.border}`,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              clipPath: CLIP.chamferLg,
              boxShadow: panelShadow,
            }}>
              {/* Label */}
              <div style={{
                padding: '8px 16px',
                background: COLORS.bgLight,
                border: `2px solid ${COLORS.borderLight}`,
                fontSize: '14px',
                fontWeight: 900,
                letterSpacing: '2px',
                color: COLORS.textMuted,
                marginRight: '8px',
              }}>✎ DRAW</div>
              
              {/* Tool buttons */}
              {DRAW_TOOLS.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setDrawMode(drawMode === tool.id ? null : tool.id)}
                  style={{
                    ...tacticalBtn,
                    width: '72px',
                    height: '72px',
                    background: drawMode === tool.id ? tool.color : COLORS.bgWhite,
                    border: `3px solid ${tool.color}`,
                    color: drawMode === tool.id ? '#fff' : tool.color,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    clipPath: CLIP.chamfer,
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{tool.icon}</span>
                  <span style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.5px' }}>{tool.label}</span>
                </button>
              ))}
              
              {/* Divider */}
              <div style={{ width: '2px', height: '56px', background: COLORS.borderLight, margin: '0 8px' }} />
              
              {/* Done/Cancel */}
              <button
                onClick={() => {
                  setDrawMode(null);
                  setShowDrawTools(false);
                }}
                style={{
                  ...tacticalBtn,
                  width: '72px',
                  height: '72px',
                  background: COLORS.bgWhite,
                  border: `3px solid ${COLORS.borderLight}`,
                  color: COLORS.textPrimary,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  clipPath: CLIP.chamfer,
                }}
              >
                <span style={{ fontSize: '24px' }}>✕</span>
                <span style={{ fontSize: '10px', fontWeight: 900 }}>CLOSE</span>
              </button>
            </div>
          ) : (
            // Collapsed DRAW button
            <button
              onClick={() => setShowDrawTools(true)}
              style={{
                ...tacticalBtn,
                padding: '16px 32px',
                background: COLORS.bgWhite,
                border: `4px solid ${COLORS.border}`,
                color: COLORS.textPrimary,
                fontSize: '16px',
                fontWeight: 900,
                letterSpacing: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                clipPath: CLIP.chamferLg,
                boxShadow: panelShadow,
              }}
            >
              <span style={{ fontSize: '20px' }}>✎</span>
              DRAW
            </button>
          )}
        </div>

        {/* Active draw mode indicator */}
        {drawMode && (
          <div style={{
            position: 'absolute',
            top: '88px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: DRAW_TOOLS.find(t => t.id === drawMode)?.color,
            color: '#fff',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 900,
            letterSpacing: '2px',
            border: `3px solid ${COLORS.border}`,
            clipPath: CLIP.chamfer,
            boxShadow: panelShadow,
            zIndex: 1001,
          }}>
            DRAWING: {DRAW_TOOLS.find(t => t.id === drawMode)?.label} — TAP MAP TO PLACE
          </div>
        )}
      </div>
      
      {/* Keyframe for blinking + Button active states + Draw tool styles */}
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
        
        /* Tactical button press feedback */
        button {
          transition: transform 0.05s ease, filter 0.05s ease, box-shadow 0.05s ease;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        
        button:active {
          transform: scale(0.94) !important;
          filter: invert(1) !important;
          box-shadow: 0 0 0 4px #000, inset 0 0 20px rgba(0,0,0,0.3) !important;
        }
        
        /* Extra feedback for touch devices */
        @media (hover: none) {
          button:active {
            transform: scale(0.92) !important;
          }
        }
        
        /* ============ LEAFLET DRAW - TOUCH OPTIMIZED ============ */
        
        /* Hide default toolbar - we use custom buttons */
        .leaflet-draw-toolbar {
          display: none !important;
        }
        
        /* Keep edit/delete toolbar visible but enlarge */
        .leaflet-draw-edit-toolbar {
          display: block !important;
        }
        
        .leaflet-draw-edit-toolbar a {
          width: 48px !important;
          height: 48px !important;
          line-height: 48px !important;
          background-size: 24px 24px !important;
          background-position: center !important;
        }
        
        /* Larger edit handles for touch/gloves */
        .leaflet-editing-icon {
          width: 20px !important;
          height: 20px !important;
          margin-left: -10px !important;
          margin-top: -10px !important;
          background: #fff !important;
          border: 3px solid #000 !important;
          border-radius: 50% !important;
        }
        
        /* Vertex markers */
        .leaflet-marker-icon.leaflet-div-icon {
          width: 20px !important;
          height: 20px !important;
          margin-left: -10px !important;
          margin-top: -10px !important;
          background: #fff !important;
          border: 3px solid #000 !important;
          border-radius: 50% !important;
        }
        
        /* Middle markers for adding points */
        .leaflet-marker-icon.leaflet-div-icon.leaflet-editing-icon.leaflet-edit-move {
          background: #ccc !important;
          border-color: #666 !important;
        }
        
        /* Draw tooltip styling */
        .leaflet-draw-tooltip {
          background: #fff !important;
          border: 2px solid #000 !important;
          color: #000 !important;
          font-family: monospace !important;
          font-weight: 700 !important;
          font-size: 14px !important;
          padding: 8px 12px !important;
        }
        
        .leaflet-draw-tooltip-single {
          margin-top: -12px !important;
        }
        
        /* Error tooltips */
        .leaflet-error-draw-tooltip {
          background: #cc0000 !important;
          color: #fff !important;
          border-color: #880000 !important;
        }
      `}</style>
    </div>
  );
}
