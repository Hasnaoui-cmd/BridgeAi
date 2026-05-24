import { useState } from 'react';
import { MapPin, ArrowRight, Leaf, Clock, DollarSign, Settings2, Loader2, Navigation, Ship, Train, Truck, Plane } from 'lucide-react';

export default function Routes() {
  const [origin, setOrigin] = useState('Tangier MED');
  const [destination, setDestination] = useState('Barcelona');
  const [preset, setPreset] = useState('fastest');
  
  const [routeResult, setRouteResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const origins = ['Tangier MED', 'Casablanca', 'Nador', 'Agadir', 'Dakhla', 'Laayoune', 'Safi', 'Jorf Lasfar'];
  const destinations = ['Algeciras', 'Barcelona', 'Valencia', 'Marseille', 'Genova', 'Rotterdam', 'Antwerp', 'London', 'Hamburg'];
  const presets = [
    { id: 'fastest', label: 'Fastest (Time Optimized)' },
    { id: 'cheapest', label: 'Cheapest (Cost Optimized)' },
    { id: 'eco', label: 'Eco-Friendly (CO2 Optimized)' },
    { id: 'balanced', label: 'Balanced (AI Optimal)' }
  ];

  const handleOptimize = async () => {
    setLoading(true);
    setError('');
    setRouteResult(null);
    try {
      const res = await fetch('http://localhost:8000/api/route/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination, preset })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to optimize route');
      }
      const data = await res.json();
      setRouteResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTransportIcon = (mode: string) => {
    switch (mode.toLowerCase()) {
      case 'sea': return <Ship size={14} className="text-blue-500" />;
      case 'rail': return <Train size={14} className="text-stone-500" />;
      case 'road': return <Truck size={14} className="text-stone-500" />;
      case 'air': return <Plane size={14} className="text-sky-500" />;
      default: return <Navigation size={14} className="text-stone-400" />;
    }
  };

  return (
    <div className="h-full p-8 max-w-6xl mx-auto overflow-y-auto">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-serif text-stone-800">Route Optimization</h2>
          <p className="text-stone-500 mt-1">AI-Powered Multimodal Network Optimizer</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-stone-200 mb-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Origin</label>
            <select 
              value={origin} 
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            >
              {origins.sort().map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Destination</label>
            <select 
              value={destination} 
              onChange={(e) => setDestination(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            >
              {destinations.sort().map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Optimization Goal</label>
            <select 
              value={preset} 
              onChange={(e) => setPreset(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            >
              {presets.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <button 
              onClick={handleOptimize}
              disabled={loading}
              className="w-full bg-stone-800 hover:bg-stone-900 text-white rounded-xl px-4 py-2.5 font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Settings2 size={18} />}
              <span>{loading ? 'Optimizing...' : 'Calculate Route'}</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 rounded-2xl p-4 border border-red-100 mb-8">
          <p className="font-medium">Optimization Failed</p>
          <p className="text-sm mt-1 text-red-500">{error}</p>
        </div>
      )}

      {routeResult && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="font-medium text-lg text-stone-800 mb-4">Optimal Multimodal Path</h3>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100 shadow-sm">
              <div className="flex items-center text-stone-500 text-sm mb-2 space-x-1.5">
                <DollarSign size={14} />
                <span>Total Cost</span>
              </div>
              <div className="text-2xl font-medium text-stone-800">${routeResult.total_cost.toFixed(2)}</div>
            </div>
            
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100 shadow-sm">
              <div className="flex items-center text-stone-500 text-sm mb-2 space-x-1.5">
                <Clock size={14} />
                <span>Transit Time</span>
              </div>
              <div className="text-2xl font-medium text-stone-800">{routeResult.total_time.toFixed(1)} <span className="text-lg text-stone-500 font-normal">Hours</span></div>
            </div>

            <div className={`rounded-2xl p-4 border shadow-sm ${preset === 'eco' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-stone-50 border-stone-100'}`}>
              <div className="flex items-center text-stone-500 text-sm mb-2 space-x-1.5">
                <Leaf size={14} className={preset === 'eco' ? 'text-emerald-500' : ''} />
                <span>CBAM Footprint</span>
              </div>
              <div className="text-2xl font-medium text-stone-800">{routeResult.total_co2.toFixed(1)} <span className="text-lg text-stone-500 font-normal">kg CO₂</span></div>
            </div>
          </div>

          {/* Step by Step Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
            <h4 className="font-medium text-stone-800 mb-6">Route Details</h4>
            <div className="relative border-l-2 border-stone-200 ml-4 space-y-10 py-2">
              {routeResult.steps.map((step: any, index: number) => (
                <div key={index} className="relative pl-10">
                  <div className="absolute -left-[17px] top-0 bg-white p-1.5 rounded-full border-2 border-stone-200 shadow-sm z-10">
                    {getTransportIcon(step.transport_mode)}
                  </div>
                  
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-lg text-stone-800">{step.from}</span>
                      <ArrowRight size={16} className="text-stone-400" />
                      <span className="font-semibold text-lg text-stone-800">{step.to}</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-stone-600 flex items-center flex-wrap gap-4">
                    <span className="bg-stone-100 px-3 py-1 rounded-lg font-medium border border-stone-200">
                      {step.carrier_name}
                    </span>
                    <span className="flex items-center space-x-1.5 bg-stone-50 px-2 py-1 rounded-md">
                      <Clock size={14} className="text-stone-400" /> <span className="font-medium">{step.time_hours}h</span>
                    </span>
                    <span className="flex items-center space-x-1.5 bg-stone-50 px-2 py-1 rounded-md">
                      <DollarSign size={14} className="text-stone-400" /> <span className="font-medium">${step.cost_usd}</span>
                    </span>
                    <span className="flex items-center space-x-1.5 bg-stone-50 px-2 py-1 rounded-md">
                      <Leaf size={14} className="text-stone-400" /> <span className="font-medium">{step.co2_kg}kg</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
