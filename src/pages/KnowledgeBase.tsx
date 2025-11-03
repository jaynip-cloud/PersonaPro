import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { AIDataExtractor } from '../components/knowledge/AIDataExtractor';
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
  MapPin
} from 'lucide-react';

type TabType = 'ai-extract' | 'company' | 'contact' | 'social' | 'services' | 'team' | 'blogs' | 'technology';

export const KnowledgeBase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('ai-extract');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const { user, isKnowledgeBaseComplete, checkKnowledgeBaseStatus } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isKnowledgeBaseComplete) {
      setShowWizard(true);
    }
  }, [isKnowledgeBaseComplete]);

  useEffect(() => {
    if (user && isKnowledgeBaseComplete) {
      loadExistingData();
    }
  }, [user, isKnowledgeBaseComplete]);

  const loadExistingData = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
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
            const servicesData = JSON.parse(profile.services as string);
            console.log('Raw servicesData from DB:', servicesData);
            if (Array.isArray(servicesData) && servicesData.length > 0) {
              setServices(servicesData.map((s: any, index: number) => {
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
              }));
            }
          } catch (e) {
            console.error('Error parsing services:', e);
          }
        }

        if (profile.leadership) {
          try {
            const leadershipData = JSON.parse(profile.leadership as string);
            if (Array.isArray(leadershipData)) {
              setLeadership(leadershipData);
            }
          } catch (e) {
            console.error('Error parsing leadership:', e);
          }
        }

        if (profile.blogs) {
          try {
            const blogsData = JSON.parse(profile.blogs as string);
            if (Array.isArray(blogsData)) {
              setBlogs(blogsData);
            }
          } catch (e) {
            console.error('Error parsing blogs:', e);
          }
        }

        if (profile.technology) {
          try {
            const technologyData = JSON.parse(profile.technology as string);
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

  const deleteService = (index: number) => {
    if (confirm('Are you sure you want to delete this service?')) {
      const updatedServices = services.filter((_, i) => i !== index);
      setServices(updatedServices);
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
          services: JSON.stringify(services),
          leadership: JSON.stringify(leadership),
          blogs: JSON.stringify(blogs),
          technology: JSON.stringify(technology),
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

  const handleDataExtracted = (data: any) => {
    console.log('Extracted data:', data);

    if (data.companyInfo) {
      setCompanyInfo(prev => ({
        ...prev,
        ...data.companyInfo
      }));
    }

    if (data.contactInfo) {
      setContactInfo(prev => ({
        ...prev,
        ...data.contactInfo
      }));
    }

    if (data.socialProfiles) {
      setSocialProfiles(prev => ({
        ...prev,
        ...data.socialProfiles
      }));
    }

    if (data.leadership && data.leadership.length > 0) {
      const newLeadership = data.leadership.map((member: any, index: number) => ({
        id: `extracted-${Date.now()}-${index}`,
        name: member.name || '',
        role: member.role || '',
        bio: member.bio || member.specialization || '',
        experience: member.experience || ''
      }));
      setLeadership(newLeadership);
    }

    if (data.services && data.services.length > 0) {
      const newServices = data.services.map((service: any, index: number) => ({
        id: `extracted-${Date.now()}-${index}`,
        name: service.name || '',
        description: service.description || '',
        tags: service.tags || [],
        pricing: service.pricing || service.budgetRange || ''
      }));
      setServices(newServices);
    }

    if (data.blogs && data.blogs.length > 0) {
      const newBlogs = data.blogs.map((blog: any, index: number) => ({
        id: `extracted-${Date.now()}-${index}`,
        title: blog.title || '',
        url: blog.url || '',
        date: blog.date || '',
        summary: blog.summary || '',
        author: blog.author || ''
      }));
      setBlogs(newBlogs);
    }

    if (data.technology) {
      setTechnology({
        stack: data.technology.stack || [],
        partners: data.technology.partners || [],
        integrations: data.technology.integrations || []
      });
    }

    setActiveTab('company');
  };

  const tabs = [
    { id: 'ai-extract', label: 'AI Extract', icon: Sparkles },
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

      {activeTab === 'ai-extract' && (
        <AIDataExtractor onDataExtracted={handleDataExtracted} />
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
                    <CardContent className="p-6">
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
                            <Button variant="outline" size="sm" onClick={() => setEditingServiceId(null)}>
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
            <Button variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Leader
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leadership.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {member.name}
                      </h3>
                      <p className="text-sm text-primary font-medium mb-2">
                        {member.role}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'blogs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {blogs.map((blog) => (
              <Card key={blog.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {blog.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {blog.summary}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {blog.date && <span>{blog.date}</span>}
                        {blog.author && <span>By {blog.author}</span>}
                        {blog.url && (
                          <a href={blog.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            Read More →
                          </a>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
                <label className="block text-sm font-medium text-foreground mb-2">
                  Technology Stack
                </label>
                <div className="flex flex-wrap gap-2">
                  {technology.stack.map((tech, idx) => (
                    <Badge key={idx} variant="secondary">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Partners
                </label>
                <div className="flex flex-wrap gap-2">
                  {technology.partners.map((partner, idx) => (
                    <Badge key={idx} variant="secondary">
                      {partner}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Integrations
                </label>
                <div className="flex flex-wrap gap-2">
                  {technology.integrations.map((integration, idx) => (
                    <Badge key={idx} variant="secondary">
                      {integration}
                    </Badge>
                  ))}
                </div>
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
