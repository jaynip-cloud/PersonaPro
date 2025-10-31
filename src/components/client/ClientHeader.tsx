import React, { useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { MapPin, Calendar, RefreshCw, ChevronDown, MoreVertical, Mail, Phone, Video, FileText } from 'lucide-react';
import { Client } from '../../types';

interface ClientHeaderProps {
  client: Client;
  onRefreshData: () => void;
  isRefreshing: boolean;
}

export const ClientHeader: React.FC<ClientHeaderProps> = ({ client, onRefreshData, isRefreshing }) => {
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showCsmMenu, setShowCsmMenu] = useState(false);

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'platinum': return 'text-slate-700 bg-slate-100 border-slate-300';
      case 'gold': return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'silver': return 'text-gray-600 bg-gray-100 border-gray-300';
      case 'bronze': return 'text-orange-700 bg-orange-100 border-orange-300';
      default: return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  const getHealthColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-background border-b border-border">
      <div className="px-6 py-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <Avatar name={client.company} size="2xl" src={client.avatar} />
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">{client.company}</h1>
                <Badge variant="outline" className="border-2">Agency</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {client.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{client.location}</span>
                  </div>
                )}
                {client.founded && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Founded {client.founded}</span>
                  </div>
                )}
                {client.csm && (
                  <div className="relative">
                    <button
                      onClick={() => setShowCsmMenu(!showCsmMenu)}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      <span>CSM: {client.csm}</span>
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {showCsmMenu && (
                      <div className="absolute top-full left-0 mt-2 w-48 bg-background border border-border rounded-lg shadow-lg z-10">
                        <div className="p-2">
                          <button className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded">Change CSM</button>
                          <button className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded">View CSM Profile</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshData}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>

            <div className="relative">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowQuickActions(!showQuickActions)}
              >
                Quick Actions
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
              {showQuickActions && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-background border border-border rounded-lg shadow-lg z-10">
                  <div className="p-2">
                    <button className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Send Email
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Schedule Call
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Start Meeting
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Create Proposal
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={client.status === 'active' ? 'success' : 'secondary'}>
            {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
          </Badge>
          {client.tier && (
            <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getTierColor(client.tier)}`}>
              {client.tier.charAt(0).toUpperCase() + client.tier.slice(1)} Tier
            </div>
          )}
          {client.healthScore !== undefined && (
            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
              <span className="text-xs font-medium text-muted-foreground">Health Score:</span>
              <div className="flex items-center gap-1">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getHealthColor(client.healthScore)} bg-current`}
                    style={{ width: `${client.healthScore}%` }}
                  />
                </div>
                <span className={`text-xs font-bold ${getHealthColor(client.healthScore)}`}>
                  {client.healthScore}%
                </span>
              </div>
            </div>
          )}
          {client.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};
