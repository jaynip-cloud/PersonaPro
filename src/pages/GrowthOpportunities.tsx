import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Plus, TrendingUp, Target, DollarSign, Users, Sparkles, ArrowUpRight } from 'lucide-react';

interface GrowthOpportunity {
  id: string;
  clientName: string;
  type: 'upsell' | 'cross-sell' | 'renewal' | 'expansion';
  title: string;
  description: string;
  estimatedValue: number;
  probability: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  aiGenerated: boolean;
  reasoning: string[];
  recommendedActions: string[];
  createdAt: string;
}

export const GrowthOpportunities: React.FC = () => {
  const [opportunities] = useState<GrowthOpportunity[]>([
    {
      id: '1',
      clientName: 'TechCorp Solutions',
      type: 'upsell',
      title: 'Enterprise Support Package',
      description: 'Based on recent scaling needs and increased user load, recommend upgrading to enterprise support tier.',
      estimatedValue: 15000,
      probability: 85,
      priority: 'high',
      aiGenerated: true,
      reasoning: [
        'Client mentioned scaling challenges in last meeting',
        'Traffic increased 300% in last quarter',
        'Support ticket volume up 45%'
      ],
      recommendedActions: [
        'Schedule a call to discuss scaling needs',
        'Prepare custom enterprise support proposal',
        'Highlight dedicated support engineer benefits'
      ],
      createdAt: '2025-10-28'
    },
    {
      id: '2',
      clientName: 'Global Finance Partners',
      type: 'cross-sell',
      title: 'Mobile App Development',
      description: 'Client has expressed interest in mobile-first strategy. Strong fit for our mobile development services.',
      estimatedValue: 85000,
      probability: 65,
      priority: 'high',
      aiGenerated: true,
      reasoning: [
        'CEO mentioned mobile strategy in Q3 roadmap',
        'Customer requests for mobile access increasing',
        'Competitor analysis shows mobile gap'
      ],
      recommendedActions: [
        'Share case studies of similar mobile projects',
        'Propose mobile app MVP roadmap',
        'Offer mobile UX audit for current platform'
      ],
      createdAt: '2025-10-25'
    },
    {
      id: '3',
      clientName: 'Healthcare Innovations Inc',
      type: 'expansion',
      title: 'Multi-Region Deployment',
      description: 'Client expanding to EU market. Opportunity for localization and compliance services.',
      estimatedValue: 45000,
      probability: 70,
      priority: 'medium',
      aiGenerated: true,
      reasoning: [
        'Press release about EU expansion plans',
        'GDPR compliance needs identified',
        'Multi-language support requirements discussed'
      ],
      recommendedActions: [
        'Prepare GDPR compliance assessment',
        'Propose localization roadmap',
        'Connect with their legal team'
      ],
      createdAt: '2025-10-20'
    },
    {
      id: '4',
      clientName: 'Retail Dynamics',
      type: 'upsell',
      title: 'Advanced Analytics Dashboard',
      description: 'Current basic analytics not meeting needs. High value opportunity for custom analytics platform.',
      estimatedValue: 35000,
      probability: 75,
      priority: 'medium',
      aiGenerated: true,
      reasoning: [
        'Requested custom reporting features 3 times',
        'Using third-party analytics tools',
        'Data-driven decision making is top priority'
      ],
      recommendedActions: [
        'Demo advanced analytics capabilities',
        'Create custom dashboard mockup',
        'Schedule workshop to define KPIs'
      ],
      createdAt: '2025-10-15'
    }
  ]);

  const getPriorityColor = (priority: GrowthOpportunity['priority']) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'primary';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getTypeColor = (type: GrowthOpportunity['type']) => {
    switch (type) {
      case 'upsell': return 'success';
      case 'cross-sell': return 'primary';
      case 'renewal': return 'warning';
      case 'expansion': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Growth Opportunities</h1>
          <p className="text-muted-foreground mt-2">AI-powered insights to expand client relationships</p>
        </div>
        <Button variant="primary">
          <Plus className="h-4 w-4 mr-2" />
          Add Opportunity
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Opportunities</p>
                <p className="text-3xl font-bold text-foreground mt-1">{opportunities.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Value</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  ${opportunities.reduce((sum, o) => sum + o.estimatedValue, 0).toLocaleString()}
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
                <p className="text-sm text-muted-foreground">Avg Probability</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {Math.round(opportunities.reduce((sum, o) => sum + o.probability, 0) / opportunities.length)}%
                </p>
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
                <p className="text-sm text-muted-foreground">AI Generated</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {opportunities.filter(o => o.aiGenerated).length}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {opportunities.map((opportunity) => (
          <Card key={opportunity.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-foreground">{opportunity.title}</h3>
                      <Badge variant={getTypeColor(opportunity.type)} className="capitalize">
                        {opportunity.type}
                      </Badge>
                      <Badge variant={getPriorityColor(opportunity.priority)} className="capitalize">
                        {opportunity.priority}
                      </Badge>
                      {opportunity.aiGenerated && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          AI Generated
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4" />
                      {opportunity.clientName}
                    </p>
                    <p className="text-foreground">{opportunity.description}</p>
                  </div>
                  <div className="text-right ml-6">
                    <p className="text-2xl font-bold text-foreground">${opportunity.estimatedValue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">Est. Value</p>
                    <div className="mt-3">
                      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10">
                        <ArrowUpRight className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">{opportunity.probability}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">AI Reasoning</h4>
                    <ul className="space-y-2">
                      {opportunity.reasoning.map((reason, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Recommended Actions</h4>
                    <ul className="space-y-2">
                      {opportunity.recommendedActions.map((action, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-green-600 mt-1">→</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="primary" size="sm">
                    Take Action
                  </Button>
                  <Button variant="outline" size="sm">
                    View Client Profile
                  </Button>
                  <Button variant="outline" size="sm">
                    Generate Pitch
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
