import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const { user, isKnowledgeBaseComplete, checkKnowledgeBaseStatus, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for auth to finish loading before checking status
    if (!loading && user) {
      if (!isKnowledgeBaseComplete) {
        setShowWizard(true);
      } else {
        // If onboarding is complete, don't show wizard
        setShowWizard(false);
      }
    }
  }, [isKnowledgeBaseComplete, loading, user]);

  useEffect(() => {
    if (user) {
      loadExistingData();
    }
  }, [user]);

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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate insights');
      }

      const data = await response.json();
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
    { id: 'overview', label: 'Overview', icon: BarChart3 },
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

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Knowledge Base</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive company intelligence powered by AI
            </p>
          </div>
        </div>

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

      {activeTab === 'overview' && (
        <div className="space-y-6">
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
                <div className="space-y-6 mt-8">
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-100">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Summary</h3>
                        <p className="text-slate-700 leading-relaxed">{aiInsights.summary}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardContent className="pt-7 px-6 pb-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Zap className="h-5 w-5 text-green-600" />
                          <h3 className="text-lg font-semibold text-foreground">Strengths</h3>
                        </div>
                        <ul className="space-y-2">
                          {aiInsights.strengths?.map((strength: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
                              <span className="text-sm text-muted-foreground">{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-7 px-6 pb-6">
                        <div className="flex items-center gap-2 mb-4">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold text-foreground">Growth Opportunities</h3>
                        </div>
                        <ul className="space-y-2">
                          {aiInsights.opportunities?.map((opportunity: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Target className="h-4 w-4 text-blue-600 flex-shrink-0 mt-1" />
                              <span className="text-sm text-muted-foreground">{opportunity}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  {aiInsights.marketPosition && (
                    <Card>
                      <CardContent className="pt-7 px-6 pb-6">
                        <h3 className="text-lg font-semibold text-foreground mb-3">Market Position</h3>
                        <p className="text-muted-foreground leading-relaxed">{aiInsights.marketPosition}</p>
                      </CardContent>
                    </Card>
                  )}

                  {aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
                    <Card>
                      <CardContent className="pt-7 px-6 pb-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Strategic Recommendations</h3>
                        <div className="space-y-3">
                          {aiInsights.recommendations.map((rec: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-semibold">
                                {idx + 1}
                              </span>
                              <p className="text-sm text-muted-foreground flex-1">{rec}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {aiInsights.contentStrategy && (
                      <Card>
                        <CardContent className="pt-7 px-6 pb-6">
                          <h3 className="text-lg font-semibold text-foreground mb-3">Content Strategy</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{aiInsights.contentStrategy}</p>
                        </CardContent>
                      </Card>
                    )}

                    {aiInsights.techStack && (
                      <Card>
                        <CardContent className="pt-7 px-6 pb-6">
                          <h3 className="text-lg font-semibold text-foreground mb-3">Technology Assessment</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{aiInsights.techStack}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {aiInsights.kpis && (
                    <Card>
                      <CardContent className="pt-7 px-6 pb-6">
                        <div className="flex items-center gap-2 mb-6">
                          <Gauge className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold text-foreground">Key Performance Indicators</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {Object.entries(aiInsights.kpis).map(([key, value]: [string, any]) => {
                            const score = typeof value === 'number' ? value : 0;
                            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                            const getColor = (score: number) => {
                              if (score >= 75) return 'text-green-600 bg-green-50 border-green-200';
                              if (score >= 50) return 'text-blue-600 bg-blue-50 border-blue-200';
                              if (score >= 25) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
                              return 'text-red-600 bg-red-50 border-red-200';
                            };
                            return (
                              <div key={key} className={`p-4 rounded-lg border-2 ${getColor(score)}`}>
                                <div className="text-xs font-medium mb-2">{label}</div>
                                <div className="flex items-end gap-2">
                                  <span className="text-3xl font-bold">{score}</span>
                                  <span className="text-sm pb-1">/100</span>
                                </div>
                                <div className="mt-2 h-2 bg-white rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-current transition-all"
                                    style={{ width: `${score}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {aiInsights.sentiment && (
                    <Card>
                      <CardContent className="pt-7 px-6 pb-6">
                        <div className="flex items-center gap-2 mb-6">
                          <Activity className="h-5 w-5 text-purple-600" />
                          <h3 className="text-lg font-semibold text-foreground">Sentiment Analysis</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                {aiInsights.sentiment.overall === 'positive' && <Smile className="h-8 w-8 text-green-600" />}
                                {aiInsights.sentiment.overall === 'neutral' && <Meh className="h-8 w-8 text-yellow-600" />}
                                {aiInsights.sentiment.overall === 'negative' && <Frown className="h-8 w-8 text-red-600" />}
                                <div>
                                  <div className="text-sm text-muted-foreground">Overall Sentiment</div>
                                  <div className="text-lg font-semibold text-foreground capitalize">
                                    {aiInsights.sentiment.overall}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-foreground">{aiInsights.sentiment.score}</div>
                                <div className="text-xs text-muted-foreground">Score</div>
                              </div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg">
                              <div className="text-sm text-muted-foreground mb-1">Brand Tone</div>
                              <div className="text-base font-semibold text-foreground capitalize">
                                {aiInsights.sentiment.brandTone}
                              </div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg">
                              <div className="text-sm text-muted-foreground mb-1">Confidence Level</div>
                              <div className="text-base font-semibold text-foreground capitalize">
                                {aiInsights.sentiment.confidenceLevel}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="w-full">
                              <div className="text-sm font-medium text-foreground mb-2">Market Perception</div>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {aiInsights.sentiment.marketPerception}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {aiInsights.behaviorAnalysis && (
                    <Card>
                      <CardContent className="pt-7 px-6 pb-6">
                        <div className="flex items-center gap-2 mb-6">
                          <Brain className="h-5 w-5 text-indigo-600" />
                          <h3 className="text-lg font-semibold text-foreground">Behavioral Analysis</h3>
                        </div>
                        <div className="space-y-4">
                          {aiInsights.behaviorAnalysis.contentBehavior && (
                            <div className="p-4 bg-slate-50 rounded-lg">
                              <div className="text-sm font-medium text-foreground mb-2">Content Behavior</div>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {aiInsights.behaviorAnalysis.contentBehavior}
                              </p>
                            </div>
                          )}
                          {aiInsights.behaviorAnalysis.marketApproach && (
                            <div className="p-4 bg-slate-50 rounded-lg">
                              <div className="text-sm font-medium text-foreground mb-2">Market Approach</div>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {aiInsights.behaviorAnalysis.marketApproach}
                              </p>
                            </div>
                          )}
                          <div className="grid grid-cols-3 gap-4">
                            {aiInsights.behaviorAnalysis.innovationLevel && (
                              <div className="p-4 bg-slate-50 rounded-lg text-center">
                                <div className="text-xs text-muted-foreground mb-1">Innovation</div>
                                <div className="text-sm font-semibold text-foreground capitalize">
                                  {aiInsights.behaviorAnalysis.innovationLevel}
                                </div>
                              </div>
                            )}
                            {aiInsights.behaviorAnalysis.customerFocus && (
                              <div className="p-4 bg-slate-50 rounded-lg">
                                <div className="text-xs text-muted-foreground mb-2">Customer Focus</div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {aiInsights.behaviorAnalysis.customerFocus}
                                </p>
                              </div>
                            )}
                            {aiInsights.behaviorAnalysis.growthOrientation && (
                              <div className="p-4 bg-slate-50 rounded-lg">
                                <div className="text-xs text-muted-foreground mb-2">Growth Orientation</div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {aiInsights.behaviorAnalysis.growthOrientation}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {aiInsights.riskFactors && aiInsights.riskFactors.length > 0 && (
                      <Card>
                        <CardContent className="pt-7 px-6 pb-6">
                          <div className="flex items-center gap-2 mb-4">
                            <Shield className="h-5 w-5 text-orange-600" />
                            <h3 className="text-lg font-semibold text-foreground">Risk Factors</h3>
                          </div>
                          <ul className="space-y-2">
                            {aiInsights.riskFactors.map((risk: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-1" />
                                <span className="text-sm text-muted-foreground">{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {aiInsights.competitiveEdge && aiInsights.competitiveEdge.length > 0 && (
                      <Card>
                        <CardContent className="pt-7 px-6 pb-6">
                          <div className="flex items-center gap-2 mb-4">
                            <Award className="h-5 w-5 text-yellow-600" />
                            <h3 className="text-lg font-semibold text-foreground">Competitive Edge</h3>
                          </div>
                          <ul className="space-y-2">
                            {aiInsights.competitiveEdge.map((edge: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <Award className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-1" />
                                <span className="text-sm text-muted-foreground">{edge}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'company' && (
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

              <Button variant="primary" onClick={handleSave} disabled={saved || saving}>
                {saved ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Saved!
                  </>
                ) : saving ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Company Profile
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'contact' && (
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

              <Button variant="primary" onClick={handleSave} disabled={saved || saving}>
                {saved ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Saved!
                  </>
                ) : saving ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Contact Info
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'social' && (
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

              <Button variant="primary" onClick={handleSave} disabled={saved || saving}>
                {saved ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Saved!
                  </>
                ) : saving ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Social Profiles
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" onClick={addService}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
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

          {services.length > 0 && (
            <div className="flex justify-end">
              <Button variant="primary" onClick={handleSave} disabled={saved || saving}>
                {saved ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Saved!
                  </>
                ) : saving ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Services
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'team' && (
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

          {leadership.length > 0 && (
            <div className="flex justify-end">
              <Button variant="primary" onClick={handleSave} disabled={saved || saving}>
                {saved ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Saved!
                  </>
                ) : saving ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Leadership
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'blogs' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" onClick={addBlog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Blog Article
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

          {blogs.length > 0 && (
            <div className="flex justify-end">
              <Button variant="primary" onClick={handleSave} disabled={saved || saving}>
                {saved ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Saved!
                  </>
                ) : saving ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Blogs
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'technology' && (
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

              <Button variant="primary" onClick={handleSave} disabled={saved || saving}>
                {saved ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Saved!
                  </>
                ) : saving ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Technology Info
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
};
