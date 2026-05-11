import { useState } from 'react';
import { User, Bell, Shield } from 'lucide-react';
import ProfileForm from './settings/ProfileForm';
import PreferencesForm from './settings/PreferencesForm';
import SecurityForm from './settings/SecurityForm';

type Tab = 'profile' | 'notifications' | 'security';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  return (
    <div className="h-full p-8 max-w-4xl mx-auto overflow-y-auto">
      <div className="mb-8 pl-4">
        <h2 className="text-2xl font-serif text-stone-800">Settings</h2>
        <p className="text-stone-500 mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 space-y-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl font-medium transition-colors ${activeTab === 'profile' ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'}`}
          >
            <User size={18} />
            <span>Profile</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl font-medium transition-colors ${activeTab === 'notifications' ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'}`}
          >
            <Bell size={18} />
            <span>Notifications</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl font-medium transition-colors ${activeTab === 'security' ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'}`}
          >
            <Shield size={18} />
            <span>Security</span>
          </button>
        </div>

        <div className="col-span-3 space-y-8">
          {activeTab === 'profile' && <ProfileForm />}
          {activeTab === 'notifications' && <PreferencesForm />}
          {activeTab === 'security' && <SecurityForm />}
        </div>
      </div>
    </div>
  );
}
