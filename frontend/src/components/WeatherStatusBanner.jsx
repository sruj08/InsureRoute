import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CloudRain, AlertTriangle, CheckCircle } from 'lucide-react'

const BASE = 'http://localhost:8000'

function formatTime(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso + 'Z')   // treat as UTC
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return iso.slice(11, 19) ?? '—'
  }
}

export default function WeatherStatusBanner() {
  const [weather, setWeather] = useState(null)
  const [error,   setError]   = useState(false)

  const fetchWeather = async () => {
    try {
      const res = await fetch(`${BASE}/weather-status`, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) throw new Error('non-200')
      const json = await res.json()
      setWeather(json)
      setError(false)
    } catch {
      setError(true)
    }
  }

  useEffect(() => {
    fetchWeather()
    const t = setInterval(fetchWeather, 30_000)
    return () => clearInterval(t)
  }, [])

  // ── API / backend offline — render nothing ───────────────────────────────
  if (error || !weather) return null

  const { is_dangerous, disruption_point, disruption_role, reason,
          alternate_route_via, last_checked, api_status, checkpoints } = weather

  const dangerCount = (checkpoints ?? []).filter(c => c.is_dangerous).length
  const totalCount  = (checkpoints ?? []).length || 8
  const isOffline   = api_status === 'offline' || api_status === 'initialising'

  // ── DANGEROUS — full red/amber banner ────────────────────────────────────
  if (is_dangerous) {
    const roleLabel = disruption_role?.replace(/_/g, ' ') ?? ''
    return (
      <AnimatePresence>
        <motion.div
          key="danger-banner"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="w-full rounded-xl overflow-hidden shadow-lg mb-3"
          style={{
            background: 'linear-gradient(135deg, #7f1d1d 0%, #92400e 100%)',
            border: '1px solid rgba(239,68,68,0.5)',
          }}
        >
          <div className="px-5 py-4">
            {/* Top row */}
            <div className="flex items-center gap-3 mb-2">
                <CloudRain size={24} className="text-white" />
              <span className="text-white font-bold text-base tracking-wide">
                LIVE WEATHER DISRUPTION DETECTED
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full bg-red-400 flex-shrink-0"
                  style={{ animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite' }}
                />
                <span className="text-red-200 text-xs font-semibold uppercase tracking-widest">
                  Live
                </span>
              </span>
            </div>

            {/* Middle row */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="flex items-center gap-2 bg-red-950/50 rounded-lg px-3 py-1.5">
                <AlertTriangle size={16} className="text-amber-200" />
                <span className="text-amber-200 font-semibold text-sm">
                  {disruption_point}
                  {roleLabel && (
                    <span className="text-amber-300/70 font-normal ml-1">
                      — {roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1)}
                    </span>
                  )}
                </span>
              </div>
              <div className="text-orange-200 text-sm leading-snug flex-1">
                {reason}
              </div>
            </div>

            {/* Bottom row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-green-300 font-medium">
                  ↪ System auto-rerouting via{' '}
                  <span className="font-bold text-green-200">
                    {alternate_route_via ?? 'Bhiwandi'} Hub
                  </span>
                </span>
                <span className="text-xs bg-amber-900/60 text-amber-200 px-2 py-0.5 rounded-full border border-amber-700/40">
                  {dangerCount}/{totalCount} checkpoints affected
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs text-red-300/70">Source: OpenWeatherMap Live</div>
                <div className="text-xs text-red-300/50">
                  Last checked: {formatTime(last_checked)}
                </div>
              </div>
            </div>
          </div>

          {/* Shimmer bar */}
          <div
            className="h-1 w-full"
            style={{
              background:
                'linear-gradient(90deg, #dc2626, #f59e0b, #dc2626)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s linear infinite',
            }}
          />
        </motion.div>
      </AnimatePresence>
    )
  }

  // ── CLEAR — small green pill ──────────────────────────────────────────────
  return (
    <motion.div
      key="clear-pill"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex justify-end mb-2"
    >
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-green-100 shadow"
        style={{
          background: 'linear-gradient(135deg, #14532d 0%, #166534 100%)',
          border: '1px solid rgba(74,222,128,0.3)',
        }}
      >
        <CheckCircle size={14} className="text-green-300" />
        <span>
          {isOffline
            ? 'Weather monitor offline — ML mode active'
            : `All ${totalCount} Checkpoints Clear — Live Monitored`}
        </span>
        {!isOffline && (
          <span className="text-green-400/60 ml-1">
            · {formatTime(last_checked)}
          </span>
        )}
      </div>
    </motion.div>
  )
}
