import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Building2,
  Globe,
  Briefcase,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Users,
  Award,
  Newspaper,
  Megaphone,
  UserCheck,
  Code,
  Plus,
  Trash2
} from 'lucide-react';

interface OnboardingWizardProps {
  isOpen: boolean;
  onComplete: () => void;
}

interface LeadershipMember {
  id: string;
  name: string;
  role: string;
  bio: string;
}

interface CaseStudy {
  id: string;
  title: string;
  client: string;
  industry: string;
  challenge: string;
  solution: string;
  results: string[];
  url: string;
}

interface Blog {
  id: string;
  title: string;
  url: string;
  date: string;
  summary: string;
  author: string;
}

interface PressNews {
  id: string;
  title: string;
  date: string;
  summary: string;
  source: string;
  url: string;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ isOpen, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [openaiKey, setOpenaiKey] = useState('');
  const { user, checkKnowledgeBaseStatus } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    industry: '',
    description: '',
    valueProposition: '',
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
    services: [] as string[],
    serviceInput: '',
    leadership: [] as LeadershipMember[],
    caseStudies: [] as CaseStudy[],
    blogs: [] as Blog[],
    pressNews: [] as PressNews[],
    hiringStatus: false,
    openPositions: [] as string[],
    positionInput: '',
    culture: '',
    techStack: [] as string[],
    techInput: '',
    partners: [] as string[],
    partnerInput: '',
    integrations: [] as string[],
    integrationInput: ''
  });

  useEffect(() => {
    if (isOpen && user) {
      loadExistingData();
    }
  }, [isOpen, user]);

  const loadExistingData = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        const services = profile.services ? JSON.parse(profile.services as string) : [];
        const serviceNames = services.map((s: any) => s.name || s);

        const leadership = profile.leadership ? JSON.parse(profile.leadership as string) : [];
        const caseStudies = profile.case_studies ? JSON.parse(profile.case_studies as string) : [];
        const blogs = profile.blogs ? JSON.parse(profile.blogs as string) : [];
        const pressNews = profile.press_news ? JSON.parse(profile.press_news as string) : [];
        const careers = profile.careers ? JSON.parse(profile.careers as string) : {};
        const technology = profile.technology ? JSON.parse(profile.technology as string) : {};

        setFormData(prev => ({
          ...prev,
          companyName: profile.company_name || '',
          website: profile.website || '',
          industry: profile.industry || '',
          description: profile.about || '',
          valueProposition: profile.value_proposition || '',
          founded: profile.founded || '',
          location: profile.location || '',
          size: profile.size || '',
          mission: profile.mission || '',
          vision: profile.vision || '',
          email: profile.email || '',
          phone: profile.phone || '',
          address: profile.address || '',
          linkedinUrl: profile.linkedin_url || '',
          twitterUrl: profile.twitter_url || '',
          facebookUrl: profile.facebook_url || '',
          instagramUrl: profile.instagram_url || '',
          youtubeUrl: profile.youtube_url || '',
          services: serviceNames,
          leadership: leadership,
          caseStudies: caseStudies,
          blogs: blogs,
          pressNews: pressNews,
          hiringStatus: careers.hiring || false,
          openPositions: careers.openPositions || [],
          culture: careers.culture || '',
          techStack: technology.stack || [],
          partners: technology.partners || [],
          integrations: technology.integrations || []
        }));
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const totalSteps = 11;

  const steps = [
    { number: 1, title: 'Company', icon: Building2 },
    { number: 2, title: 'Contact', icon: Globe },
    { number: 3, title: 'Social', icon: Globe },
    { number: 4, title: 'Services', icon: Briefcase },
    { number: 5, title: 'Leadership', icon: Users },
    { number: 6, title: 'Case Studies', icon: Award },
    { number: 7, title: 'Blogs', icon: Newspaper },
    { number: 8, title: 'Press', icon: Megaphone },
    { number: 9, title: 'Careers', icon: UserCheck },
    { number: 10, title: 'Technology', icon: Code },
    { number: 11, title: 'Review', icon: CheckCircle }
  ];

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const addCaseStudy = () => {
    const newCase: CaseStudy = {
      id: `case-${Date.now()}`,
      title: '',
      client: '',
      industry: '',
      challenge: '',
      solution: '',
      results: [],
      url: ''
    };
    setFormData(prev => ({
      ...prev,
      caseStudies: [...prev.caseStudies, newCase]
    }));
  };

  const updateCaseStudy = (index: number, field: keyof CaseStudy, value: any) => {
    setFormData(prev => ({
      ...prev,
      caseStudies: prev.caseStudies.map((cs, i) =>
        i === index ? { ...cs, [field]: value } : cs
      )
    }));
  };

  const removeCaseStudy = (index: number) => {
    setFormData(prev => ({
      ...prev,
      caseStudies: prev.caseStudies.filter((_, i) => i !== index)
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

  const addPress = () => {
    const newPress: PressNews = {
      id: `press-${Date.now()}`,
      title: '',
      date: '',
      summary: '',
      source: '',
      url: ''
    };
    setFormData(prev => ({
      ...prev,
      pressNews: [...prev.pressNews, newPress]
    }));
  };

  const updatePress = (index: number, field: keyof PressNews, value: string) => {
    setFormData(prev => ({
      ...prev,
      pressNews: prev.pressNews.map((press, i) =>
        i === index ? { ...press, [field]: value } : press
      )
    }));
  };

  const removePress = (index: number) => {
    setFormData(prev => ({
      ...prev,
      pressNews: prev.pressNews.filter((_, i) => i !== index)
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.companyName && formData.website;
      case 2:
        return formData.email;
      case 3:
        return true;
      case 4:
        return formData.services.length > 0;
      case 5:
      case 6:
      case 7:
      case 8:
      case 9:
      case 10:
      case 11:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleAutoFill = async () => {
    if (!formData.website) {
      alert('Please enter a website URL first');
      return;
    }

    if (!openaiKey) {
      setShowApiKeyInput(true);
      return;
    }

    setExtracting(true);
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
          openaiKey: openaiKey
        })
      });

      if (!response.ok) {
        throw new Error('Failed to extract data');
      }

      const extractedData = await response.json();

      if (extractedData.companyInfo) {
        setFormData(prev => ({
          ...prev,
          companyName: extractedData.companyInfo.name || prev.companyName,
          industry: extractedData.companyInfo.industry || prev.industry,
          description: extractedData.companyInfo.description || prev.description,
          valueProposition: extractedData.companyInfo.valueProposition || prev.valueProposition,
          founded: extractedData.companyInfo.founded || prev.founded,
          location: extractedData.companyInfo.location || prev.location,
          size: extractedData.companyInfo.size || prev.size,
          mission: extractedData.companyInfo.mission || prev.mission,
          vision: extractedData.companyInfo.vision || prev.vision,
        }));
      }

      if (extractedData.contactInfo) {
        setFormData(prev => ({
          ...prev,
          email: extractedData.contactInfo.email || prev.email,
          phone: extractedData.contactInfo.phone || prev.phone,
          address: extractedData.contactInfo.address || prev.address,
        }));
      }

      if (extractedData.socialProfiles) {
        setFormData(prev => ({
          ...prev,
          linkedinUrl: extractedData.socialProfiles.linkedin || prev.linkedinUrl,
          twitterUrl: extractedData.socialProfiles.twitter || prev.twitterUrl,
          facebookUrl: extractedData.socialProfiles.facebook || prev.facebookUrl,
          instagramUrl: extractedData.socialProfiles.instagram || prev.instagramUrl,
          youtubeUrl: extractedData.socialProfiles.youtube || prev.youtubeUrl,
        }));
      }

      if (extractedData.services && extractedData.services.length > 0) {
        const serviceNames = extractedData.services.map((s: any) => s.name);
        setFormData(prev => ({
          ...prev,
          services: [...new Set([...prev.services, ...serviceNames])]
        }));
      }

      if (extractedData.leadership && extractedData.leadership.length > 0) {
        setFormData(prev => ({
          ...prev,
          leadership: extractedData.leadership.map((l: any) => ({
            id: `leader-${Date.now()}-${Math.random()}`,
            name: l.name || '',
            role: l.role || '',
            bio: l.bio || ''
          }))
        }));
      }

      if (extractedData.caseStudies && extractedData.caseStudies.length > 0) {
        setFormData(prev => ({
          ...prev,
          caseStudies: extractedData.caseStudies.map((cs: any) => ({
            id: `case-${Date.now()}-${Math.random()}`,
            title: cs.title || '',
            client: cs.client || '',
            industry: cs.industry || '',
            challenge: cs.challenge || '',
            solution: cs.solution || '',
            results: cs.results || [],
            url: cs.url || ''
          }))
        }));
      }

      if (extractedData.blogs && extractedData.blogs.length > 0) {
        setFormData(prev => ({
          ...prev,
          blogs: extractedData.blogs.map((b: any) => ({
            id: `blog-${Date.now()}-${Math.random()}`,
            title: b.title || '',
            url: b.url || '',
            date: b.date || '',
            summary: b.summary || '',
            author: b.author || ''
          }))
        }));
      }

      if (extractedData.pressNews && extractedData.pressNews.length > 0) {
        setFormData(prev => ({
          ...prev,
          pressNews: extractedData.pressNews.map((p: any) => ({
            id: `press-${Date.now()}-${Math.random()}`,
            title: p.title || '',
            date: p.date || '',
            summary: p.summary || '',
            source: p.source || '',
            url: p.url || ''
          }))
        }));
      }

      if (extractedData.careers) {
        setFormData(prev => ({
          ...prev,
          hiringStatus: extractedData.careers.hiring || false,
          openPositions: extractedData.careers.openPositions || [],
          culture: extractedData.careers.culture || ''
        }));
      }

      if (extractedData.technology) {
        setFormData(prev => ({
          ...prev,
          techStack: extractedData.technology.stack || [],
          partners: extractedData.technology.partners || [],
          integrations: extractedData.technology.integrations || []
        }));
      }

      alert('Data extracted successfully! Please review and edit as needed.');
    } catch (error) {
      console.error('Error extracting data:', error);
      alert('Failed to extract data. Please try again or enter details manually.');
    } finally {
      setExtracting(false);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const servicesJson = formData.services.map(name => ({
        id: `service-${Date.now()}-${Math.random()}`,
        name,
        description: '',
        tags: [],
        pricing: ''
      }));

      const { error } = await supabase
        .from('company_profiles')
        .update({
          company_name: formData.companyName,
          website: formData.website,
          industry: formData.industry,
          about: formData.description,
          value_proposition: formData.valueProposition,
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
          services: JSON.stringify(servicesJson),
          leadership: JSON.stringify(formData.leadership),
          case_studies: JSON.stringify(formData.caseStudies),
          blogs: JSON.stringify(formData.blogs),
          press_news: JSON.stringify(formData.pressNews),
          careers: JSON.stringify({
            hiring: formData.hiringStatus,
            openPositions: formData.openPositions,
            culture: formData.culture
          }),
          technology: JSON.stringify({
            stack: formData.techStack,
            partners: formData.partners,
            integrations: formData.integrations
          }),
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await checkKnowledgeBaseStatus();
      onComplete();
      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Failed to complete setup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} size="xl" closeOnEscape={false} closeOnClickOutside={false}>
      <div className="p-6">
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-900">
            Complete Your Knowledge Base
          </h2>
          <p className="text-center text-slate-600 mt-2">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        <div className="mb-8">
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="min-h-[500px] max-h-[500px] overflow-y-auto">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Company Information
                </h3>
                <Button
                  variant="outline"
                  onClick={handleAutoFill}
                  disabled={!formData.website || extracting}
                  type="button"
                  className="flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {extracting ? 'Extracting...' : 'AI Autofill'}
                </Button>
              </div>

              {showApiKeyInput && !openaiKey && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-blue-900">
                    To use AI autofill, please enter your OpenAI API key. Your key is only used for this session and is not stored.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder="sk-..."
                      className="flex-1"
                    />
                    <Button
                      variant="primary"
                      onClick={() => {
                        setShowApiKeyInput(false);
                        if (openaiKey) handleAutoFill();
                      }}
                      disabled={!openaiKey}
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

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
                />
                <p className="text-xs text-slate-500 mt-1">
                  Enter your website and click AI Autofill to extract all company details automatically
                </p>
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
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  className="w-full min-h-[80px] p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Brief description of what your company does..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Value Proposition
                </label>
                <Input
                  type="text"
                  value={formData.valueProposition}
                  onChange={(e) => handleChange('valueProposition', e.target.value)}
                  placeholder="What unique value do you provide?"
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
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mission Statement
                </label>
                <textarea
                  className="w-full min-h-[60px] p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
                  className="w-full min-h-[60px] p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={formData.vision}
                  onChange={(e) => handleChange('vision', e.target.value)}
                  placeholder="Your company's vision..."
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
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
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Physical Address
                </label>
                <textarea
                  className="w-full min-h-[80px] p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="123 Main St, City, State, ZIP"
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
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
                />
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Services & Products
              </h3>

              <div className="flex gap-2">
                <Input
                  type="text"
                  value={formData.serviceInput}
                  onChange={(e) => handleChange('serviceInput', e.target.value)}
                  placeholder="Enter a service (e.g., AI Consulting)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem('services', 'serviceInput');
                    }
                  }}
                />
                <Button
                  variant="primary"
                  onClick={() => addItem('services', 'serviceInput')}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {formData.services.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No services added yet. Add at least one to continue.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {formData.services.map((service, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <span className="text-slate-900">{service}</span>
                      <button
                        onClick={() => removeItem('services', index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 5 && (
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

              {formData.leadership.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No leadership members added yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.leadership.map((leader, index) => (
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
                      <Input
                        type="text"
                        value={leader.name}
                        onChange={(e) => updateLeader(index, 'name', e.target.value)}
                        placeholder="Full Name"
                      />
                      <Input
                        type="text"
                        value={leader.role}
                        onChange={(e) => updateLeader(index, 'role', e.target.value)}
                        placeholder="Role/Title"
                      />
                      <textarea
                        className="w-full min-h-[60px] p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        value={leader.bio}
                        onChange={(e) => updateLeader(index, 'bio', e.target.value)}
                        placeholder="Bio/Background"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Case Studies
                </h3>
                <Button variant="outline" onClick={addCaseStudy} type="button">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Case Study
                </Button>
              </div>

              {formData.caseStudies.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No case studies added yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.caseStudies.map((cs, index) => (
                    <div key={cs.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-slate-900">Case Study {index + 1}</h4>
                        <button
                          onClick={() => removeCaseStudy(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <Input
                        type="text"
                        value={cs.title}
                        onChange={(e) => updateCaseStudy(index, 'title', e.target.value)}
                        placeholder="Title"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="text"
                          value={cs.client}
                          onChange={(e) => updateCaseStudy(index, 'client', e.target.value)}
                          placeholder="Client Name"
                        />
                        <Input
                          type="text"
                          value={cs.industry}
                          onChange={(e) => updateCaseStudy(index, 'industry', e.target.value)}
                          placeholder="Industry"
                        />
                      </div>
                      <textarea
                        className="w-full min-h-[50px] p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        value={cs.challenge}
                        onChange={(e) => updateCaseStudy(index, 'challenge', e.target.value)}
                        placeholder="Challenge"
                      />
                      <textarea
                        className="w-full min-h-[50px] p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        value={cs.solution}
                        onChange={(e) => updateCaseStudy(index, 'solution', e.target.value)}
                        placeholder="Solution"
                      />
                      <Input
                        type="url"
                        value={cs.url}
                        onChange={(e) => updateCaseStudy(index, 'url', e.target.value)}
                        placeholder="URL (optional)"
                      />
                    </div>
                  ))}
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
                      />
                      <Input
                        type="url"
                        value={blog.url}
                        onChange={(e) => updateBlog(index, 'url', e.target.value)}
                        placeholder="Article URL"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          value={blog.date}
                          onChange={(e) => updateBlog(index, 'date', e.target.value)}
                          placeholder="Date"
                        />
                        <Input
                          type="text"
                          value={blog.author}
                          onChange={(e) => updateBlog(index, 'author', e.target.value)}
                          placeholder="Author"
                        />
                      </div>
                      <textarea
                        className="w-full min-h-[60px] p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Press & News
                </h3>
                <Button variant="outline" onClick={addPress} type="button">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Press
                </Button>
              </div>

              {formData.pressNews.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No press releases added yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.pressNews.map((press, index) => (
                    <div key={press.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-slate-900">Press {index + 1}</h4>
                        <button
                          onClick={() => removePress(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <Input
                        type="text"
                        value={press.title}
                        onChange={(e) => updatePress(index, 'title', e.target.value)}
                        placeholder="Headline"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          value={press.date}
                          onChange={(e) => updatePress(index, 'date', e.target.value)}
                          placeholder="Date"
                        />
                        <Input
                          type="text"
                          value={press.source}
                          onChange={(e) => updatePress(index, 'source', e.target.value)}
                          placeholder="Source/Publication"
                        />
                      </div>
                      <textarea
                        className="w-full min-h-[60px] p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        value={press.summary}
                        onChange={(e) => updatePress(index, 'summary', e.target.value)}
                        placeholder="Summary"
                      />
                      <Input
                        type="url"
                        value={press.url}
                        onChange={(e) => updatePress(index, 'url', e.target.value)}
                        placeholder="URL (optional)"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 9 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Careers & Hiring
              </h3>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="hiring"
                  checked={formData.hiringStatus}
                  onChange={(e) => handleChange('hiringStatus', e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />
                <label htmlFor="hiring" className="text-sm font-medium text-slate-700">
                  Currently Hiring
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Open Positions
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    type="text"
                    value={formData.positionInput}
                    onChange={(e) => handleChange('positionInput', e.target.value)}
                    placeholder="e.g., Senior Software Engineer"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addItem('openPositions', 'positionInput');
                      }
                    }}
                  />
                  <Button
                    variant="primary"
                    onClick={() => addItem('openPositions', 'positionInput')}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.openPositions.map((position, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <span className="text-slate-900">{position}</span>
                      <button
                        onClick={() => removeItem('openPositions', index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Culture
                </label>
                <textarea
                  className="w-full min-h-[100px] p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={formData.culture}
                  onChange={(e) => handleChange('culture', e.target.value)}
                  placeholder="Describe your company culture and work environment..."
                />
              </div>
            </div>
          )}

          {currentStep === 10 && (
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

          {currentStep === 11 && (
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
                  <div className="flex flex-wrap gap-2">
                    {formData.services.slice(0, 5).map((service, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {service}
                      </span>
                    ))}
                    {formData.services.length > 5 && (
                      <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-sm">
                        +{formData.services.length - 5} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Additional Data</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Leadership:</span> {formData.leadership.length} members</p>
                    <p><span className="font-medium">Case Studies:</span> {formData.caseStudies.length}</p>
                    <p><span className="font-medium">Blog Articles:</span> {formData.blogs.length}</p>
                    <p><span className="font-medium">Press Releases:</span> {formData.pressNews.length}</p>
                    <p><span className="font-medium">Open Positions:</span> {formData.openPositions.length}</p>
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
  );
};
