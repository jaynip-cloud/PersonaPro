import { supabase } from './supabase';

export interface Organization {
  id: string;
  name: string;
  about?: string;
  industry?: string;
  company_size?: string;
  website?: string;
  services?: string[];
  case_studies?: any[];
  onboarding_completed_at?: string | null;
  created_at?: string;
}

export interface OnboardingState {
  user_id: string;
  org_id: string;
  current_step: number;
  step_1_completed: boolean;
  step_2_completed: boolean;
  step_3_completed: boolean;
  step_4_completed?: boolean;
  step_1_data?: any;
  step_2_data?: any;
  step_3_data?: any;
  step_4_data?: any;
  created_at?: string;
  updated_at?: string;
}

export const authService = {
  async signUp(email: string, password: string) {
    console.log('authService.signUp called with email:', email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    console.log('Supabase signUp response:', { user: data.user, session: data.session, error });

    if (error) {
      console.error('Supabase signUp error:', error);
      throw error;
    }

    if (!data.session) {
      console.log('No session returned - email confirmation required');
      return { user: data.user, session: null, needsEmailVerification: true };
    }

    let organization: Organization | null = null;

    if (data.user) {
      organization = await this.createPlaceholderOrg(data.user.id);
      console.log('Created placeholder organization:', organization);
    }

    return { user: data.user, session: data.session, organization, needsEmailVerification: false };
  },

  async signIn(email: string, password: string) {
    console.log('authService.signIn called with email:', email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('Supabase signIn response:', { user: data?.user?.id, session: !!data?.session, error });

    if (error) {
      console.error('Supabase signIn error:', error);
      throw error;
    }

    console.log('Sign in successful');
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw error;
  },

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  },

  async verifyOtp(email: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) throw error;
    return data;
  },

  async resendVerificationEmail(email: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
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
    console.log('authService.getUserOrganizations called for userId:', userId);

    const { data, error } = await supabase
      .from('memberships')
      .select('org_id, organizations(*)')
      .eq('user_id', userId);

    console.log('getUserOrganizations query result:', { data, error });

    if (error) {
      console.error('getUserOrganizations error:', error);
      throw error;
    }

    const orgs = (data || []).map((m: any) => m.organizations).filter(Boolean);
    console.log('Mapped organizations:', orgs);
    return orgs;
  },

  async getOnboardingState(userId: string, orgId: string): Promise<OnboardingState | null> {
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
      step_4_completed?: boolean;
      step_1_data?: any;
      step_2_data?: any;
      step_3_data?: any;
      step_4_data?: any;
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

  async completeOnboarding(orgId: string, finalData: any) {
    const { data, error } = await supabase
      .from('organizations')
      .update({
        ...finalData,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', orgId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
