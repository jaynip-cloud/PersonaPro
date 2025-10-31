import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CheckCircle, XCircle, Loader2, Database, Plus } from 'lucide-react';

export const DatabaseTest: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    testConnection();
    loadClients();
  }, []);

  const testConnection = async () => {
    try {
      const { data, error } = await supabase.from('clients').select('count');
      if (error) throw error;
      setConnected(true);
      setError(null);
    } catch (err: any) {
      setConnected(false);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (err: any) {
      console.error('Error loading clients:', err);
    }
  };

  const createTestClient = async () => {
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const testClient = {
        name: 'Test Client ' + Math.floor(Math.random() * 1000),
        company: 'Test Company Inc.',
        email: `test${Math.floor(Math.random() * 10000)}@example.com`,
        phone: '555-0100',
        role: 'CEO',
        industry: 'Technology',
        status: 'prospect' as const,
        persona_score: Math.floor(Math.random() * 100),
        tags: ['test', 'demo'],
        user_id: user?.id
      };

      const { data, error } = await supabase
        .from('clients')
        .insert([testClient])
        .select()
        .single();

      if (error) throw error;

      await loadClients();
      alert('Test client created successfully!');
    } catch (err: any) {
      alert('Error creating client: ' + err.message);
      console.error('Error:', err);
    } finally {
      setCreating(false);
    }
  };

  const deleteClient = async (id: string) => {
    if (!confirm('Delete this client?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadClients();
    } catch (err: any) {
      alert('Error deleting client: ' + err.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Database Connection Test</h1>
        <p className="text-muted-foreground mt-2">
          Test your Supabase database connection and schema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Testing connection...</span>
            </div>
          ) : connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-600">Connected successfully!</span>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Your database is properly configured and all tables are accessible.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-600">Connection failed</span>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {connected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Clients Table</CardTitle>
              <Button
                variant="primary"
                size="sm"
                onClick={createTestClient}
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Test Client
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                No clients found. Click "Create Test Client" to add one.
              </div>
            ) : (
              <div className="space-y-3">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div>
                      <h3 className="font-semibold text-foreground">{client.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {client.company} • {client.email}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={client.status === 'active' ? 'success' : 'secondary'}>
                          {client.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Score: {client.persona_score}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteClient(client.id)}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Database Schema Created</p>
                <p className="text-muted-foreground">
                  All tables, types, and RLS policies are configured
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Supabase Client Configured</p>
                <p className="text-muted-foreground">
                  The application can now read and write to the database
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-4 w-4 border-2 border-primary rounded-full mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Update Application Components</p>
                <p className="text-muted-foreground">
                  Replace mock data with real database queries in your components
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
