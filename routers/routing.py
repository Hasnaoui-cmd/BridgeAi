from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.routing_engine import calculate_optimal_route, get_unique_nodes

router = APIRouter(prefix="/api/route", tags=["Routing Optimizer"])

class RouteRequest(BaseModel):
    origin: str
    destination: str
    preset: str = "balanced"

class RouteStep(BaseModel):
    origin: str
    dest: str
    mode: str
    carrier: str
    cost: float
    time: float
    co2: float
    reliability: float

class RouteResponse(BaseModel):
    total_time: float
    total_cost: float
    total_co2: float
    path: List[RouteStep]

@router.get("/nodes", response_model=List[str])
def get_nodes():
    """Returns a list of unique cities/ports available in the graph."""
    nodes = get_unique_nodes()
    if not nodes:
        raise HTTPException(status_code=500, detail="Graph not initialized or empty data.")
    return nodes

@router.post("/optimize", response_model=RouteResponse)
def optimize_route(request: RouteRequest):
    """Calculates the optimal route based on origin, destination, and strategy preset."""
    result = calculate_optimal_route(request.origin, request.destination, request.preset)
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return RouteResponse(**result)
