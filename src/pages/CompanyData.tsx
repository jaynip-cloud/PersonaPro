import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import {
  Building2,
  Briefcase,
  FileText,
  Users,
  Plus,
  Edit,
  Trash2,
  Save,
  CheckCircle
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';

interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  budgetRange: { min: number; max: number };
  tags: string[];
  deliverables: string[];
  timeline: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  specialization: string;
  bio: string;
}

interface CompanyInfo {
  name: string;
  description: string;
  valueProposition: string;
  founded: string;
  size: string;
  industries: string[];
  locations: string[];
}

export const CompanyData: React.FC = () => {
  const { showToast } = useToast();

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: 'TechSolutions Inc.',
    description:
      'We are a leading technology consulting firm specializing in digital transformation, cloud migration, and enterprise software development.',
    valueProposition:
      'We deliver enterprise-grade solutions with startup agility, combining technical expertise with business acumen to drive measurable ROI.',
    founded: '2010',
    size: '100-500 employees',
    industries: ['Technology', 'Finance', 'Healthcare', 'Retail'],
    locations: ['San Francisco, CA', 'New York, NY', 'Austin, TX']
  });

  const [services, setServices] = useState<Service[]>([
    {
      id: '1',
      name: 'Cloud Migration & Modernization',
      category: 'Infrastructure',
      description: 'End-to-end migration of legacy systems to modern cloud-native architectures',
      budgetRange: { min: 75000, max: 200000 },
      tags: ['AWS', 'Azure', 'GCP', 'Kubernetes', 'Docker'],
      deliverables: [
        'Migration strategy document',
        'Cloud architecture design',
        'Implementation and testing',
        'Post-migration support'
      ],
      timeline: '3-6 months'
    },
    {
      id: '2',
      name: 'API Development & Integration',
      category: 'Development',
      description: 'Custom RESTful API development and third-party system integration',
      budgetRange: { min: 40000, max: 120000 },
      tags: ['REST', 'GraphQL', 'Microservices', 'OAuth', 'Webhooks'],
      deliverables: [
        'API specification',
        'Implementation',
        'Documentation',
        'Integration testing'
      ],
      timeline: '2-4 months'
    }
  ]);

  const [team, setTeam] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'John Williams',
      role: 'CSM Lead',
      specialization: 'Enterprise Accounts',
      bio: '15+ years experience in client success and account management'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      role: 'Technical Director',
      specialization: 'Cloud Architecture',
      bio: 'Former AWS Solutions Architect with 10+ years of cloud experience'
    }
  ]);

  const [isEditingService, setIsEditingService] = useState<string | null>(null);
  const [isEditingTeam, setIsEditingTeam] = useState<string | null>(null);

  const handleSaveCompanyInfo = () => {
    showToast('success', 'Company information saved');
  };

  const handleDeleteService = (id: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      setServices(services.filter(s => s.id !== id));
      showToast('success', 'Service deleted');
    }
  };

  const handleDeleteTeamMember = (id: string) => {
    if (confirm('Are you sure you want to remove this team member?')) {
      setTeam(team.filter(t => t.id !== id));
      showToast('success', 'Team member removed');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Company Data Management</h1>
          <p className="text-muted-foreground mt-1">
            Feed AI with your company's services, team, and expertise
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Company Name
              </label>
              <Input
                value={companyInfo.name}
                onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description
              </label>
              <textarea
                value={companyInfo.description}
                onChange={(e) =>
                  setCompanyInfo({ ...companyInfo, description: e.target.value })
                }
                className="w-full min-h-[100px] border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Value Proposition
              </label>
              <textarea
                value={companyInfo.valueProposition}
                onChange={(e) =>
                  setCompanyInfo({ ...companyInfo, valueProposition: e.target.value })
                }
                className="w-full min-h-[100px] border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Founded
                </label>
                <Input
                  value={companyInfo.founded}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, founded: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Company Size
                </label>
                <select
                  value={companyInfo.size}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, size: e.target.value })}
                  className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>1-10 employees</option>
                  <option>11-50 employees</option>
                  <option>51-100 employees</option>
                  <option>100-500 employees</option>
                  <option>500+ employees</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Industries Served
                </label>
                <div className="flex flex-wrap gap-2">
                  {companyInfo.industries.map((industry, index) => (
                    <Badge key={index} variant="secondary">
                      {industry}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Button variant="primary" onClick={handleSaveCompanyInfo}>
              <Save className="h-4 w-4 mr-2" />
              Save Company Info
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Services & Offerings
            </CardTitle>
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services.map((service) => (
              <Card key={service.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">{service.name}</h3>
                        <Badge variant="secondary">{service.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{service.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Budget Range
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            ${service.budgetRange.min.toLocaleString()} - $
                            {service.budgetRange.max.toLocaleString()}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Timeline
                          </p>
                          <p className="text-sm font-semibold text-foreground">
                            {service.timeline}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Technologies & Tags
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {service.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Deliverables
                        </p>
                        <ul className="space-y-1">
                          {service.deliverables.map((deliverable, index) => (
                            <li key={index} className="text-sm text-foreground flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              {deliverable}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteService(service.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team & Expertise
            </CardTitle>
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {team.map((member) => (
              <div
                key={member.id}
                className="flex items-start justify-between p-4 border border-border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-foreground">{member.name}</h4>
                    <Badge variant="secondary">{member.role}</Badge>
                  </div>
                  <p className="text-sm font-medium text-primary mb-2">{member.specialization}</p>
                  <p className="text-sm text-muted-foreground">{member.bio}</p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTeamMember(member.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Company Documents & Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Upload company brochures, case studies, whitepapers, and other marketing materials
            </p>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Upload Documents
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
