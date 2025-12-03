import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CheckCircle2, XCircle, TrendingUp, RefreshCw, Star, AlertCircle, Lightbulb, ArrowRight, Building2, Users, Calendar, Target, Mail, Phone, MapPin, Globe, Code, FileText, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

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

interface ComparisonResult {
  recommendedModel: 'perplexity' | 'openai';
  score: { perplexity: number; openai: number };
  reasoning: string;
  strengths: { perplexity: string[]; openai: string[] };
  weaknesses: { perplexity: string[]; openai: string[] };
  completeness: { perplexity: number; openai: number };
  keyDifferences?: string[];
}

interface AIResponseComparisonProps {
  perplexityResponse: AIResponse | null;
  openaiResponse: AIResponse | null;
  comparison: ComparisonResult | null;
  onSelectResponse: (model: 'perplexity' | 'openai') => void;
  onRegenerate: () => void;
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

export const AIResponseComparison: React.FC<AIResponseComparisonProps> = ({
  perplexityResponse,
  openaiResponse,
  comparison,
  onSelectResponse,
  onRegenerate,
}) => {
  // Debug logging
  React.useEffect(() => {
    console.log('[AIResponseComparison] Component rendered', {
      hasComparison: !!comparison,
      comparison: comparison,
      perplexityResponse: !!perplexityResponse,
      openaiResponse: !!openaiResponse,
    });
  }, [comparison, perplexityResponse, openaiResponse]);

  const recommended = comparison?.recommendedModel;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Compare AI Responses</h1>
        <Button variant="outline" onClick={onRegenerate}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Regenerate
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response 1 - Full Data */}
        <Card className={recommended === 'perplexity' ? 'border-2 border-green-500 shadow-lg' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                Response 1
                {comparison && (
                  <Badge variant="outline" className="ml-2">
                    {comparison.score.perplexity}/100
                  </Badge>
                )}
                {recommended === 'perplexity' && (
                  <Badge variant="default" className="bg-green-500 text-white flex items-center gap-1 ml-2">
                    <Star className="h-3 w-3 fill-white" />
                    Recommended
                  </Badge>
                )}
              </CardTitle>
              {perplexityResponse && !perplexityResponse.error && (
                <div className="text-sm text-muted-foreground">
                  {perplexityResponse.metadata.completenessScore}% complete
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {perplexityResponse?.data ? (
              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center gap-2 text-green-600 pb-2 border-b">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Complete</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {perplexityResponse.metadata.processingTime}ms
                  </span>
                </div>

                {/* Company Information */}
                <DataSection title="Company Information" defaultExpanded={true}>
                  <DataField label="Company" value={perplexityResponse.data.company} icon={<Building2 className="h-4 w-4" />} />
                  <DataField label="Industry" value={perplexityResponse.data.industry} />
                  <DataField label="Description" value={perplexityResponse.data.description} />
                  <DataField label="Founded" value={perplexityResponse.data.founded} icon={<Calendar className="h-4 w-4" />} />
                  <DataField label="Company Size" value={perplexityResponse.data.companySize} icon={<Users className="h-4 w-4" />} />
                  <DataField label="Employees" value={perplexityResponse.data.employeeCount} />
                  <DataField label="Revenue" value={perplexityResponse.data.annualRevenue} icon={<TrendingUp className="h-4 w-4" />} />
                </DataSection>

                {/* Location */}
                <DataSection title="Location">
                  <DataField label="City" value={perplexityResponse.data.city} icon={<MapPin className="h-4 w-4" />} />
                  <DataField label="Country" value={perplexityResponse.data.country} />
                  <DataField label="ZIP Code" value={perplexityResponse.data.zipCode} />
                </DataSection>

                {/* Contact Information */}
                <DataSection title="Contact Information">
                  <DataField label="Contact Name" value={perplexityResponse.data.contactName} />
                  <DataField label="Job Title" value={perplexityResponse.data.jobTitle} />
                  <DataField label="Email" value={perplexityResponse.data.primaryEmail} icon={<Mail className="h-4 w-4" />} />
                  <DataField label="Phone" value={perplexityResponse.data.primaryPhone} icon={<Phone className="h-4 w-4" />} />
                </DataSection>

                {/* Social Media */}
                <DataSection title="Social Media">
                  <DataField label="LinkedIn" value={perplexityResponse.data.linkedinUrl} icon={<Globe className="h-4 w-4" />} />
                  <DataField label="Twitter/X" value={perplexityResponse.data.twitterUrl} icon={<Globe className="h-4 w-4" />} />
                  <DataField label="Facebook" value={perplexityResponse.data.facebookUrl} icon={<Globe className="h-4 w-4" />} />
                  <DataField label="Instagram" value={perplexityResponse.data.instagramUrl} icon={<Globe className="h-4 w-4" />} />
                </DataSection>

                {/* Services */}
                {perplexityResponse.data.services && Array.isArray(perplexityResponse.data.services) && perplexityResponse.data.services.length > 0 && (
                  <DataSection title={`Services (${perplexityResponse.data.services.length})`}>
                    {perplexityResponse.data.services.map((service: any, idx: number) => (
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
                {perplexityResponse.data.technologies && Array.isArray(perplexityResponse.data.technologies) && perplexityResponse.data.technologies.length > 0 && (
                  <DataSection title={`Technologies (${perplexityResponse.data.technologies.length})`}>
                    <div className="flex flex-wrap gap-2">
                      {perplexityResponse.data.technologies.map((tech: any, idx: number) => (
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
                {perplexityResponse.data.blogs && Array.isArray(perplexityResponse.data.blogs) && perplexityResponse.data.blogs.length > 0 && (
                  <DataSection title={`Blog Posts (${perplexityResponse.data.blogs.length})`}>
                    {perplexityResponse.data.blogs.slice(0, 5).map((blog: any, idx: number) => (
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
                    {perplexityResponse.data.blogs.length > 5 && (
                      <div className="text-xs text-muted-foreground pt-1">
                        +{perplexityResponse.data.blogs.length - 5} more posts
                      </div>
                    )}
                  </DataSection>
                )}

                {/* Competitors */}
                {perplexityResponse.data.competitors && Array.isArray(perplexityResponse.data.competitors) && perplexityResponse.data.competitors.length > 0 && (
                  <DataSection title={`Competitors (${perplexityResponse.data.competitors.length})`}>
                    {perplexityResponse.data.competitors.map((competitor: any, idx: number) => (
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
                {perplexityResponse.data.painPoints && Array.isArray(perplexityResponse.data.painPoints) && perplexityResponse.data.painPoints.length > 0 && (
                  <DataSection title={`Pain Points (${perplexityResponse.data.painPoints.length})`}>
                    {perplexityResponse.data.painPoints.map((point: string, idx: number) => (
                      <div key={idx} className="text-sm py-1">• {point}</div>
                    ))}
                  </DataSection>
                )}

                {/* Goals */}
                <DataSection title="Goals">
                  <DataField label="Short-term Goals" value={perplexityResponse.data.shortTermGoals} icon={<Target className="h-4 w-4" />} />
                  <DataField label="Long-term Goals" value={perplexityResponse.data.longTermGoals} icon={<Target className="h-4 w-4" />} />
                </DataSection>

                {/* Action Button */}
                <Button
                  variant={recommended === 'perplexity' ? 'primary' : 'outline'}
                  className="w-full mt-4"
                  onClick={() => onSelectResponse('perplexity')}
                >
                  {recommended === 'perplexity' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Use This Response
                    </>
                  ) : (
                    'I Prefer This Response'
                  )}
                </Button>
              </div>
            ) : perplexityResponse?.error ? (
              <div className="text-center py-8">
                <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <p className="text-red-600">{perplexityResponse.error}</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response 2 - Full Data */}
        <Card className={recommended === 'openai' ? 'border-2 border-green-500 shadow-lg' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                Response 2
                {comparison && (
                  <Badge variant="outline" className="ml-2">
                    {comparison.score.openai}/100
                  </Badge>
                )}
                {recommended === 'openai' && (
                  <Badge variant="default" className="bg-green-500 text-white flex items-center gap-1 ml-2">
                    <Star className="h-3 w-3 fill-white" />
                    Recommended
                  </Badge>
                )}
              </CardTitle>
              {openaiResponse && !openaiResponse.error && (
                <div className="text-sm text-muted-foreground">
                  {openaiResponse.metadata.completenessScore}% complete
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {openaiResponse?.data ? (
              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center gap-2 text-green-600 pb-2 border-b">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Complete</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {openaiResponse.metadata.processingTime}ms
                  </span>
                </div>

                {/* Company Information */}
                <DataSection title="Company Information" defaultExpanded={true}>
                  <DataField label="Company" value={openaiResponse.data.company} icon={<Building2 className="h-4 w-4" />} />
                  <DataField label="Industry" value={openaiResponse.data.industry} />
                  <DataField label="Description" value={openaiResponse.data.description} />
                  <DataField label="Founded" value={openaiResponse.data.founded} icon={<Calendar className="h-4 w-4" />} />
                  <DataField label="Company Size" value={openaiResponse.data.companySize} icon={<Users className="h-4 w-4" />} />
                  <DataField label="Employees" value={openaiResponse.data.employeeCount} />
                  <DataField label="Revenue" value={openaiResponse.data.annualRevenue} icon={<TrendingUp className="h-4 w-4" />} />
                </DataSection>

                {/* Location */}
                <DataSection title="Location">
                  <DataField label="City" value={openaiResponse.data.city} icon={<MapPin className="h-4 w-4" />} />
                  <DataField label="Country" value={openaiResponse.data.country} />
                  <DataField label="ZIP Code" value={openaiResponse.data.zipCode} />
                </DataSection>

                {/* Contact Information */}
                <DataSection title="Contact Information">
                  <DataField label="Contact Name" value={openaiResponse.data.contactName} />
                  <DataField label="Job Title" value={openaiResponse.data.jobTitle} />
                  <DataField label="Email" value={openaiResponse.data.primaryEmail} icon={<Mail className="h-4 w-4" />} />
                  <DataField label="Phone" value={openaiResponse.data.primaryPhone} icon={<Phone className="h-4 w-4" />} />
                </DataSection>

                {/* Social Media */}
                <DataSection title="Social Media">
                  <DataField label="LinkedIn" value={openaiResponse.data.linkedinUrl} icon={<Globe className="h-4 w-4" />} />
                  <DataField label="Twitter/X" value={openaiResponse.data.twitterUrl} icon={<Globe className="h-4 w-4" />} />
                  <DataField label="Facebook" value={openaiResponse.data.facebookUrl} icon={<Globe className="h-4 w-4" />} />
                  <DataField label="Instagram" value={openaiResponse.data.instagramUrl} icon={<Globe className="h-4 w-4" />} />
                </DataSection>

                {/* Services */}
                {openaiResponse.data.services && Array.isArray(openaiResponse.data.services) && openaiResponse.data.services.length > 0 && (
                  <DataSection title={`Services (${openaiResponse.data.services.length})`}>
                    {openaiResponse.data.services.map((service: any, idx: number) => (
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
                {openaiResponse.data.technologies && Array.isArray(openaiResponse.data.technologies) && openaiResponse.data.technologies.length > 0 && (
                  <DataSection title={`Technologies (${openaiResponse.data.technologies.length})`}>
                    <div className="flex flex-wrap gap-2">
                      {openaiResponse.data.technologies.map((tech: any, idx: number) => (
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
                {openaiResponse.data.blogs && Array.isArray(openaiResponse.data.blogs) && openaiResponse.data.blogs.length > 0 && (
                  <DataSection title={`Blog Posts (${openaiResponse.data.blogs.length})`}>
                    {openaiResponse.data.blogs.slice(0, 5).map((blog: any, idx: number) => (
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
                    {openaiResponse.data.blogs.length > 5 && (
                      <div className="text-xs text-muted-foreground pt-1">
                        +{openaiResponse.data.blogs.length - 5} more posts
                      </div>
                    )}
                  </DataSection>
                )}

                {/* Competitors */}
                {openaiResponse.data.competitors && Array.isArray(openaiResponse.data.competitors) && openaiResponse.data.competitors.length > 0 && (
                  <DataSection title={`Competitors (${openaiResponse.data.competitors.length})`}>
                    {openaiResponse.data.competitors.map((competitor: any, idx: number) => (
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
                {openaiResponse.data.painPoints && Array.isArray(openaiResponse.data.painPoints) && openaiResponse.data.painPoints.length > 0 && (
                  <DataSection title={`Pain Points (${openaiResponse.data.painPoints.length})`}>
                    {openaiResponse.data.painPoints.map((point: string, idx: number) => (
                      <div key={idx} className="text-sm py-1">• {point}</div>
                    ))}
                  </DataSection>
                )}

                {/* Goals */}
                <DataSection title="Goals">
                  <DataField label="Short-term Goals" value={openaiResponse.data.shortTermGoals} icon={<Target className="h-4 w-4" />} />
                  <DataField label="Long-term Goals" value={openaiResponse.data.longTermGoals} icon={<Target className="h-4 w-4" />} />
                </DataSection>

                {/* Action Button */}
                <Button
                  variant={recommended === 'openai' ? 'primary' : 'outline'}
                  className="w-full mt-4"
                  onClick={() => onSelectResponse('openai')}
                >
                  {recommended === 'openai' ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Use This Response
                    </>
                  ) : (
                    'I Prefer This Response'
                  )}
                </Button>
              </div>
            ) : openaiResponse?.error ? (
              <div className="text-center py-8">
                <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <p className="text-red-600">{openaiResponse.error}</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendation Card - Below Both Responses */}
      {comparison ? (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              AI Comparison Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* First Row: KPIs on Left, Reasoning on Right */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b">
              {/* Left Side: Two KPIs stacked */}
              <div className="space-y-3">
                <div className={`p-4 rounded-lg relative ${
                  recommended === 'perplexity' 
                    ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700' 
                    : 'bg-white dark:bg-gray-800'
                }`}>
                  {recommended === 'perplexity' && (
                    <div className="absolute -top-2 -right-2">
                      <Badge className="bg-green-500 text-white flex items-center gap-1">
                        <Star className="h-3 w-3 fill-white" />
                        Recommended
                      </Badge>
                    </div>
                  )}
                  <p className="text-sm font-medium text-muted-foreground mb-1">Response 1</p>
                  <p className="text-3xl font-bold text-blue-600 inline">{comparison.score.perplexity}</p>
                  <span className="text-sm text-muted-foreground ml-1">/100 points</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {comparison.completeness.perplexity}% complete
                  </p>
                </div>
                <div className={`p-4 rounded-lg relative ${
                  recommended === 'openai' 
                    ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700' 
                    : 'bg-white dark:bg-gray-800'
                }`}>
                  {recommended === 'openai' && (
                    <div className="absolute -top-2 -right-2">
                      <Badge className="bg-green-500 text-white flex items-center gap-1">
                        <Star className="h-3 w-3 fill-white" />
                        Recommended
                      </Badge>
                    </div>
                  )}
                  <p className="text-sm font-medium text-muted-foreground mb-1">Response 2</p>
                  <p className="text-3xl font-bold text-purple-600 inline">{comparison.score.openai}</p>
                  <span className="text-sm text-muted-foreground ml-1">/100 points</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {comparison.completeness.openai}% complete
                  </p>
                </div>
              </div>

              {/* Right Side: Reasoning */}
              <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                <div className="flex items-start gap-2 mb-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold mb-1">Why This Recommendation?</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{comparison.reasoning}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Strengths and Weaknesses Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              {comparison.strengths && (comparison.strengths.perplexity.length > 0 || comparison.strengths.openai.length > 0) && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="p-4 bg-white dark:bg-gray-800 border-b">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <span className="font-semibold">Strengths</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
                    {comparison.strengths.perplexity.length > 0 && (
                      <div>
                        <p className="font-medium text-sm mb-2 text-blue-600">Response 1:</p>
                        <ul className="space-y-1">
                          {comparison.strengths.perplexity.map((strength, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <ArrowRight className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {comparison.strengths.openai.length > 0 && (
                      <div>
                        <p className="font-medium text-sm mb-2 text-purple-600">Response 2:</p>
                        <ul className="space-y-1">
                          {comparison.strengths.openai.map((strength, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <ArrowRight className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Weaknesses */}
              {comparison.weaknesses && (comparison.weaknesses.perplexity.length > 0 || comparison.weaknesses.openai.length > 0) && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="p-4 bg-white dark:bg-gray-800 border-b">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      <span className="font-semibold">Weaknesses</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
                    {comparison.weaknesses.perplexity.length > 0 && (
                      <div>
                        <p className="font-medium text-sm mb-2 text-blue-600">Response 1:</p>
                        <ul className="space-y-1">
                          {comparison.weaknesses.perplexity.map((weakness, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <ArrowRight className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                              <span>{weakness}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {comparison.weaknesses.openai.length > 0 && (
                      <div>
                        <p className="font-medium text-sm mb-2 text-purple-600">Response 2:</p>
                        <ul className="space-y-1">
                          {comparison.weaknesses.openai.map((weakness, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <ArrowRight className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                              <span>{weakness}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Comparison analysis is being generated...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

