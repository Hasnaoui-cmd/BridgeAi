import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

export default function Login() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/assistant', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate('/assistant');
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return (
    <div className="min-h-screen bg-[#Fdfdfc] flex flex-col justify-center items-center p-4 text-stone-800 font-sans selection:bg-amber-100">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <h1 className="text-2xl font-medium tracking-tight flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-stone-800 text-stone-50 flex items-center justify-center text-sm font-bold">B</span>
            <span>BridgeAI</span>
          </h1>
        </div>

        <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-serif text-stone-800">Welcome back</h2>
            <p className="text-stone-500 text-sm mt-1">Please enter your details to sign in.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-600 block">Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-400"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-stone-600 block">Password</label>
                <a href="#" className="text-sm text-stone-500 hover:text-stone-800 transition-colors">Forgot Password?</a>
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-400"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-stone-800 text-white rounded-xl py-3.5 font-medium hover:bg-stone-700 transition-colors shadow-sm mt-2 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            
            <button 
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-white border border-stone-200 text-stone-800 rounded-xl py-3.5 font-medium hover:bg-stone-50 transition-colors shadow-sm mt-2"
            >
              Continue with Google
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-stone-500">
            Don't have an account? <Link to="/signup" className="text-stone-800 font-medium hover:underline">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
