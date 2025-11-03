import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Client,
  Persona,
  Document,
  CallRecord,
  AgentRun,
  Recommendation,
  Connector,
  IngestionEvent,
  SocialProfile,
  WebsiteSummary,
  ContactInfo,
  MeetingTranscript,
  ConnectorType
} from '../types';
import { mockClients, mockPersonas, mockDocuments, mockCallRecords, mockAgentRuns, mockRecommendations, mockMeetingTranscripts } from '../data/mockData';
import { initialConnectors } from '../data/connectors';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface AppContextType {
  clients: Client[];
  personas: Persona[];
  documents: Document[];
  callRecords: CallRecord[];
  agentRuns: AgentRun[];
  recommendations: Recommendation[];
  connectors: Connector[];
  ingestionEvents: IngestionEvent[];
  socialProfiles: SocialProfile[];
  websiteSummaries: WebsiteSummary[];
  contactInfos: ContactInfo[];
  meetingTranscripts: MeetingTranscript[];
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isLoading: boolean;
  refreshClients: () => Promise<void>;
  getClientById: (id: string) => Client | undefined;
  getPersonaByClientId: (clientId: string) => Persona | undefined;
  getDocumentsByClientId: (clientId: string) => Document[];
  getCallRecordsByClientId: (clientId: string) => CallRecord[];
  getMeetingsByClientId: (clientId: string) => MeetingTranscript[];
  getRecommendationsByClientId: (clientId: string) => Recommendation[];
  updateConnectorStatus: (connectorId: ConnectorType, status: Connector['status'], errorMessage?: string) => void;
  addIngestionEvent: (event: IngestionEvent) => void;
  addDocument: (doc: Document) => void;
  addSocialProfile: (profile: SocialProfile) => void;
  addWebsiteSummary: (summary: WebsiteSummary) => void;
  addContactInfo: (contact: ContactInfo) => void;
  addMeetingTranscript: (transcript: MeetingTranscript) => void;
  updateConnectorSync: (connectorId: ConnectorType, itemsCount: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>(initialConnectors);
  const [ingestionEvents, setIngestionEvents] = useState<IngestionEvent[]>([]);
  const [socialProfiles, setSocialProfiles] = useState<SocialProfile[]>([]);
  const [websiteSummaries, setWebsiteSummaries] = useState<WebsiteSummary[]>([]);
  const [contactInfos, setContactInfos] = useState<ContactInfo[]>([]);
  const [meetingTranscripts, setMeetingTranscripts] = useState<MeetingTranscript[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  useEffect(() => {
    const loadClients = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading clients:', error);
          setClients(mockClients);
        } else if (data) {
          const mappedClients: Client[] = data.map((client: any) => ({
            id: client.id,
            name: client.contact_name || client.company_name || 'Unknown',
            company: client.company_name || '',
            role: client.job_title || '',
            email: client.primary_email || '',
            phone: client.primary_phone || '',
            personaScore: 0,
            fitScore: 0,
            cooperationIndex: 0,
            sentiment: 'positive',
            lastInteraction: client.created_at,
            totalCalls: 0,
            tags: client.tags || []
          }));
          setClients(mappedClients);
        }

        setPersonas(mockPersonas);
        setDocuments(mockDocuments);
        setCallRecords(mockCallRecords);
        setAgentRuns(mockAgentRuns);
        setRecommendations(mockRecommendations);
        setMeetingTranscripts(mockMeetingTranscripts);
      } catch (error) {
        console.error('Error in loadClients:', error);
        setClients(mockClients);
      } finally {
        setIsLoading(false);
      }
    };

    loadClients();
  }, [user]);

  const refreshClients = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error refreshing clients:', error);
      } else if (data) {
        const mappedClients: Client[] = data.map((client: any) => ({
          id: client.id,
          name: client.contact_name || client.company_name || 'Unknown',
          company: client.company_name || '',
          role: client.job_title || '',
          email: client.primary_email || '',
          phone: client.primary_phone || '',
          personaScore: 0,
          fitScore: 0,
          cooperationIndex: 0,
          sentiment: 'positive',
          lastInteraction: client.created_at,
          totalCalls: 0,
          tags: client.tags || []
        }));
        setClients(mappedClients);
      }
    } catch (error) {
      console.error('Error in refreshClients:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark');
  };

  const getClientById = (id: string) => clients.find((client) => client.id === id);
  const getPersonaByClientId = (clientId: string) => personas.find((persona) => persona.clientId === clientId);
  const getDocumentsByClientId = (clientId: string) => documents.filter((doc) => doc.clientId === clientId);
  const getCallRecordsByClientId = (clientId: string) => callRecords.filter((call) => call.clientId === clientId);
  const getMeetingsByClientId = (clientId: string) => meetingTranscripts.filter((meeting) => meeting.clientId === clientId);
  const getRecommendationsByClientId = (clientId: string) => recommendations.filter((rec) => rec.clientId === clientId);

  const updateConnectorStatus = (connectorId: ConnectorType, status: Connector['status'], errorMessage?: string) => {
    setConnectors(prev =>
      prev.map(conn =>
        conn.id === connectorId
          ? { ...conn, status, errorMessage, lastSynced: status === 'connected' ? new Date().toISOString() : conn.lastSynced }
          : conn
      )
    );
  };

  const updateConnectorSync = (connectorId: ConnectorType, itemsCount: number) => {
    setConnectors(prev =>
      prev.map(conn =>
        conn.id === connectorId
          ? { ...conn, lastSynced: new Date().toISOString(), itemsCount: (conn.itemsCount || 0) + itemsCount }
          : conn
      )
    );
  };

  const addIngestionEvent = (event: IngestionEvent) => {
    setIngestionEvents(prev => [event, ...prev].slice(0, 50));
  };

  const addDocument = (doc: Document) => {
    setDocuments(prev => [...prev, doc]);
  };

  const addSocialProfile = (profile: SocialProfile) => {
    setSocialProfiles(prev => [...prev, profile]);
  };

  const addWebsiteSummary = (summary: WebsiteSummary) => {
    setWebsiteSummaries(prev => [...prev, summary]);
  };

  const addContactInfo = (contact: ContactInfo) => {
    setContactInfos(prev => [...prev, contact]);
  };

  const addMeetingTranscript = (transcript: MeetingTranscript) => {
    setMeetingTranscripts(prev => [...prev, transcript]);
  };

  return (
    <AppContext.Provider
      value={{
        clients,
        personas,
        documents,
        callRecords,
        agentRuns,
        recommendations,
        connectors,
        ingestionEvents,
        socialProfiles,
        websiteSummaries,
        contactInfos,
        meetingTranscripts,
        theme,
        toggleTheme,
        isLoading,
        refreshClients,
        getClientById,
        getPersonaByClientId,
        getDocumentsByClientId,
        getCallRecordsByClientId,
        getMeetingsByClientId,
        getRecommendationsByClientId,
        updateConnectorStatus,
        addIngestionEvent,
        addDocument,
        addSocialProfile,
        addWebsiteSummary,
        addContactInfo,
        addMeetingTranscript,
        updateConnectorSync,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
