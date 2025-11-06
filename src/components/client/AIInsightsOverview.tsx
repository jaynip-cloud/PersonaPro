import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Sparkles, Loader2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target, Users, Brain, BarChart3, Lightbulb, Calendar, ArrowRight, RefreshCw } from 'lucide-react';

interface AIInsightsOverviewProps {
  clientId: string;
  clientName: string;
  insights?: any;
  insightsGeneratedAt?: string;
  onRefresh: () => void;
  isLoading: boolean;
}

export const AIInsightsOverview: React.FC<AIInsightsOverviewProps> = ({
  clientId,
  clientName,
  insights,
  insightsGeneratedAt,
  onRefresh,
  isLoading,
}) => {
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
