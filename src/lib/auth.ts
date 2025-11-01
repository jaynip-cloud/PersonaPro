import { supabase } from './supabase';

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  website?: string;
  industry?: string;
  size?: string;
  country?: string;
  city?: string;
  about?: string;
  logo_url?: string;
  onboarding_completed_at?: string;
  created_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  org_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export const authService = {
  async signUp(email: string, password: string) {
    console.log('authService.signUp called with email:', email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });

    console.log('Supabase signUp response:', { data, error });

    if (error) {
      console.error('Supabase signUp error:', error);
      throw error;
    }

    if (!data.user) {
      console.error('No user returned from signUp');
      throw new Error('Failed to create user account');
    }

    console.log('User created:', data.user.id, 'Session exists:', !!data.session);

    if (data.user && data.session) {
      console.log('Creating placeholder organization...');
      try {
        const placeholderOrg = await this.createPlaceholderOrg(data.user.id);
        console.log('Placeholder org created:', placeholderOrg.id);
        return { user: data.user, session: data.session, organization: placeholderOrg };
      } catch (orgError) {
        console.error('Error creating placeholder org:', orgError);
        throw orgError;
      }
    }

    console.log('No session returned - email confirmation may be required');
    return { user: data.user, session: data.session };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  async createPlaceholderOrg(userId: string) {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'My Company',
        about: 'Placeholder organization - complete onboarding to customize',
      })
      .select()
      .single();

    if (orgError) throw orgError;

    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        user_id: userId,
        org_id: org.id,
        role: 'owner',
      });

    if (membershipError) throw membershipError;

    const { error: onboardingError } = await supabase
      .from('org_onboarding_state')
      .insert({
        org_id: org.id,
        user_id: userId,
        current_step: 1,
      });

    if (onboardingError) throw onboardingError;

    return org;
  },

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('memberships')
      .select('org_id, organizations(*)')
      .eq('user_id', userId);

    if (error) throw error;

    return (data || []).map((m: any) => m.organizations).filter(Boolean);
  },

  async getOnboardingState(userId: string, orgId: string) {
    const { data, error } = await supabase
      .from('org_onboarding_state')
      .select('*')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateOnboardingState(
    userId: string,
    orgId: string,
    updates: {
      current_step?: number;
      step_1_completed?: boolean;
      step_2_completed?: boolean;
      step_3_completed?: boolean;
      step_1_data?: any;
      step_2_data?: any;
      step_3_data?: any;
    }
  ) {
    const { data, error } = await supabase
      .from('org_onboarding_state')
      .update(updates)
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async completeOnboarding(orgId: string) {
    const { error } = await supabase
      .from('organizations')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', orgId);

    if (error) throw error;
  },
};
