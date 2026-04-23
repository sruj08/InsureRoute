"""
api.py — FastAPI bridge for the React frontend.

Run:  uvicorn backend.api:app --reload --port 8000
  OR: cd backend && uvicorn api:app --reload --port 8000
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import asyncio
import logging
import time
from datetime import datetime

from fastapi import FastAPI, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from simulation import run_tick, get_summary_stats, _initialize
from graph_engine import get_node_positions, HUBS, get_graph

try:
    from weather_service import fetch_route_weather
    WEATHER_SERVICE_AVAILABLE = True
except ImportError:
    WEATHER_SERVICE_AVAILABLE = False

try:
    from gemini_advisor import get_ai_advisory
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

try:
    from news_service import get_route_news
    NEWS_SERVICE_AVAILABLE = True
except ImportError:
    NEWS_SERVICE_AVAILABLE = False

try:
    from route_risk_advisor import get_route_risk_analysis
    ROUTE_RISK_ADVISOR_AVAILABLE = True
except ImportError:
    ROUTE_RISK_ADVISOR_AVAILABLE = False

logger = logging.getLogger("insure_route.api")

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="InsureRoute API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global weather state (updated every 60 s by background task) ─────────────
live_weather_state: dict = {
    "is_dangerous": False,
    "reason": "Weather API unavailable - running on ML detection only",
    "checkpoints": [],
    "api_status": "initialising",
    "last_checked": None,
}

_weather_task_running = False


# ── Background weather polling loop ──────────────────────────────────────────
async def _weather_polling_loop():
    """Poll OpenWeatherMap every 60 seconds and update live_weather_state."""
    global live_weather_state, _weather_task_running
    _weather_task_running = True
    while True:
        try:
            if WEATHER_SERVICE_AVAILABLE:
                # Run blocking I/O in thread pool so we don't block the event loop
                result = await asyncio.get_event_loop().run_in_executor(
                    None, fetch_route_weather
                )
                live_weather_state = result

                if result.get("is_dangerous"):
                    point  = result.get("disruption_point", "unknown")
                    reason = result.get("reason", "")
                    print(
                        f"[InsureRoute] LIVE WEATHER AUTO-TRIGGERED "
                        f"at {point}: {reason}"
                    )
                    logger.warning(
                        "LIVE WEATHER AUTO-TRIGGERED at %s: %s", point, reason
                    )
            else:
                live_weather_state = {
                    "is_dangerous": False,
                    "reason": "Weather service module not available",
                    "checkpoints": [],
                    "api_status": "offline",
                    "last_checked": datetime.utcnow().isoformat(),
                }
        except Exception as exc:
            logger.error("Weather polling error: %s", exc)
            live_weather_state = {
                "is_dangerous": False,
                "reason": "Weather API unavailable - running on ML detection only",
                "checkpoints": [],
                "api_status": "offline",
                "last_checked": datetime.utcnow().isoformat(),
            }
        await asyncio.sleep(60)


# ── Startup: warm ML engine + kick off weather polling ───────────────────────
@app.on_event("startup")
async def startup():
    _initialize()
    # Fire the first weather check immediately (non-blocking)
    asyncio.create_task(_weather_polling_loop())


# ── Schemas ────────────────────────────────────────────────────────────────────
class DisruptionRequest(BaseModel):
    origin: str = "Pune_Hub"
    destination: str = "Mumbai_Hub"
    cargo_value: float = 70000
    monsoon: bool = True
    perishable: bool = True
    anomaly_threshold: float = -0.15


# ── Helpers ────────────────────────────────────────────────────────────────────
def build_graph_payload():
    G = get_graph()
    positions = get_node_positions()
    nodes = []
    for hub in HUBS:
        pos = positions.get(hub, (80.0, 20.0))
        nodes.append({"id": hub, "label": hub.replace("_", " "), "lon": pos[0], "lat": pos[1]})

    edges = []
    for src, dst, data in list(G.edges(data=True))[:200]:
        edges.append({
            "source": src,
            "target": dst,
            "weight": data.get("weight", 1),
            "distance": data.get("distance", 0),
        })
    return nodes, edges


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "ts": time.time()}


@app.get("/hubs")
def hubs():
    return {"hubs": HUBS}


@app.get("/weather-status")
def weather_status():
    """Returns the latest live weather assessment for all 8 route checkpoints."""
    return live_weather_state


@app.get("/data")
def get_data(
    origin: str = Query("Pune_Hub"),
    destination: str = Query("Mumbai_Hub"),
    cargo_value: float = Query(70000),
    monsoon: bool = Query(True),
    perishable: bool = Query(True),
    anomaly_threshold: float = Query(-0.15),
):
    weather = live_weather_state  # snapshot — avoids race with background task

    # ── Decide whether live weather forces a disruption ───────────────────────
    weather_triggered = weather.get("is_dangerous", False)
    weather_severity  = weather.get("severity", 0.0) if weather_triggered else 0.0

    # When weather triggers disruption we force inject=True so the ML pipeline
    # also exercises the rerouting / pricing logic.
    tick = run_tick(
        origin=origin,
        destination=destination,
        cargo_value=cargo_value,
        monsoon=monsoon,
        perishable=perishable,
        inject_disruption=weather_triggered,   # auto-inject when live weather is bad
        anomaly_threshold=anomaly_threshold,
    )
    stats = get_summary_stats()
    nodes, edges = build_graph_payload()

    # ── Override / augment pricing when driven by live weather ───────────────
    pricing = tick["pricing"]
    if weather_triggered:
        weather_multiplier = round(min(weather_severity * 1.4, 1.8), 3)
        # Patch the pricing dict in-place (all formula logic untouched)
        pricing["weather_multiplier"] = weather_multiplier

    response = {
        "kpis": {
            "sla":               stats["sla_breach_rate"],
            "delay":             stats["avg_delay_pct"],
            "risk":              round(tick["disruption_probability"] * 100, 1),
            "savings":           pricing["savings_pct"],
            "total_disruptions": stats["total_disruptions"],
            "total_shipments":   stats["total_shipments"],
        },
        "insurance": {
            "cargo_value":            pricing["cargo_value"],
            "disruption_probability": tick["disruption_probability"],
            "base_premium":           pricing["base_premium"],
            "before_cost":            pricing["hedge_cost_before"],
            "after_cost":             pricing["hedge_cost_after"],
            "savings":                pricing["savings_inr"],
            "savings_pct":            pricing["savings_pct"],
            "weather_multiplier":     pricing["weather_multiplier"],
            "perishable_multiplier":  pricing["perishable_multiplier"],
        },
        "route": {
            **tick["route"],
            "disruption_detected": tick["disruption_detected"] or weather_triggered,
            "origin":      tick["origin"],
            "destination": tick["destination"],
        },
        "anomaly_score": tick["anomaly_score"],
        "nodes": nodes,
        "edges": edges,
        "flags": tick["flags"],
        "raw":   tick["raw_sample"],
        # ── Weather metadata ─────────────────────────────────────────────────
        "trigger_source":  "LIVE_WEATHER"   if weather_triggered else "MANUAL_OR_ML",
        "live_data":       True,
        **(
            {
                "weather_alert":     weather.get("reason"),
                "disruption_point":  weather.get("disruption_point"),
                "alternate_via":     "Bhiwandi",
                "weather_clear":     False,
            }
            if weather_triggered
            else {"weather_clear": True}
        ),
    }
    return response


@app.post("/inject-disruption")
def inject_disruption(req: DisruptionRequest):
    # ── Unchanged — manual injection path ────────────────────────────────────
    tick = run_tick(
        origin=req.origin,
        destination=req.destination,
        cargo_value=req.cargo_value,
        monsoon=req.monsoon,
        perishable=req.perishable,
        inject_disruption=True,
        anomaly_threshold=req.anomaly_threshold,
    )
    stats = get_summary_stats()
    nodes, edges = build_graph_payload()

    return {
        "kpis": {
            "sla":               stats["sla_breach_rate"],
            "delay":             stats["avg_delay_pct"],
            "risk":              round(tick["disruption_probability"] * 100, 1),
            "savings":           tick["pricing"]["savings_pct"],
            "total_disruptions": stats["total_disruptions"],
            "total_shipments":   stats["total_shipments"],
        },
        "insurance": {
            "cargo_value":            tick["pricing"]["cargo_value"],
            "disruption_probability": tick["disruption_probability"],
            "base_premium":           tick["pricing"]["base_premium"],
            "before_cost":            tick["pricing"]["hedge_cost_before"],
            "after_cost":             tick["pricing"]["hedge_cost_after"],
            "savings":                tick["pricing"]["savings_inr"],
            "savings_pct":            tick["pricing"]["savings_pct"],
            "weather_multiplier":     tick["pricing"]["weather_multiplier"],
            "perishable_multiplier":  tick["pricing"]["perishable_multiplier"],
        },
        "route": {
            **tick["route"],
            "disruption_detected": tick["disruption_detected"],
            "origin":      tick["origin"],
            "destination": tick["destination"],
        },
        "anomaly_score": tick["anomaly_score"],
        "nodes":   nodes,
        "edges":   edges,
        "flags":   tick["flags"],
        "raw":     tick["raw_sample"],
        "injected": True,
        "trigger_source": "MANUAL_OR_ML",
        "live_data": True,
    }


@app.get("/ai-advisor")
def ai_advisor(
    origin: str = Query("Pune_Hub"),
    destination: str = Query("Mumbai_Hub"),
    cargo_value: float = Query(70000),
    monsoon: bool = Query(True),
    perishable: bool = Query(True),
    anomaly_threshold: float = Query(-0.15),
):
    """Generate an AI risk assessment using Google Gemini."""
    if not GEMINI_AVAILABLE:
        return {
            "available": False,
            "summary": "Gemini advisor module not installed.",
            "actions": [],
            "insurance_tip": "",
            "model": None,
        }

    weather = live_weather_state
    weather_triggered = weather.get("is_dangerous", False)

    tick = run_tick(
        origin=origin,
        destination=destination,
        cargo_value=cargo_value,
        monsoon=monsoon,
        perishable=perishable,
        inject_disruption=weather_triggered,
        anomaly_threshold=anomaly_threshold,
    )
    stats = get_summary_stats()

    context = {
        "kpis": {
            "sla": stats["sla_breach_rate"],
            "delay": stats["avg_delay_pct"],
            "risk": round(tick["disruption_probability"] * 100, 1),
            "savings": tick["pricing"]["savings_pct"],
        },
        "insurance": {
            "cargo_value": tick["pricing"]["cargo_value"],
            "disruption_probability": tick["disruption_probability"],
            "base_premium": tick["pricing"]["base_premium"],
            "before_cost": tick["pricing"]["hedge_cost_before"],
            "after_cost": tick["pricing"]["hedge_cost_after"],
            "savings": tick["pricing"]["savings_inr"],
            "savings_pct": tick["pricing"]["savings_pct"],
            "weather_multiplier": tick["pricing"]["weather_multiplier"],
            "perishable_multiplier": tick["pricing"]["perishable_multiplier"],
        },
        "route": {
            **tick["route"],
            "disruption_detected": tick["disruption_detected"] or weather_triggered,
            "origin": tick["origin"],
            "destination": tick["destination"],
        },
        "anomaly_score": tick["anomaly_score"],
        "flags": tick["flags"],
        "trigger_source": "LIVE_WEATHER" if weather_triggered else "MANUAL_OR_ML",
        "weather": weather if weather_triggered else {},
    }
    return get_ai_advisory(context)


@app.get("/route-news")
def route_news(
    origin:      str   = Query("Pune_Hub"),
    destination: str   = Query("Mumbai_Hub"),
    cargo_value: float = Query(70000),
    monsoon:     bool  = Query(True),
    perishable:  bool  = Query(True),
    anomaly_threshold: float = Query(-0.15),
):
    """Generate a route-specific AI intelligence brief using Gemini."""
    if not NEWS_SERVICE_AVAILABLE:
        return {
            "available": False,
            "briefs": ["News service module not installed."],
            "cached": False,
            "route": f"{origin} → {destination}",
        }

    weather           = live_weather_state
    weather_triggered = weather.get("is_dangerous", False)

    # Run a quick tick to get the risk score for this specific route
    tick = run_tick(
        origin=origin,
        destination=destination,
        cargo_value=cargo_value,
        monsoon=monsoon,
        perishable=perishable,
        inject_disruption=weather_triggered,
        anomaly_threshold=anomaly_threshold,
    )

    route_info  = tick.get("route", {})
    path_names  = route_info.get("path", [origin, destination])
    distance_km = route_info.get("total_distance_km", (len(path_names) - 1) * 150)
    travel_hrs  = route_info.get("total_time_hrs", round(distance_km / 60, 1))

    context = {
        "origin":           origin,
        "destination":      destination,
        "path_names":       path_names,
        "live_checkpoints": weather.get("checkpoints", []),
        "distance_km":      distance_km,
        "travel_hrs":       travel_hrs,
        "risk_pct":         round(tick["disruption_probability"] * 100, 1),
        "anomaly_score":    tick["anomaly_score"],
        "monsoon":          monsoon,
        "perishable":       perishable,
        "is_disrupted":     tick["disruption_detected"] or weather_triggered,
    }

    return get_route_news(context)


@app.get("/route-risk-analysis")
def route_risk_analysis(
    origin:      str   = Query("Pune_Hub"),
    destination: str   = Query("Mumbai_Hub"),
    path:        str   = Query(""),        # JSON-encoded list of node IDs
    cargo_value: float = Query(70000),
    monsoon:     bool  = Query(True),
    perishable:  bool  = Query(True),
    anomaly_threshold: float = Query(-0.15),
):
    """
    Generate a full structured route risk analysis for ANY source→destination.
    - For Pune-Mumbai: injects live OWM weather checkpoint data.
    - For all other routes: uses path node IDs with seeded simulation weather.
    """
    if not ROUTE_RISK_ADVISOR_AVAILABLE:
        return {
            "available": False,
            "error": "Route risk advisor module not installed.",
            "overall_status": "Moderate",
        }

    # Parse path from JSON query param
    try:
        import json as _json
        path_names = _json.loads(path) if path else [origin, destination]
    except Exception:
        path_names = [origin, destination]

    # Run a tick to get ML model output
    weather        = live_weather_state
    weather_triggered = weather.get("is_dangerous", False)

    tick = run_tick(
        origin=origin,
        destination=destination,
        cargo_value=cargo_value,
        monsoon=monsoon,
        perishable=perishable,
        inject_disruption=weather_triggered,
        anomaly_threshold=anomaly_threshold,
    )

    route_info = tick.get("route", {})
    distance_km = route_info.get("total_distance_km", (len(path_names) - 1) * 150)
    travel_hrs  = route_info.get("total_time_hrs",    round(distance_km / 60, 1))

    # If path not provided, use the ML engine's computed path
    if not path_names or path_names == [origin, destination]:
        engine_path = route_info.get("path", [origin, destination])
        if engine_path and len(engine_path) >= 2:
            path_names = engine_path

    context = {
        "origin":           origin,
        "destination":      destination,
        "path_names":       path_names,
        "live_checkpoints": weather.get("checkpoints", []),
        "distance_km":      distance_km,
        "travel_hrs":       travel_hrs,
        "risk_pct":         round(tick["disruption_probability"] * 100, 1),
        "anomaly_score":    tick["anomaly_score"],
        "monsoon":          monsoon,
        "perishable":       perishable,
        "is_disrupted":     tick["disruption_detected"] or weather_triggered,
    }

    return get_route_risk_analysis(context)

