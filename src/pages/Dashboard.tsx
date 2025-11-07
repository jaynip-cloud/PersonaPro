import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Users, TrendingUp, Briefcase, Lightbulb, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DashboardKPIs {
  totalClients: number;
  activeProjects: number;
  totalProjects: number;
  totalOpportunities: number;
  activeOpportunities: number;
  totalPipelineValue: number;
  savedPitches: number;
  totalContacts: number;
  totalDocuments: number;
  totalTranscripts: number;
  totalRevenue: number;
  conversionRate: number;
  averageDealSize: number;
}

export const Dashboard: React.FC = () => {
  const { clients } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [pitches, setPitches] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [financialData, setFinancialData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [kpis, setKpis] = useState<DashboardKPIs>({
    totalClients: 0,
    activeProjects: 0,
    totalProjects: 0,
    totalOpportunities: 0,
    activeOpportunities: 0,
    totalPipelineValue: 0,
    savedPitches: 0,
    totalContacts: 0,
    totalDocuments: 0,
    totalTranscripts: 0,
    totalRevenue: 0,
    conversionRate: 0,
    averageDealSize: 0,
  });

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const [
        projectsRes,
        opportunitiesRes,
        pitchesRes,
        contactsRes,
        documentsRes,
        transcriptsRes,
        financialRes
      ] = await Promise.all([
        supabase
          .from('projects')
          .select(`
            *,
            clients(
              id,
              company_name,
              name
            )
          `)
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('opportunities')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('saved_pitches')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('contacts')
          .select('id')
          .eq('user_id', user.id),
        supabase
          .from('documents')
          .select('id')
          .eq('user_id', user.id),
        supabase
          .from('meeting_transcripts')
          .select('id')
          .eq('user_id', user.id),
        supabase
          .from('financial_data')
          .select('total_revenue, mrr')
          .eq('user_id', user.id)
      ]);

      // Handle errors and set data
      if (projectsRes.error) {
        console.error('Error fetching projects:', projectsRes.error);
        setProjects([]);
      } else {
        const projectsData = projectsRes.data || [];
        console.log('Fetched projects:', projectsData.length, 'projects');
        if (projectsData.length > 0) {
          console.log('Projects with status:', projectsData.map((p: any) => ({ name: p.name, status: p.status })));
        }
        setProjects(projectsData);
      }

      if (opportunitiesRes.error) {
        console.error('Error fetching opportunities:', opportunitiesRes.error);
        setOpportunities([]);
      } else {
        setOpportunities(opportunitiesRes.data || []);
      }

      if (pitchesRes.error) {
        console.error('Error fetching pitches:', pitchesRes.error);
        setPitches([]);
      } else {
        setPitches(pitchesRes.data || []);
      }

      if (contactsRes.error) {
        console.error('Error fetching contacts:', contactsRes.error);
        setContacts([]);
      } else {
        setContacts(contactsRes.data || []);
      }

      if (documentsRes.error) {
        console.error('Error fetching documents:', documentsRes.error);
        setDocuments([]);
      } else {
        setDocuments(documentsRes.data || []);
      }

      if (transcriptsRes.error) {
        console.error('Error fetching transcripts:', transcriptsRes.error);
        setTranscripts([]);
      } else {
        setTranscripts(transcriptsRes.data || []);
      }

      if (financialRes.error) {
        console.error('Error fetching financial data:', financialRes.error);
        setFinancialData([]);
      } else {
        setFinancialData(financialRes.data || []);
      }

      // Calculate KPIs
      calculateKPIs(
        projectsRes.data || [],
        opportunitiesRes.data || [],
        pitchesRes.data || [],
        contactsRes.data || [],
        documentsRes.data || [],
        transcriptsRes.data || [],
        financialRes.data || []
      );
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateKPIs = (
    projectsData: any[],
    opportunitiesData: any[],
    pitchesData: any[],
    contactsData: any[],
    documentsData: any[],
    transcriptsData: any[],
    financialData: any[]
  ) => {
    // Ensure projectsData is an array
    const projects = Array.isArray(projectsData) ? projectsData : [];
    
    // Debug: Log projects to see what we're working with
    console.log('Projects data for KPI calculation:', projects.length, 'projects');
    if (projects.length > 0) {
      console.log('Project statuses:', projects.map((p: any) => ({ id: p.id, name: p.name, status: p.status })));
    }
    
    const activeProjects = projects.filter(
      (p: any) => {
        if (!p || !p.status) {
          console.log('Project missing status:', p);
          return false;
        }
        const status = String(p.status).toLowerCase();
        // Count all projects except 'loss' and 'cancelled' as active
        const isActive = status !== 'loss' && status !== 'cancelled';
        if (!isActive) {
          console.log('Inactive project:', p.name, 'status:', status);
        }
        return isActive;
      }
    ).length;
    
    console.log('Active projects count:', activeProjects, 'out of', projects.length);

    const activeOpportunities = opportunitiesData.filter(
      opp => opp.stage !== 'closed-won' && opp.stage !== 'closed-lost'
    ).length;

    const totalPipelineValue = opportunitiesData.reduce((sum, opp) => {
      if (opp.value && opp.probability) {
        return sum + (opp.value * (opp.probability / 100));
      }
      return sum + (opp.value || 0);
    }, 0);

    const convertedOpportunities = opportunitiesData.filter(
      opp => opp.converted_to_project_id !== null
    ).length;

    const conversionRate = opportunitiesData.length > 0
      ? (convertedOpportunities / opportunitiesData.length) * 100
      : 0;

    // Calculate average deal size from projects (not opportunities)
    const projectsWithValue = projects.filter((p: any) => {
      if (!p) return false;
      const budget = parseFloat(p.budget) || 0;
      const revenue = parseFloat(p.revenue) || 0;
      const valueAmount = parseFloat(p.value_amount) || 0;
      return budget > 0 || revenue > 0 || valueAmount > 0;
    });

    const averageDealSize = projectsWithValue.length > 0
      ? projectsWithValue.reduce((sum, p: any) => {
          // Priority: budget > revenue > value_amount
          const projectValue = parseFloat(p.budget) || 
                              parseFloat(p.revenue) || 
                              parseFloat(p.value_amount) || 
                              0;
          return sum + projectValue;
        }, 0) / projectsWithValue.length
      : 0;

    // Calculate total revenue from all projects
    // Use budget, revenue, or value_amount - whichever is available
    const totalRevenue = projects.reduce((sum, p: any) => {
      if (!p) return sum;
      
      // Priority: budget > revenue > value_amount
      const projectValue = parseFloat(p.budget) || 
                          parseFloat(p.revenue) || 
                          parseFloat(p.value_amount) || 
                          0;
      return sum + projectValue;
    }, 0);

    console.log('Revenue calculation:', {
      totalProjects: projects.length,
      projectsWithValue: projectsWithValue.length,
      averageDealSize,
      totalRevenue
    });

    setKpis({
      totalClients: clients.length,
      activeProjects,
      totalProjects: projects.length,
      totalOpportunities: opportunitiesData.length,
      activeOpportunities,
      totalPipelineValue,
      savedPitches: pitchesData.length,
      totalContacts: contactsData.length,
      totalDocuments: documentsData.length,
      totalTranscripts: transcriptsData.length,
      totalRevenue: totalRevenue,
      conversionRate,
      averageDealSize,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back! Here's your AI-powered intelligence overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/clients')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                <p className="text-3xl font-bold mt-2">{kpis.totalClients}</p>
                <p className="text-xs text-muted-foreground mt-1">View all clients</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/projects')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                <p className="text-3xl font-bold mt-2">{kpis.activeProjects}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpis.totalProjects} total projects</p>
              </div>
              <Briefcase className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/growth-opportunities')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Growth Opportunities</p>
                <p className="text-3xl font-bold mt-2">{kpis.totalOpportunities}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpis.activeOpportunities} active</p>
              </div>
              <Lightbulb className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold mt-2">
                  ${(kpis.totalRevenue / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-muted-foreground mt-1">From all projects</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Projects</CardTitle>
              <button
                onClick={() => navigate('/projects')}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No projects yet</p>
                <button
                  onClick={() => navigate('/projects/new')}
                  className="text-sm text-primary hover:underline"
                >
                  Create your first project
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.slice(0, 5).map((project) => {
                  const client = project.clients || (typeof project.clients === 'object' ? project.clients : null);
                  const clientName = client?.company_name || client?.name || 'Unknown Client';
                  const projectDate = project.updated_at || project.created_at;
                  
                  const getStatusVariant = (status: string) => {
                    switch (status) {
                      case 'win':
                        return 'success';
                      case 'loss':
                        return 'destructive';
                      case 'completed':
                        return 'success';
                      case 'in_progress':
                      case 'active':
                      case 'discussion':
                        return 'default';
                      case 'quote':
                      case 'opportunity_identified':
                        return 'warning';
                      case 'on_hold':
                        return 'secondary';
                      default:
                        return 'secondary';
                    }
                  };

                  const formatStatus = (status: string) => {
                    return status
                      .split('_')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ');
                  };

                  return (
                    <div
                      key={project.id}
                      className="flex items-start justify-between pb-4 border-b border-border last:border-0 cursor-pointer hover:bg-accent/50 -mx-2 px-2 py-2 rounded transition-colors"
                      onClick={() => navigate(`/clients/${project.client_id}/projects`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{project.name || 'Untitled Project'}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {clientName} • {project.project_type || 'General'}
                        </p>
                        {projectDate && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(projectDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={getStatusVariant(project.status)}
                        className="ml-2 flex-shrink-0"
                      >
                        {formatStatus(project.status || 'unknown')}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Clients</CardTitle>
              <button
                onClick={() => navigate('/clients')}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No clients yet</p>
                <button
                  onClick={() => navigate('/clients/add')}
                  className="text-sm text-primary hover:underline"
                >
                  Add your first client
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {clients.slice(0, 5).map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between pb-4 border-b border-border last:border-0 cursor-pointer hover:bg-accent/50 -mx-2 px-2 py-2 rounded transition-colors"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <div>
                      <p className="font-medium text-sm">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.company}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {client.location || 'No location'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
