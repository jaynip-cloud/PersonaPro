import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { OnboardingWizard } from '../components/onboarding/OnboardingWizard';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Building2,
  FileText,
  Users,
  Briefcase,
  Plus,
  Edit,
  Trash2,
  Save,
  CheckCircle,
  Sparkles,
  Code,
  Phone,
  Linkedin,
  Twitter,
  Facebook,
  Youtube,
  Globe,
  Mail,
  MapPin,
  BarChart3,
  Lightbulb,
  TrendingUp,
  Target,
  Zap,
  AlertCircle,
  RefreshCw,
  Activity,
  Brain,
  Shield,
  Award,
  Smile,
  Meh,
  Frown,
  Gauge
} from 'lucide-react';

type TabType = 'overview' | 'company' | 'contact' | 'social' | 'services' | 'team' | 'blogs' | 'technology';

export const KnowledgeBase: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState<'ai-overview' | 'view-details'>('ai-overview');
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchProgress, setFetchProgress] = useState<string>('');
  const [fetchProgressStep, setFetchProgressStep] = useState<number>(0);
  const [fetchProgressTotal, setFetchProgressTotal] = useState<number>(5);
  const { user, isKnowledgeBaseComplete, hasCheckedKnowledgeBase, checkKnowledgeBaseStatus, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for auth to finish loading AND knowledge base status check to complete before showing wizard
    if (!loading && user && hasCheckedKnowledgeBase) {
      if (!isKnowledgeBaseComplete) {
        console.log('✅ Showing onboarding wizard - knowledge base not complete');
        setShowWizard(true);
      } else {
        // If onboarding is complete, don't show wizard
        console.log('✅ Hiding onboarding wizard - knowledge base already complete');
        setShowWizard(false);
      }
    } else {
      console.log('⏳ Waiting for conditions:', { loading, hasUser: !!user, hasCheckedKnowledgeBase });
    }
  }, [isKnowledgeBaseComplete, hasCheckedKnowledgeBase, loading, user]);

  useEffect(() => {
    if (user) {
      loadExistingData();
    }
  }, [user]);

  // Check URL params and trigger fetch if needed
  useEffect(() => {
    const fetchParam = searchParams.get('fetch');
    const modeParam = searchParams.get('mode');
    
    if (fetchParam === 'true' && user && !isFetchingData) {
      // Set view mode if specified
      if (modeParam === 'view-details') {
        setViewMode('view-details');
      }
      
      // Trigger data fetch
      fetchCompanyData();
      
      // Remove fetch param from URL
      searchParams.delete('fetch');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user]);

  const fetchCompanyData = async () => {
    if (!user) return;

    setIsFetchingData(true);
    setFetchError(null);
    setFetchProgressStep(0);
    setFetchProgressTotal(5);

    try {
      // Step 1: Preparing request
      setFetchProgressStep(1);
      setFetchProgress('Preparing request...');

      // Get company basic info first
      const { data: profile } = await supabase
        .from('company_profiles')
        .select('company_name, website, linkedin_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile || !profile.company_name || !profile.website || !profile.linkedin_url) {
        throw new Error('Company information is incomplete. Please complete onboarding first.');
      }

      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Step 2: Fetching from Perplexity (this is the long step - Perplexity + GPT happen in edge function)
      setFetchProgressStep(2);
      setFetchProgress('Fetching company data from Perplexity... This may take 30-60 seconds...');

      // Call normalize-company-data edge function
      // Note: This function internally calls Perplexity, then GPT for cleaning/verification
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/normalize-company-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            companyName: (profile as any).company_name,
            website: (profile as any).website,
            linkedinUrl: (profile as any).linkedin_url,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch company data');
      }

      // Step 3: Processing with GPT (happens in edge function, but we show progress)
      setFetchProgressStep(3);
      setFetchProgress('Processing data with GPT... Cleaning, standardizing, and verifying information...');

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Data normalization failed');
      }

      // Step 4: Verifying data
      setFetchProgressStep(4);
      setFetchProgress('Verifying data accuracy and completeness...');

      // Small delay to show verification step
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 5: Saving data
      setFetchProgressStep(5);
      setFetchProgress('Saving data to knowledge base...');

      // Save normalized data to database
      const normalizedData = result.data;
      const { error: saveError } = await supabase
        .from('company_profiles')
        .update({
          company_name: normalizedData.companyName,
          website: normalizedData.website,
          industry: normalizedData.industry,
          about: normalizedData.description,
          value_proposition: normalizedData.valueProposition,
          founded: normalizedData.founded,
          location: normalizedData.location,
          size: normalizedData.size,
          mission: normalizedData.mission,
          vision: normalizedData.vision,
          email: normalizedData.email,
          phone: normalizedData.phone,
          address: normalizedData.address,
          linkedin_url: normalizedData.linkedinUrl,
          twitter_url: normalizedData.twitterUrl,
          facebook_url: normalizedData.facebookUrl,
          instagram_url: normalizedData.instagramUrl,
          youtube_url: normalizedData.youtubeUrl,
          services: normalizedData.services,
          leadership: normalizedData.leadership,
          blogs: normalizedData.blogs,
          technology: normalizedData.technology,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        } as any)
        .eq('user_id', user.id);

      if (saveError) {
        throw new Error(`Failed to save data: ${saveError.message}`);
      }

      // Reload data to display
      await loadExistingData();
      
      // Update knowledge base status
      await checkKnowledgeBaseStatus();

      // Set view mode to view-details
      setViewMode('view-details');

      setFetchProgress('');
      setFetchProgressStep(0);
      setIsFetchingData(false);
    } catch (error: any) {
      console.error('Error fetching company data:', error);
      setFetchError(error.message || 'Failed to fetch company data');
      setFetchProgress('');
      setFetchProgressStep(0);
      setIsFetchingData(false);
    }
  };

  const loadExistingData = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        if (profile.ai_insights) {
          setAiInsights(typeof profile.ai_insights === 'string' ? JSON.parse(profile.ai_insights) : profile.ai_insights);
        }
        setCompanyInfo({
          name: profile.company_name || '',
          canonicalUrl: profile.website || '',
          industry: profile.industry || '',
          description: profile.about || '',
          valueProposition: profile.value_proposition || '',
          founded: profile.founded || '',
          location: profile.location || '',
          size: profile.size || '',
          mission: profile.mission || '',
          vision: profile.vision || ''
        });

        setContactInfo({
          email: profile.email || '',
          phone: profile.phone || '',
          address: profile.address || ''
        });

        setSocialProfiles({
          linkedin: profile.linkedin_url || '',
          twitter: profile.twitter_url || '',
          facebook: profile.facebook_url || '',
          instagram: profile.instagram_url || '',
          youtube: profile.youtube_url || ''
        });

        if (profile.services) {
          try {
            const servicesData = typeof profile.services === 'string' ? JSON.parse(profile.services) : profile.services;
            console.log('Raw servicesData from DB:', servicesData);
            if (Array.isArray(servicesData) && servicesData.length > 0) {
              const mappedServices = servicesData.map((s: any, index: number) => {
                let serviceName = '';
                let serviceDesc = '';
                let serviceId = `service-${index}`;
                let serviceTags: string[] = [];
                let servicePricing = '';

                if (typeof s === 'string') {
                  serviceName = s;
                } else if (typeof s === 'object' && s !== null) {
                  serviceName = typeof s.name === 'string' ? s.name : (typeof s.name === 'object' ? JSON.stringify(s.name) : '');
                  serviceDesc = typeof s.description === 'string' ? s.description : (typeof s.description === 'object' ? JSON.stringify(s.description) : '');
                  serviceId = s.id || serviceId;
                  serviceTags = Array.isArray(s.tags) ? s.tags : [];
                  servicePricing = typeof s.pricing === 'string' ? s.pricing : '';
                }

                return {
                  id: serviceId,
                  name: serviceName || 'Unnamed Service',
                  description: serviceDesc,
                  tags: serviceTags,
                  pricing: servicePricing
                };
              });
              console.log('Setting services in Knowledge Base:', mappedServices);
              setServices(mappedServices);
            }
          } catch (e) {
            console.error('Error parsing services:', e);
          }
        }

        if (profile.leadership) {
          try {
            const leadershipData = typeof profile.leadership === 'string' ? JSON.parse(profile.leadership) : profile.leadership;
            console.log('Raw leadershipData from DB:', leadershipData);
            if (Array.isArray(leadershipData) && leadershipData.length > 0) {
              console.log('Setting leadership in Knowledge Base:', leadershipData);
              setLeadership(leadershipData);
            }
          } catch (e) {
            console.error('Error parsing leadership:', e);
          }
        }

        if (profile.blogs) {
          try {
            const blogsData = typeof profile.blogs === 'string' ? JSON.parse(profile.blogs) : profile.blogs;
            console.log('Raw blogsData from DB:', blogsData);
            if (Array.isArray(blogsData) && blogsData.length > 0) {
              console.log('Setting blogs in Knowledge Base:', blogsData);
              setBlogs(blogsData);
            }
          } catch (e) {
            console.error('Error parsing blogs:', e);
          }
        }

        if (profile.technology) {
          try {
            const technologyData = typeof profile.technology === 'string' ? JSON.parse(profile.technology) : profile.technology;
            setTechnology({
              stack: technologyData.stack || [],
              partners: technologyData.partners || [],
              integrations: technologyData.integrations || []
            });
          } catch (e) {
            console.error('Error parsing technology:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    canonicalUrl: '',
    industry: '',
    description: '',
    valueProposition: '',
    founded: '',
    location: '',
    size: '',
    mission: '',
    vision: ''
  });

  const [contactInfo, setContactInfo] = useState({
    email: '',
    phone: '',
    address: ''
  });

  const [socialProfiles, setSocialProfiles] = useState({
    linkedin: '',
    twitter: '',
    facebook: '',
    instagram: '',
    youtube: ''
  });

  const [leadership, setLeadership] = useState<any[]>([]);

  const [services, setServices] = useState<any[]>([]);

  const [blogs, setBlogs] = useState<any[]>([]);

  const [technology, setTechnology] = useState({
    stack: [] as string[],
    partners: [] as string[],
    integrations: [] as string[]
  });

  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingLeaderId, setEditingLeaderId] = useState<string | null>(null);
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [newTechItem, setNewTechItem] = useState('');
  const [newPartnerItem, setNewPartnerItem] = useState('');
  const [newIntegrationItem, setNewIntegrationItem] = useState('');
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const addService = () => {
    const newService = {
      id: `service-${Date.now()}`,
      name: '',
      description: '',
      tags: [],
      pricing: ''
    };
    setServices([...services, newService]);
    setEditingServiceId(newService.id);
  };

  const updateService = (index: number, field: string, value: any) => {
    const updatedServices = [...services];
    updatedServices[index] = { ...updatedServices[index], [field]: value };
    setServices(updatedServices);
  };

  const deleteService = async (index: number) => {
    if (confirm('Are you sure you want to delete this service?')) {
      const updatedServices = services.filter((_, i) => i !== index);
      setServices(updatedServices);

      // Save to database immediately
      if (user) {
        try {
          await supabase
            .from('company_profiles')
            .update({ services: updatedServices, updated_at: new Date().toISOString() })
            .eq('user_id', user.id);
        } catch (error) {
          console.error('Error deleting service:', error);
          alert('Failed to delete service. Please try again.');
        }
      }
    }
  };

  const addLeader = () => {
    const newLeader = {
      id: `leader-${Date.now()}`,
      name: '',
      role: '',
      bio: '',
      linkedinUrl: '',
      experience: '',
      education: '',
      skills: []
    };
    setLeadership([...leadership, newLeader]);
    setEditingLeaderId(newLeader.id);
  };

  const updateLeader = (index: number, field: string, value: any) => {
    const updatedLeadership = [...leadership];
    updatedLeadership[index] = { ...updatedLeadership[index], [field]: value };
    setLeadership(updatedLeadership);
  };

  const deleteLeader = async (index: number) => {
    if (confirm('Are you sure you want to delete this leader?')) {
      const updatedLeadership = leadership.filter((_, i) => i !== index);
      setLeadership(updatedLeadership);

      // Save to database immediately
      if (user) {
        try {
          await supabase
            .from('company_profiles')
            .update({ leadership: updatedLeadership, updated_at: new Date().toISOString() })
            .eq('user_id', user.id);
        } catch (error) {
          console.error('Error deleting leader:', error);
          alert('Failed to delete leader. Please try again.');
        }
      }
    }
  };

  const addBlog = () => {
    const newBlog = {
      id: `blog-${Date.now()}`,
      title: '',
      url: '',
      date: '',
      summary: '',
      author: ''
    };
    setBlogs([...blogs, newBlog]);
    setEditingBlogId(newBlog.id);
  };

  const updateBlog = (index: number, field: string, value: any) => {
    const updatedBlogs = [...blogs];
    updatedBlogs[index] = { ...updatedBlogs[index], [field]: value };
    setBlogs(updatedBlogs);
  };

  const deleteBlog = async (index: number) => {
    if (confirm('Are you sure you want to delete this blog?')) {
      const updatedBlogs = blogs.filter((_, i) => i !== index);
      setBlogs(updatedBlogs);

      // Save to database immediately
      if (user) {
        try {
          await supabase
            .from('company_profiles')
            .update({ blogs: updatedBlogs, updated_at: new Date().toISOString() })
            .eq('user_id', user.id);
        } catch (error) {
          console.error('Error deleting blog:', error);
          alert('Failed to delete blog. Please try again.');
        }
      }
    }
  };

  const addTechItem = async () => {
    if (newTechItem.trim()) {
      const updatedTech = { ...technology, stack: [...technology.stack, newTechItem.trim()] };
      setTechnology(updatedTech);
      setNewTechItem('');

      // Save to database immediately
      if (user) {
        try {
          await supabase
            .from('company_profiles')
            .update({ technology: updatedTech, updated_at: new Date().toISOString() })
            .eq('user_id', user.id);
        } catch (error) {
          console.error('Error adding tech item:', error);
        }
      }
    }
  };

  const removeTechItem = async (index: number) => {
    const updatedTech = { ...technology, stack: technology.stack.filter((_, i) => i !== index) };
    setTechnology(updatedTech);

    // Save to database immediately
    if (user) {
      try {
        await supabase
          .from('company_profiles')
          .update({ technology: updatedTech, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error removing tech item:', error);
      }
    }
  };

  const addPartner = async () => {
    if (newPartnerItem.trim()) {
      const updatedTech = { ...technology, partners: [...technology.partners, newPartnerItem.trim()] };
      setTechnology(updatedTech);
      setNewPartnerItem('');

      // Save to database immediately
      if (user) {
        try {
          await supabase
            .from('company_profiles')
            .update({ technology: updatedTech, updated_at: new Date().toISOString() })
            .eq('user_id', user.id);
        } catch (error) {
          console.error('Error adding partner:', error);
        }
      }
    }
  };

  const removePartner = async (index: number) => {
    const updatedTech = { ...technology, partners: technology.partners.filter((_, i) => i !== index) };
    setTechnology(updatedTech);

    // Save to database immediately
    if (user) {
      try {
        await supabase
          .from('company_profiles')
          .update({ technology: updatedTech, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error removing partner:', error);
      }
    }
  };

  const addIntegration = async () => {
    if (newIntegrationItem.trim()) {
      const updatedTech = { ...technology, integrations: [...technology.integrations, newIntegrationItem.trim()] };
      setTechnology(updatedTech);
      setNewIntegrationItem('');

      // Save to database immediately
      if (user) {
        try {
          await supabase
            .from('company_profiles')
            .update({ technology: updatedTech, updated_at: new Date().toISOString() })
            .eq('user_id', user.id);
        } catch (error) {
          console.error('Error adding integration:', error);
        }
      }
    }
  };

  const removeIntegration = async (index: number) => {
    const updatedTech = { ...technology, integrations: technology.integrations.filter((_, i) => i !== index) };
    setTechnology(updatedTech);

    // Save to database immediately
    if (user) {
      try {
        await supabase
          .from('company_profiles')
          .update({ technology: updatedTech, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error removing integration:', error);
      }
    }
  };

  const generateAIInsights = async () => {
    if (!user) return;

    setGeneratingInsights(true);
    setInsightsError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-kb-insights`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        let errorMessage = 'Failed to generate insights';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If error response is not JSON, try to get text
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const responseText = await response.text();
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Empty response from server');
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', responseText.substring(0, 200));
        throw new Error('Invalid response format from server');
      }
      setAiInsights(data.insights);
      setActiveTab('overview');
    } catch (error: any) {
      console.error('Error generating insights:', error);
      setInsightsError(error.message || 'Failed to generate insights. Please try again.');
    } finally {
      setGeneratingInsights(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_profiles')
        .update({
          company_name: companyInfo.name,
          website: companyInfo.canonicalUrl,
          industry: companyInfo.industry,
          about: companyInfo.description,
          value_proposition: companyInfo.valueProposition,
          founded: companyInfo.founded,
          location: companyInfo.location,
          size: companyInfo.size,
          mission: companyInfo.mission,
          vision: companyInfo.vision,
          email: contactInfo.email,
          phone: contactInfo.phone,
          address: contactInfo.address,
          linkedin_url: socialProfiles.linkedin,
          twitter_url: socialProfiles.twitter,
          facebook_url: socialProfiles.facebook,
          instagram_url: socialProfiles.instagram,
          youtube_url: socialProfiles.youtube,
          services: services,
          leadership: leadership,
          blogs: blogs,
          technology: technology,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteSetup = async () => {
    if (!user) return;

    setCompleting(true);
    try {
      await handleSave();

      const { error } = await supabase
        .from('company_profiles')
        .update({
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await checkKnowledgeBaseStatus();
      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing setup:', error);
      alert('Failed to complete setup. Please try again.');
    } finally {
      setCompleting(false);
    }
  };

  const tabs = [
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'contact', label: 'Contact', icon: Phone },
    { id: 'social', label: 'Social', icon: Globe },
    { id: 'services', label: 'Services', icon: Briefcase },
    { id: 'team', label: 'Leadership', icon: Users },
    { id: 'blogs', label: 'Blogs', icon: FileText },
    { id: 'technology', label: 'Technology', icon: Code }
  ];

  const handleWizardComplete = async () => {
    setShowWizard(false);
    await checkKnowledgeBaseStatus();
    await loadExistingData();
  };

  return (
    <>
      <OnboardingWizard
        isOpen={showWizard}
        onComplete={handleWizardComplete}
      />

      {/* Loading Overlay for Data Fetching */}
      {isFetchingData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex flex-col items-center space-y-6">
                <RefreshCw className="h-10 w-10 text-primary animate-spin" />
                <div className="text-center w-full">
                  <h3 className="text-lg font-semibold mb-3">Fetching Company Data</h3>
                  <p className="text-sm text-muted-foreground mb-4">{fetchProgress || 'Processing...'}</p>
                  
                  {/* Progressive Steps Indicator */}
                  <div className="space-y-2">
                    {[
                      { step: 1, label: 'Preparing request' },
                      { step: 2, label: 'Fetching from Perplexity' },
                      { step: 3, label: 'Processing with GPT' },
                      { step: 4, label: 'Verifying data' },
                      { step: 5, label: 'Saving to database' }
                    ].map((item) => (
                      <div key={item.step} className="flex items-center gap-3">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          fetchProgressStep >= item.step
                            ? 'bg-primary text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}>
                          {fetchProgressStep > item.step ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            item.step
                          )}
                        </div>
                        <div className={`flex-1 text-sm ${
                          fetchProgressStep >= item.step
                            ? 'text-foreground font-medium'
                            : 'text-muted-foreground'
                        }`}>
                          {item.label}
                        </div>
                        {fetchProgressStep === item.step && (
                          <RefreshCw className="h-4 w-4 text-primary animate-spin" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(fetchProgressStep / fetchProgressTotal) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Step {fetchProgressStep} of {fetchProgressTotal}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Message */}
      {fetchError && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg z-50 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-1">Error Fetching Data</h4>
              <p className="text-sm text-red-700 mb-3">{fetchError}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFetchError(null);
                    fetchCompanyData();
                  }}
                >
                  Retry
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFetchError(null)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Knowledge Base</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive company intelligence powered by AI
            </p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={async () => {
                  await handleSave();
                  setIsEditing(false);
                }} disabled={saving}>
                  {saving ? 'Saving...' : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button variant="primary" onClick={() => {
                setIsEditing(true);
                setActiveTab('company');
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Knowledge Base
              </Button>
            )}
          </div>
        </div>

      {!isEditing && (
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setViewMode('ai-overview')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              viewMode === 'ai-overview'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            AI Overview
          </button>
          <button
            onClick={() => setViewMode('view-details')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              viewMode === 'view-details'
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-4 w-4" />
            View Details
          </button>
        </div>
      )}

      {isEditing && (
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      )}

      {!isEditing && viewMode === 'view-details' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Company Name</h3>
                  <p className="text-foreground">{companyInfo.name || 'Not set'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Industry</h3>
                  <p className="text-foreground">{companyInfo.industry || 'Not set'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Website</h3>
                  <p className="text-foreground">{companyInfo.canonicalUrl || 'Not set'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Founded</h3>
                  <p className="text-foreground">{companyInfo.founded || 'Not set'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Location</h3>
                  <p className="text-foreground">{companyInfo.location || 'Not set'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Company Size</h3>
                  <p className="text-foreground">{companyInfo.size || 'Not set'}</p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">About</h3>
                  <p className="text-foreground">{companyInfo.description || 'Not set'}</p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Mission</h3>
                  <p className="text-foreground">{companyInfo.mission || 'Not set'}</p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Vision</h3>
                  <p className="text-foreground">{companyInfo.vision || 'Not set'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Email</h3>
                  <p className="text-foreground">{contactInfo.email || 'Not set'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Phone</h3>
                  <p className="text-foreground">{contactInfo.phone || 'Not set'}</p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-1">Address</h3>
                  <p className="text-foreground">{contactInfo.address || 'Not set'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Services</CardTitle>
            </CardHeader>
            <CardContent>
              {services.length > 0 ? (
                <div className="space-y-4">
                  {services.map((service, index) => (
                    <div key={index} className="border-l-4 border-primary pl-4">
                      <h3 className="font-semibold text-foreground mb-1">{service.name}</h3>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                      {service.pricing && (
                        <p className="text-sm text-primary mt-1">Pricing: {service.pricing}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No services added yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leadership Team</CardTitle>
            </CardHeader>
            <CardContent>
              {leadership.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {leadership.map((member, index) => (
                    <div key={index} className="border border-border rounded-lg p-4">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {member.name || 'Unnamed Leader'}
                        </h3>
                        <p className="text-sm text-primary font-medium mb-2">
                          {member.role || 'No role specified'}
                        </p>
                      </div>

                      <div className="space-y-2 text-sm">
                        {member.bio && (
                          <div>
                            <span className="font-medium text-foreground">Bio:</span>
                            <p className="text-muted-foreground mt-1">{member.bio}</p>
                          </div>
                        )}
                        {member.experience && (
                          <div>
                            <span className="font-medium text-foreground">Experience:</span>
                            <span className="text-muted-foreground ml-2">{member.experience}</span>
                          </div>
                        )}
                        {member.education && (
                          <div>
                            <span className="font-medium text-foreground">Education:</span>
                            <span className="text-muted-foreground ml-2">{member.education}</span>
                          </div>
                        )}
                        {member.skills && Array.isArray(member.skills) && member.skills.length > 0 && (
                          <div>
                            <span className="font-medium text-foreground">Skills:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {member.skills.map((skill: string, skillIndex: number) => (
                                <Badge key={skillIndex} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {member.linkedinUrl && (
                          <div className="pt-2">
                            <a 
                              href={member.linkedinUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-primary hover:underline text-sm flex items-center gap-1"
                            >
                              <Linkedin className="h-4 w-4" />
                              LinkedIn Profile
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No leadership members added yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Blog Articles</CardTitle>
            </CardHeader>
            <CardContent>
              {blogs.length > 0 ? (
                <div className="space-y-4">
                  {blogs.map((blog, index) => (
                    <div key={index} className="border-l-4 border-primary pl-4">
                      <h3 className="font-semibold text-foreground mb-1">
                        {blog.url ? (
                          <a href={blog.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                            {blog.title}
                          </a>
                        ) : (
                          blog.title
                        )}
                      </h3>
                      {blog.date && (
                        <p className="text-xs text-muted-foreground mb-1">
                          {blog.date}
                          {blog.author && ` • by ${blog.author}`}
                        </p>
                      )}
                      {blog.excerpt && (
                        <p className="text-sm text-muted-foreground mb-2">{blog.excerpt}</p>
                      )}
                      {blog.tags && blog.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {blog.tags.map((tag: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No blog articles added yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Technology Stack</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {technology.stack.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Tech Stack</h3>
                    <div className="flex flex-wrap gap-2">
                      {technology.stack.map((tech, idx) => (
                        <Badge key={idx} variant="secondary">{tech}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {technology.partners.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Partners</h3>
                    <div className="flex flex-wrap gap-2">
                      {technology.partners.map((partner, idx) => (
                        <Badge key={idx} variant="secondary">{partner}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {technology.integrations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Integrations</h3>
                    <div className="flex flex-wrap gap-2">
                      {technology.integrations.map((integration, idx) => (
                        <Badge key={idx} variant="secondary">{integration}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {technology.stack.length === 0 && technology.partners.length === 0 && technology.integrations.length === 0 && (
                  <p className="text-muted-foreground">No technology information added yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!isEditing && viewMode === 'ai-overview' && (
        <Card>
            <CardContent className="pt-7 px-6 pb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">AI-Powered Insights</h2>
                  <p className="text-muted-foreground">
                    Get intelligent analysis of your company's knowledge base
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={generateAIInsights}
                  disabled={generatingInsights}
                >
                  {generatingInsights ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate AI Insights
                    </>
                  )}
                </Button>
              </div>

              {insightsError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Error generating insights</p>
                    <p className="text-sm text-red-700 mt-1">{insightsError}</p>
                  </div>
                </div>
              )}

              {!aiInsights && !generatingInsights && !insightsError && (
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No insights generated yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Click "Generate AI Insights" to analyze your knowledge base and get actionable recommendations
                  </p>
                </div>
              )}

              {aiInsights && (
                <div className="mt-8">
                  {/* Main Executive Summary Container - All content inside this blue section */}
                  <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg p-8 border-2 border-blue-200 space-y-8">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-6">
                      <div className="p-3 bg-blue-600 rounded-lg">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900">Executive Summary</h3>
                        <p className="text-sm text-slate-600 mt-1">Comprehensive overview of your company intelligence</p>
                      </div>
                    </div>

                    {/* Check if new nested structure or old flat structure */}
                    {typeof aiInsights.executiveSummary === 'object' && aiInsights.executiveSummary !== null ? (
                      <>
                        {/* Overview */}
                        {aiInsights.executiveSummary.overview && (
                          <div className="prose prose-slate max-w-none">
                            <p className="text-slate-800 leading-relaxed whitespace-pre-wrap text-base">{aiInsights.executiveSummary.overview}</p>
                          </div>
                        )}

                        {/* Reasoning */}
                        {aiInsights.executiveSummary.reasoning && (
                          <div className="bg-blue-100/50 rounded-lg p-4 border border-blue-200">
                            <h4 className="text-sm font-semibold text-blue-900 mb-2">Analysis Reasoning</h4>
                            <p className="text-sm text-blue-800 leading-relaxed">{aiInsights.executiveSummary.reasoning}</p>
                          </div>
                        )}

                        {/* All Sections */}
                        {aiInsights.executiveSummary.sections && (
                          <div className="space-y-8 pt-4 border-t border-blue-200">
                            {(() => {
                              const sections = aiInsights.executiveSummary.sections;
                              return (
                                <>
                              {/* Company Profile */}
                              {sections.companyProfile && (
                                <div className="bg-white rounded-lg p-6 border border-blue-200">
                                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                    Company Profile
                                  </h4>
                                  <div className="space-y-4">
                                    {sections.companyProfile.companyOverview && (
                                      <p className="text-sm text-slate-700 leading-relaxed">{sections.companyProfile.companyOverview}</p>
                                    )}
                                    {sections.companyProfile.keyCharacteristics && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Key Characteristics</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.companyProfile.keyCharacteristics}</p>
                                      </div>
                                    )}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      <div>
                                        <div className="text-xs text-slate-500 mb-1">Maturity</div>
                                        <div className="text-sm font-semibold text-slate-900 capitalize">{sections.companyProfile.maturityLevel}</div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-slate-500 mb-1">Sophistication</div>
                                        <div className="text-sm font-semibold text-slate-900">{sections.companyProfile.sophisticationScore}/100</div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-slate-500 mb-1">Market Readiness</div>
                                        <div className="text-sm font-semibold text-slate-900">{sections.companyProfile.marketReadiness}/100</div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-slate-500 mb-1">Strategic Value</div>
                                        <div className="text-sm font-semibold text-slate-900">{sections.companyProfile.strategicValue}/100</div>
                                      </div>
                                    </div>
                                    {sections.companyProfile.reasoning && (
                                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                        <p className="text-xs text-blue-800 leading-relaxed">{sections.companyProfile.reasoning}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Market Intelligence */}
                              {sections.marketIntelligence && (
                                <div className="bg-white rounded-lg p-6 border border-blue-200">
                                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-blue-600" />
                                    Market Intelligence
                                  </h4>
                                  <div className="space-y-4">
                                    {sections.marketIntelligence.industryPosition && (
                                      <p className="text-sm text-slate-700 leading-relaxed">{sections.marketIntelligence.industryPosition}</p>
                                    )}
                                    {sections.marketIntelligence.recentNews && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Recent News & Updates</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.marketIntelligence.recentNews}</p>
                                      </div>
                                    )}
                                    {sections.marketIntelligence.competitiveLandscape && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Competitive Landscape</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.marketIntelligence.competitiveLandscape}</p>
                                      </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div>
                                        <div className="text-xs text-slate-500 mb-1">Competitive Pressure</div>
                                        <div className="text-sm font-semibold text-slate-900 capitalize">{sections.marketIntelligence.competitivePressure}</div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-slate-500 mb-1">Growth Trajectory</div>
                                        <div className="text-sm font-semibold text-slate-900 capitalize">{sections.marketIntelligence.growthTrajectory}</div>
                                      </div>
                                    </div>
                                    {sections.marketIntelligence.marketChallenges && sections.marketIntelligence.marketChallenges.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Market Challenges</h5>
                                        <ul className="space-y-2">
                                          {sections.marketIntelligence.marketChallenges.map((challenge: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-2">
                                              <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-1" />
                                              <span className="text-sm text-slate-700">{challenge}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {sections.marketIntelligence.marketOpportunities && sections.marketIntelligence.marketOpportunities.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Market Opportunities</h5>
                                        <ul className="space-y-2">
                                          {sections.marketIntelligence.marketOpportunities.map((opportunity: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-2">
                                              <Target className="h-4 w-4 text-blue-600 flex-shrink-0 mt-1" />
                                              <span className="text-sm text-slate-700">{opportunity}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {sections.marketIntelligence.reasoning && (
                                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                        <p className="text-xs text-blue-800 leading-relaxed">{sections.marketIntelligence.reasoning}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Strengths */}
                              {sections.strengths && (
                                <div className="bg-white rounded-lg p-6 border border-blue-200">
                                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-green-600" />
                                    Core Strengths
                                  </h4>
                                  <div className="space-y-4">
                                    {sections.strengths.uniqueValuePropositions && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Unique Value Propositions</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.strengths.uniqueValuePropositions}</p>
                                      </div>
                                    )}
                                    {sections.strengths.coreStrengths && sections.strengths.coreStrengths.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Core Strengths</h5>
                                        <ul className="space-y-3">
                                          {sections.strengths.coreStrengths.map((strength: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-2">
                                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
                                              <span className="text-sm text-slate-700 leading-relaxed">{strength}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {sections.strengths.competitiveAdvantages && sections.strengths.competitiveAdvantages.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Competitive Advantages</h5>
                                        <ul className="space-y-3">
                                          {sections.strengths.competitiveAdvantages.map((advantage: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-2">
                                              <Award className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-1" />
                                              <span className="text-sm text-slate-700 leading-relaxed">{advantage}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {sections.strengths.reasoning && (
                                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                        <p className="text-xs text-blue-800 leading-relaxed">{sections.strengths.reasoning}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Opportunities */}
                              {sections.opportunities && (
                                <div className="bg-white rounded-lg p-6 border border-blue-200">
                                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Target className="h-5 w-5 text-blue-600" />
                                    Growth Opportunities
                                  </h4>
                                  <div className="space-y-4">
                                    {sections.opportunities.expansionAreas && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Expansion Areas</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.opportunities.expansionAreas}</p>
                                      </div>
                                    )}
                                    {sections.opportunities.strategicPartnerships && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Strategic Partnerships</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.opportunities.strategicPartnerships}</p>
                                      </div>
                                    )}
                                    {sections.opportunities.growthOpportunities && sections.opportunities.growthOpportunities.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Growth Opportunities</h5>
                                        <ul className="space-y-3">
                                          {sections.opportunities.growthOpportunities.map((opportunity: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-2">
                                              <TrendingUp className="h-4 w-4 text-blue-600 flex-shrink-0 mt-1" />
                                              <span className="text-sm text-slate-700 leading-relaxed">{opportunity}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {sections.opportunities.recommendedApproach && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Recommended Approach</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.opportunities.recommendedApproach}</p>
                                      </div>
                                    )}
                                    {sections.opportunities.reasoning && (
                                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                        <p className="text-xs text-blue-800 leading-relaxed">{sections.opportunities.reasoning}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Technology Assessment */}
                              {sections.technologyAssessment && (
                                <div className="bg-white rounded-lg p-6 border border-blue-200">
                                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Code className="h-5 w-5 text-blue-600" />
                                    Technology Assessment
                                  </h4>
                                  <div className="space-y-4">
                                    {sections.technologyAssessment.techStackAnalysis && (
                                      <p className="text-sm text-slate-700 leading-relaxed">{sections.technologyAssessment.techStackAnalysis}</p>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <div className="text-xs text-slate-500 mb-1">Tech Modernity Score</div>
                                        <div className="text-2xl font-bold text-slate-900">{sections.technologyAssessment.techModernityScore}/100</div>
                                        {sections.technologyAssessment.techModernityReasoning && (
                                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">{sections.technologyAssessment.techModernityReasoning}</p>
                                        )}
                                      </div>
                                      <div>
                                        <div className="text-xs text-slate-500 mb-1">Innovation Level</div>
                                        <div className="text-sm font-semibold text-slate-900 capitalize">{sections.technologyAssessment.innovationLevel}</div>
                                        {sections.technologyAssessment.innovationReasoning && (
                                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">{sections.technologyAssessment.innovationReasoning}</p>
                                        )}
                                      </div>
                                    </div>
                                    {sections.technologyAssessment.partnersAnalysis && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Partners Analysis</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.technologyAssessment.partnersAnalysis}</p>
                                      </div>
                                    )}
                                    {sections.technologyAssessment.integrationsAnalysis && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Integrations Analysis</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.technologyAssessment.integrationsAnalysis}</p>
                                      </div>
                                    )}
                                    {sections.technologyAssessment.techRecommendations && sections.technologyAssessment.techRecommendations.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Technology Recommendations</h5>
                                        <ul className="space-y-2">
                                          {sections.technologyAssessment.techRecommendations.map((rec: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-2">
                                              <Lightbulb className="h-4 w-4 text-blue-600 flex-shrink-0 mt-1" />
                                              <span className="text-sm text-slate-700 leading-relaxed">{rec}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {sections.technologyAssessment.reasoning && (
                                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                        <p className="text-xs text-blue-800 leading-relaxed">{sections.technologyAssessment.reasoning}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Content Strategy */}
                              {sections.contentStrategy && (
                                <div className="bg-white rounded-lg p-6 border border-blue-200">
                                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                    Content Strategy
                                  </h4>
                                  <div className="space-y-4">
                                    {sections.contentStrategy.contentAnalysis && (
                                      <p className="text-sm text-slate-700 leading-relaxed">{sections.contentStrategy.contentAnalysis}</p>
                                    )}
                                    <div className="flex items-center gap-4">
                                      <div>
                                        <div className="text-xs text-slate-500 mb-1">Content Score</div>
                                        <div className="text-2xl font-bold text-slate-900">{sections.contentStrategy.contentScore}/100</div>
                                      </div>
                                    </div>
                                    {sections.contentStrategy.contentScoreReasoning && (
                                      <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-700 leading-relaxed">{sections.contentStrategy.contentScoreReasoning}</p>
                                      </div>
                                    )}
                                    {sections.contentStrategy.contentBehavior && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Content Behavior</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.contentStrategy.contentBehavior}</p>
                                      </div>
                                    )}
                                    {sections.contentStrategy.contentGaps && sections.contentStrategy.contentGaps.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Content Gaps</h5>
                                        <ul className="space-y-2">
                                          {sections.contentStrategy.contentGaps.map((gap: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-2">
                                              <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-1" />
                                              <span className="text-sm text-slate-700 leading-relaxed">{gap}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {sections.contentStrategy.contentRecommendations && sections.contentStrategy.contentRecommendations.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Content Recommendations</h5>
                                        <ul className="space-y-2">
                                          {sections.contentStrategy.contentRecommendations.map((rec: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-2">
                                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
                                              <span className="text-sm text-slate-700 leading-relaxed">{rec}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {sections.contentStrategy.reasoning && (
                                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                        <p className="text-xs text-blue-800 leading-relaxed">{sections.contentStrategy.reasoning}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Leadership Team */}
                              {sections.leadershipTeam && (
                                <div className="bg-white rounded-lg p-6 border border-blue-200">
                                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Users className="h-5 w-5 text-blue-600" />
                                    Leadership Team
                                  </h4>
                                  <div className="space-y-4">
                                    {sections.leadershipTeam.teamAnalysis && (
                                      <p className="text-sm text-slate-700 leading-relaxed">{sections.leadershipTeam.teamAnalysis}</p>
                                    )}
                                    <div>
                                      <div className="text-xs text-slate-500 mb-1">Team Strength Score</div>
                                      <div className="text-2xl font-bold text-slate-900">{sections.leadershipTeam.teamStrengthScore}/100</div>
                                    </div>
                                    {sections.leadershipTeam.teamStrengthReasoning && (
                                      <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-700 leading-relaxed">{sections.leadershipTeam.teamStrengthReasoning}</p>
                                      </div>
                                    )}
                                    {sections.leadershipTeam.leadershipGaps && sections.leadershipTeam.leadershipGaps.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Leadership Gaps</h5>
                                        <ul className="space-y-2">
                                          {sections.leadershipTeam.leadershipGaps.map((gap: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-2">
                                              <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-1" />
                                              <span className="text-sm text-slate-700 leading-relaxed">{gap}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {sections.leadershipTeam.teamRecommendations && sections.leadershipTeam.teamRecommendations.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Team Recommendations</h5>
                                        <ul className="space-y-2">
                                          {sections.leadershipTeam.teamRecommendations.map((rec: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-2">
                                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
                                              <span className="text-sm text-slate-700 leading-relaxed">{rec}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {sections.leadershipTeam.reasoning && (
                                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                        <p className="text-xs text-blue-800 leading-relaxed">{sections.leadershipTeam.reasoning}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Brand Presence */}
                              {sections.brandPresence && (
                                <div className="bg-white rounded-lg p-6 border border-blue-200">
                                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Globe className="h-5 w-5 text-blue-600" />
                                    Brand Presence
                                  </h4>
                                  <div className="space-y-4">
                                    {sections.brandPresence.brandAnalysis && (
                                      <p className="text-sm text-slate-700 leading-relaxed">{sections.brandPresence.brandAnalysis}</p>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <div className="text-xs text-slate-500 mb-1">Brand Presence Score</div>
                                        <div className="text-2xl font-bold text-slate-900">{sections.brandPresence.brandPresenceScore}/100</div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-slate-500 mb-1">Brand Tone</div>
                                        <div className="text-sm font-semibold text-slate-900 capitalize">{sections.brandPresence.brandTone}</div>
                                      </div>
                                    </div>
                                    {sections.brandPresence.brandPresenceReasoning && (
                                      <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="text-xs text-slate-700 leading-relaxed">{sections.brandPresence.brandPresenceReasoning}</p>
                                      </div>
                                    )}
                                    {sections.brandPresence.marketPerception && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Market Perception</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.brandPresence.marketPerception}</p>
                                      </div>
                                    )}
                                    {sections.brandPresence.brandRecommendations && sections.brandPresence.brandRecommendations.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Brand Recommendations</h5>
                                        <ul className="space-y-2">
                                          {sections.brandPresence.brandRecommendations.map((rec: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-2">
                                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
                                              <span className="text-sm text-slate-700 leading-relaxed">{rec}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {sections.brandPresence.reasoning && (
                                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                        <p className="text-xs text-blue-800 leading-relaxed">{sections.brandPresence.reasoning}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Key Metrics */}
                              {sections.keyMetrics && (
                                <div className="bg-white rounded-lg p-6 border border-blue-200">
                                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Gauge className="h-5 w-5 text-blue-600" />
                                    Key Performance Indicators
                                  </h4>
                                  <div className="space-y-6">
                                    {['contentScore', 'teamStrength', 'techModernity', 'marketReadiness', 'brandPresence', 'growthPotential', 'engagementScore', 'collaborationScore', 'communicationScore', 'alignmentScore', 'momentumScore', 'valueRealizationScore', 'overallHealthScore'].map((key) => {
                                      const score = sections.keyMetrics[key];
                                      if (score === undefined || score === null) return null;
                                      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                      const getColor = (score: number) => {
                                        if (score >= 75) return 'text-green-600 bg-green-50 border-green-200';
                                        if (score >= 50) return 'text-blue-600 bg-blue-50 border-blue-200';
                                        if (score >= 25) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
                                        return 'text-red-600 bg-red-50 border-red-200';
                                      };
                                      return (
                                        <div key={key} className="border-2 border-slate-200 rounded-lg overflow-hidden">
                                          <div className={`p-4 ${getColor(score)} border-b-2 border-current/20`}>
                                            <div className="flex items-center justify-between">
                                              <div className="text-sm font-semibold mb-2">{label}</div>
                                              <div className="flex items-end gap-1">
                                                <span className="text-3xl font-bold">{score}</span>
                                                <span className="text-sm pb-1">/100</span>
                                              </div>
                                            </div>
                                            <div className="mt-2 h-2 bg-white rounded-full overflow-hidden">
                                              <div
                                                className="h-full bg-current transition-all"
                                                style={{ width: `${score}%` }}
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {sections.keyMetrics.overallScoreReasoning && (
                                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                        <h5 className="text-sm font-semibold text-blue-900 mb-2">Overall Score Reasoning</h5>
                                        <p className="text-xs text-blue-800 leading-relaxed">{sections.keyMetrics.overallScoreReasoning}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Sentiment Analysis */}
                              {sections.sentimentAnalysis && (
                                <div className="bg-white rounded-lg p-6 border border-blue-200">
                                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-purple-600" />
                                    Sentiment Analysis
                                  </h4>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                          {sections.sentimentAnalysis.overallSentiment === 'very positive' || sections.sentimentAnalysis.overallSentiment === 'positive' ? <Smile className="h-8 w-8 text-green-600" /> : null}
                                          {sections.sentimentAnalysis.overallSentiment === 'neutral' ? <Meh className="h-8 w-8 text-yellow-600" /> : null}
                                          {(sections.sentimentAnalysis.overallSentiment === 'concerned' || sections.sentimentAnalysis.overallSentiment === 'negative') ? <Frown className="h-8 w-8 text-red-600" /> : null}
                                          <div>
                                            <div className="text-xs text-slate-500">Overall Sentiment</div>
                                            <div className="text-sm font-semibold text-slate-900 capitalize">
                                              {sections.sentimentAnalysis.overallSentiment}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-2xl font-bold text-slate-900">{sections.sentimentAnalysis.sentimentScore}</div>
                                          <div className="text-xs text-slate-500">Score</div>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="p-3 bg-slate-50 rounded-lg">
                                          <div className="text-xs text-slate-500 mb-1">Brand Tone</div>
                                          <div className="text-sm font-semibold text-slate-900 capitalize">
                                            {sections.sentimentAnalysis.brandTone}
                                          </div>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-lg">
                                          <div className="text-xs text-slate-500 mb-1">Confidence Level</div>
                                          <div className="text-sm font-semibold text-slate-900 capitalize">
                                            {sections.sentimentAnalysis.confidenceLevel}
                                          </div>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-lg">
                                          <div className="text-xs text-slate-500 mb-1">Sentiment Trend</div>
                                          <div className="text-sm font-semibold text-slate-900 capitalize">
                                            {sections.sentimentAnalysis.sentimentTrend}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    {sections.sentimentAnalysis.marketPerception && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Market Perception</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.sentimentAnalysis.marketPerception}</p>
                                      </div>
                                    )}
                                    {sections.sentimentAnalysis.reasoning && (
                                      <div className="p-3 bg-blue-50 rounded-lg">
                                        <p className="text-xs text-blue-800 leading-relaxed">{sections.sentimentAnalysis.reasoning}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Behavior Analysis */}
                              {sections.behaviorAnalysis && (
                                <div className="bg-white rounded-lg p-6 border border-blue-200">
                                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Brain className="h-5 w-5 text-indigo-600" />
                                    Behavioral Analysis
                                  </h4>
                                  <div className="space-y-4">
                                    {sections.behaviorAnalysis.contentBehavior && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Content Behavior</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.behaviorAnalysis.contentBehavior}</p>
                                      </div>
                                    )}
                                    {sections.behaviorAnalysis.marketApproach && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Market Approach</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.behaviorAnalysis.marketApproach}</p>
                                      </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="p-3 bg-slate-50 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="text-sm font-semibold text-slate-900">Innovation Level</div>
                                          <Badge variant="default" className="capitalize text-xs">
                                            {sections.behaviorAnalysis.innovationLevel}
                                          </Badge>
                                        </div>
                                        {sections.behaviorAnalysis.innovationReasoning && (
                                          <p className="text-xs text-slate-600 leading-relaxed mt-2">
                                            {sections.behaviorAnalysis.innovationReasoning}
                                          </p>
                                        )}
                                      </div>
                                      <div className="p-3 bg-slate-50 rounded-lg">
                                        <div className="text-sm font-semibold text-slate-900 mb-2">Customer Focus</div>
                                        <p className="text-xs text-slate-600 leading-relaxed">{sections.behaviorAnalysis.customerFocus}</p>
                                      </div>
                                    </div>
                                    {sections.behaviorAnalysis.growthOrientation && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Growth Orientation</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.behaviorAnalysis.growthOrientation}</p>
                                      </div>
                                    )}
                                    {sections.behaviorAnalysis.evidence && (
                                      <div className="p-3 bg-blue-50 rounded-lg">
                                        <h5 className="text-xs font-semibold text-blue-900 mb-2">Supporting Evidence</h5>
                                        <p className="text-xs text-blue-800 leading-relaxed">{sections.behaviorAnalysis.evidence}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Risk Factors */}
                              {sections.riskFactors && (
                                <div className="bg-white rounded-lg p-6 border border-blue-200">
                                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-orange-600" />
                                    Risk Factors
                                  </h4>
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="text-xs text-slate-500">Risk Level:</div>
                                      <Badge variant={sections.riskFactors.riskLevel === 'high' ? 'destructive' : sections.riskFactors.riskLevel === 'medium' ? 'default' : 'secondary'} className="capitalize">
                                        {sections.riskFactors.riskLevel}
                                      </Badge>
                                    </div>
                                    {sections.riskFactors.identifiedRisks && sections.riskFactors.identifiedRisks.length > 0 && (
                                      <ul className="space-y-3">
                                        {sections.riskFactors.identifiedRisks.map((risk: string, idx: number) => (
                                          <li key={idx} className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                            <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-1" />
                                            <span className="text-sm text-slate-700 leading-relaxed">{risk}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                    {sections.riskFactors.riskMitigation && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Risk Mitigation Strategy</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.riskFactors.riskMitigation}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Strategic Recommendations */}
                              {sections.strategicRecommendations && (
                                <div className="bg-white rounded-lg p-6 border border-blue-200">
                                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Lightbulb className="h-5 w-5 text-blue-600" />
                                    Strategic Recommendations
                                  </h4>
                                  <div className="space-y-6">
                                    {sections.strategicRecommendations.immediatePriorities && sections.strategicRecommendations.immediatePriorities.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-3">Immediate Priorities (Next 30-60 Days)</h5>
                                        <div className="space-y-3">
                                          {sections.strategicRecommendations.immediatePriorities.map((priority: string, idx: number) => (
                                            <div key={idx} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-semibold">
                                                {idx + 1}
                                              </span>
                                              <p className="text-sm text-slate-700 leading-relaxed flex-1">{priority}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {sections.strategicRecommendations.strategicInitiatives && sections.strategicRecommendations.strategicInitiatives.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-3">Long-Term Strategic Initiatives</h5>
                                        <div className="space-y-3">
                                          {sections.strategicRecommendations.strategicInitiatives.map((initiative: string, idx: number) => (
                                            <div key={idx} className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-600 text-white text-xs flex items-center justify-center font-semibold">
                                                {idx + 1}
                                              </span>
                                              <p className="text-sm text-slate-700 leading-relaxed flex-1">{initiative}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {sections.strategicRecommendations.communicationStrategy && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Communication Strategy</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.strategicRecommendations.communicationStrategy}</p>
                                      </div>
                                    )}
                                    {sections.strategicRecommendations.growthStrategy && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Growth Strategy</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.strategicRecommendations.growthStrategy}</p>
                                      </div>
                                    )}
                                    {sections.strategicRecommendations.reasoning && (
                                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                        <h5 className="text-sm font-semibold text-blue-900 mb-2">Recommendation Reasoning</h5>
                                        <p className="text-xs text-blue-800 leading-relaxed">{sections.strategicRecommendations.reasoning}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Signals */}
                              {sections.signals && (
                                <div className="bg-white rounded-lg p-6 border border-blue-200">
                                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-blue-600" />
                                    Key Signals
                                  </h4>
                                  <div className="space-y-4">
                                    {sections.signals.greenFlags && sections.signals.greenFlags.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                                          <CheckCircle className="h-4 w-4" />
                                          Green Flags (Positive Signals)
                                        </h5>
                                        <ul className="space-y-2">
                                          {sections.signals.greenFlags.map((flag: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
                                              <span className="text-sm text-slate-700">{flag}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {sections.signals.redFlags && sections.signals.redFlags.length > 0 && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                                          <AlertCircle className="h-4 w-4" />
                                          Red Flags (Concerning Signals)
                                        </h5>
                                        <ul className="space-y-2">
                                          {sections.signals.redFlags.map((flag: string, idx: number) => (
                                            <li key={idx} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                                              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-1" />
                                              <span className="text-sm text-slate-700">{flag}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {sections.signals.predictiveInsights && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Predictive Insights</h5>
                                        <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                                          {sections.signals.predictiveInsights.likelyNextStep && (
                                            <div>
                                              <div className="text-xs text-slate-500 mb-1">Likely Next Step</div>
                                              <p className="text-sm text-slate-700">{sections.signals.predictiveInsights.likelyNextStep}</p>
                                            </div>
                                          )}
                                          <div className="grid grid-cols-3 gap-2">
                                            <div>
                                              <div className="text-xs text-slate-500 mb-1">Retention Probability</div>
                                              <div className="text-sm font-semibold text-slate-900">{sections.signals.predictiveInsights.retentionProbability}%</div>
                                            </div>
                                            <div>
                                              <div className="text-xs text-slate-500 mb-1">Growth Probability</div>
                                              <div className="text-sm font-semibold text-slate-900">{sections.signals.predictiveInsights.growthProbability}%</div>
                                            </div>
                                            <div>
                                              <div className="text-xs text-slate-500 mb-1">Time to Decision</div>
                                              <div className="text-sm font-semibold text-slate-900 capitalize">{sections.signals.predictiveInsights.timeToDecision}</div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {sections.signals.reasoning && (
                                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                        <p className="text-xs text-blue-800 leading-relaxed">{sections.signals.reasoning}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Data Analysis */}
                              {sections.dataAnalysis && (
                                <div className="bg-white rounded-lg p-6 border border-blue-200">
                                  <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-blue-600" />
                                    Data Analysis & Methodology
                                  </h4>
                                  <div className="space-y-4">
                                    {sections.dataAnalysis.companyProfileUsage && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Company Profile Data Usage</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.dataAnalysis.companyProfileUsage}</p>
                                      </div>
                                    )}
                                    {sections.dataAnalysis.marketIntelligenceUsage && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Market Intelligence Usage</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.dataAnalysis.marketIntelligenceUsage}</p>
                                      </div>
                                    )}
                                    {sections.dataAnalysis.internalDataUsage && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Internal Data Usage</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.dataAnalysis.internalDataUsage}</p>
                                      </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="p-3 bg-slate-50 rounded-lg">
                                        <div className="text-xs text-slate-500 mb-1">Data Confidence</div>
                                        <div className="text-sm font-semibold text-slate-900 capitalize">{sections.dataAnalysis.dataConfidence}</div>
                                      </div>
                                    </div>
                                    {sections.dataAnalysis.dataConfidenceReasoning && (
                                      <div className="p-3 bg-blue-50 rounded-lg">
                                        <h5 className="text-xs font-semibold text-blue-900 mb-2">Confidence Reasoning</h5>
                                        <p className="text-xs text-blue-800 leading-relaxed">{sections.dataAnalysis.dataConfidenceReasoning}</p>
                                      </div>
                                    )}
                                    {sections.dataAnalysis.dataGaps && (
                                      <div>
                                        <h5 className="text-sm font-semibold text-slate-900 mb-2">Data Gaps</h5>
                                        <p className="text-sm text-slate-700 leading-relaxed">{sections.dataAnalysis.dataGaps}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                                </>
                              );
                            })()}
                          </div>
                        )}
                      </>
                    ) : (
                      /* Fallback for old structure (string executiveSummary) */
                      <>
                        {typeof aiInsights.executiveSummary === 'string' && (
                          <div className="prose prose-slate max-w-none">
                            <p className="text-slate-800 leading-relaxed whitespace-pre-wrap text-base">{aiInsights.executiveSummary}</p>
                          </div>
                        )}
                        {aiInsights.summary && (
                          <div className="bg-blue-100/50 rounded-lg p-4 border border-blue-200">
                            <h4 className="text-sm font-semibold text-blue-900 mb-2">Summary</h4>
                            <p className="text-sm text-blue-800 leading-relaxed">{aiInsights.summary}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
      )}

      {isEditing && activeTab === 'company' && (
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Company Name
                  </label>
                  <Input
                    type="text"
                    value={companyInfo.name}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Website URL
                  </label>
                  <Input
                    type="url"
                    value={companyInfo.canonicalUrl}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, canonicalUrl: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Industry
                  </label>
                  <Input
                    type="text"
                    value={companyInfo.industry}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, industry: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Founded
                  </label>
                  <Input
                    type="text"
                    value={companyInfo.founded}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, founded: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Location
                  </label>
                  <Input
                    type="text"
                    value={companyInfo.location}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, location: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Company Size
                  </label>
                  <Input
                    type="text"
                    value={companyInfo.size}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, size: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Company Description
                </label>
                <textarea
                  className="w-full min-h-[100px] p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  value={companyInfo.description}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Value Proposition
                </label>
                <textarea
                  className="w-full min-h-[80px] p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  value={companyInfo.valueProposition}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, valueProposition: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Mission Statement
                </label>
                <textarea
                  className="w-full min-h-[80px] p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  value={companyInfo.mission}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, mission: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Vision Statement
                </label>
                <textarea
                  className="w-full min-h-[80px] p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  value={companyInfo.vision}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, vision: e.target.value })}
                />
              </div>

            </div>
          </CardContent>
        </Card>
      )}

      {isEditing && activeTab === 'contact' && (
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email
                </label>
                <Input
                  type="email"
                  value={contactInfo.email}
                  onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Phone className="h-4 w-4 inline mr-2" />
                  Phone
                </label>
                <Input
                  type="tel"
                  value={contactInfo.phone}
                  onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Address
                </label>
                <Input
                  type="text"
                  value={contactInfo.address}
                  onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })}
                />
              </div>

            </div>
          </CardContent>
        </Card>
      )}

      {isEditing && activeTab === 'social' && (
        <Card>
          <CardHeader>
            <CardTitle>Social Media Profiles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Linkedin className="h-4 w-4 inline mr-2" />
                  LinkedIn
                </label>
                <Input
                  type="url"
                  value={socialProfiles.linkedin}
                  onChange={(e) => setSocialProfiles({ ...socialProfiles, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/company/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Twitter className="h-4 w-4 inline mr-2" />
                  Twitter/X
                </label>
                <Input
                  type="url"
                  value={socialProfiles.twitter}
                  onChange={(e) => setSocialProfiles({ ...socialProfiles, twitter: e.target.value })}
                  placeholder="https://twitter.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Facebook className="h-4 w-4 inline mr-2" />
                  Facebook
                </label>
                <Input
                  type="url"
                  value={socialProfiles.facebook}
                  onChange={(e) => setSocialProfiles({ ...socialProfiles, facebook: e.target.value })}
                  placeholder="https://facebook.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Globe className="h-4 w-4 inline mr-2" />
                  Instagram
                </label>
                <Input
                  type="url"
                  value={socialProfiles.instagram}
                  onChange={(e) => setSocialProfiles({ ...socialProfiles, instagram: e.target.value })}
                  placeholder="https://instagram.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Youtube className="h-4 w-4 inline mr-2" />
                  YouTube
                </label>
                <Input
                  type="url"
                  value={socialProfiles.youtube}
                  onChange={(e) => setSocialProfiles({ ...socialProfiles, youtube: e.target.value })}
                  placeholder="https://youtube.com/..."
                />
              </div>

            </div>
          </CardContent>
        </Card>
      )}

      {isEditing && activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" onClick={addService}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service Manually
            </Button>
          </div>

          {services.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                <p className="text-slate-600 mb-2">No services added yet</p>
                <p className="text-sm text-slate-500">Services you entered during onboarding will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {services.map((service, index) => {
                const isEditing = editingServiceId === service.id;
                return (
                  <Card key={service.id}>
                    <CardContent className="pt-7 px-6 pb-6">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Service Name
                            </label>
                            <Input
                              type="text"
                              value={service.name}
                              onChange={(e) => updateService(index, 'name', e.target.value)}
                              placeholder="Enter service name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Description
                            </label>
                            <textarea
                              className="w-full min-h-[100px] p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                              value={service.description}
                              onChange={(e) => updateService(index, 'description', e.target.value)}
                              placeholder="Describe the service..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Pricing
                            </label>
                            <Input
                              type="text"
                              value={service.pricing}
                              onChange={(e) => updateService(index, 'pricing', e.target.value)}
                              placeholder="e.g., $99/month, Custom quote"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={async () => {
                              setEditingServiceId(null);
                              if (user) {
                                try {
                                  await supabase
                                    .from('company_profiles')
                                    .update({ services: services, updated_at: new Date().toISOString() })
                                    .eq('user_id', user.id);
                                } catch (error) {
                                  console.error('Error saving service:', error);
                                }
                              }
                            }}>
                              Done
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                              {typeof service.name === 'string' ? service.name : 'Unnamed Service'}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3">
                              {typeof service.description === 'string' ? service.description : ''}
                            </p>
                            {service.tags && service.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {service.tags.map((tag: string, idx: number) => (
                                  <Badge key={idx} variant="secondary">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {service.pricing && (
                              <div className="text-sm text-muted-foreground">
                                <span className="font-medium">Pricing:</span> {service.pricing}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditingServiceId(service.id)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => deleteService(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

        </div>
      )}

      {isEditing && activeTab === 'team' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" onClick={addLeader}>
              <Plus className="h-4 w-4 mr-2" />
              Add Leader
            </Button>
          </div>

          {leadership.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                <p className="text-slate-600 mb-2">No leadership members added yet</p>
                <p className="text-sm text-slate-500">Click "Add Leader" to add team members</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leadership.map((member, index) => {
                const isEditing = editingLeaderId === member.id;
                return (
                  <Card key={member.id}>
                    <CardContent className="pt-7 px-6 pb-6">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                            <Input
                              type="text"
                              value={member.name}
                              onChange={(e) => updateLeader(index, 'name', e.target.value)}
                              placeholder="Full name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Role/Title</label>
                            <Input
                              type="text"
                              value={member.role}
                              onChange={(e) => updateLeader(index, 'role', e.target.value)}
                              placeholder="e.g., CEO, CTO, Founder"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">LinkedIn URL</label>
                            <Input
                              type="url"
                              value={member.linkedinUrl || ''}
                              onChange={(e) => updateLeader(index, 'linkedinUrl', e.target.value)}
                              placeholder="https://linkedin.com/in/..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Bio</label>
                            <textarea
                              className="w-full min-h-[80px] p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                              value={member.bio}
                              onChange={(e) => updateLeader(index, 'bio', e.target.value)}
                              placeholder="Brief biography..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Experience</label>
                            <Input
                              type="text"
                              value={member.experience || ''}
                              onChange={(e) => updateLeader(index, 'experience', e.target.value)}
                              placeholder="Years of experience or background"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={async () => {
                              setEditingLeaderId(null);
                              if (user) {
                                try {
                                  await supabase
                                    .from('company_profiles')
                                    .update({ leadership: leadership, updated_at: new Date().toISOString() })
                                    .eq('user_id', user.id);
                                } catch (error) {
                                  console.error('Error saving leadership:', error);
                                }
                              }
                            }}>
                              Done
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-foreground mb-1">
                                {member.name || 'Unnamed Leader'}
                              </h3>
                              <p className="text-sm text-primary font-medium mb-2">
                                {member.role || 'No role specified'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => setEditingLeaderId(member.id)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => deleteLeader(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            {member.bio && (
                              <div>
                                <span className="font-medium text-foreground">Bio:</span>
                                <p className="text-muted-foreground">{member.bio}</p>
                              </div>
                            )}
                            {member.experience && (
                              <div>
                                <span className="font-medium text-foreground">Experience:</span>
                                <span className="text-muted-foreground ml-2">{member.experience}</span>
                              </div>
                            )}
                            {member.linkedinUrl && (
                              <div>
                                <a href={member.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                                  <Linkedin className="h-3 w-3 inline mr-1" />
                                  LinkedIn Profile
                                </a>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

        </div>
      )}

      {isEditing && activeTab === 'blogs' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" onClick={addBlog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Blog Article Manually
            </Button>
          </div>

          {blogs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                <p className="text-slate-600 mb-2">No blog articles added yet</p>
                <p className="text-sm text-slate-500">Click "Add Blog Article" to add content</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {blogs.map((blog, index) => {
                const isEditing = editingBlogId === blog.id;
                return (
                  <Card key={blog.id}>
                    <CardContent className="pt-7 px-6 pb-6">
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Title</label>
                            <Input
                              type="text"
                              value={blog.title}
                              onChange={(e) => updateBlog(index, 'title', e.target.value)}
                              placeholder="Article title"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">URL</label>
                            <Input
                              type="url"
                              value={blog.url}
                              onChange={(e) => updateBlog(index, 'url', e.target.value)}
                              placeholder="https://yourblog.com/article"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">Date</label>
                              <Input
                                type="text"
                                value={blog.date}
                                onChange={(e) => updateBlog(index, 'date', e.target.value)}
                                placeholder="e.g., Jan 15, 2024"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">Author</label>
                              <Input
                                type="text"
                                value={blog.author}
                                onChange={(e) => updateBlog(index, 'author', e.target.value)}
                                placeholder="Author name"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Summary</label>
                            <textarea
                              className="w-full min-h-[80px] p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                              value={blog.summary}
                              onChange={(e) => updateBlog(index, 'summary', e.target.value)}
                              placeholder="Brief summary of the article..."
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={async () => {
                              setEditingBlogId(null);
                              if (user) {
                                try {
                                  await supabase
                                    .from('company_profiles')
                                    .update({ blogs: blogs, updated_at: new Date().toISOString() })
                                    .eq('user_id', user.id);
                                } catch (error) {
                                  console.error('Error saving blog:', error);
                                }
                              }
                            }}>
                              Done
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                              {blog.title || 'Untitled Article'}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3">
                              {blog.summary}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {blog.date && <span>{blog.date}</span>}
                              {blog.author && <span>By {blog.author}</span>}
                              {blog.url && (
                                <a
                                  href={blog.url.startsWith('http') ? blog.url : `https://${blog.url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  Read More →
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditingBlogId(blog.id)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => deleteBlog(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

        </div>
      )}

      {isEditing && activeTab === 'technology' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Technology & Partners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Technology Stack
                </label>
                <div className="flex gap-2 mb-3">
                  <Input
                    type="text"
                    value={newTechItem}
                    onChange={(e) => setNewTechItem(e.target.value)}
                    placeholder="e.g., React, Node.js, Python"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTechItem();
                      }
                    }}
                  />
                  <Button variant="primary" onClick={addTechItem}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {technology.stack.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No technologies added yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {technology.stack.map((tech, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                        <span>{tech}</span>
                        <button
                          onClick={() => removeTechItem(idx)}
                          className="hover:text-blue-900"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Partners
                </label>
                <div className="flex gap-2 mb-3">
                  <Input
                    type="text"
                    value={newPartnerItem}
                    onChange={(e) => setNewPartnerItem(e.target.value)}
                    placeholder="e.g., AWS, Microsoft, Google"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addPartner();
                      }
                    }}
                  />
                  <Button variant="primary" onClick={addPartner}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {technology.partners.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No partners added yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {technology.partners.map((partner, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                        <span>{partner}</span>
                        <button
                          onClick={() => removePartner(idx)}
                          className="hover:text-green-900"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Integrations
                </label>
                <div className="flex gap-2 mb-3">
                  <Input
                    type="text"
                    value={newIntegrationItem}
                    onChange={(e) => setNewIntegrationItem(e.target.value)}
                    placeholder="e.g., Salesforce, Slack, Zapier"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addIntegration();
                      }
                    }}
                  />
                  <Button variant="primary" onClick={addIntegration}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {technology.integrations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No integrations added yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {technology.integrations.map((integration, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                        <span>{integration}</span>
                        <button
                          onClick={() => removeIntegration(idx)}
                          className="hover:text-purple-900"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </CardContent>
        </Card>
        </div>
      )}

    </div>
    </>
  );
};
