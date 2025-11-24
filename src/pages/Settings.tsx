import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  User,
  Bell,
  Palette,
  Key,
  Shield,
  Download,
  Save,
  CheckCircle,
  Database,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'privacy' | 'api' | 'data-management'>('profile');
  const [saved, setSaved] = useState(false);
  const [openaiKey, setOpenaiKey] = useState('');
  const [perplexityKey, setPerplexityKey] = useState('');
  const [fathomKey, setFathomKey] = useState('');
  const [firecrawlKey, setFirecrawlKey] = useState('');
  const [apolloKey, setApolloKey] = useState('');
  const [qdrantUrl, setQdrantUrl] = useState('');
  const [qdrantApiKey, setQdrantApiKey] = useState('');
  const [pineconeApiKey, setPineconeApiKey] = useState('');
  const [pineconeEnvironment, setPineconeEnvironment] = useState('');
  const [pineconeIndexName, setPineconeIndexName] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showPerplexityKey, setShowPerplexityKey] = useState(false);
  const [showFathomKey, setShowFathomKey] = useState(false);
  const [showFirecrawlKey, setShowFirecrawlKey] = useState(false);
  const [showApolloKey, setShowApolloKey] = useState(false);
  const [showQdrantKey, setShowQdrantKey] = useState(false);
  const [showPineconeKey, setShowPineconeKey] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [keysLoaded, setKeysLoaded] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && activeTab === 'api') {
      loadApiKeys();
    }
    if (user && activeTab === 'profile') {
      loadProfile();
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (!user || activeTab !== 'api' || !keysLoaded) return;
    if (!openaiKey && !perplexityKey && !fathomKey && !firecrawlKey && !apolloKey && !qdrantUrl && !qdrantApiKey && !pineconeApiKey && !pineconeEnvironment && !pineconeIndexName) return;

    const timeoutId = setTimeout(() => {
      saveApiKeys();
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [openaiKey, perplexityKey, fathomKey, firecrawlKey, apolloKey, qdrantUrl, qdrantApiKey, pineconeApiKey, pineconeEnvironment, pineconeIndexName, keysLoaded]);

  const loadApiKeys = async () => {
    if (!user) return;

    setIsLoadingKeys(true);
    setKeysLoaded(false);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('openai_api_key, perplexity_api_key, fathom_api_key, firecrawl_api_key, apollo_api_key, qdrant_url, qdrant_api_key, pinecone_api_key, pinecone_environment, pinecone_index_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setOpenaiKey(data.openai_api_key || '');
        setPerplexityKey(data.perplexity_api_key || '');
        setFathomKey(data.fathom_api_key || '');
        setFirecrawlKey(data.firecrawl_api_key || '');
        setApolloKey(data.apollo_api_key || '');
        setQdrantUrl(data.qdrant_url || '');
        setQdrantApiKey(data.qdrant_api_key || '');
        setPineconeApiKey(data.pinecone_api_key || '');
        setPineconeEnvironment(data.pinecone_environment || '');
        setPineconeIndexName(data.pinecone_index_name || '');
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    } finally {
      setIsLoadingKeys(false);
      setTimeout(() => setKeysLoaded(true), 100);
    }
  };

  const saveApiKeys = async () => {
    if (!user) return;

    setIsSavingKeys(true);
    try {
      const { data: existing } = await supabase
        .from('api_keys')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('api_keys')
          .update({
            openai_api_key: openaiKey || null,
            perplexity_api_key: perplexityKey || null,
            fathom_api_key: fathomKey || null,
            firecrawl_api_key: firecrawlKey || null,
            apollo_api_key: apolloKey || null,
            qdrant_url: qdrantUrl || null,
            qdrant_api_key: qdrantApiKey || null,
            pinecone_api_key: pineconeApiKey || null,
            pinecone_environment: pineconeEnvironment || null,
            pinecone_index_name: pineconeIndexName || null,
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('api_keys')
          .insert({
            user_id: user.id,
            openai_api_key: openaiKey || null,
            perplexity_api_key: perplexityKey || null,
            fathom_api_key: fathomKey || null,
            firecrawl_api_key: firecrawlKey || null,
            apollo_api_key: apolloKey || null,
            qdrant_url: qdrantUrl || null,
            qdrant_api_key: qdrantApiKey || null,
            pinecone_api_key: pineconeApiKey || null,
            pinecone_environment: pineconeEnvironment || null,
            pinecone_index_name: pineconeIndexName || null,
          });

        if (error) throw error;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving API keys:', error);
      alert('Failed to save API keys. Please try again.');
    } finally {
      setIsSavingKeys(false);
    }
  };

  const loadProfile = async () => {
    if (!user) return;

    setIsLoadingProfile(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (userError) throw userError;

      const { data: companyData, error: companyError } = await supabase
        .from('company_profiles')
        .select('company_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (companyError) throw companyError;

      setProfile({
        name: userData?.full_name || '',
        email: userData?.email || '',
        company: companyData?.company_name || ''
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    setIsSavingProfile(true);
    try {
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: profile.name || null,
        })
        .eq('id', user.id);

      if (userError) throw userError;

      const { error: companyError } = await supabase
        .from('company_profiles')
        .update({
          company_name: profile.company || null,
        })
        .eq('user_id', user.id);

      if (companyError) throw companyError;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    company: ''
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [notifications, setNotifications] = useState({
    emailDigest: true,
    personaUpdates: true,
    clientAlerts: true,
    weeklyReports: false,
    systemUpdates: true
  });

  const [privacy, setPrivacy] = useState({
    retentionPolicy: '1year',
    maskSensitiveInfo: true,
    consentTracking: true,
    dataExport: true,
    anonymizeReports: false
  });

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');

  const handleSave = () => {
    if (activeTab === 'api') {
      saveApiKeys();
    } else if (activeTab === 'profile') {
      saveProfile();
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      alert('Please type DELETE to confirm account deletion');
      return;
    }

    if (!user) return;

    setIsDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from('company_profiles')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error deleting profile:', deleteError);
      }

      const { error } = await supabase.rpc('delete_user');

      if (error) throw error;

      localStorage.clear();
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again or contact support.');
      setIsDeleting(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Data Privacy', icon: Shield },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'data-management', label: 'Data Management', icon: Database }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account preferences and privacy settings
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary text-white'
                          : 'text-foreground hover:bg-accent'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingProfile ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">Loading profile...</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Full Name
                      </label>
                      <Input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Email Address
                      </label>
                      <Input
                        type="email"
                        value={profile.email}
                        disabled
                        className="bg-gray-50 cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Email cannot be changed from this page
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Company
                      </label>
                      <Input
                        type="text"
                        value={profile.company}
                        onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                        placeholder="Enter your company name"
                      />
                    </div>

                    <Button variant="primary" onClick={handleSave} disabled={saved || isSavingProfile}>
                      {isSavingProfile ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : saved ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Saved!
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>

                    <div className="mt-8 pt-6 border-t border-red-200">
                      <h3 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h3>
                      <p className="text-sm text-slate-600 mb-4">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteModal(true)}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
                    <Bell className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h3>
                  <p className="text-gray-600 text-center max-w-md">
                    Notification preferences will be available soon. You'll be able to customize email alerts, in-app notifications, and more.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'privacy' && (
            <Card>
              <CardHeader>
                <CardTitle>Data Privacy & Security</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h3>
                  <p className="text-gray-600 text-center max-w-md">
                    Data privacy and security settings will be available soon. You'll be able to manage data retention, consent tracking, and more.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'api' && (
            <Card>
              <CardHeader>
                <CardTitle>API Keys Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingKeys ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">Loading API keys...</div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Key className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-blue-900 mb-1">
                            Configure Your AI API Keys
                          </p>
                          <p className="text-xs text-blue-800">
                            Add your own API keys to enable AI-powered features. Your keys are stored securely and never shared.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <span className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-sm">1</span>
                          OpenAI API Key (Required)
                        </h3>
                        <div className="pl-10 space-y-3">
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <p className="text-sm text-slate-700 mb-2">
                              <strong>Used for:</strong> AI Insights, Data Extraction, Analysis
                            </p>
                            <p className="text-xs text-slate-600">
                              This key is required for all AI features to work properly.
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              OpenAI API Key
                            </label>
                            <div className="flex gap-2">
                              <Input
                                type={showOpenaiKey ? 'text' : 'password'}
                                value={openaiKey}
                                onChange={(e) => setOpenaiKey(e.target.value)}
                                placeholder="sk-proj-..."
                                className="font-mono text-sm"
                              />
                              <Button
                                variant="outline"
                                onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                              >
                                {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5">
                              Get your API key from{' '}
                              <a
                                href="https://platform.openai.com/api-keys"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline font-medium"
                              >
                                OpenAI Platform →
                              </a>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-border pt-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <span className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">2</span>
                          Perplexity API Key (Optional)
                        </h3>
                        <div className="pl-10 space-y-3">
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <p className="text-sm text-slate-700 mb-2">
                              <strong>Used for:</strong> Real-time Web Search, Current Company Information
                            </p>
                            <p className="text-xs text-slate-600">
                              Without this key, the system will use OpenAI's knowledge base (limited to training data cutoff).
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Perplexity API Key
                            </label>
                            <div className="flex gap-2">
                              <Input
                                type={showPerplexityKey ? 'text' : 'password'}
                                value={perplexityKey}
                                onChange={(e) => setPerplexityKey(e.target.value)}
                                placeholder="pplx-..."
                                className="font-mono text-sm"
                              />
                              <Button
                                variant="outline"
                                onClick={() => setShowPerplexityKey(!showPerplexityKey)}
                              >
                                {showPerplexityKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5">
                              Get your API key from{' '}
                              <a
                                href="https://www.perplexity.ai/settings/api"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline font-medium"
                              >
                                Perplexity AI Settings →
                              </a>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-border pt-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <span className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-sm">3</span>
                          Fathom API Key (Optional)
                        </h3>
                        <div className="pl-10 space-y-3">
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <p className="text-sm text-slate-700 mb-2">
                              <strong>Used for:</strong> Syncing meeting recordings, transcripts, and insights
                            </p>
                            <p className="text-xs text-slate-600">
                              Connect Fathom to automatically sync meeting recordings and transcripts to your client intelligence hub
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Fathom API Key
                            </label>
                            <div className="flex gap-2">
                              <Input
                                type={showFathomKey ? 'text' : 'password'}
                                value={fathomKey}
                                onChange={(e) => setFathomKey(e.target.value)}
                                placeholder="fathom_..."
                                className="font-mono text-sm"
                              />
                              <Button
                                variant="outline"
                                onClick={() => setShowFathomKey(!showFathomKey)}
                              >
                                {showFathomKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5">
                              Get your API key from{' '}
                              <a
                                href="https://app.fathom.video/settings/integrations"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline font-medium"
                              >
                                Fathom Settings →
                              </a>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-border pt-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <span className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-sm">4</span>
                          Firecrawl API Key (Optional)
                        </h3>
                        <div className="pl-10 space-y-3">
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <p className="text-sm text-slate-700 mb-2">
                              <strong>Used for:</strong> Web scraping, content extraction from company websites
                            </p>
                            <p className="text-xs text-slate-600">
                              Extract structured data from company websites to enrich your knowledge base
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Firecrawl API Key
                            </label>
                            <div className="flex gap-2">
                              <Input
                                type={showFirecrawlKey ? 'text' : 'password'}
                                value={firecrawlKey}
                                onChange={(e) => setFirecrawlKey(e.target.value)}
                                placeholder="fc-..."
                                className="font-mono text-sm"
                              />
                              <Button
                                variant="outline"
                                onClick={() => setShowFirecrawlKey(!showFirecrawlKey)}
                              >
                                {showFirecrawlKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5">
                              Get your API key from{' '}
                              <a
                                href="https://www.firecrawl.dev"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline font-medium"
                              >
                                Firecrawl →
                              </a>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-border pt-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <span className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm">5</span>
                          Apollo API Key (Optional)
                        </h3>
                        <div className="pl-10 space-y-3">
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <p className="text-sm text-slate-700 mb-2">
                              <strong>Used for:</strong> Company and contact data enrichment
                            </p>
                            <p className="text-xs text-slate-600">
                              Automatically enrich client data with company information, contacts, and firmographics
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Apollo API Key
                            </label>
                            <div className="flex gap-2">
                              <Input
                                type={showApolloKey ? 'text' : 'password'}
                                value={apolloKey}
                                onChange={(e) => setApolloKey(e.target.value)}
                                placeholder="apollo_..."
                                className="font-mono text-sm"
                              />
                              <Button
                                variant="outline"
                                onClick={() => setShowApolloKey(!showApolloKey)}
                              >
                                {showApolloKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5">
                              Get your API key from{' '}
                              <a
                                href="https://app.apollo.io/#/settings/integrations/api"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline font-medium"
                              >
                                Apollo Settings →
                              </a>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-border pt-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <span className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-sm">6</span>
                          Vector Database (Choose One: Qdrant or Pinecone)
                        </h3>

                        <div className="pl-10 space-y-6">
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <p className="text-sm text-slate-700 mb-2">
                              <strong>Used for:</strong> Document embeddings, semantic search, knowledge base
                            </p>
                            <p className="text-xs text-slate-600">
                              Store and search document embeddings for intelligent retrieval and RAG (Retrieval Augmented Generation). Configure either Qdrant or Pinecone - not both.
                            </p>
                          </div>

                          <div className="border-l-4 border-teal-400 pl-4">
                            <h4 className="text-md font-semibold text-foreground mb-3">Option A: Qdrant</h4>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                  Qdrant Cloud URL
                                </label>
                                <Input
                                  type="text"
                                  value={qdrantUrl}
                                  onChange={(e) => setQdrantUrl(e.target.value)}
                                  placeholder="https://your-cluster.aws.cloud.qdrant.io:6333"
                                  className="font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground mt-1.5">
                                  Your Qdrant cluster URL from{' '}
                                  <a
                                    href="https://cloud.qdrant.io"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline font-medium"
                                  >
                                    Qdrant Cloud →
                                  </a>
                                </p>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                  Qdrant API Key
                                </label>
                                <div className="flex gap-2">
                                  <Input
                                    type={showQdrantKey ? 'text' : 'password'}
                                    value={qdrantApiKey}
                                    onChange={(e) => setQdrantApiKey(e.target.value)}
                                    placeholder="Enter your Qdrant API key"
                                    className="font-mono text-sm"
                                  />
                                  <Button
                                    variant="outline"
                                    onClick={() => setShowQdrantKey(!showQdrantKey)}
                                  >
                                    {showQdrantKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1.5">
                                  API key for authenticating with your Qdrant cluster
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="border-l-4 border-purple-400 pl-4">
                            <h4 className="text-md font-semibold text-foreground mb-3">Option B: Pinecone</h4>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                  Pinecone API Key
                                </label>
                                <div className="flex gap-2">
                                  <Input
                                    type={showPineconeKey ? 'text' : 'password'}
                                    value={pineconeApiKey}
                                    onChange={(e) => setPineconeApiKey(e.target.value)}
                                    placeholder="Enter your Pinecone API key"
                                    className="font-mono text-sm"
                                  />
                                  <Button
                                    variant="outline"
                                    onClick={() => setShowPineconeKey(!showPineconeKey)}
                                  >
                                    {showPineconeKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1.5">
                                  Get your API key from{' '}
                                  <a
                                    href="https://app.pinecone.io"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline font-medium"
                                  >
                                    Pinecone Console →
                                  </a>
                                </p>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                  Pinecone Environment
                                </label>
                                <Input
                                  type="text"
                                  value={pineconeEnvironment}
                                  onChange={(e) => setPineconeEnvironment(e.target.value)}
                                  placeholder="us-east-1-aws"
                                  className="font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground mt-1.5">
                                  Your Pinecone environment (e.g., us-east-1-aws, us-west-1-gcp)
                                </p>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                  Pinecone Index Name
                                </label>
                                <Input
                                  type="text"
                                  value={pineconeIndexName}
                                  onChange={(e) => setPineconeIndexName(e.target.value)}
                                  placeholder="personapro-documents"
                                  className="font-mono text-sm"
                                />
                                <p className="text-xs text-muted-foreground mt-1.5">
                                  Name of your Pinecone index (must have dimension 1536 for OpenAI embeddings)
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                          {openaiKey && perplexityKey && fathomKey && firecrawlKey && apolloKey ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              All keys configured (Full features)
                            </span>
                          ) : openaiKey ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              OpenAI configured + {[perplexityKey && 'Perplexity', fathomKey && 'Fathom', firecrawlKey && 'Firecrawl', apolloKey && 'Apollo'].filter(Boolean).join(', ')}
                            </span>
                          ) : (
                            <span className="text-orange-600 flex items-center gap-1">
                              <AlertTriangle className="h-4 w-4" />
                              No keys configured
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          {isSavingKeys ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                              <span>Auto-saving...</span>
                            </>
                          ) : saved ? (
                            <>
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              <span className="text-green-600">Saved automatically</span>
                            </>
                          ) : keysLoaded && (openaiKey || perplexityKey || fathomKey) ? (
                            <span className="text-slate-400">Changes save automatically</span>
                          ) : null}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleSave}
                        disabled={isSavingKeys || (!openaiKey && !perplexityKey && !fathomKey)}
                        className="text-sm"
                      >
                        {isSavingKeys ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Now
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'data-management' && (
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Database className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-900 mb-1">
                          Export and manage your data
                        </p>
                        <p className="text-xs text-blue-800">
                          Download all your client data, meeting transcripts, and documents. Import data from other systems.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="border border-border rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground mb-2">Export All Data</h3>
                          <p className="text-sm text-muted-foreground">
                            Download a complete copy of all your data including clients, contacts, projects, meeting transcripts, and documents.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1">
                          <Download className="h-4 w-4 mr-2" />
                          Export as JSON
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <Download className="h-4 w-4 mr-2" />
                          Export as CSV
                        </Button>
                      </div>
                    </div>

                    <div className="border border-border rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground mb-2">Export Clients</h3>
                          <p className="text-sm text-muted-foreground">
                            Download only your client list with all associated data, contacts, and insights.
                          </p>
                        </div>
                      </div>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export Clients
                      </Button>
                    </div>

                    <div className="border border-border rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground mb-2">Export Meeting Transcripts</h3>
                          <p className="text-sm text-muted-foreground">
                            Download all meeting notes and transcripts in a structured format.
                          </p>
                        </div>
                      </div>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export Transcripts
                      </Button>
                    </div>

                    <div className="border border-red-200 rounded-lg p-6 bg-red-50">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-red-900 mb-2">Clear All Data</h3>
                          <p className="text-sm text-red-800">
                            Permanently delete all clients, projects, documents, and meeting transcripts. This action cannot be undone.
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-100">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All Data
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmation('');
        }}
        size="md"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Delete Account</h2>
              <p className="text-sm text-slate-600">This action is permanent and cannot be undone</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2">Warning: This will permanently delete:</h3>
              <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                <li>Your account and profile information</li>
                <li>All company data and knowledge base</li>
                <li>All client records and insights</li>
                <li>All projects and documents</li>
                <li>All settings and preferences</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Type <span className="font-bold text-red-600">DELETE</span> to confirm:
              </label>
              <Input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE"
                className="font-mono"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
                disabled={isDeleting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  'Deleting...'
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete My Account
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const getNotificationDescription = (key: string): string => {
  const descriptions: Record<string, string> = {
    emailDigest: 'Receive daily digest of client activities',
    personaUpdates: 'Get notified when client personas are updated',
    clientAlerts: 'Receive alerts for critical client events',
    weeklyReports: 'Weekly summary of your client portfolio',
    systemUpdates: 'Important system updates and announcements'
  };
  return descriptions[key] || '';
};
