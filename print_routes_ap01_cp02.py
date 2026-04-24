import requests
import json

res = requests.post("http://localhost:8000/api/v1/shipments/create", json={
    "origin": "AP01", 
    "destination": "CP02", 
    "cargo_type": "fmcg", 
    "cargo_value_inr": 5000000, 
    "cargo_weight_tons": 20, 
    "priority": "safety", 
    "transport_preference": "any"
})
print(json.dumps(res.json()["options"], indent=2))
