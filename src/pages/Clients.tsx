import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Search, Plus, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Clients: React.FC = () => {
  const { clients, refreshClients } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          client.company.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleDeleteClient = async (clientId: string) => {
    if (!user) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this client? This action cannot be undone.');
    if (!confirmDelete) return;

    setDeleting(clientId);
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('user_id', user.id);

      if (error) throw error;

      await refreshClients();
      alert('Client deleted successfully');
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client. Please try again.');
    } finally {
      setDeleting(null);
      setOpenMenuId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground mt-2">Manage and analyze your client relationships</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/clients/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search clients by name or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No clients found</p>
              </div>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="group relative p-6 rounded-xl border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-background to-muted/20"
                >
                  <div className="flex items-center justify-between">
                    <div
                      onClick={() => navigate(`/clients/${client.id}`)}
                      className="flex items-center gap-4 flex-1 cursor-pointer"
                    >
                      <Avatar name={client.company || client.contact_name || client.name} size="lg" />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                          {client.company || client.contact_name || client.name}
                        </h3>
                        <div className="flex flex-col gap-1 mt-1">
                          {client.company && (client.contact_name || client.name) && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <span className="text-xs">👤</span>
                              {client.contact_name || client.name}
                            </p>
                          )}
                          {(client.location || client.founded) && (
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              {client.location && (
                                <span className="flex items-center gap-1">
                                  <span className="text-xs">📍</span>
                                  {client.location}
                                </span>
                              )}
                              {client.founded && (
                                <span className="flex items-center gap-1">
                                  <span className="text-xs">📅</span>
                                  Founded {client.founded}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground mb-1">Fit Score</p>
                        <p className="text-3xl font-bold text-primary">{client.personaScore || 0}</p>
                      </div>

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
                                    handleDeleteClient(client.id);
                                  }}
                                  disabled={deleting === client.id}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2 text-red-600 disabled:opacity-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  {deleting === client.id ? 'Deleting...' : 'Delete Client'}
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
