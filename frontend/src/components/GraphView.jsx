import { motion, AnimatePresence } from 'framer-motion'
import { useMemo, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Minus, Plus, RotateCcw } from 'lucide-react'
import { fetchRoadGeometry } from '../services/routeGeometry'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// ── Node coordinates (real Indian hub lat/lon) ────────────────────────────
const NODE_MAP = {
  Delhi_Hub:         { lon: 77.2090, lat: 28.6139, label: 'Delhi'        },
  Mumbai_Hub:        { lon: 72.8777, lat: 19.0760, label: 'Mumbai'       },
  Bangalore_Hub:     { lon: 77.5946, lat: 12.9716, label: 'Bangalore'    },
  Chennai_Hub:       { lon: 80.2707, lat: 13.0827, label: 'Chennai'      },
  Kolkata_Hub:       { lon: 88.3639, lat: 22.5726, label: 'Kolkata'      },
  Hyderabad_Hub:     { lon: 78.4867, lat: 17.3850, label: 'Hyderabad'    },
  Pune_Hub:          { lon: 73.8567, lat: 18.5204, label: 'Pune'         },
  Ahmedabad_Hub:     { lon: 72.5714, lat: 23.0225, label: 'Ahmedabad'    },
  Jaipur_Hub:        { lon: 75.7873, lat: 26.9124, label: 'Jaipur'       },
  Lucknow_Hub:       { lon: 80.9462, lat: 26.8467, label: 'Lucknow'      },
  Surat_Hub:         { lon: 72.8311, lat: 21.1702, label: 'Surat'        },
  Nashik_Hub:        { lon: 73.7898, lat: 19.9975, label: 'Nashik'       },
  Nagpur_Hub:        { lon: 79.0882, lat: 21.1458, label: 'Nagpur'       },
  Navi_Mumbai_DC:    { lon: 73.0297, lat: 19.0330, label: 'Navi Mumbai'  },
  Indore_Hub:        { lon: 75.8577, lat: 22.7196, label: 'Indore'       },
  Bhopal_Hub:        { lon: 77.4126, lat: 23.2599, label: 'Bhopal'       },
  Coimbatore_Hub:    { lon: 76.9558, lat: 11.0168, label: 'Coimbatore'   },
  Visakhapatnam_Hub: { lon: 83.2185, lat: 17.6868, label: 'Vizag'        },
  Patna_Hub:         { lon: 85.1376, lat: 25.5941, label: 'Patna'        },
  Kochi_Hub:         { lon: 76.2673, lat: 9.9312,  label: 'Kochi'        },
  Faridabad_DC:      { lon: 77.3132, lat: 28.4089, label: 'Faridabad'    },
  Udaipur_DC:        { lon: 73.7125, lat: 24.5854, label: 'Udaipur'      },
  Belgaum_DC:        { lon: 74.5045, lat: 15.8497, label: 'Belgaum'      },
  Mangalore_DC:      { lon: 74.8560, lat: 12.9141, label: 'Mangalore'    },
}

const CARGO_OPTIONS = [
  { id: 'Standard',         label: 'Standard Cargo' },
  { id: 'Electronics',      label: 'Electronics (Dry)' },
  { id: 'Pharmaceuticals',  label: 'Pharmaceuticals (Cold)' },
  { id: 'Perishable Goods', label: 'Perishable Goods' },
  { id: 'Heavy Machinery',  label: 'Heavy Machinery' },
  { id: 'Textiles',         label: 'Textiles & Garments' },
  { id: 'Chemicals',        label: 'Chemicals (Hazmat)' },
  { id: 'Automotive Parts', label: 'Automotive Parts' },
]

// ── Edges — background network display only ──────────────────────────────
// NOTE: These edges are used ONLY for drawing the grey background network.
// The active route path is drawn separately from route.path directly,
// so direction mismatches here do NOT affect route highlighting.
const EDGE_PAIRS = [
  ['Pune_Hub',       'Mumbai_Hub'],
  ['Pune_Hub',       'Nashik_Hub'],
  ['Pune_Hub',       'Bangalore_Hub'],
  ['Pune_Hub',       'Hyderabad_Hub'],
  ['Nashik_Hub',     'Mumbai_Hub'],
  ['Nashik_Hub',     'Surat_Hub'],
  ['Surat_Hub',      'Navi_Mumbai_DC'],
  ['Navi_Mumbai_DC', 'Mumbai_Hub'],
  ['Mumbai_Hub',     'Ahmedabad_Hub'],
  ['Mumbai_Hub',     'Pune_Hub'],
  ['Ahmedabad_Hub',  'Surat_Hub'],
  ['Ahmedabad_Hub',  'Jaipur_Hub'],
  ['Ahmedabad_Hub',  'Indore_Hub'],
  ['Delhi_Hub',      'Jaipur_Hub'],
  ['Delhi_Hub',      'Lucknow_Hub'],
  ['Delhi_Hub',      'Bhopal_Hub'],
  ['Lucknow_Hub',    'Patna_Hub'],
  ['Lucknow_Hub',    'Bhopal_Hub'],
  ['Kolkata_Hub',    'Patna_Hub'],
  ['Kolkata_Hub',    'Visakhapatnam_Hub'],
  ['Chennai_Hub',    'Bangalore_Hub'],
  ['Bangalore_Hub',  'Chennai_Hub'],
  ['Chennai_Hub',    'Visakhapatnam_Hub'],
  ['Bangalore_Hub',  'Hyderabad_Hub'],
  ['Hyderabad_Hub',  'Bangalore_Hub'],
  ['Bangalore_Hub',  'Kochi_Hub'],
  ['Bangalore_Hub',  'Coimbatore_Hub'],
  ['Hyderabad_Hub',  'Visakhapatnam_Hub'],
  ['Hyderabad_Hub',  'Nagpur_Hub'],
  ['Hyderabad_Hub',  'Chennai_Hub'],
  ['Hyderabad_Hub',  'Pune_Hub'],
  ['Coimbatore_Hub', 'Chennai_Hub'],
  ['Kochi_Hub',      'Coimbatore_Hub'],
  ['Nagpur_Hub',     'Hyderabad_Hub'],
  ['Nagpur_Hub',     'Bhopal_Hub'],
  ['Nagpur_Hub',     'Kolkata_Hub'],
  ['Nagpur_Hub',     'Pune_Hub'],
  ['Bhopal_Hub',     'Indore_Hub'],
  ['Indore_Hub',     'Ahmedabad_Hub'],
  ['Jaipur_Hub',     'Delhi_Hub'],
  ['Jaipur_Hub',     'Ahmedabad_Hub'],
  ['Patna_Hub',      'Kolkata_Hub'],
  ['Visakhapatnam_Hub', 'Chennai_Hub'],
  ['Visakhapatnam_Hub', 'Hyderabad_Hub'],
]

// ── Leaflet Controls ────────────────────────────────────────────────────────
function MapController({ routePath, activeCoords }) {
  const map = useMap()
  const lastFlownRoute = useRef('')

  useEffect(() => {
    const currentSig = routePath?.join('|') || ''
    if (activeCoords && activeCoords.length > 0 && lastFlownRoute.current !== currentSig) {
      lastFlownRoute.current = currentSig
      const lats = activeCoords.map(c => c[1])
      const lons = activeCoords.map(c => c[0])
      const bounds = [
        [Math.min(...lats) - 0.5, Math.min(...lons) - 0.5],
        [Math.max(...lats) + 0.5, Math.max(...lons) + 0.5]
      ]
      map.flyToBounds(bounds, { duration: 1.5, padding: [20, 20], maxZoom: 12 })
    }
  }, [routePath?.join('|'), activeCoords, map])

  return null
}

function CustomZoomControl() {
  const map = useMap()
  const [z, setZ] = useState(map.getZoom())
  
  useEffect(() => {
    const onZoom = () => setZ(map.getZoom())
    map.on('zoomend', onZoom)
    return () => map.off('zoomend', onZoom)
  }, [map])

  return (
    <div
      data-map-control
      className="absolute left-2 top-1/2 z-[1000] flex -translate-y-1/2 flex-col gap-1 rounded-lg border border-slate-600/80 bg-slate-900/90 p-1 shadow-lg"
    >
      <div
        className="mb-0.5 rounded px-1.5 py-0.5 text-center text-[8px] font-bold uppercase tracking-wider text-emerald-400"
        style={{ borderBottom: '1px solid rgba(52,211,153,0.25)' }}
      >
        Satellite
      </div>
      <button
        type="button"
        title="Zoom in"
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-200 hover:bg-slate-700"
        onClick={() => map.zoomIn()}
      >
        <Plus size={16} />
      </button>
      <button
        type="button"
        title="Zoom out"
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-200 hover:bg-slate-700"
        onClick={() => map.zoomOut()}
      >
        <Minus size={16} />
      </button>
      <button
        type="button"
        title="Reset zoom & pan"
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-700 hover:text-slate-200"
        onClick={() => map.setView([22.0, 79.0], 5)}
      >
        <RotateCcw size={14} />
      </button>
      <div className="px-1 pb-0.5 text-center font-mono text-[9px] text-slate-500">
        {Math.round((z / 18) * 100)}%
      </div>
      <div className="max-w-[4.5rem] px-0.5 pb-1 text-center text-[7px] leading-snug text-slate-500">
        Scroll wheel zoom · drag map to pan
      </div>
    </div>
  )
}

function buildVariantExplanation(selected, best) {
  if (!best || !selected || selected.id === best.id) {
    return (
      'Default is the fastest driving option from OpenRouteService for this hub sequence. ' +
      'Shorter driving time generally means lower fuel and driver hours for long-haul freight.'
    )
  }
  const dMin = (selected.duration_sec - best.duration_sec) / 60
  const dKm = (selected.distance_m - best.distance_m) / 1000
  const parts = []
  if (dMin >= 1) parts.push(`About ${Math.round(dMin)} minutes longer than the best route`)
  else if (dMin > 0.05) parts.push(`Roughly ${Math.round(dMin * 60)} seconds longer`)
  if (dKm >= 0.5) parts.push(`Approximately ${dKm.toFixed(1)} km more distance`)
  if (parts.length === 0)
    parts.push('Very similar ETA; this path uses different highway links on the same road network')
  parts.push(
    'Not chosen as default because InsureRoute prioritizes minimum driving duration for fleet planning on this waypoint order.',
  )
  return parts.join('. ') + '.'
}

function CustomDropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(o => o.id === value)

  return (
    <div className="relative w-full" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full h-9 text-[11px] rounded-lg px-3 flex justify-between items-center transition-all shadow-sm group outline-none"
        style={{ 
          background: 'rgba(30, 41, 59, 0.4)', 
          border: '1px solid rgba(148, 163, 184, 0.2)', 
          color: '#f1f5f9'
        }}
      >
        <span className="font-semibold text-slate-200 group-hover:text-white transition-colors truncate pr-2">
          {selectedOption?.label ?? 'Select Terminal...'}
        </span>
        <svg width="8" height="6" viewBox="0 0 10 6" fill="none" className={`flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-indigo-400' : 'text-slate-500'}`}>
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <motion.div 
          initial={{ opacity: 0, y: -5, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute z-[1001] w-full top-full mt-2 py-1.5 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md max-h-48 overflow-y-auto custom-scrollbar"
          style={{ 
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)', 
          }}
        >
          {options.map(opt => (
            <div
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false) }}
              className="px-3 py-2 text-xs font-medium cursor-pointer hover:bg-indigo-500/20 text-slate-200 transition-colors truncate"
              style={{ background: opt.id === value ? 'rgba(99,102,241,0.15)' : 'transparent' }}
            >
              {opt.label}
            </div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

export default function GraphView({ nodes = [], edges = [], route = null, params, setParams, loading }) {
  // All hubs on the map: API nodes (full graph) + NODE_MAP labels + any id on active route.path
  const allNodes = useMemo(() => {
    const fromApi = new Map(nodes.map(n => [n.id, n]))
    const ids = new Set([
      ...Object.keys(NODE_MAP),
      ...(route?.path ?? []),
      ...nodes.map(n => n.id),
    ])
    return [...ids].map(id => {
      const api = fromApi.get(id)
      const meta = NODE_MAP[id]
      const lon = Number(api?.lon ?? meta?.lon ?? 77.0)
      const lat = Number(api?.lat ?? meta?.lat ?? 20.0)
      const label = (meta?.label ?? api?.label ?? id.replace(/_/g, ' '))
        .replace(/\s+Hub$/i, '')
        .replace(/\s+DC$/i, '')
      return { id, lon, lat, label }
    })
  }, [nodes, route?.path])

  const nodesById = useMemo(() => {
    const m = {}
    allNodes.forEach(n => { m[n.id] = n })
    return m
  }, [allNodes])

  const routeNodeSet = useMemo(() => new Set(route?.path ?? []), [route])
  const disrupted = route?.disruption_detected ?? false

  const [routeVariants, setRouteVariants] = useState([])
  const [selectedVariantId, setSelectedVariantId] = useState('best')
  const [lineMode, setLineMode] = useState('idle') // 'road' | 'fallback' | 'idle'
  const [lineMessage, setLineMessage] = useState(null)
  const [isRouteMenuExpanded, setIsRouteMenuExpanded] = useState(true) // initially true
  const fetchAbortRef = useRef(null)
  const prevSelectionRef = useRef({ origin: '', destination: '', cargoType: '' })

  // ── Auto-close dropdown when all 3 fields are filled ───────────────────
  useEffect(() => {
    const prev = prevSelectionRef.current
    const allFilled = params?.origin && params?.destination && params?.cargoType
    const justCompleted = allFilled && (
      !prev.origin || !prev.destination || !prev.cargoType ||
      prev.origin !== params.origin || prev.destination !== params.destination || prev.cargoType !== params.cargoType
    )
    prevSelectionRef.current = {
      origin: params?.origin || '',
      destination: params?.destination || '',
      cargoType: params?.cargoType || '',
    }
    if (justCompleted && isRouteMenuExpanded) {
      const t = setTimeout(() => setIsRouteMenuExpanded(false), 800)
      return () => clearTimeout(t)
    }
  }, [params?.origin, params?.destination, params?.cargoType, isRouteMenuExpanded])

  const bestVariant = useMemo(
    () => routeVariants.find(v => v.is_best) || routeVariants[0] || null,
    [routeVariants],
  )
  const selectedVariant = useMemo(
    () => routeVariants.find(v => v.id === selectedVariantId) || bestVariant,
    [routeVariants, selectedVariantId, bestVariant],
  )

  const activeCoords = useMemo(() => selectedVariant?.coordinates ?? [], [selectedVariant])

  const allEdges = useMemo(() => {
    return EDGE_PAIRS.map(([source, target]) => ({ source, target }))
  }, [])
  // Fetch road geometry (ORS) whenever the ordered path changes
  useEffect(() => {
    const path = route?.path
    if (!path || path.length < 2) {
      setRouteVariants([])
      setSelectedVariantId('best')
      setLineMode('idle')
      setLineMessage(null)
      return
    }
    fetchAbortRef.current?.abort()
    const ac = new AbortController()
    fetchAbortRef.current = ac
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetchRoadGeometry(path, ac.signal)
        if (cancelled) return
        const coords = Array.isArray(res.coordinates) ? res.coordinates : []
        let variants = Array.isArray(res.variants) ? res.variants : []
        if (coords.length >= 2 && !variants.length) {
          variants = [
            {
              id: 'best',
              label: 'Hub connector',
              coordinates: coords,
              duration_sec: 0,
              distance_m: 0,
              is_best: true,
            },
          ]
        }
        if (variants.length >= 1 && variants[0].coordinates?.length >= 2) {
          setRouteVariants(variants)
          setSelectedVariantId('best')
          setLineMode(res.mode === 'road' ? 'road' : 'fallback')
          setLineMessage(res.message || null)
        } else {
          const ll = path
            .map(id => {
              const hit = nodes.find(n => n.id === id)
              const meta = NODE_MAP[id]
              const lon = Number(hit?.lon ?? meta?.lon)
              const lat = Number(hit?.lat ?? meta?.lat)
              if (Number.isNaN(lon) || Number.isNaN(lat)) return null
              return [lon, lat]
            })
            .filter(Boolean)
          if (ll.length >= 2) {
            setRouteVariants([{ id: 'best', label: 'Hub connector', coordinates: ll, duration_sec: 0, distance_m: 0, is_best: true }])
            setSelectedVariantId('best')
            setLineMode('fallback')
            setLineMessage(res.message || 'WARNING: Optimized route unavailable (API missing)')
          } else {
            setRouteVariants([])
            setLineMode('fallback')
            setLineMessage('WARNING: Optimized route unavailable')
          }
        }
      } catch (e) {
        if (e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError' || e?.name === 'AbortError') return
        if (cancelled) return
        const ll = path
          .map(id => {
            const hit = nodes.find(n => n.id === id)
            const meta = NODE_MAP[id]
            const lon = Number(hit?.lon ?? meta?.lon)
            const lat = Number(hit?.lat ?? meta?.lat)
            if (Number.isNaN(lon) || Number.isNaN(lat)) return null
            return [lon, lat]
          })
          .filter(Boolean)
        if (ll.length >= 2) {
          setRouteVariants([{ id: 'best', label: 'Hub connector', coordinates: ll, duration_sec: 0, distance_m: 0, is_best: true }])
          setSelectedVariantId('best')
          setLineMode('fallback')
          setLineMessage('WARNING: Optimized route unavailable')
        } else {
          setRouteVariants([])
          setLineMode('fallback')
          setLineMessage('WARNING: Optimized route unavailable')
        }
      }
    })()
    return () => {
      cancelled = true
      ac.abort()
    }
  }, [route?.path, nodes])

  function nodeColor(id) {
    if (id === params?.origin)      return '#f0f9ff'
    if (id === params?.destination) return '#4ade80'
    if (routeNodeSet.has(id))       return disrupted ? '#f87171' : '#fbbf24'
    return 'rgba(148,163,184,0.55)'
  }

  // All node IDs for select dropdowns
  const nodeIds = Object.keys(NODE_MAP)

  return (
    <div className="glass p-4 flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-text">Supply Chain Network</span>
          <span className="text-xs text-muted font-medium">India logistics routing — satellite view</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700">
          <Legend color="#f0f9ff"  label="Origin" />
          <Legend color="#4ade80"  label="Destination" />
          <Legend color={disrupted ? '#f87171' : '#fbbf24'} label={disrupted ? 'Disrupted' : 'Active Route'} />
          <Legend color="rgba(148,163,184,0.55)" label="Idle Hub" />
        </div>
      </div>

      {/* Map Area */}
      <div
        className="relative flex-1 w-full rounded-xl overflow-hidden bg-slate-950"
        style={{ minHeight: 300 }}
      >
        {/* Invisible SVG for definitions (glows, gradients) so Leaflet can use them */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <filter id="node-glow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-route-line">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="route-risk-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={disrupted ? '#fca5a5' : '#34d399'} />
              <stop offset="50%" stopColor={disrupted ? '#f87171' : '#fbbf24'} />
              <stop offset="100%" stopColor={disrupted ? '#ef4444' : '#fb923c'} />
            </linearGradient>
          </defs>
        </svg>

        <MapContainer 
          center={[22.0, 79.0]} 
          zoom={5} 
          zoomControl={false}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%', background: '#020817', zIndex: 0 }}
          attributionControl={false}
        >
          <MapController routePath={route?.path} activeCoords={activeCoords} />
          
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            className="esri-base-layer"
          />

          {/* Dark Overlay Layer */}
          <div
            className="leaflet-overlay-pane pointer-events-none"
            style={{
              position: 'absolute', inset: 0, zIndex: 300,
              background: 'linear-gradient(135deg, rgba(2,8,23,0.14) 0%, rgba(15,23,42,0.1) 50%, rgba(2,6,23,0.12) 100%)',
            }}
          />

          {/* Grid Lines (CSS grid overlay since map is dynamic) */}
          <div className="absolute inset-0 w-full h-full pointer-events-none z-[350]" style={{ opacity: 0.06 }}>
            <svg className="w-full h-full">
              {[...Array(8)].map((_, i) => (
                <line key={`v${i}`} x1={`${(i + 1) * 12.5}%`} y1="0" x2={`${(i + 1) * 12.5}%`} y2="100%" stroke="#bae6fd" strokeWidth="0.5" />
              ))}
              {[...Array(5)].map((_, i) => (
                <line key={`h${i}`} x1="0" y1={`${(i + 1) * 16.6}%`} x2="100%" y2={`${(i + 1) * 16.6}%`} stroke="#bae6fd" strokeWidth="0.5" />
              ))}
            </svg>
          </div>

          {/* Background network edges */}
          {allEdges.map((e, i) => {
            const s = nodesById[e.source]
            const t = nodesById[e.target]
            if (!s || !t) return null
            return (
              <Polyline
                key={i}
                positions={[[s.lat, s.lon], [t.lat, t.lon]]}
                pathOptions={{
                  color: 'rgba(148,163,184,0.25)',
                  weight: 1.5,
                  opacity: 0.5,
                  lineCap: 'round'
                }}
              />
            )
          })}

          {/* Active Route */}
          {activeCoords.length >= 2 && (
            <Polyline
              key={`${(route?.path ?? []).join('|')}#${selectedVariantId}`}
              positions={activeCoords.map(c => [c[1], c[0]])}
              pathOptions={{
                color: lineMode === 'road'
                  ? (selectedVariantId !== 'best' ? '#c4b5fd' : 'url(#route-risk-gradient)')
                  : '#888888',
                weight: lineMode === 'road' ? 3.4 : 2.2,
                dashArray: lineMode === 'road' ? undefined : '6, 6',
                className: lineMode === 'road' ? 'glow-route-line' : '',
                opacity: 0.95
              }}
            />
          )}

          {/* Nodes */}
          {allNodes.map(n => {
            const isKey = routeNodeSet.has(n.id)
            const isOrigin = n.id === params?.origin
            const isDest   = n.id === params?.destination
            const r = isOrigin || isDest ? 7 : isKey ? 5.5 : 3
            const color = nodeColor(n.id)
            
            return (
              <CircleMarker
                key={n.id}
                center={[n.lat, n.lon]}
                radius={r}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 1,
                  color: isKey ? '#fff' : 'rgba(255,255,255,0.2)',
                  weight: isKey ? 1.5 : 0.5,
                  className: isKey ? 'glow-node' : ''
                }}
              >
                {/* Pulse ring for key nodes */}
                {(isOrigin || isDest) && (
                  <CircleMarker
                    center={[n.lat, n.lon]}
                    radius={r + 5}
                    pathOptions={{
                      fill: false,
                      color: isDest ? '#4ade80' : '#f0f9ff',
                      weight: 1,
                      opacity: 0.4
                    }}
                    interactive={false}
                  />
                )}
                {isKey && (
                  <Tooltip 
                    permanent 
                    direction="top" 
                    className="custom-hub-tooltip" 
                    offset={[0, -10]}
                  >
                    {n.label}
                  </Tooltip>
                )}
              </CircleMarker>
            )
          })}
          
          <CustomZoomControl />
        </MapContainer>
        {/* Route info overlay — Bookmark Tab style */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center">
          {/* Main Tab */}
          <button 
             onClick={() => setIsRouteMenuExpanded(!isRouteMenuExpanded)}
             className="glass-dark px-5 py-2.5 rounded-t-none rounded-b-xl border-t-0 shadow-lg flex items-center gap-3 hover:bg-slate-800/80 transition-colors"
          >
             <span className="font-bold text-slate-200 text-xs tracking-wide">
                {params?.origin?.replace(/_/g, ' ') || 'Start Terminal'} 
                <span className="text-indigo-400 mx-2">→</span> 
                {params?.destination?.replace(/_/g, ' ') || 'End Terminal'}
             </span>
             {params?.cargoType && params.cargoType !== 'Standard' && (
               <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">
                 {params.cargoType}
               </span>
             )}
             <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`transition-transform duration-300 ${isRouteMenuExpanded ? 'rotate-180 text-indigo-400' : 'text-slate-400'}`}>
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
          </button>

          {/* Expanded Menu */}
          <AnimatePresence>
            {isRouteMenuExpanded && (
               <motion.div
                 initial={{ opacity: 0, y: -10, scale: 0.95 }}
                 animate={{ opacity: 1, y: 5, scale: 1 }}
                 exit={{ opacity: 0, y: -10, scale: 0.95 }}
                 className="glass-dark p-4 text-xs space-y-4 w-72 mt-2 relative"
                 style={{
                   boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
                 }}
               >
                 {/* Loading Overlay */}
                 <AnimatePresence>
                   {loading && (
                     <motion.div
                       initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                       className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-[1050] flex flex-col items-center justify-center text-center p-4 rounded-[1.5rem]"
                     >
                       <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                       <span className="font-bold text-indigo-300 text-[10px] uppercase tracking-wider mb-1">
                         Algorithm Running
                       </span>
                       <span className="text-slate-400 font-medium text-[9px]">
                         Finding best route & optimizing value constraints...
                       </span>
                     </motion.div>
                   )}
                 </AnimatePresence>

                 {/* Route selectors (Normal Professional Style) */}
                 {params && setParams && (
                   <div className="flex flex-col gap-2 p-1">
                     <div className="text-slate-400 font-bold tracking-wider uppercase text-[10px] flex justify-between items-center mb-1">
                       <span>Configure Transit Terminals</span>
                       <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                     </div>
                     <div className="flex flex-col gap-2.5 relative">
                       <CustomDropdown
                         value={params.origin}
                         onChange={val => setParams({ ...params, origin: val })}
                         options={nodeIds.map(id => ({ id, label: NODE_MAP[id]?.label ?? id.replace('_Hub', '') }))}
                       />
                       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none flex items-center justify-center">
                         <div className="bg-slate-800 p-1.5 rounded-full shadow-inner border border-slate-700/50">
                           <svg width="8" height="8" viewBox="0 0 10 6" fill="none" className="rotate-0 text-indigo-400">
                             <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                           </svg>
                         </div>
                       </div>
                       <CustomDropdown
                         value={params.destination}
                         onChange={val => setParams({ ...params, destination: val })}
                         options={nodeIds.map(id => ({ id, label: NODE_MAP[id]?.label ?? id.replace('_Hub', '') }))}
                       />
                     </div>
                   </div>
                 )}

                 {/* Cargo Configuration */}
                 {params && setParams && (
                   <div className="flex flex-col gap-2 p-1">
                     <div className="text-slate-400 font-bold tracking-wider uppercase text-[10px] flex justify-between items-center mb-1">
                       <span>Cargo Profile</span>
                       <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                     </div>
                     <CustomDropdown
                       value={params.cargoType}
                       onChange={val => setParams({ ...params, cargoType: val })}
                       options={CARGO_OPTIONS}
                     />
                     <div className="text-[9px] text-slate-500 font-medium px-1">
                       {params.cargoType === 'Standard' && 'General transit tracking active.'}
                       {params.cargoType === 'Electronics' && 'Risk amplified by High Humidity & Rain.'}
                       {params.cargoType === 'Pharmaceuticals' && 'Strict Temperature & Heat monitoring.'}
                       {params.cargoType === 'Perishable Goods' && 'Temperature & Delay sensitivity active.'}
                       {params.cargoType === 'Heavy Machinery' && 'Crosswind & Storm warnings prioritized.'}
                       {params.cargoType === 'Textiles' && 'Moisture absorption & humidity risk active.'}
                       {params.cargoType === 'Chemicals' && 'Temperature reaction & spill risk tracking.'}
                       {params.cargoType === 'Automotive Parts' && 'Corrosion & precision alignment monitoring.'}
                     </div>
                   </div>
                 )}

                 {route && (
                   <>
                     <div className="w-full h-px" style={{ background: 'rgba(99,102,241,0.2)' }} />

                     <div className="flex justify-between items-center text-[11px] font-medium text-slate-400">
                       <span className="flex items-center gap-1">
                         <span className="w-1 h-1 rounded-full bg-indigo-400" />
                         {route.total_time_hrs} hrs
                       </span>
                       <span className="flex items-center gap-1">
                         <span className="w-1 h-1 rounded-full bg-indigo-400" />
                         {route.total_distance_km} km
                       </span>
                       <span className="text-emerald-400 font-bold">
                         ₹{(route.total_cost_inr ?? 0).toLocaleString('en-IN')}
                       </span>
                     </div>

                     {route.rerouted && (
                       <div
                         className="font-bold flex items-center gap-2 mt-1 px-2.5 py-1.5 rounded-lg text-[10px]"
                         style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.2)' }}
                       >
                         <AlertTriangle size={12} className="text-red-400" /> 
                         <span>Disrupted Route ({route.hops} hops)</span>
                       </div>
                     )}

                     {lineMode === 'road' && routeVariants.length > 1 && (
                       <div className="mt-2 space-y-2 border-t border-indigo-500/20 pt-2">
                         <div className="text-slate-400 font-bold tracking-wider uppercase text-[9px]">Driving topology</div>
                         <div className="flex flex-wrap gap-1">
                           {routeVariants.map(v => (
                             <button
                               key={v.id}
                               type="button"
                               onClick={() => setSelectedVariantId(v.id)}
                               className={`rounded-md px-2 py-1 text-[9px] font-bold transition-all ${
                                 selectedVariantId === v.id
                                   ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                   : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                               }`}
                             >
                               {v.label}
                             </button>
                           ))}
                         </div>
                         {selectedVariant && bestVariant && (
                           <div className="rounded-lg bg-slate-900/60 p-2 text-[10px] leading-relaxed text-slate-300 border border-slate-700/30">
                             {selectedVariant.duration_sec > 0 && (
                               <div className="mb-1 font-mono text-indigo-300/80">
                                 ~{Math.round(selectedVariant.duration_sec / 60)} min · {(selectedVariant.distance_m / 1000).toFixed(1)} km
                               </div>
                             )}
                             {buildVariantExplanation(selectedVariant, bestVariant)}
                           </div>
                         )}
                       </div>
                     )}
                   </>
                 )}
               </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

        {lineMode === 'fallback' && lineMessage && route?.path?.length >= 2 && (
          <div
            className="absolute bottom-2 left-14 right-2 sm:right-auto max-w-md text-[10px] font-semibold px-2.5 py-1.5 rounded-lg z-10"
            style={{
              background: 'rgba(2,8,23,0.88)',
              border: '1px solid rgba(251,191,36,0.35)',
              color: '#fde68a',
            }}
          >
            {lineMessage}
          </div>
        )}
        {lineMode === 'road' && (
          <div
            className="absolute bottom-2 left-14 text-[9px] font-bold px-2 py-0.5 rounded z-10 uppercase tracking-wider"
            style={{
              background: 'rgba(2,8,23,0.75)',
              border: '1px solid rgba(45,212,191,0.35)',
              color: '#5eead4',
            }}
          >
            Road routing · OpenRouteService
          </div>
        )}
      </div>
  )
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full" style={{ background: color, border: '1px solid rgba(255,255,255,0.2)' }} />
      <span>{label}</span>
    </div>
  )
}
