import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
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
  Building2
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'privacy' | 'api' | 'data-sources' | 'company'>('profile');
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({
    name: 'John Williams',
    email: 'john.williams@example.com',
    role: 'CSM Lead',
    company: 'TechSolutions Inc.'
  });

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
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Data Privacy', icon: Shield },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'data-sources', label: 'Data Sources', icon: Database },
    { id: 'company', label: 'Company Data', icon: Building2 }
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
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Full Name
                    </label>
                    <Input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Role
                    </label>
                    <Input
                      type="text"
                      value={profile.role}
                      onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Company
                    </label>
                    <Input
                      type="text"
                      value={profile.company}
                      onChange={(e) => setProfile({ ...profile, company: e.target.value })}
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
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(notifications).map(([key, value]) => (
                    <label key={key} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                      <div>
                        <p className="font-medium text-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getNotificationDescription(key)}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                        className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                      />
                    </label>
                  ))}

                  <Button variant="primary" onClick={handleSave} disabled={saved}>
                    {saved ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Preferences
                      </>
                    )}
                  </Button>
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
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Data Retention Policy
                    </label>
                    <select
                      value={privacy.retentionPolicy}
                      onChange={(e) => setPrivacy({ ...privacy, retentionPolicy: e.target.value })}
                      className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="90days">90 Days</option>
                      <option value="1year">1 Year</option>
                      <option value="never">Keep Forever</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      How long should we retain your client interaction data?
                    </p>
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                      <div>
                        <p className="font-medium text-foreground">
                          Mask Sensitive Information
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Hide email addresses and phone numbers in reports
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={privacy.maskSensitiveInfo}
                        onChange={(e) => setPrivacy({ ...privacy, maskSensitiveInfo: e.target.checked })}
                        className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                      <div>
                        <p className="font-medium text-foreground">
                          Consent Tracking
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Track client consent for data collection and processing
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={privacy.consentTracking}
                        onChange={(e) => setPrivacy({ ...privacy, consentTracking: e.target.checked })}
                        className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                      <div>
                        <p className="font-medium text-foreground">
                          Enable Data Export
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Allow downloading of all collected data
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={privacy.dataExport}
                        onChange={(e) => setPrivacy({ ...privacy, dataExport: e.target.checked })}
                        className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                      <div>
                        <p className="font-medium text-foreground">
                          Anonymize Reports
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Remove personally identifiable information from exported reports
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={privacy.anonymizeReports}
                        onChange={(e) => setPrivacy({ ...privacy, anonymizeReports: e.target.checked })}
                        className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                      />
                    </label>
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
                        Save Privacy Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'api' && (
            <Card>
              <CardHeader>
                <CardTitle>API Keys & Integrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      These are mock API keys for demonstration purposes only.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Production API Key
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value="pk_live_1234567890abcdefghijklmnop"
                        readOnly
                        className="font-mono"
                      />
                      <Button variant="outline">
                        Reveal
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Development API Key
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value="pk_dev_abcdefghijklmnopqrstuvwxyz"
                        readOnly
                        className="font-mono"
                      />
                      <Button variant="outline">
                        Reveal
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Webhook Secret
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value="whsec_1234567890abcdefghijklmnop"
                        readOnly
                        className="font-mono"
                      />
                      <Button variant="outline">
                        Reveal
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <Button variant="outline">
                      Generate New Key
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'data-sources' && (
            <Card>
              <CardHeader>
                <CardTitle>Data Sources & Integrations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Connect data sources to automatically sync client information and insights.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { name: 'Salesforce', status: 'connected', logo: '☁️' },
                      { name: 'HubSpot', status: 'connected', logo: '🧲' },
                      { name: 'Gmail', status: 'not_connected', logo: '📧' },
                      { name: 'LinkedIn', status: 'not_connected', logo: '💼' },
                      { name: 'Zoom', status: 'not_connected', logo: '📹' },
                      { name: 'Google Drive', status: 'connected', logo: '📁' },
                    ].map((source) => (
                      <div
                        key={source.name}
                        className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{source.logo}</div>
                            <div>
                              <p className="font-medium text-foreground">{source.name}</p>
                              <Badge
                                variant={source.status === 'connected' ? 'success' : 'secondary'}
                                className="text-xs"
                              >
                                {source.status === 'connected' ? 'Connected' : 'Not Connected'}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant={source.status === 'connected' ? 'outline' : 'primary'}
                            size="sm"
                          >
                            {source.status === 'connected' ? 'Configure' : 'Connect'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'company' && (
            <Card>
              <CardHeader>
                <CardTitle>Company Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Company Name
                    </label>
                    <Input
                      type="text"
                      defaultValue="TechSolutions Inc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Industry
                    </label>
                    <Input
                      type="text"
                      defaultValue="Software & Technology"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Company Description
                    </label>
                    <textarea
                      className="w-full min-h-[100px] p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      defaultValue="We provide enterprise software solutions and consulting services to help businesses transform digitally."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Value Proposition
                    </label>
                    <textarea
                      className="w-full min-h-[80px] p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      defaultValue="Accelerate digital transformation with AI-powered insights and proven methodologies."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Services Offered
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g., Consulting, Development, AI Integration"
                      defaultValue="Consulting, Custom Development, AI Integration, Data Analytics"
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
        </div>
      </div>
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
