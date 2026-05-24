import { useState, useEffect } from 'react';
import { MapPin, ArrowRight, Leaf, Clock, DollarSign, Settings2, Loader2, ShieldCheck, Ship, Train, Truck, Plane } from 'lucide-react';

interface RouteStep {
  from: string;
  to: string;
  transport_mode: string;
  carrier_name: string;
  cost_usd: number;
  time_hours: number;
  co2_kg: number;
  reliability?: number;
}

interface RouteResponse {
  total_cost: number;
  total_time: number;
  total_co2: number;
  steps: RouteStep[];
}

export default function RouteOptimizer() {
  const [origin, setOrigin] = useState('Tangier MED');
  const [destination, setDestination] = useState('Frankfurt FRA');
  const [preset, setPreset] = useState('balanced');
  
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [nodes, setNodes] = useState<string[]>([]);

  const presets = [
    { id: 'balanced', label: 'Balanced', icon: <Settings2 size={16} /> },
    { id: 'fastest', label: 'Fastest', icon: <Clock size={16} /> },
    { id: 'cheapest', label: 'Cheapest', icon: <DollarSign size={16} /> },
    { id: 'eco', label: 'Eco-Friendly', icon: <Leaf size={16} /> },
    { id: 'premium', label: 'Premium', icon: <ShieldCheck size={16} /> }
  ];

  useEffect(() => {
    async function fetchNodes() {
      try {
        const res = await fetch('http://localhost:8000/api/route/nodes');
        if (res.ok) {
          const data = await res.json();
          const sorted = data.sort();
          setNodes(sorted);
          if (sorted.length > 0) {
            // Only update if current origin/dest are not in the new list
            setOrigin(prev => sorted.includes(prev) ? prev : sorted[0]);
            setDestination(prev => sorted.includes(prev) ? prev : sorted[sorted.length - 1]);
          }
        }
      } catch (e) {
        console.error("Failed to fetch routing nodes:", e);
      }
    }
    fetchNodes();
  }, []);

  const handleOptimize = async () => {
    setIsLoading(true);
    setError('');
    setRouteData(null);
    try {
      const res = await fetch('http://localhost:8000/api/route/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination, preset })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'No route possible between these nodes.');
      }
      const data = await res.json();
      setRouteData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getTransportIcon = (mode: string) => {
    switch (mode.toLowerCase()) {
      case 'sea': return <Ship size={18} className="text-amber-500" />;
      case 'rail': return <Train size={18} className="text-amber-500" />;
      case 'road': return <Truck size={18} className="text-amber-500" />;
      case 'air': return <Plane size={18} className="text-amber-500" />;
      default: return <MapPin size={18} className="text-amber-500" />;
    }
  };

  return (
    <div className="min-h-full bg-stone-50 text-stone-600 p-8 font-sans overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-serif text-stone-900 mb-2">Multi-Factor Route Optimizer</h1>
          <p className="text-stone-500">Query the BridgeAI routing engine to visualize and optimize your multi-hop supply chain.</p>
        </div>

        {/* Control Panel */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm relative z-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-2">Origin</label>
              <select 
                value={origin} 
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded-xl px-4 py-3 text-stone-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              >
                {nodes.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-2">Destination</label>
              <select 
                value={destination} 
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-white border border-stone-300 rounded-xl px-4 py-3 text-stone-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              >
                {nodes.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-stone-600 mb-4">Optimization Strategy</label>
            <div className="flex flex-wrap gap-3">
              {presets.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                    preset === p.id 
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 border-transparent' 
                      : 'bg-white border border-stone-300 text-stone-600 hover:border-stone-400 hover:bg-stone-50'
                  }`}
                >
                  {p.icon}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleOptimize}
            disabled={isLoading}
            className="w-full md:w-auto bg-stone-900 hover:bg-stone-800 text-white rounded-xl px-8 py-3.5 font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Settings2 size={18} />}
            <span>{isLoading ? 'Calculating Optimal Route...' : 'Calculate Optimal Route'}</span>
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-600 flex items-center space-x-3">
            <div className="bg-red-100 p-2 rounded-full flex-shrink-0">
              <ShieldCheck size={20} className="text-red-600" />
            </div>
            <div>
              <p className="font-medium">Route Calculation Failed</p>
              <p className="text-sm opacity-80">{error}</p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {routeData && !isLoading && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* KPI Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-stone-200 rounded-2xl p-6 relative overflow-hidden group hover:border-stone-300 transition-colors shadow-sm">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Clock size={64} />
                </div>
                <div className="flex items-center text-stone-500 text-sm mb-3 space-x-2">
                  <Clock size={16} className="text-amber-500" />
                  <span>Total Time</span>
                </div>
                <div className="text-4xl font-serif text-stone-900">
                  {(routeData.total_time / 24).toFixed(1)} <span className="text-xl text-stone-500 font-sans">Days</span>
                </div>
                <div className="text-sm text-stone-500 mt-2">({routeData.total_time.toFixed(0)} hours)</div>
              </div>
              
              <div className="bg-white border border-stone-200 rounded-2xl p-6 relative overflow-hidden group hover:border-stone-300 transition-colors shadow-sm">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <DollarSign size={64} />
                </div>
                <div className="flex items-center text-stone-500 text-sm mb-3 space-x-2">
                  <DollarSign size={16} className="text-amber-500" />
                  <span>Total Cost</span>
                </div>
                <div className="text-4xl font-serif text-stone-900">
                  ${routeData.total_cost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
              </div>

              <div className="bg-white border border-stone-200 rounded-2xl p-6 relative overflow-hidden group hover:border-stone-300 transition-colors shadow-sm">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Leaf size={64} />
                </div>
                <div className="flex items-center text-stone-500 text-sm mb-3 space-x-2">
                  <Leaf size={16} className="text-amber-500" />
                  <span>Total CO₂</span>
                </div>
                <div className="text-4xl font-serif text-stone-900">
                  {routeData.total_co2.toFixed(0)} <span className="text-xl text-stone-500 font-sans">kg</span>
                </div>
              </div>
            </div>

            {/* The Multi-Hop Timeline (Stepper) */}
            <div className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
              <h3 className="text-xl font-serif text-stone-900 mb-8">Supply Chain Visualization</h3>
              
              <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-6 top-4 bottom-4 w-px bg-stone-200"></div>
                
                <div className="space-y-10">
                  {routeData.steps.map((step, index) => (
                    <div key={index} className="relative pl-16">
                      
                      {/* Node Icon */}
                      <div className="absolute left-[6px] top-0 bg-white border border-stone-300 w-9 h-9 rounded-full flex items-center justify-center z-10 shadow-sm">
                        {getTransportIcon(step.transport_mode)}
                      </div>
                      
                      <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 hover:border-stone-300 transition-all">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                          <div className="flex items-center space-x-3 mb-2 md:mb-0">
                            <span className="text-lg font-medium text-stone-900">{step.from}</span>
                            <ArrowRight size={16} className="text-stone-400" />
                            <span className="text-lg font-medium text-stone-900">{step.to}</span>
                          </div>
                          <div className="bg-amber-100/50 border border-amber-200 text-amber-700 px-3 py-1 rounded-full text-xs font-medium tracking-wide">
                            {step.carrier_name} • {step.transport_mode.toUpperCase()}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 border-t border-stone-200 pt-4 mt-2">
                          <div className="flex flex-col">
                            <span className="text-xs text-stone-500 uppercase tracking-wider mb-1">Time</span>
                            <span className="text-stone-700 font-medium">{step.time_hours}h</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-stone-500 uppercase tracking-wider mb-1">Cost</span>
                            <span className="text-stone-700 font-medium">${step.cost_usd.toFixed(2)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-stone-500 uppercase tracking-wider mb-1">CO₂ Impact</span>
                            <span className="text-stone-700 font-medium">{step.co2_kg} kg</span>
                          </div>
                        </div>
                      </div>
                      
                    </div>
                  ))}
                  
                  {/* Final Destination Node */}
                  {routeData.steps.length > 0 && (
                    <div className="relative pl-16">
                      <div className="absolute left-[6px] -top-1 bg-amber-500 border-4 border-white w-9 h-9 rounded-full flex items-center justify-center z-10 shadow-sm">
                        <MapPin size={16} className="text-white" />
                      </div>
                      <div className="py-1">
                        <span className="text-lg font-medium text-stone-900">
                          {routeData.steps[routeData.steps.length - 1].to}
                        </span>
                        <p className="text-sm text-stone-500">Final Destination Reached</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
