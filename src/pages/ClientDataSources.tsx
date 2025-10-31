import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import {
  ArrowLeft,
  Globe,
  MessageCircle,
  Phone,
  Mail,
  FileText,
  Video,
  Plus,
  Trash2,
  Save,
  Link as LinkIcon,
  Upload,
  CheckCircle
} from 'lucide-react';
import { useToast } from '../components/ui/Toast';

interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

interface ContactInfo {
  email: string;
  phone: string;
  alternateEmail?: string;
  alternatePhone?: string;
}

interface WebsiteInfo {
  mainSite: string;
  blogs: string[];
}

interface UploadedDoc {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

interface MeetingTranscript {
  id: string;
  title: string;
  date: string;
  duration: number;
  source: string;
}

export const ClientDataSources: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([
    { id: '1', platform: 'LinkedIn', url: 'https://linkedin.com/company/techcorp' },
    { id: '2', platform: 'Twitter', url: 'https://twitter.com/techcorp' }
  ]);

  const [websiteInfo, setWebsiteInfo] = useState<WebsiteInfo>({
    mainSite: 'https://techcorp.com',
    blogs: ['https://techcorp.com/blog', 'https://medium.com/@techcorp']
  });

  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    email: 'contact@techcorp.com',
    phone: '+1 (555) 123-4567',
    alternateEmail: 'support@techcorp.com',
    alternatePhone: '+1 (555) 123-4568'
  });

  const [documents, setDocuments] = useState<UploadedDoc[]>([
    { id: '1', name: 'Q3_Proposal.pdf', type: 'PDF', size: 2400000, uploadedAt: '2025-10-15' },
    { id: '2', name: 'Contract_Draft.docx', type: 'DOCX', size: 450000, uploadedAt: '2025-10-20' }
  ]);

  const [transcripts, setTranscripts] = useState<MeetingTranscript[]>([
    { id: '1', title: 'Q3 Strategy Meeting', date: '2025-10-25', duration: 45, source: 'Fathom' },
    { id: '2', title: 'Product Demo Call', date: '2025-10-28', duration: 30, source: 'Zoom' }
  ]);

  const [newSocialPlatform, setNewSocialPlatform] = useState('');
  const [newSocialUrl, setNewSocialUrl] = useState('');
  const [newBlogUrl, setNewBlogUrl] = useState('');

  const clientName = 'TechCorp Solutions';

  const handleAddSocialLink = () => {
    if (newSocialPlatform && newSocialUrl) {
      setSocialLinks([
        ...socialLinks,
        { id: Date.now().toString(), platform: newSocialPlatform, url: newSocialUrl }
      ]);
      setNewSocialPlatform('');
      setNewSocialUrl('');
      showToast('success', 'Social media link added');
    }
  };

  const handleRemoveSocialLink = (id: string) => {
    setSocialLinks(socialLinks.filter(link => link.id !== id));
    showToast('success', 'Social media link removed');
  };

  const handleAddBlog = () => {
    if (newBlogUrl) {
      setWebsiteInfo({ ...websiteInfo, blogs: [...websiteInfo.blogs, newBlogUrl] });
      setNewBlogUrl('');
      showToast('success', 'Blog URL added');
    }
  };

  const handleRemoveBlog = (index: number) => {
    setWebsiteInfo({
      ...websiteInfo,
      blogs: websiteInfo.blogs.filter((_, i) => i !== index)
    });
    showToast('success', 'Blog URL removed');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const newDoc: UploadedDoc = {
          id: Date.now().toString() + Math.random(),
          name: file.name,
          type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
          size: file.size,
          uploadedAt: new Date().toISOString().split('T')[0]
        };
        setDocuments(prev => [...prev, newDoc]);
      });
      showToast('success', `${files.length} document(s) uploaded`);
    }
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments(documents.filter(doc => doc.id !== id));
    showToast('success', 'Document removed');
  };

  const handleSaveAll = () => {
    showToast('success', 'All data sources saved successfully');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/clients/${id}`)}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Client
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Client Data Sources</h1>
          <p className="text-muted-foreground mt-1">
            Manage data collection for {clientName}
          </p>
        </div>
        <Button variant="primary" onClick={handleSaveAll}>
          <Save className="h-4 w-4 mr-2" />
          Save All Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Social Media Links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {socialLinks.map(link => (
              <div key={link.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{link.platform}</p>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      {link.url}
                    </a>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveSocialLink(link.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ))}

            <div className="flex gap-2 pt-4 border-t border-border">
              <Input
                placeholder="Platform (e.g., LinkedIn, Twitter)"
                value={newSocialPlatform}
                onChange={(e) => setNewSocialPlatform(e.target.value)}
              />
              <Input
                placeholder="URL"
                value={newSocialUrl}
                onChange={(e) => setNewSocialUrl(e.target.value)}
              />
              <Button onClick={handleAddSocialLink}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Website & Blogs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Main Website
              </label>
              <Input
                value={websiteInfo.mainSite}
                onChange={(e) => setWebsiteInfo({ ...websiteInfo, mainSite: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Blog URLs
              </label>
              <div className="space-y-2">
                {websiteInfo.blogs.map((blog, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input value={blog} readOnly />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveBlog(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <Input
                    placeholder="Add blog URL"
                    value={newBlogUrl}
                    onChange={(e) => setNewBlogUrl(e.target.value)}
                  />
                  <Button onClick={handleAddBlog}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Primary Email
              </label>
              <Input
                type="email"
                value={contactInfo.email}
                onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Primary Phone
              </label>
              <Input
                type="tel"
                value={contactInfo.phone}
                onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Alternate Email
              </label>
              <Input
                type="email"
                value={contactInfo.alternateEmail || ''}
                onChange={(e) =>
                  setContactInfo({ ...contactInfo, alternateEmail: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Alternate Phone
              </label>
              <Input
                type="tel"
                value={contactInfo.alternatePhone || ''}
                onChange={(e) =>
                  setContactInfo({ ...contactInfo, alternatePhone: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Upload PDF, Excel, Word, or other documents
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button variant="outline" as="span">
                  Choose Files
                </Button>
              </label>
            </div>

            <div className="space-y-2">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.type} • {formatFileSize(doc.size)} • Uploaded {doc.uploadedAt}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDocument(doc.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Meeting Transcripts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transcripts.map(transcript => (
              <div
                key={transcript.id}
                className="p-4 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Video className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">{transcript.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(transcript.date).toLocaleDateString()} • {transcript.duration} min
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{transcript.source}</Badge>
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-border">
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Connect Fathom / Zoom / Teams
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
