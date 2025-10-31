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
import { Sparkles, Users, Target, Briefcase, MessageSquare, Settings, ArrowLeft, Download, Loader2 } from 'lucide-react';
import { PersonaMetrics, EvidenceSnippet, IntelligenceQuery } from '../types';
import { generatePersonaMetrics } from '../utils/personaGenerator';
import { mockFinancialData, mockContacts, mockOpportunities, mockRelationshipMetrics } from '../data/mockData';
import { exportPersonaReportAsPDF } from '../utils/pdfExport';
import { useToast } from '../components/ui/Toast';

export const ClientDetailNew: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

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
      handleRunPersonaAnalysis();
    }, 2000);
  };

  React.useEffect(() => {
    handleRunPersonaAnalysis();
  }, []);

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

  const handleQuery = async (query: string, mode: 'quick' | 'deep'): Promise<string> => {
    setIsProcessingQuery(true);
    const processingTime = mode === 'deep' ? 8000 : 3000;

    return new Promise((resolve) => {
      setTimeout(() => {
        const response = mode === 'deep'
          ? `Based on comprehensive analysis of TechCorp Solutions:\n\nThe client demonstrates strong technical expertise and decision-making authority. Recent interactions indicate high satisfaction with current services, with particular interest in ML/AI capabilities. Communication patterns show consistent engagement and quick response times.\n\nKey behavioral patterns include preference for technical depth in discussions, data-driven decision making, and forward-thinking approach to technology adoption.\n\nRecommendations:\n• Schedule ML capabilities demo within next 2 weeks\n• Create proposal for Enterprise ML Integration\n• Follow up on Q4 roadmap discussion`
          : `TechCorp Solutions shows positive engagement trends. Recent sentiment is favorable (score: +0.78). Primary contact Sarah Mitchell is highly responsive with avg response time of 2 hours. Key opportunity identified for ML integration services.`;

        setIsProcessingQuery(false);
        resolve(response);
      }, processingTime);
    });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Sparkles },
    { id: 'relationships', label: 'Relationships', icon: Users },
    { id: 'opportunities', label: 'Opportunities', icon: Target },
    { id: 'projects', label: 'Projects & Deals', icon: Briefcase },
    { id: 'intelligence', label: 'Intelligence & Assets', icon: MessageSquare },
    { id: 'settings', label: 'Settings & Admin', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background">
        <div className="px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/clients')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Button>
        </div>
      </div>

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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <FinancialOverview data={financialData} />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={handleRunPersonaAnalysis}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Run Persona Analysis
                        </>
                      )}
                    </Button>
                    {personaMetrics && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          exportPersonaReportAsPDF(client, personaMetrics);
                          showToast('success', 'Persona report exported successfully');
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Report
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

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

            {isAnalyzing && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                  <h3 className="text-lg font-semibold mb-2">Analyzing Client Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Processing interactions and generating persona insights...
                  </p>
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

        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Active Projects</CardTitle>
                    <Button variant="primary" size="sm">New Project</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border border-border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-foreground">Platform Migration</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Migrate legacy systems to cloud-native architecture
                          </p>
                        </div>
                        <Badge variant="warning">In Progress</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">67%</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: '67%' }} />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                          <span>Due: Dec 30, 2025</span>
                          <span>Budget: $185,000</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border border-border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-foreground">API Development</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Build RESTful APIs for third-party integrations
                          </p>
                        </div>
                        <Badge variant="success">On Track</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">45%</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-600" style={{ width: '45%' }} />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                          <span>Due: Jan 20, 2026</span>
                          <span>Budget: $75,000</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border border-border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-foreground">Security Audit</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Comprehensive security review and penetration testing
                          </p>
                        </div>
                        <Badge variant="secondary">Completed</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">100%</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-600" style={{ width: '100%' }} />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                          <span>Completed: Oct 15, 2025</span>
                          <span>Budget: $42,000</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Deals Pipeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">
                            Enterprise Platform Upgrade
                          </span>
                          <Badge variant="warning">Negotiation</Badge>
                        </div>
                        <p className="text-lg font-bold text-foreground">$95,000</p>
                        <p className="text-xs text-muted-foreground mt-1">Close: Dec 15, 2025</p>
                      </div>

                      <div className="pt-4 border-t border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">
                            Annual Support Renewal
                          </span>
                          <Badge variant="success">Proposal</Badge>
                        </div>
                        <p className="text-lg font-bold text-foreground">$48,000</p>
                        <p className="text-xs text-muted-foreground mt-1">Close: Nov 30, 2025</p>
                      </div>

                      <div className="pt-4 border-t border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">
                            ML Services Add-on
                          </span>
                          <Badge variant="secondary">Qualified</Badge>
                        </div>
                        <p className="text-lg font-bold text-foreground">$125,000</p>
                        <p className="text-xs text-muted-foreground mt-1">Close: Jan 15, 2026</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Total Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground mb-2">$268,000</p>
                    <p className="text-sm text-muted-foreground">Weighted pipeline value</p>
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Win Rate</span>
                        <span className="font-semibold text-foreground">78%</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Avg Deal Size</span>
                        <span className="font-semibold text-foreground">$89,333</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'intelligence' && (
          <div className="space-y-6">
            <IntelligenceAgent
              clientId={client.id}
              onQuery={handleQuery}
              isProcessing={isProcessingQuery}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Client Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Client Status
                    </label>
                    <select className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="prospect">Prospect</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Customer Success Manager
                    </label>
                    <select className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option>John Williams</option>
                      <option>Sarah Johnson</option>
                      <option>Michael Chen</option>
                      <option>Emily Rodriguez</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 border border-border rounded-md bg-background min-h-[100px]">
                      <Badge variant="secondary">decision-maker</Badge>
                      <Badge variant="secondary">technical</Badge>
                      <Badge variant="secondary">high-value</Badge>
                      <Button variant="ghost" size="sm" className="h-6 text-xs">
                        + Add Tag
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive email updates about this client</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Sentiment Alerts</p>
                      <p className="text-sm text-muted-foreground">Alert when sentiment drops below threshold</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Deal Updates</p>
                      <p className="text-sm text-muted-foreground">Notifications for deal stage changes</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    Export Client Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Archive Client
                  </Button>
                  <Button variant="destructive" className="w-full justify-start">
                    Delete Client
                  </Button>
                </div>
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
