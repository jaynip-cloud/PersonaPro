import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  ArrowLeft,
  Edit,
  ExternalLink,
  Calendar,
  User,
  Users,
  DollarSign,
  Target,
  AlertTriangle,
  TrendingUp,
  FileText,
  MessageSquare,
  Lightbulb,
  Sparkles,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';

const mockProject = {
  id: '2',
  name: 'AI Workflow Automation',
  clientId: '2',
  clientName: 'Global Finance Partners',
  projectType: 'Automation',
  status: 'in_progress',
  summary: 'Implement AI-powered workflow automation to streamline financial operations and reduce manual processing time by 60%',
  scopeSummary: 'Build automated workflow system using AI/ML for document processing, approval workflows, and notification systems. Integration with existing ERP and CRM platforms.',
  startDate: '2025-09-15',
  estimatedEndDate: '2025-12-30',
  progress: 72,
  healthScore: 72,
  sentimentTrend: 'stable' as const,
  revenue: 85000,
  projectManager: 'Sarah Chen',
  teamMembers: ['John Smith', 'Emma Wilson', 'David Lee'],
  deliverables: [
    { id: '1', name: 'Requirements Gathering', type: 'milestone', dueDate: '2025-09-30', status: 'completed' },
    { id: '2', name: 'System Architecture Design', type: 'deliverable', dueDate: '2025-10-15', status: 'completed' },
    { id: '3', name: 'Core Automation Engine', type: 'deliverable', dueDate: '2025-11-15', status: 'in_progress' },
    { id: '4', name: 'Integration with ERP', type: 'deliverable', dueDate: '2025-12-01', status: 'pending' },
    { id: '5', name: 'User Training', type: 'milestone', dueDate: '2025-12-20', status: 'pending' },
  ],
  risks: [
    {
      id: '1',
      description: 'ERP API documentation incomplete, may cause integration delays',
      severity: 'high' as const,
      impactArea: 'timeline' as const,
      owner: 'John Smith',
      status: 'monitoring' as const,
      mitigationPlan: 'Scheduled technical call with ERP vendor. Backup plan to use webhook approach.',
    },
    {
      id: '2',
      description: 'Client stakeholder availability for approval sessions',
      severity: 'medium' as const,
      impactArea: 'timeline' as const,
      owner: 'Sarah Chen',
      status: 'open' as const,
      mitigationPlan: 'Implement async approval process via email notifications.',
    },
  ],
  opportunities: [
    {
      id: '1',
      summary: 'Expand automation into HR workflows',
      potentialValue: 35000,
      owner: 'Sarah Chen',
      nextStep: 'Schedule discovery call with HR department',
      status: 'exploration' as const,
    },
    {
      id: '2',
      summary: 'Implement AI-powered analytics dashboard',
      potentialValue: 28000,
      owner: 'Emma Wilson',
      nextStep: 'Prepare proposal and ROI analysis',
      status: 'pitching' as const,
    },
  ],
  communications: [
    {
      id: '1',
      type: 'meeting' as const,
      date: '2025-10-28',
      summary: 'Sprint review - demonstrated automation engine core functionality. Client impressed with progress.',
      sentimentScore: 85,
      participants: ['Sarah Chen', 'Client CTO', 'Client PM'],
      followUps: ['Send architecture diagrams', 'Schedule ERP integration workshop'],
    },
    {
      id: '2',
      type: 'email' as const,
      date: '2025-10-25',
      summary: 'Discussed timeline concerns for ERP integration. Client requested weekly status updates.',
      sentimentScore: 65,
      participants: ['Sarah Chen', 'Client PM'],
      followUps: ['Set up weekly sync meeting'],
    },
    {
      id: '3',
      type: 'meeting' as const,
      date: '2025-10-15',
      summary: 'Mid-project check-in. Client raised concerns about delays in documentation delivery.',
      sentimentScore: 55,
      participants: ['Sarah Chen', 'John Smith', 'Client PM', 'Client CTO'],
      followUps: ['Expedite documentation', 'Assign dedicated technical writer'],
    },
  ],
  documents: [
    { id: '1', name: 'Project Proposal.pdf', type: 'proposal', uploadedBy: 'Sarah Chen', createdAt: '2025-09-01' },
    { id: '2', name: 'Statement of Work.pdf', type: 'sow', uploadedBy: 'Sarah Chen', createdAt: '2025-09-10' },
    { id: '3', name: 'System Architecture.pdf', type: 'asset', uploadedBy: 'John Smith', createdAt: '2025-10-15' },
    { id: '4', name: 'Sprint Review Notes.docx', type: 'meeting_notes', uploadedBy: 'Emma Wilson', createdAt: '2025-10-28' },
  ],
};

type TabType = 'overview' | 'scope' | 'communications' | 'risks' | 'opportunities' | 'documents' | 'insights';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const project = mockProject;

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: FileText },
    { id: 'scope' as TabType, label: 'Scope & Deliverables', icon: Target },
    { id: 'communications' as TabType, label: 'Communications', icon: MessageSquare },
    { id: 'risks' as TabType, label: 'Risks & Issues', icon: AlertTriangle },
    { id: 'opportunities' as TabType, label: 'Opportunities', icon: Lightbulb },
    { id: 'documents' as TabType, label: 'Documents', icon: FileText },
    { id: 'insights' as TabType, label: 'AI Insights', icon: Sparkles },
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planned: { label: 'Planned', variant: 'secondary' as const },
      in_progress: { label: 'In Progress', variant: 'primary' as const },
      on_hold: { label: 'On Hold', variant: 'warning' as const },
      completed: { label: 'Completed', variant: 'success' as const },
      cancelled: { label: 'Cancelled', variant: 'error' as const },
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.in_progress;
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSentimentIcon = (trend: 'up' | 'stable' | 'down') => {
    if (trend === 'up') return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (trend === 'down') return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getSeverityBadge = (severity: string) => {
    if (severity === 'high') return <Badge variant="error">High</Badge>;
    if (severity === 'medium') return <Badge variant="warning">Medium</Badge>;
    return <Badge variant="secondary">Low</Badge>;
  };

  const statusBadge = getStatusBadge(project.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projects')}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {project.clientName}
            </span>
            <span>•</span>
            <span>{project.projectType}</span>
            <span>•</span>
            <span>ID: #{project.id}</span>
          </div>
        </div>
        <Button variant="outline" className="gap-2">
          <Edit className="h-4 w-4" />
          Edit Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold text-foreground">{project.progress}%</p>
              <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Health Score</p>
              <p className={`text-2xl font-bold ${getHealthColor(project.healthScore)}`}>
                {project.healthScore}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {project.healthScore >= 80 ? 'Excellent' : project.healthScore >= 60 ? 'Good' : project.healthScore >= 40 ? 'Average' : 'Poor'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Sentiment</p>
              <div className="flex items-center gap-2">
                {getSentimentIcon(project.sentimentTrend)}
                <span className="text-2xl font-bold text-foreground capitalize">
                  {project.sentimentTrend}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Based on recent interactions</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold text-foreground">
                ${(project.revenue / 1000).toFixed(0)}K
              </p>
              <p className="text-xs text-muted-foreground mt-1">Total project value</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border-b border-border">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Project Summary</p>
                    <p className="text-foreground">{project.summary}</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="text-foreground font-medium">
                        {new Date(project.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Est. End Date</p>
                      <p className="text-foreground font-medium">
                        {new Date(project.estimatedEndDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Project Manager</p>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="text-foreground font-medium">{project.projectManager}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Team Members</p>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <p className="text-foreground">{project.teamMembers.join(', ')}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'scope' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scope Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground">{project.scopeSummary}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Deliverables & Milestones</CardTitle>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.deliverables.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {item.status === 'completed' && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                        {item.status === 'in_progress' && (
                          <Clock className="h-5 w-5 text-blue-600" />
                        )}
                        {item.status === 'pending' && (
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{item.name}</p>
                            <Badge variant={item.type === 'milestone' ? 'primary' : 'outline'} size="sm">
                              {item.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Due: {new Date(item.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          item.status === 'completed'
                            ? 'success'
                            : item.status === 'in_progress'
                            ? 'primary'
                            : 'secondary'
                        }
                      >
                        {item.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'communications' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Communication History</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Run Analysis
                  </Button>
                  <Button variant="primary" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Note
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {project.communications.map((comm) => (
                  <div key={comm.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Badge variant={comm.type === 'meeting' ? 'primary' : 'outline'}>
                          {comm.type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(comm.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Sentiment:</span>
                        <span
                          className={`text-sm font-semibold ${
                            comm.sentimentScore >= 75
                              ? 'text-green-600'
                              : comm.sentimentScore >= 50
                              ? 'text-blue-600'
                              : 'text-yellow-600'
                          }`}
                        >
                          {comm.sentimentScore}%
                        </span>
                      </div>
                    </div>
                    <p className="text-foreground mb-3">{comm.summary}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Users className="h-4 w-4" />
                      <span>Participants: {comm.participants.join(', ')}</span>
                    </div>
                    {comm.followUps.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-sm font-medium text-foreground mb-2">Follow-ups:</p>
                        <ul className="space-y-1">
                          {comm.followUps.map((followUp, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary">•</span>
                              {followUp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'risks' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Risks & Issues</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Identify Risks
                  </Button>
                  <Button variant="primary" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Risk
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {project.risks.map((risk) => (
                  <div key={risk.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getSeverityBadge(risk.severity)}
                          <Badge variant="outline">{risk.impactArea}</Badge>
                          <Badge
                            variant={
                              risk.status === 'resolved'
                                ? 'success'
                                : risk.status === 'monitoring'
                                ? 'warning'
                                : 'secondary'
                            }
                          >
                            {risk.status}
                          </Badge>
                        </div>
                        <p className="text-foreground font-medium">{risk.description}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Owner: {risk.owner}</span>
                      </div>
                      {risk.mitigationPlan && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="font-medium text-foreground mb-1">Mitigation Plan:</p>
                          <p className="text-muted-foreground">{risk.mitigationPlan}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'opportunities' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Opportunities & Upsells</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Generate Opportunities
                  </Button>
                  <Button variant="primary" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Opportunity
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {project.opportunities.map((opp) => (
                  <div key={opp.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="h-5 w-5 text-yellow-500" />
                          <h4 className="font-semibold text-foreground">{opp.summary}</h4>
                        </div>
                        <Badge
                          variant={
                            opp.status === 'closed'
                              ? 'success'
                              : opp.status === 'pitching'
                              ? 'primary'
                              : 'secondary'
                          }
                        >
                          {opp.status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Potential Value</p>
                        <p className="text-xl font-bold text-foreground">
                          ${(opp.potentialValue / 1000).toFixed(0)}K
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm mt-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Owner: {opp.owner}</span>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <p className="font-medium text-foreground mb-1">Next Step:</p>
                        <p className="text-muted-foreground">{opp.nextStep}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'documents' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Project Documents</CardTitle>
                <Button variant="primary" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Upload Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {project.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">{doc.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Badge variant="outline" size="sm">
                            {doc.type.replace('_', ' ')}
                          </Badge>
                          <span>•</span>
                          <span>Uploaded by {doc.uploadedBy}</span>
                          <span>•</span>
                          <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle>AI-Generated Insights</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Project Health Analysis</h4>
                  <div className="bg-background rounded-lg p-4 border border-border">
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-full ${project.healthScore >= 60 ? 'bg-green-500/10' : 'bg-yellow-500/10'} flex items-center justify-center`}>
                        <span className={`text-lg font-bold ${getHealthColor(project.healthScore)}`}>
                          {project.healthScore}%
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-foreground mb-2">
                          <strong>Status:</strong> {project.healthScore >= 80 ? 'Excellent' : project.healthScore >= 60 ? 'Good - Stable but needs attention' : 'Requires Immediate Action'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Based on 3 recent meetings: sentiment is positive but concerns about ERP integration delays appeared twice. Progress is on track at 72%, slightly ahead of timeline expectations.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Sentiment Trend Explanation</h4>
                  <div className="bg-background rounded-lg p-4 border border-border">
                    <div className="flex items-start gap-3">
                      {getSentimentIcon(project.sentimentTrend)}
                      <div className="flex-1">
                        <p className="text-foreground mb-2">
                          <strong>Trend:</strong> Stable with slight positive indicators
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Communication sentiment has remained steady over the past month. Recent demo received highly positive feedback (85% sentiment), offsetting earlier concerns about documentation timing.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Risk Forecast</h4>
                  <div className="bg-background rounded-lg p-4 border border-border">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <div className="flex-1">
                        <p className="text-foreground mb-2">
                          <strong>Risk Level:</strong> Medium - Manageable with proactive mitigation
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• ERP integration API issues: 65% probability of 1-week delay</li>
                          <li>• Stakeholder availability: Low impact, async processes in place</li>
                          <li>• Recommended: Schedule technical sync with ERP vendor within 48 hours</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">Client Satisfaction Gauge</h4>
                  <div className="bg-background rounded-lg p-4 border border-border">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <span className="text-2xl font-bold text-green-600">8.5/10</span>
                          <Badge variant="success">High Satisfaction</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Client demonstrates high engagement (3 meetings in 2 weeks), prompt responses to requests, and positive feedback on deliverables. Strong partnership indicators suggest high probability for future projects.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Button variant="primary" className="w-full gap-2">
                  <Sparkles className="h-4 w-4" />
                  Regenerate AI Insights
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
