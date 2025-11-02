import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Building2,
  Globe,
  Briefcase,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

interface OnboardingWizardProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ isOpen, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const { user, checkKnowledgeBaseStatus } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    industry: '',
    description: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    twitterUrl: '',
    services: [] as string[],
    serviceInput: ''
  });

  const totalSteps = 4;

  const steps = [
    { number: 1, title: 'Company Info', icon: Building2 },
    { number: 2, title: 'Contact Details', icon: Globe },
    { number: 3, title: 'Services', icon: Briefcase },
    { number: 4, title: 'Review', icon: CheckCircle }
  ];

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addService = () => {
    if (formData.serviceInput.trim()) {
      setFormData(prev => ({
        ...prev,
        services: [...prev.services, prev.serviceInput.trim()],
        serviceInput: ''
      }));
    }
  };

  const removeService = (index: number) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.companyName && formData.website;
      case 2:
        return formData.email;
      case 3:
        return formData.services.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const servicesJson = formData.services.map(name => ({
        id: `service-${Date.now()}-${Math.random()}`,
        name,
        description: '',
        tags: [],
        pricing: ''
      }));

      const { error } = await supabase
        .from('company_profiles')
        .update({
          company_name: formData.companyName,
          website: formData.website,
          industry: formData.industry,
          about: formData.description,
          email: formData.email,
          phone: formData.phone,
          linkedin_url: formData.linkedinUrl,
          twitter_url: formData.twitterUrl,
          services: JSON.stringify(servicesJson),
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await checkKnowledgeBaseStatus();
      onComplete();
      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Failed to complete setup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} size="xl" closeOnEscape={false} closeOnClickOutside={false}>
      <div className="p-6">
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-900">
            Welcome! Let's Set Up Your Profile
          </h2>
          <p className="text-center text-slate-600 mt-2">
            Complete these steps to unlock all features
          </p>
        </div>

        <div className="flex items-center justify-between mb-8 px-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isActive ? 'text-blue-600' : 'text-slate-500'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 mb-6 rounded transition-all ${
                      currentStep > step.number ? 'bg-green-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="min-h-[400px]">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Tell us about your company
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Name *
                </label>
                <Input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="e.g., TechSolutions Inc."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Website URL *
                </label>
                <Input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://yourcompany.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Industry
                </label>
                <Input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => handleChange('industry', e.target.value)}
                  placeholder="e.g., Technology, Healthcare, Finance"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Description
                </label>
                <textarea
                  className="w-full min-h-[100px] p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Brief description of what your company does..."
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                How can clients reach you?
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address *
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="contact@yourcompany.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  LinkedIn Profile
                </label>
                <Input
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={(e) => handleChange('linkedinUrl', e.target.value)}
                  placeholder="https://linkedin.com/company/yourcompany"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Twitter/X Profile
                </label>
                <Input
                  type="url"
                  value={formData.twitterUrl}
                  onChange={(e) => handleChange('twitterUrl', e.target.value)}
                  placeholder="https://twitter.com/yourcompany"
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                What services do you offer?
              </h3>

              <div className="flex gap-2">
                <Input
                  type="text"
                  value={formData.serviceInput}
                  onChange={(e) => handleChange('serviceInput', e.target.value)}
                  placeholder="Enter a service (e.g., AI Consulting)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addService();
                    }
                  }}
                />
                <Button variant="primary" onClick={addService} type="button">
                  Add
                </Button>
              </div>

              {formData.services.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No services added yet. Add at least one to continue.</p>
                </div>
              ) : (
                <div className="space-y-2 mt-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    Your Services ({formData.services.length})
                  </p>
                  {formData.services.map((service, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <span className="text-slate-900">{service}</span>
                      <button
                        onClick={() => removeService(index)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Review Your Information
              </h3>

              <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Company Info</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Name:</span> {formData.companyName}</p>
                    <p><span className="font-medium">Website:</span> {formData.website}</p>
                    {formData.industry && (
                      <p><span className="font-medium">Industry:</span> {formData.industry}</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Contact</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Email:</span> {formData.email}</p>
                    {formData.phone && (
                      <p><span className="font-medium">Phone:</span> {formData.phone}</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">
                    Services ({formData.services.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.services.map((service, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  By completing setup, you'll gain access to all features including the Dashboard,
                  Client Management, and AI-powered insights.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || saving}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < totalSteps ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleComplete}
              disabled={saving || !canProceed()}
            >
              {saving ? (
                'Completing...'
              ) : (
                <>
                  Complete Setup
                  <CheckCircle className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
