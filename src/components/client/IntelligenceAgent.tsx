import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Sparkles, Loader2, ChevronDown } from 'lucide-react';

interface IntelligenceAgentProps {
  clientId: string;
  onQuery: (query: string, mode: 'quick' | 'deep') => void;
  isProcessing: boolean;
}

export const IntelligenceAgent: React.FC<IntelligenceAgentProps> = ({
  clientId,
  onQuery,
  isProcessing
}) => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'quick' | 'deep'>('quick');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = [
    'What are the key pain points for this client?',
    'Summarize recent interactions and sentiment',
    'What upsell opportunities exist?',
    'Analyze communication patterns',
    'Identify potential risks'
  ];

  const handleSubmit = () => {
    if (query.trim()) {
      onQuery(query, mode);
      setQuery('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Ask Intelligence Agent
          </CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('quick')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                mode === 'quick'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              Quick
            </button>
            <button
              onClick={() => setMode('deep')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                mode === 'deep'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              Deep
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="relative">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about this client..."
              className="w-full min-h-[100px] p-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              disabled={isProcessing}
            />
            {mode === 'deep' && (
              <Badge variant="warning" className="absolute top-2 right-2 text-xs">
                Deep analysis (45-60s)
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Suggested questions
              <ChevronDown className={`h-3 w-3 transition-transform ${showSuggestions ? 'rotate-180' : ''}`} />
            </button>
            <Button
              onClick={handleSubmit}
              disabled={!query.trim() || isProcessing}
              variant="primary"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Ask {mode === 'deep' ? 'Deep' : 'Quick'}
                </>
              )}
            </Button>
          </div>

          {showSuggestions && (
            <div className="space-y-2 pt-2 border-t border-border">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(suggestion)}
                  className="w-full text-left text-sm p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
