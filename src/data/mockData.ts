import { Client, Persona, Document, CallRecord, AgentRun, Recommendation, MeetingTranscript, FinancialData, Contact, Opportunity, RelationshipMetrics } from '../types';

export const mockClients: Client[] = [
  {
    id: '1',
    name: 'Sarah Mitchell',
    company: 'TechCorp Solutions',
    email: 'sarah.mitchell@techcorp.com',
    phone: '+1 (555) 123-4567',
    role: 'VP of Engineering',
    industry: 'Technology',
    status: 'active',
    lastContact: '2025-10-28',
    nextFollowUp: '2025-11-05',
    personaScore: 92,
    tags: ['decision-maker', 'technical', 'high-value'],
    createdAt: '2025-06-15',
    location: 'San Francisco, CA',
    founded: '2018',
    tier: 'platinum',
    healthScore: 87,
    csm: 'John Williams',
  },
  {
    id: '2',
    name: 'James Chen',
    company: 'Global Finance Partners',
    email: 'j.chen@gfp.com',
    phone: '+1 (555) 234-5678',
    role: 'Chief Financial Officer',
    industry: 'Finance',
    status: 'active',
    lastContact: '2025-10-25',
    nextFollowUp: '2025-11-01',
    personaScore: 88,
    tags: ['c-level', 'analytical', 'risk-averse'],
    createdAt: '2025-07-20',
  },
  {
    id: '3',
    name: 'Maria Rodriguez',
    company: 'Healthcare Innovations Inc',
    email: 'mrodriguez@healthinnov.com',
    phone: '+1 (555) 345-6789',
    role: 'Director of Operations',
    industry: 'Healthcare',
    status: 'active',
    lastContact: '2025-10-30',
    personaScore: 85,
    tags: ['operational', 'process-driven', 'growth-focused'],
    createdAt: '2025-08-10',
  },
  {
    id: '4',
    name: 'David Thompson',
    company: 'Retail Dynamics',
    email: 'dthompson@retaildyn.com',
    phone: '+1 (555) 456-7890',
    role: 'Marketing Director',
    industry: 'Retail',
    status: 'prospect',
    lastContact: '2025-10-20',
    nextFollowUp: '2025-11-10',
    personaScore: 78,
    tags: ['creative', 'data-driven', 'collaborative'],
    createdAt: '2025-09-05',
  },
  {
    id: '5',
    name: 'Emily Watson',
    company: 'EduTech Academy',
    email: 'ewatson@edutech.edu',
    phone: '+1 (555) 567-8901',
    role: 'Chief Technology Officer',
    industry: 'Education',
    status: 'active',
    lastContact: '2025-10-26',
    nextFollowUp: '2025-11-03',
    personaScore: 90,
    tags: ['innovative', 'student-focused', 'budget-conscious'],
    createdAt: '2025-07-01',
  },
];

export const mockPersonas: Persona[] = [
  {
    id: 'p1',
    clientId: '1',
    communicationStyle: 'Direct and technical',
    decisionMakingStyle: 'Data-driven with quick decisions',
    priorities: ['Scalability', 'Performance', 'Team efficiency'],
    painPoints: ['Legacy system limitations', 'Integration challenges', 'Time to market'],
    interests: ['AI/ML', 'Cloud infrastructure', 'DevOps'],
    preferredChannels: ['Email', 'Slack', 'Video calls'],
    responsePatterns: {
      avgResponseTime: '2 hours',
      preferredTimeOfDay: 'Morning (9-11 AM)',
      bestDayOfWeek: 'Tuesday',
    },
    sentimentAnalysis: {
      overall: 'positive',
      score: 0.85,
    },
    confidence: 92,
    lastUpdated: '2025-10-28',
  },
  {
    id: 'p2',
    clientId: '2',
    communicationStyle: 'Formal and detailed',
    decisionMakingStyle: 'Analytical with thorough evaluation',
    priorities: ['ROI', 'Risk mitigation', 'Compliance'],
    painPoints: ['Cost management', 'Regulatory requirements', 'Market volatility'],
    interests: ['Financial modeling', 'Risk analysis', 'Strategic planning'],
    preferredChannels: ['Email', 'Formal meetings', 'Reports'],
    responsePatterns: {
      avgResponseTime: '1 day',
      preferredTimeOfDay: 'Afternoon (2-4 PM)',
      bestDayOfWeek: 'Wednesday',
    },
    sentimentAnalysis: {
      overall: 'neutral',
      score: 0.65,
    },
    confidence: 88,
    lastUpdated: '2025-10-25',
  },
  {
    id: 'p3',
    clientId: '3',
    communicationStyle: 'Collaborative and practical',
    decisionMakingStyle: 'Process-oriented with stakeholder input',
    priorities: ['Patient outcomes', 'Operational efficiency', 'Staff satisfaction'],
    painPoints: ['Resource constraints', 'Workflow optimization', 'Staff turnover'],
    interests: ['Healthcare technology', 'Process improvement', 'Team development'],
    preferredChannels: ['Phone', 'In-person meetings', 'Email'],
    responsePatterns: {
      avgResponseTime: '4 hours',
      preferredTimeOfDay: 'Late morning (10-12 PM)',
      bestDayOfWeek: 'Thursday',
    },
    sentimentAnalysis: {
      overall: 'positive',
      score: 0.78,
    },
    confidence: 85,
    lastUpdated: '2025-10-30',
  },
  {
    id: 'p4',
    clientId: '4',
    communicationStyle: 'Creative and enthusiastic',
    decisionMakingStyle: 'Vision-driven with data validation',
    priorities: ['Brand awareness', 'Customer engagement', 'Market differentiation'],
    painPoints: ['Budget limitations', 'Market competition', 'Measuring ROI'],
    interests: ['Digital marketing', 'Consumer behavior', 'Creative campaigns'],
    preferredChannels: ['Video calls', 'Social media', 'Presentations'],
    responsePatterns: {
      avgResponseTime: '3 hours',
      preferredTimeOfDay: 'Afternoon (1-3 PM)',
      bestDayOfWeek: 'Monday',
    },
    sentimentAnalysis: {
      overall: 'positive',
      score: 0.82,
    },
    confidence: 78,
    lastUpdated: '2025-10-20',
  },
  {
    id: 'p5',
    clientId: '5',
    communicationStyle: 'Innovative and strategic',
    decisionMakingStyle: 'Forward-thinking with pilot testing',
    priorities: ['Student success', 'Innovation', 'Accessibility'],
    painPoints: ['Budget constraints', 'Technology adoption', 'Stakeholder alignment'],
    interests: ['EdTech', 'Learning analytics', 'Digital transformation'],
    preferredChannels: ['Email', 'Video conferences', 'Workshops'],
    responsePatterns: {
      avgResponseTime: '6 hours',
      preferredTimeOfDay: 'Morning (8-10 AM)',
      bestDayOfWeek: 'Friday',
    },
    sentimentAnalysis: {
      overall: 'positive',
      score: 0.88,
    },
    confidence: 90,
    lastUpdated: '2025-10-26',
  },
];

export const mockDocuments: Document[] = [
  {
    id: 'd1',
    clientId: '1',
    name: 'Q3 Technical Requirements.pdf',
    type: 'proposal',
    size: 2458000,
    uploadedAt: '2025-10-15',
    summary: 'Detailed technical specifications for Q3 platform upgrade',
    insights: ['Emphasis on scalability', 'Cloud-native requirements', 'API-first approach'],
  },
  {
    id: 'd2',
    clientId: '1',
    name: 'Architecture Review Notes.docx',
    type: 'note',
    size: 125000,
    uploadedAt: '2025-10-20',
    summary: 'Notes from architecture review meeting',
  },
  {
    id: 'd3',
    clientId: '2',
    name: 'Financial Analysis Report.xlsx',
    type: 'report',
    size: 1850000,
    uploadedAt: '2025-09-30',
    summary: 'Comprehensive financial analysis for investment decision',
    insights: ['Focus on ROI metrics', 'Risk assessment prioritized', '5-year projection required'],
  },
  {
    id: 'd4',
    clientId: '3',
    name: 'Operational Workflow Proposal.pdf',
    type: 'proposal',
    size: 3200000,
    uploadedAt: '2025-10-10',
    summary: 'Proposed workflow improvements for healthcare operations',
    insights: ['Patient-centric approach', 'Staff efficiency focus', 'Compliance considerations'],
  },
];

export const mockCallRecords: CallRecord[] = [
  {
    id: 'c1',
    clientId: '1',
    date: '2025-10-28',
    duration: 45,
    type: 'outbound',
    summary: 'Discussed Q4 roadmap and technical requirements for platform expansion',
    keyPoints: [
      'Need for increased API throughput',
      'Interest in ML integration',
      'Timeline: Q1 2026 launch target',
    ],
    sentiment: 'positive',
    actionItems: [
      'Send technical proposal by Nov 1',
      'Schedule demo for engineering team',
      'Provide pricing for enterprise tier',
    ],
  },
  {
    id: 'c2',
    clientId: '2',
    date: '2025-10-25',
    duration: 60,
    type: 'inbound',
    summary: 'Financial review and ROI discussion for proposed solution',
    keyPoints: [
      'Requested detailed cost breakdown',
      'Interested in payment terms',
      'Needs board approval for Q4',
    ],
    sentiment: 'neutral',
    actionItems: [
      'Prepare financial model',
      'Include case studies with ROI data',
      'Schedule follow-up after board review',
    ],
  },
  {
    id: 'c3',
    clientId: '3',
    date: '2025-10-30',
    duration: 30,
    type: 'outbound',
    summary: 'Quick check-in on pilot program progress',
    keyPoints: [
      'Pilot showing positive results',
      'Staff feedback is encouraging',
      'Ready to discuss expansion',
    ],
    sentiment: 'positive',
    actionItems: [
      'Compile pilot results report',
      'Prepare expansion proposal',
      'Schedule stakeholder presentation',
    ],
  },
];

export const mockAgentRuns: AgentRun[] = [
  {
    id: 'a1',
    clientId: '1',
    type: 'full_analysis',
    status: 'completed',
    progress: 100,
    startedAt: '2025-10-28T10:00:00Z',
    completedAt: '2025-10-28T10:15:00Z',
    insights: [
      'Communication pattern shows preference for technical depth',
      'Decision velocity has increased 40% over past quarter',
      'High engagement with product innovation discussions',
    ],
  },
  {
    id: 'a2',
    clientId: '2',
    type: 'document_analysis',
    status: 'completed',
    progress: 100,
    startedAt: '2025-10-25T14:00:00Z',
    completedAt: '2025-10-25T14:05:00Z',
    insights: [
      'Documentation style favors detailed financial projections',
      'Risk analysis is critical component of decision process',
    ],
  },
  {
    id: 'a3',
    clientId: '3',
    type: 'persona_analysis',
    status: 'running',
    progress: 65,
    startedAt: '2025-10-30T16:00:00Z',
    insights: [],
  },
];

export const mockRecommendations: Recommendation[] = [
  {
    id: 'r1',
    clientId: '1',
    type: 'opportunity',
    priority: 'high',
    title: 'Upsell Opportunity: Enterprise ML Features',
    description: 'Based on recent conversations, Sarah has shown strong interest in ML capabilities. This aligns with their Q1 2026 roadmap.',
    suggestedActions: [
      'Schedule ML capabilities demo',
      'Share case studies from similar tech companies',
      'Prepare custom ML integration proposal',
    ],
    createdAt: '2025-10-29',
    status: 'new',
  },
  {
    id: 'r2',
    clientId: '2',
    type: 'action',
    priority: 'critical',
    title: 'Follow-up Required: Board Presentation Materials',
    description: 'James needs comprehensive materials for board review in 2 weeks. Response time is critical.',
    suggestedActions: [
      'Prepare executive summary with ROI focus',
      'Include risk mitigation strategies',
      'Add 3-5 year financial projections',
    ],
    createdAt: '2025-10-28',
    status: 'new',
  },
  {
    id: 'r3',
    clientId: '3',
    type: 'insight',
    priority: 'medium',
    title: 'Pilot Success: Ready for Expansion Discussion',
    description: 'Pilot program metrics exceed expectations. Staff satisfaction up 35%. Optimal time to discuss expansion.',
    suggestedActions: [
      'Compile pilot success metrics',
      'Prepare phased expansion timeline',
      'Identify additional stakeholders for buy-in',
    ],
    createdAt: '2025-10-30',
    status: 'viewed',
  },
  {
    id: 'r4',
    clientId: '1',
    type: 'warning',
    priority: 'medium',
    title: 'Competitor Activity Detected',
    description: 'TechCorp Solutions recently engaged with a competitor. Maintain engagement and highlight differentiators.',
    suggestedActions: [
      'Schedule check-in call this week',
      'Emphasize unique platform capabilities',
      'Share recent innovation roadmap',
    ],
    createdAt: '2025-10-27',
    status: 'actioned',
  },
  {
    id: 'r5',
    clientId: '4',
    type: 'action',
    priority: 'high',
    title: 'Follow-up Overdue',
    description: 'No contact with David Thompson in 11 days. Follow-up was scheduled for last week.',
    suggestedActions: [
      'Send personalized follow-up email',
      'Reference previous discussion about Q4 campaign',
      'Offer to share new marketing analytics features',
    ],
    createdAt: '2025-10-29',
    status: 'new',
  },
];

export const mockMeetingTranscripts: MeetingTranscript[] = [
  {
    id: 'm1',
    clientId: '1',
    title: 'Platform Architecture Review',
    date: '2025-10-22',
    duration: 60,
    transcriptText: 'Discussion about scalability concerns and API performance requirements. Sarah emphasized the need for real-time processing capabilities.',
    sentiment: 'positive',
    actionItems: [
      'Provide architecture diagram',
      'Schedule technical deep-dive',
      'Share performance benchmarks'
    ],
    speakers: [
      { name: 'Sarah Mitchell' },
      { name: 'Technical Team' }
    ],
    source: 'Zoom',
    createdAt: '2025-10-22'
  },
  {
    id: 'm2',
    clientId: '2',
    title: 'Budget Review Meeting',
    date: '2025-10-18',
    duration: 45,
    transcriptText: 'Detailed financial discussion with concerns about payment terms and ROI timeline. James wants to see detailed cost breakdown.',
    sentiment: 'neutral',
    actionItems: [
      'Prepare detailed financial model',
      'Include payment schedule options'
    ],
    speakers: [
      { name: 'James Chen' },
      { name: 'Finance Team' }
    ],
    source: 'Teams',
    createdAt: '2025-10-18'
  },
  {
    id: 'm3',
    clientId: '1',
    title: 'Integration Planning Session',
    date: '2025-10-10',
    duration: 90,
    transcriptText: 'Comprehensive discussion about system integration challenges. Some concerns about legacy system compatibility.',
    sentiment: 'negative',
    actionItems: [
      'Investigate legacy system compatibility',
      'Provide integration timeline'
    ],
    speakers: [
      { name: 'Sarah Mitchell' },
      { name: 'Engineering Team' }
    ],
    source: 'Fathom',
    createdAt: '2025-10-10'
  }
];

export const mockFinancialData: FinancialData[] = [
  {
    id: 'fd1',
    clientId: '1',
    mrr: 15000,
    totalRevenue: 285000,
    activeDeals: 3,
    latestDeal: {
      name: 'Enterprise Platform Upgrade',
      value: 95000,
      stage: 'negotiation',
      closeDate: '2025-12-15'
    }
  }
];

export const mockContacts: Contact[] = [
  {
    id: 'c1',
    clientId: '1',
    name: 'Sarah Mitchell',
    email: 'sarah.mitchell@techcorp.com',
    phone: '+1 (555) 123-4567',
    role: 'VP of Engineering',
    department: 'Engineering',
    isPrimary: true,
    isDecisionMaker: true,
    influenceLevel: 'high',
    source: 'LinkedIn',
    lastContact: '2025-10-28'
  },
  {
    id: 'c2',
    clientId: '1',
    name: 'Michael Chen',
    email: 'm.chen@techcorp.com',
    phone: '+1 (555) 123-4568',
    role: 'CTO',
    department: 'Engineering',
    isPrimary: false,
    isDecisionMaker: true,
    influenceLevel: 'high',
    source: 'Website',
    lastContact: '2025-10-15'
  }
];

export const mockOpportunities: Opportunity[] = [
  {
    id: 'o1',
    clientId: '1',
    title: 'ML Integration Services',
    description: 'Opportunity to provide machine learning integration services based on recent technical discussions',
    value: 125000,
    stage: 'qualified',
    probability: 75,
    expectedCloseDate: '2026-01-15',
    createdAt: '2025-10-28',
    source: 'AI Analysis'
  }
];

export const mockRelationshipMetrics: RelationshipMetrics[] = [
  {
    clientId: '1',
    trustLevel: 85,
    communicationFrequency: 'weekly',
    overallSentiment: 0.78,
    responseRate: 92
  }
];
