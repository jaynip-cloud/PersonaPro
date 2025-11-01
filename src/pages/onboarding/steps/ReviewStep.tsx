import React from 'react';
import { Button } from '../../../components/ui/Button';
import { Building2, Briefcase, FileText, CheckCircle } from 'lucide-react';

interface ReviewStepProps {
  data: any;
  onBack: () => void;
  onComplete: () => Promise<void>;
  saving: boolean;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ data, onBack, onComplete, saving }) => {
  const { step1, step2, step3 } = data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Review Your Information</h2>
        <p className="text-muted-foreground">
          Take a moment to review everything before completing setup.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4 border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-foreground">Company Information</h3>
          </div>
          <div className="space-y-2 ml-11">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Company Name</p>
              <p className="text-foreground">{step1?.name || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">About</p>
              <p className="text-foreground">{step1?.about || 'Not provided'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Industry</p>
                <p className="text-foreground">{step1?.industry || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Company Size</p>
                <p className="text-foreground">{step1?.company_size || 'Not provided'}</p>
              </div>
            </div>
            {step1?.website && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Website</p>
                <a
                  href={step1.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {step1.website}
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Briefcase className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-foreground">Services Offered</h3>
          </div>
          <div className="ml-11">
            {step2?.services && step2.services.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {step2.services.map((service: string) => (
                  <span
                    key={service}
                    className="px-3 py-1 bg-green-100 text-green-900 rounded-full text-sm"
                  >
                    {service}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No services added</p>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-foreground">Case Studies</h3>
          </div>
          <div className="ml-11 space-y-3">
            {step3?.case_studies && step3.case_studies.length > 0 ? (
              step3.case_studies.map((caseStudy: any) => (
                <div key={caseStudy.id} className="bg-white p-3 rounded border border-border">
                  <h4 className="font-medium text-foreground">{caseStudy.title}</h4>
                  {caseStudy.client && (
                    <p className="text-sm text-muted-foreground">Client: {caseStudy.client}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">{caseStudy.description}</p>
                  {caseStudy.results && (
                    <p className="text-sm text-green-600 mt-1 font-medium">
                      Results: {caseStudy.results}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No case studies added</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900">Ready to Get Started?</p>
            <p className="text-sm text-blue-700 mt-1">
              By completing setup, you'll be able to start adding clients, generating insights,
              and leveraging AI-powered recommendations.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" onClick={onBack} variant="outline">
          Back
        </Button>
        <Button type="button" onClick={onComplete} variant="primary" disabled={saving}>
          {saving ? 'Completing Setup...' : 'Complete Setup'}
        </Button>
      </div>
    </div>
  );
};
