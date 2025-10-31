import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ServiceCard } from '../components/company/ServiceCard';
import { CaseStudyCard } from '../components/company/CaseStudyCard';
import { CompanyProfileForm } from '../components/company/CompanyProfileForm';
import { MatchResults } from '../components/company/MatchResults';
import { CompanyProfile, CompanyService, CaseStudy, ClientMatch } from '../types';
import { mockClients } from '../data/mockData';
import { runMatchEngine } from '../utils/matchEngine';
import { Sparkles, Building2, Users, Briefcase, Target } from 'lucide-react';

const initialProfile: CompanyProfile = {
  id: '1',
  name: 'TechSolutions Inc.',
  description: 'We are a leading technology consulting firm specializing in digital transformation, cloud migration, and enterprise software development. With over 15 years of experience, we help businesses modernize their infrastructure and accelerate growth.',
  valueProposition: 'We deliver enterprise-grade solutions with startup agility. Our unique blend of technical expertise and business acumen enables us to transform complex challenges into scalable, efficient systems that drive measurable ROI.',
  team: [
    { name: 'John Williams', role: 'CSM Lead', specialization: 'Enterprise Accounts' },
    { name: 'Sarah Johnson', role: 'Technical Director', specialization: 'Cloud Architecture' },
    { name: 'Michael Chen', role: 'Senior Consultant', specialization: 'AI/ML Solutions' },
    { name: 'Emily Rodriguez', role: 'Account Manager', specialization: 'Client Success' }
  ],
  services: [
    {
      id: 's1',
      name: 'Platform Migration & Modernization',
      description: 'End-to-end migration of legacy systems to modern cloud-native architectures with zero downtime.',
      tags: ['cloud', 'migration', 'technical', 'infrastructure'],
      budgetRange: { min: 75000, max: 200000 },
      proofUrls: [
        'https://example.com/case-study-1',
        'https://example.com/case-study-2'
      ],
      caseStudyIds: ['cs1']
    },
    {
      id: 's2',
      name: 'API Development & Integration',
      description: 'Custom RESTful API development and third-party integration services for seamless data flow.',
      tags: ['api', 'integration', 'development', 'technical'],
      budgetRange: { min: 40000, max: 120000 },
      proofUrls: [
        'https://example.com/case-study-3'
      ],
      caseStudyIds: ['cs2']
    },
    {
      id: 's3',
      name: 'ML & AI Solutions',
      description: 'Machine learning model development and deployment for predictive analytics and automation.',
      tags: ['ml', 'ai', 'data', 'technical', 'high-value'],
      budgetRange: { min: 100000, max: 300000 },
      proofUrls: [
        'https://example.com/case-study-4'
      ],
      caseStudyIds: ['cs3']
    }
  ],
  caseStudies: [
    {
      id: 'cs1',
      title: 'Global E-commerce Platform Migration',
      client: 'RetailCorp',
      industry: 'Retail',
      thumbnail: '',
      services: ['Cloud Migration', 'Infrastructure'],
      results: [
        'Migrated 50TB of data with zero downtime',
        'Reduced infrastructure costs by 45%',
        'Improved application performance by 3x',
        'Achieved 99.99% uptime SLA'
      ],
      metrics: [
        { label: 'Cost Savings', value: '45%' },
        { label: 'Performance Gain', value: '3x' },
        { label: 'Migration Time', value: '8 weeks' },
        { label: 'Uptime', value: '99.99%' }
      ],
      description: 'Successfully migrated a legacy monolithic e-commerce platform to a modern microservices architecture on AWS, serving 10M+ monthly users.'
    },
    {
      id: 'cs2',
      title: 'Real-time Payment Integration System',
      client: 'FinTech Global',
      industry: 'Finance',
      thumbnail: '',
      services: ['API Development', 'Integration'],
      results: [
        'Built scalable API handling 10K req/sec',
        'Integrated with 15+ payment providers',
        'Reduced transaction processing time by 60%',
        'Achieved PCI-DSS compliance'
      ],
      metrics: [
        { label: 'API Throughput', value: '10K/sec' },
        { label: 'Processing Speed', value: '-60%' },
        { label: 'Integrations', value: '15+' },
        { label: 'Uptime', value: '99.95%' }
      ],
      description: 'Developed a robust API platform connecting multiple payment gateways with real-time transaction processing and fraud detection.'
    },
    {
      id: 'cs3',
      title: 'Predictive Maintenance AI Engine',
      client: 'ManufactureTech',
      industry: 'Manufacturing',
      thumbnail: '',
      services: ['Machine Learning', 'AI Solutions'],
      results: [
        'Reduced equipment downtime by 70%',
        'Predicted failures 2 weeks in advance',
        'Saved $2M annually in maintenance costs',
        'Improved production efficiency by 35%'
      ],
      metrics: [
        { label: 'Downtime Reduction', value: '70%' },
        { label: 'Prediction Accuracy', value: '94%' },
        { label: 'Cost Savings', value: '$2M/yr' },
        { label: 'Efficiency Gain', value: '35%' }
      ],
      description: 'Implemented an AI-powered predictive maintenance system using IoT sensor data and machine learning to prevent equipment failures.'
    }
  ]
};

export const CompanyIntelligence: React.FC = () => {
  const [profile, setProfile] = useState<CompanyProfile>(initialProfile);
  const [selectedService, setSelectedService] = useState<CompanyService | null>(null);
  const [matches, setMatches] = useState<ClientMatch[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'services' | 'cases' | 'matches'>('profile');

  const handleRunMatch = (service: CompanyService) => {
    setSelectedService(service);
    setIsRunning(true);

    setTimeout(() => {
      const results = runMatchEngine(mockClients, service);
      setMatches(results);
      setIsRunning(false);
      setActiveTab('matches');
    }, 2000);
  };

  const handlePromoteToOpportunity = (clientId: string, serviceName: string) => {
    console.log(`Promoting client ${clientId} for service: ${serviceName}`);
  };

  const tabs = [
    { id: 'profile', label: 'Company Profile', icon: Building2 },
    { id: 'services', label: 'Service Catalog', icon: Briefcase },
    { id: 'cases', label: 'Case Studies', icon: Target },
    { id: 'matches', label: 'AI Matches', icon: Sparkles, badge: matches.length > 0 ? matches.length : undefined }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Company Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Manage your company profile and discover high-fit client matches
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
                {tab.badge && (
                  <Badge variant="primary" className="ml-1">
                    {tab.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'profile' && (
        <div>
          <CompanyProfileForm profile={profile} onUpdate={setProfile} />
        </div>
      )}

      {activeTab === 'services' && (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">Service Catalog</h2>
            <p className="text-muted-foreground">
              Define your services and run AI matching to find ideal clients
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profile.services.map((service) => (
              <div key={service.id} className="relative">
                <ServiceCard service={service} />
                <div className="mt-3">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => handleRunMatch(service)}
                    disabled={isRunning}
                  >
                    {isRunning && selectedService?.id === service.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Running AI Match...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Run AI Match
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'cases' && (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">Case Studies</h2>
            <p className="text-muted-foreground">
              Showcase your success stories and proven results
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profile.caseStudies.map((caseStudy) => (
              <CaseStudyCard key={caseStudy.id} caseStudy={caseStudy} />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'matches' && (
        <div>
          {isRunning ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Running AI Match Engine...
                </h3>
                <p className="text-sm text-muted-foreground">
                  Analyzing client profiles and scoring compatibility
                </p>
              </CardContent>
            </Card>
          ) : (
            <MatchResults
              matches={matches}
              onPromoteToOpportunity={handlePromoteToOpportunity}
            />
          )}
        </div>
      )}
    </div>
  );
};
