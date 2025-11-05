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
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showPerplexityKey, setShowPerplexityKey] = useState(false);
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
    if (!openaiKey && !perplexityKey) return;

    const timeoutId = setTimeout(() => {
      saveApiKeys();
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [openaiKey, perplexityKey, keysLoaded]);

  const loadApiKeys = async () => {
    if (!user) return;

    setIsLoadingKeys(true);
    setKeysLoaded(false);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('openai_api_key, perplexity_api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setOpenaiKey(data.openai_api_key || '');
        setPerplexityKey(data.perplexity_api_key || '');
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

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Theme Preference
                      </label>
                      <div className="flex gap-2">
                        {(['light', 'dark', 'system'] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setTheme(t)}
                            className={`flex-1 py-2 px-4 rounded-md border transition-colors capitalize ${
                              theme === t
                                ? 'border-primary bg-primary text-white'
                                : 'border-border bg-background text-foreground hover:bg-accent'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Theme preference coming soon
                      </p>
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
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                          {openaiKey && perplexityKey ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              Both keys configured (Full features)
                            </span>
                          ) : openaiKey ? (
                            <span className="text-blue-600 flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              OpenAI configured (Basic features)
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
                          ) : keysLoaded && (openaiKey || perplexityKey) ? (
                            <span className="text-slate-400">Changes save automatically</span>
                          ) : null}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleSave}
                        disabled={isSavingKeys || (!openaiKey && !perplexityKey)}
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
