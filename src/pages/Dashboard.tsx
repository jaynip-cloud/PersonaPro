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
  const [opportunities, setOpportunities] = useState<any[]>([]);
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
        clientsRes,
        opportunitiesRes,
        pitchesRes,
        contactsRes,
        documentsRes,
        transcriptsRes,
        financialRes
      ] = await Promise.all([
        supabase
          .from('clients')
          .select('id, status, budget_range, annual_revenue, projects')
          .eq('user_id', user.id),
        supabase
          .from('opportunities')
          .select(`
            *,
            clients(
              id,
              company,
              name
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('saved_pitches')
          .select('*')
          .eq('created_by', user.id)
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

      // Fetch opportunities from opportunities table
      const opportunitiesData = opportunitiesRes.data || [];
      if (opportunitiesRes.error) {
        console.error('Error fetching opportunities:', opportunitiesRes.error);
        setOpportunities([]);
      } else {
        console.log('Fetched opportunities:', opportunitiesData.length, 'opportunities');
        setOpportunities(opportunitiesData);
      }


      // Calculate KPIs
      calculateKPIs(
        clientsRes.data || [],
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
    clientsData: any[],
    opportunitiesData: any[],
    pitchesData: any[],
    contactsData: any[],
    documentsData: any[],
    transcriptsData: any[],
    financialData: any[]
  ) => {
    const clients = Array.isArray(clientsData) ? clientsData : [];
    const clientsCount = clients.length;

    console.log('Clients count for KPI:', clientsCount);

    // Count active projects from clients
    // Active statuses: active, onboarding, at_risk (not churned, prospect, or lead)
    const activeProjects = clients.filter(
      (c: any) => {
        if (!c || !c.status) {
          return false;
        }
        const status = String(c.status).toLowerCase();
        const isActive = status === 'active' || status === 'onboarding' || status === 'at_risk';
        return isActive;
      }
    ).length;

    // Count total projects (clients with projects jsonb data or active/onboarding/at_risk status)
    const totalProjects = clients.filter(
      (c: any) => {
        if (!c) return false;
        const hasProjects = c.projects && Array.isArray(c.projects) && c.projects.length > 0;
        const isProjectClient = c.status && ['active', 'onboarding', 'at_risk', 'churned'].includes(String(c.status).toLowerCase());
        return hasProjects || isProjectClient;
      }
    ).length;

    console.log('Active projects count:', activeProjects, 'Total projects:', totalProjects);

    // Calculate active opportunities (stage !== 'closed_won' and 'closed_lost')
    const activeOpportunities = opportunitiesData.filter(
      opp => opp.stage !== 'closed_won' && opp.stage !== 'closed_lost'
    ).length;

    // Calculate total pipeline value from opportunities
    const totalPipelineValue = opportunitiesData.reduce((sum, opp) => {
      const oppValue = parseFloat(opp.value) || 0;
      return sum + oppValue;
    }, 0);

    // Calculate conversion rate (opportunities that became closed_won)
    const convertedOpportunities = opportunitiesData.filter(
      opp => opp.stage === 'closed_won'
    ).length;

    const conversionRate = opportunitiesData.length > 0
      ? (convertedOpportunities / opportunitiesData.length) * 100
      : 0;

    // Helper function to parse budget range (e.g., "$10,000 - $50,000" or "50000")
    const parseBudgetRange = (budgetRange: string): number => {
      if (!budgetRange) return 0;

      // Remove currency symbols and whitespace
      const cleaned = budgetRange.replace(/[$,\s]/g, '');

      // If it contains a dash, take the average of the range
      if (cleaned.includes('-')) {
        const [min, max] = cleaned.split('-').map(val => parseFloat(val) || 0);
        return (min + max) / 2;
      }

      // Otherwise, parse as a single number
      return parseFloat(cleaned) || 0;
    };

    // Calculate revenue from clients with budget_range or annual_revenue
    const clientsWithValue = clients.filter((c: any) => {
      if (!c) return false;
      const budgetValue = parseBudgetRange(c.budget_range || '');
      const revenueValue = parseFloat(c.annual_revenue) || 0;
      return budgetValue > 0 || revenueValue > 0;
    });

    const averageDealSize = clientsWithValue.length > 0
      ? clientsWithValue.reduce((sum, c: any) => {
          const budgetValue = parseBudgetRange(c.budget_range || '');
          const revenueValue = parseFloat(c.annual_revenue) || 0;
          // Use budget_range if available, otherwise annual_revenue
          const clientValue = budgetValue > 0 ? budgetValue : revenueValue;
          return sum + clientValue;
        }, 0) / clientsWithValue.length
      : 0;

    // Calculate total revenue from all active project clients
    const totalRevenue = clients
      .filter((c: any) => {
        if (!c || !c.status) return false;
        const status = String(c.status).toLowerCase();
        return status === 'active' || status === 'onboarding' || status === 'at_risk';
      })
      .reduce((sum, c: any) => {
        const budgetValue = parseBudgetRange(c.budget_range || '');
        const revenueValue = parseFloat(c.annual_revenue) || 0;
        const clientValue = budgetValue > 0 ? budgetValue : revenueValue;
        return sum + clientValue;
      }, 0);

    console.log('Revenue calculation:', {
      totalClients: clients.length,
      clientsWithValue: clientsWithValue.length,
      activeProjects,
      averageDealSize,
      totalRevenue
    });

    setKpis({
      totalClients: clientsCount,
      activeProjects,
      totalProjects: totalProjects,
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
              <CardTitle>Recent Opportunities</CardTitle>
              <button
                onClick={() => navigate('/growth-opportunities')}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading opportunities...</div>
            ) : opportunities.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No opportunities yet</p>
                <button
                  onClick={() => navigate('/growth-opportunities')}
                  className="text-sm text-primary hover:underline"
                >
                  View growth opportunities
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {opportunities.slice(0, 5).map((opportunity) => {
                  const client = opportunity.clients || (typeof opportunity.clients === 'object' ? opportunity.clients : null);
                  const clientName = client?.company || client?.name || 'Unknown Client';
                  const oppDate = opportunity.created_at;

                  const getStageVariant = (stage: string) => {
                    switch (stage) {
                      case 'closed_won':
                        return 'success';
                      case 'closed_lost':
                        return 'destructive';
                      case 'proposal':
                      case 'negotiation':
                        return 'warning';
                      case 'qualified':
                      case 'discovery':
                        return 'default';
                      case 'lead':
                        return 'secondary';
                      default:
                        return 'secondary';
                    }
                  };

                  const formatStage = (stage: string) => {
                    return stage
                      .split('_')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ');
                  };

                  const formatValue = (value: number | null) => {
                    if (!value) return 'N/A';
                    return new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(value);
                  };

                  return (
                    <div
                      key={opportunity.id}
                      className="flex items-start justify-between pb-4 border-b border-border last:border-0 cursor-pointer hover:bg-accent/50 -mx-2 px-2 py-2 rounded transition-colors"
                      onClick={() => navigate(`/clients/${opportunity.client_id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{opportunity.title || 'Untitled Opportunity'}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {clientName} • {formatValue(opportunity.value)}
                        </p>
                        {oppDate && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(oppDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={getStageVariant(opportunity.stage)}
                        className="ml-2 flex-shrink-0"
                      >
                        {formatStage(opportunity.stage || 'lead')}
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
