import React, { useState, useEffect } from 'react';
import { useOnboarding } from '../context/OnboardingContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { AIDataExtractor } from '../components/knowledge/AIDataExtractor';
import {
  Building2,
  FileText,
  Users,
  Briefcase,
  Award,
  Plus,
  Edit,
  Trash2,
  Save,
  CheckCircle,
  Sparkles,
  Newspaper,
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

type TabType = 'ai-extract' | 'company' | 'contact' | 'social' | 'services' | 'case-studies' | 'team' | 'blogs' | 'press' | 'careers' | 'technology';

export const KnowledgeBase: React.FC = () => {
  const { companyProfile, updateCompanyProfile } = useOnboarding();
  const [activeTab, setActiveTab] = useState<TabType>('company');
  const [saved, setSaved] = useState(false);

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

  useEffect(() => {
    if (companyProfile) {
      setCompanyInfo({
        name: companyProfile.company_name || '',
        canonicalUrl: companyProfile.website || '',
        industry: companyProfile.industry || '',
        description: companyProfile.about || '',
        valueProposition: '',
        founded: '',
        location: '',
        size: '',
        mission: '',
        vision: ''
      });
      setContactInfo({
        email: companyProfile.email || '',
        phone: companyProfile.phone || '',
        address: ''
      });
      setSocialProfiles({
        linkedin: companyProfile.linkedin_url || '',
        twitter: companyProfile.twitter_url || '',
        facebook: companyProfile.facebook_url || '',
        instagram: companyProfile.instagram_url || '',
        youtube: ''
      });
      if (companyProfile.services && Array.isArray(companyProfile.services)) {
        const loadedServices = companyProfile.services.map((name: string, idx: number) => ({
          id: String(idx + 1),
          name,
          description: '',
          tags: [],
          pricing: ''
        }));
        setServices(loadedServices.length > 0 ? loadedServices : []);
      }
    }
  }, [companyProfile]);

  const [leadership, setLeadership] = useState([
    {
      id: '1',
      name: 'Sarah Johnson',
      role: 'CEO & Founder',
      bio: 'AI Strategy, Business Development',
      experience: '15 years'
    }
  ]);

  const [services, setServices] = useState([
    {
      id: '1',
      name: 'AI Consulting',
      description: 'Strategic AI implementation and integration services',
      tags: ['AI', 'Strategy', 'Consulting'],
      pricing: '$50,000 - $200,000'
    }
  ]);

  const [caseStudies, setCaseStudies] = useState([
    {
      id: '1',
      title: 'Fortune 500 Digital Transformation',
      client: 'Global Retail Corp',
      industry: 'Retail',
      challenge: 'Legacy systems hindering growth',
      solution: 'AI-powered modernization',
      results: ['40% increase in operational efficiency', 'Reduced costs by $2M annually'],
      url: ''
    }
  ]);

  const [blogs, setBlogs] = useState([
    {
      id: '1',
      title: 'The Future of AI in Enterprise',
      url: 'https://techsolutions.com/blog/future-ai',
      date: '2024-01-15',
      summary: 'Exploring upcoming AI trends',
      author: 'Sarah Johnson'
    }
  ]);

  const [pressNews, setPressNews] = useState([
    {
      id: '1',
      title: 'TechSolutions Raises $10M Series A',
      date: '2024-02-01',
      summary: 'Funding to accelerate AI product development',
      source: 'TechCrunch',
      url: ''
    }
  ]);

  const [careers, setCareers] = useState({
    hiring: true,
    openPositions: ['Senior AI Engineer', 'Product Manager'],
    culture: 'Innovative, collaborative, remote-friendly environment'
  });

  const [technology, setTechnology] = useState({
    stack: ['React', 'Node.js', 'Python', 'TensorFlow'],
    partners: ['AWS', 'Microsoft Azure'],
    integrations: ['Salesforce', 'Slack', 'Jira']
  });

  const handleSave = async () => {
    const updateData: any = {
      company_name: companyInfo.name,
      website: companyInfo.canonicalUrl,
      industry: companyInfo.industry,
      about: companyInfo.description,
      email: contactInfo.email,
      phone: contactInfo.phone,
      linkedin_url: socialProfiles.linkedin,
      twitter_url: socialProfiles.twitter,
      facebook_url: socialProfiles.facebook,
      instagram_url: socialProfiles.instagram,
      services: services.map(s => s.name).filter(n => n.trim() !== '')
    };

    await updateCompanyProfile(updateData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

    if (data.caseStudies && data.caseStudies.length > 0) {
      const newCaseStudies = data.caseStudies.map((study: any, index: number) => ({
        id: `extracted-${Date.now()}-${index}`,
        title: study.title || '',
        client: study.client || '',
        industry: study.industry || '',
        challenge: study.challenge || '',
        solution: study.solution || '',
        results: study.results || [],
        url: study.url || ''
      }));
      setCaseStudies(newCaseStudies);
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

    if (data.pressNews && data.pressNews.length > 0) {
      const newPress = data.pressNews.map((press: any, index: number) => ({
        id: `extracted-${Date.now()}-${index}`,
        title: press.title || '',
        date: press.date || '',
        summary: press.summary || '',
        source: press.source || '',
        url: press.url || ''
      }));
      setPressNews(newPress);
    }

    if (data.careers) {
      setCareers({
        hiring: data.careers.hiring || false,
        openPositions: data.careers.openPositions || [],
        culture: data.careers.culture || ''
      });
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
    { id: 'case-studies', label: 'Case Studies', icon: Award },
    { id: 'team', label: 'Leadership', icon: Users },
    { id: 'blogs', label: 'Blogs', icon: FileText },
    { id: 'press', label: 'Press', icon: Newspaper },
    { id: 'careers', label: 'Careers', icon: Users },
    { id: 'technology', label: 'Technology', icon: Code }
  ];

  return (
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

              <Button variant="primary" onClick={handleSave} disabled={saved}>
                {saved ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Saved!
                  </>
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

              <Button variant="primary" onClick={handleSave} disabled={saved}>
                {saved ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Saved!
                  </>
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

              <Button variant="primary" onClick={handleSave} disabled={saved}>
                {saved ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Saved!
                  </>
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
            <Button variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {services.map((service) => (
              <Card key={service.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {service.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {service.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {service.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      {service.pricing && (
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Pricing:</span> {service.pricing}
                        </div>
                      )}
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
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'case-studies' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Case Study
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {caseStudies.map((study) => (
              <Card key={study.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {study.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {study.client} • {study.industry}
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

                  {study.challenge && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-foreground mb-1">Challenge:</h4>
                      <p className="text-sm text-muted-foreground">{study.challenge}</p>
                    </div>
                  )}

                  {study.solution && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-foreground mb-1">Solution:</h4>
                      <p className="text-sm text-muted-foreground">{study.solution}</p>
                    </div>
                  )}

                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-foreground mb-2">Results:</h4>
                    <ul className="space-y-1">
                      {study.results.map((result, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          {result}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {study.url && (
                    <a href={study.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      View Full Case Study →
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
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

      {activeTab === 'press' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {pressNews.map((press) => (
              <Card key={press.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {press.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {press.summary}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {press.date && <span>{press.date}</span>}
                        {press.source && <span>Source: {press.source}</span>}
                        {press.url && (
                          <a href={press.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            Read Article →
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

      {activeTab === 'careers' && (
        <Card>
          <CardHeader>
            <CardTitle>Careers & Hiring</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={careers.hiring}
                  onChange={(e) => setCareers({ ...careers, hiring: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm font-medium text-foreground">
                  Currently Hiring
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Open Positions
                </label>
                <div className="space-y-2">
                  {careers.openPositions.map((position, idx) => (
                    <Badge key={idx} variant="secondary" className="mr-2">
                      {position}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Company Culture
                </label>
                <textarea
                  className="w-full min-h-[80px] p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  value={careers.culture}
                  onChange={(e) => setCareers({ ...careers, culture: e.target.value })}
                />
              </div>

              <Button variant="primary" onClick={handleSave} disabled={saved}>
                {saved ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Careers Info
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
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

              <Button variant="primary" onClick={handleSave} disabled={saved}>
                {saved ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Saved!
                  </>
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
  );
};
