import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { CheckCircle2, AlertCircle, Sparkles, Plus } from 'lucide-react';
import { IntelligenceQuery } from '../../types';

interface QueryResultProps {
  query: IntelligenceQuery;
  onCreateDeal?: () => void;
  onCreateFollowup?: () => void;
}

export const QueryResult: React.FC<QueryResultProps> = ({ query, onCreateDeal, onCreateFollowup }) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Response</h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{query.tokensUsed.toLocaleString()} tokens</span>
              <span>${query.cost.toFixed(4)}</span>
            </div>
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{query.response}</p>
        </CardContent>
      </Card>

      {query.keyFindings && query.keyFindings.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-foreground">Key Findings</h3>
            </div>
            <div className="space-y-3">
              {query.keyFindings.map((finding, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Badge variant="secondary" className="mt-0.5">{index + 1}</Badge>
                  <p className="text-sm text-foreground flex-1">{finding}</p>
                  <Badge variant="success" className="text-xs">High</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {query.recommendedActions && query.recommendedActions.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <h3 className="font-semibold text-foreground">Recommended Actions</h3>
            </div>
            <div className="space-y-3">
              {query.recommendedActions.map((action, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-3 flex-1">
                    <Badge
                      variant={
                        action.severity === 'critical' ? 'destructive' :
                        action.severity === 'high' ? 'warning' :
                        'secondary'
                      }
                      className="text-xs mt-0.5"
                    >
                      {action.severity}
                    </Badge>
                    <p className="text-sm text-foreground">{action.action}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {action.action.toLowerCase().includes('deal') && onCreateDeal && (
                      <Button size="sm" variant="outline" onClick={onCreateDeal}>
                        <Plus className="h-3 w-3 mr-1" />
                        Create Deal
                      </Button>
                    )}
                    {action.action.toLowerCase().includes('follow') && onCreateFollowup && (
                      <Button size="sm" variant="outline" onClick={onCreateFollowup}>
                        <Plus className="h-3 w-3 mr-1" />
                        Schedule
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
