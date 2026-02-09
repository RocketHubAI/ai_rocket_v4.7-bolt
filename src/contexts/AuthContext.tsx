import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state change:', event, session?.user?.id);

      // Handle all legitimate auth state changes
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        // New login or initial session load
        setSession(session);
        setUser(session?.user ?? null);
      } else if (event === 'TOKEN_REFRESHED') {
        // Token refreshed - only update if user ID actually changed (shouldn't happen)
        // This prevents unnecessary re-renders that cause subscription loops
        setSession(session);
        setUser((prevUser) => {
          if (prevUser?.id === session?.user?.id) {
            return prevUser; // Keep same user object reference
          }
          return session?.user ?? null; // User changed, update
        });
      } else if (event === 'USER_UPDATED') {
        // User profile updated - always update to reflect changes
        setSession(session);
        setUser(session?.user ?? null);
      } else if (event === 'SIGNED_OUT') {
        // Explicit sign out
        setSession(null);
        setUser(null);
      }
      // PASSWORD_RECOVERY and MFA_CHALLENGE_VERIFIED are intentionally ignored
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshSession = async () => {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (!error && session) {
      setSession(session);
      setUser(session.user);
    }
  };

  // Memoize the context value to prevent unnecessary re-renders
  // Only update when user, session, or loading actually changes
  const value = useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signOut,
    refreshSession,
  }), [user, session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};