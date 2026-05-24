import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { GlowCursor } from "@/components/glow-cursor";
import { AnimatedDotsBackground } from "@/components/animated-dots-background";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

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
    <div className="relative min-h-screen overflow-x-hidden bg-[#fafaf9] flex flex-col font-sans text-stone-800 selection:bg-amber-100">
      <AnimatedDotsBackground />
      <GlowCursor />
      <Navbar />
      
      <main className="flex-grow flex flex-col justify-center items-center p-4 relative z-10 pt-24 pb-12">
        <div className="w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-md border border-stone-200/60 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group">
            {/* Glass shine effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-white/50 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

            <div className="mb-8 relative z-10">
              <h2 className="text-3xl font-serif text-stone-900 tracking-tight">Welcome back</h2>
              <p className="text-stone-500 text-sm mt-2">Please enter your details to sign in.</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-600 rounded-xl text-sm relative z-10">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6 relative z-10">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-stone-600 block">Email</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-white/50 border border-stone-200/80 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-400"
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
                  className="w-full bg-white/50 border border-stone-200/80 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-400"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-stone-900 text-stone-50 rounded-xl py-3.5 font-medium hover:bg-stone-800 transition-all shadow-md hover:shadow-lg mt-2 disabled:opacity-50 relative overflow-hidden"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              
              <button 
                type="button"
                onClick={handleGoogleLogin}
                className="w-full bg-white/80 border border-stone-200/80 text-stone-800 rounded-xl py-3.5 font-medium hover:bg-white transition-all shadow-sm hover:shadow mt-2 backdrop-blur-sm"
              >
                Continue with Google
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-stone-500 relative z-10">
              Don't have an account? <Link to="/signup" className="text-amber-600 font-medium hover:underline">Sign up</Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
