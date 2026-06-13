import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { getCompanies, createCompany } from '../lib/api';
import { GlowCursor } from "@/components/glow-cursor";
import { AnimatedDotsBackground } from "@/components/animated-dots-background";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function SignUp() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [registrationType, setRegistrationType] = useState<'admin' | 'user'>('user');
  const [companiesList, setCompaniesList] = useState<{id: string, company_name: string}[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyCountry, setNewCompanyCountry] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/assistant', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (registrationType === 'user') {
      getCompanies().then(res => {
        if (res.status === 'success') {
          setCompaniesList(res.data);
          if (res.data.length > 0) setSelectedCompanyId(res.data[0].id);
        }
      }).catch(console.error);
    }
  }, [registrationType]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let finalCompanyId = selectedCompanyId;

    try {
      if (registrationType === 'admin') {
        const res = await createCompany(newCompanyName, newCompanyCountry);
        if (res.status === 'success' && res.data) {
          finalCompanyId = res.data.id;
        } else {
          throw new Error(res.message || 'Failed to create company');
        }
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name }
        }
      });

      if (authError) throw authError;

      if (data.user) {
        await supabase.from('user_profiles').upsert({
          id: data.user.id,
          auth_user_id: data.user.id,
          full_name: name,
          email: email,
          company_id: finalCompanyId,
          role: registrationType
        }, { onConflict: 'id' });
      }

      if (data.session === null) {
        setSuccess(true);
      } else {
        navigate('/assistant');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
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
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-white/50 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

            <div className="mb-8 relative z-10">
              <h2 className="text-3xl font-serif text-stone-900 tracking-tight">Create an account</h2>
              <p className="text-stone-500 text-sm mt-2">Join BridgeAI to get started.</p>
            </div>

            {success ? (
              <div className="py-4 text-center relative z-10">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                  ✉️
                </div>
                <h2 className="text-2xl font-serif text-stone-800 mb-2">Check your email</h2>
                <p className="text-stone-500 text-sm mb-2">
                  A confirmation link was sent to<br />
                  <span className="font-medium text-stone-800">{email}</span>
                </p>
                <Link
                  to="/login"
                  className="inline-block bg-stone-900 text-stone-50 rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-stone-800 transition-colors mt-4"
                >
                  Go to Login
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 p-3 bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-600 rounded-xl text-sm relative z-10">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSignUp} className="space-y-5 relative z-10">
                  <div className="flex bg-stone-100/50 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setRegistrationType('user')}
                      className={`flex-1 text-sm py-2 rounded-lg font-medium transition-all ${registrationType === 'user' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                      Join Company
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegistrationType('admin')}
                      className={`flex-1 text-sm py-2 rounded-lg font-medium transition-all ${registrationType === 'admin' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
                    >
                      New Company
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-stone-600 block">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full bg-white/50 border border-stone-200/80 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-400"
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
                      className="w-full bg-white/50 border border-stone-200/80 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-400"
                    />
                  </div>

                  {registrationType === 'user' ? (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-stone-600 block">Select Company</label>
                      <select
                        required
                        value={selectedCompanyId}
                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                        className="w-full bg-white/50 border border-stone-200/80 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                      >
                        {companiesList.length === 0 && <option value="" disabled>Loading companies...</option>}
                        {companiesList.map(c => (
                          <option key={c.id} value={c.id}>{c.company_name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-stone-600 block">Company Name</label>
                        <input
                          type="text"
                          required
                          value={newCompanyName}
                          onChange={(e) => setNewCompanyName(e.target.value)}
                          placeholder="E.g. Acme Corp"
                          className="w-full bg-white/50 border border-stone-200/80 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-400"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-stone-600 block">Country</label>
                        <input
                          type="text"
                          required
                          value={newCompanyCountry}
                          onChange={(e) => setNewCompanyCountry(e.target.value)}
                          placeholder="E.g. United States"
                          className="w-full bg-white/50 border border-stone-200/80 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-400"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-stone-600 block">Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      className="w-full bg-white/50 border border-stone-200/80 rounded-xl px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || (registrationType === 'user' && !selectedCompanyId)}
                    className="w-full bg-stone-900 text-stone-50 rounded-xl py-3.5 font-medium hover:bg-stone-800 transition-all shadow-md hover:shadow-lg mt-4 disabled:opacity-50 relative overflow-hidden"
                  >
                    {loading ? 'Signing up...' : 'Sign Up'}
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
                  Already have an account? <Link to="/login" className="text-amber-600 font-medium hover:underline">Log in</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}