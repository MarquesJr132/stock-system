import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'superuser' | 'administrator' | 'gerente' | 'user';
  tenant_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: SupabaseUser | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role?: 'administrator' | 'gerente' | 'user') => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  createUser: (email: string, password: string, fullName: string, role: 'administrator' | 'gerente' | 'user') => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, token: string, type: 'recovery') => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  isAuthenticated: boolean;
  isSuperuser: boolean;
  isAdministrator: boolean;
  isGerente: boolean;
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
  console.log('AuthProvider: Initializing...');
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('AuthContext: Error fetching profile', error);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!data) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(data);
      console.log('AuthContext: Profile loaded successfully:', data);
      setLoading(false);
    } catch (error) {
      console.error('AuthContext: Error fetching profile:', error);
      setProfile(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('AuthProvider: useEffect starting...');
    // Safety: prevent infinite loading if something stalls
    const safety = setTimeout(() => {
      console.warn('AuthContext: safety timeout hit, forcing loading=false');
      setLoading(false);
    }, 5000);

    console.log('AuthProvider: setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Prevent unnecessary state updates if nothing changed
        if (event === 'SIGNED_OUT' || !session) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          setSession(session);
          setUser(session.user);
          
          if (session.user) {
            // Use setTimeout to prevent race conditions
            setTimeout(() => {
              fetchProfile(session.user.id);
            }, 0);
          }
        }
      }
    );

    // Check for existing session
    console.log('AuthProvider: checking for existing session...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthContext: Initial session check:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('AuthProvider: found user, fetching profile...');
        fetchProfile(session.user.id);
      } else {
        console.log('AuthProvider: no user found, setting loading=false');
        setLoading(false);
      }
    }).catch((error) => {
      console.error('AuthContext: Error getting session', error);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safety);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
        
        // Log tentativa de login falhada para monitoramento
        try {
          await supabase.from('notifications').insert({
            tenant_id: null,
            title: 'Tentativa de Login Falhada',
            message: `Falha no login para ${email}: ${error.message}`,
            type: 'security_alert',
            priority: 'medium',
            metadata: {
              email,
              error_code: error.status,
              timestamp: new Date().toISOString()
            }
          });
        } catch (logError) {
          console.error('Error logging failed login:', logError);
        }
      } else if (data.user) {
        // Log login bem-sucedido
        try {
          await supabase.from('notifications').insert({
            tenant_id: null,
            user_id: data.user.id,
            title: 'Login Realizado',
            message: `Login bem-sucedido para ${email}`,
            type: 'security_alert',
            priority: 'low',
            metadata: {
              email,
              timestamp: new Date().toISOString()
            }
          });
        } catch (logError) {
          console.error('Error logging successful login:', logError);
        }
      }
      
      return { error: error?.message ?? null };
    } catch (error) {
      console.error('Auth sign in error:', error);
      return { error: 'Erro inesperado ao fazer login' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'administrator' | 'gerente' | 'user' = 'user') => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            role: role
          }
        }
      });
      
      if (error) {
        console.error('Sign up error:', error);
      }
      
      return { error: error?.message ?? null };
    } catch (error) {
      console.error('Auth sign up error:', error);
      return { error: 'Erro inesperado ao criar conta' };
    }
  };

  const createUser = async (email: string, password: string, fullName: string, role: 'administrator' | 'gerente' | 'user') => {
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        return { error: 'Não autenticado' };
      }

      // Call the Edge Function to create user without auto-login
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email,
          password,
          fullName,
          role
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        return { error: error.message || 'Erro ao criar usuário' };
      }

      if (data?.error) {
        console.error('User creation error:', data.error);
        return { error: data.error };
      }

      if (!data?.success) {
        console.error('Unexpected response:', data);
        return { error: 'Resposta inesperada do servidor' };
      }

      return { error: null };
      
    } catch (error) {
      console.error('Unexpected error creating user:', error);
      return { error: 'Erro inesperado ao criar usuário' };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Use OTP for password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://marquesjr132.github.io/stock-system/reset-password',
      });
      
      return { error: error?.message ?? null };
    } catch (error) {
      console.error('AuthContext: Error sending OTP', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  const verifyOtp = async (email: string, token: string, type: 'recovery') => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery', // Use 'recovery' type for password reset
      });
      
      return { error: error?.message ?? null };
    } catch (error) {
      console.error('AuthContext: Error verifying OTP', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      return { error: error?.message ?? null };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Clear local state first to prevent re-authentication loops
      setUser(null);
      setProfile(null);
      setSession(null);
      
      // Then clear Supabase session (ignore error if session already gone)
      const { error } = await supabase.auth.signOut();
      
      if (error && error.message !== 'Auth session missing!') {
        console.error('AuthContext: Logout error:', error);
        // Don't throw for missing session - this is expected in some cases
      }
      
      setLoading(false);
      
      return { error: null };
    } catch (error) {
      console.error('AuthContext: Logout failed:', error);
      // Still clear local state even if logout fails
      setUser(null);
      setProfile(null);
      setSession(null);
      setLoading(false);
      return { error: null }; // Don't show error to user for logout
    }
  };

  const isSuperuserCheck = profile?.role === 'superuser';
  const isAdminCheck = profile?.role === 'administrator' || profile?.role === 'superuser' || profile?.role === 'gerente';
  const isGerenteCheck = profile?.role === 'gerente';

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    createUser,
    resetPassword,
    verifyOtp,
    updatePassword,
    isAuthenticated: !!user,
    isSuperuser: isSuperuserCheck,
    isAdministrator: isAdminCheck,
    isGerente: isGerenteCheck
  };

  console.log('AuthProvider: rendering with loading =', loading, 'user =', !!user, 'profile =', !!profile);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};