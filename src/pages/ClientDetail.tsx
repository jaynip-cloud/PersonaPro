import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ArrowLeft, Mail, Phone, Calendar, Sparkles, Edit2, Loader2 } from 'lucide-react';
import { PersonaSummary } from '../components/persona/PersonaSummary';
import { PersonaMetricsCards } from '../components/persona/PersonaMetricsCards';
import { ExplainabilityPanel } from '../components/persona/ExplainabilityPanel';
import { PersonaEditor } from '../components/persona/PersonaEditor';
import { PersonaMetrics, EvidenceSnippet } from '../types';
import { generatePersonaMetrics } from '../utils/personaGenerator';

export const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getClientById,
    getPersonaByClientId,
    getDocumentsByClientId,
    getCallRecordsByClientId,
    getRecommendationsByClientId,
    getMeetingsByClientId
  } = useApp();

  const client = getClientById(id || '');
  const persona = getPersonaByClientId(id || '');
  const documents = getDocumentsByClientId(id || '');
  const calls = getCallRecordsByClientId(id || '');
  const meetings = getMeetingsByClientId(id || '');
  const recommendations = getRecommendationsByClientId(id || '');

  const [personaMetrics, setPersonaMetrics] = useState<PersonaMetrics | null>(null);
  const [evidence, setEvidence] = useState<EvidenceSnippet[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'metrics' | 'explainability'>('metrics');

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Client not found</p>
        <Button onClick={() => navigate('/clients')} className="mt-4">Back to Clients</Button>
      </div>
    );
  }

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);

    setTimeout(() => {
      const result = generatePersonaMetrics({
        documents,
        calls,
        meetings,
        emails: []
      });

      setPersonaMetrics(result.metrics);
      setEvidence(result.evidence);
      setIsAnalyzing(false);
    }, 7000);
  };

  const handleSaveMetrics = (updatedMetrics: PersonaMetrics) => {
    setPersonaMetrics(updatedMetrics);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/clients')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Client Profile</h1>
        </div>
        {!personaMetrics && !isAnalyzing && (
          <Button variant="primary" onClick={handleRunAnalysis}>
            <Sparkles className="h-4 w-4 mr-2" />
            Run Persona Analysis
          </Button>
        )}
        {personaMetrics && !isAnalyzing && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsEditorOpen(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Persona
            </Button>
            <Button variant="primary" onClick={handleRunAnalysis}>
              <Sparkles className="h-4 w-4 mr-2" />
              Re-run Analysis
            </Button>
          </div>
        )}
      </div>

      {isAnalyzing && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Analyzing Client Persona</h3>
            <p className="text-sm text-muted-foreground">
              Processing documents, calls, and interactions to generate insights...
            </p>
            <div className="mt-4 max-w-md mx-auto">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-pulse" style={{ width: '70%' }} />
              </div>
            </div>
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

          <div className="border-b border-border">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('metrics')}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'metrics'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Persona Metrics
              </button>
              <button
                onClick={() => setActiveTab('explainability')}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'explainability'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Explainability ({evidence.length})
              </button>
            </div>
          </div>

          {activeTab === 'metrics' && (
            <PersonaMetricsCards metrics={personaMetrics} />
          )}

          {activeTab === 'explainability' && (
            <ExplainabilityPanel evidence={evidence} />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="p-6 pt-8">
            <div className="flex flex-col items-center text-center">
              <Avatar name={client.name} size="xl" />
              <h2 className="text-xl font-bold mt-4">{client.name}</h2>
              <p className="text-sm text-muted-foreground">{client.role}</p>
              <p className="text-sm text-muted-foreground">{client.company}</p>
              <Badge variant={client.status === 'active' ? 'success' : 'warning'} className="mt-3">
                {client.status}
              </Badge>
            </div>

            <div className="space-y-4 mt-6">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{client.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{client.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">Last contact: {client.lastContact}</span>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium mb-2">Persona Score</p>
              <ProgressBar value={client.personaScore} showLabel variant="success" />
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {client.tags.map(tag => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {persona && (
            <Card>
              <CardHeader>
                <CardTitle>AI Persona Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Communication Style</h4>
                    <p className="text-sm text-muted-foreground">{persona.communicationStyle}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">Decision Making</h4>
                    <p className="text-sm text-muted-foreground">{persona.decisionMakingStyle}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">Priorities</h4>
                    <div className="flex flex-wrap gap-1">
                      {persona.priorities.map(p => (
                        <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">Preferred Channels</h4>
                    <div className="flex flex-wrap gap-1">
                      {persona.preferredChannels.map(c => (
                        <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted rounded-md">
                  <p className="text-sm font-medium mb-2">Response Patterns</p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Avg Response</p>
                      <p className="font-medium">{persona.responsePatterns.avgResponseTime}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Best Time</p>
                      <p className="font-medium">{persona.responsePatterns.preferredTimeOfDay}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Best Day</p>
                      <p className="font-medium">{persona.responsePatterns.bestDayOfWeek}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.length > 0 ? (
                  recommendations.map(rec => (
                    <div key={rec.id} className="p-4 border border-border rounded-md">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={rec.priority === 'critical' ? 'destructive' : rec.priority === 'high' ? 'warning' : 'default'}>
                              {rec.priority}
                            </Badge>
                            <Badge variant="outline">{rec.type}</Badge>
                          </div>
                          <p className="font-medium text-sm">{rec.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recommendations available</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {calls.map(call => (
                  <div key={call.id} className="flex gap-4 pb-4 border-b border-border last:border-0">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{call.type === 'inbound' ? 'Incoming' : 'Outgoing'} Call</p>
                        <Badge variant={call.sentiment === 'positive' ? 'success' : 'secondary'} className="text-xs">
                          {call.sentiment}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{call.date} • {call.duration} minutes</p>
                      <p className="text-sm">{call.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {personaMetrics && (
        <PersonaEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          metrics={personaMetrics}
          onSave={handleSaveMetrics}
        />
      )}
    </div>
  );
};
