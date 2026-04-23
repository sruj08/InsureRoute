"""
weather_service.py — Live weather monitoring for all 8 checkpoints
on the real Pune-Mumbai expressway route.

Uses OpenWeatherMap free-tier /data/2.5/weather endpoint.
Falls back gracefully if API key is missing or API is unavailable.
"""

import os
import time
import logging
from datetime import datetime
from typing import Optional

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

try:
    try:
        from env_loader import load_insure_route_env
    except ImportError:
        from backend.env_loader import load_insure_route_env
    load_insure_route_env()
except ImportError:
    pass

logger = logging.getLogger("insure_route.weather")

# ── Pune-Mumbai route checkpoints ────────────────────────────────────────────
CHECKPOINTS = [
    {"name": "Pune",        "lat": 18.5204, "lon": 73.8567, "role": "origin"},
    {"name": "Lonavla",     "lat": 18.7481, "lon": 73.4072, "role": "mountain_pass"},
    {"name": "Khopoli",     "lat": 18.7867, "lon": 73.3417, "role": "expressway_entry"},
    {"name": "Khalapur",    "lat": 18.8200, "lon": 73.2600, "role": "mid_route"},
    {"name": "Panvel",      "lat": 18.9894, "lon": 73.1175, "role": "highway_junction"},
    {"name": "Navi Mumbai", "lat": 19.0330, "lon": 73.0297, "role": "urban_entry"},
    {"name": "Mumbai",      "lat": 19.0760, "lon": 72.8777, "role": "destination"},
    {"name": "Bhiwandi",    "lat": 19.2813, "lon": 73.0579, "role": "alternate_hub"},
]

OWM_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
_OFFLINE_RESULT = {
    "is_dangerous": False,
    "reason": "Weather API unavailable - running on ML detection only",
    "checkpoints": [],
    "api_status": "offline",
    "last_checked": None,
}


def _get_api_key() -> Optional[str]:
    return os.environ.get("OPENWEATHER_API_KEY", "").strip() or None


def _fetch_checkpoint_weather(lat: float, lon: float, api_key: str) -> Optional[dict]:
    """Fetch raw OWM response for a single lat/lon. Returns None on failure."""
    try:
        resp = requests.get(
            OWM_BASE_URL,
            params={"lat": lat, "lon": lon, "appid": api_key, "units": "metric"},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        logger.warning("OWM request failed for lat=%s lon=%s: %s", lat, lon, exc)
        return None


def _parse_checkpoint(raw: dict, checkpoint: dict) -> dict:
    """Extract fields from OWM JSON and evaluate danger/severity."""
    weather_id   = raw.get("weather", [{}])[0].get("id", 800)
    description  = raw.get("weather", [{}])[0].get("description", "unknown")
    rain_data    = raw.get("rain", {})
    rain_1h      = float(rain_data.get("1h", 0) if isinstance(rain_data, dict) else 0)
    wind_speed   = float(raw.get("wind", {}).get("speed", 0))
    temperature  = float(raw.get("main", {}).get("temp", 25))
    humidity     = int(raw.get("main", {}).get("humidity", 50))

    # ── Danger flag ─────────────────────────────────────────────────────────
    is_dangerous = (
        (200 <= weather_id <= 622)
        or (rain_1h > 2.5)
        or (wind_speed > 10)
    )

    # ── Severity score (0.0 – 1.0) ──────────────────────────────────────────
    severity = 0.0
    if rain_1h > 2.5:
        severity += 0.3
    if rain_1h > 7.5:
        severity += 0.2
    if wind_speed > 10:
        severity += 0.2
    if 200 <= weather_id <= 299:   # thunderstorm
        severity += 0.3
    severity = round(min(severity, 1.0), 3)

    return {
        "name":         checkpoint["name"],
        "role":         checkpoint["role"],
        "is_dangerous": is_dangerous,
        "severity":     severity,
        "rain_1h":      round(rain_1h, 2),
        "wind_speed":   round(wind_speed, 2),
        "temperature":  round(temperature, 1),
        "description":  description,
        "humidity":     humidity,
        "weather_id":   weather_id,
    }


def _build_reason(cp: dict) -> str:
    """Build a human-readable disruption reason string."""
    parts = []
    if cp["rain_1h"] > 2.5:
        parts.append(f"Heavy rainfall {cp['rain_1h']}mm/hr")
    if cp["wind_speed"] > 10:
        parts.append(f"strong winds {cp['wind_speed']}m/s")
    if 200 <= cp["weather_id"] <= 299:
        parts.append("thunderstorm activity")
    if not parts:
        parts.append(f"{cp['description']}")
    role_label = cp["role"].replace("_", " ")
    return f"{', '.join(parts)} detected at {cp['name']} {role_label}"


def fetch_route_weather() -> dict:
    """
    Main entry point. Fetches live weather for all 8 checkpoints and
    returns a structured disruption assessment dict.
    """
    api_key = _get_api_key()
    if not api_key or not REQUESTS_AVAILABLE:
        result = dict(_OFFLINE_RESULT)
        result["last_checked"] = datetime.utcnow().isoformat()
        return result

    parsed_checkpoints = []
    try:
        for i, cp in enumerate(CHECKPOINTS):
            if i > 0:
                time.sleep(2)  # respect free-tier rate limits (60 req/min)
            raw = _fetch_checkpoint_weather(cp["lat"], cp["lon"], api_key)
            if raw is None:
                # If one checkpoint fails, append a safe placeholder
                parsed_checkpoints.append({
                    "name":         cp["name"],
                    "role":         cp["role"],
                    "is_dangerous": False,
                    "severity":     0.0,
                    "rain_1h":      0.0,
                    "wind_speed":   0.0,
                    "temperature":  25.0,
                    "description":  "data unavailable",
                    "humidity":     50,
                    "weather_id":   800,
                })
            else:
                parsed_checkpoints.append(_parse_checkpoint(raw, cp))

    except Exception as exc:
        logger.error("Unexpected error fetching weather: %s", exc)
        result = dict(_OFFLINE_RESULT)
        result["last_checked"] = datetime.utcnow().isoformat()
        return result

    # ── Find most severe dangerous checkpoint (excluding Bhiwandi alternate) ─
    primary_cps = [c for c in parsed_checkpoints if c["role"] != "alternate_hub"]
    dangerous   = [c for c in primary_cps if c["is_dangerous"]]
    dangerous.sort(key=lambda c: c["severity"], reverse=True)

    is_dangerous      = len(dangerous) > 0
    worst             = dangerous[0] if dangerous else None
    disruption_point  = worst["name"]  if worst else None
    disruption_role   = worst["role"]  if worst else None
    severity          = worst["severity"] if worst else 0.0
    reason            = _build_reason(worst) if worst else "All checkpoints clear"
    last_checked      = datetime.utcnow().isoformat()

    return {
        "is_dangerous":       is_dangerous,
        "disruption_point":   disruption_point,
        "disruption_role":    disruption_role,
        "reason":             reason,
        "severity":           severity,
        "alternate_route_via": "Bhiwandi",
        "checkpoints":        parsed_checkpoints,
        "last_checked":       last_checked,
        "api_status":         "online",
    }
