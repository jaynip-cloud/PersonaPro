import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Plus, Briefcase, Calendar, DollarSign, TrendingUp, Users, CheckCircle, Clock } from 'lucide-react';

interface Project {
  id: string;
  clientName: string;
  title: string;
  status: 'planning' | 'in-progress' | 'completed' | 'on-hold';
  budget: number;
  startDate: string;
  endDate: string;
  progress: number;
  services: string[];
}

export const Projects: React.FC = () => {
  const [projects] = useState<Project[]>([
    {
      id: '1',
      clientName: 'TechCorp Solutions',
      title: 'Website Redesign & Development',
      status: 'in-progress',
      budget: 45000,
      startDate: '2025-10-01',
      endDate: '2025-12-15',
      progress: 65,
      services: ['Web Development', 'UI/UX Design']
    },
    {
      id: '2',
      clientName: 'Global Finance Partners',
      title: 'SaaS Platform Development',
      status: 'in-progress',
      budget: 125000,
      startDate: '2025-09-15',
      endDate: '2026-03-30',
      progress: 35,
      services: ['SaaS Development', 'Cloud Infrastructure']
    },
    {
      id: '3',
      clientName: 'Retail Dynamics',
      title: 'Ecommerce Platform',
      status: 'planning',
      budget: 75000,
      startDate: '2025-11-15',
      endDate: '2026-02-28',
      progress: 10,
      services: ['Ecommerce Development', 'Payment Integration']
    }
  ]);

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'in-progress': return 'primary';
      case 'completed': return 'success';
      case 'planning': return 'warning';
      case 'on-hold': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-2">Track and manage ongoing client projects</p>
        </div>
        <Button variant="primary">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Projects</p>
                <p className="text-3xl font-bold text-foreground mt-1">{projects.filter(p => p.status === 'in-progress').length}</p>
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
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  ${projects.reduce((sum, p) => sum + p.budget, 0).toLocaleString()}
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
                <p className="text-3xl font-bold text-foreground mt-1">
                  {Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)}%
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {projects.map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-foreground">{project.title}</h3>
                      <Badge variant={getStatusColor(project.status)} className="capitalize">
                        {project.status.replace('-', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {project.clientName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">${project.budget.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">Budget</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>End: {new Date(project.endDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Progress</span>
                    <span className="text-sm font-semibold text-primary">{project.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-chart-2 rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {project.services.map((service, index) => (
                    <Badge key={index} variant="outline">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
