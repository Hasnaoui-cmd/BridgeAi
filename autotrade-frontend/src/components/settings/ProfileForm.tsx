import { useState, useEffect } from 'react';
import { User, Save } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export default function ProfileForm() {
  const { user } = useAuth();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user) {
      const fullName = user.user_metadata?.full_name || '';
      const parts = fullName.split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      setEmail(user.email || '');
      setJobTitle(user.user_metadata?.job_title || '');
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const { error } = await supabase.auth.updateUser({
        email: email !== user?.email ? email : undefined,
        data: {
          full_name: `${firstName} ${lastName}`.trim(),
          job_title: jobTitle
        }
      });

      if (error) throw error;
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <form onSubmit={handleSave} className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm">
      <h3 className="text-lg font-medium text-stone-800 mb-6 flex items-center">
        <User size={20} className="mr-2 text-stone-400" /> Profile Information
      </h3>
      
      {message.text && (
        <div className={`mb-6 p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-5">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-xl font-medium">
            {initials}
          </div>
          <div>
            <button type="button" className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-xl transition-colors">
              Change Avatar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-600 block">First Name</label>
            <input 
              type="text" 
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-600 block">Last Name</label>
            <input 
              type="text" 
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-600 block">Email Address</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-600 block">Job Title</label>
          <input 
            type="text" 
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-stone-100">
        <button type="button" className="px-5 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 font-medium transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-medium flex items-center transition-colors shadow-sm disabled:opacity-50">
          <Save size={18} className="mr-2" />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
