import React, { useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { MapPin, Calendar, RefreshCw, ChevronDown, MoreVertical, Edit, Trash2, Phone, Mail } from 'lucide-react';
import { Client } from '../../types';
import { useNavigate } from 'react-router-dom';

interface ClientHeaderProps {
  client: Client;
  onRefreshData: () => void;
  isRefreshing: boolean;
  onEditClient?: () => void;
  onDeleteClient?: () => void;
}

export const ClientHeader: React.FC<ClientHeaderProps> = ({ client, onRefreshData, isRefreshing, onEditClient, onDeleteClient }) => {
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showCsmMenu, setShowCsmMenu] = useState(false);


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
                {client.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${client.phone}`} className="hover:text-foreground transition-colors">
                      {client.phone}
                    </a>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${client.email}`} className="hover:text-foreground transition-colors">
                      {client.email}
                    </a>
                  </div>
                )}
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
              variant="ghost"
              size="sm"
              onClick={onRefreshData}
              disabled={isRefreshing}
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>

            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              {showMoreMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMoreMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-background border border-border rounded-lg shadow-lg z-20">
                    <div className="p-2">
                      <button
                        onClick={() => {
                          if (onEditClient) onEditClient();
                          setShowMoreMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2 text-foreground"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Client
                      </button>
                      <button
                        onClick={() => {
                          if (onDeleteClient) onDeleteClient();
                          setShowMoreMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2 text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Client
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={client.status === 'active' ? 'success' : 'secondary'}>
            {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
          </Badge>
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
