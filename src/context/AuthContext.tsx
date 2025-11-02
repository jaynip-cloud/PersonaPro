import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { authService, Organization } from '../lib/auth';

interface AuthContextType {
  user: SupabaseUser | null;
  organization: Organization | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
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

  const loadOrganization = async (userId: string) => {
    try {
      const org = await authService.getUserOrganization(userId);
      setOrganization(org);
    } catch (error) {
      console.error('Error loading organization:', error);
    }
  };

  useEffect(() => {
    authService.getSession().then((session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadOrganization(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadOrganization(session.user.id);
      } else {
        setOrganization(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const result = await authService.signUp(email, password, name);
    if (result.user) {
      await authService.createOrganization(result.user.id, { name: 'My Company' });
    }
  };

  const signIn = async (email: string, password: string) => {
    await authService.signIn(email, password);
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
      await loadOrganization(user.id);
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
