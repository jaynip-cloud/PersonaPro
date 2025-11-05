import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Plus, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

interface Opportunity {
  id: string;
  title: string;
  description: string;
  isAiGenerated: boolean;
  createdAt: string;
  convertedToProjectId?: string;
}

interface GrowthOpportunitiesProps {
  clientId: string;
  clientName: string;
}

export const GrowthOpportunities: React.FC<GrowthOpportunitiesProps> = ({ clientId, clientName }) => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOpportunity, setNewOpportunity] = useState({ title: '', description: '' });

  const handleAutoGenerate = async () => {
    setIsGenerating(true);

    setTimeout(() => {
      const aiOpportunity: Opportunity = {
        id: `opp-${Date.now()}`,
        title: 'Enterprise Support Package Upgrade',
        description: `Based on ${clientName}'s recent scaling needs and increased user load, recommend upgrading to enterprise support tier with dedicated support engineer.`,
        isAiGenerated: true,
        createdAt: new Date().toISOString(),
      };

      setOpportunities([aiOpportunity, ...opportunities]);
      setIsGenerating(false);
    }, 2000);
  };

  const handleManualCreate = () => {
    if (!newOpportunity.title || !newOpportunity.description) return;

    const manualOpportunity: Opportunity = {
      id: `opp-${Date.now()}`,
      title: newOpportunity.title,
      description: newOpportunity.description,
      isAiGenerated: false,
      createdAt: new Date().toISOString(),
    };

    setOpportunities([manualOpportunity, ...opportunities]);
    setNewOpportunity({ title: '', description: '' });
    setIsModalOpen(false);
  };

  const handleAddToProject = (opportunityId: string) => {
    setOpportunities(opportunities.map(opp =>
      opp.id === opportunityId
        ? { ...opp, convertedToProjectId: `project-${Date.now()}` }
        : opp
    ));
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
          {opportunities.length === 0 ? (
            <div className="text-center py-8">
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
                    opp.convertedToProjectId
                      ? 'border-green-200 bg-green-50'
                      : 'border-border bg-background'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-foreground">{opp.title}</h4>
                        {opp.isAiGenerated && (
                          <Badge variant="outline" size="sm" className="flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            AI
                          </Badge>
                        )}
                        {opp.convertedToProjectId && (
                          <Badge variant="success" size="sm">
                            Converted to Project
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{opp.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Created {new Date(opp.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {!opp.convertedToProjectId && (
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
