import React, { useState } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { FileText, Mail, Phone, Users, Share2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { EvidenceSnippet } from '../../types';

interface ExplainabilityPanelProps {
  evidence: EvidenceSnippet[];
}

export const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({ evidence }) => {
  const [sortBy, setSortBy] = useState<'contribution' | 'date'>('contribution');

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'meeting':
        return <Users className="h-4 w-4" />;
      case 'social':
        return <Share2 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Badge variant="success" className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Positive
        </Badge>;
      case 'negative':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <TrendingDown className="h-3 w-3" />
          Negative
        </Badge>;
      case 'neutral':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Minus className="h-3 w-3" />
          Neutral
        </Badge>;
    }
  };

  const getContributionColor = (contribution: number) => {
    if (contribution > 0.2) return 'text-green-600 bg-green-50';
    if (contribution < -0.2) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const sortedEvidence = [...evidence].sort((a, b) => {
    if (sortBy === 'contribution') {
      return Math.abs(b.contribution) - Math.abs(a.contribution);
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Explainability</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'contribution' | 'date')}
              className="text-sm border border-border rounded-md px-3 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="contribution">Contribution</option>
              <option value="date">Date</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {sortedEvidence.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No evidence available yet.</p>
              <p className="text-xs mt-1">Run persona analysis to generate insights.</p>
            </div>
          ) : (
            sortedEvidence.map((snippet) => (
              <div
                key={snippet.id}
                className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-muted rounded">
                      {getSourceIcon(snippet.sourceType)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{snippet.source}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(snippet.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSentimentBadge(snippet.sentiment)}
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${getContributionColor(snippet.contribution)}`}>
                      {snippet.contribution > 0 ? '+' : ''}{snippet.contribution.toFixed(2)}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-foreground italic">"{snippet.text}"</p>
              </div>
            ))
          )}
        </div>

        {evidence.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Evidence snippets show key phrases and interactions that contribute to the persona analysis.
              Contribution scores indicate impact on overall sentiment (positive or negative).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
