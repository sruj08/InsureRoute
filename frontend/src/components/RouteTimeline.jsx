import { useState } from 'react'
import { motion } from 'framer-motion'
import { CloudRain, Wind, Thermometer, Droplets, AlertTriangle } from 'lucide-react'

// Default empty checkpoints when weather data isn't loaded yet
const DEFAULT_CHECKPOINTS = [
  { name: 'Pune',        role: 'origin',           is_dangerous: false, severity: 0, rain_1h: 0, wind_speed: 0, temperature: 28, description: '—', humidity: 60 },
  { name: 'Lonavla',     role: 'mountain_pass',    is_dangerous: false, severity: 0, rain_1h: 0, wind_speed: 0, temperature: 25, description: '—', humidity: 65 },
  { name: 'Khopoli',     role: 'expressway_entry', is_dangerous: false, severity: 0, rain_1h: 0, wind_speed: 0, temperature: 26, description: '—', humidity: 62 },
  { name: 'Khalapur',    role: 'mid_route',        is_dangerous: false, severity: 0, rain_1h: 0, wind_speed: 0, temperature: 27, description: '—', humidity: 60 },
  { name: 'Panvel',      role: 'highway_junction', is_dangerous: false, severity: 0, rain_1h: 0, wind_speed: 0, temperature: 29, description: '—', humidity: 70 },
  { name: 'Navi Mumbai', role: 'urban_entry',      is_dangerous: false, severity: 0, rain_1h: 0, wind_speed: 0, temperature: 30, description: '—', humidity: 72 },
  { name: 'Mumbai',      role: 'destination',      is_dangerous: false, severity: 0, rain_1h: 0, wind_speed: 0, temperature: 31, description: '—', humidity: 75 },
  { name: 'Bhiwandi',    role: 'alternate_hub',    is_dangerous: false, severity: 0, rain_1h: 0, wind_speed: 0, temperature: 30, description: '—', humidity: 68 },
]

function dotColor(cp) {
  if (cp.role === 'alternate_hub') return '#3b82f6'  // blue
  if (cp.severity > 0.6)          return '#ef4444'  // red
  if (cp.severity >= 0.3)         return '#eab308'  // yellow
  return '#22c55e'                                  // green
}

function dotGlow(cp) {
  if (cp.role === 'alternate_hub') return '0 0 10px 2px rgba(59,130,246,0.6)'
  if (cp.severity > 0.6)          return '0 0 12px 3px rgba(239,68,68,0.7)'
  if (cp.severity >= 0.3)         return '0 0 10px 2px rgba(234,179,8,0.6)'
  return '0 0 8px 1px rgba(34,197,94,0.4)'
}

function Tooltip({ cp }) {
  const roleLabel = cp.role.replace(/_/g, ' ')
  return (
    <div
      className="absolute z-50 bottom-full mb-3 left-1/2 -translate-x-1/2 w-52 rounded-lg px-3 py-2 text-xs text-white pointer-events-none shadow-xl"
      style={{
        background: 'rgba(15,23,42,0.97)',
        border: '1px solid rgba(99,102,241,0.3)',
        whiteSpace: 'normal',
      }}
    >
      <div className="font-bold text-sm mb-1">{cp.name}</div>
      <div className="text-slate-400 capitalize mb-1">{roleLabel}</div>
      {cp.description !== '—' && (
        <div className="capitalize text-indigo-300 mb-1">{cp.description}</div>
      )}
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-slate-300">
        {cp.rain_1h > 0 && (
          <>
            <span className="flex items-center gap-1"><CloudRain size={12} /> Rain</span>
            <span className="text-right font-mono">{cp.rain_1h} mm/hr</span>
          </>
        )}
        {cp.wind_speed > 0 && (
          <>
            <span className="flex items-center gap-1"><Wind size={12} /> Wind</span>
            <span className="text-right font-mono">{cp.wind_speed} m/s</span>
          </>
        )}
        <span className="flex items-center gap-1"><Thermometer size={12} /> Temp</span>
        <span className="text-right font-mono">{cp.temperature}°C</span>
        <span className="flex items-center gap-1"><Droplets size={12} /> Humidity</span>
        <span className="text-right font-mono">{cp.humidity}%</span>
      </div>
      {cp.is_dangerous && (
        <div className="mt-1.5 text-red-400 font-semibold flex items-center gap-1">
          <AlertTriangle size={12} /> Dangerous conditions
        </div>
      )}
      {/* Arrow */}
      <div
        className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
        style={{
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '5px solid rgba(15,23,42,0.97)',
        }}
      />
    </div>
  )
}

function CheckpointDot({ cp, index, isActive, showBypass, firstDangerIdx }) {
  const [hovered, setHovered] = useState(false)
  const isAlternate = cp.role === 'alternate_hub'
  const color = dotColor(cp)
  const glow  = dotGlow(cp)

  return (
    <div className="relative flex flex-col items-center" style={{ minWidth: 64 }}>
      {/* Label above */}
      <div
        className="text-xs font-semibold mb-1.5 text-center leading-tight"
        style={{
          color: cp.is_dangerous ? '#fca5a5' : isAlternate ? '#93c5fd' : '#94a3b8',
          maxWidth: 72,
        }}
      >
        {cp.name}
      </div>

      {/* Dot */}
      <motion.div
        className="relative cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        whileHover={{ scale: 1.25 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        <div
          className="w-5 h-5 rounded-full border-2 border-white/20 transition-all duration-300"
          style={{
            background: color,
            boxShadow: hovered ? glow : 'none',
          }}
        />
        {/* Ping animation for dangerous checkpoints */}
        {cp.is_dangerous && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: color,
              opacity: 0.4,
              animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
            }}
          />
        )}
        {/* Red X cross for blocked segment */}
        {showBypass && index === firstDangerIdx && (
          <div
            className="absolute -top-2 -right-2 text-red-400 font-bold text-xs leading-none"
            title="Route blocked"
          >
            ✕
          </div>
        )}
        {/* Tooltip */}
        {hovered && <Tooltip cp={cp} />}
      </motion.div>

      {/* Role badge below */}
      <div className="text-[9px] text-slate-500 mt-1 text-center leading-tight capitalize" style={{ maxWidth: 60 }}>
        {cp.role.replace(/_/g, ' ')}
      </div>
    </div>
  )
}

function Connector({ blocked, isDetour, dimmed }) {
  if (isDetour) {
    // Dashed green detour connector
    return (
      <div className="flex items-center" style={{ minWidth: 20, flex: 1 }}>
        <svg width="100%" height="12" className="overflow-visible">
          <line
            x1="0" y1="6" x2="100%" y2="6"
            stroke="#22c55e"
            strokeWidth="2"
            strokeDasharray="5 3"
          />
        </svg>
      </div>
    )
  }
  return (
    <div
      className="flex-1 h-0.5 mx-1 transition-all duration-500"
      style={{
        background: blocked
          ? 'repeating-linear-gradient(90deg, #ef4444 0 6px, transparent 6px 12px)'
          : dimmed
          ? '#1e293b'
          : 'linear-gradient(90deg, #334155, #475569)',
        opacity: dimmed ? 0.3 : 1,
      }}
    />
  )
}

export default function RouteTimeline({ checkpoints: propCheckpoints, isDisrupted, route, nodes = [] }) {
  const isPuneMumbai = route?.origin === 'Pune_Hub' && route?.destination === 'Mumbai_Hub'

  // If Pune-Mumbai, use the detailed weather checkpoints
  let checkpoints = []
  if (isPuneMumbai) {
    checkpoints = (propCheckpoints && propCheckpoints.length >= 7)
      ? propCheckpoints
      : DEFAULT_CHECKPOINTS
  } else {
    // Dynamic checkpoints based on selected route
    checkpoints = (route?.path || []).map((nodeId, i) => {
      const node = nodes.find(n => n.id === nodeId) || { label: nodeId }
      
      // Simple string hashing to ensure consistent mock weather per city
      const seededRandom = (str) => {
        let hash = 0
        for (let j = 0; j < str.length; j++) hash = str.charCodeAt(j) + ((hash << 5) - hash)
        return Math.abs(hash) / 2147483648
      }
      const rand = seededRandom(nodeId)
      
      const rain = Math.round(rand * 5 * 10) / 10 // 0.0 to 5.0 mm
      const wind = Math.round((2 + rand * 8) * 10) / 10 // 2.0 to 10.0 m/s
      const temp = Math.round(24 + rand * 10) // 24 to 34 C
      const hum  = Math.round(55 + rand * 35) // 55 to 90 %
      const desc = rain > 2 ? 'light rain' : rand > 0.5 ? 'partly cloudy' : 'clear skies'
      
      return {
        name: node.label.replace(' Hub', '').replace(' DC', ''),
        role: i === 0 ? 'origin' : i === route?.path.length - 1 ? 'destination' : 'mid_route',
        is_dangerous: false, // keep dynamic routes green for now, unless we want random disruptions
        severity: rain > 3 ? 0.2 : 0, 
        rain_1h: rain, 
        wind_speed: wind, 
        temperature: temp, 
        description: desc, 
        humidity: hum
      }
    })
  }

  // Separate main route from alternate hub
  const mainRoute = checkpoints.filter(c => c.role !== 'alternate_hub')
  const bhiwandi  = checkpoints.find(c => c.role === 'alternate_hub')

  // Find first dangerous checkpoint index in main route  
  const firstDangerIdx = mainRoute.findIndex(c => c.is_dangerous)
  const showBypass     = isPuneMumbai && isDisrupted && firstDangerIdx !== -1 && bhiwandi

  const title = isPuneMumbai 
    ? 'Pune → Mumbai Route Monitor' 
    : `${route?.origin?.replace(/_/g, ' ').replace(' Hub', '') || 'Origin'} → ${route?.destination?.replace(/_/g, ' ').replace(' Hub', '') || 'Destination'} Route Monitor`

  // Legend items
  const LEGEND = [
    { color: '#22c55e', label: 'Clear' },
    { color: '#eab308', label: 'Moderate' },
    { color: '#ef4444', label: 'Dangerous' },
    { color: '#3b82f6', label: 'Alternate Hub' },
  ]

  return (
    <div
      className="rounded-xl px-5 py-4 shadow-sm"
      style={{
        background: 'rgba(15,23,42,0.7)',
        border: '1px solid rgba(99,102,241,0.2)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <span className="text-sm font-bold text-slate-200">
            {title}
          </span>
          <span className="text-xs text-slate-500 ml-2">
            {checkpoints.filter(c => c.role !== 'alternate_hub' && c.is_dangerous).length} of {mainRoute.length} segments affected
          </span>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap">
          {LEGEND.map(l => (
            <div key={l.label} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
              <span className="text-[10px] text-slate-400">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main route row ──────────────────────────────────────────────── */}
      <div className="flex items-center w-full pb-2 pt-6" style={{ minHeight: 90 }}>
        {mainRoute.map((cp, i) => {
          const isBlocked = showBypass && i >= firstDangerIdx && i < mainRoute.length - 1
          const isDimmed  = showBypass && i > firstDangerIdx && i < mainRoute.length - 1
          return (
            <div key={cp.name} className="flex items-center flex-1 min-w-0">
              <CheckpointDot
                cp={cp}
                index={i}
                isActive={showBypass}
                showBypass={showBypass}
                firstDangerIdx={firstDangerIdx}
              />
              {i < mainRoute.length - 1 && (
                <Connector blocked={isBlocked} isDetour={false} dimmed={isDimmed} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Bypass route (only when disruption active) ──────────────────── */}
      {showBypass && bhiwandi && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-2"
        >
          {/* Downward arrow from disruption point toward Bhiwandi */}
          <div className="flex items-center gap-3 pl-4 mb-1">
            <div
              className="text-green-400 text-xs font-bold tracking-widest border border-green-700/50 bg-green-950/40 px-2 py-0.5 rounded-full"
            >
              ↓ ACTIVE ALTERNATE ROUTE
            </div>
          </div>

          <div className="flex items-center pl-8">
            {/* Dashed detour line from danger point → Bhiwandi → Mumbai */}
            <div className="flex items-center gap-0 flex-1">
              <Connector isDetour blocked={false} dimmed={false} />
              <CheckpointDot cp={bhiwandi} index={0} isActive showBypass={false} firstDangerIdx={-1} />
              <Connector isDetour blocked={false} dimmed={false} />
              <div className="text-xs text-green-400 font-semibold whitespace-nowrap">
                → Mumbai
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── All-clear state ─────────────────────────────────────────────── */}
      {!isDisrupted && (
        <div className="mt-2 flex items-center gap-2 text-xs text-green-400/70">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" style={{ animation: 'ping 2s infinite' }} />
          All checkpoints nominal — {isPuneMumbai ? 'direct Pune Expressway' : 'standard'} route active
        </div>
      )}
    </div>
  )
}
