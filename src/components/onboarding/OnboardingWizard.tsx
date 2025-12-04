import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { FirstClientWizard } from './FirstClientWizard';
import { CompanyAIFetchProgress } from './CompanyAIFetchProgress';
import { CompanyAIResponseComparison } from './CompanyAIResponseComparison';
import {
  Building2,
  Globe,
  Briefcase,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Users,
  Newspaper,
  Code,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface OnboardingWizardProps {
  isOpen: boolean;
  onComplete: () => void;
}

interface Service {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  pricing?: string;
}

interface LeadershipMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  linkedinUrl?: string;
  experience?: string;
  education?: string;
  skills?: string[];
}

interface Blog {
  id: string;
  title: string;
  url: string;
  date: string;
  summary: string;
  author: string;
}

interface ExtractionStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  message?: string;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ isOpen, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionSteps, setExtractionSteps] = useState<ExtractionStep[]>([
    { id: 'crawl', label: 'Crawling website pages', status: 'pending' },
    { id: 'basic', label: 'Extracting company information', status: 'pending' },
    { id: 'contact', label: 'Finding contact details', status: 'pending' },
    { id: 'services', label: 'Discovering services & products', status: 'pending' },
    { id: 'leadership', label: 'Identifying leadership team', status: 'pending' },
    { id: 'blogs', label: 'Extracting blog articles', status: 'pending' },
    { id: 'tech', label: 'Analyzing technology stack', status: 'pending' },
    { id: 'finalize', label: 'Finalizing data extraction', status: 'pending' },
  ]);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [perplexityKey, setPerplexityKey] = useState('');
  const [showFirstClientWizard, setShowFirstClientWizard] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const [showOnboardingSuccessModal, setShowOnboardingSuccessModal] = useState(false);
  
  // Dual AI flow state
  const [aiResponses, setAiResponses] = useState<{
    perplexity: any | null;
    openai: any | null;
  }>({ perplexity: null, openai: null });
  const [comparison, setComparison] = useState<any | null>(null);
  const [selectedModel, setSelectedModel] = useState<'perplexity' | 'openai' | null>(null);
  const [hasAutoFetched, setHasAutoFetched] = useState(false);
  const [aiPrefilling, setAiPrefilling] = useState(false);
  
  const { user, checkKnowledgeBaseStatus } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const storedKey = localStorage.getItem('perplexity_key');
    if (storedKey) {
      setPerplexityKey(storedKey);
    }
  }, []);

  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    industry: '',
    description: '',
    founded: '',
    location: '',
    size: '',
    mission: '',
    vision: '',
    email: '',
    phone: '',
    address: '',
    linkedinUrl: '',
    twitterUrl: '',
    facebookUrl: '',
    instagramUrl: '',
    youtubeUrl: '',
    services: [] as Service[],
    serviceInput: '',
    serviceDescInput: '',
    leadership: [] as LeadershipMember[],
    blogs: [] as Blog[],
    techStack: [] as string[],
    techInput: '',
    partners: [] as string[],
    partnerInput: '',
    integrations: [] as string[],
    integrationInput: ''
  });

  useEffect(() => {
    if (isOpen && user) {
      // Load persisted data from localStorage first
      loadPersistedData();
      // Then check if there's database data to override with
      loadExistingData();
    }
  }, [isOpen, user]);

  // Load persisted data from localStorage
  const loadPersistedData = () => {
    try {
      const persistedData = localStorage.getItem('onboarding_wizard_data');
      const persistedStep = localStorage.getItem('onboarding_wizard_step');

      if (persistedData) {
        const parsedData = JSON.parse(persistedData);
        setFormData(prev => ({
          ...prev,
          ...parsedData
        }));
      }

      if (persistedStep) {
        const step = parseInt(persistedStep, 10);
        if (step >= 1 && step <= totalSteps) {
          setCurrentStep(step);
        }
      }
    } catch (error) {
      console.error('Error loading persisted onboarding data:', error);
    }
  };

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (isOpen && user) {
      try {
        localStorage.setItem('onboarding_wizard_data', JSON.stringify(formData));
      } catch (error) {
        console.error('Error saving onboarding data to localStorage:', error);
      }
    }
  }, [formData, isOpen, user]);

  // Save current step to localStorage whenever it changes
  useEffect(() => {
    if (isOpen && user) {
      try {
        localStorage.setItem('onboarding_wizard_step', currentStep.toString());
      } catch (error) {
        console.error('Error saving onboarding step to localStorage:', error);
      }
    }
  }, [currentStep, isOpen, user]);

  // Debug: Log leadership data whenever it changes
  useEffect(() => {
    console.log('Leadership data in formData:', formData.leadership);
    console.log('Leadership array length:', formData.leadership.length);
    if (formData.leadership.length > 0) {
      console.log('Leadership members:', formData.leadership);
    }
  }, [formData.leadership]);

  // Trigger AI fetch when moving to Step 2 (if all 3 fields are filled)
  useEffect(() => {
    if (currentStep === 2 && !hasAutoFetched && user) {
      const hasAllFields = 
        formData.companyName.trim() && 
        formData.website.trim() && 
        formData.linkedinUrl.trim();
      
      if (hasAllFields && !aiPrefilling && !aiResponses.perplexity && !aiResponses.openai) {
        console.log('[ONBOARDING-WIZARD] ✅ Triggering dual AI fetch on Step 2', {
          companyName: formData.companyName,
          website: formData.website,
          linkedinUrl: formData.linkedinUrl
        });
        setHasAutoFetched(true);
        handleAIPrefill();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, user]);

  const loadExistingData = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        const parseJsonField = (field: any) => {
          if (!field) return null;
          if (typeof field === 'string') {
            try {
              return JSON.parse(field);
            } catch {
              return null;
            }
          }
          return field;
        };

        const services = parseJsonField(profile.services) || [];
        const servicesArray = services.map((s: any) => {
          if (typeof s === 'string') {
            return { id: `service-${Date.now()}-${Math.random()}`, name: s, description: '' };
          }
          return {
            id: s.id || `service-${Date.now()}-${Math.random()}`,
            name: s.name || '',
            description: s.description || ''
          };
        });

        const leadership = parseJsonField(profile.leadership) || [];
        // Normalize leadership data to ensure it's an array with proper structure
        const leadershipArray = Array.isArray(leadership) 
          ? leadership.map((l: any) => ({
              id: l.id || `leader-${Date.now()}-${Math.random()}`,
              name: l.name || '',
              role: l.role || l.title || '',
              bio: l.bio || '',
              linkedinUrl: l.linkedinUrl || l.linkedin || '',
              email: l.email || '',
              experience: l.experience || '',
              education: l.education || '',
              skills: l.skills || []
            }))
          : [];
        
        console.log('Loaded leadership from database:', leadershipArray);
        
        const blogs = parseJsonField(profile.blogs) || [];
        const technology = parseJsonField(profile.technology) || {};

        // Only override with database data if the field has actual content
        setFormData(prev => ({
          ...prev,
          companyName: profile.company_name || prev.companyName,
          website: profile.website || prev.website,
          industry: profile.industry || prev.industry,
          description: profile.about || prev.description,
          founded: profile.founded || prev.founded,
          location: profile.location || prev.location,
          size: profile.size || prev.size,
          mission: profile.mission || prev.mission,
          vision: profile.vision || prev.vision,
          email: profile.email || prev.email,
          phone: profile.phone || prev.phone,
          address: profile.address || prev.address,
          linkedinUrl: profile.linkedin_url || prev.linkedinUrl,
          twitterUrl: profile.twitter_url || prev.twitterUrl,
          facebookUrl: profile.facebook_url || prev.facebookUrl,
          instagramUrl: profile.instagram_url || prev.instagramUrl,
          youtubeUrl: profile.youtube_url || prev.youtubeUrl,
          services: servicesArray.length > 0 ? servicesArray : prev.services,
          leadership: leadershipArray.length > 0 ? leadershipArray : prev.leadership,
          blogs: blogs.length > 0 ? blogs : prev.blogs,
          techStack: (technology.stack && technology.stack.length > 0) ? technology.stack : prev.techStack,
          partners: (technology.partners && technology.partners.length > 0) ? technology.partners : prev.partners,
          integrations: (technology.integrations && technology.integrations.length > 0) ? technology.integrations : prev.integrations
        }));
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const totalSteps = 9;

  const steps = [
    { number: 1, title: 'Company', icon: Building2 },
    { number: 2, title: 'AI Enrichment', icon: Sparkles },
    { number: 3, title: 'Contact', icon: Globe },
    { number: 4, title: 'Social', icon: Globe },
    { number: 5, title: 'Services', icon: Briefcase },
    { number: 6, title: 'Leadership', icon: Users },
    { number: 7, title: 'Blogs', icon: Newspaper },
    { number: 8, title: 'Technology', icon: Code },
    { number: 9, title: 'Review', icon: CheckCircle }
  ];

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addService = () => {
    if (formData.serviceInput && formData.serviceInput.trim()) {
      const newService: Service = {
        id: `service-${Date.now()}-${Math.random()}`,
        name: formData.serviceInput.trim(),
        description: formData.serviceDescInput.trim()
      };
      setFormData(prev => ({
        ...prev,
        services: [...prev.services, newService],
        serviceInput: '',
        serviceDescInput: ''
      }));
      setShowServiceForm(false); // Hide form after adding
    }
  };

  const removeService = (index: number) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  };

  const updateService = (index: number, field: 'name' | 'description', value: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.map((service, i) =>
        i === index ? { ...service, [field]: value } : service
      )
    }));
  };

  const addItem = (arrayField: string, inputField: string) => {
    const value = (formData as any)[inputField];
    if (value && value.trim()) {
      setFormData(prev => ({
        ...prev,
        [arrayField]: [...(prev as any)[arrayField], value.trim()],
        [inputField]: ''
      }));
    }
  };

  const removeItem = (arrayField: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      [arrayField]: (prev as any)[arrayField].filter((_: any, i: number) => i !== index)
    }));
  };

  const addLeader = () => {
    const newLeader: LeadershipMember = {
      id: `leader-${Date.now()}`,
      name: '',
      role: '',
      bio: ''
    };
    setFormData(prev => ({
      ...prev,
      leadership: [...prev.leadership, newLeader]
    }));
  };

  const updateLeader = (index: number, field: keyof LeadershipMember, value: string) => {
    setFormData(prev => ({
      ...prev,
      leadership: prev.leadership.map((leader, i) =>
        i === index ? { ...leader, [field]: value } : leader
      )
    }));
  };

  const removeLeader = (index: number) => {
    setFormData(prev => ({
      ...prev,
      leadership: prev.leadership.filter((_, i) => i !== index)
    }));
  };

  const addBlog = () => {
    const newBlog: Blog = {
      id: `blog-${Date.now()}`,
      title: '',
      url: '',
      date: '',
      summary: '',
      author: ''
    };
    setFormData(prev => ({
      ...prev,
      blogs: [...prev.blogs, newBlog]
    }));
  };

  const updateBlog = (index: number, field: keyof Blog, value: string) => {
    setFormData(prev => ({
      ...prev,
      blogs: prev.blogs.map((blog, i) =>
        i === index ? { ...blog, [field]: value } : blog
      )
    }));
  };

  const removeBlog = (index: number) => {
    setFormData(prev => ({
      ...prev,
      blogs: prev.blogs.filter((_, i) => i !== index)
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.companyName && formData.website && formData.linkedinUrl;
      case 2:
        // AI Enrichment step - can proceed if response is selected or user wants to skip
        return selectedModel !== null || (aiResponses.perplexity && aiResponses.openai);
      case 3:
        return formData.email;
      case 4:
        return true; // Social media is optional
      case 5:
        return formData.services.length > 0;
      case 6:
      case 7:
      case 8:
      case 9:
        return true;
      default:
        return false;
    }
  };

  const autoSaveData = async () => {
    if (!user) return;

    try {
      const servicesJson = formData.services.map(service => ({
        id: service.id || `service-${Date.now()}-${Math.random()}`,
        name: service.name || '',
        description: service.description || '',
        tags: service.tags || [],
        pricing: service.pricing || ''
      }));

      await supabase
        .from('company_profiles')
        .update({
          company_name: formData.companyName,
          website: formData.website,
          industry: formData.industry,
          about: formData.description,
          founded: formData.founded,
          location: formData.location,
          size: formData.size,
          mission: formData.mission,
          vision: formData.vision,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          linkedin_url: formData.linkedinUrl,
          twitter_url: formData.twitterUrl,
          facebook_url: formData.facebookUrl,
          instagram_url: formData.instagramUrl,
          youtube_url: formData.youtubeUrl,
          services: servicesJson,
          leadership: formData.leadership,
          blogs: formData.blogs,
          technology: {
            stack: formData.techStack,
            partners: formData.partners,
            integrations: formData.integrations
          },
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error auto-saving data:', error);
    }
  };

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      await autoSaveData();
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = async () => {
    if (currentStep > 1) {
      await autoSaveData();
      setCurrentStep(prev => prev - 1);
    }
  };

  const updateStepStatus = (stepId: string, status: ExtractionStep['status'], message?: string) => {
    setExtractionSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, status, message } : step
    ));
  };

  const simulateProgress = async () => {
    const steps = ['crawl', 'basic', 'contact', 'services', 'leadership', 'blogs', 'tech', 'finalize'];

    for (let i = 0; i < steps.length; i++) {
      const stepId = steps[i];
      updateStepStatus(stepId, 'in_progress');
      setExtractionProgress(((i + 0.5) / steps.length) * 100);

      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

      if (i < steps.length - 1) {
        updateStepStatus(stepId, 'completed');
        setExtractionProgress(((i + 1) / steps.length) * 100);
      }
    }
  };

  // Dual AI fetch functions
  const fetchPerplexityData = async () => {
    console.log('[ONBOARDING-WIZARD] 🚀 Starting Perplexity fetch');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrich-company-perplexity`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            companyName: formData.companyName,
            website: formData.website,
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
      console.error('[ONBOARDING-WIZARD] ❌ Perplexity error', error);
      return {
        model: 'perplexity' as const,
        data: null,
        metadata: { completenessScore: 0, processingTime: 0, timestamp: '' },
        error: error.message,
      };
    }
  };

  const fetchOpenAIData = async () => {
    console.log('[ONBOARDING-WIZARD] 🚀 Starting OpenAI fetch');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrich-company-openai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            companyName: formData.companyName,
            website: formData.website,
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
      console.error('[ONBOARDING-WIZARD] ❌ OpenAI error', error);
      return {
        model: 'openai' as const,
        data: null,
        metadata: { completenessScore: 0, processingTime: 0, timestamp: '' },
        error: error.message,
      };
    }
  };

  const fetchComparison = async (perplexityResult?: any, openaiResult?: any) => {
    console.log('[ONBOARDING-WIZARD] 🔍 Starting comparison');
    
    const perplexityData = perplexityResult?.data || aiResponses.perplexity?.data;
    const openaiData = openaiResult?.data || aiResponses.openai?.data;
    
    if (!perplexityData || !openaiData) {
      console.error('[ONBOARDING-WIZARD] ❌ Cannot compare - missing responses');
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
            dataType: 'company',
            perplexityResponse: perplexityData,
            openaiResponse: openaiData,
            companyName: formData.companyName,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Comparison failed');
      }

      const result = await response.json();
      setComparison(result.comparison);
    } catch (error: any) {
      console.error('[ONBOARDING-WIZARD] ❌ Comparison error', error);
    }
  };

  const handleAIPrefill = async () => {
    if (!formData.companyName || !formData.website || !formData.linkedinUrl) {
      return;
    }

    if (!user) return;

    console.log('[ONBOARDING-WIZARD] === STARTING DUAL AI FETCH ===');
    setAiPrefilling(true);
    setAiResponses({ perplexity: null, openai: null });
    setComparison(null);
    setSelectedModel(null);

    // Fetch both in parallel
    const [perplexityResult, openaiResult] = await Promise.all([
      fetchPerplexityData(),
      fetchOpenAIData(),
    ]);

    console.log('[ONBOARDING-WIZARD] ✅ Both fetches completed', {
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
    console.log('[ONBOARDING-WIZARD] 🔄 Regenerating responses');
    setHasAutoFetched(false);
    handleAIPrefill();
  };

  const mapAIResponseToFormData = (data: any) => {
    return {
      companyName: data.companyName || '',
      website: data.website || '',
      industry: data.industry || '',
      description: data.description || '',
      founded: data.founded || '',
      location: data.location || '',
      size: data.size || '',
      mission: data.mission || '',
      vision: data.vision || '',
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      linkedinUrl: data.linkedinUrl || '',
      twitterUrl: data.twitterUrl || '',
      facebookUrl: data.facebookUrl || '',
      instagramUrl: data.instagramUrl || '',
      youtubeUrl: data.youtubeUrl || '',
      services: data.services || [],
      leadership: data.leadership || [],
      blogs: data.blogs || [],
      techStack: data.technology?.stack || [],
      partners: data.technology?.partners || [],
      integrations: data.technology?.integrations || [],
    };
  };

  const handleSelectResponse = (model: 'perplexity' | 'openai') => {
    console.log('[ONBOARDING-WIZARD] 👤 User selected response', { model });
    const selectedResponse = aiResponses[model];
    
    if (!selectedResponse?.data) {
      return;
    }

    setSelectedModel(model);
    const mappedData = mapAIResponseToFormData(selectedResponse.data);
    setFormData(prev => ({ ...prev, ...mappedData }));
  };

  const handleAutoFill = async () => {
    if (!formData.website) {
      alert('Please enter a website URL first');
      return;
    }

    if (!perplexityKey) {
      setShowApiKeyInput(true);
      return;
    }

    setExtracting(true);
    setExtractionProgress(0);
    setExtractionSteps(prev => prev.map(step => ({ ...step, status: 'pending' as const })));

    const progressPromise = simulateProgress();

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-company-data`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: formData.website,
          perplexityKey: perplexityKey
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract data');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to extract data');
      }

      await progressPromise;

      updateStepStatus('finalize', 'completed');
      setExtractionProgress(100);

      const extractedData = result.data;

      // Log extracted leadership data for debugging
      console.log('Extracted leadership data from API:', extractedData.leadership);

      setFormData(prev => {
        // Transform leadership data into array format
        const extractedLeadership = extractedData.leadership ? [
          extractedData.leadership.ceo ? {
            id: `leader-ceo-${Date.now()}`,
            name: extractedData.leadership.ceo.name || '',
            role: extractedData.leadership.ceo.title || 'CEO',
            bio: extractedData.leadership.ceo.bio || '',
            linkedinUrl: extractedData.leadership.ceo.linkedin || '',
            email: extractedData.leadership.ceo.email || '',
            experience: '',
            education: '',
            skills: []
          } : null,
          extractedData.leadership.founder ? {
            id: `leader-founder-${Date.now()}`,
            name: extractedData.leadership.founder.name || '',
            role: extractedData.leadership.founder.title || 'Founder',
            bio: extractedData.leadership.founder.bio || '',
            linkedinUrl: extractedData.leadership.founder.linkedin || '',
            email: extractedData.leadership.founder.email || '',
            experience: '',
            education: '',
            skills: []
          } : null,
          extractedData.leadership.owner ? {
            id: `leader-owner-${Date.now()}`,
            name: extractedData.leadership.owner.name || '',
            role: extractedData.leadership.owner.title || 'Owner',
            bio: extractedData.leadership.owner.bio || '',
            linkedinUrl: extractedData.leadership.owner.linkedin || '',
            email: extractedData.leadership.owner.email || '',
            experience: '',
            education: '',
            skills: []
          } : null
        ].filter(Boolean) as LeadershipMember[] : prev.leadership;
        
        console.log('Transformed leadership array:', extractedLeadership);
        console.log('Setting leadership in formData, length:', extractedLeadership.length);

        return {
          ...prev,
          companyName: extractedData.name || prev.companyName,
          industry: extractedData.industry || prev.industry,
          description: extractedData.description || prev.description,
          founded: extractedData.founded || prev.founded,
          size: extractedData.companySize || prev.size,
          location: extractedData.location?.city && extractedData.location?.country
            ? `${extractedData.location.city}, ${extractedData.location.country}`
            : prev.location,
          mission: extractedData.businessInfo?.mission || prev.mission,
          vision: extractedData.businessInfo?.vision || prev.vision,
          address: extractedData.contactInfo?.address || (extractedData.location?.city
            ? `${extractedData.location.city}, ${extractedData.location.country || ''}${extractedData.location.zipCode ? ' ' + extractedData.location.zipCode : ''}`
            : prev.address),
          email: extractedData.contactInfo?.primaryEmail || prev.email,
          phone: extractedData.contactInfo?.primaryPhone || prev.phone,
          linkedinUrl: extractedData.socialProfiles?.linkedin || prev.linkedinUrl,
          twitterUrl: extractedData.socialProfiles?.twitter || prev.twitterUrl,
          facebookUrl: extractedData.socialProfiles?.facebook || prev.facebookUrl,
          instagramUrl: extractedData.socialProfiles?.instagram || prev.instagramUrl,
          services: extractedData.services?.map((s: any) => ({
            id: `service-${Date.now()}-${Math.random()}`,
            name: s.name || '',
            description: s.description || ''
          })) || prev.services,
          leadership: extractedLeadership,
          blogs: extractedData.blogs?.map((b: any) => ({
            id: `blog-${Date.now()}-${Math.random()}`,
            title: b.title || '',
            url: b.url || '',
            date: b.date || '',
            summary: b.summary || '',
            author: b.author || ''
          })) || prev.blogs,
          techStack: extractedData.technology?.stack || prev.techStack,
          partners: extractedData.technology?.partners || prev.partners,
          integrations: extractedData.technology?.integrations || prev.integrations,
        };
      });

      const leadershipCount = extractedData.leadership ?
        [extractedData.leadership.ceo, extractedData.leadership.founder, extractedData.leadership.owner].filter(Boolean).length : 0;
      const blogsCount = extractedData.blogs?.length || 0;
      const servicesCount = extractedData.services?.length || 0;

      let message = '✅ Data extraction complete!\n\nFound:\n';
      message += `• Company information\n`;
      message += `• Contact details\n`;
      message += `• Social media profiles\n`;
      message += `• ${servicesCount} service(s)\n`;
      message += `• ${leadershipCount} leadership member(s)\n`;
      message += `• ${blogsCount} blog post(s)\n`;
      message += `• Technology & partners\n\n`;

      if (leadershipCount === 0) {
        message += '⚠️ No leadership members found. Please add them manually in Step 5.\n';
      }
      if (blogsCount === 0) {
        message += '⚠️ No blog posts found. Please add them manually in Step 6.\n';
      }
      message += '\nNavigate through all steps to review and edit as needed.';

      alert(message);
    } catch (error) {
      console.error('Error extracting data:', error);
      setExtractionSteps(prev => prev.map(step =>
        step.status === 'in_progress'
          ? { ...step, status: 'error' as const, message: 'Failed' }
          : step
      ));
      alert('Failed to extract data. Please try again or enter details manually.');
    } finally {
      setExtracting(false);
      setTimeout(() => {
        setExtractionProgress(0);
        setExtractionSteps(prev => prev.map(step => ({ ...step, status: 'pending' as const, message: undefined })));
      }, 3000);
    }
  };

  const handleFirstClientComplete = () => {
    setShowFirstClientWizard(false);
    // Clear persisted onboarding data
    localStorage.removeItem('onboarding_wizard_data');
    localStorage.removeItem('onboarding_wizard_step');
    onComplete();
    navigate('/clients');
  };

  const handleSkipFirstClient = () => {
    setShowFirstClientWizard(false);
    // Clear persisted onboarding data
    localStorage.removeItem('onboarding_wizard_data');
    localStorage.removeItem('onboarding_wizard_step');
    onComplete();
    navigate('/dashboard');
  };

  const handleComplete = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Clear persisted onboarding data from localStorage on completion
      localStorage.removeItem('onboarding_wizard_data');
      localStorage.removeItem('onboarding_wizard_step');
      const servicesJson = formData.services.map(service => ({
        id: service.id || `service-${Date.now()}-${Math.random()}`,
        name: service.name || '',
        description: service.description || '',
        tags: service.tags || [],
        pricing: service.pricing || ''
      }));

      const { error } = await supabase
        .from('company_profiles')
        .update({
          company_name: formData.companyName,
          website: formData.website,
          industry: formData.industry,
          about: formData.description,
          founded: formData.founded,
          location: formData.location,
          size: formData.size,
          mission: formData.mission,
          vision: formData.vision,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          linkedin_url: formData.linkedinUrl,
          twitter_url: formData.twitterUrl,
          facebook_url: formData.facebookUrl,
          instagram_url: formData.instagramUrl,
          youtube_url: formData.youtubeUrl,
          services: servicesJson,
          leadership: formData.leadership,
          blogs: formData.blogs,
          technology: {
            stack: formData.techStack,
            partners: formData.partners,
            integrations: formData.integrations
          },
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await checkKnowledgeBaseStatus();
      // Close onboarding wizard and show success modal
      onComplete();
      setShowOnboardingSuccessModal(true);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Failed to complete setup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleProceedToFirstClient = () => {
    setShowOnboardingSuccessModal(false);
    // Clear persisted onboarding data when proceeding to first client
    localStorage.removeItem('onboarding_wizard_data');
    localStorage.removeItem('onboarding_wizard_step');
    setShowFirstClientWizard(true);
  };

  return (
    <>
    <Modal isOpen={isOpen} onClose={() => {}} size="xl" closeOnEscape={false} closeOnClickOutside={false}>
      <div className="p-6">
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-900">
            Complete your onboarding
          </h2>
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

        <div className="min-h-[500px] max-h-[500px] overflow-y-auto pr-8">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Company Information
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Name *
                </label>
                <Input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="e.g., Google"
                  required
                  className="pr-6"
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
                  placeholder="https://www.google.com/"
                  required
                  className="pr-6"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  LinkedIn URL *
                </label>
                <Input
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={(e) => handleChange('linkedinUrl', e.target.value)}
                  placeholder="https://www.linkedin.com/company/google"
                  required
                  className="pr-6"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  AI Data Enrichment
                </h3>
                {!selectedModel && !aiPrefilling && (aiResponses.perplexity || aiResponses.openai) && (
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

              {/* Dual AI Fetch Progress */}
              {aiPrefilling && (
                <div className="mb-4">
                  <CompanyAIFetchProgress
                    perplexityResponse={aiResponses.perplexity}
                    openaiResponse={aiResponses.openai}
                  />
                </div>
              )}

              {/* Show Comparison after both responses are received */}
              {!aiPrefilling && (aiResponses.perplexity || aiResponses.openai) && !selectedModel && (
                <div className="mb-4">
                  <CompanyAIResponseComparison
                    perplexityResponse={aiResponses.perplexity}
                    openaiResponse={aiResponses.openai}
                    comparison={comparison}
                    onSelectResponse={handleSelectResponse}
                    onRegenerate={handleRegenerate}
                  />
                </div>
              )}

              {/* Show detailed form view after response is selected */}
              {selectedModel && (
                <>
                  <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-900">
                      Using {selectedModel === 'perplexity' ? 'Perplexity' : 'OpenAI'} response. Review and edit the details below.
                    </span>
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
                      className="pr-6"
                    />
                  </div>

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
                      className="pr-6"
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
                      className="pr-6"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description
                    </label>
                    <textarea
                      className="w-full min-h-[80px] p-3 pr-6 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="Brief description of what your company does..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Founded
                      </label>
                      <Input
                        type="text"
                        value={formData.founded}
                        onChange={(e) => handleChange('founded', e.target.value)}
                        placeholder="e.g., 2020"
                        className="pr-6"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Company Size
                      </label>
                      <Input
                        type="text"
                        value={formData.size}
                        onChange={(e) => handleChange('size', e.target.value)}
                        placeholder="e.g., 50-100 employees"
                        className="pr-6"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Location
                    </label>
                    <Input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      placeholder="e.g., San Francisco, CA"
                      className="pr-6"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Mission Statement
                    </label>
                    <textarea
                      className="w-full min-h-[60px] p-3 pr-6 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      value={formData.mission}
                      onChange={(e) => handleChange('mission', e.target.value)}
                      placeholder="Your company's mission..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Vision Statement
                    </label>
                    <textarea
                      className="w-full min-h-[60px] p-3 pr-6 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      value={formData.vision}
                      onChange={(e) => handleChange('vision', e.target.value)}
                      placeholder="Your company's vision..."
                    />
                  </div>
                </>
              )}

              {/* Show waiting message if no responses yet */}
              {!aiPrefilling && !aiResponses.perplexity && !aiResponses.openai && !selectedModel && (
                <div className="text-center py-8">
                  <Sparkles className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Fetching AI responses... This may take a few moments.
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Contact Information
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
                  className="pr-6"
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
                  className="pr-6"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Physical Address
                </label>
                <textarea
                  className="w-full min-h-[80px] p-3 pr-6 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="123 Main St, City, State, ZIP"
                />
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Social Media Profiles
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  LinkedIn URL
                </label>
                <Input
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={(e) => handleChange('linkedinUrl', e.target.value)}
                  placeholder="https://linkedin.com/company/yourcompany"
                  className="pr-6"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Twitter/X URL
                </label>
                <Input
                  type="url"
                  value={formData.twitterUrl}
                  onChange={(e) => handleChange('twitterUrl', e.target.value)}
                  placeholder="https://twitter.com/yourcompany"
                  className="pr-6"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Facebook URL
                </label>
                <Input
                  type="url"
                  value={formData.facebookUrl}
                  onChange={(e) => handleChange('facebookUrl', e.target.value)}
                  placeholder="https://facebook.com/yourcompany"
                  className="pr-6"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Instagram URL
                </label>
                <Input
                  type="url"
                  value={formData.instagramUrl}
                  onChange={(e) => handleChange('instagramUrl', e.target.value)}
                  placeholder="https://instagram.com/yourcompany"
                  className="pr-6"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  YouTube URL
                </label>
                <Input
                  type="url"
                  value={formData.youtubeUrl}
                  onChange={(e) => handleChange('youtubeUrl', e.target.value)}
                  placeholder="https://youtube.com/@yourcompany"
                  className="pr-6"
                />
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Services & Products
                </h3>
                {!showServiceForm && (
                  <Button variant="outline" onClick={() => setShowServiceForm(true)} type="button">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                )}
              </div>

              {showServiceForm && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Service/Product Name *
                    </label>
                    <Input
                      type="text"
                      value={formData.serviceInput}
                      onChange={(e) => handleChange('serviceInput', e.target.value)}
                      placeholder="e.g., AI Consulting, Cloud Migration"
                      autoFocus
                      className="pr-6"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Description
                    </label>
                    <textarea
                      className="w-full min-h-[80px] p-3 pr-6 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      value={formData.serviceDescInput}
                      onChange={(e) => handleChange('serviceDescInput', e.target.value)}
                      placeholder="Describe what this service/product does and its key benefits..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      onClick={addService}
                      type="button"
                      disabled={!formData.serviceInput.trim()}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Service
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowServiceForm(false);
                        setFormData({
                          ...formData,
                          serviceInput: '',
                          serviceDescInput: ''
                        });
                      }}
                      type="button"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {formData.services.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No services added yet. Add at least one to continue.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.services.map((service, index) => {
                    const isExpanded = expandedServiceId === service.id;
                    return (
                      <div
                        key={service.id}
                        className="bg-white rounded-lg border border-slate-200 overflow-hidden"
                      >
                        <div 
                          className="p-4 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => setExpandedServiceId(isExpanded ? null : service.id)}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-slate-500 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <Input
                                type="text"
                                value={service.name}
                                onChange={(e) => updateService(index, 'name', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Service name"
                                className="border-0 p-0 pr-6 h-auto font-medium text-slate-900 focus:ring-0 focus:border-b focus:border-blue-500 rounded-none"
                              />
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeService(index);
                            }}
                            className="text-red-600 hover:text-red-700 flex-shrink-0"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-slate-200 space-y-2">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                Description
                              </label>
                              <textarea
                                className="w-full min-h-[60px] p-2 pr-6 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                value={service.description}
                                onChange={(e) => updateService(index, 'description', e.target.value)}
                                placeholder="Service description..."
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Leadership Team
                </h3>
                <Button variant="outline" onClick={addLeader} type="button">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Leader
                </Button>
              </div>

              {(() => {
                console.log('Rendering Step 5 - Leadership length:', formData.leadership.length);
                console.log('Rendering Step 5 - Leadership data:', formData.leadership);
                return null;
              })()}

              {formData.leadership.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No leadership members added yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.leadership.map((leader, index) => {
                    console.log('Rendering leader:', leader);
                    return (
                    <div key={leader.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-slate-900">Leader {index + 1}</h4>
                        <button
                          onClick={() => removeLeader(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          type="text"
                          value={leader.name}
                          onChange={(e) => updateLeader(index, 'name', e.target.value)}
                          placeholder="Full Name"
                          className="pr-6"
                        />
                        <Input
                          type="text"
                          value={leader.role}
                          onChange={(e) => updateLeader(index, 'role', e.target.value)}
                          placeholder="Role/Title"
                          className="pr-6"
                        />
                      </div>
                      <textarea
                        className="w-full min-h-[60px] p-3 pr-6 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        value={leader.bio}
                        onChange={(e) => updateLeader(index, 'bio', e.target.value)}
                        placeholder="Bio/Background"
                      />
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {currentStep === 7 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Blog Articles
                </h3>
                <Button variant="outline" onClick={addBlog} type="button">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Blog
                </Button>
              </div>

              {formData.blogs.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No blog articles added yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.blogs.map((blog, index) => (
                    <div key={blog.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-slate-900">Blog {index + 1}</h4>
                        <button
                          onClick={() => removeBlog(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <Input
                        type="text"
                        value={blog.title}
                        onChange={(e) => updateBlog(index, 'title', e.target.value)}
                        placeholder="Article Title"
                        className="pr-6"
                      />
                      <Input
                        type="url"
                        value={blog.url}
                        onChange={(e) => updateBlog(index, 'url', e.target.value)}
                        placeholder="Article URL"
                        className="pr-6"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          value={blog.date}
                          onChange={(e) => updateBlog(index, 'date', e.target.value)}
                          placeholder="Date"
                          className="pr-6"
                        />
                        <Input
                          type="text"
                          value={blog.author}
                          onChange={(e) => updateBlog(index, 'author', e.target.value)}
                          placeholder="Author"
                          className="pr-6"
                        />
                      </div>
                      <textarea
                        className="w-full min-h-[60px] p-3 pr-6 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        value={blog.summary}
                        onChange={(e) => updateBlog(index, 'summary', e.target.value)}
                        placeholder="Summary"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 8 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Technology & Partners
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Technology Stack
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    type="text"
                    value={formData.techInput}
                    onChange={(e) => handleChange('techInput', e.target.value)}
                    placeholder="e.g., React, Node.js, Python"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addItem('techStack', 'techInput');
                      }
                    }}
                    className="pr-6"
                  />
                  <Button
                    variant="primary"
                    onClick={() => addItem('techStack', 'techInput')}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.techStack.map((tech, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                    >
                      <span>{tech}</span>
                      <button
                        onClick={() => removeItem('techStack', index)}
                        className="hover:text-blue-900"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Partners
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    type="text"
                    value={formData.partnerInput}
                    onChange={(e) => handleChange('partnerInput', e.target.value)}
                    placeholder="e.g., AWS, Microsoft"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addItem('partners', 'partnerInput');
                      }
                    }}
                    className="pr-6"
                  />
                  <Button
                    variant="primary"
                    onClick={() => addItem('partners', 'partnerInput')}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.partners.map((partner, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm"
                    >
                      <span>{partner}</span>
                      <button
                        onClick={() => removeItem('partners', index)}
                        className="hover:text-green-900"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Integrations
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    type="text"
                    value={formData.integrationInput}
                    onChange={(e) => handleChange('integrationInput', e.target.value)}
                    placeholder="e.g., Salesforce, Slack"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addItem('integrations', 'integrationInput');
                      }
                    }}
                    className="pr-6"
                  />
                  <Button
                    variant="primary"
                    onClick={() => addItem('integrations', 'integrationInput')}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.integrations.map((integration, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm"
                    >
                      <span>{integration}</span>
                      <button
                        onClick={() => removeItem('integrations', index)}
                        className="hover:text-purple-900"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 9 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Review Your Information
              </h3>

              <div className="bg-slate-50 rounded-lg p-6 space-y-4 max-h-[400px] overflow-y-auto">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Company Info</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Name:</span> {formData.companyName}</p>
                    <p><span className="font-medium">Website:</span> {formData.website}</p>
                    {formData.industry && <p><span className="font-medium">Industry:</span> {formData.industry}</p>}
                    {formData.founded && <p><span className="font-medium">Founded:</span> {formData.founded}</p>}
                    {formData.location && <p><span className="font-medium">Location:</span> {formData.location}</p>}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Contact</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Email:</span> {formData.email}</p>
                    {formData.phone && <p><span className="font-medium">Phone:</span> {formData.phone}</p>}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Services ({formData.services.length})</h4>
                  <div className="space-y-2">
                    {formData.services.slice(0, 3).map((service, index) => (
                      <div key={service.id} className="text-sm">
                        <p className="font-medium text-slate-900">{service.name}</p>
                        {service.description && (
                          <p className="text-slate-600 text-xs mt-1">{service.description.substring(0, 100)}{service.description.length > 100 ? '...' : ''}</p>
                        )}
                      </div>
                    ))}
                    {formData.services.length > 3 && (
                      <span className="text-xs text-slate-500">
                        +{formData.services.length - 3} more services
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Additional Data</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Leadership:</span> {formData.leadership.length} members</p>
                    <p><span className="font-medium">Blog Articles:</span> {formData.blogs.length}</p>
                    <p><span className="font-medium">Tech Stack:</span> {formData.techStack.length} technologies</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  Ready to complete? All your information will be saved and accessible in the Knowledge Base.
                  You can edit any details later from the Knowledge Base page.
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

    <FirstClientWizard
      isOpen={showFirstClientWizard}
      onComplete={handleFirstClientComplete}
      onSkip={handleSkipFirstClient}
    />

    {/* Onboarding Success Modal */}
    <Modal 
      isOpen={showOnboardingSuccessModal} 
      onClose={() => {}} 
      size="md"
      closeOnEscape={false}
      closeOnClickOutside={false}
    >
      <div className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Onboarding Completed Successfully!
        </h2>
        <p className="text-slate-600 mb-6">
          Your onboarding has been successfully completed. Proceed to add your first client.
        </p>
        <Button
          variant="primary"
          onClick={handleProceedToFirstClient}
          className="w-full"
        >
          Proceed to Add First Client
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </Modal>
  </>
  );
};
