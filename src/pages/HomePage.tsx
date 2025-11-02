import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Target,
  Calendar,
  ArrowRight,
  TrendingDown
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { clients, recommendations, agentRuns } = useApp();
  const navigate = useNavigate();
  const [forecastPeriod, setForecastPeriod] = useState<'month' | 'quarter' | 'year'>('quarter');

  const activeClients = clients.filter(c => c.status === 'active').length;
  const highPriorityRecs = recommendations.filter(
    r => r.priority === 'high' || r.priority === 'critical'
  ).length;
  const completedRuns = agentRuns.filter(r => r.status === 'completed').length;

  const forecastData = {
    month: { revenue: 245000, deals: 12, probability: 78 },
    quarter: { revenue: 680000, deals: 34, probability: 72 },
    year: { revenue: 2400000, deals: 120, probability: 68 }
  };

  const currentForecast = forecastData[forecastPeriod];

  const upcomingDeals = [
    { id: '1', client: 'TechCorp Solutions', value: 145000, closeDate: '2025-11-15', stage: 'Negotiation', probability: 85 },
    { id: '2', client: 'InnovateLabs', value: 98000, closeDate: '2025-11-22', stage: 'Proposal', probability: 65 },
    { id: '3', client: 'DataStream Inc', value: 210000, closeDate: '2025-12-01', stage: 'Qualified', probability: 55 },
    { id: '4', client: 'CloudFirst Co', value: 87000, closeDate: '2025-12-10', stage: 'Negotiation', probability: 80 }
  ];

  const pipelineMetrics = [
    { stage: 'Qualified', count: 15, value: 450000 },
    { stage: 'Proposal', count: 8, value: 320000 },
    { stage: 'Negotiation', count: 6, value: 540000 },
    { stage: 'Closing', count: 3, value: 280000 }
  ];

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Qualified': return 'bg-blue-100 text-blue-700';
      case 'Proposal': return 'bg-purple-100 text-purple-700';
      case 'Negotiation': return 'bg-yellow-100 text-yellow-700';
      case 'Closing': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard & Forecasts</h1>
        <p className="text-muted-foreground mt-2">
          AI-powered intelligence overview and revenue predictions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/clients')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Clients</p>
                <p className="text-3xl font-bold mt-2">{activeClients}</p>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +12% from last month
                </p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pipeline Value</p>
                <p className="text-3xl font-bold mt-2">$1.59M</p>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +8% this quarter
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Priority Actions</p>
                <p className="text-3xl font-bold mt-2">{highPriorityRecs}</p>
                <p className="text-xs text-muted-foreground mt-1">Require attention</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                <p className="text-3xl font-bold mt-2">68%</p>
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  -3% from target
                </p>
              </div>
              <Target className="h-8 w-8 text-chart-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Revenue Forecast</CardTitle>
            <div className="flex gap-2">
              {(['month', 'quarter', 'year'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setForecastPeriod(period)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors capitalize ${
                    forecastPeriod === period
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900 mb-2">Forecasted Revenue</p>
              <p className="text-3xl font-bold text-blue-900">
                ${(currentForecast.revenue / 1000).toFixed(0)}K
              </p>
              <p className="text-xs text-blue-700 mt-2">
                Based on {currentForecast.deals} expected deals
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-900 mb-2">Expected Deals</p>
              <p className="text-3xl font-bold text-green-900">{currentForecast.deals}</p>
              <p className="text-xs text-green-700 mt-2">
                Across all pipeline stages
              </p>
            </div>

            <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <p className="text-sm font-medium text-purple-900 mb-2">Confidence Level</p>
              <p className="text-3xl font-bold text-purple-900">{currentForecast.probability}%</p>
              <p className="text-xs text-purple-700 mt-2">
                AI-calculated probability
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="p-4 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{deal.client}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3" />
                        Close: {new Date(deal.closeDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        ${(deal.value / 1000).toFixed(0)}K
                      </p>
                      <p className="text-xs text-muted-foreground">{deal.probability}% likely</p>
                    </div>
                  </div>
                  <Badge className={getStageColor(deal.stage)}>{deal.stage}</Badge>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/clients')}>
              View All Opportunities
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pipelineMetrics.map((metric, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge className={getStageColor(metric.stage)}>{metric.stage}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {metric.count} deals
                      </span>
                    </div>
                    <span className="font-semibold text-foreground">
                      ${(metric.value / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(metric.value / 540000) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.slice(0, 5).map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-start gap-3 pb-4 border-b border-border last:border-0"
                >
                  <Badge
                    variant={
                      rec.priority === 'critical'
                        ? 'destructive'
                        : rec.priority === 'high'
                        ? 'warning'
                        : 'default'
                    }
                  >
                    {rec.priority}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{rec.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Analysis Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agentRuns.slice(0, 5).map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between pb-4 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        run.status === 'completed'
                          ? 'bg-green-500'
                          : run.status === 'running'
                          ? 'bg-blue-500 animate-pulse'
                          : run.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-gray-400'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {run.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(run.startedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      run.status === 'completed'
                        ? 'success'
                        : run.status === 'failed'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {run.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
