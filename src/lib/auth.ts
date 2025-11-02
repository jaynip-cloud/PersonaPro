import { supabase } from './supabase';

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  country?: string;
  city?: string;
  about?: string;
  logo_url?: string;
  onboarding_completed: boolean;
  created_at: string;
}

export interface OnboardingData {
  step: number;
  completed: boolean;
  data?: any;
}

export const authService = {
  async signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
        emailRedirectTo: undefined,
      },
    });

    if (error) throw error;
    return data;
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

  async getUserOrganization(userId: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createOrganization(userId: string, orgData: Partial<Organization>) {
    const { data, error } = await supabase
      .from('organizations')
      .insert({
        user_id: userId,
        name: orgData.name || 'My Company',
        website: orgData.website,
        industry: orgData.industry,
        size: orgData.size,
        country: orgData.country,
        city: orgData.city,
        about: orgData.about,
        logo_url: orgData.logo_url,
        onboarding_completed: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateOrganization(orgId: string, updates: Partial<Organization>) {
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', orgId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async completeOnboarding(orgId: string) {
    const { error } = await supabase
      .from('organizations')
      .update({ onboarding_completed: true })
      .eq('id', orgId);

    if (error) throw error;
  },

  async saveOnboardingProgress(userId: string, step: number, data: any) {
    const { error } = await supabase
      .from('onboarding_progress')
      .upsert({
        user_id: userId,
        current_step: step,
        step_data: data,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (error) throw error;
  },

  async getOnboardingProgress(userId: string) {
    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};
