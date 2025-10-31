export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  avatar?: string;
  role: string;
  industry: string;
  status: 'active' | 'inactive' | 'prospect';
  lastContact: string;
  nextFollowUp?: string;
  personaScore: number;
  tags: string[];
  createdAt: string;
}

export interface Persona {
  id: string;
  clientId: string;
  communicationStyle: string;
  decisionMakingStyle: string;
  priorities: string[];
  painPoints: string[];
  interests: string[];
  preferredChannels: string[];
  responsePatterns: {
    avgResponseTime: string;
    preferredTimeOfDay: string;
    bestDayOfWeek: string;
  };
  sentimentAnalysis: {
    overall: 'positive' | 'neutral' | 'negative';
    score: number;
  };
  confidence: number;
  lastUpdated: string;
}

export interface PersonaMetrics {
  sentiment: number;
  cooperation: 'high' | 'medium' | 'low';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  communicationStyle: {
    value: string;
    confidence: 'high' | 'medium' | 'low';
  };
  responseSpeed: {
    avgDays: number;
    confidence: 'high' | 'medium' | 'low';
  };
  negotiationTone: {
    value: string;
    confidence: 'high' | 'medium' | 'low';
  };
  engagementPattern: {
    value: string;
    confidence: 'high' | 'medium' | 'low';
  };
  topProjectTypes: string[];
  sentimentTrend: number[];
}

export interface EvidenceSnippet {
  id: string;
  text: string;
  source: string;
  sourceType: 'document' | 'email' | 'call' | 'meeting' | 'social';
  contribution: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  date: string;
}

export interface Document {
  id: string;
  clientId: string;
  name: string;
  type: 'proposal' | 'contract' | 'report' | 'note' | 'email' | 'other';
  size: number;
  uploadedAt: string;
  url?: string;
  summary?: string;
  insights?: string[];
}

export interface CallRecord {
  id: string;
  clientId: string;
  date: string;
  duration: number;
  type: 'inbound' | 'outbound';
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  actionItems: string[];
  transcriptUrl?: string;
}

export interface AgentRun {
  id: string;
  clientId: string;
  type: 'persona_analysis' | 'document_analysis' | 'call_analysis' | 'full_analysis';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: string;
  completedAt?: string;
  results?: any;
  insights?: string[];
}

export interface Recommendation {
  id: string;
  clientId: string;
  type: 'action' | 'insight' | 'warning' | 'opportunity';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  suggestedActions: string[];
  createdAt: string;
  status: 'new' | 'viewed' | 'actioned' | 'dismissed';
}

export interface CompanyIntel {
  id: string;
  name: string;
  industry: string;
  size: string;
  revenue?: string;
  location: string;
  website?: string;
  description: string;
  keyContacts: Array<{
    name: string;
    role: string;
    email?: string;
  }>;
  recentNews: Array<{
    title: string;
    date: string;
    source: string;
    url: string;
  }>;
  matchScore?: number;
}

export interface SocialProfile {
  id: string;
  clientId: string;
  platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram';
  url: string;
  name: string;
  title?: string;
  headline?: string;
  recentActivity?: string;
  followerCount?: number;
  createdAt: string;
  source: string;
}

export interface WebsiteSummary {
  id: string;
  clientId: string;
  domain: string;
  headline: string;
  services: string[];
  blogUrls: string[];
  techStack?: string[];
  marketPosition?: string;
  scrapedAt: string;
}

export interface ContactInfo {
  id: string;
  clientId: string;
  email?: string;
  phone?: string;
  address?: string;
  source: string;
  verified: boolean;
  createdAt: string;
}

export interface MeetingTranscript {
  id: string;
  clientId: string;
  title: string;
  date: string;
  duration: number;
  transcriptText: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  actionItems?: string[];
  speakers?: Array<{
    name: string;
    contactId?: string;
  }>;
  source: string;
  createdAt: string;
}

export type ConnectorType =
  | 'linkedin'
  | 'twitter'
  | 'website'
  | 'contact'
  | 'documents'
  | 'fathom'
  | 'salesforce'
  | 'hubspot'
  | 'gmail'
  | 'outlook'
  | 'zoom'
  | 'teams'
  | 'twilio'
  | 'google-drive'
  | 'sharepoint'
  | 'crunchbase'
  | 'clutch';

export type ConnectorStatus = 'not_connected' | 'connecting' | 'connected' | 'error';

export interface Connector {
  id: ConnectorType;
  name: string;
  description: string;
  logo: string;
  status: ConnectorStatus;
  lastSynced?: string;
  itemsCount?: number;
  isPriority: boolean;
  dataTypes: string[];
  scopes: string[];
  fieldMapping: Record<string, string>;
  errorMessage?: string;
}

export interface IngestionEvent {
  id: string;
  connectorId: ConnectorType;
  clientId: string;
  timestamp: string;
  description: string;
  itemType: 'document' | 'profile' | 'contact' | 'transcript' | 'website' | 'interaction';
  itemId?: string;
}
