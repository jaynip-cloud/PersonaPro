import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Building2, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { PersonaMetrics } from '../../types';
import { Sparkline } from './Sparkline';

interface PersonaSummaryProps {
  clientName: string;
  company: string;
  industry: string;
  metrics: PersonaMetrics;
  logo?: string;
}

export const PersonaSummary: React.FC<PersonaSummaryProps> = ({
  clientName,
  company,
  industry,
  metrics,
  logo
}) => {
  const getSentimentColor = (score: number) => {
    if (score >= 0.3) return 'text-green-600';
    if (score <= -0.3) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getSentimentIcon = (score: number) => {
    if (score >= 0.3) return <TrendingUp className="h-4 w-4" />;
    if (score <= -0.3) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'low':
        return <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Low Risk
        </Badge>;
      case 'medium':
        return <Badge variant="warning" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Medium Risk
        </Badge>;
      case 'high':
      case 'critical':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {level === 'critical' ? 'Critical Risk' : 'High Risk'}
        </Badge>;
      default:
        return null;
    }
  };

  const getCooperationBadge = (level: string) => {
    switch (level) {
      case 'high':
        return <Badge variant="success">High Cooperation</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium Cooperation</Badge>;
      case 'low':
        return <Badge variant="outline">Low Cooperation</Badge>;
      default:
        return null;
    }
  };

  const sentimentPercent = ((metrics.sentiment + 1) / 2) * 100;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {logo ? (
              <img src={logo} alt={company} className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-foreground">{clientName}</h2>
              <p className="text-sm text-muted-foreground">{company}</p>
              <p className="text-xs text-muted-foreground mt-1">{industry}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getRiskBadge(metrics.riskLevel)}
            {getCooperationBadge(metrics.cooperation)}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Sentiment Score</span>
                <span className={`text-sm font-bold ${getSentimentColor(metrics.sentiment)}`}>
                  {metrics.sentiment > 0 ? '+' : ''}{metrics.sentiment.toFixed(2)}
                </span>
                <span className={getSentimentColor(metrics.sentiment)}>
                  {getSentimentIcon(metrics.sentiment)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Trend</span>
                <Sparkline
                  data={metrics.sentimentTrend}
                  width={60}
                  height={20}
                  color={metrics.sentiment >= 0 ? '#16a34a' : '#dc2626'}
                />
              </div>
            </div>

            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" style={{ width: '100%' }} />
              <div
                className="absolute inset-y-0 right-0 bg-background"
                style={{ width: `${100 - sentimentPercent}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-foreground rounded-full shadow-lg"
                style={{ left: `${sentimentPercent}%`, transform: 'translate(-50%, -50%)' }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-muted-foreground">Negative (-1)</span>
              <span className="text-xs text-muted-foreground">Neutral (0)</span>
              <span className="text-xs text-muted-foreground">Positive (+1)</span>
            </div>
          </div>

          {metrics.topProjectTypes.length > 0 && (
            <div>
              <span className="text-sm font-medium text-foreground mb-2 block">Top Project Types</span>
              <div className="flex flex-wrap gap-2">
                {metrics.topProjectTypes.map((type, index) => (
                  <Badge key={index} variant="secondary">{type}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
