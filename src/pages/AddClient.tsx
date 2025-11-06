import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { processAndEmbedDocument } from '../utils/documentEmbeddings';
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
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { refreshClients } = useApp();
  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'social' | 'additional' | 'goals'>('basic');
  const [completedTabs, setCompletedTabs] = useState<Set<string>>(new Set());
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiPrefilling, setAiPrefilling] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const isEditMode = !!id;

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

  useEffect(() => {
    if (isEditMode && id && user) {
      loadClientData();
    }
  }, [id, user, isEditMode]);

  const loadClientData = async () => {
    if (!id || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData({
          company: data.company || '',
          website: data.website || '',
          industry: data.industry || '',
          email: data.email || '',
          phone: data.phone || '',
          city: data.city || '',
          country: data.country || '',
          zipCode: data.zip_code || '',
          founded: data.founded || '',
          companySize: data.company_size || '',
          linkedinUrl: data.linkedin_url || '',
          twitterUrl: data.twitter_url || '',
          instagramUrl: data.instagram_url || '',
          facebookUrl: data.facebook_url || '',
          logoUrl: data.logo_url || '',
          contactName: data.contact_name || '',
          primaryEmail: data.primary_email || '',
          alternateEmail: data.alternate_email || '',
          primaryPhone: data.primary_phone || '',
          alternatePhone: data.alternate_phone || '',
          jobTitle: data.job_title || '',
          preferredContactMethod: data.preferred_contact_method || 'email',
          companyOverview: data.company_overview || '',
          budgetRange: data.budget_range || '',
          shortTermGoals: data.short_term_goals || '',
          longTermGoals: data.long_term_goals || '',
          expectations: data.expectations || '',
          satisfactionScore: data.satisfaction_score || 0,
          satisfactionFeedback: data.satisfaction_feedback || '',
          status: data.status || 'prospect',
          tags: data.tags || [],
          description: data.description || '',
          csm: data.csm || ''
        });
      }
    } catch (error) {
      console.error('Error loading client:', error);
      showToast('error', 'Failed to load client data');
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

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

  const validateAdditionalInfo = () => {
    return true;
  };

  const validateGoalsInfo = () => {
    const newErrors: Partial<Record<keyof ClientFormData, string>> = {};

    if (!formData.shortTermGoals.trim()) {
      newErrors.shortTermGoals = 'Short-term goals are required';
    }

    if (!formData.longTermGoals.trim()) {
      newErrors.longTermGoals = 'Long-term goals are required';
    }

    if (!formData.expectations.trim()) {
      newErrors.expectations = 'Client expectations are required';
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAIPrefill = async () => {
    const urlToExtract = formData.website || formData.linkedinUrl;

    if (!urlToExtract || !user) {
      showToast('error', 'Please enter a website URL or LinkedIn URL first');
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
          body: JSON.stringify({ url: urlToExtract })
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

        if (data.data.name) updates.company = data.data.name;
        if (data.data.industry) updates.industry = data.data.industry;
        if (data.data.description) updates.companyOverview = data.data.description;
        if (data.data.founded) updates.founded = data.data.founded;
        if (data.data.companySize) updates.companySize = data.data.companySize;

        if (data.data.location?.city) updates.city = data.data.location.city;
        if (data.data.location?.country) updates.country = data.data.location.country;
        if (data.data.location?.zipCode) updates.zipCode = data.data.location.zipCode;

        if (data.data.contactInfo?.contactName) updates.contactName = data.data.contactInfo.contactName;
        if (data.data.contactInfo?.jobTitle) updates.jobTitle = data.data.contactInfo.jobTitle;
        if (data.data.contactInfo?.primaryEmail) updates.primaryEmail = data.data.contactInfo.primaryEmail;
        if (data.data.contactInfo?.alternateEmail) updates.alternateEmail = data.data.contactInfo.alternateEmail;
        if (data.data.contactInfo?.primaryPhone) updates.primaryPhone = data.data.contactInfo.primaryPhone;
        if (data.data.contactInfo?.alternatePhone) updates.alternatePhone = data.data.contactInfo.alternatePhone;

        if (data.data.contactInfo?.primaryEmail) updates.email = data.data.contactInfo.primaryEmail;
        if (data.data.contactInfo?.primaryPhone) updates.phone = data.data.contactInfo.primaryPhone;

        if (data.data.businessInfo?.shortTermGoals) updates.shortTermGoals = data.data.businessInfo.shortTermGoals;
        if (data.data.businessInfo?.longTermGoals) updates.longTermGoals = data.data.businessInfo.longTermGoals;
        if (data.data.businessInfo?.expectations) updates.expectations = data.data.businessInfo.expectations;

        if (data.data.socialProfiles?.linkedin) updates.linkedinUrl = data.data.socialProfiles.linkedin;
        if (data.data.socialProfiles?.twitter) updates.twitterUrl = data.data.socialProfiles.twitter;
        if (data.data.socialProfiles?.facebook) updates.facebookUrl = data.data.socialProfiles.facebook;
        if (data.data.socialProfiles?.instagram) updates.instagramUrl = data.data.socialProfiles.instagram;

        if (data.data.logo) updates.logoUrl = data.data.logo;

        if (Object.keys(updates).length > 0) {
          setFormData({ ...formData, ...updates });

          const extractedInfo = [];
          if (data.data.contacts && data.data.contacts.length > 0) {
            extractedInfo.push(`${data.data.contacts.length} contacts`);
          }
          if (data.data.testimonials && data.data.testimonials.length > 0) {
            extractedInfo.push(`${data.data.testimonials.length} testimonials`);
          }

          const infoMessage = extractedInfo.length > 0
            ? ` Also extracted: ${extractedInfo.join(', ')}`
            : '';

          showToast('success', `Successfully extracted and populated ${Object.keys(updates).length} fields with company data!${infoMessage}`);

          if (data.data.contacts && data.data.contacts.length > 0) {
            console.log('Extracted contacts:', data.data.contacts);
          }
          if (data.data.testimonials && data.data.testimonials.length > 0) {
            console.log('Extracted testimonials:', data.data.testimonials);
          }
        } else {
          showToast('warning', 'No data could be extracted from the provided URL. Please check the URL and try again.');
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

    if (activeTab === 'goals' && !validateGoalsInfo()) {
      showToast('error', 'Please fill in all required goals information');
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

  const uploadFilesToStorage = async (clientId: string): Promise<void> => {
    if (uploadedFiles.length === 0 || !user) return;

    for (const file of uploadedFiles) {
      const fileExt = file.name.split('.').pop();
      const sanitizedFileName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_');
      const fileName = `${user.id}/${clientId}/${Date.now()}_${sanitizedFileName}`;

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

      const documentType = file.type.includes('pdf') ? 'proposal' :
                          file.type.includes('word') ? 'contract' :
                          file.type.includes('image') ? 'other' : 'email';

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          client_id: clientId,
          user_id: user.id,
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

      try {
        await processAndEmbedDocument(file, {
          clientId: clientId,
          metadata: {
            documentType: documentType,
            fileName: file.name,
            clientId: clientId,
          }
        });
        console.log(`Successfully generated embeddings for ${file.name}`);
      } catch (embedError) {
        console.error(`Failed to generate embeddings for ${file.name}:`, embedError);
      }
    }
  };

  const handleSave = async () => {
    if (!user) {
      showToast('error', 'You must be logged in to ' + (isEditMode ? 'update' : 'create') + ' a client');
      return;
    }

    if (!validateBasicInfo() || !validateContactInfo() || !validateGoalsInfo()) {
      showToast('error', 'Please fill in all required fields across all tabs');
      return;
    }

    setSaving(true);
    try {
      const clientData = {
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
        location: formData.city && formData.country ? `${formData.city}, ${formData.country}` : formData.city || formData.country || '',
        updated_at: new Date().toISOString()
      };

      if (isEditMode && id) {
        const { error: updateError } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', id)
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        const { error: contactUpdateError } = await supabase
          .from('contacts')
          .upsert({
            client_id: id,
            user_id: user.id,
            name: formData.contactName,
            email: formData.primaryEmail,
            phone: formData.primaryPhone || null,
            role: formData.jobTitle,
            is_primary: true,
            is_decision_maker: false,
            source: 'manual'
          }, {
            onConflict: 'client_id,email',
            ignoreDuplicates: false
          });

        if (contactUpdateError) {
          console.error('Error updating contact:', contactUpdateError);
        }

        if (uploadedFiles.length > 0) {
          try {
            await uploadFilesToStorage(id);
            showToast('success', `Client updated successfully with ${uploadedFiles.length} new document(s)`);
          } catch (uploadError) {
            console.error('Error uploading documents:', uploadError);
            showToast('warning', 'Client updated but documents failed to upload');
          }
        } else {
          showToast('success', 'Client updated successfully');
        }
      } else {
        const { data: newClient, error: insertError } = await supabase
          .from('clients')
          .insert({
            ...clientData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (newClient && formData.contactName && formData.primaryEmail) {
          const { error: contactError } = await supabase
            .from('contacts')
            .insert({
              client_id: newClient.id,
              user_id: user.id,
              name: formData.contactName,
              email: formData.primaryEmail,
              phone: formData.primaryPhone || null,
              role: formData.jobTitle,
              is_primary: true,
              is_decision_maker: false,
              source: 'manual'
            });

          if (contactError) {
            console.error('Error creating contact:', contactError);
          }
        }

        if (uploadedFiles.length > 0 && newClient) {
          try {
            await uploadFilesToStorage(newClient.id);
            showToast('success', `Client created successfully with ${uploadedFiles.length} document(s)`);
          } catch (uploadError) {
            console.error('Error uploading documents:', uploadError);
            showToast('warning', 'Client created but documents failed to upload');
          }
        } else {
          showToast('success', 'Client created successfully');
        }
      }

      await refreshClients();

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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading client data...</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-foreground">
            {isEditMode ? 'Edit Client' : 'Add New Client'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditMode ? 'Update client information' : 'Complete all steps to create a comprehensive client profile'}
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
                  AI-Powered Autofill: Enter company website or LinkedIn URL and let AI populate the details!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
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
                  <div>
                    <Input
                      placeholder="https://linkedin.com/company/..."
                      value={formData.linkedinUrl}
                      onChange={(e) => handleInputChange('linkedinUrl', e.target.value)}
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
                  <Input
                    placeholder="e.g., Technology, Healthcare, Finance"
                    value={formData.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    className={errors.industry ? 'border-red-500' : ''}
                  />
                  {errors.industry && (
                    <p className="text-xs text-red-600 mt-1">{errors.industry}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Company Size
                  </label>
                  <Input
                    placeholder="e.g., 50-200 employees, 1000+ employees"
                    value={formData.companySize}
                    onChange={(e) => handleInputChange('companySize', e.target.value)}
                  />
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
                  <DollarSign className="h-4 w-4 inline mr-2" />
                  Budget Range
                </label>
                <Input
                  placeholder="e.g., $10K-$50K, $100K+, Contact for pricing"
                  value={formData.budgetRange}
                  onChange={(e) => handleInputChange('budgetRange', e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Understanding the client's budget helps tailor solutions and expectations
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Company Overview
                </label>
                <textarea
                  placeholder="Provide a comprehensive overview of the company: what they do, their mission, market position, key products/services, and unique value proposition..."
                  value={formData.companyOverview}
                  onChange={(e) => handleInputChange('companyOverview', e.target.value)}
                  className="w-full min-h-[120px] border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This helps build context for better client insights and recommendations
                </p>
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

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Upload className="h-4 w-4 inline mr-2" />
                  Upload Documents (Optional)
                </label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer bg-background">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
                    className="hidden"
                    id="document-upload"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="document-upload" className="cursor-pointer">
                    <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-foreground mb-1 font-medium">Click to upload documents</p>
                    <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, TXT, CSV, XLSX (Max 10MB per file)</p>
                  </label>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-foreground">{uploadedFiles.length} file(s) selected:</p>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{file.name}</span>
                          <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button
                          onClick={() => handleRemoveFile(index)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                  <Target className="h-4 w-4 inline mr-2" />
                  These fields are crucial for generating accurate AI insights and recommendations
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Short-Term Goals <span className="text-red-600">*</span>
                </label>
                <textarea
                  placeholder="What are the client's immediate goals and priorities? (next 3-6 months)&#10;Examples: Launch new product line, expand to 3 new markets, increase revenue by 25%, scale team to 100 employees"
                  value={formData.shortTermGoals}
                  onChange={(e) => handleInputChange('shortTermGoals', e.target.value)}
                  className={`w-full min-h-[100px] border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none ${errors.shortTermGoals ? 'border-red-500' : 'border-border'}`}
                />
                {errors.shortTermGoals && (
                  <p className="text-xs text-red-600 mt-1">{errors.shortTermGoals}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Understanding short-term goals helps identify immediate opportunities
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Long-Term Goals <span className="text-red-600">*</span>
                </label>
                <textarea
                  placeholder="What are the client's long-term vision and strategic objectives? (1-5 years)&#10;Examples: Become market leader in industry, IPO by 2027, expand globally to 50 countries, achieve $100M ARR"
                  value={formData.longTermGoals}
                  onChange={(e) => handleInputChange('longTermGoals', e.target.value)}
                  className={`w-full min-h-[100px] border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none ${errors.longTermGoals ? 'border-red-500' : 'border-border'}`}
                />
                {errors.longTermGoals && (
                  <p className="text-xs text-red-600 mt-1">{errors.longTermGoals}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Long-term goals help align your solutions with their strategic vision
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Client Expectations <span className="text-red-600">*</span>
                </label>
                <textarea
                  placeholder="What specific outcomes, service levels, or results is the client seeking?&#10;Examples: 24/7 support availability, scalable solutions, data security compliance, strategic partnership growth, transparent communication"
                  value={formData.expectations}
                  onChange={(e) => handleInputChange('expectations', e.target.value)}
                  className={`w-full min-h-[100px] border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none ${errors.expectations ? 'border-red-500' : 'border-border'}`}
                />
                {errors.expectations && (
                  <p className="text-xs text-red-600 mt-1">{errors.expectations}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Clear expectations ensure you can meet and exceed client needs
                </p>
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
