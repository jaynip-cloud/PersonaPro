export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          name: string
          company: string
          email: string
          phone: string | null
          avatar: string | null
          role: string | null
          industry: string | null
          status: 'active' | 'inactive' | 'prospect'
          tier: 'platinum' | 'gold' | 'silver' | 'bronze' | null
          location: string | null
          founded: string | null
          last_contact: string | null
          next_follow_up: string | null
          persona_score: number
          fit_score: number | null
          health_score: number | null
          csm: string | null
          tags: string[]
          created_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          name: string
          company: string
          email: string
          phone?: string | null
          avatar?: string | null
          role?: string | null
          industry?: string | null
          status?: 'active' | 'inactive' | 'prospect'
          tier?: 'platinum' | 'gold' | 'silver' | 'bronze' | null
          location?: string | null
          founded?: string | null
          last_contact?: string | null
          next_follow_up?: string | null
          persona_score?: number
          fit_score?: number | null
          health_score?: number | null
          csm?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          company?: string
          email?: string
          phone?: string | null
          avatar?: string | null
          role?: string | null
          industry?: string | null
          status?: 'active' | 'inactive' | 'prospect'
          tier?: 'platinum' | 'gold' | 'silver' | 'bronze' | null
          location?: string | null
          founded?: string | null
          last_contact?: string | null
          next_follow_up?: string | null
          persona_score?: number
          fit_score?: number | null
          health_score?: number | null
          csm?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
          user_id?: string | null
        }
      }
      contacts: {
        Row: {
          id: string
          client_id: string | null
          name: string
          email: string
          phone: string | null
          role: string
          department: string | null
          is_primary: boolean
          is_decision_maker: boolean
          influence_level: string | null
          source: string | null
          last_contact: string | null
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          client_id?: string | null
          name: string
          email: string
          phone?: string | null
          role: string
          department?: string | null
          is_primary?: boolean
          is_decision_maker?: boolean
          influence_level?: string | null
          source?: string | null
          last_contact?: string | null
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          client_id?: string | null
          name?: string
          email?: string
          phone?: string | null
          role?: string
          department?: string | null
          is_primary?: boolean
          is_decision_maker?: boolean
          influence_level?: string | null
          source?: string | null
          last_contact?: string | null
          created_at?: string
          user_id?: string | null
        }
      }
      financial_data: {
        Row: {
          id: string
          client_id: string | null
          mrr: number
          total_revenue: number
          active_deals: number
          latest_deal_name: string | null
          latest_deal_value: number | null
          latest_deal_stage: string | null
          latest_deal_close_date: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          client_id?: string | null
          mrr?: number
          total_revenue?: number
          active_deals?: number
          latest_deal_name?: string | null
          latest_deal_value?: number | null
          latest_deal_stage?: string | null
          latest_deal_close_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          client_id?: string | null
          mrr?: number
          total_revenue?: number
          active_deals?: number
          latest_deal_name?: string | null
          latest_deal_value?: number | null
          latest_deal_stage?: string | null
          latest_deal_close_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
      }
      opportunities: {
        Row: {
          id: string
          client_id: string | null
          title: string
          description: string | null
          value: number | null
          stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost'
          probability: number
          expected_close_date: string | null
          source: string | null
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          client_id?: string | null
          title: string
          description?: string | null
          value?: number | null
          stage?: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost'
          probability?: number
          expected_close_date?: string | null
          source?: string | null
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          client_id?: string | null
          title?: string
          description?: string | null
          value?: number | null
          stage?: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost'
          probability?: number
          expected_close_date?: string | null
          source?: string | null
          created_at?: string
          user_id?: string | null
        }
      }
      intelligence_queries: {
        Row: {
          id: string
          client_id: string | null
          query: string
          mode: 'quick' | 'deep'
          response: string | null
          key_findings: string[]
          recommended_actions: Json
          tokens_used: number
          cost: number
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          client_id?: string | null
          query: string
          mode?: 'quick' | 'deep'
          response?: string | null
          key_findings?: string[]
          recommended_actions?: Json
          tokens_used?: number
          cost?: number
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          client_id?: string | null
          query?: string
          mode?: 'quick' | 'deep'
          response?: string | null
          key_findings?: string[]
          recommended_actions?: Json
          tokens_used?: number
          cost?: number
          created_at?: string
          user_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      client_status: 'active' | 'inactive' | 'prospect'
      client_tier: 'platinum' | 'gold' | 'silver' | 'bronze'
      opportunity_stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost'
      query_mode: 'quick' | 'deep'
    }
  }
}
