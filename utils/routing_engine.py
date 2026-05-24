import pandas as pd
import networkx as nx
from supabase_client import supabase_admin

def build_graph():
    # Fetch data from Supabase instead of local CSV
    response = supabase_admin.table('Routes_data').select('*').execute()
    
    if not response.data:
        return nx.MultiDiGraph()
        
    df = pd.DataFrame(response.data)
    # Normalization Function
    # Min-Max scale the necessary columns
    def min_max_scale(series):
        min_val = series.min()
        max_val = series.max()
        if max_val == min_val:
            return pd.Series([0.0]*len(series))
        return (series - min_val) / (max_val - min_val)

    df['norm_time'] = min_max_scale(df['base_time_hours'])
    df['norm_cost'] = min_max_scale(df['base_cost_usd'])
    df['norm_co2'] = min_max_scale(df['co2_emissions_kg'])

    graph = nx.MultiDiGraph()
    
    for idx, row in df.iterrows():
        graph.add_edge(
            row['origin_node'], 
            row['dest_node'], 
            transport_mode=row['transport_mode'],
            carrier_name=row['carrier_name'],
            base_time_hours=row['base_time_hours'],
            base_cost_usd=row['base_cost_usd'],
            co2_emissions_kg=row['co2_emissions_kg'],
            carrier_reliability_score=row['carrier_reliability_score'],
            norm_time=row['norm_time'],
            norm_cost=row['norm_cost'],
            norm_co2=row['norm_co2']
        )
    return graph

# Build the graph globally once so it can be reused by requests
graph = build_graph()

def get_graph_nodes():
    return list(graph.nodes)

def get_optimal_route(origin: str, dest: str, preset: str = "fastest"):
    if preset == "fastest":
        time_wt, cost_wt, co2_wt = 1.0, 0.0, 0.0
    elif preset == "cheapest":
        time_wt, cost_wt, co2_wt = 0.0, 1.0, 0.0
    elif preset == "eco":
        time_wt, cost_wt, co2_wt = 0.0, 0.0, 1.0
    elif preset == "balanced":
        time_wt, cost_wt, co2_wt = 0.33, 0.33, 0.33
    else:
        time_wt, cost_wt, co2_wt = 0.33, 0.33, 0.33

    # Calculate composite score for each edge dynamically based on preset
    # Note: For MultiDiGraph, edges are (u, v, key, data)
    for u, v, key, data in graph.edges(keys=True, data=True):
        composite_score = (
            time_wt * data['norm_time'] +
            cost_wt * data['norm_cost'] +
            co2_wt * data['norm_co2']
        )
        graph[u][v][key]['composite_score'] = composite_score

    # NetworkX shortest_simple_paths requires a simple graph
    # Create a simple DiGraph with the minimum weight edges
    simple_graph = nx.DiGraph()
    for u, v, data in graph.edges(data=True):
        weight = data['composite_score']
        if simple_graph.has_edge(u, v):
            if weight < simple_graph[u][v]['composite_score']:
                simple_graph[u][v]['composite_score'] = weight
        else:
            simple_graph.add_edge(u, v, composite_score=weight)

    try:
        from itertools import islice
        # Find the top 10 shortest paths
        paths = list(islice(nx.shortest_simple_paths(simple_graph, origin, dest, weight='composite_score'), 10))
        
        # Try to find a multi-hop path (len > 2) to demonstrate the multi-hop visualization
        multi_hop_paths = [p for p in paths if len(p) > 2]
        if multi_hop_paths:
            path_nodes = multi_hop_paths[0]
        else:
            path_nodes = paths[0]
            
    except nx.NetworkXNoPath:
        raise nx.NetworkXNoPath(f"No route found from {origin} to {dest}")
    except nx.NodeNotFound:
        raise nx.NodeNotFound(f"Origin {origin} or destination {dest} not found in the graph")

    steps = []
    total_cost = 0.0
    total_time = 0.0
    total_co2 = 0.0

    # Reconstruct path details
    for i in range(len(path_nodes) - 1):
        u = path_nodes[i]
        v = path_nodes[i+1]
        
        # Find the best edge between u and v
        edge_data = graph.get_edge_data(u, v)
        best_edge_key = min(edge_data, key=lambda k: edge_data[k]['composite_score'])
        best_edge = edge_data[best_edge_key]

        steps.append({
            "from": u,
            "to": v,
            "transport_mode": best_edge['transport_mode'],
            "carrier_name": best_edge['carrier_name'],
            "time_hours": best_edge['base_time_hours'],
            "cost_usd": best_edge['base_cost_usd'],
            "co2_kg": best_edge['co2_emissions_kg'],
            "reliability": best_edge['carrier_reliability_score']
        })

        total_cost += best_edge['base_cost_usd']
        total_time += best_edge['base_time_hours']
        total_co2 += best_edge['co2_emissions_kg']

    return {
        "origin": origin,
        "destination": dest,
        "preset": preset,
        "total_cost": total_cost,
        "total_time": total_time,
        "total_co2": total_co2,
        "steps": steps
    }
