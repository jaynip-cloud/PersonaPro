import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Search, Filter, Plus, MoreVertical, Edit, Trash2, Eye, Users, FileText, Target } from 'lucide-react';
import { PitchGenerator } from './PitchGenerator';
import { GrowthOpportunities } from './GrowthOpportunities';

export const Clients: React.FC = () => {
  const { clients } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'list' | 'pitch' | 'opportunities'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'prospect'>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          client.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || client.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const tabs = [
    { id: 'list', label: 'Client List', icon: Users },
    { id: 'pitch', label: 'Pitch Generator', icon: FileText },
    { id: 'opportunities', label: 'Opportunities', icon: Target }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground mt-2">Manage and analyze your client relationships</p>
        </div>
        {activeTab === 'list' && (
          <Button variant="primary" onClick={() => navigate('/clients/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'list' && (
        <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                All
              </Button>
              <Button
                variant={filterStatus === 'active' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('active')}
              >
                Active
              </Button>
              <Button
                variant={filterStatus === 'prospect' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('prospect')}
              >
                Prospects
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="group relative p-6 rounded-xl border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-background to-muted/20"
              >
                <div className="flex items-center justify-between">
                  <div
                    onClick={() => navigate(`/clients/${client.id}`)}
                    className="flex items-center gap-4 flex-1 cursor-pointer"
                  >
                    <Avatar name={client.name} size="lg" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                        {client.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {client.company} • {client.role}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-1">Persona Score</p>
                      <p className="text-3xl font-bold text-primary">{client.personaScore}</p>
                    </div>

                    <div className="h-12 w-px bg-border" />

                    <Badge
                      variant={
                        client.status === 'active' ? 'success' :
                        client.status === 'prospect' ? 'warning' :
                        'secondary'
                      }
                      className="capitalize px-4 py-1.5 text-sm font-medium"
                    >
                      {client.status}
                    </Badge>

                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === client.id ? null : client.id);
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>

                      {openMenuId === client.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-0 top-full mt-2 w-48 bg-background border border-border rounded-lg shadow-lg z-20">
                            <div className="p-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/clients/${client.id}`);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2 text-foreground"
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/clients/${client.id}/edit`);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2 text-foreground"
                              >
                                <Edit className="h-4 w-4" />
                                Edit Client
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Are you sure you want to delete this client?')) {
                                    console.log('Delete client', client.id);
                                  }
                                  setOpenMenuId(null);
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
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      )}

      {activeTab === 'pitch' && <PitchGenerator />}

      {activeTab === 'opportunities' && <GrowthOpportunities />}
    </div>
  );
};
