import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Check, ArrowRight, ArrowLeft, Sparkles, X, Upload } from 'lucide-react';

type Step = 1 | 2 | 3;

interface FormData {
  companyName: string;
  website: string;
  industry: string;
  size: string;
  country: string;
  city: string;
  about: string;
  primaryContactName: string;
  primaryContactEmail: string;
  socialProfiles: Array<{ platform: string; url: string }>;
  contacts: Array<{ type: string; email: string; phone: string; address: string }>;
  services: Array<{ name: string; description: string; tags: string[] }>;
  logoFile: File | null;
  documents: File[];
}

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, organization, refreshOrganization } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiWebsite, setAiWebsite] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    website: '',
    industry: '',
    size: '',
    country: '',
    city: '',
    about: '',
    primaryContactName: '',
    primaryContactEmail: '',
    socialProfiles: [],
    contacts: [{ type: 'support', email: '', phone: '', address: '' }],
    services: [],
    logoFile: null,
    documents: [],
  });

  useEffect(() => {
    if (!user || !organization) {
      navigate('/auth/signin');
      return;
    }

    const loadOnboardingState = async () => {
      const state = await authService.getOnboardingState(user.id, organization.id);
      if (state) {
        setCurrentStep(state.current_step as Step);
        if (state.step_1_data) {
          setFormData((prev) => ({ ...prev, ...state.step_1_data }));
        }
      }
    };

    loadOnboardingState();
  }, [user, organization, navigate]);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAIPrefill = async () => {
    if (!aiWebsite) return;

    setAiLoading(true);
    try {
      const session = await authService.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-prefill`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            website_url: aiWebsite,
            target: 'company',
          }),
        }
      );

      const result = await response.json();
      if (result.success && result.data) {
        setFormData((prev) => ({
          ...prev,
          companyName: result.data.name || prev.companyName,
          website: result.data.website || prev.website,
          industry: result.data.industry || prev.industry,
          size: result.data.size || prev.size,
          country: result.data.country || prev.country,
          city: result.data.city || prev.city,
          about: result.data.about || prev.about,
          primaryContactName: result.data.primary_contact_name || prev.primaryContactName,
          primaryContactEmail: result.data.primary_contact_email || prev.primaryContactEmail,
          socialProfiles: result.data.social_profiles || prev.socialProfiles,
          services: result.data.services || prev.services,
        }));
        setShowAIModal(false);
        alert('Company data prefilled successfully!');
      }
    } catch (error) {
      console.error('AI prefill error:', error);
      alert('Failed to prefill data. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const saveStepData = async (step: Step) => {
    if (!user || !organization) return;

    const stepData = {
      [`step_${step}_data`]: formData,
      [`step_${step}_completed`]: true,
    };

    await authService.updateOnboardingState(user.id, organization.id, stepData);
  };

  const handleNext = async () => {
    await saveStepData(currentStep);

    if (currentStep < 3) {
      const nextStep = (currentStep + 1) as Step;
      setCurrentStep(nextStep);
      if (user && organization) {
        await authService.updateOnboardingState(user.id, organization.id, {
          current_step: nextStep,
        });
      }
    } else {
      await handleFinishOnboarding();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleFinishOnboarding = async () => {
    if (!user || !organization) return;

    setLoading(true);
    try {
      await supabase.from('organizations').update({
        name: formData.companyName,
        website: formData.website,
        industry: formData.industry,
        size: formData.size,
        country: formData.country,
        city: formData.city,
        about: formData.about,
        primary_contact_name: formData.primaryContactName,
        primary_contact_email: formData.primaryContactEmail,
      }).eq('id', organization.id);

      if (formData.socialProfiles.length > 0) {
        await supabase.from('org_social_profiles').insert(
          formData.socialProfiles.map((profile) => ({
            org_id: organization.id,
            platform: profile.platform,
            url: profile.url,
          }))
        );
      }

      if (formData.contacts.length > 0) {
        await supabase.from('org_contacts').insert(
          formData.contacts.filter((c) => c.email || c.phone).map((contact) => ({
            org_id: organization.id,
            type: contact.type,
            email: contact.email,
            phone: contact.phone,
            address: contact.address,
          }))
        );
      }

      if (formData.services.length > 0) {
        await supabase.from('org_services').insert(
          formData.services.map((service) => ({
            org_id: organization.id,
            name: service.name,
            description: service.description,
            tags: service.tags,
          }))
        );
      }

      await authService.completeOnboarding(organization.id);
      await refreshOrganization();

      navigate('/dashboard?onboarding=complete');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addSocialProfile = () => {
    setFormData((prev) => ({
      ...prev,
      socialProfiles: [...prev.socialProfiles, { platform: '', url: '' }],
    }));
  };

  const removeSocialProfile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      socialProfiles: prev.socialProfiles.filter((_, i) => i !== index),
    }));
  };

  const addContact = () => {
    setFormData((prev) => ({
      ...prev,
      contacts: [...prev.contacts, { type: 'general', email: '', phone: '', address: '' }],
    }));
  };

  const removeContact = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index),
    }));
  };

  const addService = () => {
    setFormData((prev) => ({
      ...prev,
      services: [...prev.services, { name: '', description: '', tags: [] }],
    }));
  };

  const removeService = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }));
  };

  const steps = [
    { number: 1, title: 'Company Basics', description: 'Tell us about your company' },
    { number: 2, title: 'Presence & Contacts', description: 'How to reach you' },
    { number: 3, title: 'Documents & Services', description: 'What you offer' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome! Let's set up your company</h1>
          <p className="text-muted-foreground">This will only take a few minutes</p>
        </div>

        <div className="flex items-center justify-center mb-8">
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
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">Company Basics</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowAIModal(true)}
                  >
                    <Sparkles className="h-4 w-4" />
                    Use AI to Prefill
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Acme Corporation"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="https://acme.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Industry
                    </label>
                    <select
                      value={formData.industry}
                      onChange={(e) => handleInputChange('industry', e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                      value={formData.size}
                      onChange={(e) => handleInputChange('size', e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="United States"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="San Francisco"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    About Your Company
                  </label>
                  <textarea
                    value={formData.about}
                    onChange={(e) => handleInputChange('about', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Brief description of what your company does..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Primary Contact Name
                    </label>
                    <input
                      type="text"
                      value={formData.primaryContactName}
                      onChange={(e) => handleInputChange('primaryContactName', e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Primary Contact Email
                    </label>
                    <input
                      type="email"
                      value={formData.primaryContactEmail}
                      onChange={(e) => handleInputChange('primaryContactEmail', e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="john@acme.com"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-foreground">Presence & Contacts</h2>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-foreground">
                      Social Profiles
                    </label>
                    <Button variant="outline" size="sm" onClick={addSocialProfile}>
                      Add Profile
                    </Button>
                  </div>
                  {formData.socialProfiles.map((profile, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <select
                        value={profile.platform}
                        onChange={(e) => {
                          const newProfiles = [...formData.socialProfiles];
                          newProfiles[index].platform = e.target.value;
                          handleInputChange('socialProfiles', newProfiles);
                        }}
                        className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Platform</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="twitter">Twitter/X</option>
                        <option value="youtube">YouTube</option>
                        <option value="instagram">Instagram</option>
                        <option value="facebook">Facebook</option>
                      </select>
                      <input
                        type="url"
                        value={profile.url}
                        onChange={(e) => {
                          const newProfiles = [...formData.socialProfiles];
                          newProfiles[index].url = e.target.value;
                          handleInputChange('socialProfiles', newProfiles);
                        }}
                        className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-foreground">
                      Additional Contacts
                    </label>
                    <Button variant="outline" size="sm" onClick={addContact}>
                      Add Contact
                    </Button>
                  </div>
                  {formData.contacts.map((contact, index) => (
                    <div key={index} className="border border-border rounded-lg p-4 mb-3">
                      <div className="flex items-center justify-between mb-3">
                        <select
                          value={contact.type}
                          onChange={(e) => {
                            const newContacts = [...formData.contacts];
                            newContacts[index].type = e.target.value;
                            handleInputChange('contacts', newContacts);
                          }}
                          className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="support">Support</option>
                          <option value="sales">Sales</option>
                          <option value="general">General</option>
                        </select>
                        {index > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeContact(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="email"
                          value={contact.email}
                          onChange={(e) => {
                            const newContacts = [...formData.contacts];
                            newContacts[index].email = e.target.value;
                            handleInputChange('contacts', newContacts);
                          }}
                          className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Email"
                        />
                        <input
                          type="tel"
                          value={contact.phone}
                          onChange={(e) => {
                            const newContacts = [...formData.contacts];
                            newContacts[index].phone = e.target.value;
                            handleInputChange('contacts', newContacts);
                          }}
                          className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Phone"
                        />
                      </div>
                      <input
                        type="text"
                        value={contact.address}
                        onChange={(e) => {
                          const newContacts = [...formData.contacts];
                          newContacts[index].address = e.target.value;
                          handleInputChange('contacts', newContacts);
                        }}
                        className="w-full mt-3 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Address"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-foreground">Documents & Services</h2>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Company Logo
                  </label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Click to upload or drag and drop
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleInputChange('logoFile', e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label htmlFor="logo-upload">
                      <Button variant="outline" size="sm" as="span" className="cursor-pointer">
                        Choose File
                      </Button>
                    </label>
                    {formData.logoFile && (
                      <p className="text-sm text-foreground mt-2">{formData.logoFile.name}</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-foreground">
                      Services Offered
                    </label>
                    <Button variant="outline" size="sm" onClick={addService}>
                      Add Service
                    </Button>
                  </div>
                  {formData.services.map((service, index) => (
                    <div key={index} className="border border-border rounded-lg p-4 mb-3">
                      <div className="flex items-center justify-between mb-3">
                        <input
                          type="text"
                          value={service.name}
                          onChange={(e) => {
                            const newServices = [...formData.services];
                            newServices[index].name = e.target.value;
                            handleInputChange('services', newServices);
                          }}
                          className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                          const newServices = [...formData.services];
                          newServices[index].description = e.target.value;
                          handleInputChange('services', newServices);
                        }}
                        rows={2}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Brief description"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="text-sm text-muted-foreground">
                Step {currentStep} of 3
              </div>

              <Button
                variant="primary"
                onClick={handleNext}
                disabled={loading}
                className="gap-2"
              >
                {currentStep === 3 ? (
                  loading ? 'Finishing...' : 'Finish'
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

      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">AI Prefill from Website</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowAIModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Enter your company website and we'll extract relevant information
              </p>
              <input
                type="url"
                value={aiWebsite}
                onChange={(e) => setAiWebsite(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary mb-4"
                placeholder="https://yourcompany.com"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAIModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAIPrefill}
                  disabled={!aiWebsite || aiLoading}
                  className="flex-1 gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {aiLoading ? 'Extracting...' : 'Prefill Data'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
