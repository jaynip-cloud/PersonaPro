import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { ClientFormData } from '../../pages/AddClient';

interface ClientOverviewProps {
  formData: ClientFormData;
  selectedModel: 'perplexity' | 'openai';
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
}

export const ClientOverview: React.FC<ClientOverviewProps> = ({
  formData,
  selectedModel,
  onBack,
  onSave,
  saving,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Review Client Information</h1>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Comparison
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Overview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Data source: {selectedModel === 'perplexity' ? 'Response 1' : 'Response 2'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Company</p>
                <p className="text-base">{formData.company || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Industry</p>
                <p className="text-base">{formData.industry || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Website</p>
                <p className="text-base">{formData.website || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Founded</p>
                <p className="text-base">{formData.founded || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Company Size</p>
                <p className="text-base">{formData.companySize || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Employee Count</p>
                <p className="text-base">{formData.employeeCount || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Location */}
          {(formData.city || formData.country) && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">City</p>
                  <p className="text-base">{formData.city || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Country</p>
                  <p className="text-base">{formData.country || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Zip Code</p>
                  <p className="text-base">{formData.zipCode || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Contact Information */}
          {(formData.contactName || formData.primaryEmail || formData.primaryPhone) && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact Name</p>
                  <p className="text-base">{formData.contactName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Job Title</p>
                  <p className="text-base">{formData.jobTitle || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-base">{formData.primaryEmail || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-base">{formData.primaryPhone || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Services */}
          {formData.services.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Services ({formData.services.length})</h3>
              <div className="space-y-2">
                {formData.services.map((service, index) => (
                  <div key={index} className="p-3 bg-muted rounded-md">
                    <p className="font-medium">{service.name}</p>
                    {service.description && (
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technologies */}
          {formData.technologies.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Technologies ({formData.technologies.length})</h3>
              <div className="flex flex-wrap gap-2">
                {formData.technologies.map((tech, index) => (
                  <div key={index} className="px-3 py-1 bg-muted rounded-md text-sm">
                    {tech.name} {tech.category && `(${tech.category})`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goals */}
          {(formData.shortTermGoals || formData.longTermGoals) && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Goals</h3>
              {formData.shortTermGoals && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Short-Term Goals</p>
                  <p className="text-base whitespace-pre-wrap">{formData.shortTermGoals}</p>
                </div>
              )}
              {formData.longTermGoals && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Long-Term Goals</p>
                  <p className="text-base whitespace-pre-wrap">{formData.longTermGoals}</p>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {formData.description && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Description</h3>
              <p className="text-base whitespace-pre-wrap">{formData.description}</p>
            </div>
          )}

          <div className="flex gap-4 pt-4 border-t">
            <Button
              variant="primary"
              onClick={onSave}
              disabled={saving}
              className="flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Add Client
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

