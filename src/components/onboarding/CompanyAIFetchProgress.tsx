import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp, Building2, Users, Calendar, MapPin, Mail, Phone, Globe, Code, FileText } from 'lucide-react';

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

interface CompanyAIFetchProgressProps {
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
            <p className="text-sm text-muted-foreground">Fetching company data...</p>
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
            <div className="flex items-center gap-2 text-green-600 pb-2 border-b">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Complete</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {response.metadata.processingTime}ms
              </span>
            </div>

            <DataSection title="Company Information" defaultExpanded={true}>
              <DataField label="Company Name" value={data.companyName} icon={<Building2 className="h-4 w-4" />} />
              <DataField label="Industry" value={data.industry} />
              <DataField label="Description" value={data.description} />
              <DataField label="Value Proposition" value={data.valueProposition} />
              <DataField label="Founded" value={data.founded} icon={<Calendar className="h-4 w-4" />} />
              <DataField label="Company Size" value={data.size} icon={<Users className="h-4 w-4" />} />
              <DataField label="Location" value={data.location} icon={<MapPin className="h-4 w-4" />} />
              <DataField label="Mission" value={data.mission} />
              <DataField label="Vision" value={data.vision} />
            </DataSection>

            <DataSection title="Contact Information">
              <DataField label="Email" value={data.email} icon={<Mail className="h-4 w-4" />} />
              <DataField label="Phone" value={data.phone} icon={<Phone className="h-4 w-4" />} />
              <DataField label="Address" value={data.address} icon={<MapPin className="h-4 w-4" />} />
            </DataSection>

            <DataSection title="Social Media">
              <DataField label="LinkedIn" value={data.linkedinUrl} icon={<Globe className="h-4 w-4" />} />
              <DataField label="Twitter/X" value={data.twitterUrl} icon={<Globe className="h-4 w-4" />} />
              <DataField label="Facebook" value={data.facebookUrl} icon={<Globe className="h-4 w-4" />} />
              <DataField label="Instagram" value={data.instagramUrl} icon={<Globe className="h-4 w-4" />} />
              <DataField label="YouTube" value={data.youtubeUrl} icon={<Globe className="h-4 w-4" />} />
            </DataSection>

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

            {data.leadership && Array.isArray(data.leadership) && data.leadership.length > 0 && (
              <DataSection title={`Leadership (${data.leadership.length})`}>
                {data.leadership.slice(0, 3).map((leader: any, idx: number) => (
                  <div key={idx} className="py-1.5">
                    <div className="font-medium text-sm">{leader.name}</div>
                    <div className="text-xs text-muted-foreground">{leader.role}</div>
                  </div>
                ))}
                {data.leadership.length > 3 && (
                  <div className="text-xs text-muted-foreground pt-1">
                    +{data.leadership.length - 3} more members
                  </div>
                )}
              </DataSection>
            )}

            {data.blogs && Array.isArray(data.blogs) && data.blogs.length > 0 && (
              <DataSection title={`Blog Posts (${data.blogs.length})`}>
                {data.blogs.slice(0, 3).map((blog: any, idx: number) => (
                  <div key={idx} className="py-1.5">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{blog.title}</div>
                        {blog.date && (
                          <div className="text-xs text-muted-foreground mt-0.5">{blog.date}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {data.blogs.length > 3 && (
                  <div className="text-xs text-muted-foreground pt-1">
                    +{data.blogs.length - 3} more posts
                  </div>
                )}
              </DataSection>
            )}

            {data.technology?.stack && Array.isArray(data.technology.stack) && data.technology.stack.length > 0 && (
              <DataSection title={`Technology Stack (${data.technology.stack.length})`}>
                <div className="flex flex-wrap gap-2">
                  {data.technology.stack.slice(0, 10).map((tech: string, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs"
                    >
                      <Code className="h-3 w-3" />
                      <span>{tech}</span>
                    </span>
                  ))}
                  {data.technology.stack.length > 10 && (
                    <span className="text-xs text-muted-foreground">
                      +{data.technology.stack.length - 10} more
                    </span>
                  )}
                </div>
              </DataSection>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const CompanyAIFetchProgress: React.FC<CompanyAIFetchProgressProps> = ({
  perplexityResponse,
  openaiResponse,
}) => {
  const allComplete = perplexityResponse && !perplexityResponse.error && openaiResponse && !openaiResponse.error;
  
  return (
    <div className="space-y-6">
      {allComplete && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Both responses completed successfully
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResponseCard 
          title="Response 1 (Perplexity)" 
          response={perplexityResponse} 
          color="blue"
        />
        <ResponseCard 
          title="Response 2 (OpenAI)" 
          response={openaiResponse} 
          color="purple"
        />
      </div>
    </div>
  );
};

