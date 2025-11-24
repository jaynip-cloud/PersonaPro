import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import {
  User,
  Building2,
  Phone,
  Mail,
  Globe,
  Tag,
  Plus,
  X,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Target,
  DollarSign,
  Smile,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Upload,
  FileText,
  Loader2
} from 'lucide-react';

interface FirstClientWizardProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

interface ExtractionStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  message?: string;
}

export const FirstClientWizard: React.FC<FirstClientWizardProps> = ({ isOpen, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [aiPrefilling, setAiPrefilling] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionSteps, setExtractionSteps] = useState<ExtractionStep[]>([
    { id: 'crawl', label: 'Crawling client website', status: 'pending' },
    { id: 'company', label: 'Extracting company details', status: 'pending' },
    { id: 'contact', label: 'Finding contact information', status: 'pending' },
    { id: 'social', label: 'Discovering social profiles', status: 'pending' },
    { id: 'business', label: 'Analyzing business goals', status: 'pending' },
    { id: 'finalize', label: 'Finalizing client data', status: 'pending' },
  ]);
  const { user } = useAuth();
  const { refreshClients } = useApp();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    company: '',
    website: '',
    industry: '',
    city: '',
    country: '',
    zipCode: '',
    founded: '',
    companySize: '',
    status: 'prospect' as 'active' | 'inactive' | 'prospect' | 'churned',
    csm: '',
    companyOverview: '',
    contactName: '',
    primaryEmail: '',
    alternateEmail: '',
    primaryPhone: '',
    alternatePhone: '',
    jobTitle: '',
    preferredContactMethod: 'email' as 'email' | 'phone',
    linkedinUrl: '',
    twitterUrl: '',
    instagramUrl: '',
    facebookUrl: '',
    logoUrl: '',
    budgetRange: '',
    tags: [] as string[],
    tagInput: '',
    description: '',
    shortTermGoals: '',
    longTermGoals: '',
    expectations: '',
    satisfactionScore: 0,
    satisfactionFeedback: '',
    uploadedDocuments: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const totalSteps = 5;

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateStepStatus = (stepId: string, status: ExtractionStep['status'], message?: string) => {
    setExtractionSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, status, message } : step
    ));
  };

  const simulateClientProgress = async () => {
    const steps = ['crawl', 'company', 'contact', 'social', 'business', 'finalize'];

    for (let i = 0; i < steps.length; i++) {
      const stepId = steps[i];
      updateStepStatus(stepId, 'in_progress');
      setExtractionProgress(((i + 0.5) / steps.length) * 100);

      await new Promise(resolve => setTimeout(resolve, 700 + Math.random() * 400));

      if (i < steps.length - 1) {
        updateStepStatus(stepId, 'completed');
        setExtractionProgress(((i + 1) / steps.length) * 100);
      }
    }
  };

  const handleAIPrefill = async () => {
    const urlToExtract = formData.website || formData.linkedinUrl;

    if (!urlToExtract || !user) return;

    setAiPrefilling(true);
    setExtractionProgress(0);
    setExtractionSteps(prev => prev.map(step => ({ ...step, status: 'pending' as const })));

    const progressPromise = simulateClientProgress();

    try {
      // Get user session token for proper authentication
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-company-data`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: urlToExtract })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('AI Prefill error:', errorData);
        alert(`AI Autofill failed: ${errorData.error || 'Unknown error'}`);
        setExtractionSteps(prev => prev.map(step =>
          step.status === 'in_progress'
            ? { ...step, status: 'error' as const, message: 'Failed' }
            : step
        ));
        return;
      }

      const data = await response.json();

      await progressPromise;

      updateStepStatus('finalize', 'completed');
      setExtractionProgress(100);

      if (data.success && data.data) {
        // Use functional update to ensure we're working with the latest state
        setFormData(prev => {
          const updates: any = {};

          // Only update fields that are empty or missing
          if (data.data.name && !prev.company?.trim()) {
            updates.company = data.data.name;
          }
          if (data.data.industry && !prev.industry?.trim()) {
            updates.industry = data.data.industry;
          }
          if (data.data.description && !prev.companyOverview?.trim()) {
            updates.companyOverview = data.data.description;
          }
          if (data.data.founded && !prev.founded?.trim()) {
            updates.founded = data.data.founded;
          }
          if (data.data.companySize && !prev.companySize?.trim()) {
            updates.companySize = data.data.companySize;
          }

          if (data.data.location?.city && !prev.city?.trim()) {
            updates.city = data.data.location.city;
          }
          if (data.data.location?.country && !prev.country?.trim()) {
            updates.country = data.data.location.country;
          }
          if (data.data.location?.zipCode && !prev.zipCode?.trim()) {
            updates.zipCode = data.data.location.zipCode;
          }

          if (data.data.contactInfo?.contactName && !prev.contactName?.trim()) {
            updates.contactName = data.data.contactInfo.contactName;
          }
          if (data.data.contactInfo?.jobTitle && !prev.jobTitle?.trim()) {
            updates.jobTitle = data.data.contactInfo.jobTitle;
          }
          if (data.data.contactInfo?.primaryEmail && !prev.primaryEmail?.trim()) {
            updates.primaryEmail = data.data.contactInfo.primaryEmail;
          }
          if (data.data.contactInfo?.alternateEmail && !prev.alternateEmail?.trim()) {
            updates.alternateEmail = data.data.contactInfo.alternateEmail;
          }
          if (data.data.contactInfo?.primaryPhone && !prev.primaryPhone?.trim()) {
            updates.primaryPhone = data.data.contactInfo.primaryPhone;
          }
          if (data.data.contactInfo?.alternatePhone && !prev.alternatePhone?.trim()) {
            updates.alternatePhone = data.data.contactInfo.alternatePhone;
          }

          if (data.data.businessInfo?.shortTermGoals && !prev.shortTermGoals?.trim()) {
            updates.shortTermGoals = data.data.businessInfo.shortTermGoals;
          }
          if (data.data.businessInfo?.longTermGoals && !prev.longTermGoals?.trim()) {
            updates.longTermGoals = data.data.businessInfo.longTermGoals;
          }
          if (data.data.businessInfo?.expectations && !prev.expectations?.trim()) {
            updates.expectations = data.data.businessInfo.expectations;
          }
          if (data.data.description && !prev.description?.trim()) {
            updates.description = data.data.description;
          }

          if (data.data.socialProfiles?.linkedin && !prev.linkedinUrl?.trim()) {
            updates.linkedinUrl = data.data.socialProfiles.linkedin;
          }
          if (data.data.socialProfiles?.twitter && !prev.twitterUrl?.trim()) {
            updates.twitterUrl = data.data.socialProfiles.twitter;
          }
          if (data.data.socialProfiles?.facebook && !prev.facebookUrl?.trim()) {
            updates.facebookUrl = data.data.socialProfiles.facebook;
          }
          if (data.data.socialProfiles?.instagram && !prev.instagramUrl?.trim()) {
            updates.instagramUrl = data.data.socialProfiles.instagram;
          }

          if (data.data.logo && !prev.logoUrl?.trim()) {
            updates.logoUrl = data.data.logo;
          }

          // Return updated state only if there are changes
          if (Object.keys(updates).length > 0) {
            // Store update count for alert
            const updateCount = Object.keys(updates).length;
            setTimeout(() => {
              alert(`Successfully populated ${updateCount} fields with company data!`);
            }, 100);
            return { ...prev, ...updates };
          }
          setTimeout(() => {
            alert('No new data found to populate. All fields are already filled or no data was available.');
          }, 100);
          return prev; // Return unchanged state
        });
      } else {
        alert('No company data could be extracted from the website.');
      }
    } catch (error) {
      console.error('AI Prefill error:', error);
      setExtractionSteps(prev => prev.map(step =>
        step.status === 'in_progress'
          ? { ...step, status: 'error' as const, message: 'Failed' }
          : step
      ));
      alert('AI Autofill encountered an error. Please try again or fill in manually.');
    } finally {
      setAiPrefilling(false);
      setTimeout(() => {
        setExtractionProgress(0);
        setExtractionSteps(prev => prev.map(step => ({ ...step, status: 'pending' as const, message: undefined })));
      }, 3000);
    }
  };

  const addTag = () => {
    if (formData.tagInput.trim() && !formData.tags.includes(formData.tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, formData.tagInput.trim()],
        tagInput: ''
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.company.trim()) newErrors.company = 'Company is required';
      if (!formData.industry.trim()) newErrors.industry = 'Industry is required';
      if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
        newErrors.website = 'Please enter a valid URL';
      }
    }

    if (currentStep === 2) {
      if (!formData.contactName.trim()) newErrors.contactName = 'Contact name is required';
      if (!formData.primaryEmail.trim()) {
        newErrors.primaryEmail = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.primaryEmail)) {
        newErrors.primaryEmail = 'Invalid email format';
      }
      if (formData.alternateEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.alternateEmail)) {
        newErrors.alternateEmail = 'Invalid email format';
      }
      if (!formData.jobTitle.trim()) newErrors.jobTitle = 'Job title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const uploadFilesToStorage = async (clientId: string): Promise<void> => {
    if (uploadedFiles.length === 0) return;

    for (const file of uploadedFiles) {
      const fileName = `${clientId}/${Date.now()}-${file.name}`;

      const { data, error } = await supabase.storage
        .from('client-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading file:', error);
        throw new Error(`Failed to upload ${file.name}: ${error.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('client-documents')
        .getPublicUrl(fileName);

      const documentType = 'document';

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          client_id: clientId,
          user_id: user!.id,
          name: file.name,
          type: documentType,
          size: file.size,
          url: publicUrl,
          source: fileName,
          status: 'completed',
          uploaded_at: new Date().toISOString()
        });

      if (dbError) {
        console.error('Error saving document to database:', dbError);
        throw new Error(`Failed to save ${file.name} to database: ${dbError.message}`);
      }
    }
  };

  const handleSave = async () => {
    if (!user || !validateStep()) return;

    setSaving(true);
    try {
      const { data: newClient, error: insertError } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          name: formData.contactName || formData.company,
          company: formData.company,
          website: formData.website,
          industry: formData.industry,
          email: formData.primaryEmail,
          phone: formData.primaryPhone,
          city: formData.city,
          country: formData.country,
          zip_code: formData.zipCode,
          founded: formData.founded,
          company_size: formData.companySize,
          linkedin_url: formData.linkedinUrl,
          twitter_url: formData.twitterUrl,
          instagram_url: formData.instagramUrl,
          facebook_url: formData.facebookUrl,
          logo_url: formData.logoUrl,
          contact_name: formData.contactName,
          primary_email: formData.primaryEmail,
          alternate_email: formData.alternateEmail,
          primary_phone: formData.primaryPhone,
          alternate_phone: formData.alternatePhone,
          job_title: formData.jobTitle,
          preferred_contact_method: formData.preferredContactMethod,
          company_overview: formData.companyOverview,
          budget_range: formData.budgetRange,
          short_term_goals: formData.shortTermGoals,
          long_term_goals: formData.longTermGoals,
          expectations: formData.expectations,
          satisfaction_score: formData.satisfactionScore > 0 ? formData.satisfactionScore : null,
          satisfaction_feedback: formData.satisfactionFeedback,
          status: formData.status,
          tags: formData.tags,
          description: formData.description,
          csm: formData.csm,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (uploadedFiles.length > 0 && newClient) {
        try {
          await uploadFilesToStorage(newClient.id);
        } catch (uploadError) {
          console.error('Error uploading documents:', uploadError);
        }
      }

      await refreshClients();
      onComplete();
      navigate('/clients');
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Failed to save client. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onSkip} size="xl">
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
              Add Your First Client
            </h2>
            <button
              onClick={onSkip}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Skip for now
            </button>
          </div>
          <p className="text-slate-600">
            Let's get you started by adding your first client
          </p>
          <p className="text-center text-slate-600 mt-2">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        <div className="mb-6">
          <div className="w-full bg-slate-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </h3>

              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 mb-3 font-medium">
                  <Sparkles className="h-4 w-4 inline mr-2" />
                  Enter company website or LinkedIn URL and let AI populate the details!
                </p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <Input
                      placeholder="https://company.com"
                      value={formData.website}
                      onChange={(e) => handleChange('website', e.target.value)}
                    />
                    {errors.website && (
                      <p className="text-xs text-red-600 mt-1">{errors.website}</p>
                    )}
                  </div>
                  <div>
                    <Input
                      placeholder="https://linkedin.com/company/..."
                      value={formData.linkedinUrl}
                      onChange={(e) => handleChange('linkedinUrl', e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={handleAIPrefill}
                  disabled={(!formData.website && !formData.linkedinUrl) || aiPrefilling}
                  className="w-full"
                >
                  {aiPrefilling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Prefilling...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI Autofill from {formData.website ? 'Website' : formData.linkedinUrl ? 'LinkedIn' : 'URL'}
                    </>
                  )}
                </Button>
              </div>

              {aiPrefilling && (
                <div className="bg-white border-2 border-blue-500 rounded-lg p-6 shadow-lg mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <h4 className="text-lg font-semibold text-slate-900">Extracting Client Data...</h4>
                  </div>

                  <div className="mb-6">
                    {(() => {
                      // Find the current active step (in_progress first, then error, then first pending)
                      const inProgressStep = extractionSteps.find(step => step.status === 'in_progress');
                      const errorStep = extractionSteps.find(step => step.status === 'error');
                      const pendingStep = extractionSteps.find(step => step.status === 'pending');
                      const currentStep = inProgressStep || errorStep || pendingStep || extractionSteps[0];
                      
                      return (
                        <>
                          <div className="flex justify-between items-center text-sm mb-2">
                            <span className="text-slate-700 font-medium">
                              {currentStep?.label || 'Processing...'}
                            </span>
                            <span className="text-slate-600 font-medium">{Math.round(extractionProgress)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-3">
                            <div
                              className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${extractionProgress}%` }}
                            />
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <p className="text-xs text-slate-500 mt-4 text-center">
                    This may take 20-30 seconds. Please wait...
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Company Name <span className="text-red-600">*</span>
                  </label>
                  <Input
                    placeholder="Acme Corporation"
                    value={formData.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                  />
                  {errors.company && (
                    <p className="text-xs text-red-600 mt-1">{errors.company}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Industry <span className="text-red-600">*</span>
                  </label>
                  <Input
                    placeholder="e.g., Technology, Healthcare, Finance"
                    value={formData.industry}
                    onChange={(e) => handleChange('industry', e.target.value)}
                  />
                  {errors.industry && (
                    <p className="text-xs text-red-600 mt-1">{errors.industry}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Company Size
                  </label>
                  <Input
                    placeholder="e.g., 50-200 employees, 1000+ employees"
                    value={formData.companySize}
                    onChange={(e) => handleChange('companySize', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    City
                  </label>
                  <Input
                    placeholder="San Francisco"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Country
                  </label>
                  <Input
                    placeholder="United States"
                    value={formData.country}
                    onChange={(e) => handleChange('country', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Zip Code
                  </label>
                  <Input
                    placeholder="94102"
                    value={formData.zipCode}
                    onChange={(e) => handleChange('zipCode', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Founded Year
                  </label>
                  <Input
                    placeholder="2020"
                    value={formData.founded}
                    onChange={(e) => handleChange('founded', e.target.value)}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Company Overview
                  </label>
                  <textarea
                    placeholder="Brief overview of the company..."
                    value={formData.companyOverview}
                    onChange={(e) => handleChange('companyOverview', e.target.value)}
                    className="w-full min-h-[100px] border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Contact Name <span className="text-red-600">*</span>
                  </label>
                  <Input
                    placeholder="John Doe"
                    value={formData.contactName}
                    onChange={(e) => handleChange('contactName', e.target.value)}
                  />
                  {errors.contactName && (
                    <p className="text-xs text-red-600 mt-1">{errors.contactName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Job Title / Role <span className="text-red-600">*</span>
                  </label>
                  <Input
                    placeholder="VP of Engineering"
                    value={formData.jobTitle}
                    onChange={(e) => handleChange('jobTitle', e.target.value)}
                  />
                  {errors.jobTitle && (
                    <p className="text-xs text-red-600 mt-1">{errors.jobTitle}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Primary Email <span className="text-red-600">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="john@acme.com"
                    value={formData.primaryEmail}
                    onChange={(e) => handleChange('primaryEmail', e.target.value)}
                  />
                  {errors.primaryEmail && (
                    <p className="text-xs text-red-600 mt-1">{errors.primaryEmail}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Alternate Email
                  </label>
                  <Input
                    type="email"
                    placeholder="john.doe@personal.com"
                    value={formData.alternateEmail}
                    onChange={(e) => handleChange('alternateEmail', e.target.value)}
                  />
                  {errors.alternateEmail && (
                    <p className="text-xs text-red-600 mt-1">{errors.alternateEmail}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Primary Phone
                  </label>
                  <Input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.primaryPhone}
                    onChange={(e) => handleChange('primaryPhone', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Alternate Phone
                  </label>
                  <Input
                    type="tel"
                    placeholder="+1 (555) 987-6543"
                    value={formData.alternatePhone}
                    onChange={(e) => handleChange('alternatePhone', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Social Media Profiles
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Linkedin className="h-4 w-4 inline mr-2" />
                    LinkedIn Profile
                  </label>
                  <Input
                    placeholder="https://linkedin.com/company/acme"
                    value={formData.linkedinUrl}
                    onChange={(e) => handleChange('linkedinUrl', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Twitter className="h-4 w-4 inline mr-2" />
                    Twitter Handle
                  </label>
                  <Input
                    placeholder="@acmecorp or https://twitter.com/acmecorp"
                    value={formData.twitterUrl}
                    onChange={(e) => handleChange('twitterUrl', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Instagram className="h-4 w-4 inline mr-2" />
                    Instagram Profile
                  </label>
                  <Input
                    placeholder="https://instagram.com/acmecorp"
                    value={formData.instagramUrl}
                    onChange={(e) => handleChange('instagramUrl', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Facebook className="h-4 w-4 inline mr-2" />
                    Facebook Page
                  </label>
                  <Input
                    placeholder="https://facebook.com/acmecorp"
                    value={formData.facebookUrl}
                    onChange={(e) => handleChange('facebookUrl', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Additional Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag (e.g., decision-maker, technical)"
                    value={formData.tagInput}
                    onChange={(e) => handleChange('tagInput', e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button onClick={addTag} variant="outline" type="button">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes / Description
                </label>
                <textarea
                  placeholder="Add any additional notes or context about this client..."
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="w-full min-h-[120px] border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Upload className="h-4 w-4 inline mr-2" />
                  Upload Documents (Optional)
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
                    className="hidden"
                    id="document-upload-wizard"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="document-upload-wizard" className="cursor-pointer">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-600 mb-1">Click to upload documents</p>
                    <p className="text-xs text-slate-500">PDF, DOC, DOCX, TXT, CSV, XLSX (Max 10MB)</p>
                  </label>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-slate-700">{uploadedFiles.length} file(s) selected:</p>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-700">{file.name}</span>
                          <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(index)}
                          className="text-slate-400 hover:text-red-600"
                          type="button"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Goals & Satisfaction
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Short-Term Goals
                </label>
                <textarea
                  placeholder="What are the client's immediate goals? (next 3-6 months)"
                  value={formData.shortTermGoals}
                  onChange={(e) => handleChange('shortTermGoals', e.target.value)}
                  className="w-full min-h-[100px] border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Long-Term Goals
                </label>
                <textarea
                  placeholder="What are the client's long-term objectives? (1+ years)"
                  value={formData.longTermGoals}
                  onChange={(e) => handleChange('longTermGoals', e.target.value)}
                  className="w-full min-h-[100px] border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Client Expectations
                </label>
                <textarea
                  placeholder="What specific outcomes or results is the client seeking from your services?"
                  value={formData.expectations}
                  onChange={(e) => handleChange('expectations', e.target.value)}
                  className="w-full min-h-[100px] border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Smile className="h-4 w-4 inline mr-2" />
                  Client Satisfaction Score (1-10)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={formData.satisfactionScore}
                    onChange={(e) => handleChange('satisfactionScore', parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold text-blue-600 w-12 text-center">
                    {formData.satisfactionScore > 0 ? formData.satisfactionScore : '-'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Rate based on feedback, surveys, or metrics from previous experiences
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Satisfaction Feedback / Notes
                </label>
                <textarea
                  placeholder="Add any feedback, survey results, or notes about client satisfaction..."
                  value={formData.satisfactionFeedback}
                  onChange={(e) => handleChange('satisfactionFeedback', e.target.value)}
                  className="w-full min-h-[100px] border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-200">
          {currentStep > 1 ? (
            <Button variant="outline" onClick={handlePrevious}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          ) : (
            <div />
          )}

          {currentStep < totalSteps ? (
            <Button variant="primary" onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? (
                'Saving...'
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Add Client
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
