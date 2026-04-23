import { useState, useEffect, useRef } from 'react'
import { fetchNews } from '../services/api'
import { Radio, Wifi, WifiOff, RefreshCw, RotateCcw, AlertTriangle, AlertCircle, Info, CheckCircle, ChevronRight, Hexagon } from 'lucide-react'

// ── Boot sequence messages ────────────────────────────────────────────────────
const BOOT_LINES = [
  'Connecting to InsureRoute Intelligence Network...',
  'Authenticating sensor telemetry...',
  'Resolving route topology...',
  'Querying AI inference engine...',
  'Compiling route-specific briefings...',
]

// ── Removed emoji extractors ──

// ── Severity colour for left border ──────────────────────────────────────────
function getSeverityColor(text) {
  const t = text.toLowerCase()
  if (t.includes('danger') || t.includes('alert') || t.includes('critical') || t.includes('high risk'))
    return '#ef4444'
  if (t.includes('warning') || t.includes('caution') || t.includes('delay') || t.includes('disruption'))
    return '#f59e0b'
  if (t.includes('clear') || t.includes('nominal') || t.includes('green') || t.includes('safe'))
    return '#22c55e'
  return '#3b82f6'
}

function getSeverityIcon(text) {
  const t = text.toLowerCase()
  if (t.includes('danger') || t.includes('alert') || t.includes('critical') || t.includes('high risk'))
    return <AlertTriangle size={14} color="#ef4444" />
  if (t.includes('warning') || t.includes('caution') || t.includes('delay') || t.includes('disruption'))
    return <AlertCircle size={14} color="#f59e0b" />
  if (t.includes('clear') || t.includes('nominal') || t.includes('green') || t.includes('safe'))
    return <CheckCircle size={14} color="#22c55e" />
  return <Info size={14} color="#3b82f6" />
}

// ── Ticker ribbon content (cycles through briefs) ────────────────────────────
function TickerRibbon({ briefs, route }) {
  const items = briefs.length > 0 ? briefs : ['● Awaiting route intelligence...']
  const combined = items.join('   ◆   ')

  return (
    <div
      style={{
        background: '#f59e0b',
        color: '#0a0e1a',
        fontSize: '10px',
        fontFamily: 'monospace',
        fontWeight: 700,
        padding: '4px 0',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        letterSpacing: '0.03em',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          animation: 'ticker-scroll 28s linear infinite',
          paddingLeft: '100%',
        }}
      >
        {route && (
          <span style={{ color: '#0a0e1a', marginRight: 16, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Radio size={12} /> {route.toUpperCase()}
          </span>
        )}
        {combined}
        &nbsp;&nbsp;&nbsp;◆&nbsp;&nbsp;&nbsp;
        {combined}
      </div>
    </div>
  )
}

// ── Boot sequence loader ──────────────────────────────────────────────────────
function BootSequence({ lines }) {
  const [visible, setVisible] = useState(0)

  useEffect(() => {
    if (visible >= lines.length) return
    const t = setTimeout(() => setVisible(v => v + 1), 380)
    return () => clearTimeout(t)
  }, [visible, lines.length])

  return (
    <div style={{ fontFamily: 'monospace', fontSize: 11, padding: '12px 4px', color: '#94a3b8' }}>
      {lines.slice(0, visible).map((line, i) => (
        <div key={i} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#22c55e', flexShrink: 0 }}>{'>'}</span>
          <span>{line}</span>
          {i === visible - 1 && (
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 13,
                background: '#f59e0b',
                animation: 'blink 1s step-end infinite',
                marginLeft: 2,
                verticalAlign: 'middle',
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function NewsPanel({ params = {} }) {
  const [briefs,    setBriefs]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [booting,   setBooting]   = useState(true)
  const [cached,    setCached]    = useState(false)
  const [available, setAvailable] = useState(true)
  const [routeLabel, setRouteLabel] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [routeChanged, setRouteChanged] = useState(false)
  const prevRouteRef = useRef('')

  const originLabel = (params.origin || 'Pune Hub')
    .replace(/_Hub$/, '').replace(/_DC$/, '').replace(/_/g, ' ')
  const destLabel = (params.destination || 'Mumbai Hub')
    .replace(/_Hub$/, '').replace(/_DC$/, '').replace(/_/g, ' ')
  const currentRoute = `${originLabel} → ${destLabel}`

  const loadNews = async (isRouteChange = false) => {
    setLoading(true)
    if (isRouteChange) {
      setRouteChanged(true)
      setBriefs([])
      setTimeout(() => setRouteChanged(false), 2000)
    }
    try {
      const res = await fetchNews(params)
      if (res.data) {
        setBriefs(res.data.briefs || [])
        setCached(res.data.cached ?? false)
        setAvailable(res.data.available ?? true)
        setRouteLabel(res.data.route || currentRoute)
        setLastUpdated(new Date())
      }
    } catch {
      setBriefs([`Feed error — ${currentRoute}`])
      setAvailable(false)
    } finally {
      setLoading(false)
      setBooting(false)
    }
  }

  // Initial load
  useEffect(() => {
    loadNews(false)
  }, [])

  // Re-fetch when route changes
  useEffect(() => {
    const route = `${params.origin}|${params.destination}`
    if (prevRouteRef.current && prevRouteRef.current !== route) {
      loadNews(true)
    }
    prevRouteRef.current = route
  }, [params.origin, params.destination])

  // Auto-refresh every 90 seconds
  useEffect(() => {
    const t = setInterval(() => loadNews(false), 90_000)
    return () => clearInterval(t)
  }, [params])

  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '--:--:--'

  return (
    <div
      style={{
        background: '#0a0e1a',
        border: '1px solid #1e293b',
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxShadow: '0 0 0 1px #1e293b, 0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      {/* ── CSS for ticker and blink animations ── */}
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .brief-row {
          animation: fadeInUp 0.35s ease forwards;
        }
        .brief-row:hover {
          background: rgba(255,255,255,0.03) !important;
        }
      `}</style>

      {/* ── Top bar ── */}
      <div
        style={{
          background: '#0d1220',
          borderBottom: '1px solid #1e293b',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexShrink: 0,
        }}
      >
        {/* Left: title + live dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: available ? '#22c55e' : '#ef4444',
              boxShadow: available ? '0 0 6px #22c55e' : '0 0 6px #ef4444',
              animation: 'blink 2s ease infinite',
              flexShrink: 0,
            }}
          />
          <span style={{
            fontFamily: 'monospace',
            fontSize: 11,
            fontWeight: 700,
            color: '#f59e0b',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}>
            Route Intel
          </span>
          {/* Route badge */}
          <div
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 4,
              padding: '2px 8px',
              fontFamily: 'monospace',
              fontSize: 10,
              color: '#94a3b8',
              letterSpacing: '0.05em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 180,
            }}
          >
            {originLabel.toUpperCase()} → {destLabel.toUpperCase()}
          </div>
        </div>

        {/* Right: status indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {cached && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 3,
              fontFamily: 'monospace', fontSize: 9, color: '#64748b',
            }}>
              <RotateCcw size={9} />
              <span>CACHED</span>
            </div>
          )}
          {loading && !booting && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 3,
              fontFamily: 'monospace', fontSize: 9, color: '#f59e0b',
            }}>
              <RefreshCw size={9} style={{ animation: 'spin 1s linear infinite' }} />
              <span>SYNCING</span>
            </div>
          )}
          <span style={{
            fontFamily: 'monospace', fontSize: 9, color: '#475569',
          }}>
            {timeStr}
          </span>
        </div>
      </div>

      {/* ── System label bar ── */}
      <div style={{
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        padding: '4px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
      }}>
        <Radio size={9} color="#f59e0b" />
        <span style={{
          fontFamily: 'monospace', fontSize: 9,
          color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>
          InsureRoute Intelligence Terminal · AI-Powered · Live Feed
        </span>
        <div style={{ flex: 1 }} />
        {available ? (
          <Wifi size={9} color="#22c55e" />
        ) : (
          <WifiOff size={9} color="#ef4444" />
        )}
      </div>

      {/* ── Route changed flash ── */}
      {routeChanged && (
        <div style={{
          background: '#1c1400',
          borderBottom: '1px solid #92400e',
          padding: '6px 14px',
          fontFamily: 'monospace',
          fontSize: 10,
          color: '#f59e0b',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          animation: 'slideIn 0.3s ease',
          flexShrink: 0,
        }}>
          <ChevronRight size={10} style={{ animation: 'blink 0.5s step-end infinite' }} />
          ROUTE CHANGED — Regenerating intelligence for {currentRoute.toUpperCase()}...
        </div>
      )}

      {/* ── Content area ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {booting ? (
          <div style={{ padding: '8px 14px', flex: 1 }}>
            <BootSequence lines={BOOT_LINES} />
          </div>
        ) : (
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 0',
          }}
            className="custom-scrollbar"
          >
            {briefs.length === 0 ? (
              <div style={{
                padding: '24px 14px',
                textAlign: 'center',
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#334155',
              }}>
                <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}><Hexagon size={16} /></div>
                NO INTELLIGENCE AVAILABLE FOR THIS ROUTE
              </div>
            ) : (
              briefs.map((brief, idx) => {
                const icon     = getSeverityIcon(brief)
                const color    = getSeverityColor(brief)

                return (
                  <div
                    key={`${params.origin}-${params.destination}-${idx}`}
                    className="brief-row"
                    style={{
                      display: 'flex',
                      gap: 10,
                      padding: '9px 14px',
                      borderBottom: '1px solid #0f172a',
                      cursor: 'default',
                      transition: 'background 0.15s',
                      animationDelay: `${idx * 80}ms`,
                      borderLeft: `3px solid ${color}`,
                    }}
                  >
                    {/* Emoji col */}
                    <div style={{
                      fontSize: 14,
                      flexShrink: 0,
                      lineHeight: 1.4,
                      width: 20,
                      textAlign: 'center',
                    }}>
                      {icon}
                    </div>

                    {/* Text col */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'monospace',
                        fontSize: 11,
                        color: '#cbd5e1',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                      }}>
                        {brief}
                      </div>
                    </div>

                    {/* Index badge */}
                    <div style={{
                      flexShrink: 0,
                      fontFamily: 'monospace',
                      fontSize: 9,
                      color: '#1e293b',
                      alignSelf: 'flex-start',
                      paddingTop: 2,
                    }}>
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* ── Ticker ribbon at the bottom ── */}
      <div style={{ flexShrink: 0 }}>
        <TickerRibbon briefs={briefs} route={routeLabel || currentRoute} />
      </div>

      {/* ── Footer bar ── */}
      <div style={{
        background: '#0d1220',
        borderTop: '1px solid #1e293b',
        padding: '4px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'monospace', fontSize: 9, color: '#334155',
          letterSpacing: '0.08em',
        }}>
          INSURE/ROUTE © 2025
        </span>
        <span style={{
          fontFamily: 'monospace', fontSize: 9, color: '#334155',
          letterSpacing: '0.06em',
        }}>
          {available ? 'GEMINI-2.5-FLASH' : 'OFFLINE'} · AUTO-REFRESH 90s
        </span>
      </div>
    </div>
  )
}
