import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Users, TrendingUp, AlertCircle, CheckCircle, Plus, Sparkles } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clients, recommendations, agentRuns } = useApp();
  const { user, organization } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (searchParams.get('welcome') === 'true') {
      setShowWelcome(true);
    }
  }, [searchParams]);

  const activeClients = clients.filter(c => c.status === 'active').length;
  const highPriorityRecs = recommendations.filter(r => r.priority === 'high' || r.priority === 'critical').length;
  const completedRuns = agentRuns.filter(r => r.status === 'completed').length;

  return (
    <div className="space-y-6">
      {showWelcome && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Welcome to {organization?.name || 'Your Dashboard'}!
                </h2>
                <p className="text-muted-foreground mb-4">
                  Your company knowledge base is set up. Start adding clients to unlock AI-powered
                  intelligence and personalized recommendations.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    onClick={() => navigate('/clients/new')}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Your First Client
                  </Button>
                  <Button variant="outline" onClick={() => setShowWelcome(false)}>
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome back! Here's your AI-powered intelligence overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Clients</p>
                <p className="text-3xl font-bold mt-2">{activeClients}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                <p className="text-3xl font-bold mt-2">{clients.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-chart-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Priority Actions</p>
                <p className="text-3xl font-bold mt-2">{highPriorityRecs}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">AI Analyses Complete</p>
                <p className="text-3xl font-bold mt-2">{completedRuns}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-chart-2" />
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
                <div key={rec.id} className="flex items-start gap-3 pb-4 border-b border-border last:border-0">
                  <Badge
                    variant={
                      rec.priority === 'critical' ? 'destructive' :
                      rec.priority === 'high' ? 'warning' :
                      'default'
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
            <CardTitle>Top Clients by Persona Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clients
                .sort((a, b) => b.personaScore - a.personaScore)
                .slice(0, 5)
                .map((client) => (
                  <div key={client.id} className="flex items-center justify-between pb-4 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium text-sm">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.company}</p>
                    </div>
                    <Badge variant={client.personaScore >= 90 ? 'success' : 'default'}>
                      {client.personaScore}
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
