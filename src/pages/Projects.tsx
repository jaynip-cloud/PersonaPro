import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Plus,
  Briefcase,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  Search,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  projectType: string;
  status: 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  startDate: string;
  estimatedEndDate: string;
  actualEndDate?: string;
  progress: number;
  healthScore: number;
  sentimentTrend: 'up' | 'stable' | 'down';
  revenue: number;
}

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Website Revamp',
    clientId: '1',
    clientName: 'TechCorp Solutions',
    projectType: 'Web Development',
    status: 'completed',
    startDate: '2025-08-01',
    estimatedEndDate: '2025-10-15',
    actualEndDate: '2025-10-12',
    progress: 100,
    healthScore: 88,
    sentimentTrend: 'up',
    revenue: 45000,
  },
  {
    id: '2',
    name: 'AI Workflow Automation',
    clientId: '2',
    clientName: 'Global Finance Partners',
    projectType: 'Automation',
    status: 'in_progress',
    startDate: '2025-09-15',
    estimatedEndDate: '2025-12-30',
    progress: 72,
    healthScore: 72,
    sentimentTrend: 'stable',
    revenue: 85000,
  },
  {
    id: '3',
    name: 'CRM Migration',
    clientId: '3',
    clientName: 'Retail Dynamics',
    projectType: 'CRM Setup',
    status: 'on_hold',
    startDate: '2025-10-01',
    estimatedEndDate: '2025-11-30',
    progress: 45,
    healthScore: 45,
    sentimentTrend: 'down',
    revenue: 32000,
  },
  {
    id: '4',
    name: 'Brand Identity Refresh',
    clientId: '4',
    clientName: 'Creative Studios Inc',
    projectType: 'Branding',
    status: 'in_progress',
    startDate: '2025-10-15',
    estimatedEndDate: '2025-12-01',
    progress: 65,
    healthScore: 78,
    sentimentTrend: 'up',
    revenue: 28000,
  },
  {
    id: '5',
    name: 'Marketing Campaign Platform',
    clientId: '5',
    clientName: 'MarketPro Agency',
    projectType: 'Marketing',
    status: 'planned',
    startDate: '2025-11-15',
    estimatedEndDate: '2026-02-28',
    progress: 15,
    healthScore: 65,
    sentimentTrend: 'stable',
    revenue: 52000,
  },
];

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const [projects] = useState<Project[]>(mockProjects);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterHealth, setFilterHealth] = useState<string>('all');

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
    const matchesHealth =
      filterHealth === 'all' ||
      (filterHealth === 'excellent' && project.healthScore >= 80) ||
      (filterHealth === 'good' && project.healthScore >= 60 && project.healthScore < 80) ||
      (filterHealth === 'average' && project.healthScore >= 40 && project.healthScore < 60) ||
      (filterHealth === 'poor' && project.healthScore < 40);

    return matchesSearch && matchesStatus && matchesHealth;
  });

  const getStatusBadge = (status: Project['status']) => {
    const statusConfig = {
      planned: { label: 'Planned', variant: 'secondary' as const },
      in_progress: { label: 'In Progress', variant: 'primary' as const },
      on_hold: { label: 'On Hold', variant: 'warning' as const },
      completed: { label: 'Completed', variant: 'success' as const },
      cancelled: { label: 'Cancelled', variant: 'error' as const },
    };
    return statusConfig[status];
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    return 'Poor';
  };

  const getSentimentIcon = (trend: Project['sentimentTrend']) => {
    if (trend === 'up') return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (trend === 'down') return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const activeProjects = projects.filter((p) => p.status === 'in_progress');
  const totalRevenue = projects.reduce((sum, p) => sum + p.revenue, 0);
  const avgProgress = Math.round(
    projects.reduce((sum, p) => sum + p.progress, 0) / projects.length
  );
  const avgHealth = Math.round(
    projects.reduce((sum, p) => sum + p.healthScore, 0) / projects.length
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Project Portfolio</h1>
          <p className="text-muted-foreground mt-2">
            Track all client projects with AI-powered insights
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Analyze All
          </Button>
          <Button variant="primary" className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Projects</p>
                <p className="text-3xl font-bold text-foreground mt-1">{activeProjects.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  of {projects.length} total
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  ${(totalRevenue / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +12% vs last quarter
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Progress</p>
                <p className="text-3xl font-bold text-foreground mt-1">{avgProgress}%</p>
                <p className="text-xs text-muted-foreground mt-1">across all projects</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Health Score</p>
                <p className={`text-3xl font-bold mt-1 ${getHealthColor(avgHealth)}`}>
                  {avgHealth}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">{getHealthLabel(avgHealth)}</p>
              </div>
              <div className={`h-12 w-12 rounded-full ${avgHealth >= 60 ? 'bg-green-500/10' : 'bg-yellow-500/10'} flex items-center justify-center`}>
                {avgHealth >= 60 ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Projects</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-border rounded-md bg-background text-foreground text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Status</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={filterHealth}
                onChange={(e) => setFilterHealth(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Health</option>
                <option value="excellent">Excellent (80+)</option>
                <option value="good">Good (60-79)</option>
                <option value="average">Average (40-59)</option>
                <option value="poor">Poor (&lt;40)</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                    Project Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                    Client
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                    Timeline
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                    Progress
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                    Health
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                    Sentiment
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => {
                  const statusConfig = getStatusBadge(project.status);
                  return (
                    <tr
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="font-medium text-foreground">{project.name}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-muted-foreground">
                          {project.clientName}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="outline" size="sm">
                          {project.projectType}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant={statusConfig.variant} size="sm">
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-muted-foreground">
                          {new Date(project.startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          -{' '}
                          {new Date(project.estimatedEndDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden w-20">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground w-10">
                            {project.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${getHealthColor(project.healthScore)}`}>
                            {project.healthScore}%
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {getHealthLabel(project.healthScore)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center">
                          {getSentimentIcon(project.sentimentTrend)}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="font-semibold text-foreground">
                          ${(project.revenue / 1000).toFixed(0)}K
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredProjects.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No projects found matching your filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
