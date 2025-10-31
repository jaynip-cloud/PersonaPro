import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { MessageSquare, Clock, Handshake, Activity } from 'lucide-react';
import { PersonaMetrics } from '../../types';

interface PersonaMetricsCardsProps {
  metrics: PersonaMetrics;
}

export const PersonaMetricsCards: React.FC<PersonaMetricsCardsProps> = ({ metrics }) => {
  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return <Badge variant="success" className="text-xs">High Confidence</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="text-xs">Medium Confidence</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-xs">Low Confidence</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            {getConfidenceBadge(metrics.communicationStyle.confidence)}
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Communication Style</h3>
          <p className="text-lg font-semibold text-foreground">{metrics.communicationStyle.value}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            {getConfidenceBadge(metrics.responseSpeed.confidence)}
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Response Speed</h3>
          <p className="text-lg font-semibold text-foreground">
            {metrics.responseSpeed.avgDays === 0
              ? '< 1 day'
              : `${metrics.responseSpeed.avgDays} day${metrics.responseSpeed.avgDays > 1 ? 's' : ''}`
            }
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Handshake className="h-5 w-5 text-purple-600" />
            </div>
            {getConfidenceBadge(metrics.negotiationTone.confidence)}
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Negotiation Tone</h3>
          <p className="text-lg font-semibold text-foreground">{metrics.negotiationTone.value}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Activity className="h-5 w-5 text-orange-600" />
            </div>
            {getConfidenceBadge(metrics.engagementPattern.confidence)}
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Engagement Pattern</h3>
          <p className="text-lg font-semibold text-foreground">{metrics.engagementPattern.value}</p>
        </CardContent>
      </Card>
    </div>
  );
};
