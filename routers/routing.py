from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.routing_engine import calculate_optimal_route, get_unique_nodes
from supabase_client import supabase_admin

router = APIRouter(prefix="/api/route", tags=["Routing Optimizer"])

class RouteRequest(BaseModel):
    origin: str
    destination: str
    preset: str = "balanced"
    user_id: Optional[str] = None

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
        
    response = RouteResponse(**result)
    
    # Save to routing_history if user_id is provided
    try:
        if request.user_id and request.user_id.strip():
            supabase_admin.table("routing_history").insert({
                "user_id": request.user_id,
                "origin": request.origin,
                "destination": request.destination,
                "preset": request.preset,
                "route_data": response.model_dump()
            }).execute()
    except Exception as e:
        print(f"⚠️ Failed to save routing history to Supabase: {e}")
        
    return response


# ─────────────────────────────────────────────
# GET /api/route/history — Fetch route history for a user
# ─────────────────────────────────────────────
@router.get("/history")
def get_routing_history(user_id: str):
    """Returns the recent routing history for a given user."""
    try:
        if user_id and user_id.strip():
            response = supabase_admin.table("routing_history") \
                .select("id, created_at, origin, destination, preset, route_data") \
                .eq("user_id", user_id) \
                .order("created_at", desc=True) \
                .limit(20) \
                .execute()
            return {"status": "success", "data": response.data}
        return {"status": "success", "data": []}
    except Exception as e:
        print(f"❌ Routing history fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# DELETE /api/route/{route_id} — Delete a single route history entry
# ─────────────────────────────────────────────
@router.delete("/{route_id}")
def delete_routing_history(route_id: int):
    """Deletes a single route history entry."""
    try:
        supabase_admin.table("routing_history").delete().eq("id", route_id).execute()
        return {"status": "success"}
    except Exception as e:
        print(f"❌ Route delete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
