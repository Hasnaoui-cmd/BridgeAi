import { useState } from 'react';
import { Shield, Key, Save, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

export default function SecurityForm() {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage({ text: 'Please fill out all password fields.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: 'New passwords do not match.', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ text: 'New password must be at least 6 characters long.', type: 'error' });
      return;
    }

    if (!user?.email) {
      setMessage({ text: 'User email not found. Please log in again.', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      // 1. Verify old password by attempting to re-authenticate
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });

      if (signInError) {
        throw new Error('Incorrect current password.');
      }

      // 2. Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;
      
      setMessage({ text: 'Password updated successfully!', type: 'success' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update password', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!user?.email) return;
    setResetLoading(true);
    setMessage({ text: '', type: '' });
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin + '/settings',
      });
      if (error) throw error;
      setMessage({ text: 'Password reset instructions sent to your email!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to send reset email', type: 'error' });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-stone-800 flex items-center">
          <Shield size={20} className="mr-2 text-stone-400" /> Security Settings
        </h3>
        <button 
          type="button"
          onClick={handleForgotPassword}
          disabled={resetLoading}
          className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors flex items-center disabled:opacity-50"
        >
          <Mail size={16} className="mr-1.5" />
          {resetLoading ? 'Sending...' : 'Forgot Password?'}
        </button>
      </div>
      
      {message.text && (
        <div className={`mb-6 p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleUpdatePassword} className="space-y-6">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-600 block">Current Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-stone-400" />
              </div>
              <input 
                type="password" 
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          <div className="pt-2 pb-2">
            <div className="border-t border-stone-100"></div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-600 block">New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-stone-400" />
              </div>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-stone-600 block">Confirm New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-stone-400" />
              </div>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-stone-100">
          <button 
            type="submit" 
            disabled={loading} 
            className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-medium flex items-center transition-colors shadow-sm disabled:opacity-50"
          >
            <Save size={18} className="mr-2" />
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
}
