import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { mapAIResponseToFormData } from '../../utils/clientDataMapper';
import { AIFetchProgress } from '../client/AIFetchProgress';
import { AIResponseComparison } from '../client/AIResponseComparison';
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
  
  // Dual AI flow state
  const [aiResponses, setAiResponses] = useState<{
    perplexity: any | null;
    openai: any | null;
  }>({ perplexity: null, openai: null });
  const [comparison, setComparison] = useState<any | null>(null);
  const [selectedModel, setSelectedModel] = useState<'perplexity' | 'openai' | null>(null);
  const [hasAutoFetched, setHasAutoFetched] = useState(false);
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
    uploadedDocuments: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const totalSteps = 3;

  // Trigger AI fetch when moving to Step 2 (if all 3 fields are filled)
  useEffect(() => {
    if (currentStep === 2 && !hasAutoFetched) {
      const hasAllFields = formData.company.trim() && formData.website.trim() && formData.linkedinUrl.trim();
      
      if (hasAllFields && !aiPrefilling && !aiResponses.perplexity && !aiResponses.openai) {
        console.log('[FIRST-CLIENT-WIZARD] Triggering AI fetch on Step 2');
        setHasAutoFetched(true);
        handleAIPrefill();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

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


  const fetchPerplexityData = async () => {
    console.log('[FIRST-CLIENT-WIZARD] 🚀 Starting Perplexity fetch');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrich-client-perplexity`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            clientName: formData.company,
            websiteUrl: formData.website,
            linkedinUrl: formData.linkedinUrl,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Perplexity fetch failed');
      }

      const result = await response.json();
      return {
        model: 'perplexity' as const,
        data: result.data,
        metadata: result.metadata,
      };
    } catch (error: any) {
      console.error('[FIRST-CLIENT-WIZARD] ❌ Perplexity error', error);
      return {
        model: 'perplexity' as const,
        data: null,
        metadata: { completenessScore: 0, processingTime: 0, timestamp: '' },
        error: error.message,
      };
    }
  };

  const fetchOpenAIData = async () => {
    console.log('[FIRST-CLIENT-WIZARD] 🚀 Starting OpenAI fetch');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrich-client-openai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            clientName: formData.company,
            websiteUrl: formData.website,
            linkedinUrl: formData.linkedinUrl,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'OpenAI fetch failed');
      }

      const result = await response.json();
      return {
        model: 'openai' as const,
        data: result.data,
        metadata: result.metadata,
      };
    } catch (error: any) {
      console.error('[FIRST-CLIENT-WIZARD] ❌ OpenAI error', error);
      return {
        model: 'openai' as const,
        data: null,
        metadata: { completenessScore: 0, processingTime: 0, timestamp: '' },
        error: error.message,
      };
    }
  };

  const fetchComparison = async (perplexityResult?: any, openaiResult?: any) => {
    console.log('[FIRST-CLIENT-WIZARD] 🔍 Starting comparison');
    
    // Use passed results or fall back to state
    const perplexityData = perplexityResult?.data || aiResponses.perplexity?.data;
    const openaiData = openaiResult?.data || aiResponses.openai?.data;
    
    if (!perplexityData || !openaiData) {
      console.error('[FIRST-CLIENT-WIZARD] ❌ Cannot compare - missing responses');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/compare-ai-responses`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            perplexityResponse: perplexityData,
            openaiResponse: openaiData,
            clientName: formData.company,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Comparison failed');
      }

      const result = await response.json();
      console.log('[FIRST-CLIENT-WIZARD] ✅ Comparison received', {
        success: result.success,
        hasComparison: !!result.comparison,
      });

      if (!result.success || !result.comparison) {
        throw new Error('Comparison data not found in response');
      }

      setComparison(result.comparison);
    } catch (error: any) {
      console.error('[FIRST-CLIENT-WIZARD] ❌ Comparison error', error);
    }
  };

  const handleAIPrefill = async () => {
    if (!formData.company || !formData.website || !formData.linkedinUrl) {
      return;
    }

    if (!user) return;

    console.log('[FIRST-CLIENT-WIZARD] === STARTING DUAL AI FETCH ===');
    setAiPrefilling(true);
    setAiResponses({ perplexity: null, openai: null });
    setComparison(null);
    setSelectedModel(null);

    // Fetch both in parallel
    const [perplexityResult, openaiResult] = await Promise.all([
      fetchPerplexityData(),
      fetchOpenAIData(),
    ]);

    console.log('[FIRST-CLIENT-WIZARD] ✅ Both fetches completed', {
      perplexitySuccess: !!perplexityResult.data,
      openaiSuccess: !!openaiResult.data,
    });

    setAiResponses({
      perplexity: perplexityResult,
      openai: openaiResult,
    });

    // If both succeeded, fetch comparison (pass results directly to avoid state timing issues)
    if (perplexityResult.data && openaiResult.data) {
      await fetchComparison(perplexityResult, openaiResult);
    }

    setAiPrefilling(false);
  };

  const handleRegenerate = () => {
    console.log('[FIRST-CLIENT-WIZARD] 🔄 Regenerating responses');
    setHasAutoFetched(false);
    handleAIPrefill();
  };

  const handleSelectResponse = (model: 'perplexity' | 'openai') => {
    console.log('[FIRST-CLIENT-WIZARD] 👤 User selected response', { model });
    const selectedResponse = aiResponses[model];
    
    if (!selectedResponse?.data) {
      console.error('[FIRST-CLIENT-WIZARD] ❌ No data in selected response');
      return;
    }

    console.log('[FIRST-CLIENT-WIZARD] 📦 Raw AI response data:', selectedResponse.data);
    
    setSelectedModel(model);
    const mappedData = mapAIResponseToFormData(selectedResponse.data, model);
    
    console.log('[FIRST-CLIENT-WIZARD] 🗺️ Mapped data from mapper:', mappedData);
    
    // Map the data to FirstClientWizard's formData structure
    const wizardFormData = {
      company: mappedData.company || '',
      website: mappedData.website || '',
      industry: mappedData.industry || '',
      city: mappedData.city || '',
      country: mappedData.country || '',
      zipCode: mappedData.zipCode || '',
      founded: mappedData.founded || '',
      companySize: mappedData.companySize || '',
      companyOverview: mappedData.description || '', // Map description to companyOverview
      contactName: mappedData.contactName || '',
      primaryEmail: mappedData.primaryEmail || '',
      alternateEmail: mappedData.alternateEmail || '',
      primaryPhone: mappedData.primaryPhone || '',
      alternatePhone: mappedData.alternatePhone || '',
      jobTitle: mappedData.jobTitle || '',
      preferredContactMethod: mappedData.preferredContactMethod || 'email',
      linkedinUrl: mappedData.linkedinUrl || '',
      twitterUrl: mappedData.twitterUrl || '',
      instagramUrl: mappedData.instagramUrl || '',
      facebookUrl: mappedData.facebookUrl || '',
      logoUrl: mappedData.logoUrl || '',
      description: mappedData.description || '',
      shortTermGoals: mappedData.shortTermGoals || '',
      longTermGoals: mappedData.longTermGoals || '',
      expectations: mappedData.expectations || '',
      status: mappedData.status || 'prospect',
      tags: mappedData.tags || [],
      tagInput: '',
      uploadedDocuments: [],
      budgetRange: '',
      csm: mappedData.csm || '',
    };
    
    console.log('[FIRST-CLIENT-WIZARD] 📋 Final wizard form data:', wizardFormData);
    console.log('[FIRST-CLIENT-WIZARD] 📊 Populated fields count:', {
      company: !!wizardFormData.company,
      website: !!wizardFormData.website,
      industry: !!wizardFormData.industry,
      city: !!wizardFormData.city,
      country: !!wizardFormData.country,
      companySize: !!wizardFormData.companySize,
      companyOverview: !!wizardFormData.companyOverview,
      contactName: !!wizardFormData.contactName,
      primaryEmail: !!wizardFormData.primaryEmail,
      primaryPhone: !!wizardFormData.primaryPhone,
    });
    
    setFormData(prev => ({ ...prev, ...wizardFormData }));
    
    // Automatically navigate to Step 3 to show details
    setCurrentStep(3);
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
      if (!formData.website.trim()) newErrors.website = 'Website is required';
      if (!formData.linkedinUrl.trim()) newErrors.linkedinUrl = 'LinkedIn URL is required';
      if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
        newErrors.website = 'Please enter a valid URL';
      }
    }

    if (currentStep === 2) {
      // AI Enrichment step - require a response to be selected
      if (!selectedModel) {
        // Don't set an error, but prevent proceeding
        return false;
      }
    }

    if (currentStep === 3) {
      // Review step - no validation needed, just showing read-only details
      // User can proceed to save the client
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Name <span className="text-red-600">*</span>
                </label>
                <Input
                  placeholder="e.g., White Label IQ"
                  value={formData.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                />
                {errors.company && (
                  <p className="text-xs text-red-600 mt-1">{errors.company}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Website URL <span className="text-red-600">*</span>
                </label>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  LinkedIn URL <span className="text-red-600">*</span>
                </label>
                <Input
                  placeholder="https://linkedin.com/company/..."
                  value={formData.linkedinUrl}
                  onChange={(e) => handleChange('linkedinUrl', e.target.value)}
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-end mb-4">
                {!aiPrefilling && (aiResponses.perplexity || aiResponses.openai) && (
                  <Button
                    variant="outline"
                    onClick={handleRegenerate}
                    type="button"
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Regenerate
                  </Button>
                )}
              </div>

              {/* Show button to trigger fetch if not started yet */}
              {!aiPrefilling && !aiResponses.perplexity && !aiResponses.openai && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900 mb-3 font-medium">
                    <Sparkles className="h-4 w-4 inline mr-2" />
                    Click the button below to fetch comprehensive client details using AI
                  </p>
                  <Button
                    variant="primary"
                    onClick={handleAIPrefill}
                    disabled={!formData.company || !formData.website || !formData.linkedinUrl}
                    className="w-full"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Fetch Client Data with AI
                  </Button>
                </div>
              )}

              {/* Show AI Fetch Progress while fetching */}
              {aiPrefilling && (
                <div className="mb-4">
                  <AIFetchProgress
                    perplexityResponse={aiResponses.perplexity}
                    openaiResponse={aiResponses.openai}
                  />
                </div>
              )}

              {/* Show Comparison after both responses are received - keep visible even after selection */}
              {!aiPrefilling && (aiResponses.perplexity || aiResponses.openai) && (
                <div className="mb-4">
                  {selectedModel && (
                    <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-900">
                        Using {selectedModel === 'perplexity' ? 'Perplexity' : 'OpenAI'} response. Click "Next" to view details.
                      </span>
                    </div>
                  )}
                  <AIResponseComparison
                    perplexityResponse={aiResponses.perplexity}
                    openaiResponse={aiResponses.openai}
                    comparison={comparison}
                    onSelectResponse={handleSelectResponse}
                    onRegenerate={handleRegenerate}
                  />
                </div>
              )}

              {/* Show waiting message if no responses yet */}
              {!aiPrefilling && !aiResponses.perplexity && !aiResponses.openai && !selectedModel && (
                <div className="text-center py-8">
                  <Sparkles className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click the button above to fetch AI responses
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Review Client Details
                </h3>
                {selectedModel && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedModel(null);
                      setCurrentStep(2);
                    }}
                    type="button"
                  >
                    Change Selection
                  </Button>
                )}
              </div>

              {!selectedModel && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-900">
                    Please go back to Step 2 and select an AI response to view the details.
                  </p>
                </div>
              )}

              {selectedModel && (
                <div className="space-y-6">
                  {/* Company Information */}
                  <div>
                    <h4 className="text-md font-semibold text-slate-900 mb-4">Company Information</h4>
                    <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            Company Name
                          </label>
                          <p className="text-sm font-medium text-slate-900">{formData.company || '—'}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            Industry
                          </label>
                          <p className="text-sm font-medium text-slate-900">{formData.industry || '—'}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            Company Size
                          </label>
                          <p className="text-sm font-medium text-slate-900">{formData.companySize || '—'}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            City
                          </label>
                          <p className="text-sm font-medium text-slate-900">{formData.city || '—'}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            Country
                          </label>
                          <p className="text-sm font-medium text-slate-900">{formData.country || '—'}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            Zip Code
                          </label>
                          <p className="text-sm font-medium text-slate-900">{formData.zipCode || '—'}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            Founded Year
                          </label>
                          <p className="text-sm font-medium text-slate-900">{formData.founded || '—'}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            Website
                          </label>
                          <p className="text-sm font-medium text-slate-900 break-words">{formData.website || '—'}</p>
                        </div>
                      </div>

                      {formData.companyOverview && (
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            Company Overview
                          </label>
                          <p className="text-sm text-slate-900 whitespace-pre-wrap">{formData.companyOverview}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Information */}
                  {(formData.contactName || formData.primaryEmail || formData.primaryPhone) && (
                    <div>
                      <h4 className="text-md font-semibold text-slate-900 mb-4">Contact Information</h4>
                      <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          {formData.contactName && (
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                Contact Name
                              </label>
                              <p className="text-sm font-medium text-slate-900">{formData.contactName}</p>
                            </div>
                          )}

                          {formData.jobTitle && (
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                Job Title
                              </label>
                              <p className="text-sm font-medium text-slate-900">{formData.jobTitle}</p>
                            </div>
                          )}

                          {formData.primaryEmail && (
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                Primary Email
                              </label>
                              <p className="text-sm font-medium text-slate-900">{formData.primaryEmail}</p>
                            </div>
                          )}

                          {formData.primaryPhone && (
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                Primary Phone
                              </label>
                              <p className="text-sm font-medium text-slate-900">{formData.primaryPhone}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Social Media */}
                  {(formData.linkedinUrl || formData.twitterUrl || formData.instagramUrl || formData.facebookUrl) && (
                    <div>
                      <h4 className="text-md font-semibold text-slate-900 mb-4">Social Media</h4>
                      <div className="bg-slate-50 rounded-lg p-6">
                        <div className="grid grid-cols-2 gap-4">
                          {formData.linkedinUrl && (
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                LinkedIn
                              </label>
                              <p className="text-sm font-medium text-slate-900 break-words">{formData.linkedinUrl}</p>
                            </div>
                          )}

                          {formData.twitterUrl && (
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                Twitter/X
                              </label>
                              <p className="text-sm font-medium text-slate-900 break-words">{formData.twitterUrl}</p>
                            </div>
                          )}

                          {formData.instagramUrl && (
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                Instagram
                              </label>
                              <p className="text-sm font-medium text-slate-900 break-words">{formData.instagramUrl}</p>
                            </div>
                          )}

                          {formData.facebookUrl && (
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">
                                Facebook
                              </label>
                              <p className="text-sm font-medium text-slate-900 break-words">{formData.facebookUrl}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
