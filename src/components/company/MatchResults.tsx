import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ClientMatch } from '../../types';
import { useNavigate } from 'react-router-dom';
import { Sparkles, TrendingUp, ArrowRight, CheckCircle } from 'lucide-react';

interface MatchResultsProps {
  matches: ClientMatch[];
  onPromoteToOpportunity: (clientId: string, serviceName: string) => void;
}

export const MatchResults: React.FC<MatchResultsProps> = ({
  matches,
  onPromoteToOpportunity
}) => {
  const navigate = useNavigate();
  const [promotedClients, setPromotedClients] = useState<Set<string>>(new Set());

  const handlePromote = (clientId: string, serviceName: string) => {
    onPromoteToOpportunity(clientId, serviceName);
    setPromotedClients(prev => new Set([...prev, clientId]));
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 85) return 'bg-green-100 text-green-700 border-green-300';
    if (score >= 70) return 'bg-blue-100 text-blue-700 border-blue-300';
    if (score >= 50) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return <Badge variant="success">High Confidence</Badge>;
    if (confidence >= 60) return <Badge variant="secondary">Medium Confidence</Badge>;
    return <Badge variant="secondary">Low Confidence</Badge>;
  };

  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'tags':
        return '🏷️';
      case 'sentiment':
        return '😊';
      case 'interactions':
        return '💬';
      case 'health':
        return '❤️';
      case 'budget':
        return '💰';
      default:
        return '✓';
    }
  };

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No matches found
          </h3>
          <p className="text-sm text-muted-foreground">
            Run the AI Match engine to discover clients that fit your service offering
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-green-600" />
            Top Client Matches
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {matches.length} high-potential clients identified
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {matches.map((match, index) => (
          <Card key={match.client.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg">
                    #{index + 1}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {match.client.company}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {match.client.name} • {match.client.role}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`px-4 py-2 rounded-full border-2 ${getMatchScoreColor(match.matchScore)}`}>
                    <p className="text-xs font-medium">Match Score</p>
                    <p className="text-2xl font-bold">{match.matchScore}</p>
                  </div>
                  {getConfidenceBadge(match.confidence)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-900 mb-2">
                    Primary Reasoning
                  </p>
                  <p className="text-sm text-blue-800">{match.reasoning.primary}</p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs font-semibold text-purple-900 mb-2">
                    Secondary Reasoning
                  </p>
                  <p className="text-sm text-purple-800">{match.reasoning.secondary}</p>
                </div>
              </div>

              {match.signals.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-semibold text-foreground mb-3">
                    Key Signals Supporting This Match
                  </p>
                  <div className="space-y-2">
                    {match.signals.map((signal, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <span className="text-lg">{getSignalIcon(signal.type)}</span>
                        <div className="flex-1">
                          <p className="text-sm text-foreground">{signal.description}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-600"
                                style={{ width: `${Math.min((signal.weight / 3) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Weight: {signal.weight.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-4 border-t border-border">
                {promotedClients.has(match.client.id) ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Promoted to Opportunity</span>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => handlePromote(match.client.id, match.recommendedService)}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Promote to Opportunity
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => navigate(`/clients/${match.client.id}`)}
                >
                  View Client Details
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
