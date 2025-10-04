import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'superuser' | 'administrator' | 'staff' | 'gerente' | 'user';
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
  signUp: (email: string, password: string, fullName: string, role?: 'administrator' | 'staff' | 'gerente' | 'user') => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  createUser: (email: string, password: string, fullName: string, role: 'administrator' | 'staff' | 'gerente' | 'user') => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, token: string, type: 'recovery') => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  isAuthenticated: boolean;
  isSuperuser: boolean;
  isAdministrator: boolean;
  isGerente: boolean;
  isStaff: boolean;
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
  console.log('AuthProvider: supabase client:', supabase);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    console.log('AuthProvider: fetchProfile called for user:', userId);
    try {
      console.log('AuthProvider: making profiles query...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('AuthContext: Error fetching profile', profileError);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!profileData) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Fetch user roles from the new user_roles table for enhanced security
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('AuthContext: Error fetching roles', rolesError);
      }

      // Use role from user_roles table if available, otherwise fallback to profile role
      const primaryRole = rolesData && rolesData.length > 0 
        ? rolesData[0].role 
        : profileData.role;

      setProfile({
        ...profileData,
        role: primaryRole
      });
      console.log('AuthContext: Profile loaded successfully with role:', primaryRole);
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

  const signUp = async (email: string, password: string, fullName: string, role: 'administrator' | 'staff' | 'gerente' | 'user' = 'user') => {
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

  const createUser = async (email: string, password: string, fullName: string, role: 'administrator' | 'staff' | 'gerente' | 'user') => {
    try {
      console.log('AuthContext: Creating user with role:', role);
      
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error('AuthContext: No session token available');
        return { error: 'Não autenticado. Por favor, faça login novamente.' };
      }

      console.log('AuthContext: Calling admin-create-user function...');
      
      // Call the Edge Function to create user
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email,
          password,
          fullName,
          role
        }
      });

      if (error) {
        console.error('AuthContext: Edge function invoke error:', error);
        
        // Map specific known errors to friendly messages
        const errorMsg = error.message?.toLowerCase() || '';
        
        if (errorMsg.includes('email_exists') || errorMsg.includes('already been registered')) {
          return { error: 'Este email já está registrado no sistema' };
        }
        if (errorMsg.includes('invalid email')) {
          return { error: 'Email inválido fornecido' };
        }
        if (errorMsg.includes('password')) {
          return { error: 'Senha não atende aos critérios mínimos' };
        }
        if (errorMsg.includes('401') || errorMsg.includes('unauthorized')) {
          return { error: 'Não autorizado. Verifique suas permissões.' };
        }
        if (errorMsg.includes('403') || errorMsg.includes('forbidden')) {
          return { error: 'Acesso negado. Apenas administradores podem criar usuários.' };
        }
        
        // Generic friendly fallback for network/function errors
        return { error: 'Falha ao criar utilizador. Verifique os dados e tente novamente.' };
      }

      console.log('AuthContext: Function response:', data);

      // Handle business logic errors (returned as 200 with success: false)
      if (data?.success === false && data?.error) {
        console.error('AuthContext: User creation business error:', data.error);
        return { error: data.error };
      }

      if (data?.error) {
        console.error('AuthContext: User creation error from function:', data.error);
        return { error: data.error };
      }

      if (!data?.success) {
        console.error('AuthContext: Unexpected response format:', data);
        return { error: 'Resposta inesperada do servidor' };
      }

      console.log('AuthContext: User created successfully');
      return { error: null };
      
    } catch (error) {
      console.error('AuthContext: Unexpected error creating user:', error);
      return { error: 'Erro inesperado. Tente novamente.' };
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
  const isAdminCheck = profile?.role === 'administrator' || profile?.role === 'superuser' || profile?.role === 'gerente' || profile?.role === 'staff';
  const isGerenteCheck = profile?.role === 'gerente';
  const isStaffCheck = profile?.role === 'staff';

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
    isGerente: isGerenteCheck,
    isStaff: isStaffCheck
  };

  console.log('AuthProvider: rendering with loading =', loading, 'user =', !!user, 'profile =', !!profile);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};