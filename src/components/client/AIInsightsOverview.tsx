import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Sparkles, Loader2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target, Users, Brain, BarChart3, Lightbulb, Calendar, ArrowRight, RefreshCw, Globe, FileText, MessageSquare, Briefcase, ChevronDown, ChevronUp, DollarSign, Zap } from 'lucide-react';

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
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 font-medium mb-1">Executive Summary</p>
              <p className="text-sm text-blue-800">{insights.executiveSummary}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Maturity</p>
                </div>
                <p className="text-sm font-semibold capitalize">{insights.clientProfile?.maturityLevel}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Sophistication</p>
                </div>
                <p className={`text-sm font-semibold ${getScoreColor(insights.clientProfile?.sophisticationScore || 0)}`}>
                  {insights.clientProfile?.sophisticationScore}/100
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Readiness</p>
                </div>
                <Badge variant={insights.clientProfile?.readinessToEngage === 'high' ? 'success' : 'secondary'}>
                  {insights.clientProfile?.readinessToEngage}
                </Badge>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Strategic Value</p>
                </div>
                <p className={`text-sm font-semibold ${getScoreColor(insights.clientProfile?.strategicValue || 0)}`}>
                  {insights.clientProfile?.strategicValue}/100
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div>

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
    </div>
  );
};
