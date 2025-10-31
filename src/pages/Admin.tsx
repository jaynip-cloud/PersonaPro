import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Users, Briefcase, FileText, Plus, Edit, Trash2, Save } from 'lucide-react';

interface CSMUser {
  id: string;
  name: string;
  email: string;
  specialization: string;
  clientCount: number;
  status: 'active' | 'inactive';
}

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  description: string;
  budgetRange: string;
}

interface CaseStudyItem {
  id: string;
  title: string;
  client: string;
  industry: string;
  result: string;
  featured: boolean;
}

export const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'csm' | 'services' | 'cases'>('csm');

  const [csmUsers, setCSMUsers] = useState<CSMUser[]>([
    { id: '1', name: 'John Williams', email: 'john@example.com', specialization: 'Enterprise', clientCount: 12, status: 'active' },
    { id: '2', name: 'Sarah Johnson', email: 'sarah@example.com', specialization: 'SMB', clientCount: 8, status: 'active' },
    { id: '3', name: 'Michael Chen', email: 'michael@example.com', specialization: 'Technical', clientCount: 15, status: 'active' }
  ]);

  const [services, setServices] = useState<ServiceItem[]>([
    { id: '1', name: 'Platform Migration', category: 'Infrastructure', description: 'End-to-end migration services', budgetRange: '$75K-$200K' },
    { id: '2', name: 'API Development', category: 'Development', description: 'Custom API solutions', budgetRange: '$40K-$120K' },
    { id: '3', name: 'ML Integration', category: 'AI/ML', description: 'Machine learning implementation', budgetRange: '$100K-$300K' }
  ]);

  const [caseStudies, setCaseStudies] = useState<CaseStudyItem[]>([
    { id: '1', title: 'E-commerce Platform Migration', client: 'RetailCorp', industry: 'Retail', result: '45% cost reduction', featured: true },
    { id: '2', title: 'Payment Integration System', client: 'FinTech Global', industry: 'Finance', result: '10K req/sec throughput', featured: true },
    { id: '3', title: 'Predictive Maintenance AI', client: 'ManufactureTech', industry: 'Manufacturing', result: '70% downtime reduction', featured: false }
  ]);

  const [editingCSM, setEditingCSM] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [editingCase, setEditingCase] = useState<string | null>(null);

  const tabs = [
    { id: 'csm', label: 'CSM Users', icon: Users },
    { id: 'services', label: 'Service Catalog', icon: Briefcase },
    { id: 'cases', label: 'Case Studies', icon: FileText }
  ];

  const handleDeleteCSM = (id: string) => {
    if (confirm('Are you sure you want to remove this CSM user?')) {
      setCSMUsers(csmUsers.filter(u => u.id !== id));
    }
  };

  const handleDeleteService = (id: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      setServices(services.filter(s => s.id !== id));
    }
  };

  const handleDeleteCase = (id: string) => {
    if (confirm('Are you sure you want to delete this case study?')) {
      setCaseStudies(caseStudies.filter(c => c.id !== id));
    }
  };

  const toggleCaseFeatured = (id: string) => {
    setCaseStudies(caseStudies.map(c =>
      c.id === id ? { ...c, featured: !c.featured } : c
    ));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">
            Manage users, services, and content
          </p>
        </div>
      </div>

      <div className="border-b border-border">
        <div className="flex gap-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-4 pt-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'csm' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-foreground">CSM Team Members</h2>
            <Button variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              Add CSM User
            </Button>
          </div>

          <div className="space-y-4">
            {csmUsers.map(user => (
              <Card key={user.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">{user.name}</h3>
                        <Badge variant={user.status === 'active' ? 'success' : 'secondary'}>
                          {user.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{user.email}</p>
                      <div className="flex gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Specialization: <span className="font-medium text-foreground">{user.specialization}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Clients: <span className="font-medium text-foreground">{user.clientCount}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteCSM(user.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'services' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-foreground">Service Catalog</h2>
            <Button variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>

          <div className="space-y-4">
            {services.map(service => (
              <Card key={service.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">{service.name}</h3>
                        <Badge variant="secondary">{service.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                      <p className="text-sm font-medium text-foreground">
                        Budget Range: {service.budgetRange}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteService(service.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'cases' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-foreground">Case Studies</h2>
            <Button variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Case Study
            </Button>
          </div>

          <div className="space-y-4">
            {caseStudies.map(caseStudy => (
              <Card key={caseStudy.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">{caseStudy.title}</h3>
                        {caseStudy.featured && (
                          <Badge variant="primary">Featured</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {caseStudy.client} • {caseStudy.industry}
                      </p>
                      <p className="text-sm font-medium text-green-700">
                        Result: {caseStudy.result}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleCaseFeatured(caseStudy.id)}
                      >
                        {caseStudy.featured ? 'Unfeature' : 'Feature'}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteCase(caseStudy.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
