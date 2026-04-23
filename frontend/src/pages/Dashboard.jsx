import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar              from '../components/Navbar'
import KPICards            from '../components/KPICards'
import GraphView           from '../components/GraphView'
import InsurancePanel      from '../components/InsurancePanel'
import LogsPanel           from '../components/LogsPanel'
import WeatherStatusBanner from '../components/WeatherStatusBanner'
import RouteTimeline       from '../components/RouteTimeline'
import AIAdvisorPanel      from '../components/AIAdvisorPanel'
import NewsPanel           from '../components/NewsPanel'
import { fetchData, injectDisruption, MOCK_NODES, MOCK_EDGES } from '../services/api'
import { AreaChart, Area, Tooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts'

// ── Log helpers ──────────────────────────────────────────────────────────────
let logId = 0
function makeLog(type, message, value) {
  return {
    id: ++logId,
    type,
    message,
    value,
    time: new Date().toLocaleTimeString(),
  }
}

const INITIAL_LOGS = [
  makeLog('info',   'InsureRoute system initialised', null),
  makeLog('model',  'Isolation Forest loaded (n=200, contamination=0.08)', null),
  makeLog('info',   'Graph engine ready — 50 nodes, Dijkstra active', null),
  makeLog('info',   'Streaming live data from simulation pipeline', null),
  makeLog('info',   'Live weather monitor active — 8 Pune-Mumbai checkpoints', null),
]

// ── Risk trend history ───────────────────────────────────────────────────────
const MAX_TREND = 30

// ── Detection source legend items ────────────────────────────────────────────
const DETECTION_LEGEND = [
  { color: '#22c55e', dot: true,  label: 'ML Detection' },
  { color: '#ef4444', dot: true,  label: 'Live Weather'  },
  { color: '#eab308', dot: true,  label: 'Manual Inject' },
]

// ── Dashboard ───────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data,         setData]         = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [isMock,       setIsMock]       = useState(false)
  const [logs,         setLogs]         = useState(INITIAL_LOGS)
  const [trend,        setTrend]        = useState([])
  const [disrupted,    setDisrupted]    = useState(false)
  const [triggerSrc,   setTriggerSrc]   = useState('MANUAL_OR_ML')
  const [weatherState, setWeatherState] = useState(null)

  const [params, setParams] = useState({
    origin:      '',
    destination: '',
    monsoon:     true,
    weatherType: 'Monsoon Status',
    cargoType:   'Standard',
    threshold:   -0.15,
  })

  const addLog = useCallback((type, msg, val) => {
    setLogs(prev => [...prev.slice(-49), makeLog(type, msg, val)])
  }, [])

  // ── Poll /weather-status to drive RouteTimeline ──────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('http://localhost:8000/weather-status', {
          signal: AbortSignal.timeout(8000),
        })
        if (res.ok) setWeatherState(await res.json())
      } catch { /* silently ignore */ }
    }
    poll()
    const t = setInterval(poll, 30_000)
    return () => clearInterval(t)
  }, [])

  // ── Fetch tick ─────────────────────────────────────────────────────────────
  const fetchTick = useCallback(async (forceInject = false) => {
    // If no endpoints are selected, clear data and don't fetch
    if (!params.origin || !params.destination) {
      setData(null)
      return
    }

    setLoading(true)
    try {
      const { data: d, mock } = forceInject
        ? await injectDisruption(params)
        : await fetchData(params)

      setData(d)
      setIsMock(mock)

      const isDisrupted = d.route?.disruption_detected ?? false
      const src         = d.trigger_source ?? 'MANUAL_OR_ML'
      setDisrupted(isDisrupted)
      setTriggerSrc(src)

      // Trend
      setTrend(prev => [
        ...prev.slice(-(MAX_TREND - 1)),
        { t: new Date().toLocaleTimeString(), risk: Math.round((d.kpis?.risk ?? 0) * 10) / 10 },
      ])

      // Logs
      if (forceInject) {
        addLog('disruption', `Manual disruption injected at ${params.origin.replace('_', ' ')}`, `Score: ${d.anomaly_score?.toFixed(3)}`)
        addLog('reroute',    `Alternate route via ${(d.route?.path ?? [])[1]?.replace('_', ' ') ?? 'hub'}`, null)
        addLog('savings',    'Hedge cost recalculated after reroute', `₹${(d.insurance?.savings ?? 0).toLocaleString('en-IN')} saved`)
      } else if (src === 'LIVE_WEATHER' && isDisrupted) {
        addLog('disruption', `Live weather triggered: ${d.weather_alert ?? 'disruption detected'}`, `Point: ${d.disruption_point ?? '—'}`)
        addLog('reroute',    `Auto-rerouting via ${d.alternate_via ?? 'Bhiwandi'} Hub`, null)
        addLog('savings',    'Insurance recalculated — live weather premium', `₹${(d.insurance?.savings ?? 0).toLocaleString('en-IN')} saved`)
      } else if (isDisrupted) {
        addLog('disruption', 'Anomaly detected in transit data', `P=${(d.insurance?.disruption_probability * 100).toFixed(1)}%`)
      } else {
        const tips = [
          `Shipment ${params.origin.replace('_', ' ')} → ${params.destination.replace('_', ' ')} on track`,
          `Delay ratio: ${d.raw?.delay_ratio?.toFixed(2) ?? '—'}`,
          `Weather severity: ${((d.raw?.weather_severity ?? 0) * 100).toFixed(0)}%`,
          `Pricing engine updated — hedge ₹${(d.insurance?.before_cost ?? 0).toLocaleString('en-IN')}`,
        ]
        addLog('info', tips[logId % tips.length], null)
      }
    } catch (e) {
      addLog('info', 'Pipeline tick error — retrying', null)
    } finally {
      setLoading(false)
    }
  }, [params, addLog])

  // ── Initial fetch + 3s auto-refresh ──────────────────────────────────────
  useEffect(() => { fetchTick() }, [])
  useEffect(() => {
    const t = setInterval(() => fetchTick(), 3000)
    return () => clearInterval(t)
  }, [fetchTick])

  const ins   = data?.insurance
  const kpis  = data?.kpis
  const route = data?.route
  const nodes = data?.nodes ?? MOCK_NODES
  const edges = data?.edges ?? MOCK_EDGES

  const isLiveWeather = triggerSrc === 'LIVE_WEATHER' && disrupted

  // Route checkpoints come from our /weather-status polling
  const routeCheckpoints = weatherState?.checkpoints ?? []

  return (
    <div className="min-h-screen bg-bg flex flex-col relative z-10 text-text font-sans">
      <Navbar
        isLive={true}
        disrupted={disrupted}
        isMock={isMock}
        params={params}
        onParamsChange={setParams}
        onInject={() => fetchTick(true)}
        onRefresh={() => fetchTick(false)}
        loading={loading}
      />

      <main className="flex-1 px-4 md:px-6 py-3 space-y-3 max-w-[1600px] mx-auto w-full">

        {/* ── Live Weather Banner (always present, manages its own state) ── */}
        <WeatherStatusBanner />

        {/* ── Disruption alert ── */}
        <AnimatePresence>
          {disrupted && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className={`border rounded-xl px-5 py-3 flex items-center gap-3 shadow-sm ${
                isLiveWeather
                  ? 'border-amber-500/50 bg-amber-50'
                  : 'border-pulse-red border bg-red-50'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 animate-ping ${
                  isLiveWeather ? 'bg-amber-500' : 'bg-danger'
                }`}
              />
              <div className="flex-1 min-w-0">
                {isLiveWeather ? (
                  <>
                    <span className="text-amber-700 font-bold text-sm">
                      LIVE WEATHER DISRUPTION DETECTED
                    </span>
                    <span className="text-amber-800/80 text-sm ml-2 font-medium">
                      {data?.weather_alert} ·
                      Rerouting via {data?.alternate_via ?? 'Bhiwandi'} ·
                      Hedge ₹{(ins?.before_cost ?? 0).toLocaleString('en-IN')} → ₹{(ins?.after_cost ?? 0).toLocaleString('en-IN')}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-danger font-bold text-sm">DISRUPTION DETECTED</span>
                    <span className="text-danger/80 text-sm ml-2 font-medium">
                      {params.origin.replace(/_/g, ' ')} → {params.destination.replace(/_/g, ' ')} ·
                      Risk {((ins?.disruption_probability ?? 0) * 100).toFixed(1)}% ·
                      Hedge ₹{(ins?.before_cost ?? 0).toLocaleString('en-IN')} → ₹{(ins?.after_cost ?? 0).toLocaleString('en-IN')}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isLiveWeather && (
                  <span className="text-xs font-bold text-white bg-green-600 px-2 py-1 rounded-full">
                    Live Data
                  </span>
                )}
                <div
                  className={`text-xs font-semibold px-2 py-1 rounded ${
                    isLiveWeather
                      ? 'text-amber-700/80 bg-amber-100'
                      : 'text-danger/70 bg-red-100'
                  }`}
                >
                  {isLiveWeather ? 'Auto-rerouted' : 'Reroute applied'}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main Three-Column Grid (KPIs, Map, Insurance) ── */}
        <div className="grid grid-cols-1 md:grid-cols-10 lg:grid-cols-5 gap-4 lg:gap-5 md:h-[700px] lg:h-[calc(100vh-170px)] lg:min-h-[600px] overflow-hidden">
          
          {/* Left Column (20% Desktop, 30% Tablet) - KPI Cards */}
          <div className="md:col-span-3 lg:col-span-1 flex flex-col gap-3 overflow-y-auto no-scrollbar h-full">
            <KPICards kpis={kpis} />
          </div>

          {/* Center Column (60% Desktop, 70% Tablet) - Map */}
          <div className="md:col-span-7 lg:col-span-3 md:row-span-2 lg:row-span-1 flex flex-col rounded-xl overflow-hidden h-[450px] md:h-full min-h-0 order-first md:order-none relative">
            <GraphView nodes={nodes} edges={edges} route={route} params={params} setParams={setParams} loading={loading} />
          </div>

          {/* Right Column (20% Desktop, 30% Tablet) - Insurance Panel */}
          <div className="md:col-span-3 lg:col-span-1 flex flex-col h-full min-h-0 overflow-y-auto no-scrollbar">
            <InsurancePanel insurance={ins} disrupted={disrupted} />
          </div>

        </div>

        {/* ── Route Timeline ── */}
        <RouteTimeline
          route={route}
          nodes={nodes}
          checkpoints={routeCheckpoints}
          isDisrupted={disrupted}
        />

        {/* ── AI Insights & Intelligence ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5 items-stretch">
          <AIAdvisorPanel
            params={params}
            isMock={isMock}
            routePath={route?.path ?? []}
            weatherState={weatherState}
          />
          <NewsPanel params={params} />
        </div>

        {/* ── Bottom row: Trend + Logs ── */}
        <div className="flex flex-col gap-5">
          {/* Trend Chart */}
          <div className="glass px-5 py-4 flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <span className="text-sm font-semibold text-text">Risk Trend (Last {MAX_TREND} Ticks)</span>
              <div className="flex items-center gap-4 flex-wrap">
                {/* Detection legend */}
                <div className="flex items-center gap-3">
                  {DETECTION_LEGEND.map(l => (
                    <div key={l.label} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                      <span className="text-[10px] text-slate-500">{l.label}</span>
                    </div>
                  ))}
                </div>
                <span
                  className={`text-sm font-bold ${
                    (trend.at(-1)?.risk ?? 0) > 60 ? 'text-danger' : 'text-success'
                  }`}
                >
                  {trend.at(-1)?.risk ?? 0}% Current
                </span>
              </div>
            </div>
            {trend.length > 2 ? (
              <div className="w-full h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={isLiveWeather ? '#f59e0b' : disrupted ? '#dc2626' : '#2563eb'} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={isLiveWeather ? '#f59e0b' : disrupted ? '#dc2626' : '#2563eb'} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="t" hide />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                      labelStyle={{ color: '#64748b' }}
                      formatter={v => [`${v}%`, 'Risk']}
                    />
                    <Area
                      type="monotone" dataKey="risk"
                      stroke={isLiveWeather ? '#f59e0b' : disrupted ? '#dc2626' : '#2563eb'}
                      strokeWidth={2}
                      fill="url(#riskGrad)"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted">Awaiting data...</div>
            )}
          </div>

          <LogsPanel logs={logs} />
        </div>

        {/* ── Footer ── */}
        <div className="text-center text-[11px] text-muted py-2 border-t border-border">
          InsureRoute SaaS Dashboard · Smart Supply Chain Disruption Detection
          {isMock && <span className="ml-2 text-warning font-semibold">· Mock Mode Active</span>}
          {isLiveWeather && (
            <span className="ml-2 text-amber-500 font-semibold">· Live Weather Mode Active</span>
          )}
        </div>
      </main>
    </div>
  )
}
