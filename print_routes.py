import requests
import json

res = requests.post("http://localhost:8000/api/v1/shipments/create", json={
    "origin": "PUNE_DEPOT", 
    "destination": "MUMBAI_DEST", 
    "cargo_type": "fmcg", 
    "cargo_value_inr": 500000, 
    "cargo_weight_tons": 2, 
    "priority": "safety", 
    "transport_preference": "any"
})
print(json.dumps(res.json()["options"], indent=2))
