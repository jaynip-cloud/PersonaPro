import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Plus, X } from 'lucide-react';

interface ServicesStepProps {
  data: any;
  onNext: (data: any) => Promise<void>;
  onBack: () => void;
  saving: boolean;
}

const COMMON_SERVICES = [
  'Strategy Consulting',
  'Digital Transformation',
  'Marketing & Advertising',
  'Software Development',
  'Data Analytics',
  'Cloud Services',
  'Cybersecurity',
  'Project Management',
  'Business Process Optimization',
  'Training & Development',
  'Financial Advisory',
  'Legal Services',
];

export const ServicesStep: React.FC<ServicesStepProps> = ({ data, onNext, onBack, saving }) => {
  const [services, setServices] = useState<string[]>(data?.services || []);
  const [customService, setCustomService] = useState('');

  const handleToggleService = (service: string) => {
    if (services.includes(service)) {
      setServices(services.filter((s) => s !== service));
    } else {
      setServices([...services, service]);
    }
  };

  const handleAddCustomService = () => {
    if (customService.trim() && !services.includes(customService.trim())) {
      setServices([...services, customService.trim()]);
      setCustomService('');
    }
  };

  const handleRemoveService = (service: string) => {
    setServices(services.filter((s) => s !== service));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onNext({ services });
  };

  const isValid = services.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">What Services Do You Offer?</h2>
        <p className="text-muted-foreground">
          Select or add the services your company provides to clients.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-3">
          Common Services
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {COMMON_SERVICES.map((service) => {
            const isSelected = services.includes(service);
            return (
              <button
                key={service}
                type="button"
                onClick={() => handleToggleService(service)}
                className={`px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                  isSelected
                    ? 'border-primary bg-blue-50 text-primary'
                    : 'border-border bg-background text-foreground hover:border-primary/50'
                }`}
              >
                {service}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Add Custom Service
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customService}
            onChange={(e) => setCustomService(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomService();
              }
            }}
            className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter a custom service"
          />
          <Button
            type="button"
            onClick={handleAddCustomService}
            variant="outline"
            disabled={!customService.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {services.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Selected Services ({services.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {services.map((service) => (
              <div
                key={service}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-900 rounded-full text-sm"
              >
                {service}
                <button
                  type="button"
                  onClick={() => handleRemoveService(service)}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button type="button" onClick={onBack} variant="outline">
          Back
        </Button>
        <Button type="submit" variant="primary" disabled={!isValid || saving}>
          {saving ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </form>
  );
};
