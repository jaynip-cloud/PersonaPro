export interface Client {
  id: string;
  name: string;
  company: string;
  contact_name?: string;
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
  location?: string;
  founded?: string;
  tier?: 'platinum' | 'gold' | 'silver' | 'bronze';
  healthScore?: number;
  csm?: string;
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
  tags?: string[];
  status?: 'processing' | 'completed' | 'failed';
  source?: string;
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

export interface FinancialData {
  clientId: string;
  mrr: number;
  totalRevenue: number;
  activeDeals: number;
  latestDeal?: {
    name: string;
    value: number;
    stage: string;
    closeDate: string;
  };
}

export interface Contact {
  id: string;
  clientId: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  isPrimary: boolean;
  isDecisionMaker: boolean;
  influenceLevel?: 'high' | 'medium' | 'low';
  source?: string;
  lastContact?: string;
}

export interface Opportunity {
  id: string;
  clientId: string;
  title: string;
  description: string;
  value: number;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  probability: number;
  expectedCloseDate: string;
  createdAt: string;
  source?: string;
}

export interface IntelligenceQuery {
  id: string;
  clientId: string;
  query: string;
  mode: 'quick' | 'deep';
  response: string;
  keyFindings?: string[];
  recommendedActions?: Array<{
    action: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  tokensUsed: number;
  cost: number;
  timestamp: string;
}

export interface RelationshipMetrics {
  clientId: string;
  trustLevel: number;
  communicationFrequency: 'daily' | 'weekly' | 'monthly' | 'sporadic';
  overallSentiment: number;
  responseRate: number;
}

export interface CompanyService {
  id: string;
  name: string;
  description: string;
  tags: string[];
  budgetRange: {
    min: number;
    max: number;
  };
  proofUrls: string[];
  caseStudyIds?: string[];
}

export interface CaseStudy {
  id: string;
  title: string;
  client: string;
  industry: string;
  thumbnail: string;
  services: string[];
  results: string[];
  metrics?: Array<{
    label: string;
    value: string;
  }>;
  description: string;
  url?: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  description: string;
  valueProposition: string;
  team: Array<{
    name: string;
    role: string;
    specialization?: string;
  }>;
  services: CompanyService[];
  caseStudies: CaseStudy[];
}

export interface ClientMatch {
  client: Client;
  matchScore: number;
  confidence: number;
  reasoning: {
    primary: string;
    secondary: string;
  };
  signals: Array<{
    type: 'tags' | 'sentiment' | 'interactions' | 'health' | 'budget';
    description: string;
    weight: number;
  }>;
  recommendedService: string;
}

export interface GeneratedPitch {
  id: string;
  clientId: string;
  clientName: string;
  clientCompany: string;
  services: string[];
  tone: 'formal' | 'casual';
  length: 'short' | 'long';
  elevatorPitch: string;
  valuePoints: string[];
  nextActions: string[];
  confidence: number;
  evidenceTags: string[];
  variant: 'A' | 'B';
  createdAt: string;
  companyDescription?: string;
}

export interface PitchGeneratorInput {
  clientId: string;
  services: string[];
  companyDescription: string;
  tone: 'formal' | 'casual';
  length: 'short' | 'long';
}
