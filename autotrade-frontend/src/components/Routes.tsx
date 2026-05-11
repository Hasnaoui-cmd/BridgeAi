import { MapPin, ArrowRight, Leaf, Clock, DollarSign } from 'lucide-react';

export default function Routes() {
  const routes = [
    {
      id: 1,
      name: 'Direct Ferry Express',
      path: 'Tanger Med → Algeciras',
      cost: 1250,
      time: 1.5,
      co2: 850,
      recommended: true
    },
    {
      id: 2,
      name: 'Land Bridge Standard',
      path: 'Casablanca → Tanger Med → Algeciras',
      cost: 980,
      time: 3.2,
      co2: 1240,
      recommended: false
    },
    {
      id: 3,
      name: 'Alternative Sea Freight',
      path: 'Nador → Almeria',
      cost: 1050,
      time: 4.0,
      co2: 920,
      recommended: false
    }
  ];

  return (
    <div className="h-full p-8 max-w-6xl mx-auto overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-serif text-stone-800">Route Optimization</h2>
        <p className="text-stone-500 mt-1">Comparing transit corridors for shipment #TR-88210</p>
      </div>

      <div className="space-y-4">
        {routes.map(route => (
          <div 
            key={route.id} 
            className={`bg-white rounded-3xl p-6 border transition-all ${
              route.recommended 
                ? 'border-amber-200 shadow-sm ring-1 ring-amber-100 bg-amber-50/10' 
                : 'border-stone-200'
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <h3 className="font-semibold text-lg text-stone-800">{route.name}</h3>
                  {route.recommended && (
                    <span className="bg-amber-100 text-amber-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
                      Ai Recommended
                    </span>
                  )}
                </div>
                <div className="flex items-center text-stone-500 text-sm space-x-2">
                  <MapPin size={14} />
                  <span className="flex space-x-2 items-center">
                    {route.path.split(' → ').map((p, i, arr) => (
                      <span key={p} className="flex space-x-2 items-center">
                        <span>{p}</span>
                        {i < arr.length - 1 && <ArrowRight size={12} className="text-stone-300" />}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                <div className="flex items-center text-stone-500 text-sm mb-2 space-x-1.5">
                  <DollarSign size={14} />
                  <span>Total Cost</span>
                </div>
                <div className="text-2xl font-medium text-stone-800">€{route.cost}</div>
              </div>
              
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                <div className="flex items-center text-stone-500 text-sm mb-2 space-x-1.5">
                  <Clock size={14} />
                  <span>Transit Time</span>
                </div>
                <div className="text-2xl font-medium text-stone-800">{route.time} <span className="text-lg text-stone-500 font-normal">Days</span></div>
              </div>

              <div className={`rounded-2xl p-4 border ${route.recommended ? 'bg-emerald-50/50 border-emerald-100' : 'bg-stone-50 border-stone-100'}`}>
                <div className="flex items-center text-stone-500 text-sm mb-2 space-x-1.5">
                  <Leaf size={14} className={route.recommended ? 'text-emerald-500' : ''} />
                  <span>CBAM Footprint</span>
                </div>
                <div className="text-2xl font-medium text-stone-800">{route.co2} <span className="text-lg text-stone-500 font-normal">kg CO₂</span></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
