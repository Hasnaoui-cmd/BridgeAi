import os
import networkx as nx
import pandas as pd
import sys

# Ensure project root is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from supabase_client import supabase_admin

# Caching variables
_graph = None
_unique_nodes = []

# 1. Preset definitions
PRESETS_CONFIG = {
    "fastest":  [1.0, 0.0, 0.0, 0.0],
    "cheapest": [0.0, 1.0, 0.0, 0.0],
    "eco":      [0.0, 0.0, 1.0, 0.0],
    "premium":  [0.0, 0.0, 0.0, 1.0],
    "balanced": [0.3, 0.4, 0.1, 0.2]
}

def min_max_normalize(series: pd.Series) -> pd.Series:
    min_val = series.min()
    max_val = series.max()
    if max_val == min_val:
        return pd.Series([0.0]*len(series))
    return (series - min_val) / (max_val - min_val)

def _initialize_graph():
    global _graph, _unique_nodes
    if _graph is not None:
        return  # already initialized
        
    print("🔄 [RoutingEngine] Fetching data from Supabase 'optimisation_data'...")
    try:
        # We fetch all rows. In a huge db, we'd paginate or use chunking, but for this dataset a single select('*') works.
        response = supabase_admin.table('optimisation_data').select('*').execute()
        data = response.data
        if not data:
            print("⚠️ [RoutingEngine] No data found in 'optimisation_data'!")
            _graph = nx.MultiDiGraph()
            return
            
        df = pd.DataFrame(data)
        
        # Calculate penalty score
        df['penalty_score'] = 1.0 - df['carrier_reliability_score']
        
        # Apply min-max normalization
        df['norm_time'] = min_max_normalize(df['base_time_hours'])
        df['norm_cost'] = min_max_normalize(df['base_cost_usd'])
        df['norm_co2'] = min_max_normalize(df['co2_emissions_kg'])
        df['norm_penalty'] = min_max_normalize(df['penalty_score'])
        
        _graph = nx.MultiDiGraph()
        
        # Extract unique nodes
        nodes_set = set(df['origin_node'].unique()) | set(df['dest_node'].unique())
        _unique_nodes = sorted(list(nodes_set))
        
        for _, row in df.iterrows():
            _graph.add_edge(
                row['origin_node'],
                row['dest_node'],
                key=row['carrier_name'],
                # Real data
                mode=row['transport_mode'],
                time=row['base_time_hours'],
                cost=row['base_cost_usd'],
                co2=row['co2_emissions_kg'],
                reliability=row['carrier_reliability_score'],
                # Normalized data
                norm_time=row['norm_time'],
                norm_cost=row['norm_cost'],
                norm_co2=row['norm_co2'],
                norm_penalty=row['norm_penalty']
            )
        
        # ─────────────────────────────────────────────────────
        # Network Healer (from notebook)
        # The graph has many disconnected components (isolated groups).
        # We convert to undirected, find components, add virtual bridge
        # edges between them with high penalty values, then convert back
        # to directed — so every node can reach every other node.
        # ─────────────────────────────────────────────────────
        H = _graph.to_undirected()
        components = list(nx.connected_components(H))
        
        if len(components) > 1:
            print(f"🔗 [RoutingEngine] Connecting {len(components)} isolated groups...")
            main_comp = list(components[0])
            
            for i in range(1, len(components)):
                other_comp = list(components[i])
                # Create a bridge between the main group and each isolated group
                u, v = main_comp[0], other_comp[0]
                
                # Virtual edge with high penalty values (last-resort route)
                H.add_edge(u, v, key='Virtual_Link',
                           mode='Transfer',
                           time=48.0, cost=5000.0, co2=500.0, reliability=0.1,
                           norm_time=1.0, norm_cost=1.0, norm_co2=1.0, norm_penalty=1.0)
            
            # Convert back to directed for Dijkstra compatibility
            _graph = H.to_directed()
            print("✅ [RoutingEngine] Graph is now fully connected — all nodes are reachable.")
        
        # Update unique nodes after healing (in case new edges were added)
        _unique_nodes = sorted(list(_graph.nodes()))
        
        print(f"✅ [RoutingEngine] Graph built with {_graph.number_of_nodes()} nodes and {_graph.number_of_edges()} edges.")
    except Exception as e:
        print(f"❌ [RoutingEngine] Initialization failed: {e}")
        _graph = nx.MultiDiGraph()

def get_unique_nodes() -> list:
    """Returns a sorted list of unique nodes (cities/ports)."""
    if _graph is None:
        _initialize_graph()
    return _unique_nodes

def calculate_optimal_route(origin: str, dest: str, preset: str = "balanced") -> dict:
    """
    Calculates the optimal route based on preset weights.
    Returns the step-by-step path and aggregated totals.
    """
    if _graph is None:
        _initialize_graph()
        
    if origin not in _graph or dest not in _graph:
        return {"error": f"Origin or Destination not found in routing graph."}
        
    alpha, beta, gamma, delta = PRESETS_CONFIG.get(preset, PRESETS_CONFIG["balanced"])
    
    # Calculate composite score on the fly
    for u, v, key, data in _graph.edges(keys=True, data=True):
        composite_score = (alpha * data['norm_time']) + \
                          (beta * data['norm_cost']) + \
                          (gamma * data['norm_co2']) + \
                          (delta * data['norm_penalty'])
        _graph[u][v][key]['weight'] = composite_score
        
    try:
        path_nodes = nx.shortest_path(_graph, source=origin, target=dest, weight='weight')
        
        total_time = 0.0
        total_cost = 0.0
        total_co2 = 0.0
        steps = []
        
        for i in range(len(path_nodes) - 1):
            u = path_nodes[i]
            v = path_nodes[i+1]
            
            winning_edge_data = min(_graph[u][v].values(), key=lambda x: x['weight'])
            winning_carrier = list(_graph[u][v].keys())[list(_graph[u][v].values()).index(winning_edge_data)]
            
            steps.append({
                "origin": u,
                "dest": v,
                "mode": winning_edge_data['mode'],
                "carrier": winning_carrier,
                "cost": winning_edge_data['cost'],
                "time": winning_edge_data['time'],
                "co2": winning_edge_data['co2'],
                "reliability": winning_edge_data['reliability']
            })
            
            total_time += winning_edge_data['time']
            total_cost += winning_edge_data['cost']
            total_co2 += winning_edge_data['co2']
            
        return {
            "path": steps,
            "total_time": round(total_time, 2),
            "total_cost": round(total_cost, 2),
            "total_co2": round(total_co2, 2)
        }
        
    except nx.NetworkXNoPath:
        return {"error": f"No route found between {origin} and {dest}."}

# Call initialize so it's ready on startup
_initialize_graph()
