import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { IngestionEvent } from '../../types';
import { FileText, User, Globe, MessageSquare, Mail, Activity } from 'lucide-react';

interface DataStreamPanelProps {
  events: IngestionEvent[];
}

export const DataStreamPanel: React.FC<DataStreamPanelProps> = ({ events }) => {
  const getIcon = (itemType: IngestionEvent['itemType']) => {
    switch (itemType) {
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'profile':
        return <User className="h-4 w-4" />;
      case 'website':
        return <Globe className="h-4 w-4" />;
      case 'transcript':
        return <MessageSquare className="h-4 w-4" />;
      case 'contact':
        return <Mail className="h-4 w-4" />;
      case 'interaction':
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    return `${Math.floor(diffSecs / 86400)}d ago`;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Data Stream
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Live ingestion events
        </p>
      </CardHeader>
      <CardContent className="max-h-[600px] overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No recent ingestion events
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Connect a source to see data flow
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-md text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {getIcon(event.itemType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {event.connectorId}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
