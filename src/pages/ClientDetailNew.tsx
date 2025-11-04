import React, { useState, useEffect } from 'react';
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
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Sparkles, Users, Target, Briefcase, MessageSquare, Settings, ArrowLeft, Download, Loader2, FileText, TrendingUp, Plus, User, Mail, Phone } from 'lucide-react';
import { PersonaMetrics, EvidenceSnippet, IntelligenceQuery, Client, FinancialData, Contact } from '../types';
import { generatePersonaMetrics } from '../utils/personaGenerator';
import { mockContacts, mockOpportunities, mockRelationshipMetrics } from '../data/mockData';
import { exportPersonaReportAsPDF } from '../utils/pdfExport';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { semanticSearch } from '../utils/documentEmbeddings';

export const ClientDetailNew: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'relationships' | 'opportunities' | 'projects' | 'intelligence' | 'pitch' | 'growth' | 'settings'>('overview');
  const [personaMetrics, setPersonaMetrics] = useState<PersonaMetrics | null>(null);
  const [evidence, setEvidence] = useState<EvidenceSnippet[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [queries, setQueries] = useState<IntelligenceQuery[]>([]);
  const [isProcessingQuery, setIsProcessingQuery] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactForm, setNewContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    isDecisionMaker: false,
    influenceLevel: 'medium' as 'high' | 'medium' | 'low'
  });
  const [savingContact, setSavingContact] = useState(false);

  const opportunities = mockOpportunities.filter(o => o.clientId === id);
  const relationshipMetrics = mockRelationshipMetrics.find(r => r.clientId === id);

  useEffect(() => {
    if (id && user) {
      loadClientData();
    }
  }, [id, user]);

  const loadClientData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (clientError) throw clientError;

      if (clientData) {
        setClient({
          id: clientData.id,
          name: clientData.name,
          company: clientData.company,
          email: clientData.email,
          phone: clientData.phone || '',
          role: clientData.role || '',
          industry: clientData.industry || '',
          status: clientData.status,
          lastContact: clientData.last_contact || '',
          nextFollowUp: clientData.next_follow_up || '',
          personaScore: clientData.persona_score,
          tags: clientData.tags || [],
          createdAt: clientData.created_at,
          location: clientData.location || '',
          founded: clientData.founded || '',
          csm: clientData.csm || '',
          avatar: clientData.avatar || undefined,
        });
      }

      const { data: financialDataResult, error: financialError } = await supabase
        .from('financial_data')
        .select('*')
        .eq('client_id', id)
        .maybeSingle();

      if (!financialError && financialDataResult) {
        setFinancialData({
          id: financialDataResult.id,
          clientId: financialDataResult.client_id || '',
          mrr: financialDataResult.mrr,
          totalRevenue: financialDataResult.total_revenue,
          activeDeals: financialDataResult.active_deals,
          latestDeal: financialDataResult.latest_deal_name ? {
            name: financialDataResult.latest_deal_name,
            value: financialDataResult.latest_deal_value || 0,
            stage: financialDataResult.latest_deal_stage || '',
            closeDate: financialDataResult.latest_deal_close_date || '',
          } : undefined,
        });
      }

      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('client_id', id)
        .eq('user_id', user.id);

      if (!contactsError && contactsData) {
        setContacts(contactsData.map(c => ({
          id: c.id,
          clientId: c.client_id || '',
          name: c.name,
          email: c.email,
          phone: c.phone || undefined,
          role: c.role,
          department: c.department || undefined,
          isPrimary: c.is_primary,
          isDecisionMaker: c.is_decision_maker,
          influenceLevel: c.influence_level as 'high' | 'medium' | 'low' | undefined,
          source: c.source || undefined,
          lastContact: c.last_contact || undefined,
        })));
      }
    } catch (error) {
      console.error('Error loading client data:', error);
      showToast('error', 'Failed to load client data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveContact = async () => {
    if (!client || !user || !newContactForm.name || !newContactForm.email || !newContactForm.role) {
      showToast('error', 'Please fill in name, email, and role');
      return;
    }

    setSavingContact(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          client_id: client.id,
          user_id: user.id,
          name: newContactForm.name,
          email: newContactForm.email,
          phone: newContactForm.phone || null,
          role: newContactForm.role,
          department: newContactForm.department || null,
          is_primary: false,
          is_decision_maker: newContactForm.isDecisionMaker,
          influence_level: newContactForm.influenceLevel,
          source: 'manual'
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setContacts([...contacts, {
          id: data.id,
          clientId: data.client_id || '',
          name: data.name,
          email: data.email,
          phone: data.phone || undefined,
          role: data.role,
          department: data.department || undefined,
          isPrimary: data.is_primary,
          isDecisionMaker: data.is_decision_maker,
          influenceLevel: data.influence_level as 'high' | 'medium' | 'low' | undefined,
          source: data.source || undefined,
          lastContact: data.last_contact || undefined,
        }]);

        setNewContactForm({
          name: '',
          email: '',
          phone: '',
          role: '',
          department: '',
          isDecisionMaker: false,
          influenceLevel: 'medium'
        });
        setShowAddContactModal(false);
        showToast('success', 'Contact added successfully');
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      showToast('error', 'Failed to save contact');
    } finally {
      setSavingContact(false);
    }
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    await loadClientData();
    setIsRefreshing(false);
    handleRunPersonaAnalysis();
  };

  const handleEditClient = () => {
    navigate(`/clients/${id}/edit`);
  };

  const handleDeleteClient = async () => {
    if (!client) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this client? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id);

      if (error) throw error;

      showToast('success', 'Client deleted successfully');
      navigate('/clients');
    } catch (error) {
      console.error('Error deleting client:', error);
      showToast('error', 'Failed to delete client. Please try again.');
    }
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

  const handleQuery = async (query: string, mode: 'quick' | 'deep'): Promise<string> => {
    setIsProcessingQuery(true);

    try {
      const searchLimit = mode === 'deep' ? 10 : 5;
      const similarityThreshold = mode === 'deep' ? 0.6 : 0.7;

      const searchResults = await semanticSearch(query, {
        clientId: id,
        limit: searchLimit,
        similarityThreshold: similarityThreshold,
      });

      if (searchResults && searchResults.length > 0) {
        const context = searchResults
          .map((result, index) => `[${index + 1}] ${result.content_chunk} (from ${result.document_name}, similarity: ${(result.similarity * 100).toFixed(1)}%)`)
          .join('\n\n');

        const response = mode === 'deep'
          ? `Based on semantic analysis of documents for ${client?.company || 'this client'}:\n\n${context}\n\nKey Insights:\n• Found ${searchResults.length} relevant document sections\n• Analysis based on uploaded documents and client materials\n• Similarity scores range from ${(searchResults[searchResults.length - 1].similarity * 100).toFixed(1)}% to ${(searchResults[0].similarity * 100).toFixed(1)}%`
          : `Found ${searchResults.length} relevant insights:\n\n${searchResults[0].content_chunk.substring(0, 300)}${searchResults[0].content_chunk.length > 300 ? '...' : ''}\n\n(Source: ${searchResults[0].document_name}, ${(searchResults[0].similarity * 100).toFixed(1)}% relevant)`;

        setIsProcessingQuery(false);
        return response;
      } else {
        const fallbackResponse = mode === 'deep'
          ? `No relevant documents found for "${query}".\n\nTo get better insights:\n• Upload client documents (proposals, contracts, notes)\n• Add more detailed client information\n• Try a different search query\n\nOnce documents are uploaded, I can provide comprehensive analysis based on actual client data.`
          : `No documents found matching your query. Upload client documents to enable intelligent search and insights.`;

        setIsProcessingQuery(false);
        return fallbackResponse;
      }
    } catch (error) {
      console.error('Error processing query:', error);
      setIsProcessingQuery(false);
      return `An error occurred while processing your query. Please ensure:\n• You have an OpenAI API key configured in Settings\n• Documents have been uploaded for this client\n• You have a stable internet connection\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Sparkles },
    { id: 'relationships', label: 'Relationships', icon: Users },
    { id: 'opportunities', label: 'Opportunities', icon: Target },
    { id: 'pitch', label: 'Pitch Generator', icon: FileText },
    { id: 'growth', label: 'Growth Opportunities', icon: TrendingUp },
    { id: 'projects', label: 'Projects & Deals', icon: Briefcase },
    { id: 'intelligence', label: 'Intelligence & Assets', icon: MessageSquare },
    { id: 'settings', label: 'Settings & Admin', icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading client data...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Client not found</p>
          <Button onClick={() => navigate('/clients')}>Back to Clients</Button>
        </div>
      </div>
    );
  }

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
        onEditClient={handleEditClient}
        onDeleteClient={handleDeleteClient}
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
            {financialData ? (
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
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No financial data available for this client.</p>
                </CardContent>
              </Card>
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
                <div className="flex items-center justify-between">
                  <CardTitle>Contacts & Decision Makers</CardTitle>
                  <Button variant="primary" size="sm" onClick={() => setShowAddContactModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {contacts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No contacts added yet</p>
                    <Button variant="outline" size="sm" onClick={() => setShowAddContactModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Contact
                    </Button>
                  </div>
                ) : (
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
                            {contact.email && (
                              <p className="text-xs text-muted-foreground mt-1">{contact.email}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {contact.isPrimary && (
                            <Badge variant="default">Primary</Badge>
                          )}
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
                )}
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

        {activeTab === 'pitch' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>AI Pitch Generator</CardTitle>
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI-Powered
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      Generate personalized pitches based on client intelligence, persona insights, and company knowledge base.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Pitch Type
                    </label>
                    <select className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option>Service Upsell</option>
                      <option>New Product Introduction</option>
                      <option>Renewal Proposal</option>
                      <option>Partnership Opportunity</option>
                      <option>Custom Pitch</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Target Services
                    </label>
                    <select className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" multiple>
                      <option>AI Consulting</option>
                      <option>Custom Development</option>
                      <option>Data Analytics</option>
                      <option>ML Integration</option>
                      <option>Cloud Migration</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Tone & Style
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button variant="outline" size="sm">Professional</Button>
                      <Button variant="outline" size="sm">Casual</Button>
                      <Button variant="outline" size="sm">Technical</Button>
                    </div>
                  </div>

                  <Button variant="primary" className="w-full">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Pitch
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generated Pitches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground">ML Services Upsell Pitch</h4>
                        <p className="text-xs text-muted-foreground mt-1">Generated on Oct 28, 2025</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Based on TechCorp's recent platform migration success and Sarah's interest in ML capabilities, we've identified an opportunity to introduce our ML Integration services...
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">Professional Tone</Badge>
                      <Badge variant="secondary">ML Integration</Badge>
                      <Badge variant="secondary">92% Fit Score</Badge>
                    </div>
                  </div>

                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground">Annual Support Renewal</h4>
                        <p className="text-xs text-muted-foreground mt-1">Generated on Oct 25, 2025</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Sarah, as your support contract approaches renewal, I wanted to highlight the value we've delivered over the past year...
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">Casual Tone</Badge>
                      <Badge variant="secondary">Support Services</Badge>
                      <Badge variant="secondary">88% Fit Score</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'growth' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>AI-Identified Growth Opportunities</CardTitle>
                  <Button variant="primary" size="sm" onClick={handleRunPersonaAnalysis}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Refresh Analysis
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
                  <p className="text-sm text-green-900 font-medium mb-2">
                    3 High-Priority Opportunities Identified
                  </p>
                  <p className="text-sm text-green-800">
                    Based on client intelligence, market trends, and persona analysis
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-5 border-2 border-green-200 bg-green-50/50 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-foreground">ML Platform Integration</h4>
                          <Badge variant="success">High Priority</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Client has expressed strong interest in ML capabilities during recent calls. Their recent platform migration sets the perfect foundation for ML integration.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Estimated Value</p>
                        <p className="text-lg font-bold text-green-600">$125,000</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Win Probability</p>
                        <p className="text-lg font-bold text-foreground">78%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Timeline</p>
                        <p className="text-lg font-bold text-foreground">Q1 2026</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="primary" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Pitch
                      </Button>
                      <Button variant="outline" size="sm">View Details</Button>
                    </div>
                  </div>

                  <div className="p-5 border border-border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-foreground">Enterprise Support Upgrade</h4>
                          <Badge variant="warning">Medium Priority</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Current support tier shows high utilization. Client team size has grown 40% this year. Upgrade would provide 24/7 coverage and dedicated support engineer.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Estimated Value</p>
                        <p className="text-lg font-bold text-foreground">$48,000/yr</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Win Probability</p>
                        <p className="text-lg font-bold text-foreground">65%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Timeline</p>
                        <p className="text-lg font-bold text-foreground">Q4 2025</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="primary" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Pitch
                      </Button>
                      <Button variant="outline" size="sm">View Details</Button>
                    </div>
                  </div>

                  <div className="p-5 border border-border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-foreground">Training & Certification Program</h4>
                          <Badge variant="secondary">Low Priority</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          With new team members joining, structured training program could accelerate onboarding and improve platform adoption. Includes certification for 10 users.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Estimated Value</p>
                        <p className="text-lg font-bold text-foreground">$15,000</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Win Probability</p>
                        <p className="text-lg font-bold text-foreground">45%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Timeline</p>
                        <p className="text-lg font-bold text-foreground">Q1 2026</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="primary" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Pitch
                      </Button>
                      <Button variant="outline" size="sm">View Details</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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

      <Modal
        isOpen={showAddContactModal}
        onClose={() => setShowAddContactModal(false)}
        title="Add New Contact"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Name <span className="text-red-600">*</span>
            </label>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="John Doe"
                value={newContactForm.name}
                onChange={(e) => setNewContactForm({ ...newContactForm, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email <span className="text-red-600">*</span>
            </label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="john@example.com"
                value={newContactForm.email}
                onChange={(e) => setNewContactForm({ ...newContactForm, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Phone
            </label>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={newContactForm.phone}
                onChange={(e) => setNewContactForm({ ...newContactForm, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Job Title / Role <span className="text-red-600">*</span>
            </label>
            <Input
              placeholder="VP of Engineering"
              value={newContactForm.role}
              onChange={(e) => setNewContactForm({ ...newContactForm, role: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Department
            </label>
            <Input
              placeholder="Engineering"
              value={newContactForm.department}
              onChange={(e) => setNewContactForm({ ...newContactForm, department: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Influence Level
            </label>
            <select
              value={newContactForm.influenceLevel}
              onChange={(e) => setNewContactForm({ ...newContactForm, influenceLevel: e.target.value as 'high' | 'medium' | 'low' })}
              className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDecisionMaker"
              checked={newContactForm.isDecisionMaker}
              onChange={(e) => setNewContactForm({ ...newContactForm, isDecisionMaker: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="isDecisionMaker" className="text-sm font-medium text-foreground">
              Decision Maker
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowAddContactModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveContact}
              disabled={savingContact || !newContactForm.name || !newContactForm.email || !newContactForm.role}
            >
              {savingContact ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
