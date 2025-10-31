import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClientHeader } from '../components/client/ClientHeader';
import { FinancialOverview } from '../components/client/FinancialOverview';
import { IntelligenceAgent } from '../components/client/IntelligenceAgent';
import { QueryResult } from '../components/client/QueryResult';
import { PersonaSummary } from '../components/persona/PersonaSummary';
import { PersonaMetricsCards } from '../components/persona/PersonaMetricsCards';
import { ExplainabilityPanel } from '../components/persona/ExplainabilityPanel';
import { PersonaEditor } from '../components/persona/PersonaEditor';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Sparkles, Users, Target, Briefcase, MessageSquare, Settings } from 'lucide-react';
import { PersonaMetrics, EvidenceSnippet, IntelligenceQuery } from '../types';
import { generatePersonaMetrics } from '../utils/personaGenerator';
import { mockFinancialData, mockContacts, mockOpportunities, mockRelationshipMetrics } from '../data/mockData';

export const ClientDetailNew: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'relationships' | 'opportunities' | 'projects' | 'intelligence' | 'settings'>('overview');
  const [personaMetrics, setPersonaMetrics] = useState<PersonaMetrics | null>(null);
  const [evidence, setEvidence] = useState<EvidenceSnippet[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [queries, setQueries] = useState<IntelligenceQuery[]>([]);
  const [isProcessingQuery, setIsProcessingQuery] = useState(false);

  const client = {
    id: '1',
    name: 'Sarah Mitchell',
    company: 'TechCorp Solutions',
    email: 'sarah.mitchell@techcorp.com',
    phone: '+1 (555) 123-4567',
    role: 'VP of Engineering',
    industry: 'Technology',
    status: 'active' as const,
    lastContact: '2025-10-28',
    nextFollowUp: '2025-11-05',
    personaScore: 92,
    tags: ['decision-maker', 'technical', 'high-value'],
    createdAt: '2025-06-15',
    location: 'San Francisco, CA',
    founded: '2018',
    tier: 'platinum' as const,
    healthScore: 87,
    csm: 'John Williams',
  };

  const financialData = mockFinancialData.find(f => f.clientId === id) || mockFinancialData[0];
  const contacts = mockContacts.filter(c => c.clientId === id);
  const opportunities = mockOpportunities.filter(o => o.clientId === id);
  const relationshipMetrics = mockRelationshipMetrics.find(r => r.clientId === id);

  const handleRefreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      if (!personaMetrics) {
        handleRunPersonaAnalysis();
      }
    }, 2000);
  };

  const handleRunPersonaAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const result = generatePersonaMetrics({
        documents: [],
        calls: [],
        meetings: [],
        emails: []
      });
      setPersonaMetrics(result.metrics);
      setEvidence(result.evidence);
      setIsAnalyzing(false);
    }, 7000);
  };

  const handleQuery = (query: string, mode: 'quick' | 'deep') => {
    setIsProcessingQuery(true);
    const processingTime = mode === 'deep' ? 8000 : 3000;

    setTimeout(() => {
      const mockResponse: IntelligenceQuery = {
        id: Date.now().toString(),
        clientId: client.id,
        query,
        mode,
        response: mode === 'deep'
          ? `Based on comprehensive analysis of TechCorp Solutions:\n\nThe client demonstrates strong technical expertise and decision-making authority. Recent interactions indicate high satisfaction with current services, with particular interest in ML/AI capabilities. Communication patterns show consistent engagement and quick response times.\n\nKey behavioral patterns include preference for technical depth in discussions, data-driven decision making, and forward-thinking approach to technology adoption.`
          : `TechCorp Solutions shows positive engagement trends. Recent sentiment is favorable (score: +0.78). Primary contact Sarah Mitchell is highly responsive with avg response time of 2 hours. Key opportunity identified for ML integration services.`,
        keyFindings: mode === 'deep' ? [
          'High technical competency with strong preference for scalable solutions',
          'Decision velocity has increased 40% over past quarter',
          'Active interest in ML/AI integration capabilities',
          'Strong budget authority with established procurement process'
        ] : undefined,
        recommendedActions: mode === 'deep' ? [
          { action: 'Schedule ML capabilities demo within next 2 weeks', severity: 'high' },
          { action: 'Create proposal for Enterprise ML Integration', severity: 'high' },
          { action: 'Follow up on Q4 roadmap discussion', severity: 'medium' }
        ] : undefined,
        tokensUsed: mode === 'deep' ? 2847 : 892,
        cost: mode === 'deep' ? 0.0142 : 0.0045,
        timestamp: new Date().toISOString()
      };

      setQueries(prev => [mockResponse, ...prev]);
      setIsProcessingQuery(false);
    }, processingTime);
  };

  const tabs = [
    { id: 'overview', label: 'Overview & Health', icon: Sparkles },
    { id: 'relationships', label: 'Relationships', icon: Users },
    { id: 'opportunities', label: 'Opportunities', icon: Target },
    { id: 'projects', label: 'Projects & Deals', icon: Briefcase },
    { id: 'intelligence', label: 'Intelligence & Assets', icon: MessageSquare },
    { id: 'settings', label: 'Settings & Admin', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <ClientHeader
        client={client}
        onRefreshData={handleRefreshData}
        isRefreshing={isRefreshing}
      />

      <div className="border-b border-border">
        <div className="px-6">
          <div className="flex gap-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 pb-4 pt-4 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <FinancialOverview data={financialData} />

            <IntelligenceAgent
              clientId={client.id}
              onQuery={handleQuery}
              isProcessing={isProcessingQuery}
            />

            {queries.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Recent Queries</h3>
                {queries.slice(0, 1).map(query => (
                  <QueryResult key={query.id} query={query} />
                ))}
              </div>
            )}

            {personaMetrics && !isAnalyzing && (
              <div className="space-y-6">
                <PersonaSummary
                  clientName={client.name}
                  company={client.company}
                  industry={client.industry}
                  metrics={personaMetrics}
                  logo={client.avatar}
                />

                <PersonaMetricsCards metrics={personaMetrics} />

                <ExplainabilityPanel evidence={evidence} />
              </div>
            )}

            {!personaMetrics && !isAnalyzing && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">AI Persona Analysis</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate comprehensive persona insights from client interactions
                  </p>
                  <Button onClick={handleRunPersonaAnalysis} variant="primary">
                    Run Persona Analysis
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'relationships' && (
          <div className="space-y-6">
            {relationshipMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Relationship Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Trust Level</p>
                      <p className="text-2xl font-bold text-foreground">{relationshipMetrics.trustLevel}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Communication</p>
                      <Badge variant="secondary">{relationshipMetrics.communicationFrequency}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Sentiment</p>
                      <p className="text-2xl font-bold text-green-600">+{relationshipMetrics.overallSentiment.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Response Rate</p>
                      <p className="text-2xl font-bold text-foreground">{relationshipMetrics.responseRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Contacts & Decision Makers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {contacts.map(contact => (
                    <div key={contact.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {contact.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{contact.name}</p>
                          <p className="text-sm text-muted-foreground">{contact.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {contact.isDecisionMaker && (
                          <Badge variant="success">Decision Maker</Badge>
                        )}
                        {contact.influenceLevel && (
                          <Badge variant="secondary">{contact.influenceLevel} influence</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'opportunities' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Growth Opportunities</CardTitle>
                <Button variant="primary" size="sm">Add Opportunity</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {opportunities.map(opp => (
                  <div key={opp.id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-foreground">{opp.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{opp.description}</p>
                      </div>
                      <Badge variant="secondary">{opp.stage}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="font-semibold text-foreground">
                        ${opp.value.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">{opp.probability}% probability</span>
                      <span className="text-muted-foreground">Close: {opp.expectedCloseDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'intelligence' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Intelligence Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <IntelligenceAgent
                  clientId={client.id}
                  onQuery={handleQuery}
                  isProcessing={isProcessingQuery}
                />

                {queries.length > 0 && (
                  <div className="mt-6 space-y-6">
                    <h3 className="text-lg font-semibold">Query History</h3>
                    {queries.map(query => (
                      <div key={query.id}>
                        <div className="mb-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium text-foreground">{query.query}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(query.timestamp).toLocaleString()} • {query.mode} mode
                          </p>
                        </div>
                        <QueryResult query={query} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {personaMetrics && (
        <PersonaEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          metrics={personaMetrics}
          onSave={setPersonaMetrics}
        />
      )}
    </div>
  );
};
