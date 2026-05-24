from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import networkx as nx

from utils.routing_engine import get_optimal_route, get_graph_nodes

router = APIRouter(prefix="/api/route", tags=["Routing"])

@router.get("/nodes")
def get_nodes():
    return get_graph_nodes()

class RouteRequest(BaseModel):
    origin: str
    destination: str
    preset: str = "fastest"

@router.post("/optimize")
def optimize_route(request: RouteRequest):
    try:
        result = get_optimal_route(request.origin, request.destination, request.preset)
        return result
    except nx.NetworkXNoPath:
        raise HTTPException(status_code=400, detail=f"No possible route found between {request.origin} and {request.destination}.")
    except nx.NodeNotFound as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred while calculating the route: {str(e)}")
