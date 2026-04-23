import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Clock3, ExternalLink, Newspaper, RefreshCw, WifiOff } from 'lucide-react'
import { fetchRouteIntelligence } from '../services/api'

function formatRelativeTime(ts) {
  if (!ts) return 'Unknown time'
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) return 'Unknown time'

  const diffMs = Date.now() - date.getTime()
  const mins = Math.max(Math.floor(diffMs / 60000), 0)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function relevanceChip(score) {
  if (score >= 0.75) return 'bg-red-50 text-red-700 border-red-200'
  if (score >= 0.5) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-emerald-50 text-emerald-700 border-emerald-200'
}

export default function NewsPanel({ params = {} }) {
  const [intelligence, setIntelligence] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [routeChanged, setRouteChanged] = useState(false)
  const prevRouteRef = useRef('')

  const routeLabel = useMemo(() => {
    const o = (params.origin || 'Pune_Hub').replace(/_Hub|_DC/g, '').replace(/_/g, ' ')
    const d = (params.destination || 'Mumbai_Hub').replace(/_Hub|_DC/g, '').replace(/_/g, ' ')
    return `${o} → ${d}`
  }, [params.origin, params.destination])

  const loadIntelligence = async (isRouteChange = false) => {
    setLoading(true)
    if (isRouteChange) {
      setRouteChanged(true)
      setTimeout(() => setRouteChanged(false), 1800)
    }
    try {
      const { data } = await fetchRouteIntelligence(params)
      setIntelligence(data)
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIntelligence(false)
  }, [])

  useEffect(() => {
    const routeKey = `${params.origin}|${params.destination}`
    if (prevRouteRef.current && prevRouteRef.current !== routeKey) {
      loadIntelligence(true)
    }
    prevRouteRef.current = routeKey
  }, [params.origin, params.destination])

  useEffect(() => {
    const t = setInterval(() => loadIntelligence(false), 90_000)
    return () => clearInterval(t)
  }, [params])

  const newsItems = intelligence?.news || []
  const weatherCount = intelligence?.weather?.length || 0
  const trafficCount = intelligence?.traffic?.length || 0
  const riskScore = intelligence?.risk_score ?? 0
  const isFallback = intelligence?.news_status?.mode !== 'live'
  const fallbackMsg = intelligence?.news_status?.message || 'Live news unavailable (API key missing)'
  const updated = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '--:--:--'

  return (
    <div className="glass rounded-xl border border-border h-full min-h-0 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-slate-50 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-text flex items-center gap-2">
            <Newspaper size={15} className="text-primary" />
            Route News
          </div>
          <div className="text-[11px] text-muted truncate">{routeLabel}</div>
        </div>
        <button
          onClick={() => loadIntelligence(false)}
          className="text-xs px-2 py-1 rounded border border-border hover:bg-white transition-colors flex items-center gap-1"
          disabled={loading}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {routeChanged && (
        <div className="px-4 py-2 text-[11px] border-b border-amber-200 bg-amber-50 text-amber-700">
          Route changed. Regenerating intelligence for {routeLabel}.
        </div>
      )}

      {isFallback && (
        <div className="px-4 py-2 text-[11px] border-b border-amber-200 bg-amber-50 text-amber-800 flex items-center gap-2">
          <WifiOff size={12} />
          <span>⚠ {fallbackMsg}</span>
        </div>
      )}

      <div className="px-4 py-3 border-b border-border bg-white flex items-center justify-between gap-2 text-[11px]">
        <div className="text-muted">
          Risk Score: <span className="font-semibold text-text">{riskScore.toFixed(1)}</span> · Weather Alerts: {weatherCount} · Traffic Alerts: {trafficCount}
        </div>
        <div className="text-muted flex items-center gap-1">
          <Clock3 size={12} />
          {updated}
        </div>
      </div>

      {intelligence?.intelligence_highlight && (
        <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{intelligence.intelligence_highlight}</span>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {newsItems.length === 0 && !loading && (
          <div className="text-sm text-muted border border-dashed border-border rounded-lg p-4 text-center">
            No route-relevant articles found for this corridor right now.
          </div>
        )}

        {newsItems.map((item, idx) => (
          <div key={`${item.url || item.title}-${idx}`} className="rounded-lg border border-border bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium text-sm text-text leading-5">{item.title}</div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${relevanceChip(item.relevance_score || 0)}`}>
                {(item.relevance_score || 0).toFixed(2)}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-muted flex items-center gap-2 flex-wrap">
              <span>{item.source || 'unknown source'}</span>
              <span>•</span>
              <span>{formatRelativeTime(item.published_at)}</span>
              <span>•</span>
              <span>{item.location_tag || 'Route Corridor'}</span>
            </div>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                Open article <ExternalLink size={11} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
