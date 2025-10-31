import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ConnectorCard } from '../components/data-sources/ConnectorCard';
import { OAuthModal } from '../components/data-sources/OAuthModal';
import { DocumentUpload } from '../components/data-sources/DocumentUpload';
import { DataStreamPanel } from '../components/data-sources/DataStreamPanel';
import { Connector, ConnectorType, Document, SocialProfile, WebsiteSummary, ContactInfo, MeetingTranscript } from '../types';
import { AlertCircle } from 'lucide-react';

export const DataSources: React.FC = () => {
  const {
    connectors,
    ingestionEvents,
    clients,
    updateConnectorStatus,
    updateConnectorSync,
    addIngestionEvent,
    addDocument,
    addSocialProfile,
    addWebsiteSummary,
    addContactInfo,
    addMeetingTranscript
  } = useApp();

  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [syncingConnectors, setSyncingConnectors] = useState<Set<ConnectorType>>(new Set());

  const sampleClientId = clients[0]?.id || '1';

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const simulateFailure = () => Math.random() < 0.1;

  const handleConnect = (connector: Connector) => {
    if (connector.id === 'documents') {
      setShowUploadModal(true);
      return;
    }

    setSelectedConnector(connector);
    setShowOAuthModal(true);
  };

  const handleAuthorize = async () => {
    if (!selectedConnector) return;

    if (simulateFailure()) {
      updateConnectorStatus(
        selectedConnector.id,
        'error',
        'Connection failed — check your mock OAuth and retry.'
      );
      return;
    }

    updateConnectorStatus(selectedConnector.id, 'connected');
    await ingestDataForConnector(selectedConnector.id);
  };

  const handleDisconnect = (connectorId: ConnectorType) => {
    if (confirm('Disconnecting will remove previously ingested mock items. Proceed?')) {
      updateConnectorStatus(connectorId, 'not_connected');
    }
  };

  const handleSync = async (connectorId: ConnectorType) => {
    setSyncingConnectors(prev => new Set(prev).add(connectorId));

    if (simulateFailure()) {
      updateConnectorStatus(connectorId, 'error', 'Sync failed — please try again');
      setSyncingConnectors(prev => {
        const next = new Set(prev);
        next.delete(connectorId);
        return next;
      });
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    await ingestDataForConnector(connectorId, true);

    setSyncingConnectors(prev => {
      const next = new Set(prev);
      next.delete(connectorId);
      return next;
    });
  };

  const ingestDataForConnector = async (connectorId: ConnectorType, isSync = false) => {
    const itemsToAdd = isSync ? 1 : 2;

    switch (connectorId) {
      case 'linkedin':
      case 'twitter':
        await ingestSocialProfiles(connectorId, itemsToAdd);
        break;
      case 'website':
        await ingestWebsiteData(itemsToAdd);
        break;
      case 'contact':
        await ingestContactInfo(itemsToAdd);
        break;
      case 'fathom':
      case 'zoom':
      case 'teams':
        await ingestMeetingTranscripts(connectorId, itemsToAdd);
        break;
      default:
        await ingestGenericDocuments(connectorId, itemsToAdd);
    }

    updateConnectorSync(connectorId, itemsToAdd);
  };

  const ingestSocialProfiles = async (platform: ConnectorType, count: number) => {
    const names = ['Jane Doe', 'John Smith', 'Sarah Mitchell'];
    const titles = ['Head of Product', 'VP of Engineering', 'CTO'];

    for (let i = 0; i < count; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));

      const profile: SocialProfile = {
        id: generateId(),
        clientId: sampleClientId,
        platform: platform === 'linkedin' ? 'linkedin' : 'twitter',
        url: `https://${platform}.com/user/${generateId()}`,
        name: names[i % names.length],
        title: titles[i % titles.length],
        headline: 'Building the future of AI automation',
        recentActivity: 'Posted about automation and ML integration',
        followerCount: Math.floor(Math.random() * 10000),
        createdAt: new Date().toISOString(),
        source: platform
      };

      addSocialProfile(profile);

      addIngestionEvent({
        id: generateId(),
        connectorId: platform,
        clientId: sampleClientId,
        timestamp: new Date().toISOString(),
        description: `${platform === 'linkedin' ? 'LinkedIn' : 'Twitter'} profile for ${profile.name} (${profile.title}) added`,
        itemType: 'profile',
        itemId: profile.id
      });
    }
  };

  const ingestWebsiteData = async (count: number) => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const summary: WebsiteSummary = {
      id: generateId(),
      clientId: sampleClientId,
      domain: 'techcorp.com',
      headline: 'Enterprise AI Solutions for Modern Businesses',
      services: ['AI Automation', 'Web Development', 'Cloud Infrastructure', 'Data Analytics'],
      blogUrls: ['https://techcorp.com/blog/ai-trends', 'https://techcorp.com/blog/automation'],
      techStack: ['React', 'Node.js', 'AWS', 'TensorFlow'],
      marketPosition: 'Leading provider of AI-powered automation tools for enterprise clients',
      scrapedAt: new Date().toISOString()
    };

    addWebsiteSummary(summary);

    addIngestionEvent({
      id: generateId(),
      connectorId: 'website',
      clientId: sampleClientId,
      timestamp: new Date().toISOString(),
      description: `Website scraped — Services: ${summary.services.slice(0, 2).join(', ')}`,
      itemType: 'website',
      itemId: summary.id
    });
  };

  const ingestContactInfo = async (count: number) => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const contact: ContactInfo = {
      id: generateId(),
      clientId: sampleClientId,
      email: 'contact@techcorp.com',
      phone: '+1 (555) 123-4567',
      address: '123 Tech Street, San Francisco, CA 94102',
      source: 'contact',
      verified: true,
      createdAt: new Date().toISOString()
    };

    addContactInfo(contact);

    addIngestionEvent({
      id: generateId(),
      connectorId: 'contact',
      clientId: sampleClientId,
      timestamp: new Date().toISOString(),
      description: `Contact info added — ${contact.email}, ${contact.phone}`,
      itemType: 'contact',
      itemId: contact.id
    });
  };

  const ingestMeetingTranscripts = async (source: ConnectorType, count: number) => {
    for (let i = 0; i < count; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));

      const transcript: MeetingTranscript = {
        id: generateId(),
        clientId: sampleClientId,
        title: 'Q4 Planning Discussion',
        date: new Date().toISOString(),
        duration: 45,
        transcriptText: 'We discussed the Q4 roadmap and agreed on prioritizing the ML integration project. Key stakeholders expressed enthusiasm about the proposed timeline...',
        sentiment: 'positive',
        actionItems: ['Send technical proposal by Nov 1', 'Schedule demo with engineering team'],
        speakers: [{ name: 'Sarah Mitchell' }, { name: 'John Doe' }],
        source,
        createdAt: new Date().toISOString()
      };

      addMeetingTranscript(transcript);

      addIngestionEvent({
        id: generateId(),
        connectorId: source,
        clientId: sampleClientId,
        timestamp: new Date().toISOString(),
        description: `${source === 'fathom' ? 'Fathom' : source === 'zoom' ? 'Zoom' : 'Teams'} transcript imported: ${transcript.title}`,
        itemType: 'transcript',
        itemId: transcript.id
      });
    }
  };

  const ingestGenericDocuments = async (source: ConnectorType, count: number) => {
    const docNames = ['Client_Proposal_Q3.pdf', 'Meeting_Notes_Oct.docx', 'Financial_Report.xlsx'];

    for (let i = 0; i < count; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));

      const doc: Document = {
        id: generateId(),
        clientId: sampleClientId,
        name: docNames[i % docNames.length],
        type: 'proposal',
        size: Math.floor(Math.random() * 5000000),
        uploadedAt: new Date().toISOString(),
        summary: 'Document imported from external source',
        insights: ['Contains important client information', 'Ready for analysis']
      };

      addDocument(doc);

      addIngestionEvent({
        id: generateId(),
        connectorId: source,
        clientId: sampleClientId,
        timestamp: new Date().toISOString(),
        description: `Document added: ${doc.name}`,
        itemType: 'document',
        itemId: doc.id
      });
    }
  };

  const handleDocumentUpload = async (files: File[]) => {
    for (const file of files) {
      await new Promise(resolve => setTimeout(resolve, 300));

      const doc: Document = {
        id: generateId(),
        clientId: sampleClientId,
        name: file.name,
        type: 'other',
        size: file.size,
        uploadedAt: new Date().toISOString(),
        summary: `Uploaded document: ${file.name}`,
      };

      addDocument(doc);

      addIngestionEvent({
        id: generateId(),
        connectorId: 'documents',
        clientId: sampleClientId,
        timestamp: new Date().toISOString(),
        description: `Document uploaded: ${file.name}`,
        itemType: 'document',
        itemId: doc.id
      });
    }

    const existingConnector = connectors.find(c => c.id === 'documents');
    if (existingConnector?.status === 'not_connected') {
      updateConnectorStatus('documents', 'connected');
    }
    updateConnectorSync('documents', files.length);
  };

  const priorityConnectors = connectors.filter(c => c.isPriority);
  const otherConnectors = connectors.filter(c => !c.isPriority);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Data Sources</h1>
        <p className="text-muted-foreground mt-2">
          Connect external sources to enrich client profiles. This is a mocked connector flow for the prototype.
        </p>
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Prototype Note:</strong> These connectors are simulated. No credentials are saved or used.
              All data ingestion is mocked with local state management.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Priority Connectors</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {priorityConnectors.map(connector => (
                <ConnectorCard
                  key={connector.id}
                  connector={connector}
                  onConnect={() => handleConnect(connector)}
                  onDisconnect={() => handleDisconnect(connector.id)}
                  onSync={() => handleSync(connector.id)}
                  isSyncing={syncingConnectors.has(connector.id)}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Additional Connectors</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {otherConnectors.map(connector => (
                <ConnectorCard
                  key={connector.id}
                  connector={connector}
                  onConnect={() => handleConnect(connector)}
                  onDisconnect={() => handleDisconnect(connector.id)}
                  onSync={() => handleSync(connector.id)}
                  isSyncing={syncingConnectors.has(connector.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <DataStreamPanel events={ingestionEvents} />
        </div>
      </div>

      <OAuthModal
        isOpen={showOAuthModal}
        onClose={() => setShowOAuthModal(false)}
        connector={selectedConnector}
        onAuthorize={handleAuthorize}
      />

      <DocumentUpload
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleDocumentUpload}
      />
    </div>
  );
};
