import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  Save,
  User,
  Building2,
  Globe,
  Phone,
  Mail,
  Tag,
  FileText,
  Settings,
  Plus,
  X,
  Upload,
  Target,
  DollarSign,
  Smile,
  MapPin,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';

interface ClientFormData {
  company: string;
  website: string;
  industry: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  zipCode: string;
  founded: string;
  companySize: string;
  linkedinUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  logoUrl: string;
  contactName: string;
  primaryEmail: string;
  alternateEmail: string;
  primaryPhone: string;
  alternatePhone: string;
  jobTitle: string;
  preferredContactMethod: 'email' | 'phone';
  companyOverview: string;
  budgetRange: string;
  shortTermGoals: string;
  longTermGoals: string;
  expectations: string;
  satisfactionScore: number;
  satisfactionFeedback: string;
  status: 'active' | 'inactive' | 'prospect' | 'churned';
  tags: string[];
  description: string;
  csm: string;
}

export const AddClient: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'social' | 'additional' | 'goals'>('basic');
  const [completedTabs, setCompletedTabs] = useState<Set<string>>(new Set());
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiPrefilling, setAiPrefilling] = useState(false);

  const [formData, setFormData] = useState<ClientFormData>({
    company: '',
    website: '',
    industry: '',
    email: '',
    phone: '',
    city: '',
    country: '',
    zipCode: '',
    founded: '',
    companySize: '',
    linkedinUrl: '',
    twitterUrl: '',
    instagramUrl: '',
    facebookUrl: '',
    logoUrl: '',
    contactName: '',
    primaryEmail: '',
    alternateEmail: '',
    primaryPhone: '',
    alternatePhone: '',
    jobTitle: '',
    preferredContactMethod: 'email',
    companyOverview: '',
    budgetRange: '',
    shortTermGoals: '',
    longTermGoals: '',
    expectations: '',
    satisfactionScore: 0,
    satisfactionFeedback: '',
    status: 'prospect',
    tags: [],
    description: '',
    csm: ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ClientFormData, string>>>({});

  const validateBasicInfo = () => {
    const newErrors: Partial<Record<keyof ClientFormData, string>> = {};

    if (!formData.company.trim()) {
      newErrors.company = 'Company name is required';
    }

    if (!formData.industry.trim()) {
      newErrors.industry = 'Industry is required';
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateContactInfo = () => {
    const newErrors: Partial<Record<keyof ClientFormData, string>> = {};

    if (!formData.contactName.trim()) {
      newErrors.contactName = 'Contact name is required';
    }

    if (!formData.primaryEmail.trim()) {
      newErrors.primaryEmail = 'Primary email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.primaryEmail)) {
      newErrors.primaryEmail = 'Invalid email format';
    }

    if (formData.alternateEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.alternateEmail)) {
      newErrors.alternateEmail = 'Invalid email format';
    }

    if (!formData.jobTitle.trim()) {
      newErrors.jobTitle = 'Job title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof ClientFormData, value: any) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(tag => tag !== tagToRemove) });
  };

  const handleAIPrefill = async () => {
    if (!formData.website || !user) {
      showToast('error', 'Please enter a website URL first');
      return;
    }

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
          body: JSON.stringify({ url: formData.website })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('AI Prefill error:', errorData);
        showToast('error', `AI Autofill failed: ${errorData.error || 'Unknown error'}`);
        return;
      }

      const data = await response.json();

      if (data.success && data.data) {
        const updates: Partial<ClientFormData> = {};

        if (data.data.name && !formData.company) updates.company = data.data.name;
        if (data.data.industry && !formData.industry) updates.industry = data.data.industry;
        if (data.data.description && !formData.companyOverview) updates.companyOverview = data.data.description;
        if (data.data.founded && !formData.founded) updates.founded = data.data.founded;
        if (data.data.companySize && !formData.companySize) updates.companySize = data.data.companySize;

        if (data.data.location?.city && !formData.city) updates.city = data.data.location.city;
        if (data.data.location?.country && !formData.country) updates.country = data.data.location.country;

        if (data.data.email && !formData.primaryEmail) {
          updates.primaryEmail = data.data.email;
          updates.email = data.data.email;
        }
        if (data.data.phone && !formData.primaryPhone) {
          updates.primaryPhone = data.data.phone;
          updates.phone = data.data.phone;
        }

        if (data.data.socialProfiles?.linkedin && !formData.linkedinUrl) updates.linkedinUrl = data.data.socialProfiles.linkedin;
        if (data.data.socialProfiles?.twitter && !formData.twitterUrl) updates.twitterUrl = data.data.socialProfiles.twitter;
        if (data.data.socialProfiles?.facebook && !formData.facebookUrl) updates.facebookUrl = data.data.socialProfiles.facebook;
        if (data.data.socialProfiles?.instagram && !formData.instagramUrl) updates.instagramUrl = data.data.socialProfiles.instagram;

        if (data.data.logo && !formData.logoUrl) updates.logoUrl = data.data.logo;

        if (Object.keys(updates).length > 0) {
          setFormData({ ...formData, ...updates });
          showToast('success', `Successfully populated ${Object.keys(updates).length} fields with company data!`);
        } else {
          showToast('info', 'No new data found to populate. All fields are already filled or no data was available.');
        }
      } else {
        showToast('warning', 'No company data could be extracted from the website.');
      }
    } catch (error) {
      console.error('AI Prefill error:', error);
      showToast('error', 'AI Autofill encountered an error. Please try again or fill in manually.');
    } finally {
      setAiPrefilling(false);
    }
  };

  const handleNext = () => {
    if (activeTab === 'basic' && !validateBasicInfo()) {
      showToast('error', 'Please fill in all required fields correctly');
      return;
    }

    if (activeTab === 'contact' && !validateContactInfo()) {
      showToast('error', 'Please fill in all required contact fields correctly');
      return;
    }

    setCompletedTabs(prev => new Set(prev).add(activeTab));

    const tabOrder = ['basic', 'contact', 'social', 'additional', 'goals'];
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1] as any);
    }
  };

  const handlePrevious = () => {
    const tabOrder = ['basic', 'contact', 'social', 'additional', 'goals'];
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabOrder[currentIndex - 1] as any);
    }
  };

  const handleSave = async () => {
    if (!user) {
      showToast('error', 'You must be logged in to create a client');
      return;
    }

    if (!validateBasicInfo() || !validateContactInfo()) {
      showToast('error', 'Please fix errors in required fields');
      return;
    }

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

      showToast('success', 'Client created successfully');
      setTimeout(() => {
        navigate('/clients');
      }, 1000);
    } catch (error) {
      console.error('Error creating client:', error);
      showToast('error', 'Failed to create client. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isTabComplete = (tabId: string) => {
    return completedTabs.has(tabId);
  };

  const canSave = () => {
    return completedTabs.size >= 2;
  };

  const tabs = [
    { id: 'basic', label: 'Company Info', icon: Building2 },
    { id: 'contact', label: 'Contact Details', icon: Phone },
    { id: 'social', label: 'Social Media', icon: Globe },
    { id: 'additional', label: 'Additional Info', icon: Settings },
    { id: 'goals', label: 'Goals & Satisfaction', icon: Target }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/clients')}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Add New Client</h1>
          <p className="text-muted-foreground mt-1">
            Complete all steps to create a comprehensive client profile
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">
              Step {['basic', 'contact', 'social', 'additional', 'goals'].indexOf(activeTab) + 1} of 5
            </p>
            <p className="text-xs text-muted-foreground">
              {completedTabs.size} sections completed
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-border">
        <div className="flex gap-8 overflow-x-auto">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isComplete = isTabComplete(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-4 pt-2 border-b-2 transition-colors relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    isComplete
                      ? 'bg-green-500 text-white'
                      : activeTab === tab.id
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {isComplete ? '✓' : index + 1}
                  </div>
                  <span className="text-sm font-medium">{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'basic' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100 mb-3 font-medium">
                  <Sparkles className="h-4 w-4 inline mr-2" />
                  AI-Powered Autofill: Enter company website and let AI populate the details!
                </p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="https://company.com"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      className={errors.website ? 'border-red-500' : ''}
                    />
                    {errors.website && (
                      <p className="text-xs text-red-600 mt-1">{errors.website}</p>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleAIPrefill}
                    disabled={!formData.website || aiPrefilling}
                  >
                    {aiPrefilling ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Prefilling...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        AI Autofill
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Company Name <span className="text-red-600">*</span>
                  </label>
                  <Input
                    placeholder="Acme Corporation"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className={errors.company ? 'border-red-500' : ''}
                  />
                  {errors.company && (
                    <p className="text-xs text-red-600 mt-1">{errors.company}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Industry <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    className={`w-full border ${errors.industry ? 'border-red-500' : 'border-border'} rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary`}
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
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Company Size
                  </label>
                  <select
                    value={formData.companySize}
                    onChange={(e) => handleInputChange('companySize', e.target.value)}
                    className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                  <label className="block text-sm font-medium text-foreground mb-2">
                    City
                  </label>
                  <Input
                    placeholder="San Francisco"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Country
                  </label>
                  <Input
                    placeholder="United States"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Zip Code
                  </label>
                  <Input
                    placeholder="94102"
                    value={formData.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Founded Year
                  </label>
                  <Input
                    placeholder="2020"
                    value={formData.founded}
                    onChange={(e) => handleInputChange('founded', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value as any)}
                    className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="prospect">Prospect</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="churned">Churned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Assigned CSM
                  </label>
                  <Input
                    placeholder="John Doe"
                    value={formData.csm}
                    onChange={(e) => handleInputChange('csm', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Company Overview
                </label>
                <textarea
                  placeholder="Brief overview of the company, their mission, and what they do..."
                  value={formData.companyOverview}
                  onChange={(e) => handleInputChange('companyOverview', e.target.value)}
                  className="w-full min-h-[100px] border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-border">
                <Button variant="primary" onClick={handleNext}>
                  Next: Contact Details
                  <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'contact' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Contact Name <span className="text-red-600">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="John Doe"
                      value={formData.contactName}
                      onChange={(e) => handleInputChange('contactName', e.target.value)}
                      className={errors.contactName ? 'border-red-500' : ''}
                    />
                  </div>
                  {errors.contactName && (
                    <p className="text-xs text-red-600 mt-1">{errors.contactName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Job Title / Role <span className="text-red-600">*</span>
                  </label>
                  <Input
                    placeholder="VP of Engineering"
                    value={formData.jobTitle}
                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                    className={errors.jobTitle ? 'border-red-500' : ''}
                  />
                  {errors.jobTitle && (
                    <p className="text-xs text-red-600 mt-1">{errors.jobTitle}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Primary Email <span className="text-red-600">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="john@acme.com"
                      value={formData.primaryEmail}
                      onChange={(e) => handleInputChange('primaryEmail', e.target.value)}
                      className={errors.primaryEmail ? 'border-red-500' : ''}
                    />
                  </div>
                  {errors.primaryEmail && (
                    <p className="text-xs text-red-600 mt-1">{errors.primaryEmail}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Alternate Email
                  </label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="john.doe@personal.com"
                      value={formData.alternateEmail}
                      onChange={(e) => handleInputChange('alternateEmail', e.target.value)}
                      className={errors.alternateEmail ? 'border-red-500' : ''}
                    />
                  </div>
                  {errors.alternateEmail && (
                    <p className="text-xs text-red-600 mt-1">{errors.alternateEmail}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Primary Phone
                  </label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={formData.primaryPhone}
                      onChange={(e) => handleInputChange('primaryPhone', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Alternate Phone
                  </label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="+1 (555) 987-6543"
                      value={formData.alternatePhone}
                      onChange={(e) => handleInputChange('alternatePhone', e.target.value)}
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Preferred Contact Method
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="email"
                        checked={formData.preferredContactMethod === 'email'}
                        onChange={(e) => handleInputChange('preferredContactMethod', e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Email</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="phone"
                        checked={formData.preferredContactMethod === 'phone'}
                        onChange={(e) => handleInputChange('preferredContactMethod', e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Phone</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-6 mt-6 border-t border-border">
                <Button variant="outline" onClick={handlePrevious}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button variant="primary" onClick={handleNext}>
                  Next: Social Media
                  <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'social' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Social Media Profiles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Linkedin className="h-4 w-4 inline mr-2" />
                    LinkedIn Profile
                  </label>
                  <Input
                    placeholder="https://linkedin.com/company/acme"
                    value={formData.linkedinUrl}
                    onChange={(e) => handleInputChange('linkedinUrl', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Twitter className="h-4 w-4 inline mr-2" />
                    Twitter Handle
                  </label>
                  <Input
                    placeholder="@acmecorp or https://twitter.com/acmecorp"
                    value={formData.twitterUrl}
                    onChange={(e) => handleInputChange('twitterUrl', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Instagram className="h-4 w-4 inline mr-2" />
                    Instagram Profile
                  </label>
                  <Input
                    placeholder="https://instagram.com/acmecorp"
                    value={formData.instagramUrl}
                    onChange={(e) => handleInputChange('instagramUrl', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Facebook className="h-4 w-4 inline mr-2" />
                    Facebook Page
                  </label>
                  <Input
                    placeholder="https://facebook.com/acmecorp"
                    value={formData.facebookUrl}
                    onChange={(e) => handleInputChange('facebookUrl', e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Company Logo URL
                  </label>
                  <Input
                    placeholder="https://example.com/logo.png"
                    value={formData.logoUrl}
                    onChange={(e) => handleInputChange('logoUrl', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the URL of the company's logo image
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-6 mt-6 border-t border-border">
                <Button variant="outline" onClick={handlePrevious}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button variant="primary" onClick={handleNext}>
                  Next: Additional Info
                  <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'additional' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <DollarSign className="h-4 w-4 inline mr-2" />
                  Budget Range
                </label>
                <select
                  value={formData.budgetRange}
                  onChange={(e) => handleInputChange('budgetRange', e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Budget Range</option>
                  <option value="< $10K">Less than $10,000</option>
                  <option value="$10K - $50K">$10,000 - $50,000</option>
                  <option value="$50K - $100K">$50,000 - $100,000</option>
                  <option value="$100K - $250K">$100,000 - $250,000</option>
                  <option value="$250K - $500K">$250,000 - $500,000</option>
                  <option value="$500K+">$500,000+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag (e.g., decision-maker, technical)"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button onClick={handleAddTag} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notes / Description
                </label>
                <textarea
                  placeholder="Add any additional notes or context about this client..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full min-h-[120px] border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex justify-between pt-6 mt-6 border-t border-border">
                <Button variant="outline" onClick={handlePrevious}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button variant="primary" onClick={handleNext}>
                  Next: Goals & Satisfaction
                  <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'goals' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Goals & Satisfaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Short-Term Goals
                </label>
                <textarea
                  placeholder="What are the client's immediate goals? (next 3-6 months)"
                  value={formData.shortTermGoals}
                  onChange={(e) => handleInputChange('shortTermGoals', e.target.value)}
                  className="w-full min-h-[100px] border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Long-Term Goals
                </label>
                <textarea
                  placeholder="What are the client's long-term objectives? (1+ years)"
                  value={formData.longTermGoals}
                  onChange={(e) => handleInputChange('longTermGoals', e.target.value)}
                  className="w-full min-h-[100px] border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Client Expectations
                </label>
                <textarea
                  placeholder="What specific outcomes or results is the client seeking from your services?"
                  value={formData.expectations}
                  onChange={(e) => handleInputChange('expectations', e.target.value)}
                  className="w-full min-h-[100px] border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Smile className="h-4 w-4 inline mr-2" />
                  Client Satisfaction Score (1-10)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={formData.satisfactionScore}
                    onChange={(e) => handleInputChange('satisfactionScore', parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold text-primary w-12 text-center">
                    {formData.satisfactionScore > 0 ? formData.satisfactionScore : '-'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Rate based on feedback, surveys, or metrics from previous experiences
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Satisfaction Feedback / Notes
                </label>
                <textarea
                  placeholder="Add any feedback, survey results, or notes about client satisfaction..."
                  value={formData.satisfactionFeedback}
                  onChange={(e) => handleInputChange('satisfactionFeedback', e.target.value)}
                  className="w-full min-h-[100px] border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex justify-between pt-6 mt-6 border-t border-border">
                <Button variant="outline" onClick={handlePrevious}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={!canSave() || saving}
                >
                  {saving ? (
                    'Saving...'
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Client
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
