import axios from 'axios'

const BASE = 'http://localhost:8000'

// ── API client ──────────────────────────────────────────────────────────────
const client = axios.create({ baseURL: BASE, timeout: 5000 })

// ── Network nodes (Indian supply chain hubs, lon/lat) ─────────────────────
export const MOCK_NODES = [
  { id: 'Delhi_Hub',          label: 'Delhi Hub',         lon: 77.1, lat: 28.7 },
  { id: 'Mumbai_Hub',         label: 'Mumbai Hub',        lon: 72.8, lat: 19.1 },
  { id: 'Bangalore_Hub',      label: 'Bangalore Hub',     lon: 77.6, lat: 12.9 },
  { id: 'Chennai_Hub',        label: 'Chennai Hub',       lon: 80.3, lat: 13.1 },
  { id: 'Kolkata_Hub',        label: 'Kolkata Hub',       lon: 88.4, lat: 22.6 },
  { id: 'Hyderabad_Hub',      label: 'Hyderabad Hub',     lon: 78.5, lat: 17.4 },
  { id: 'Pune_Hub',           label: 'Pune Hub',          lon: 73.9, lat: 18.5 },
  { id: 'Ahmedabad_Hub',      label: 'Ahmedabad Hub',     lon: 72.6, lat: 23.0 },
  { id: 'Jaipur_Hub',         label: 'Jaipur Hub',        lon: 75.8, lat: 26.9 },
  { id: 'Lucknow_Hub',        label: 'Lucknow Hub',       lon: 80.9, lat: 26.8 },
  { id: 'Surat_Hub',          label: 'Surat Hub',         lon: 72.8, lat: 21.2 },
  { id: 'Nashik_Hub',         label: 'Nashik Hub',        lon: 73.8, lat: 20.0 },
  { id: 'Nagpur_Hub',         label: 'Nagpur Hub',        lon: 79.1, lat: 21.1 },
  { id: 'Navi_Mumbai_DC',     label: 'Navi Mumbai',       lon: 73.0, lat: 19.0 },
  { id: 'Indore_Hub',         label: 'Indore Hub',        lon: 75.9, lat: 22.7 },
  { id: 'Bhopal_Hub',         label: 'Bhopal Hub',        lon: 77.4, lat: 23.3 },
  { id: 'Coimbatore_Hub',     label: 'Coimbatore Hub',    lon: 77.0, lat: 11.0 },
  { id: 'Visakhapatnam_Hub',  label: 'Vizag Hub',         lon: 83.3, lat: 17.7 },
  { id: 'Patna_Hub',          label: 'Patna Hub',         lon: 85.1, lat: 25.6 },
  { id: 'Kochi_Hub',          label: 'Kochi Hub',         lon: 76.3, lat: 10.0 },
]

// ── Edge graph (bidirectional hub connections) ─────────────────────────────
const EDGE_PAIRS = [
  ['Pune_Hub',       'Mumbai_Hub'],
  ['Pune_Hub',       'Nashik_Hub'],
  ['Nashik_Hub',     'Mumbai_Hub'],
  ['Nashik_Hub',     'Surat_Hub'],
  ['Surat_Hub',      'Navi_Mumbai_DC'],
  ['Navi_Mumbai_DC', 'Mumbai_Hub'],
  ['Mumbai_Hub',     'Ahmedabad_Hub'],
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
  ['Chennai_Hub',    'Visakhapatnam_Hub'],
  ['Bangalore_Hub',  'Hyderabad_Hub'],
  ['Bangalore_Hub',  'Kochi_Hub'],
  ['Bangalore_Hub',  'Coimbatore_Hub'],
  ['Hyderabad_Hub',  'Visakhapatnam_Hub'],
  ['Hyderabad_Hub',  'Nagpur_Hub'],
  ['Hyderabad_Hub',  'Chennai_Hub'],
  ['Coimbatore_Hub', 'Chennai_Hub'],
  ['Kochi_Hub',      'Coimbatore_Hub'],
  ['Nagpur_Hub',     'Hyderabad_Hub'],
  ['Nagpur_Hub',     'Bhopal_Hub'],
  ['Nagpur_Hub',     'Kolkata_Hub'],
  ['Bhopal_Hub',     'Indore_Hub'],
  ['Indore_Hub',     'Ahmedabad_Hub'],
  ['Pune_Hub',       'Bangalore_Hub'],
  ['Pune_Hub',       'Hyderabad_Hub'],
  ['Mumbai_Hub',     'Pune_Hub'],
]

export const MOCK_EDGES = EDGE_PAIRS.map(([s, t]) => ({ source: s, target: t }))

// ── BFS: shortest path between two nodes in the hub graph ─────────────────
function bfsPath(origin, destination, edgePairs) {
  if (origin === destination) return [origin]
  const adj = {}
  edgePairs.forEach(([a, b]) => {
    if (!adj[a]) adj[a] = []
    if (!adj[b]) adj[b] = []
    adj[a].push(b)
    adj[b].push(a)
  })
  const queue = [[origin]]
  const visited = new Set([origin])
  while (queue.length) {
    const path = queue.shift()
    const node = path[path.length - 1]
    for (const next of (adj[node] || [])) {
      if (visited.has(next)) continue
      const newPath = [...path, next]
      if (next === destination) return newPath
      visited.add(next)
      queue.push(newPath)
    }
  }
  return [origin, destination] // fallback: direct
}

// ── Mock data factory (used when API is unavailable) ──────────────────────
export function makeMockData(injected = false, params = {}) {
  const origin      = params.origin      || 'Pune_Hub'
  const destination = params.destination || 'Mumbai_Hub'

  const risk   = injected ? 72 + Math.random() * 20 : 25 + Math.random() * 40
  const prob   = risk / 100
  const cargo  = params.cargoValue || 70000
  const before = Math.round(cargo * prob * 0.08 * (injected ? 1.4 : 1.1) * 1.6)
  const after  = Math.round(before * 0.35)
  const savings = Math.round(before - after)
  const savPct  = Math.round((savings / before) * 100)

  // Normal path via BFS
  const normalPath = bfsPath(origin, destination, EDGE_PAIRS)

  // Rerouted path: remove direct origin→destination edge and find alternate
  const altEdges    = EDGE_PAIRS.filter(([a, b]) =>
    !(a === origin && b === destination) && !(b === origin && a === destination)
  )
  const reroutePath = injected ? bfsPath(origin, destination, altEdges) : normalPath
  const path        = injected ? reroutePath : normalPath

  // Estimates: ~150 km per hop, ~60 km/h
  const routeKm  = (path.length - 1) * 150
  const routeHrs = +(routeKm / 60).toFixed(1)

  return {
    kpis: {
      sla:               +(8 + Math.random() * 5).toFixed(1),
      delay:             +(7 + Math.random() * 6).toFixed(1),
      risk:              +risk.toFixed(1),
      savings:           savPct,
      total_disruptions: 2342,
      total_shipments:   30000,
    },
    insurance: {
      cargo_value:            cargo,
      disruption_probability: +prob.toFixed(4),
      base_premium:           Math.round(cargo * prob * 0.08),
      before_cost:            before,
      after_cost:             after,
      savings,
      savings_pct:            savPct,
      weather_multiplier:     params.weatherMult ?? 1.4,
      perishable_multiplier:  params.perishMult  ?? 1.6,
    },
    route: {
      path,
      disruption_detected: injected,
      origin,
      destination,
      total_time_hrs:    routeHrs,
      total_distance_km: routeKm,
      total_cost_inr:    Math.round(routeKm * 40),
      hops:              path.length - 1,
      rerouted:          injected,
    },
    anomaly_score: injected ? -(0.2 + Math.random() * 0.3) : -(0.05 + Math.random() * 0.1),
    flags: { monsoon: params.monsoon ?? true, perishable: params.perishable ?? true, injected },
    raw:   {
      delay_ratio:      injected ? 2.8 + Math.random() : 1.05 + Math.random() * 0.1,
      weather_severity: injected ? 0.8 : 0.2,
    },
    nodes: MOCK_NODES,
    edges: MOCK_EDGES,
  }
}

// ── API calls ────────────────────────────────────────────────────────────────
export async function fetchData(params = {}) {
  try {
    const res = await client.get('/data', { params })
    return { data: res.data, mock: false }
  } catch {
    return { data: makeMockData(false, params), mock: true }
  }
}

export async function injectDisruption(params = {}) {
  try {
    const res = await client.post('/inject-disruption', {
      origin:            params.origin      || 'Pune_Hub',
      destination:       params.destination || 'Mumbai_Hub',
      cargo_value:       params.cargoValue  || 70000,
      monsoon:           params.monsoon     ?? true,
      perishable:        params.perishable  ?? true,
      anomaly_threshold: params.threshold   ?? -0.15,
    })
    return { data: res.data, mock: false }
  } catch {
    return { data: makeMockData(true, params), mock: true }
  }
}

export async function fetchNews(params = {}) {
  try {
    const res = await client.get('/route-news', {
      params: {
        origin:            params.origin      || 'Pune_Hub',
        destination:       params.destination || 'Mumbai_Hub',
        cargo_value:       params.cargoValue  || 70000,
        monsoon:           params.monsoon     ?? true,
        perishable:        params.perishable  ?? true,
        anomaly_threshold: params.threshold   ?? -0.15,
      },
      timeout: 40000, // Gemini can take a moment
    })
    return { data: res.data, mock: false }
  } catch (error) {
    const orig = (params.origin || 'Pune Hub').replace(/_/g, ' ').replace(' Hub', '')
    const dest = (params.destination || 'Mumbai Hub').replace(/_/g, ' ').replace(' Hub', '')
    return {
      data: {
        available: false,
        briefs: [`Intelligence feed offline — ${orig} → ${dest}`],
        cached: false,
        route: `${orig} → ${dest}`,
      },
      mock: true,
    }
  }
}

function makeMockRouteIntelligence(params = {}) {
  const origin = params.origin || 'Pune_Hub'
  const destination = params.destination || 'Mumbai_Hub'
  const originLabel = origin.replace(/_Hub|_DC/g, '').replace(/_/g, ' ')
  const destLabel = destination.replace(/_Hub|_DC/g, '').replace(/_/g, ' ')
  const now = new Date()

  return {
    route: {
      origin,
      destination,
      path_nodes: [origin, destination],
      coordinates: [],
      waypoints: [],
      bounding_box: {},
      distance_km: 150,
      travel_time_hrs: 2.5,
    },
    risks: [
      {
        source: 'traffic',
        type: 'traffic',
        location: destLabel,
        severity: 0.62,
        reason: `Congestion surge detected near ${destLabel}`,
      },
    ],
    weather: [
      {
        type: 'weather',
        location: originLabel,
        severity: 0.41,
        reason: `Intermittent rain expected around ${originLabel} corridor`,
      },
    ],
    traffic: [
      {
        type: 'traffic',
        location: destLabel,
        severity: 0.62,
        reason: `Road capacity drop near ${destLabel} arterial segment`,
      },
    ],
    news: [
      {
        title: `Highway accident reported on ${originLabel} → ${destLabel} corridor`,
        source: 'Demo Logistics Wire',
        published_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        url: 'https://example.com/demo-accident',
        relevance_score: 0.84,
        location_tag: `Near ${destLabel}`,
      },
      {
        title: `Weather alert: heavy showers likely along outbound ${originLabel} stretch`,
        source: 'Demo Weather Desk',
        published_at: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
        url: 'https://example.com/demo-weather',
        relevance_score: 0.73,
        location_tag: `Near ${originLabel}`,
      },
    ],
    risk_score: 67.5,
    intelligence_highlight: `Delay expected due to highway accident near ${destLabel}`,
    news_status: {
      mode: 'fallback_demo',
      message: 'Live news unavailable (API key missing)',
    },
    generated_at: now.toISOString(),
  }
}

export async function fetchRouteIntelligence(params = {}) {
  try {
    const res = await client.get('/route-intelligence', {
      params: {
        origin: params.origin || 'Pune_Hub',
        destination: params.destination || 'Mumbai_Hub',
      },
      timeout: 20000,
    })
    return { data: res.data, mock: false }
  } catch {
    return { data: makeMockRouteIntelligence(params), mock: true }
  }
}

export async function fetchRiskAnalysis(params = {}, routePath = []) {
  try {
    const searchParams = new URLSearchParams({
      origin:      params.origin      || 'Pune_Hub',
      destination: params.destination || 'Mumbai_Hub',
      cargo_value: params.cargoValue  || 70000,
      monsoon:     params.monsoon     ?? true,
      perishable:  params.perishable  ?? true,
      ...(routePath.length > 0 && { path: JSON.stringify(routePath) }),
    })
    const res = await client.get(`/route-risk-analysis?${searchParams}`, { timeout: 45000 })
    return { data: res.data, mock: false }
  } catch (error) {
    // Return a fallback mock structure when backend is unavailable
    const orig = (params.origin      || 'Pune Hub').replace(/_/g, ' ').replace(' Hub', '')
    const dest = (params.destination || 'Mumbai Hub').replace(/_/g, ' ').replace(' Hub', '')
    return {
      data: {
        available:        true,
        route_summary:    `- Total Distance: ~${(routePath.length - 1) * 150} km\n- Estimated Travel Time: ~${Math.round((routePath.length - 1) * 2.5)} hours\n- Route Type: Mixed highway`,
        segments:         routePath.slice(0, -1).map((id, i) => ({
          name:          id.replace(/_Hub|_DC/g, '').replace(/_/g, ' '),
          traffic:       'Moderate',
          weather:       'Clear skies',
          road_risks:    'Standard highway conditions',
          safety_rating: 'Low Risk',
          advice:        'Maintain safe following distance',
        })),
        critical_segment: { name: orig, reason: 'Mock mode — backend offline', delay_probability: 'N/A', hazard_type: 'N/A' },
        recommendations:  `- Best Travel Time: Early morning\n- Speed Advisory: Follow posted speed limits\n- Alternate Route: Contact dispatch for alternatives`,
        live_status:      `- Overall Route Status: Moderate\n- Quick Decision: Proceed with standard precautions.`,
        overall_status:   'Moderate',
        quick_decision:   'Proceed with standard precautions.',
        model:            'mock-mode',
        cached:           false,
      },
      mock: true,
    }
  }
}
