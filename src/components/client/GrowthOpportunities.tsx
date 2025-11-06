import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Plus, Sparkles, ArrowRight, Loader2, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Opportunity {
  id: string;
  title: string;
  description: string;
  is_ai_generated: boolean;
  created_at: string;
  converted_to_project_id?: string;
  ai_analysis?: {
    reasoning?: {
      clientNeed?: string;
      marketContext?: string;
      capabilityMatch?: string;
      timing?: string;
      valueProposition?: string;
    };
    estimatedValue?: string;
    urgency?: string;
    confidence?: string;
    recommendedApproach?: string;
    expectedBudgetRange?: string;
    successFactors?: string[];
  };
}

interface GrowthOpportunitiesProps {
  clientId: string;
  clientName: string;
}

export const GrowthOpportunities: React.FC<GrowthOpportunitiesProps> = ({ clientId, clientName }) => {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOpportunity, setNewOpportunity] = useState({ title: '', description: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && clientId) {
      loadOpportunities();
    }
  }, [user, clientId]);

  const loadOpportunities = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('client_id', clientId)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (err: any) {
      console.error('Error loading opportunities:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoGenerate = async () => {
    if (!user) return;

    setIsGenerating(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-growth-opportunities`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate opportunities');
      }

      const { opportunities: newOpportunities, analysisMetadata } = await response.json();

      setOpportunities([...newOpportunities, ...opportunities]);

      const message = `Generated ${newOpportunities.length} opportunities (Data Quality: ${analysisMetadata?.dataQuality || 'Unknown'})`;
      alert(message);
    } catch (err: any) {
      console.error('Error generating opportunities:', err);
      setError(err.message || 'Failed to generate opportunities');
      alert(err.message || 'Failed to generate opportunities');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualCreate = async () => {
    if (!newOpportunity.title || !newOpportunity.description || !user) return;

    try {
      const { data, error } = await supabase
        .from('opportunities')
        .insert({
          client_id: clientId,
          user_id: user.id,
          title: newOpportunity.title,
          description: newOpportunity.description,
          is_ai_generated: false,
        })
        .select()
        .single();

      if (error) throw error;

      setOpportunities([data, ...opportunities]);
      setNewOpportunity({ title: '', description: '' });
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error creating opportunity:', err);
      alert(err.message || 'Failed to create opportunity');
    }
  };

  const handleAddToProject = async (opportunityId: string) => {
    alert('Converting to project - this will be implemented in the project creation flow');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Growth Opportunities</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Auto-Generate
                  </>
                )}
              </Button>
              <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Opportunity
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Loading opportunities...</p>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                No opportunities yet. Use AI to identify potential growth areas or add manually.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {opportunities.map((opp) => (
                <div
                  key={opp.id}
                  className={`p-4 border rounded-lg ${
                    opp.converted_to_project_id
                      ? 'border-green-200 bg-green-50'
                      : 'border-border bg-background'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-foreground">{opp.title}</h4>
                        {opp.is_ai_generated && (
                          <Badge variant="outline" size="sm" className="flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            AI
                          </Badge>
                        )}
                        {opp.ai_analysis?.estimatedValue && (
                          <Badge variant="outline" size="sm">
                            Value: {opp.ai_analysis.estimatedValue}
                          </Badge>
                        )}
                        {opp.ai_analysis?.urgency === 'High' && (
                          <Badge variant="warning" size="sm">
                            High Urgency
                          </Badge>
                        )}
                        {opp.converted_to_project_id && (
                          <Badge variant="success" size="sm">
                            Converted to Project
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{opp.description}</p>

                      {opp.ai_analysis?.reasoning && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2">
                          {opp.ai_analysis.reasoning.clientNeed && (
                            <div>
                              <span className="text-xs font-medium text-foreground">Client Need: </span>
                              <span className="text-xs text-muted-foreground">{opp.ai_analysis.reasoning.clientNeed}</span>
                            </div>
                          )}
                          {opp.ai_analysis.reasoning.capabilityMatch && (
                            <div>
                              <span className="text-xs font-medium text-foreground">Solution: </span>
                              <span className="text-xs text-muted-foreground">{opp.ai_analysis.reasoning.capabilityMatch}</span>
                            </div>
                          )}
                          {opp.ai_analysis.reasoning.valueProposition && (
                            <div>
                              <span className="text-xs font-medium text-foreground">Value: </span>
                              <span className="text-xs text-muted-foreground">{opp.ai_analysis.reasoning.valueProposition}</span>
                            </div>
                          )}
                          {opp.ai_analysis.expectedBudgetRange && (
                            <div>
                              <span className="text-xs font-medium text-foreground">Budget: </span>
                              <span className="text-xs text-muted-foreground">{opp.ai_analysis.expectedBudgetRange}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground mt-2">
                        Created {new Date(opp.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {!opp.converted_to_project_id && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAddToProject(opp.id)}
                      >
                        Add to Project
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Growth Opportunity"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <Input
              value={newOpportunity.title}
              onChange={(e) => setNewOpportunity({ ...newOpportunity, title: e.target.value })}
              placeholder="e.g., Mobile App Development"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={newOpportunity.description}
              onChange={(e) => setNewOpportunity({ ...newOpportunity, description: e.target.value })}
              placeholder="Describe the opportunity..."
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleManualCreate}
              disabled={!newOpportunity.title || !newOpportunity.description}
            >
              Create Opportunity
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
