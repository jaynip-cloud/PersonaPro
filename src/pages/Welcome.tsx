import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import {
  Sparkles,
  Users,
  TrendingUp,
  FileText,
  Zap,
  Target,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

export const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { organization } = useAuth();

  const features = [
    {
      icon: Users,
      title: 'Client Management',
      description: 'Centralize all client information and track engagement in one place',
      action: () => navigate('/clients'),
      buttonText: 'View Clients',
    },
    {
      icon: TrendingUp,
      title: 'Growth Opportunities',
      description: 'AI-powered insights to identify upsell and cross-sell opportunities',
      action: () => navigate('/growth-opportunities'),
      buttonText: 'Explore Opportunities',
    },
    {
      icon: Target,
      title: 'Smart Matching',
      description: 'Automatically match your services with client needs',
      action: () => navigate('/dashboard'),
      buttonText: 'See Matches',
    },
    {
      icon: FileText,
      title: 'Pitch Generator',
      description: 'Create personalized, data-driven pitches in seconds',
      action: () => navigate('/pitch-generator'),
      buttonText: 'Generate Pitch',
    },
  ];

  const quickActions = [
    {
      icon: Users,
      title: 'Add Your First Client',
      description: 'Import or manually add client information',
      color: 'bg-blue-500',
      action: () => navigate('/clients/new'),
    },
    {
      icon: Zap,
      title: 'Connect Data Sources',
      description: 'Integrate with CRM, accounting, and other tools',
      color: 'bg-green-500',
      action: () => navigate('/knowledge-base'),
    },
    {
      icon: BarChart3,
      title: 'View Dashboard',
      description: 'See your client intelligence overview',
      color: 'bg-purple-500',
      action: () => navigate('/dashboard'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Welcome to {organization?.name || 'Your Platform'}!
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your intelligent client platform is ready. Let's help you grow your business with
            AI-powered insights.
          </p>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Get Started with Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card
                  key={action.title}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={action.action}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className={`${action.color} p-4 rounded-xl`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">{action.title}</h3>
                        <p className="text-sm text-muted-foreground">{action.description}</p>
                      </div>
                      <Button variant="outline" className="w-full">
                        Get Started
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            What You Can Do
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {feature.description}
                        </p>
                        <Button variant="ghost" size="sm" onClick={feature.action}>
                          {feature.buttonText}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="mt-12 text-center">
          <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <CardContent className="pt-6">
              <h3 className="text-2xl font-bold mb-2">Need Help Getting Started?</h3>
              <p className="text-blue-100 mb-6">
                Check out our quick start guide or contact support for personalized assistance.
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  variant="outline"
                  className="bg-white text-blue-600 hover:bg-blue-50 border-0"
                  onClick={() => navigate('/clients/new')}
                >
                  Add First Client
                </Button>
                <Button
                  variant="outline"
                  className="bg-transparent border-white text-white hover:bg-white/10"
                  onClick={() => navigate('/dashboard')}
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
