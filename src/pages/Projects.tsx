import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  CheckCircle,
  UserPlus,
  Calendar,
  TrendingUp,
  Briefcase,
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  projectCode: string;
  clientId: string;
  clientName: string;
  projectType: string;
  status: 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  startDate: string;
  endDatePlanned: string;
  actualEndDate?: string;
  progress: number;
  healthScore: number;
  projectManager: string;
  lastUpdated: string;
}

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Website Revamp',
    projectCode: 'WEB-001',
    clientId: '1',
    clientName: 'TechCorp Solutions',
    projectType: 'Web Development',
    status: 'completed',
    startDate: '2025-08-01',
    endDatePlanned: '2025-10-15',
    actualEndDate: '2025-10-12',
    progress: 100,
    healthScore: 88,
    projectManager: 'Sarah Chen',
    lastUpdated: '2025-10-12',
  },
  {
    id: '2',
    name: 'AI Workflow Automation',
    projectCode: 'AUTO-002',
    clientId: '2',
    clientName: 'Global Finance Partners',
    projectType: 'Automation',
    status: 'in_progress',
    startDate: '2025-09-15',
    endDatePlanned: '2025-12-30',
    progress: 72,
    healthScore: 72,
    projectManager: 'Sarah Chen',
    lastUpdated: '2025-10-28',
  },
  {
    id: '3',
    name: 'CRM Migration',
    projectCode: 'CRM-003',
    clientId: '3',
    clientName: 'Retail Dynamics',
    projectType: 'CRM Setup',
    status: 'on_hold',
    startDate: '2025-10-01',
    endDatePlanned: '2025-11-30',
    progress: 45,
    healthScore: 45,
    projectManager: 'John Smith',
    lastUpdated: '2025-10-20',
  },
  {
    id: '4',
    name: 'Brand Identity Refresh',
    projectCode: 'BRAND-004',
    clientId: '4',
    clientName: 'Creative Studios Inc',
    projectType: 'Branding',
    status: 'in_progress',
    startDate: '2025-10-15',
    endDatePlanned: '2025-12-01',
    progress: 65,
    healthScore: 78,
    projectManager: 'Emma Wilson',
    lastUpdated: '2025-10-30',
  },
  {
    id: '5',
    name: 'Marketing Campaign Platform',
    projectCode: 'MARK-005',
    clientId: '5',
    clientName: 'MarketPro Agency',
    projectType: 'Marketing',
    status: 'planned',
    startDate: '2025-11-15',
    endDatePlanned: '2026-02-28',
    progress: 15,
    healthScore: 65,
    projectManager: 'Emma Wilson',
    lastUpdated: '2025-10-25',
  },
];

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const [projects] = useState<Project[]>(mockProjects);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterManager, setFilterManager] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('lastUpdated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const uniqueClients = Array.from(new Set(projects.map((p) => p.clientName)));
  const uniqueTypes = Array.from(new Set(projects.map((p) => p.projectType)));
  const uniqueManagers = Array.from(new Set(projects.map((p) => p.projectManager)));

  const filteredProjects = projects
    .filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.projectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClient = filterClient === 'all' || project.clientName === filterClient;
      const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
      const matchesType = filterType === 'all' || project.projectType === filterType;
      const matchesManager = filterManager === 'all' || project.projectManager === filterManager;

      return matchesSearch && matchesClient && matchesStatus && matchesType && matchesManager;
    })
    .sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'startDate':
          aVal = new Date(a.startDate).getTime();
          bVal = new Date(b.startDate).getTime();
          break;
        case 'endDate':
          aVal = new Date(a.endDatePlanned).getTime();
          bVal = new Date(b.endDatePlanned).getTime();
          break;
        case 'progress':
          aVal = a.progress;
          bVal = b.progress;
          break;
        case 'lastUpdated':
          aVal = new Date(a.lastUpdated).getTime();
          bVal = new Date(b.lastUpdated).getTime();
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
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
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProjects.length === filteredProjects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(filteredProjects.map((p) => p.id));
    }
  };

  const handleBulkMarkCompleted = () => {
    alert(`Marking ${selectedProjects.length} projects as completed (mock action)`);
  };

  const handleBulkSetManager = () => {
    alert(`Setting manager for ${selectedProjects.length} projects (mock action)`);
  };

  const handleExportCSV = () => {
    alert('Exporting projects to CSV (mock action)');
  };

  const handleImportCSV = () => {
    alert('Import CSV dialog would open here (mock action)');
  };

  const activeProjects = projects.filter((p) => p.status === 'in_progress');
  const completedProjects = projects.filter((p) => p.status === 'completed');
  const avgProgress = Math.round(
    projects.reduce((sum, p) => sum + p.progress, 0) / projects.length
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Project Portfolio</h1>
          <p className="text-muted-foreground mt-2">
            {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'} found
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={handleImportCSV}>
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="primary" className="gap-2" onClick={() => navigate('/projects/new')}>
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Projects</p>
                <p className="text-3xl font-bold text-foreground mt-1">{activeProjects.length}</p>
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
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-foreground mt-1">{completedProjects.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
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
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name, code, or client..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 border border-border rounded-md bg-background text-foreground text-sm w-80 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="lastUpdated">Last Updated</option>
                  <option value="name">Name</option>
                  <option value="startDate">Start Date</option>
                  <option value="endDate">End Date</option>
                  <option value="progress">Progress</option>
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-4 gap-3 p-4 border border-border rounded-lg bg-muted/30">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Client</label>
                  <select
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Clients</option>
                    {uniqueClients.map((client) => (
                      <option key={client} value={client}>
                        {client}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Status</option>
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Types</option>
                    {uniqueTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Manager</label>
                  <select
                    value={filterManager}
                    onChange={(e) => setFilterManager(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Managers</option>
                    {uniqueManagers.map((manager) => (
                      <option key={manager} value={manager}>
                        {manager}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {selectedProjects.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <span className="text-sm font-medium text-foreground">
                  {selectedProjects.length} project{selectedProjects.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleBulkMarkCompleted}>
                    <CheckCircle className="h-4 w-4" />
                    Mark Completed
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleBulkSetManager}>
                    <UserPlus className="h-4 w-4" />
                    Set Manager
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedProjects([])}>
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredProjects.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-6">Create your first project to get started</p>
              <Button variant="primary" className="gap-2" onClick={() => navigate('/projects/new')}>
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedProjects.length === filteredProjects.length}
                        onChange={toggleSelectAll}
                        className="rounded border-border"
                      />
                    </th>
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
                      Start
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                      End
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                      Progress
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                      Manager
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                      Health
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => {
                    const statusConfig = getStatusBadge(project.status);
                    return (
                      <tr
                        key={project.id}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <input
                            type="checkbox"
                            checked={selectedProjects.includes(project.id)}
                            onChange={() => toggleProjectSelection(project.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-border"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <div
                            className="cursor-pointer hover:text-primary"
                            onClick={() => navigate(`/projects/${project.id}`)}
                          >
                            <div className="font-medium text-foreground">{project.name}</div>
                            <div className="text-xs text-muted-foreground">{project.projectCode}</div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-muted-foreground">{project.clientName}</div>
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
                              year: 'numeric',
                            })}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-muted-foreground">
                            {project.actualEndDate ? (
                              <span className="text-green-600">
                                {new Date(project.actualEndDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            ) : (
                              new Date(project.endDatePlanned).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden w-16">
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
                          <div className="text-sm text-muted-foreground">{project.projectManager}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div
                            className={`w-3 h-3 rounded-full ${getHealthColor(project.healthScore)}`}
                            title={`Health: ${project.healthScore}%`}
                          />
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-muted-foreground">
                            {new Date(project.lastUpdated).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
