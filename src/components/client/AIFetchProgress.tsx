import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp, ExternalLink, Mail, Phone, MapPin, Building2, Users, Calendar, Target, TrendingUp, Code, Globe, FileText } from 'lucide-react';

interface AIResponse {
  model: 'perplexity' | 'openai';
  data: any;
  metadata: {
    completenessScore: number;
    processingTime: number;
    timestamp: string;
  };
  error?: string;
}

interface AIFetchProgressProps {
  perplexityResponse: AIResponse | null;
  openaiResponse: AIResponse | null;
}

const DataField: React.FC<{ label: string; value: string | null | undefined; icon?: React.ReactNode }> = ({ label, value, icon }) => {
  if (!value || value.trim() === '') return null;
  return (
    <div className="flex items-start gap-2 py-1.5">
      {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-muted-foreground">{label}:</span>
        <span className="text-sm ml-2 break-words">{value}</span>
      </div>
    </div>
  );
};

const DataSection: React.FC<{ title: string; children: React.ReactNode; defaultExpanded?: boolean }> = ({ title, children, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className="border rounded-lg p-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left font-semibold text-sm mb-2 hover:text-primary transition-colors"
      >
        <span>{title}</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && <div className="space-y-1 text-sm">{children}</div>}
    </div>
  );
};

const ResponseCard: React.FC<{ 
  title: string; 
  response: AIResponse | null; 
  color: 'blue' | 'purple';
}> = ({ title, response, color }) => {
  const data = response?.data;
  const isLoading = !response;
  const hasError = response?.error;
  const isComplete = response && !hasError;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {isComplete && (
            <div className="flex items-center gap-2 text-sm">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                color === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
              }`}>
                {response.metadata.completenessScore}% complete
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Fetching...</p>
          </div>
        )}

        {hasError && (
          <div className="text-red-600 text-center py-8">
            <XCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">{response.error}</p>
          </div>
        )}

        {isComplete && data && (
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center gap-2 text-green-600 pb-2 border-b">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Complete</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {response.metadata.processingTime}ms
              </span>
            </div>

            {/* Company Information */}
            <DataSection title="Company Information" defaultExpanded={true}>
              <DataField label="Company" value={data.company} icon={<Building2 className="h-4 w-4" />} />
              <DataField label="Industry" value={data.industry} />
              <DataField label="Description" value={data.description} />
              <DataField label="Founded" value={data.founded} icon={<Calendar className="h-4 w-4" />} />
              <DataField label="Company Size" value={data.companySize} icon={<Users className="h-4 w-4" />} />
              <DataField label="Employees" value={data.employeeCount} />
              <DataField label="Revenue" value={data.annualRevenue} icon={<TrendingUp className="h-4 w-4" />} />
            </DataSection>

            {/* Location */}
            <DataSection title="Location">
              <DataField label="City" value={data.city} icon={<MapPin className="h-4 w-4" />} />
              <DataField label="Country" value={data.country} />
              <DataField label="ZIP Code" value={data.zipCode} />
            </DataSection>

            {/* Contact Information */}
            <DataSection title="Contact Information">
              <DataField label="Contact Name" value={data.contactName} />
              <DataField label="Job Title" value={data.jobTitle} />
              <DataField label="Email" value={data.primaryEmail} icon={<Mail className="h-4 w-4" />} />
              <DataField label="Phone" value={data.primaryPhone} icon={<Phone className="h-4 w-4" />} />
            </DataSection>

            {/* Social Media */}
            <DataSection title="Social Media">
              <DataField label="LinkedIn" value={data.linkedinUrl} icon={<Globe className="h-4 w-4" />} />
              <DataField label="Twitter/X" value={data.twitterUrl} icon={<Globe className="h-4 w-4" />} />
              <DataField label="Facebook" value={data.facebookUrl} icon={<Globe className="h-4 w-4" />} />
              <DataField label="Instagram" value={data.instagramUrl} icon={<Globe className="h-4 w-4" />} />
            </DataSection>

            {/* Services */}
            {data.services && Array.isArray(data.services) && data.services.length > 0 && (
              <DataSection title={`Services (${data.services.length})`}>
                {data.services.map((service: any, idx: number) => (
                  <div key={idx} className="py-1.5 border-l-2 border-primary pl-2">
                    <div className="font-medium text-sm">{service.name}</div>
                    {service.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">{service.description}</div>
                    )}
                  </div>
                ))}
              </DataSection>
            )}

            {/* Technologies */}
            {data.technologies && Array.isArray(data.technologies) && data.technologies.length > 0 && (
              <DataSection title={`Technologies (${data.technologies.length})`}>
                <div className="flex flex-wrap gap-2">
                  {data.technologies.map((tech: any, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs"
                    >
                      <Code className="h-3 w-3" />
                      <span>{tech.name}</span>
                      {tech.category && (
                        <span className="text-muted-foreground">({tech.category})</span>
                      )}
                    </span>
                  ))}
                </div>
              </DataSection>
            )}

            {/* Blogs */}
            {data.blogs && Array.isArray(data.blogs) && data.blogs.length > 0 && (
              <DataSection title={`Blog Posts (${data.blogs.length})`}>
                {data.blogs.slice(0, 5).map((blog: any, idx: number) => (
                  <div key={idx} className="py-1.5">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <a
                          href={blog.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:text-primary flex items-center gap-1"
                        >
                          {blog.title}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        {blog.date && (
                          <div className="text-xs text-muted-foreground mt-0.5">{blog.date}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {data.blogs.length > 5 && (
                  <div className="text-xs text-muted-foreground pt-1">
                    +{data.blogs.length - 5} more posts
                  </div>
                )}
              </DataSection>
            )}

            {/* Competitors */}
            {data.competitors && Array.isArray(data.competitors) && data.competitors.length > 0 && (
              <DataSection title={`Competitors (${data.competitors.length})`}>
                {data.competitors.map((competitor: any, idx: number) => (
                  <div key={idx} className="py-1.5">
                    <div className="font-medium text-sm">{competitor.name}</div>
                    {competitor.comparison && (
                      <div className="text-xs text-muted-foreground mt-0.5">{competitor.comparison}</div>
                    )}
                  </div>
                ))}
              </DataSection>
            )}

            {/* Pain Points */}
            {data.painPoints && Array.isArray(data.painPoints) && data.painPoints.length > 0 && (
              <DataSection title={`Pain Points (${data.painPoints.length})`}>
                {data.painPoints.map((point: string, idx: number) => (
                  <div key={idx} className="text-sm py-1">• {point}</div>
                ))}
              </DataSection>
            )}

            {/* Goals */}
            <DataSection title="Goals">
              <DataField label="Short-term Goals" value={data.shortTermGoals} icon={<Target className="h-4 w-4" />} />
              <DataField label="Long-term Goals" value={data.longTermGoals} icon={<Target className="h-4 w-4" />} />
            </DataSection>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const AIFetchProgress: React.FC<AIFetchProgressProps> = ({
  perplexityResponse,
  openaiResponse,
}) => {
  const allComplete = perplexityResponse && !perplexityResponse.error && openaiResponse && !openaiResponse.error;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {allComplete ? 'Client Data Fetched' : 'Fetching Client Data...'}
        </h1>
        {allComplete && (
          <div className="text-sm text-muted-foreground">
            Both responses completed successfully
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResponseCard 
          title="Response 1" 
          response={perplexityResponse} 
          color="blue"
        />
        <ResponseCard 
          title="Response 2" 
          response={openaiResponse} 
          color="purple"
        />
      </div>
    </div>
  );
};

