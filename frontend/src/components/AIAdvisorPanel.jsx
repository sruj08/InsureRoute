import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, RefreshCw, Sparkles, Shield, AlertTriangle,
  Zap, MapPin, Navigation, Clock, Thermometer, Wind,
  CloudRain, AlertCircle, CheckCircle, ChevronDown, ChevronUp,
  TrendingUp, Fuel, Star, Radio
} from 'lucide-react'
import { fetchRiskAnalysis } from '../services/api'

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusColor(status = '') {
  const s = status.toLowerCase()
  if (s.includes('green') || s.includes('safe'))      return { bg: '#dcfce7', text: '#166534', border: '#86efac', dot: '#22c55e' }
  if (s.includes('red') || s.includes('dangerous'))   return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', dot: '#ef4444' }
  return                                                      { bg: '#fef9c3', text: '#854d0e', border: '#fde047', dot: '#eab308' }
}

function safetyBadge(rating = '') {
  const r = rating.toLowerCase()
  if (r.includes('high'))     return { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5', icon: <AlertTriangle size={10} /> }
  if (r.includes('moderate')) return { bg: '#fef3c7', text: '#d97706', border: '#fcd34d', icon: <AlertCircle size={10} /> }
  return                             { bg: '#dcfce7', text: '#16a34a', border: '#86efac', icon: <CheckCircle size={10} /> }
}

function trafficBadge(traffic = '') {
  const t = traffic.toLowerCase()
  if (t.includes('heavy'))    return { bg: '#fee2e2', text: '#dc2626', label: 'Heavy' }
  if (t.includes('moderate')) return { bg: '#fef3c7', text: '#d97706', label: 'Moderate' }
  return                             { bg: '#dcfce7', text: '#16a34a', label: 'Light' }
}

function renderBullets(text = '') {
  if (!text) return null
  return text.split('\n').filter(l => l.trim()).map((line, i) => {
    const isLabel = line.includes(':')
    const [label, ...rest] = isLabel ? line.replace(/^- /, '').split(':') : ['', line.replace(/^- /, '')]
    const val = rest.join(':').trim()
    return (
      <div key={i} className="flex items-start gap-2 text-[12px] py-1">
        <span style={{ color: '#6366f1', marginTop: 2 }}>▸</span>
        {isLabel && val ? (
          <span>
            <span style={{ color: '#374151', fontWeight: 600 }}>{label.trim()}:</span>
            <span style={{ color: '#6b7280' }}> {val}</span>
          </span>
        ) : (
          <span style={{ color: '#6b7280' }}>{line.replace(/^- /, '')}</span>
        )}
      </div>
    )
  })
}

// ── Segment Card ──────────────────────────────────────────────────────────────
function SegmentCard({ seg, index, isCritical }) {
  const [expanded, setExpanded] = useState(index === 0)
  const sb = safetyBadge(seg.safety_rating)
  const tb = trafficBadge(seg.traffic)

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-xl border overflow-hidden"
      style={{
        border: isCritical ? '1.5px solid #fca5a5' : '1px solid #e5e7eb',
        background: isCritical ? '#fff5f5' : '#fff',
        boxShadow: isCritical ? '0 0 0 3px rgba(239,68,68,0.08)' : 'none',
      }}
    >
      {/* Segment header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        style={{ background: 'transparent' }}
      >
        {/* Index bubble */}
        <div
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{ background: isCritical ? '#ef4444' : '#6366f1' }}
        >
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-bold text-slate-800 truncate">{seg.name}</span>
            {isCritical && (
              <span className="text-[9px] font-bold text-red-600 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded-full tracking-wider flex items-center gap-1">
                <AlertTriangle size={8} /> CRITICAL
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Traffic pill */}
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{ background: tb.bg, color: tb.text }}
            >
              <Navigation size={10} /> {tb.label} Traffic
            </span>
            {/* Safety badge */}
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1"
              style={{ background: sb.bg, color: sb.text, borderColor: sb.border }}
            >
              {sb.icon} {seg.safety_rating}
            </span>
          </div>
        </div>

        <div className="flex-shrink-0 text-slate-400">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2.5 border-t border-slate-100 pt-3">
              {/* Weather */}
              <div className="flex items-start gap-2">
                <CloudRain size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weather</div>
                  <div className="text-[12px] text-slate-600 mt-0.5">{seg.weather}</div>
                </div>
              </div>

              {/* Road Risks */}
              <div className="flex items-start gap-2">
                <AlertCircle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Road Risks</div>
                  <div className="text-[12px] text-slate-600 mt-0.5">{seg.road_risks}</div>
                </div>
              </div>

              {/* Advice */}
              <div
                className="flex items-start gap-2 rounded-lg px-3 py-2"
                style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}
              >
                <Navigation size={12} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Driver Advice</div>
                  <div className="text-[12px] text-indigo-800 font-medium mt-0.5">{seg.advice}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main Panel ─────────────────────────────────────────────────────────────────
export default function AIAdvisorPanel({ params, isMock, routePath = [], weatherState }) {
  const [analysis,  setAnalysis]  = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(false)
  const prevRouteKey = useRef(null)

  const routeKey = `${params?.origin}→${params?.destination}`

  const fetchAnalysis = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const { data } = await fetchRiskAnalysis(params, routePath)
      setAnalysis(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [params, routePath])

  // Auto-regenerate when route changes
  useEffect(() => {
    if (routeKey !== prevRouteKey.current) {
      prevRouteKey.current = routeKey
      if (analysis) {
        // Route changed while we had a result — re-fetch automatically
        fetchAnalysis()
      }
    }
  }, [routeKey, analysis, fetchAnalysis])

  const isAvailable   = analysis?.available === true
  const overallStatus = analysis?.overall_status || '—'
  const statusColors  = statusColor(overallStatus)
  const segments      = analysis?.segments || []
  const critical      = analysis?.critical_segment || {}
  const criticalName  = critical.name || ''
  const model         = analysis?.model || ''
  const cached        = analysis?.cached === true
  const isLive        = analysis?.is_live_weather === true

  const origLabel = (params?.origin || 'Origin').replace(/_/g, ' ').replace(' Hub', '').replace(' DC', '')
  const destLabel = (params?.destination || 'Destination').replace(/_/g, ' ').replace(' Hub', '').replace(' DC', '')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass flex flex-col"
      style={{ minHeight: 0 }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50">
            <Brain size={18} className="text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-800">AI Route Risk Advisor</span>
              <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                Powered by Google Gemini
              </span>
              {isLive && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Radio size={8} className="animate-pulse" /> Live OWM
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
              <MapPin size={9} />
              <span className="font-semibold text-indigo-600">{origLabel}</span>
              <span>→</span>
              <span className="font-semibold text-indigo-600">{destLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Overall status badge */}
          {analysis && isAvailable && (
            <motion.div
              key={overallStatus}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold"
              style={{ background: statusColors.bg, color: statusColors.text, borderColor: statusColors.border }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColors.dot }} />
              {overallStatus.trim()}
            </motion.div>
          )}
          {/* Cached badge */}
          {cached && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <Zap size={9} /> Cached
            </span>
          )}
          <button
            onClick={fetchAnalysis}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg
                       border border-border text-slate-600 hover:bg-slate-50
                       disabled:opacity-50 transition-all"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Analysing…' : analysis ? 'Re-analyse' : 'Analyse Route'}
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 custom-scrollbar">
        <AnimatePresence mode="wait">

          {/* Idle */}
          {!analysis && !loading && !error && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 gap-4 text-center"
            >
              <div className="p-4 rounded-full bg-indigo-50">
                <Brain size={28} className="text-indigo-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Full Route Risk Analysis</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Click <span className="font-bold text-indigo-500">Analyse Route</span> to get a detailed,
                  segment-wise breakdown for the <span className="font-semibold">{origLabel} → {destLabel}</span> corridor.
                </p>
                <p className="text-[10px] text-slate-400 mt-2">
                  Changes route? The analysis auto-regenerates.
                </p>
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 gap-4"
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" />
                <Sparkles size={18} className="absolute inset-0 m-auto text-indigo-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-600">Gemini is analysing the route…</p>
                <p className="text-xs text-slate-400 mt-1">
                  Evaluating {routePath.length > 0 ? routePath.length : 'all'} checkpoints for {origLabel} → {destLabel}
                </p>
              </div>
            </motion.div>
          )}

          {/* Error */}
          {error && !loading && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 gap-3 text-center"
            >
              <AlertTriangle size={22} className="text-amber-500" />
              <span className="text-sm text-slate-500">
                {isMock ? 'Backend is offline — running in mock mode.' : 'Failed to connect to backend. Ensure the server is running.'}
              </span>
              <button onClick={fetchAnalysis} className="text-xs text-indigo-500 underline">Retry</button>
            </motion.div>
          )}

          {/* Full Analysis Result */}
          {analysis && !loading && (
            <motion.div
              key={`result-${routeKey}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {/* Unavailable message */}
              {!isAvailable && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <AlertTriangle size={16} className="flex-shrink-0" />
                  <span>{analysis.error || 'AI advisor temporarily unavailable.'}</span>
                </div>
              )}

              {isAvailable && (
                <>
                  {/* ── 1. Quick Decision Banner ─────────────────────────────── */}
                  {analysis.quick_decision && (
                    <motion.div
                      initial={{ scale: 0.97 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 border"
                      style={{ background: statusColors.bg, borderColor: statusColors.border }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: statusColors.dot }} />
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: statusColors.text }}>
                          Quick Decision
                        </div>
                        <div className="text-[13px] font-semibold mt-0.5" style={{ color: statusColors.text }}>
                          {analysis.quick_decision}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ── 2. Route Summary ─────────────────────────────────────── */}
                  {analysis.route_summary && (
                    <div>
                      <SectionHeader icon={<Navigation size={13} />} label="Route Summary" color="indigo" />
                      <div className="bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 mt-2">
                        {renderBullets(analysis.route_summary)}
                      </div>
                    </div>
                  )}

                  {/* ── 3. Segment-by-Segment Analysis ───────────────────────── */}
                  {segments.length > 0 && (
                    <div>
                      <SectionHeader
                        icon={<MapPin size={13} />}
                        label={`Segment Analysis (${segments.length} checkpoints)`}
                        color="indigo"
                      />
                      <div className="space-y-2 mt-2">
                        {segments.map((seg, i) => (
                          <SegmentCard
                            key={`${routeKey}-${i}`}
                            seg={seg}
                            index={i}
                            isCritical={
                              criticalName &&
                              seg.name.toLowerCase().includes(criticalName.toLowerCase().split(' ')[0])
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── 4. Critical Segment ───────────────────────────────────── */}
                  {criticalName && (
                    <div>
                      <SectionHeader icon={<AlertCircle size={13} />} label="Most Critical Segment" color="red" />
                      <div
                        className="rounded-xl border px-4 py-3 mt-2 space-y-2"
                        style={{ background: '#fff5f5', border: '1.5px solid #fca5a5' }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[13px] font-bold text-red-700">{criticalName}</span>
                          {critical.hazard_type && (
                            <span className="text-[10px] font-semibold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                              {critical.hazard_type}
                            </span>
                          )}
                        </div>
                        {critical.reason && (
                          <p className="text-[12px] text-red-800 leading-relaxed">{critical.reason}</p>
                        )}
                        {critical.delay_probability && (
                          <div className="flex items-center gap-2 text-[12px]">
                            <TrendingUp size={12} className="text-red-500" />
                            <span className="text-red-700 font-semibold">Delay Probability:</span>
                            <span className="text-red-600">{critical.delay_probability}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── 5. Recommendations ───────────────────────────────────── */}
                  {analysis.recommendations && (
                    <div>
                      <SectionHeader icon={<Star size={13} />} label="Smart Recommendations" color="green" />
                      <div className="bg-green-50 rounded-xl border border-green-100 px-4 py-3 mt-2">
                        {renderBullets(analysis.recommendations)}
                      </div>
                    </div>
                  )}

                  {/* ── 6. Live Status ────────────────────────────────────────── */}
                  {analysis.live_status && (
                    <div>
                      <SectionHeader icon={<Radio size={13} />} label="Live Intelligence Status" color="amber" />
                      <div className="bg-amber-50 rounded-xl border border-amber-100 px-4 py-3 mt-2">
                        {renderBullets(analysis.live_status)}
                      </div>
                    </div>
                  )}

                  {/* ── Footer ────────────────────────────────────────────────── */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={10} className="text-indigo-400" />
                      <span className="text-[10px] text-slate-400 font-medium">
                        Model: {model} · Google Gemini API
                        {cached && <span className="ml-1 text-emerald-500">· from cache</span>}
                        {isLive && <span className="ml-1 text-blue-500">· Live OWM data</span>}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400">
                      {origLabel} → {destLabel}
                    </span>
                  </div>
                </>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ── Section header sub-component ──────────────────────────────────────────────
function SectionHeader({ icon, label, color = 'indigo' }) {
  const colors = {
    indigo: { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' },
    red:    { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
    green:  { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
    amber:  { bg: '#fef9c3', text: '#92400e', border: '#fde047' },
  }
  const c = colors[color] || colors.indigo
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg w-fit"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <span style={{ color: c.text }}>{icon}</span>
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.text }}>
        {label}
      </span>
    </div>
  )
}
