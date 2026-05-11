import { Bell } from 'lucide-react';

export default function PreferencesForm() {
  return (
    <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm">
      <h3 className="text-lg font-medium text-stone-800 mb-6 flex items-center">
        <Bell size={20} className="mr-2 text-stone-400" /> Preferences
      </h3>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-stone-800">Email Notifications</div>
            <div className="text-sm text-stone-500">Receive alerts for high risk assessments</div>
          </div>
          <button className="w-11 h-6 bg-amber-500 rounded-full relative transition-colors focus:outline-none">
            <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-transform"></span>
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-stone-800">Default Optimization Criteria</div>
            <div className="text-sm text-stone-500">Prioritize cost, time, or emissions in routing</div>
          </div>
          <select className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500">
            <option>Balanced</option>
            <option>Cost (Lowest)</option>
            <option>Time (Fastest)</option>
            <option>Emissions (Lowest)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
