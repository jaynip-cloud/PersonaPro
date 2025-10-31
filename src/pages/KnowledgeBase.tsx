import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import {
  Building2,
  FileText,
  Users,
  Briefcase,
  Award,
  Plus,
  Edit,
  Trash2,
  Save,
  CheckCircle,
  Upload
} from 'lucide-react';

export const KnowledgeBase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'company' | 'services' | 'case-studies' | 'team'>('company');
  const [saved, setSaved] = useState(false);

  const [companyInfo, setCompanyInfo] = useState({
    name: 'TechSolutions Inc.',
    industry: 'Software & Technology',
    description: 'We provide enterprise software solutions and consulting services to help businesses transform digitally.',
    valueProposition: 'Accelerate digital transformation with AI-powered insights and proven methodologies.',
    founded: '2015',
    location: 'San Francisco, CA',
    size: '50-100 employees',
    website: 'https://techsolutions.com',
    mission: 'To empower businesses with cutting-edge technology solutions that drive measurable results.',
    vision: 'To be the leading provider of AI-powered business transformation services globally.'
  });

  const [services, setServices] = useState([
    {
      id: '1',
      name: 'AI Consulting',
      description: 'Strategic AI implementation and integration services',
      budgetRange: '$50,000 - $200,000',
      duration: '3-6 months',
      tags: ['AI', 'Strategy', 'Consulting']
    },
    {
      id: '2',
      name: 'Custom Development',
      description: 'Tailored software solutions built to your specifications',
      budgetRange: '$100,000 - $500,000',
      duration: '6-12 months',
      tags: ['Development', 'Custom', 'Enterprise']
    }
  ]);

  const [caseStudies, setCaseStudies] = useState([
    {
      id: '1',
      title: 'Fortune 500 Digital Transformation',
      client: 'Global Retail Corp',
      industry: 'Retail',
      results: ['40% increase in operational efficiency', 'Reduced costs by $2M annually', '99.9% system uptime'],
      services: ['AI Consulting', 'Custom Development'],
      duration: '12 months'
    },
    {
      id: '2',
      title: 'Healthcare AI Implementation',
      client: 'MediCare Systems',
      industry: 'Healthcare',
      results: ['50% faster patient processing', 'Improved accuracy by 35%', 'Enhanced patient satisfaction'],
      services: ['AI Integration', 'Data Analytics'],
      duration: '8 months'
    }
  ]);

  const [teamMembers, setTeamMembers] = useState([
    {
      id: '1',
      name: 'Sarah Johnson',
      role: 'CEO & Founder',
      specialization: 'AI Strategy, Business Development',
      experience: '15 years'
    },
    {
      id: '2',
      name: 'Michael Chen',
      role: 'CTO',
      specialization: 'Machine Learning, System Architecture',
      experience: '12 years'
    },
    {
      id: '3',
      name: 'Emily Rodriguez',
      role: 'Head of Consulting',
      specialization: 'Digital Transformation, Process Optimization',
      experience: '10 years'
    }
  ]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'company', label: 'Company Profile', icon: Building2 },
    { id: 'services', label: 'Services', icon: Briefcase },
    { id: 'case-studies', label: 'Case Studies', icon: Award },
    { id: 'team', label: 'Team', icon: Users }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Knowledge Base</h1>
          <p className="text-muted-foreground mt-2">
            Manage your company information, services, case studies, and team
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'company' && (
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Company Name
                  </label>
                  <Input
                    type="text"
                    value={companyInfo.name}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Industry
                  </label>
                  <Input
                    type="text"
                    value={companyInfo.industry}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, industry: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Founded
                  </label>
                  <Input
                    type="text"
                    value={companyInfo.founded}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, founded: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Location
                  </label>
                  <Input
                    type="text"
                    value={companyInfo.location}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, location: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Company Size
                  </label>
                  <Input
                    type="text"
                    value={companyInfo.size}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, size: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Website
                  </label>
                  <Input
                    type="url"
                    value={companyInfo.website}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, website: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Company Description
                </label>
                <textarea
                  className="w-full min-h-[100px] p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  value={companyInfo.description}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Value Proposition
                </label>
                <textarea
                  className="w-full min-h-[80px] p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  value={companyInfo.valueProposition}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, valueProposition: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Mission Statement
                </label>
                <textarea
                  className="w-full min-h-[80px] p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  value={companyInfo.mission}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, mission: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Vision Statement
                </label>
                <textarea
                  className="w-full min-h-[80px] p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  value={companyInfo.vision}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, vision: e.target.value })}
                />
              </div>

              <Button variant="primary" onClick={handleSave} disabled={saved}>
                {saved ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Company Profile
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {services.map((service) => (
              <Card key={service.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {service.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {service.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {service.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-6 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Budget:</span> {service.budgetRange}
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span> {service.duration}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'case-studies' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Case Study
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {caseStudies.map((study) => (
              <Card key={study.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {study.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {study.client} • {study.industry}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-foreground mb-2">Results:</h4>
                    <ul className="space-y-1">
                      {study.results.map((result, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          {result}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex flex-wrap gap-2">
                      {study.services.map((service, idx) => (
                        <Badge key={idx} variant="secondary">
                          {service}
                        </Badge>
                      ))}
                    </div>
                    <span className="text-muted-foreground">Duration: {study.duration}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamMembers.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {member.name}
                      </h3>
                      <p className="text-sm text-primary font-medium mb-2">
                        {member.role}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-foreground">Specialization:</span>
                      <p className="text-muted-foreground">{member.specialization}</p>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Experience:</span>
                      <span className="text-muted-foreground ml-2">{member.experience}</span>
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
