import React, { useState } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Info, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Connector } from '../../types';

interface ConnectorCardProps {
  connector: Connector;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
  isSyncing: boolean;
}

export const ConnectorCard: React.FC<ConnectorCardProps> = ({
  connector,
  onConnect,
  onDisconnect,
  onSync,
  isSyncing
}) => {
  const [showMapping, setShowMapping] = useState(false);

  const getStatusBadge = () => {
    switch (connector.status) {
      case 'connected':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Connected
          </Badge>
        );
      case 'connecting':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Connecting...
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">Not Connected</Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <Card
      hover
      className={`transition-all ${
        connector.status === 'error' ? 'border-destructive' : ''
      } ${connector.status === 'not_connected' ? 'opacity-80' : ''}`}
    >
      <CardContent className="p-6 pt-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
              <img
                src={connector.logo}
                alt={`${connector.name} logo`}
                className="w-10 h-10 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-lg font-bold text-muted-foreground">
                {connector.name.substring(0, 2).toUpperCase()}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                {connector.name}
                {connector.isPriority && (
                  <Badge variant="warning" className="text-xs">Priority</Badge>
                )}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {connector.description}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowMapping(!showMapping)}
            className="p-1 hover:bg-accent rounded-md transition-colors"
            aria-label="View field mapping"
          >
            <Info className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {showMapping && (
          <div className="mb-4 p-3 bg-muted rounded-md text-xs">
            <p className="font-medium mb-2">Field Mapping:</p>
            <div className="space-y-1">
              {Object.entries(connector.fieldMapping).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground font-mono">{key}</span>
                  <span className="text-foreground">→ {value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1 mb-4">
          {connector.dataTypes.map((type) => (
            <Badge key={type} variant="secondary" className="text-xs">
              {type}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {connector.status === 'connected' && connector.itemsCount !== undefined && (
              <span className="text-xs text-muted-foreground">
                {connector.itemsCount} items
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {connector.status === 'connected' && (
              <>
                {connector.lastSynced && (
                  <span className="text-xs text-muted-foreground">
                    {formatDate(connector.lastSynced)}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onSync}
                  disabled={isSyncing || connector.status === 'connecting'}
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    'Sync Now'
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDisconnect}
                >
                  Disconnect
                </Button>
              </>
            )}
            {connector.status === 'not_connected' && (
              <Button
                size="sm"
                variant="primary"
                onClick={onConnect}
              >
                Connect
              </Button>
            )}
            {connector.status === 'error' && (
              <Button
                size="sm"
                variant="destructive"
                onClick={onConnect}
              >
                Retry
              </Button>
            )}
          </div>
        </div>

        {connector.status === 'error' && connector.errorMessage && (
          <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-xs text-destructive">{connector.errorMessage}</p>
          </div>
        )}

        {connector.status === 'connecting' && (
          <div className="mt-3">
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-pulse" style={{ width: '70%' }} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
