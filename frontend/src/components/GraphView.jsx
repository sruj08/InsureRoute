import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { ComposableMap, Geographies, Geography, Marker, Line as RSMLine, ZoomableGroup } from 'react-simple-maps'

const WORLD_TOPOJSON = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"

export default function GraphView({ nodes = [], edges = [], route = null, params, setParams }) {

  const pathSet = useMemo(() => {
    if (!route?.path) return new Set()
    const s = new Set()
    for (let i = 0; i < route.path.length - 1; i++) {
      s.add(`${route.path[i]}|${route.path[i + 1]}`)
      s.add(`${route.path[i + 1]}|${route.path[i]}`)
    }
    return s
  }, [route])

  const routeNodeSet = useMemo(() => new Set(route?.path ?? []), [route])
  const disrupted    = route?.disruption_detected ?? false

  // ── Styling ──
  function edgeColor(src, tgt) {
    if (pathSet.has(`${src}|${tgt}`)) return disrupted ? '#ef4444' : '#eab308' 
    return '#cbd5e1'
  }
  function edgeWidth(src, tgt) { return pathSet.has(`${src}|${tgt}`) ? 3 : 1 }

  function nodeColor(id) {
    if (id === route?.origin)      return '#0f172a'
    if (id === route?.destination) return '#22c55e'
    if (routeNodeSet.has(id))      return disrupted ? '#ef4444' : '#eab308'
    return '#94a3b8'
  }

  // Combine nodes by id for quick lookup
  const nodesMap = useMemo(() => {
    const m = {}
    nodes.forEach(n => { m[n.id] = n })
    return m
  }, [nodes])

  return (
    <div className="glass p-4 flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-text">Supply Chain Network</span>
          <span className="text-xs text-muted font-medium">Real-time topological routing graph</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <Legend color="#0f172a" label="Origin" />
          <Legend color="#22c55e" label="Destination" />
          <Legend color={disrupted ? '#ef4444' : '#eab308'} label={disrupted ? 'Disrupted Route' : 'Active Route'} />
          <Legend color="#cbd5e1" label="Idle Hub" />
        </div>
      </div>

      {/* Map Area */}
      <div className="relative flex-1 w-full rounded-lg bg-[#f0f9ff]/30 border border-slate-200 overflow-hidden">
        
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 1100, center: [80, 22] }}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup zoom={1} minZoom={0.5} maxZoom={4}>
            {/* Base Map */}
            <Geographies geography={WORLD_TOPOJSON}>
              {({ geographies }) =>
                geographies.map(geo => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#e2e8f0"
                    stroke="#cbd5e1"
                    strokeWidth={1}
                    style={{
                      default: { outline: "none" },
                      hover:   { fill: "#e2e8f0", outline: "none", cursor: "default" },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>

            {/* Edges */}
            {edges.map((e, i) => {
              const s = nodesMap[e.source]
              const t = nodesMap[e.target]
              if (!s || !t) return null
              const isActive = pathSet.has(`${e.source}|${e.target}`)
              return (
                <RSMLine
                  key={i}
                  from={[s.lon, s.lat]}
                  to={[t.lon, t.lat]}
                  stroke={edgeColor(e.source, e.target)}
                  strokeWidth={edgeWidth(e.source, e.target)}
                  strokeLinecap="round"
                  className={isActive ? (disrupted ? "drop-shadow-sm" : "") : "opacity-60"}
                />
              )
            })}

            {/* Nodes */}
            {nodes.map((n) => {
              const isKey = routeNodeSet.has(n.id)
              return (
                <Marker key={n.id} coordinates={[n.lon, n.lat]}>
                  <circle
                    r={isKey ? 6 : 3.5}
                    fill={nodeColor(n.id)}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                  {isKey && (
                    <text
                      textAnchor="middle"
                      y={-12}
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fill: "#334155",
                        fontSize: "10px",
                        fontWeight: 700,
                        textShadow: "1px 1px 0px #fff, -1px -1px 0px #fff, 1px -1px 0px #fff, -1px 1px 0px #fff"
                      }}
                    >
                      {n.label.replace(' Hub', '').replace(' DC', '')}
                    </text>
                  )}
                </Marker>
              )
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Route info overlay */}
        {route && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-lg rounded-xl p-4 text-xs space-y-3 w-72"
          >
            {/* Selectors inside overlay */}
            {params && setParams && (
              <div className="flex flex-col gap-2">
                <div className="text-muted font-bold tracking-wider uppercase text-[10px]">Select Route</div>
                <div className="flex flex-col gap-0.5">
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded px-2 py-1.5 font-semibold text-slate-700 outline-none focus:border-primary"
                    value={params.origin}
                    onChange={e => setParams({...params, origin: e.target.value})}
                  >
                    {nodes.map(n => <option key={n.id} value={n.id}>{n.label.replace(' Hub', '').replace(' DC', '')}</option>)}
                  </select>
                  <div className="text-center text-slate-400 text-[10px] my-0 leading-none py-1">↓</div>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded px-2 py-1.5 font-semibold text-slate-700 outline-none focus:border-primary"
                    value={params.destination}
                    onChange={e => setParams({...params, destination: e.target.value})}
                  >
                    {nodes.map(n => <option key={n.id} value={n.id}>{n.label.replace(' Hub', '').replace(' DC', '')}</option>)}
                  </select>
                </div>
              </div>
            )}
            
            <div className="w-full h-px bg-slate-100" />
            
            <div className="flex flex-col gap-1">
              <div className="text-muted font-bold tracking-wider uppercase text-[10px]">Active Route Detail</div>
              <div className="text-text font-bold text-[13px]">
                {route.origin?.replace('_', ' ')} → {route.destination?.replace('_', ' ')}
              </div>
            </div>
            <div className="flex gap-4 text-slate-600 font-medium pt-1">
              <span>Time: {route.total_time_hrs} hrs</span>
              <span>Dist: {route.total_distance_km} km</span>
              <span>Cost: ₹{(route.total_cost_inr ?? 0).toLocaleString('en-IN')}</span>
            </div>
            {route.rerouted && (
              <div className="text-danger font-bold flex items-center gap-1 mt-1 bg-red-50 p-1 px-2 rounded">
                Rerouted Path ({route.hops} hops)
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: color, border: '1px solid #fff' }} />
      <span>{label}</span>
    </div>
  )
}

