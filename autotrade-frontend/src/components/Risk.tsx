import { AlertTriangle, TrendingUp, Info } from 'lucide-react';

export default function Risk() {
  const riskScore = 72; // Out of 100
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (riskScore / 100) * circumference;

  const factors = [
    { icon: AlertTriangle, title: 'Declared Value Anomaly', desc: 'The declared value per kg is 42% lower than historical averages for HS 8544.30 on this lane.', impact: 'High' },
    { icon: TrendingUp, title: 'Inspection Rate Spike', desc: 'Algeciras port has increased systematic physical inspections for electronics by 18% this week.', impact: 'Medium' },
    { icon: Info, title: 'New Exporter Entity', desc: 'The supplier TIN was registered less than 6 months ago, triggering automated EUR.1 scrutiny.', impact: 'Medium' },
  ];

  return (
    <div className="h-full p-8 max-w-4xl mx-auto overflow-y-auto">
      <div className="mb-8 pl-4">
        <h2 className="text-2xl font-serif text-stone-800">Risk Assessment</h2>
        <p className="text-stone-500 mt-1">AI Customs Blockage Prediction</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-1 bg-white rounded-3xl p-8 border border-stone-200 shadow-sm flex flex-col items-center justify-center">
          <div className="relative w-48 h-48 mb-6">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" className="stroke-stone-100" strokeWidth="8" fill="none" />
              <circle 
                cx="50" cy="50" r="45" 
                className="stroke-amber-400 transition-all duration-1000 ease-out" 
                strokeWidth="8" fill="none" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-transparent rounded-full">
              <span className="text-5xl font-light text-stone-800 tracking-tight">{riskScore}</span>
              <span className="text-sm font-medium text-stone-400 mt-1 uppercase tracking-widest">Score</span>
            </div>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-sm font-medium">
              <AlertTriangle size={16} />
              <span>Elevated Risk</span>
            </div>
          </div>
        </div>

        <div className="col-span-2 space-y-4">
          <h3 className="font-medium text-stone-800 pl-2 mb-2">SHAP Risk Factors</h3>
          {factors.map((factor, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-start space-x-4">
              <div className={`mt-0.5 p-2 rounded-xl ${factor.impact === 'High' ? 'bg-amber-100 text-amber-600' : 'bg-stone-100 text-stone-600'}`}>
                <factor.icon size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-stone-800">{factor.title}</h4>
                  <span className="text-xs font-mono text-stone-400 bg-stone-50 px-2 py-0.5 rounded">Impact: {factor.impact}</span>
                </div>
                <p className="text-sm text-stone-500 leading-relaxed">{factor.desc}</p>
              </div>
            </div>
          ))}
          
          <button className="w-full mt-4 bg-stone-800 text-white rounded-xl py-3.5 font-medium hover:bg-stone-700 transition-colors shadow-sm">
            Generate Remediation Plan
          </button>
        </div>
      </div>
    </div>
  );
}
