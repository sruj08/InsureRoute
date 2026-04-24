from fastapi import FastAPI, WebSocket, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import json
import uuid
import os
import asyncio
from datetime import datetime
from dotenv import load_dotenv

from models.schemas import ShipmentCreate, RouteAnalysisRequest, RouteRerouteRequest, InsuranceQuoteRequest, ChatMessage
from core.graph_router import find_optimal_routes
from core.insurance_engine import calculate_dynamic_premium
from core.ml_engine import predict_risk
from core.disruption_feed import disruption_simulator
from core.gemini_agent import GeminiAgent, analyze_weather_image

load_dotenv()

app = FastAPI(title="InsureRoute API", version="1.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for demo
shipments_db = {}

# Setup agent tools
def get_disruptions_tool(checkpoint_ids: list):
    active = disruption_simulator.get_active()
    return [d for d in active if d['checkpoint_id'] in checkpoint_ids]

def score_route_tool(route_id: str, cargo_type: str, cargo_value_inr: float = 0):
    # Dummy mock scoring based on active disruptions
    active = disruption_simulator.get_active()
    if any(d['checkpoint_id'] == "CP04" for d in active):
        return 0.75
    return 0.3

def calculate_premium_tool(route_id: str, cargo_type: str, cargo_value_inr: float, coverage_type: str):
    score = score_route_tool(route_id, cargo_type)
    return calculate_dynamic_premium(score, cargo_type, cargo_value_inr, coverage_type, ["road"])

def trigger_reroute_tool(origin: str, destination: str, avoid_checkpoints: list, cargo_type: str, priority: str):
    routes = find_optimal_routes(origin, destination, blocked=avoid_checkpoints, priority=priority, cargo_type=cargo_type)
    if routes:
        return routes[0]
    return {"error": "No alternative routes available."}

def get_multimodal_options_tool(origin: str, destination: str, cargo_weight_tons: float, cargo_type: str, deadline_hours: int = 0):
    return find_optimal_routes(origin, destination, cargo_type=cargo_type, cargo_weight_tons=cargo_weight_tons)

def get_weather_forecast_tool(lat: float, lon: float, hours_ahead: int = 6):
    return {"weather_code": 3, "visibility_km": 5.5, "wind_speed_kmh": 20, "rainfall_mm": 2.1}

tool_executors = {
    "get_disruptions": get_disruptions_tool,
    "score_route": score_route_tool,
    "calculate_premium": calculate_premium_tool,
    "trigger_reroute": trigger_reroute_tool,
    "get_multimodal_options": get_multimodal_options_tool,
    "get_weather_forecast": get_weather_forecast_tool
}

agent = GeminiAgent(tool_executors)

@app.on_event("startup")
async def startup_event():
    await disruption_simulator.start()

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/v1/nodes")
def get_nodes():
    with open("data/graph_topology.json", encoding="utf-8") as f:
        return [{"id": n["id"], "name": n["name"], "lat": n["lat"], "lon": n["lon"]} for n in json.load(f)["nodes"]]

@app.get("/api/v1/cargo-types")
def get_cargo_types():
    with open("data/cargo_types.json", encoding="utf-8") as f:
        return json.load(f)

@app.post("/api/v1/shipments/create")
def create_shipment(shipment: ShipmentCreate):
    ship_id = f"SHP_{str(uuid.uuid4())[:8].upper()}"
    routes = find_optimal_routes(
        shipment.origin, 
        shipment.destination, 
        priority=shipment.priority,
        cargo_type=shipment.cargo_type,
        cargo_weight_tons=shipment.cargo_weight_tons
    )
    
    shipments_db[ship_id] = {
        "id": ship_id,
        "details": shipment.dict(),
        "routes": routes,
        "status": "pending",
        "current_route": None,
        "current_checkpoint": shipment.origin,
        "progress_pct": 0
    }
    
    return {"shipment_id": ship_id, "options": routes}

@app.get("/api/v1/routes/{id}/options")
def get_route_options(id: str):
    if id not in shipments_db:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipments_db[id]["routes"]

@app.post("/api/v1/insurance/quote")
def quote_insurance(req: InsuranceQuoteRequest):
    # Retrieve route and calculate
    score = score_route_tool(req.route_id, req.cargo_type)
    return calculate_dynamic_premium(score, req.cargo_type, req.cargo_value_inr, req.coverage_type, ["road"])

@app.post("/api/v1/gemini/chat")
async def chat_with_agent(req: ChatMessage):
    if req.shipment_id not in shipments_db:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    shipment = shipments_db[req.shipment_id]
    context = {"cargo_type": shipment["details"]["cargo_type"], "priority": shipment["details"]["priority"]}
    
    if req.image_base64:
        # User uploaded an image
        img_response = await analyze_weather_image(req.image_base64, context)
        return {"response": img_response, "tools_invoked": []}
    
    result = await agent.run(req.message, context)
    return result

@app.get("/api/v1/disruptions/live")
def get_live_disruptions():
    return disruption_simulator.get_active()

@app.websocket("/ws/monitor/{shipment_id}")
async def monitor_websocket(websocket: WebSocket, shipment_id: str):
    await websocket.accept()
    if shipment_id not in shipments_db:
        await websocket.close(code=1008)
        return
        
    try:
        while True:
            shipment = shipments_db.get(shipment_id)
            disruptions = disruption_simulator.get_active()
            
            # Dummy progression
            if shipment["progress_pct"] < 100:
                shipment["progress_pct"] += 5
                
            payload = {
                "type": "position_update",
                "shipment_id": shipment_id,
                "current_checkpoint": shipment.get("current_checkpoint"),
                "progress_pct": shipment.get("progress_pct", 0),
                "active_disruptions": disruptions,
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(5)
    except Exception:
        pass

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)