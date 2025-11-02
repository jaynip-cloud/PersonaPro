import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../context/OnboardingContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Building2, Globe, FileText, Briefcase, CheckCircle, Plus, X } from 'lucide-react';

export const Onboarding: React.FC = () => {
  const { companyProfile, updateCompanyProfile, completeOnboarding, isOnboardingComplete } = useOnboarding();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [step1Data, setStep1Data] = useState({
    company_name: '',
    website: '',
    industry: '',
    about: '',
  });

  const [step2Data, setStep2Data] = useState({
    email: '',
    phone: '',
    linkedin_url: '',
    twitter_url: '',
    facebook_url: '',
    instagram_url: '',
  });

  const [step3Data, setStep3Data] = useState({
    logo_url: '',
  });

  const [services, setServices] = useState<string[]>(['']);

  useEffect(() => {
    if (companyProfile) {
      setCurrentStep(companyProfile.onboarding_step || 1);
      setStep1Data({
        company_name: companyProfile.company_name || '',
        website: companyProfile.website || '',
        industry: companyProfile.industry || '',
        about: companyProfile.about || '',
      });
      setStep2Data({
        email: companyProfile.email || '',
        phone: companyProfile.phone || '',
        linkedin_url: companyProfile.linkedin_url || '',
        twitter_url: companyProfile.twitter_url || '',
        facebook_url: companyProfile.facebook_url || '',
        instagram_url: companyProfile.instagram_url || '',
      });
      setStep3Data({
        logo_url: companyProfile.logo_url || '',
      });
      if (companyProfile.services && Array.isArray(companyProfile.services) && companyProfile.services.length > 0) {
        setServices(companyProfile.services);
      }
    }
  }, [companyProfile]);

  const totalSteps = 4;

  const handleSaveAndContinue = async () => {
    setError('');
    setLoading(true);

    try {
      let dataToSave: any = { onboarding_step: currentStep + 1 };

      if (currentStep === 1) {
        if (!step1Data.company_name) {
          setError('Company name is required');
          setLoading(false);
          return;
        }
        dataToSave = { ...dataToSave, ...step1Data };
      } else if (currentStep === 2) {
        dataToSave = { ...dataToSave, ...step2Data };
      } else if (currentStep === 3) {
        dataToSave = { ...dataToSave, ...step3Data };
      } else if (currentStep === 4) {
        const filteredServices = services.filter(s => s.trim() !== '');
        dataToSave = { ...dataToSave, services: filteredServices };
      }

      const { error } = await updateCompanyProfile(dataToSave);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        await completeOnboarding();
        navigate('/app/dashboard');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndExit = async () => {
    setError('');
    setLoading(true);

    try {
      let dataToSave: any = { onboarding_step: currentStep };

      if (currentStep === 1) {
        dataToSave = { ...dataToSave, ...step1Data };
      } else if (currentStep === 2) {
        dataToSave = { ...dataToSave, ...step2Data };
      } else if (currentStep === 3) {
        dataToSave = { ...dataToSave, ...step3Data };
      } else if (currentStep === 4) {
        const filteredServices = services.filter(s => s.trim() !== '');
        dataToSave = { ...dataToSave, services: filteredServices };
      }

      const { error } = await updateCompanyProfile(dataToSave);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      navigate('/login');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addService = () => {
    setServices([...services, '']);
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (index: number, value: string) => {
    const newServices = [...services];
    newServices[index] = value;
    setServices(newServices);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Basic Company Details</h2>
              <p className="text-slate-600 mt-2">Tell us about your company</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={step1Data.company_name}
                onChange={(e) => setStep1Data({ ...step1Data, company_name: e.target.value })}
                placeholder="Acme Corporation"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Website
              </label>
              <Input
                value={step1Data.website}
                onChange={(e) => setStep1Data({ ...step1Data, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Industry
              </label>
              <Input
                value={step1Data.industry}
                onChange={(e) => setStep1Data({ ...step1Data, industry: e.target.value })}
                placeholder="Technology, Finance, Healthcare, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                About Your Company
              </label>
              <textarea
                value={step1Data.about}
                onChange={(e) => setStep1Data({ ...step1Data, about: e.target.value })}
                placeholder="Brief description of your company..."
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Online Presence & Contacts</h2>
              <p className="text-slate-600 mt-2">How can people reach you?</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <Input
                type="email"
                value={step2Data.email}
                onChange={(e) => setStep2Data({ ...step2Data, email: e.target.value })}
                placeholder="contact@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Phone
              </label>
              <Input
                type="tel"
                value={step2Data.phone}
                onChange={(e) => setStep2Data({ ...step2Data, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                LinkedIn URL
              </label>
              <Input
                value={step2Data.linkedin_url}
                onChange={(e) => setStep2Data({ ...step2Data, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/company/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Twitter URL
              </label>
              <Input
                value={step2Data.twitter_url}
                onChange={(e) => setStep2Data({ ...step2Data, twitter_url: e.target.value })}
                placeholder="https://twitter.com/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Facebook URL
              </label>
              <Input
                value={step2Data.facebook_url}
                onChange={(e) => setStep2Data({ ...step2Data, facebook_url: e.target.value })}
                placeholder="https://facebook.com/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Instagram URL
              </label>
              <Input
                value={step2Data.instagram_url}
                onChange={(e) => setStep2Data({ ...step2Data, instagram_url: e.target.value })}
                placeholder="https://instagram.com/..."
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Documents & Brand Assets</h2>
              <p className="text-slate-600 mt-2">Add your company logo and documents</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Logo URL
              </label>
              <Input
                value={step3Data.logo_url}
                onChange={(e) => setStep3Data({ ...step3Data, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-slate-500 mt-1">
                Provide a URL to your company logo image
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm text-slate-600">
                Additional company documents can be uploaded later from the Knowledge Base page
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Services You Offer</h2>
              <p className="text-slate-600 mt-2">What services does your company provide?</p>
            </div>

            <div className="space-y-3">
              {services.map((service, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={service}
                    onChange={(e) => updateService(index, e.target.value)}
                    placeholder={`Service ${index + 1}`}
                  />
                  {services.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeService(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addService}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Service
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-sm font-medium text-blue-600">
                {Math.round((currentStep / totalSteps) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}

          {renderStep()}

          <div className="flex gap-3 mt-8">
            <Button
              variant="outline"
              onClick={handleSaveAndExit}
              disabled={loading}
              className="flex-1"
            >
              Save & Exit
            </Button>
            <Button
              onClick={handleSaveAndContinue}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : currentStep === totalSteps ? 'Complete' : 'Save & Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
