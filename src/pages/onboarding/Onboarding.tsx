import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../lib/auth';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Check, ArrowRight, ArrowLeft, Building2, X, Plus } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

interface CompanyDetails {
  name: string;
  website: string;
  industry: string;
  size: string;
  country: string;
  city: string;
  about: string;
}

interface OnlinePresence {
  socialProfiles: Array<{ platform: string; url: string }>;
  email: string;
  phone: string;
  address: string;
}

interface BrandAssets {
  logoUrl: string;
  documents: string[];
}

interface Service {
  name: string;
  description: string;
}

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, organization, refreshOrganization } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
    name: '',
    website: '',
    industry: '',
    size: '',
    country: '',
    city: '',
    about: '',
  });

  const [onlinePresence, setOnlinePresence] = useState<OnlinePresence>({
    socialProfiles: [],
    email: '',
    phone: '',
    address: '',
  });

  const [brandAssets, setBrandAssets] = useState<BrandAssets>({
    logoUrl: '',
    documents: [],
  });

  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    if (organization?.onboarding_completed) {
      navigate('/dashboard');
      return;
    }

    const loadProgress = async () => {
      if (user) {
        const progress = await authService.getOnboardingProgress(user.id);
        if (progress) {
          setCurrentStep(progress.current_step as Step);
          if (progress.step_data) {
            const data = progress.step_data;
            if (data.companyDetails) setCompanyDetails(data.companyDetails);
            if (data.onlinePresence) setOnlinePresence(data.onlinePresence);
            if (data.brandAssets) setBrandAssets(data.brandAssets);
            if (data.services) setServices(data.services);
          }
        }
      }
    };

    loadProgress();
  }, [user, organization, navigate]);

  const saveProgress = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await authService.saveOnboardingProgress(user.id, currentStep, {
        companyDetails,
        onlinePresence,
        brandAssets,
        services,
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    await saveProgress();

    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as Step);
    } else {
      await handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleSaveAndExit = async () => {
    await saveProgress();
    navigate('/dashboard');
  };

  const handleComplete = async () => {
    if (!user || !organization) return;

    setLoading(true);
    try {
      await authService.updateOrganization(organization.id, {
        name: companyDetails.name,
        website: companyDetails.website,
        industry: companyDetails.industry,
        size: companyDetails.size,
        country: companyDetails.country,
        city: companyDetails.city,
        about: companyDetails.about,
        logo_url: brandAssets.logoUrl,
      });

      await authService.completeOnboarding(organization.id);
      await refreshOrganization();

      navigate('/dashboard?welcome=true');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      alert('Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addSocialProfile = () => {
    setOnlinePresence(prev => ({
      ...prev,
      socialProfiles: [...prev.socialProfiles, { platform: '', url: '' }],
    }));
  };

  const removeSocialProfile = (index: number) => {
    setOnlinePresence(prev => ({
      ...prev,
      socialProfiles: prev.socialProfiles.filter((_, i) => i !== index),
    }));
  };

  const addService = () => {
    setServices(prev => [...prev, { name: '', description: '' }]);
  };

  const removeService = (index: number) => {
    setServices(prev => prev.filter((_, i) => i !== index));
  };

  const steps = [
    { number: 1, title: 'Company Details', description: 'Basic information' },
    { number: 2, title: 'Online Presence', description: 'Social & contacts' },
    { number: 3, title: 'Brand Assets', description: 'Logo & documents' },
    { number: 4, title: 'Services', description: 'What you offer' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Company Knowledge Base Setup</h1>
          <p className="text-muted-foreground">Help us understand your company better</p>
        </div>

        <div className="flex items-center justify-center mb-8 overflow-x-auto pb-4">
          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                      currentStep > step.number
                        ? 'bg-primary border-primary text-white'
                        : currentStep === step.number
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    {currentStep > step.number ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="font-semibold">{step.number}</span>
                    )}
                  </div>
                  <div className="hidden md:block text-left">
                    <p
                      className={`text-sm font-medium ${
                        currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 w-12 md:w-24 transition-colors ${
                      currentStep > step.number ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-foreground">Company Details</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={companyDetails.name}
                      onChange={(e) =>
                        setCompanyDetails(prev => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Acme Corporation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={companyDetails.website}
                      onChange={(e) =>
                        setCompanyDetails(prev => ({ ...prev, website: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="https://acme.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Industry
                    </label>
                    <select
                      value={companyDetails.industry}
                      onChange={(e) =>
                        setCompanyDetails(prev => ({ ...prev, industry: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select industry</option>
                      <option value="Technology">Technology</option>
                      <option value="Finance">Finance</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Retail">Retail</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Consulting">Consulting</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Company Size
                    </label>
                    <select
                      value={companyDetails.size}
                      onChange={(e) =>
                        setCompanyDetails(prev => ({ ...prev, size: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="500+">500+ employees</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={companyDetails.country}
                      onChange={(e) =>
                        setCompanyDetails(prev => ({ ...prev, country: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="United States"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={companyDetails.city}
                      onChange={(e) =>
                        setCompanyDetails(prev => ({ ...prev, city: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="San Francisco"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    About Your Company
                  </label>
                  <textarea
                    value={companyDetails.about}
                    onChange={(e) =>
                      setCompanyDetails(prev => ({ ...prev, about: e.target.value }))
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Brief description of what your company does..."
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-foreground">Online Presence & Contacts</h2>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-foreground">
                      Social Profiles
                    </label>
                    <Button variant="outline" size="sm" onClick={addSocialProfile}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Profile
                    </Button>
                  </div>
                  {onlinePresence.socialProfiles.map((profile, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <select
                        value={profile.platform}
                        onChange={(e) => {
                          const newProfiles = [...onlinePresence.socialProfiles];
                          newProfiles[index].platform = e.target.value;
                          setOnlinePresence(prev => ({ ...prev, socialProfiles: newProfiles }));
                        }}
                        className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Platform</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="twitter">Twitter/X</option>
                        <option value="facebook">Facebook</option>
                        <option value="instagram">Instagram</option>
                        <option value="youtube">YouTube</option>
                      </select>
                      <input
                        type="url"
                        value={profile.url}
                        onChange={(e) => {
                          const newProfiles = [...onlinePresence.socialProfiles];
                          newProfiles[index].url = e.target.value;
                          setOnlinePresence(prev => ({ ...prev, socialProfiles: newProfiles }));
                        }}
                        className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="https://..."
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSocialProfile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={onlinePresence.email}
                      onChange={(e) =>
                        setOnlinePresence(prev => ({ ...prev, email: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="contact@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={onlinePresence.phone}
                      onChange={(e) =>
                        setOnlinePresence(prev => ({ ...prev, phone: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Office Address
                  </label>
                  <textarea
                    value={onlinePresence.address}
                    onChange={(e) =>
                      setOnlinePresence(prev => ({ ...prev, address: e.target.value }))
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="123 Main St, Suite 100, City, State 12345"
                  />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-foreground">Brand Assets</h2>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Company Logo URL
                  </label>
                  <input
                    type="url"
                    value={brandAssets.logoUrl}
                    onChange={(e) =>
                      setBrandAssets(prev => ({ ...prev, logoUrl: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enter a direct URL to your company logo
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Company Documents
                  </label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Document upload will be available after onboarding
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">Services Offered</h2>
                  <Button variant="outline" size="sm" onClick={addService}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Service
                  </Button>
                </div>

                {services.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <p className="text-muted-foreground mb-4">No services added yet</p>
                    <Button variant="outline" onClick={addService}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Service
                    </Button>
                  </div>
                ) : (
                  services.map((service, index) => (
                    <div key={index} className="border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <input
                          type="text"
                          value={service.name}
                          onChange={(e) => {
                            const newServices = [...services];
                            newServices[index].name = e.target.value;
                            setServices(newServices);
                          }}
                          className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Service name"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeService(index)}
                          className="ml-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <textarea
                        value={service.description}
                        onChange={(e) => {
                          const newServices = [...services];
                          newServices[index].description = e.target.value;
                          setServices(newServices);
                        }}
                        rows={2}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Brief description of this service"
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1 || loading}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSaveAndExit}
                  disabled={loading || saving}
                >
                  {saving ? 'Saving...' : 'Save & Exit'}
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                Step {currentStep} of 4
              </div>

              <Button
                variant="primary"
                onClick={handleNext}
                disabled={loading || saving}
                className="gap-2"
              >
                {currentStep === 4 ? (
                  loading ? 'Completing...' : 'Complete Setup'
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
