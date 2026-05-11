import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

export default function SignUp() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/assistant', { replace: true });
    }
  }, [user, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }
      }
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
          <Link to="/" className="text-2xl font-medium tracking-tight flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-stone-800 text-stone-50 flex items-center justify-center text-sm font-bold">B</span>
            <span>BridgeAI</span>
          </Link>
        </div>

        <div className="bg-white border border-stone-200 rounded-3xl p-8 shadow-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-serif text-stone-800">Create an account</h2>
            <p className="text-stone-500 text-sm mt-1">Get started with intelligent customs compliance.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-stone-600 block">Full Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-400"
              />
            </div>

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
              <label className="text-sm font-medium text-stone-600 block">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-400"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-stone-800 text-white rounded-xl py-3.5 font-medium hover:bg-stone-700 transition-colors shadow-sm mt-4 disabled:opacity-50"
            >
              {loading ? 'Signing up...' : 'Sign Up'}
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
            Already have an account? <Link to="/login" className="text-stone-800 font-medium hover:underline">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
