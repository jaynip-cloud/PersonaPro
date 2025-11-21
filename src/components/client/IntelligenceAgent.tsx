import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Sparkles, Loader2, ChevronDown, Send, User, Bot, History, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mode?: 'quick' | 'deep';
}

interface IntelligenceAgentProps {
  clientId: string;
  onQuery: (query: string, mode: 'quick' | 'deep') => Promise<string>;
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const suggestions = [
    'What are the key pain points for this client?',
    'What technologies and tools do they currently use?',
    'Who are their main competitors?',
    'What services or products are they using?',
    'Summarize recent interactions and sentiment',
    'What upsell opportunities exist based on their tech stack?',
    'What content topics are they interested in based on their blogs?',
    'How can we address their pain points with our solutions?'
  ];

  useEffect(() => {
    loadChatHistory();
  }, [clientId]);

  const loadChatHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const loadedMessages: Message[] = data.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.created_at,
          mode: msg.mode as 'quick' | 'deep' | undefined
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const saveChatMessage = async (message: Message) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        return;
      }

      const { error } = await supabase
        .from('chat_history')
        .insert({
          user_id: user.id,
          client_id: clientId,
          role: message.role,
          content: message.content,
          mode: message.mode,
          created_at: message.timestamp
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  };

  const clearChatHistory = async () => {
    if (!confirm('Are you sure you want to clear all chat history for this client?')) return;

    try {
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('client_id', clientId);

      if (error) throw error;

      setMessages([]);
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };

  const handleSubmit = async () => {
    if (query.trim() && !isProcessing) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: query,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMessage]);
      await saveChatMessage(userMessage);

      const currentQuery = query;
      const currentMode = mode;
      setQuery('');

      try {
        const response = await onQuery(currentQuery, currentMode);

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString(),
          mode: currentMode
        };

        setMessages(prev => [...prev, assistantMessage]);
        await saveChatMessage(assistantMessage);
      } catch (error) {
        console.error('Error processing query:', error);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Intelligence Agent
          </CardTitle>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={clearChatHistory}
                className="p-2 hover:bg-accent rounded-md transition-colors"
                title="Clear chat history"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
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
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Start a conversation
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Ask me anything about this client. I can analyze interactions, identify opportunities, and provide insights.
            </p>

            <div className="w-full max-w-md">
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="text-sm text-primary hover:underline flex items-center gap-1 mb-3"
              >
                Try these questions
                <ChevronDown className={`h-3 w-3 transition-transform ${showSuggestions ? 'rotate-180' : ''}`} />
              </button>

              {showSuggestions && (
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setQuery(suggestion);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left text-sm p-3 rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {message.mode && message.role === 'assistant' && (
                    <Badge variant="outline" className="mb-2 text-xs">
                      {message.mode} mode
                    </Badge>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isProcessing && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-border pt-4">
          <div className="flex gap-2">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything about this client..."
              className="flex-1 p-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
              disabled={isProcessing}
            />
            <Button
              onClick={handleSubmit}
              disabled={!query.trim() || isProcessing}
              variant="primary"
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {mode === 'deep' && (
            <p className="text-xs text-muted-foreground mt-2">
              Deep analysis mode enabled (45-60s processing time)
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
