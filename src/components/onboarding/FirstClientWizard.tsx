import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
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

export const FirstClientWizard: React.FC<FirstClientWizardProps> = ({ isOpen, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [aiPrefilling, setAiPrefilling] = useState(false);
  const { user } = useAuth();
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

  const totalSteps = 5;

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAIPrefill = async () => {
    const urlToExtract = formData.website || formData.linkedinUrl;

    if (!urlToExtract || !user) return;

    setAiPrefilling(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-company-data`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: urlToExtract })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('AI Prefill error:', errorData);
        alert(`AI Autofill failed: ${errorData.error || 'Unknown error'}`);
        return;
      }

      const data = await response.json();

      if (data.success && data.data) {
        const updates: any = {};

        if (data.data.name && !formData.company) updates.company = data.data.name;
        if (data.data.industry && !formData.industry) updates.industry = data.data.industry;
        if (data.data.description && !formData.companyOverview) updates.companyOverview = data.data.description;
        if (data.data.founded && !formData.founded) updates.founded = data.data.founded;
        if (data.data.companySize && !formData.companySize) updates.companySize = data.data.companySize;

        if (data.data.location?.city && !formData.city) updates.city = data.data.location.city;
        if (data.data.location?.country && !formData.country) updates.country = data.data.location.country;

        if (data.data.email) {
          if (!formData.primaryEmail) updates.primaryEmail = data.data.email;
        }
        if (data.data.phone) {
          if (!formData.primaryPhone) updates.primaryPhone = data.data.phone;
        }

        if (data.data.socialProfiles?.linkedin && !formData.linkedinUrl) updates.linkedinUrl = data.data.socialProfiles.linkedin;
        if (data.data.socialProfiles?.twitter && !formData.twitterUrl) updates.twitterUrl = data.data.socialProfiles.twitter;
        if (data.data.socialProfiles?.facebook && !formData.facebookUrl) updates.facebookUrl = data.data.socialProfiles.facebook;
        if (data.data.socialProfiles?.instagram && !formData.instagramUrl) updates.instagramUrl = data.data.socialProfiles.instagram;


        if (Object.keys(updates).length > 0) {
          setFormData(prev => ({ ...prev, ...updates }));
          alert(`Successfully populated ${Object.keys(updates).length} fields with company data!`);
        } else {
          alert('No new data found to populate. All fields are already filled or no data was available.');
        }
      } else {
        alert('No company data could be extracted from the website.');
      }
    } catch (error) {
      console.error('AI Prefill error:', error);
      alert('AI Autofill encountered an error. Please try again or fill in manually.');
    } finally {
      setAiPrefilling(false);
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

  const handleSave = async () => {
    if (!user || !validateStep()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
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
        });

      if (error) throw error;

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
    <Modal isOpen={isOpen} onClose={onSkip} size="large">
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
          <div className="mt-4 flex gap-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full ${
                  step <= currentStep ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Step {currentStep} of {totalSteps}
          </p>
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
                  <select
                    value={formData.industry}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Industry</option>
                    <option value="Technology">Technology</option>
                    <option value="Finance">Finance</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Retail">Retail</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Education">Education</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.industry && (
                    <p className="text-xs text-red-600 mt-1">{errors.industry}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Company Size
                  </label>
                  <select
                    value={formData.companySize}
                    onChange={(e) => handleChange('companySize', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="501-1000">501-1000 employees</option>
                    <option value="1000+">1000+ employees</option>
                  </select>
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

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="prospect">Prospect</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="churned">Churned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Assigned CSM
                  </label>
                  <Input
                    placeholder="John Doe"
                    value={formData.csm}
                    onChange={(e) => handleChange('csm', e.target.value)}
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
                    id="document-upload"
                  />
                  <label htmlFor="document-upload" className="cursor-pointer">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-600 mb-1">Click to upload documents</p>
                    <p className="text-xs text-slate-500">PDF, DOC, DOCX, TXT, CSV, XLSX (Max 10MB)</p>
                  </label>
                </div>
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
