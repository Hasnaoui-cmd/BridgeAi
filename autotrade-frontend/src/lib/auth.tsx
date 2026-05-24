import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

type UserRole = 'admin' | 'user';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userRole: UserRole;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userRole: 'user',
  isAdmin: false,
  signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('user');

  // Background fetcher - does not block the main UI
  const refreshRole = async (userId: string) => {
    try {
      console.log('[AUTH] Fetching role for:', userId);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle(); // maybeSingle is safer than .single()

      if (error) throw error;

      if (data?.role) {
        console.log('[AUTH] Role found:', data.role);
        setUserRole(data.role as UserRole);
      }
    } catch (err) {
      console.error('[AUTH] Role fetch failed:', err);
    }
  };

  useEffect(() => {
    // 1. Get session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // 2. We set loading to false AS SOON AS we have the user
      // We don't wait for the role database query to finish
      setLoading(false);

      if (currentUser) {
        refreshRole(currentUser.id);
      }
    });

    // 3. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        refreshRole(currentUser.id);
      } else {
        setUserRole('user');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserRole('user');
  };

  const isAdmin = userRole === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, userRole, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);