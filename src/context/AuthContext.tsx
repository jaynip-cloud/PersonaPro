import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isKnowledgeBaseComplete: boolean;
  checkKnowledgeBaseStatus: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; requiresConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isKnowledgeBaseComplete, setIsKnowledgeBaseComplete] = useState(false);

  const checkKnowledgeBaseStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('company_profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .maybeSingle();

        setIsKnowledgeBaseComplete(profile?.onboarding_completed ?? false);
      }
    } catch (error) {
      console.error('Error checking knowledge base status:', error);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkKnowledgeBaseStatus();
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await checkKnowledgeBaseStatus();
        }
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      // Normalize email (lowercase and trim)
      const normalizedEmail = email.toLowerCase().trim();

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        // Handle specific Supabase error codes and messages
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('already registered') || 
            errorMessage.includes('already exists') ||
            errorMessage.includes('user already registered') ||
            error.code === 'signup_disabled' ||
            error.status === 422) {
          return { 
            error: new Error('This email is already registered. Please sign in instead, or use a different email address.') 
          };
        }
        
        if (errorMessage.includes('email')) {
          return { 
            error: new Error('Invalid email address. Please check and try again.') 
          };
        }
        
        if (errorMessage.includes('password') || errorMessage.includes('weak')) {
          return { 
            error: new Error('Password does not meet requirements. Please use a stronger password (at least 6 characters).') 
          };
        }
        
        // Return the original error message for other cases
        return { error: new Error(error.message || 'Failed to create account. Please try again.') };
      }

      // Check if email confirmation is required
      // If user is created but no session, email confirmation is required
      if (data.user && !data.session) {
        return { 
          error: null,
          requiresConfirmation: true 
        };
      }

      // Signup successful and user is automatically signed in
      return { error: null };
    } catch (error: any) {
      // Handle unexpected errors
      const errorMessage = error?.message?.toLowerCase() || '';
      
      if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
        return { 
          error: new Error('This email is already registered. Please sign in instead.') 
        };
      }
      
      return { 
        error: new Error(error?.message || 'An unexpected error occurred. Please try again.') 
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Immediately check knowledge base status after successful sign-in
      await checkKnowledgeBaseStatus();

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isKnowledgeBaseComplete,
        checkKnowledgeBaseStatus,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
