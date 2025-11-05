import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Client, PitchGeneratorInput } from '../../types';
import { Sparkles } from 'lucide-react';

interface PitchBuilderFormProps {
  clients: Client[];
  onGenerate: (input: PitchGeneratorInput) => void;
  isGenerating: boolean;
  initialClientId?: string;
}

export const PitchBuilderForm: React.FC<PitchBuilderFormProps> = ({
  clients,
  onGenerate,
  isGenerating,
  initialClientId
}) => {
  const [selectedClientId, setSelectedClientId] = useState(initialClientId || '');
  const [services, setServices] = useState<string[]>([]);
  const [serviceInput, setServiceInput] = useState('');
  const [companyDescription, setCompanyDescription] = useState(
    'We are a leading technology consulting firm specializing in digital transformation and enterprise solutions.'
  );
  const [tone, setTone] = useState<'formal' | 'casual'>('formal');
  const [length, setLength] = useState<'short' | 'long'>('short');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  React.useEffect(() => {
    if (initialClientId) {
      const client = clients.find(c => c.id === initialClientId);
      if (client) {
        setSelectedClientId(initialClientId);
        setSearchTerm(`${client.name} - ${client.company}`);
      }
    }
  }, [initialClientId, clients]);

  const filteredClients = clients.filter(
    client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleClientSelect = (client: Client) => {
    setSelectedClientId(client.id);
    setSearchTerm(`${client.name} - ${client.company}`);
    setShowDropdown(false);
  };

  const handleAddService = () => {
    if (serviceInput.trim() && !services.includes(serviceInput.trim())) {
      setServices([...services, serviceInput.trim()]);
      setServiceInput('');
    }
  };

  const handleRemoveService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const handleGenerate = () => {
    if (!selectedClientId || services.length === 0) return;

    onGenerate({
      clientId: selectedClientId,
      services,
      companyDescription,
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
          <div className="relative">
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Client
            </label>
            <Input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              disabled={!!initialClientId}
            />
            {showDropdown && filteredClients.length > 0 && !initialClientId && (
              <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredClients.map(client => (
                  <button
                    key={client.id}
                    onClick={() => handleClientSelect(client)}
                    className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b border-border last:border-b-0"
                  >
                    <p className="font-medium text-foreground">{client.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {client.company} • {client.role}
                    </p>
                  </button>
                ))}
              </div>
            )}
            {selectedClient && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium text-blue-900">{selectedClient.name}</p>
                <p className="text-xs text-blue-700">
                  {selectedClient.company} • {selectedClient.industry}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Services to Pitch
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter service name..."
                value={serviceInput}
                onChange={(e) => setServiceInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddService();
                  }
                }}
              />
              <Button onClick={handleAddService} variant="outline">
                Add
              </Button>
            </div>
            {services.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {services.map((service, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    <span>{service}</span>
                    <button
                      onClick={() => handleRemoveService(index)}
                      className="hover:text-primary/70"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Company Description
            </label>
            <textarea
              value={companyDescription}
              onChange={(e) => setCompanyDescription(e.target.value)}
              placeholder="Describe your company..."
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
