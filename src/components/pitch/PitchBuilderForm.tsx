import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Client, PitchGeneratorInput } from '../../types';
import { Sparkles } from 'lucide-react';

interface PitchBuilderFormProps {
  clients: Client[];
  onGenerate: (input: PitchGeneratorInput) => void;
  isGenerating: boolean;
  initialClientId?: string;
  projectTitle?: string;
  projectDescription?: string;
}

export const PitchBuilderForm: React.FC<PitchBuilderFormProps> = ({
  clients,
  onGenerate,
  isGenerating,
  initialClientId,
  projectTitle,
  projectDescription
}) => {
  // Set default client: use initialClientId if provided, otherwise use first client
  const getDefaultClientId = () => {
    if (initialClientId) return initialClientId;
    if (clients.length > 0) return clients[0].id;
    return '';
  };

  // Auto-populate services from project title
  const getDefaultServices = () => {
    if (projectTitle) {
      // Use project title as a service
      return [projectTitle];
    }
    return [];
  };

  const [selectedClientId, setSelectedClientId] = useState(getDefaultClientId());
  const [services] = useState<string[]>(getDefaultServices());
  const [projectDesc, setProjectDesc] = useState(
    projectDescription || ''
  );
  const [tone, setTone] = useState<'formal' | 'casual'>('formal');
  const [length, setLength] = useState<'short' | 'long'>('short');

  React.useEffect(() => {
    const defaultId = getDefaultClientId();
    if (defaultId && defaultId !== selectedClientId) {
      setSelectedClientId(defaultId);
    }
  }, [initialClientId, clients]);

  React.useEffect(() => {
    // Update description when project description changes
    if (projectDescription) {
      setProjectDesc(projectDescription);
    }
  }, [projectDescription]);


  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleGenerate = () => {
    console.log('handleGenerate in form called');
    console.log('selectedClientId:', selectedClientId);
    console.log('services:', services);
    console.log('canGenerate:', canGenerate);

    if (!selectedClientId || services.length === 0) {
      console.log('Validation failed - missing client or services');
      return;
    }

    console.log('Calling onGenerate with:', {
      clientId: selectedClientId,
      services,
      companyDescription: projectDesc,
      tone,
      length
    });

    onGenerate({
      clientId: selectedClientId,
      services,
      companyDescription: projectDesc,
      tone,
      length
    });
  };

  const canGenerate = selectedClientId && services.length > 0 && !isGenerating;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Build Your Pitch</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {selectedClient && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Selected Client
              </label>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium text-blue-900">{selectedClient.name}</p>
                <p className="text-xs text-blue-700">
                  {selectedClient.company} • {selectedClient.industry || selectedClient.role}
                </p>
              </div>
            </div>
          )}

          {services.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Services to Pitch
              </label>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium text-blue-900">{services[0]}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description of Project
            </label>
            <textarea
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
              placeholder="Describe the project..."
              className="w-full min-h-[100px] border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Tone
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTone('formal')}
                  className={`flex-1 py-2 px-4 rounded-md border transition-colors ${
                    tone === 'formal'
                      ? 'border-primary bg-primary text-white'
                      : 'border-border bg-background text-foreground hover:bg-accent'
                  }`}
                >
                  Formal
                </button>
                <button
                  onClick={() => setTone('casual')}
                  className={`flex-1 py-2 px-4 rounded-md border transition-colors ${
                    tone === 'casual'
                      ? 'border-primary bg-primary text-white'
                      : 'border-border bg-background text-foreground hover:bg-accent'
                  }`}
                >
                  Casual
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Length
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setLength('short')}
                  className={`flex-1 py-2 px-4 rounded-md border transition-colors ${
                    length === 'short'
                      ? 'border-primary bg-primary text-white'
                      : 'border-border bg-background text-foreground hover:bg-accent'
                  }`}
                >
                  Short
                </button>
                <button
                  onClick={() => setLength('long')}
                  className={`flex-1 py-2 px-4 rounded-md border transition-colors ${
                    length === 'long'
                      ? 'border-primary bg-primary text-white'
                      : 'border-border bg-background text-foreground hover:bg-accent'
                  }`}
                >
                  Long
                </button>
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Generating Pitch...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Generate Pitch
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
