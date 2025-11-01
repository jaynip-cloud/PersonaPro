import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { authService, Organization } from '../lib/auth';

interface AuthContextType {
  user: SupabaseUser | null;
  organization: Organization | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshOrganization: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (currentUser: SupabaseUser) => {
    try {
      const orgs = await authService.getUserOrganizations(currentUser.id);
      if (orgs && orgs.length > 0) {
        setOrganization(orgs[0]);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  useEffect(() => {
    console.log('AuthContext: Initializing auth state...');
    authService.getSession().then((session) => {
      console.log('AuthContext: Initial session:', session?.user?.email);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state changed:', event, session?.user?.email);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserData(session.user);
      } else {
        setOrganization(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const result = await authService.signUp(email, password);
    if (result.organization) {
      setOrganization(result.organization);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('AuthContext.signIn called');
    await authService.signIn(email, password);
    console.log('AuthContext.signIn completed');
  };

  const signOut = async () => {
    await authService.signOut();
    setOrganization(null);
  };

  const resetPassword = async (email: string) => {
    await authService.resetPassword(email);
  };

  const refreshOrganization = async () => {
    if (user) {
      await loadUserData(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        refreshOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
