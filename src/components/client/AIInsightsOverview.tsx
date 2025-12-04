import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Sparkles, Loader2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target, Users, Brain, BarChart3, Lightbulb, Calendar, ArrowRight, RefreshCw, Globe, FileText, MessageSquare, Briefcase, ChevronDown, ChevronUp, DollarSign, Zap, Database, Building2, Code, Shield, Activity, Gauge } from 'lucide-react';

interface AIInsightsOverviewProps {
  clientId: string;
  clientName: string;
  insights?: any;
  insightsGeneratedAt?: string;
  dataGathered?: {
    client: boolean;
    contacts: number;
    meetings: number;
    projects: number;
    pitches: number;
    documents: number;
    marketIntelligence: boolean;
    marketIntelligenceStatus?: string;
    marketIntelligenceError?: string;
  };
  onRefresh: () => void;
  isLoading: boolean;
}

export const AIInsightsOverview: React.FC<AIInsightsOverviewProps> = ({
  clientId,
  clientName,
  insights,
  insightsGeneratedAt,
  dataGathered,
  onRefresh,
  isLoading,
}) => {
  const [showDataSources, setShowDataSources] = useState(false);
  const getSentimentColor = (sentiment: string) => {
    const sentimentMap: Record<string, string> = {
      'very positive': 'text-green-600',
      'positive': 'text-green-500',
      'neutral': 'text-gray-500',
      'concerned': 'text-orange-500',
      'negative': 'text-red-500',
    };
    return sentimentMap[sentiment?.toLowerCase()] || 'text-gray-500';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getRiskColor = (risk: string) => {
    const riskMap: Record<string, string> = {
      'low': 'success',
      'medium': 'warning',
      'high': 'destructive',
    };
    return riskMap[risk?.toLowerCase()] || 'secondary';
  };

  if (!insights) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle>AI-Powered Client Intelligence</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Generate Comprehensive Insights</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Get AI-powered analysis including behavioral patterns, sentiment analysis, market intelligence,
              relationship health, and actionable recommendations.
            </p>
            <Button
              variant="primary"
              onClick={onRefresh}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const timeAgo = insightsGeneratedAt
    ? new Date(insightsGeneratedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    : 'Unknown';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle>AI Client Intelligence</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Updated {timeAgo}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        {insights.dataSourcesAnalysis && (
          <div className="px-6 pb-4">
            <div className="p-3 bg-muted/50 rounded-lg border border-border space-y-2">
              <p className="text-xs font-medium flex items-center gap-2">
                <Database className="h-3 w-3" />
                Data Sources Usage Analysis
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
                {insights.dataSourcesAnalysis.pineconeUsage && (
                  <div>
                    <span className="font-semibold text-foreground">Vector Search:</span> {insights.dataSourcesAnalysis.pineconeUsage}
                  </div>
                )}
                {insights.dataSourcesAnalysis.webSearchUsage && (
                  <div>
                    <span className="font-semibold text-foreground">Market Intel:</span> {insights.dataSourcesAnalysis.webSearchUsage}
                  </div>
                )}
                {insights.dataSourcesAnalysis.databaseUsage && (
                  <div>
                    <span className="font-semibold text-foreground">Database:</span> {insights.dataSourcesAnalysis.databaseUsage}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {dataGathered && (
          <div className="px-6 pb-4">
            <button
              onClick={() => setShowDataSources(!showDataSources)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDataSources ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span>Data Sources Analyzed</span>
            </button>
            {showDataSources && (
              <div className="mt-3 p-4 bg-muted/30 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-3">This analysis is based on the following verified data sources:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-xs font-medium">Company Profile</p>
                      <p className="text-xs text-muted-foreground">{dataGathered.client ? 'Complete' : 'Limited'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-xs font-medium">Contacts</p>
                      <p className="text-xs text-muted-foreground">{dataGathered.contacts} contacts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs font-medium">Meetings</p>
                      <p className="text-xs text-muted-foreground">{dataGathered.meetings} transcripts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-xs font-medium">Projects</p>
                      <p className="text-xs text-muted-foreground">{dataGathered.projects} projects</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    <div>
                      <p className="text-xs font-medium">Documents</p>
                      <p className="text-xs text-muted-foreground">{dataGathered.documents} files</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-pink-600" />
                    <div>
                      <p className="text-xs font-medium">Pitches</p>
                      <p className="text-xs text-muted-foreground">{dataGathered.pitches} saved</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-teal-600" />
                    <div>
                      <p className="text-xs font-medium">Market Intel</p>
                      <p className="text-xs text-muted-foreground">
                        {dataGathered.marketIntelligence ? 'Available' :
                          dataGathered.marketIntelligenceStatus === 'no_api_key' ? 'No API Key' :
                            dataGathered.marketIntelligenceStatus === 'api_error' ? 'API Error' :
                              dataGathered.marketIntelligenceStatus === 'fetch_error' ? 'Fetch Error' :
                                'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">
                    All insights are evidence-based and sourced from the data listed above. Recommendations reflect patterns
                    identified across meetings, projects, and market research.
                  </p>
                  {(dataGathered.contacts < 2 || dataGathered.meetings < 3 || dataGathered.projects < 1 || dataGathered.documents < 1 || !dataGathered.marketIntelligence) && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-xs font-medium text-yellow-900 mb-1">💡 Get More Comprehensive Insights</p>
                      <p className="text-xs text-yellow-800">
                        {dataGathered.marketIntelligenceStatus === 'no_api_key' && (
                          <span className="block mb-1">
                            <strong>⚠️ Market Intelligence Unavailable:</strong> Add Perplexity API key in Settings → API Keys to enable real-time web search for company news, market trends, and competitive intelligence.
                          </span>
                        )}
                        {dataGathered.marketIntelligenceStatus === 'api_error' && (
                          <span className="block mb-1">
                            <strong>⚠️ Market Intelligence Error:</strong> Perplexity API returned an error.
                            {dataGathered.marketIntelligenceError && (
                              <span className="block mt-1 text-xs font-mono bg-red-100 p-1 rounded">{dataGathered.marketIntelligenceError}</span>
                            )}
                            <span className="block mt-1">Check your API key in Settings or try again later.</span>
                          </span>
                        )}
                        {dataGathered.marketIntelligenceStatus === 'fetch_error' && (
                          <span className="block mb-1">
                            <strong>⚠️ Market Intelligence Error:</strong> Network error connecting to Perplexity API. Check your connection and try again.
                          </span>
                        )}
                        {(dataGathered.contacts < 2 || dataGathered.meetings < 3 || dataGathered.projects < 1 || dataGathered.documents < 1) && (
                          <span>
                            Add more data for deeper analysis:
                            {dataGathered.contacts < 2 && ' • Add more contacts (decision makers, influencers)'}
                            {dataGathered.meetings < 3 && ' • Upload meeting transcripts'}
                            {dataGathered.projects < 1 && ' • Create projects/opportunities'}
                            {dataGathered.documents < 1 && ' • Upload relevant documents'}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        <CardContent>
          {/* Main Executive Summary Container - All content inside this blue section */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg p-8 border-2 border-blue-200 space-y-8">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-blue-600 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Executive Summary</h3>
                <p className="text-sm text-slate-600 mt-1">Comprehensive overview of client relationship intelligence</p>
              </div>
            </div>

            {/* Check if new nested structure or old flat structure */}
            {typeof insights.executiveSummary === 'object' && insights.executiveSummary !== null && !Array.isArray(insights.executiveSummary) ? (
              <>
                {/* Overview */}
                {insights.executiveSummary.overview && (
                  <div className="prose prose-slate max-w-none">
                    <p className="text-slate-800 leading-relaxed whitespace-pre-wrap text-base">{insights.executiveSummary.overview}</p>
                  </div>
                )}

                {/* Reasoning */}
                {insights.executiveSummary.reasoning && (
                  <div className="bg-blue-100/50 rounded-lg p-4 border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Analysis Reasoning</h4>
                    <p className="text-sm text-blue-800 leading-relaxed">{insights.executiveSummary.reasoning}</p>
                  </div>
                )}

                {/* All Sections */}
                {insights.executiveSummary.sections && (
                  <div className="space-y-8 pt-4 border-t border-blue-200">
                    {(() => {
                      const sections = insights.executiveSummary.sections;
                      return (
                        <>
                          {/* Company Profile */}
                          {sections.companyProfile && (
                            <div className="bg-white rounded-lg p-6 border border-blue-200">
                              <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-blue-600" />
                                Company Profile
                              </h4>
                              <div className="space-y-4">
                                {sections.companyProfile.companyOverview && (
                                  <p className="text-sm text-slate-700 leading-relaxed">{sections.companyProfile.companyOverview}</p>
                                )}
                                {sections.companyProfile.keyCharacteristics && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Key Characteristics</h5>
                                    <p className="text-sm text-slate-700 leading-relaxed">{sections.companyProfile.keyCharacteristics}</p>
                                  </div>
                                )}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <div className="text-xs text-slate-500 mb-1">Maturity</div>
                                    <div className="text-sm font-semibold text-slate-900 capitalize">{sections.companyProfile.maturityLevel}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500 mb-1">Sophistication</div>
                                    <div className="text-sm font-semibold text-slate-900">{sections.companyProfile.sophisticationScore}/100</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500 mb-1">Readiness</div>
                                    <Badge variant={sections.companyProfile.readinessToEngage === 'high' ? 'success' : 'secondary'} className="text-xs">
                                      {sections.companyProfile.readinessToEngage}
                                    </Badge>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500 mb-1">Strategic Value</div>
                                    <div className="text-sm font-semibold text-slate-900">{sections.companyProfile.strategicValue}/100</div>
                                  </div>
                                </div>
                                {sections.companyProfile.reasoning && (
                                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <p className="text-xs text-blue-800 leading-relaxed">{sections.companyProfile.reasoning}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Market Intelligence */}
                          {sections.marketIntelligence && (
                            <div className="bg-white rounded-lg p-6 border border-blue-200">
                              <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-blue-600" />
                                Market Intelligence
                              </h4>
                              <div className="space-y-4">
                                {sections.marketIntelligence.industryPosition && (
                                  <p className="text-sm text-slate-700 leading-relaxed">{sections.marketIntelligence.industryPosition}</p>
                                )}
                                {sections.marketIntelligence.recentNews && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Recent News & Updates</h5>
                                    <p className="text-sm text-slate-700 leading-relaxed">{sections.marketIntelligence.recentNews}</p>
                                  </div>
                                )}
                                {sections.marketIntelligence.competitiveLandscape && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Competitive Landscape</h5>
                                    <p className="text-sm text-slate-700 leading-relaxed">{sections.marketIntelligence.competitiveLandscape}</p>
                                  </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <div className="text-xs text-slate-500 mb-1">Competitive Pressure</div>
                                    <div className="text-sm font-semibold text-slate-900 capitalize">{sections.marketIntelligence.competitivePressure}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500 mb-1">Growth Trajectory</div>
                                    <div className="text-sm font-semibold text-slate-900 capitalize">{sections.marketIntelligence.growthTrajectory}</div>
                                  </div>
                                </div>
                                {sections.marketIntelligence.marketChallenges && sections.marketIntelligence.marketChallenges.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Market Challenges</h5>
                                    <ul className="space-y-2">
                                      {sections.marketIntelligence.marketChallenges.map((challenge: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2">
                                          <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-1" />
                                          <span className="text-sm text-slate-700">{challenge}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {sections.marketIntelligence.marketOpportunities && sections.marketIntelligence.marketOpportunities.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Market Opportunities</h5>
                                    <ul className="space-y-2">
                                      {sections.marketIntelligence.marketOpportunities.map((opportunity: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2">
                                          <Target className="h-4 w-4 text-blue-600 flex-shrink-0 mt-1" />
                                          <span className="text-sm text-slate-700">{opportunity}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {sections.marketIntelligence.reasoning && (
                                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <p className="text-xs text-blue-800 leading-relaxed">{sections.marketIntelligence.reasoning}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Relationship Health */}
                          {sections.relationshipHealth && (
                            <div className="bg-white rounded-lg p-6 border border-blue-200">
                              <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Activity className="h-5 w-5 text-blue-600" />
                                Relationship Health
                              </h4>
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <div className="text-xs text-slate-500 mb-1">Health Score</div>
                                    <div className="text-2xl font-bold text-slate-900">{sections.relationshipHealth.healthScore}/100</div>
                                    {sections.relationshipHealth.healthScoreReasoning && (
                                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{sections.relationshipHealth.healthScoreReasoning}</p>
                                    )}
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500 mb-1">Sentiment Score</div>
                                    <div className="text-2xl font-bold text-slate-900">{sections.relationshipHealth.sentimentScore}/100</div>
                                    {sections.relationshipHealth.sentimentScoreReasoning && (
                                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{sections.relationshipHealth.sentimentScoreReasoning}</p>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <div>
                                      <div className="text-xs text-slate-500 mb-1">Overall Sentiment</div>
                                      <Badge variant="secondary" className="capitalize text-xs">{sections.relationshipHealth.overallSentiment}</Badge>
                                    </div>
                                    <div>
                                      <div className="text-xs text-slate-500 mb-1">Relationship Trend</div>
                                      <Badge variant="secondary" className="capitalize text-xs">{sections.relationshipHealth.relationshipTrend}</Badge>
                                    </div>
                                    <div>
                                      <div className="text-xs text-slate-500 mb-1">Trust Level</div>
                                      <Badge variant="secondary" className="capitalize text-xs">{sections.relationshipHealth.trustLevel}</Badge>
                                    </div>
                                  </div>
                                </div>
                                {sections.relationshipHealth.strengthAreas && sections.relationshipHealth.strengthAreas.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                      Strength Areas
                                    </h5>
                                    <ul className="space-y-2">
                                      {sections.relationshipHealth.strengthAreas.map((area: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
                                          <span className="text-sm text-slate-700 leading-relaxed">{area}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {sections.relationshipHealth.riskAreas && sections.relationshipHealth.riskAreas.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                                      Risk Areas
                                    </h5>
                                    <ul className="space-y-2">
                                      {sections.relationshipHealth.riskAreas.map((area: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2 p-2 bg-orange-50 rounded-lg">
                                          <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-1" />
                                          <span className="text-sm text-slate-700 leading-relaxed">{area}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <div className="text-xs text-slate-500 mb-1">Churn Risk</div>
                                    <Badge variant={getRiskColor(sections.relationshipHealth.churnRisk) as any} className="text-xs">
                                      {sections.relationshipHealth.churnRisk}
                                    </Badge>
                                    {sections.relationshipHealth.churnRiskReasoning && (
                                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{sections.relationshipHealth.churnRiskReasoning}</p>
                                    )}
                                  </div>
                                  <div>
                                    <div className="text-xs text-slate-500 mb-1">Expansion Potential</div>
                                    <Badge variant={sections.relationshipHealth.expansionPotential === 'high' ? 'success' : 'secondary'} className="text-xs">
                                      {sections.relationshipHealth.expansionPotential}
                                    </Badge>
                                    {sections.relationshipHealth.expansionPotentialReasoning && (
                                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{sections.relationshipHealth.expansionPotentialReasoning}</p>
                                    )}
                                  </div>
                                </div>
                                {sections.relationshipHealth.reasoning && (
                                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <p className="text-xs text-blue-800 leading-relaxed">{sections.relationshipHealth.reasoning}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Behavioral Insights */}
                          {sections.behavioralInsights && (
                            <div className="bg-white rounded-lg p-6 border border-blue-200">
                              <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Brain className="h-5 w-5 text-indigo-600" />
                                Behavioral Insights
                              </h4>
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="p-3 bg-slate-50 rounded-lg">
                                    <div className="text-xs text-slate-500 mb-1">Communication Style</div>
                                    <div className="text-sm font-semibold text-slate-900 capitalize">{sections.behavioralInsights.communicationStyle}</div>
                                    {sections.behavioralInsights.communicationStyleAnalysis && (
                                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{sections.behavioralInsights.communicationStyleAnalysis}</p>
                                    )}
                                  </div>
                                  <div className="p-3 bg-slate-50 rounded-lg">
                                    <div className="text-xs text-slate-500 mb-1">Decision Making</div>
                                    <div className="text-sm font-semibold text-slate-900 capitalize">{sections.behavioralInsights.decisionMakingPattern}</div>
                                    {sections.behavioralInsights.decisionMakingAnalysis && (
                                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{sections.behavioralInsights.decisionMakingAnalysis}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="p-3 bg-slate-50 rounded-lg">
                                    <div className="text-xs text-slate-500 mb-1">Engagement Level</div>
                                    <Badge variant="secondary" className="capitalize text-xs">{sections.behavioralInsights.engagementLevel}</Badge>
                                    {sections.behavioralInsights.engagementAnalysis && (
                                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{sections.behavioralInsights.engagementAnalysis}</p>
                                    )}
                                  </div>
                                  <div className="p-3 bg-slate-50 rounded-lg">
                                    <div className="text-xs text-slate-500 mb-1">Risk Tolerance</div>
                                    <Badge variant="secondary" className="capitalize text-xs">{sections.behavioralInsights.riskTolerance}</Badge>
                                    {sections.behavioralInsights.riskToleranceReasoning && (
                                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{sections.behavioralInsights.riskToleranceReasoning}</p>
                                    )}
                                  </div>
                                  <div className="p-3 bg-slate-50 rounded-lg">
                                    <div className="text-xs text-slate-500 mb-1">Innovation Appetite</div>
                                    <Badge variant="secondary" className="capitalize text-xs">{sections.behavioralInsights.innovationAppetite}</Badge>
                                    {sections.behavioralInsights.innovationAppetiteReasoning && (
                                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{sections.behavioralInsights.innovationAppetiteReasoning}</p>
                                    )}
                                  </div>
                                </div>
                                {sections.behavioralInsights.priorities && sections.behavioralInsights.priorities.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Priorities</h5>
                                    <ul className="space-y-2">
                                      {sections.behavioralInsights.priorities.map((priority: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2">
                                          <span className="text-blue-600 font-bold text-sm">{idx + 1}.</span>
                                          <span className="text-sm text-slate-700 leading-relaxed">{priority}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {sections.behavioralInsights.painPoints && sections.behavioralInsights.painPoints.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Pain Points</h5>
                                    <ul className="space-y-2">
                                      {sections.behavioralInsights.painPoints.map((pain: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                                          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-1" />
                                          <span className="text-sm text-slate-700 leading-relaxed">{pain}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {sections.behavioralInsights.motivations && sections.behavioralInsights.motivations.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Motivations</h5>
                                    <ul className="space-y-2">
                                      {sections.behavioralInsights.motivations.map((motivation: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2">
                                          <Zap className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-1" />
                                          <span className="text-sm text-slate-700 leading-relaxed">{motivation}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {sections.behavioralInsights.valueOrientation && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Value Orientation</h5>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                      <Badge variant="secondary" className="capitalize text-xs mb-2">{sections.behavioralInsights.valueOrientation}</Badge>
                                      {sections.behavioralInsights.valueOrientationReasoning && (
                                        <p className="text-xs text-slate-600 leading-relaxed">{sections.behavioralInsights.valueOrientationReasoning}</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {sections.behavioralInsights.evidence && (
                                  <div className="p-3 bg-blue-50 rounded-lg">
                                    <h5 className="text-xs font-semibold text-blue-900 mb-2">Supporting Evidence</h5>
                                    <p className="text-xs text-blue-800 leading-relaxed">{sections.behavioralInsights.evidence}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Opportunities */}
                          {sections.opportunities && (
                            <div className="bg-white rounded-lg p-6 border border-blue-200">
                              <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Target className="h-5 w-5 text-blue-600" />
                                Opportunities
                              </h4>
                              <div className="space-y-4">
                                {sections.opportunities.upsellOpportunities && sections.opportunities.upsellOpportunities.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Upsell Opportunities</h5>
                                    <ul className="space-y-3">
                                      {sections.opportunities.upsellOpportunities.map((opp: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                                          <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
                                          <span className="text-sm text-slate-700 leading-relaxed">{opp}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {sections.opportunities.crossSellOpportunities && sections.opportunities.crossSellOpportunities.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Cross-Sell Opportunities</h5>
                                    <ul className="space-y-3">
                                      {sections.opportunities.crossSellOpportunities.map((opp: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                          <Sparkles className="h-4 w-4 text-blue-600 flex-shrink-0 mt-1" />
                                          <span className="text-sm text-slate-700 leading-relaxed">{opp}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {sections.opportunities.budgetIndicators && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Budget Indicators</h5>
                                    <p className="text-sm text-slate-700 leading-relaxed">{sections.opportunities.budgetIndicators}</p>
                                  </div>
                                )}
                                {sections.opportunities.decisionTimeframe && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Decision Timeframe</h5>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="capitalize text-xs">{sections.opportunities.decisionTimeframe}</Badge>
                                      {sections.opportunities.decisionTimeframeReasoning && (
                                        <p className="text-xs text-slate-600">{sections.opportunities.decisionTimeframeReasoning}</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {sections.opportunities.recommendedApproach && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Recommended Approach</h5>
                                    <p className="text-sm text-slate-700 leading-relaxed">{sections.opportunities.recommendedApproach}</p>
                                  </div>
                                )}
                                {sections.opportunities.reasoning && (
                                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <p className="text-xs text-blue-800 leading-relaxed">{sections.opportunities.reasoning}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Action Plan */}
                          {sections.actionPlan && (
                            <div className="bg-white rounded-lg p-6 border border-blue-200">
                              <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Lightbulb className="h-5 w-5 text-blue-600" />
                                Action Plan
                              </h4>
                              <div className="space-y-6">
                                {sections.actionPlan.immediatePriorities && sections.actionPlan.immediatePriorities.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-3">Immediate Priorities (Next 30 Days)</h5>
                                    <div className="space-y-3">
                                      {sections.actionPlan.immediatePriorities.map((priority: string, idx: number) => (
                                        <div key={idx} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-semibold">
                                            {idx + 1}
                                          </span>
                                          <p className="text-sm text-slate-700 leading-relaxed flex-1">{priority}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {sections.actionPlan.strategicRecommendations && sections.actionPlan.strategicRecommendations.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-3">Strategic Recommendations</h5>
                                    <div className="space-y-3">
                                      {sections.actionPlan.strategicRecommendations.map((rec: string, idx: number) => (
                                        <div key={idx} className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-600 text-white text-xs flex items-center justify-center font-semibold">
                                            {idx + 1}
                                          </span>
                                          <p className="text-sm text-slate-700 leading-relaxed flex-1">{rec}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {sections.actionPlan.communicationStrategy && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Communication Strategy</h5>
                                    <p className="text-sm text-slate-700 leading-relaxed">{sections.actionPlan.communicationStrategy}</p>
                                  </div>
                                )}
                                {sections.actionPlan.engagementTactics && sections.actionPlan.engagementTactics.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Engagement Tactics</h5>
                                    <ul className="space-y-2">
                                      {sections.actionPlan.engagementTactics.map((tactic: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2">
                                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
                                          <span className="text-sm text-slate-700 leading-relaxed">{tactic}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {sections.actionPlan.riskMitigation && sections.actionPlan.riskMitigation.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Risk Mitigation</h5>
                                    <ul className="space-y-2">
                                      {sections.actionPlan.riskMitigation.map((action: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2">
                                          <Shield className="h-4 w-4 text-orange-600 flex-shrink-0 mt-1" />
                                          <span className="text-sm text-slate-700 leading-relaxed">{action}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {sections.actionPlan.reasoning && (
                                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                    <h5 className="text-sm font-semibold text-blue-900 mb-2">Recommendation Reasoning</h5>
                                    <p className="text-xs text-blue-800 leading-relaxed">{sections.actionPlan.reasoning}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Key Metrics */}
                          {sections.keyMetrics && (
                            <div className="bg-white rounded-lg p-6 border border-blue-200">
                              <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Gauge className="h-5 w-5 text-blue-600" />
                                Key Performance Indicators
                              </h4>
                              <div className="space-y-6">
                                {['engagementScore', 'collaborationScore', 'communicationScore', 'alignmentScore', 'momentumScore', 'valueRealizationScore', 'overallHealthScore'].map((key) => {
                                  const score = sections.keyMetrics[key];
                                  const reasoning = sections.keyMetrics[`${key}Reasoning`];
                                  if (score === undefined || score === null) return null;
                                  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                  const getColor = (score: number) => {
                                    if (score >= 75) return 'text-green-600 bg-green-50 border-green-200';
                                    if (score >= 50) return 'text-blue-600 bg-blue-50 border-blue-200';
                                    if (score >= 25) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
                                    return 'text-red-600 bg-red-50 border-red-200';
                                  };
                                  return (
                                    <div key={key} className="border-2 border-slate-200 rounded-lg overflow-hidden">
                                      <div className={`p-4 ${getColor(score)} border-b-2 border-current/20`}>
                                        <div className="flex items-center justify-between">
                                          <div className="text-sm font-semibold mb-2">{label}</div>
                                          <div className="flex items-end gap-1">
                                            <span className="text-3xl font-bold">{score}</span>
                                            <span className="text-sm pb-1">/100</span>
                                          </div>
                                        </div>
                                        <div className="mt-2 h-2 bg-white rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-current transition-all"
                                            style={{ width: `${score}%` }}
                                          />
                                        </div>
                                      </div>
                                      {reasoning && (
                                        <div className="p-4 bg-white">
                                          <p className="text-sm text-slate-700 leading-relaxed">{reasoning}</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {sections.keyMetrics.overallHealthScoreReasoning && (
                                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                    <h5 className="text-sm font-semibold text-blue-900 mb-2">Overall Score Reasoning</h5>
                                    <p className="text-xs text-blue-800 leading-relaxed">{sections.keyMetrics.overallHealthScoreReasoning}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Signals */}
                          {sections.signals && (
                            <div className="bg-white rounded-lg p-6 border border-blue-200">
                              <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Activity className="h-5 w-5 text-blue-600" />
                                Key Signals
                              </h4>
                              <div className="space-y-4">
                                {sections.signals.greenFlags && sections.signals.greenFlags.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                                      <CheckCircle className="h-4 w-4" />
                                      Green Flags (Positive Signals)
                                    </h5>
                                    <ul className="space-y-2">
                                      {sections.signals.greenFlags.map((flag: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
                                          <span className="text-sm text-slate-700">{flag}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {sections.signals.redFlags && sections.signals.redFlags.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                                      <AlertTriangle className="h-4 w-4" />
                                      Red Flags (Concerning Signals)
                                    </h5>
                                    <ul className="space-y-2">
                                      {sections.signals.redFlags.map((flag: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                                          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-1" />
                                          <span className="text-sm text-slate-700">{flag}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {sections.signals.predictiveInsights && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Predictive Insights</h5>
                                    <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                                      {sections.signals.predictiveInsights.likelyNextStep && (
                                        <div>
                                          <div className="text-xs text-slate-500 mb-1">Likely Next Step</div>
                                          <p className="text-sm text-slate-700">{sections.signals.predictiveInsights.likelyNextStep}</p>
                                        </div>
                                      )}
                                      <div className="grid grid-cols-3 gap-2">
                                        <div>
                                          <div className="text-xs text-slate-500 mb-1">Retention Probability</div>
                                          <div className="text-sm font-semibold text-slate-900">{sections.signals.predictiveInsights.retentionProbability}%</div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-slate-500 mb-1">Growth Probability</div>
                                          <div className="text-sm font-semibold text-slate-900">{sections.signals.predictiveInsights.growthProbability}%</div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-slate-500 mb-1">Time to Decision</div>
                                          <div className="text-sm font-semibold text-slate-900 capitalize">{sections.signals.predictiveInsights.timeToDecision}</div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {sections.signals.reasoning && (
                                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <p className="text-xs text-blue-800 leading-relaxed">{sections.signals.reasoning}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Data Analysis */}
                          {sections.dataAnalysis && (
                            <div className="bg-white rounded-lg p-6 border border-blue-200">
                              <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-blue-600" />
                                Data Analysis & Methodology
                              </h4>
                              <div className="space-y-4">
                                {sections.dataAnalysis.companyProfileUsage && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Company Profile Data Usage</h5>
                                    <p className="text-sm text-slate-700 leading-relaxed">{sections.dataAnalysis.companyProfileUsage}</p>
                                  </div>
                                )}
                                {sections.dataAnalysis.marketIntelligenceUsage && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Market Intelligence Usage</h5>
                                    <p className="text-sm text-slate-700 leading-relaxed">{sections.dataAnalysis.marketIntelligenceUsage}</p>
                                  </div>
                                )}
                                {sections.dataAnalysis.internalDataUsage && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Internal Data Usage</h5>
                                    <p className="text-sm text-slate-700 leading-relaxed">{sections.dataAnalysis.internalDataUsage}</p>
                                  </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="p-3 bg-slate-50 rounded-lg">
                                    <div className="text-xs text-slate-500 mb-1">Data Confidence</div>
                                    <div className="text-sm font-semibold text-slate-900 capitalize">{sections.dataAnalysis.dataConfidence}</div>
                                  </div>
                                </div>
                                {sections.dataAnalysis.dataConfidenceReasoning && (
                                  <div className="p-3 bg-blue-50 rounded-lg">
                                    <h5 className="text-xs font-semibold text-blue-900 mb-2">Confidence Reasoning</h5>
                                    <p className="text-xs text-blue-800 leading-relaxed">{sections.dataAnalysis.dataConfidenceReasoning}</p>
                                  </div>
                                )}
                                {sections.dataAnalysis.dataGaps && (
                                  <div>
                                    <h5 className="text-sm font-semibold text-slate-900 mb-2">Data Gaps</h5>
                                    <p className="text-sm text-slate-700 leading-relaxed">{sections.dataAnalysis.dataGaps}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </>
            ) : (
              /* Fallback for old structure (string executiveSummary) */
              <>
                {typeof insights.executiveSummary === 'string' && (
                  <div className="prose prose-slate max-w-none">
                    <p className="text-slate-800 leading-relaxed whitespace-pre-wrap text-base">{insights.executiveSummary}</p>
                  </div>
                )}
                {insights.executiveSummaryReasoning && (
                  <div className="bg-blue-100/50 rounded-lg p-4 border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Analysis Reasoning</h4>
                    <p className="text-sm text-blue-800 leading-relaxed">{insights.executiveSummaryReasoning}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Old structure fallback cards - only render when old structure is detected */}
      {typeof insights.executiveSummary === 'string' && (
        <>
          <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Behavioral Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Communication Style</p>
              <Badge variant="secondary" className="capitalize">{insights.behavioralAnalysis?.communicationStyle}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Decision Making</p>
              <p className="text-sm capitalize">{insights.behavioralAnalysis?.decisionMakingPattern}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Engagement Level</p>
              <Badge variant="secondary" className="capitalize">{insights.behavioralAnalysis?.engagementLevel}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Reliability Score</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${insights.behavioralAnalysis?.reliabilityScore || 0}%` }}
                  />
                </div>
                <span className="text-sm font-semibold">{insights.behavioralAnalysis?.reliabilityScore}/100</span>
              </div>
            </div>
            {insights.behavioralAnalysis?.evidence && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-1">Key Evidence</p>
                <p className="text-xs italic text-muted-foreground">{insights.behavioralAnalysis.evidence}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Sentiment Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Overall Sentiment</p>
              <p className={`text-sm font-semibold capitalize ${getSentimentColor(insights.sentimentAnalysis?.overallSentiment)}`}>
                {insights.sentimentAnalysis?.overallSentiment}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Sentiment Score</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${insights.sentimentAnalysis?.sentimentScore || 0}%` }}
                  />
                </div>
                <span className="text-sm font-semibold">{insights.sentimentAnalysis?.sentimentScore}/100</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Relationship Trend</p>
              <div className="flex items-center gap-2">
                {insights.sentimentAnalysis?.relationshipTrend === 'improving' && (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                )}
                {insights.sentimentAnalysis?.relationshipTrend === 'declining' && (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <Badge variant="secondary" className="capitalize">{insights.sentimentAnalysis?.relationshipTrend}</Badge>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Trust Level</p>
              <Badge variant="secondary" className="capitalize">{insights.sentimentAnalysis?.trustLevel}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Relationship Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 border rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Health Score</p>
              <p className={`text-3xl font-bold ${getScoreColor(insights.relationshipHealth?.healthScore || 0)}`}>
                {insights.relationshipHealth?.healthScore}/100
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Churn Risk</p>
              <Badge variant={getRiskColor(insights.relationshipHealth?.churnRisk) as any}>
                {insights.relationshipHealth?.churnRisk}
              </Badge>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Expansion Potential</p>
              <Badge variant={insights.relationshipHealth?.expansionPotential === 'high' ? 'success' : 'secondary'}>
                {insights.relationshipHealth?.expansionPotential}
              </Badge>
            </div>
          </div>

          {insights.relationshipHealth?.strengthAreas && insights.relationshipHealth.strengthAreas.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Strengths
              </p>
              <ul className="space-y-1">
                {insights.relationshipHealth.strengthAreas.map((area: string, idx: number) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insights.relationshipHealth?.riskAreas && insights.relationshipHealth.riskAreas.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Risk Areas
              </p>
              <ul className="space-y-1">
                {insights.relationshipHealth.riskAreas.map((area: string, idx: number) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Immediate Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.actionableInsights?.immediatePriorities && insights.actionableInsights.immediatePriorities.length > 0 ? (
            <div className="space-y-2">
              {insights.actionableInsights.immediatePriorities.map((action: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{action}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No immediate actions recommended</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Key Performance Indicators
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.kpis && Object.entries(insights.kpis).map(([key, value]: [string, any]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                  </p>
                  <span className="text-xs font-semibold">{value}/100</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
          {insights.kpiReasoning && (
            <div className="px-6 pb-4">
              <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                <span className="font-medium">Calculation Logic:</span> {insights.kpiReasoning}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Predictive Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Retention Probability</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${insights.predictiveInsights?.retentionProbability || 0}%` }}
                  />
                </div>
                <span className="text-sm font-semibold">{insights.predictiveInsights?.retentionProbability}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Growth Probability</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${insights.predictiveInsights?.growthProbability || 0}%` }}
                  />
                </div>
                <span className="text-sm font-semibold">{insights.predictiveInsights?.growthProbability}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Decision Timeframe</p>
              <Badge variant="secondary">{insights.predictiveInsights?.timeToDecision}</Badge>
            </div>
            {insights.predictiveInsights?.likelyNextStep && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Likely Next Step</p>
                <p className="text-sm">{insights.predictiveInsights.likelyNextStep}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Psychographic Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.psychographicProfile?.priorities && insights.psychographicProfile.priorities.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Top Priorities</p>
              <div className="space-y-2">
                {insights.psychographicProfile.priorities.map((priority: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-primary font-bold text-sm">{idx + 1}.</span>
                    <p className="text-sm">{priority}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.psychographicProfile?.painPoints && insights.psychographicProfile.painPoints.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Pain Points</p>
              <div className="space-y-2">
                {insights.psychographicProfile.painPoints.map((pain: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-900">{pain}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.psychographicProfile?.motivations && insights.psychographicProfile.motivations.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Key Motivations</p>
              <div className="space-y-2">
                {insights.psychographicProfile.motivations.map((motivation: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{motivation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Risk Tolerance</p>
              <Badge variant="secondary" className="capitalize">{insights.psychographicProfile?.riskTolerance}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Innovation</p>
              <Badge variant="secondary" className="capitalize">{insights.psychographicProfile?.innovationAppetite}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Value Focus</p>
              <Badge variant="secondary" className="capitalize">{insights.psychographicProfile?.valueOrientation}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Market Context & Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.marketContext?.industryPosition && (
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Industry Position</p>
              <p className="text-sm">{insights.marketContext.industryPosition}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Competitive Pressure</p>
              <Badge variant={insights.marketContext?.competitivePressure === 'high' ? 'destructive' : 'secondary'}>
                {insights.marketContext?.competitivePressure}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Growth Trajectory</p>
              <Badge variant="secondary" className="capitalize">{insights.marketContext?.growthTrajectory}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Reputation</p>
              <Badge variant="secondary">Analyzed</Badge>
            </div>
          </div>

          {insights.marketContext?.marketChallenges && insights.marketContext.marketChallenges.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Market Challenges</p>
              <ul className="space-y-1">
                {insights.marketContext.marketChallenges.map((challenge: string, idx: number) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">•</span>
                    {challenge}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insights.marketContext?.marketOpportunities && insights.marketContext.marketOpportunities.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Market Opportunities</p>
              <ul className="space-y-1">
                {insights.marketContext.marketOpportunities.map((opp: string, idx: number) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">•</span>
                    {opp}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Opportunity Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.opportunityAnalysis?.upsellOpportunities && insights.opportunityAnalysis.upsellOpportunities.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Upsell Opportunities</p>
              <div className="space-y-2">
                {insights.opportunityAnalysis.upsellOpportunities.map((opp: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded">
                    <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-900">{opp}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.opportunityAnalysis?.crossSellOpportunities && insights.opportunityAnalysis.crossSellOpportunities.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Cross-Sell Opportunities</p>
              <div className="space-y-2">
                {insights.opportunityAnalysis.crossSellOpportunities.map((opp: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded">
                    <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-900">{opp}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.opportunityAnalysis?.budgetIndicators && (
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Budget Indicators</p>
              <p className="text-sm">{insights.opportunityAnalysis.budgetIndicators}</p>
            </div>
          )}

          {insights.opportunityAnalysis?.decisionTimeframe && (
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Decision Timeframe</p>
              <Badge variant="secondary" className="capitalize">{insights.opportunityAnalysis.decisionTimeframe}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Strategic Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.actionableInsights?.strategicRecommendations && insights.actionableInsights.strategicRecommendations.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Long-term Strategy</p>
              <div className="space-y-2">
                {insights.actionableInsights.strategicRecommendations.map((rec: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                    <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.actionableInsights?.communicationStrategy && (
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Communication Strategy</p>
              <p className="text-sm">{insights.actionableInsights.communicationStrategy}</p>
            </div>
          )}

          {insights.actionableInsights?.engagementTactics && insights.actionableInsights.engagementTactics.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">Engagement Tactics</p>
              <ul className="space-y-1">
                {insights.actionableInsights.engagementTactics.map((tactic: string, idx: number) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    {tactic}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {(insights.redFlags?.length > 0 || insights.greenFlags?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {insights.greenFlags && insights.greenFlags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Green Flags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.greenFlags.map((flag: string, idx: number) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      {flag}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {insights.redFlags && insights.redFlags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  Red Flags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.redFlags.map((flag: string, idx: number) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      {flag}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
};
