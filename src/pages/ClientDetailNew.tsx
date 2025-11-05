import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClientHeader } from '../components/client/ClientHeader';
import { FinancialOverview } from '../components/client/FinancialOverview';
import { IntelligenceAgent } from '../components/client/IntelligenceAgent';
import { QueryResult } from '../components/client/QueryResult';
import { PersonaSummary } from '../components/persona/PersonaSummary';
import { PersonaMetricsCards } from '../components/persona/PersonaMetricsCards';
import { ExplainabilityPanel } from '../components/persona/ExplainabilityPanel';
import { PersonaEditor } from '../components/persona/PersonaEditor';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { DocumentUpload } from '../components/data-sources/DocumentUpload';
import { ProjectDetailPanel } from '../components/project/ProjectDetailPanel';
import { Sparkles, Users, Target, Briefcase, MessageSquare, Settings, ArrowLeft, Download, Loader2, FileText, TrendingUp, Plus, User, Mail, Phone, Upload, Save, Edit2, Trash2, ChevronRight, Eye } from 'lucide-react';
import { PersonaMetrics, EvidenceSnippet, IntelligenceQuery, Client, FinancialData, Contact } from '../types';
import { generatePersonaMetrics } from '../utils/personaGenerator';
import { mockContacts, mockOpportunities, mockRelationshipMetrics } from '../data/mockData';
import { exportPersonaReportAsPDF } from '../utils/pdfExport';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { semanticSearch } from '../utils/documentEmbeddings';

export const ClientDetailNew: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'relationships' | 'growth' | 'projects' | 'pitch' | 'intelligence' | 'settings'>('overview');
  const [projectsSubTab, setProjectsSubTab] = useState<'projects' | 'pitch-history'>('projects');
  const [savedPitches, setSavedPitches] = useState<any[]>([]);
  const [selectedPitch, setSelectedPitch] = useState<any | null>(null);
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [personaMetrics, setPersonaMetrics] = useState<PersonaMetrics | null>(null);
  const [evidence, setEvidence] = useState<EvidenceSnippet[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [queries, setQueries] = useState<IntelligenceQuery[]>([]);
  const [isProcessingQuery, setIsProcessingQuery] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactForm, setNewContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    isDecisionMaker: false,
    influenceLevel: 'medium' as 'high' | 'medium' | 'low'
  });
  const [savingContact, setSavingContact] = useState(false);
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingNotes, setSavingNotes] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [meetingTranscripts, setMeetingTranscripts] = useState<any[]>([]);
  const [showTranscriptHistory, setShowTranscriptHistory] = useState(false);
  const [editingTranscriptId, setEditingTranscriptId] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isGeneratingOpportunity, setIsGeneratingOpportunity] = useState(false);
  const [showAddOpportunityModal, setShowAddOpportunityModal] = useState(false);
  const [showEditOpportunityModal, setShowEditOpportunityModal] = useState(false);
  const [newOpportunityForm, setNewOpportunityForm] = useState({ title: '', description: '' });
  const [editOpportunityForm, setEditOpportunityForm] = useState<{ id: string; title: string; description: string } | null>(null);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [isGeneratingProject, setIsGeneratingProject] = useState(false);
  const [deletingOpportunityId, setDeletingOpportunityId] = useState<string | null>(null);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    description: '',
    status: 'opportunity_identified',
    budget: '',
    timeline: '',
    dueDate: ''
  });
  const [savingProject, setSavingProject] = useState(false);

  const relationshipMetrics = mockRelationshipMetrics.find(r => r.clientId === id);

  const dealsProjects = projects.filter(p =>
    p.status === 'quote' || p.status === 'win' || p.status === 'loss'
  );

  const totalPipelineValue = dealsProjects.reduce((sum, deal) =>
    sum + (deal.budget || 0), 0
  );

  useEffect(() => {
    if (id && user) {
      loadClientData();
    }
  }, [id, user]);

  const loadClientData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (clientError) throw clientError;

      if (clientData) {
        setClient({
          id: clientData.id,
          name: clientData.name,
          company: clientData.company,
          email: clientData.email,
          phone: clientData.phone || '',
          role: clientData.role || '',
          industry: clientData.industry || '',
          status: clientData.status,
          lastContact: clientData.last_contact || '',
          nextFollowUp: clientData.next_follow_up || '',
          personaScore: clientData.persona_score,
          tags: clientData.tags || [],
          createdAt: clientData.created_at,
          location: clientData.location || '',
          founded: clientData.founded || '',
          csm: clientData.csm || '',
          avatar: clientData.avatar || undefined,
        });
      }

      const { data: financialDataResult, error: financialError } = await supabase
        .from('financial_data')
        .select('*')
        .eq('client_id', id)
        .maybeSingle();

      if (!financialError && financialDataResult) {
        setFinancialData({
          id: financialDataResult.id,
          clientId: financialDataResult.client_id || '',
          mrr: financialDataResult.mrr,
          totalRevenue: financialDataResult.total_revenue,
          activeDeals: financialDataResult.active_deals,
          latestDeal: financialDataResult.latest_deal_name ? {
            name: financialDataResult.latest_deal_name,
            value: financialDataResult.latest_deal_value || 0,
            stage: financialDataResult.latest_deal_stage || '',
            closeDate: financialDataResult.latest_deal_close_date || '',
          } : undefined,
        });
      }

      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('client_id', id)
        .eq('user_id', user.id);

      if (!contactsError && contactsData) {
        setContacts(contactsData.map(c => ({
          id: c.id,
          clientId: c.client_id || '',
          name: c.name,
          email: c.email,
          phone: c.phone || undefined,
          role: c.role,
          department: c.department || undefined,
          isPrimary: c.is_primary,
          isDecisionMaker: c.is_decision_maker,
          influenceLevel: c.influence_level as 'high' | 'medium' | 'low' | undefined,
          source: c.source || undefined,
          lastContact: c.last_contact || undefined,
        })));
      }

      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', id)
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (!documentsError && documentsData) {
        setUploadedDocuments(documentsData);
      }

      const { data: transcriptsData, error: transcriptsError } = await supabase
        .from('meeting_transcripts')
        .select('*')
        .eq('client_id', id)
        .eq('user_id', user.id)
        .order('meeting_date', { ascending: false });

      if (!transcriptsError && transcriptsData) {
        setMeetingTranscripts(transcriptsData);
      }

      const { data: opportunitiesData, error: opportunitiesError } = await supabase
        .from('opportunities')
        .select('*')
        .eq('client_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!opportunitiesError && opportunitiesData) {
        setOpportunities(opportunitiesData);
      }

      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      if (!projectsError && projectsData) {
        setProjects(projectsData);
      }

      const { data: pitchesData, error: pitchesError } = await supabase
        .from('saved_pitches')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      if (!pitchesError && pitchesData) {
        setSavedPitches(pitchesData);
      }
    } catch (error) {
      console.error('Error loading client data:', error);
      showToast('error', 'Failed to load client data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMeetingNotes = async () => {
    if (!client || !user || !meetingNotes.trim() || !meetingTitle.trim()) {
      showToast('error', 'Please provide both a title and transcript');
      return;
    }

    setSavingNotes(true);
    try {
      if (editingTranscriptId) {
        const { data, error } = await supabase
          .from('meeting_transcripts')
          .update({
            title: meetingTitle,
            transcript_text: meetingNotes,
            meeting_date: meetingDate
          })
          .eq('id', editingTranscriptId)
          .eq('user_id', user.id)
          .select();

        if (error) {
          console.error('Update error:', error);
          throw error;
        }

        if (data && data.length > 0) {
          setMeetingTranscripts(prev =>
            prev.map(t => t.id === editingTranscriptId ? data[0] : t)
          );
        }

        showToast('success', 'Meeting transcript updated successfully');
        setShowTranscriptHistory(true);
      } else {
        const { data, error } = await supabase
          .from('meeting_transcripts')
          .insert({
            user_id: user.id,
            client_id: client.id,
            title: meetingTitle,
            transcript_text: meetingNotes,
            meeting_date: meetingDate,
            source: 'manual'
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setMeetingTranscripts(prev => [data, ...prev]);
        }

        showToast('success', 'Meeting transcript saved successfully');
      }

      setMeetingNotes('');
      setMeetingTitle('');
      setMeetingDate(new Date().toISOString().split('T')[0]);
      setEditingTranscriptId(null);
    } catch (error) {
      console.error('Error saving meeting transcript:', error);
      showToast('error', 'Failed to save meeting transcript');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDeleteTranscript = async (transcriptId: string) => {
    if (!user) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this transcript? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('meeting_transcripts')
        .delete()
        .eq('id', transcriptId)
        .eq('user_id', user.id);

      if (error) throw error;

      setMeetingTranscripts(prev => prev.filter(t => t.id !== transcriptId));
      showToast('success', 'Transcript deleted successfully');
    } catch (error) {
      console.error('Error deleting transcript:', error);
      showToast('error', 'Failed to delete transcript');
    }
  };

  const handleDeleteDocument = async (document: any) => {
    if (!user) return;

    const confirmDelete = window.confirm(`Are you sure you want to delete "${document.name}"? This action cannot be undone.`);
    if (!confirmDelete) return;

    try {
      if (document.source) {
        const { error: storageError } = await supabase.storage
          .from('client-documents')
          .remove([document.source]);

        if (storageError) {
          console.error('Error deleting file from storage:', storageError);
        }
      }

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id)
        .eq('user_id', user.id);

      if (error) throw error;

      setUploadedDocuments(prev => prev.filter(d => d.id !== document.id));
      showToast('success', 'Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      showToast('error', 'Failed to delete document');
    }
  };

  const handleExportClientData = async () => {
    if (!client) return;

    try {
      const exportData = {
        client: client,
        contacts: contacts,
        documents: uploadedDocuments,
        meetingTranscripts: meetingTranscripts,
        personaMetrics: personaMetrics,
        exportDate: new Date().toISOString()
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${client.name.replace(/\s+/g, '_')}_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('success', 'Client data exported successfully');
    } catch (error) {
      console.error('Error exporting client data:', error);
      showToast('error', 'Failed to export client data');
    }
  };

  const handleArchiveClient = async () => {
    if (!client || !user) return;

    const confirmArchive = window.confirm(`Archive ${client.name}? This will hide the client from your active list but preserve all data.`);
    if (!confirmArchive) return;

    try {
      const { error } = await supabase
        .from('clients')
        .update({ status: 'archived' })
        .eq('id', client.id)
        .eq('user_id', user.id);

      if (error) throw error;

      showToast('success', 'Client archived successfully');
      navigate('/clients');
    } catch (error) {
      console.error('Error archiving client:', error);
      showToast('error', 'Failed to archive client');
    }
  };

  const handleDeleteClient = async () => {
    if (!client || !user) return;

    const confirmDelete = window.confirm(
      `DELETE ${client.name}?\n\nThis will permanently delete:\n- Client profile\n- All contacts\n- All documents\n- All meeting transcripts\n- All projects\n\nThis action CANNOT be undone. Type the client name to confirm.`
    );

    if (!confirmDelete) return;

    const typedName = window.prompt(`Type "${client.name}" to confirm deletion:`);
    if (typedName !== client.name) {
      showToast('error', 'Client name did not match. Deletion cancelled.');
      return;
    }

    try {
      const { data: documents } = await supabase
        .from('documents')
        .select('source')
        .eq('client_id', client.id)
        .eq('user_id', user.id);

      if (documents && documents.length > 0) {
        const filePaths = documents
          .map(doc => doc.source)
          .filter(Boolean);

        if (filePaths.length > 0) {
          await supabase.storage
            .from('client-documents')
            .remove(filePaths);
        }
      }

      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id)
        .eq('user_id', user.id);

      if (error) throw error;

      showToast('success', 'Client deleted successfully');
      navigate('/clients');
    } catch (error) {
      console.error('Error deleting client:', error);
      showToast('error', 'Failed to delete client');
    }
  };

  const handleDocumentUpload = async (files: File[]) => {
    if (!client || !user || files.length === 0) return;

    setUploadingDoc(true);
    setShowDocumentUpload(false);

    try {
      for (const file of files) {
        const sanitizedFileName = file.name
          .replace(/[^a-zA-Z0-9._-]/g, '_')
          .replace(/_{2,}/g, '_');
        const fileName = `${user.id}/${client.id}/${Date.now()}_${sanitizedFileName}`;

        const { data, error } = await supabase.storage
          .from('client-documents')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('Error uploading file:', error);
          throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('client-documents')
          .getPublicUrl(fileName);

        const documentType = file.type.includes('pdf') ? 'proposal' :
                            file.type.includes('word') ? 'contract' :
                            file.type.includes('image') ? 'other' : 'email';

        const { data: docData, error: dbError } = await supabase
          .from('documents')
          .insert({
            client_id: client.id,
            user_id: user.id,
            name: file.name,
            type: documentType,
            size: file.size,
            url: publicUrl,
            source: fileName,
            status: 'completed',
            uploaded_at: new Date().toISOString()
          })
          .select()
          .single();

        if (dbError) {
          console.error('Error saving document to database:', dbError);
          throw new Error(`Failed to save ${file.name} to database: ${dbError.message}`);
        }

        if (docData) {
          setUploadedDocuments(prev => [docData, ...prev]);
        }

        try {
          const { processAndEmbedDocument } = await import('../utils/documentEmbeddings');
          await processAndEmbedDocument(file, {
            clientId: client.id,
            metadata: {
              documentType: documentType,
              fileName: file.name,
              clientId: client.id,
            }
          });
          console.log(`Successfully generated embeddings for ${file.name}`);
        } catch (embedError) {
          console.error(`Failed to generate embeddings for ${file.name}:`, embedError);
        }
      }

      showToast('success', `Successfully uploaded ${files.length} document(s)`);
    } catch (error) {
      console.error('Error uploading documents:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to upload documents');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSaveContact = async () => {
    if (!client || !user || !newContactForm.name || !newContactForm.email || !newContactForm.role) {
      showToast('error', 'Please fill in name, email, and role');
      return;
    }

    setSavingContact(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          client_id: client.id,
          user_id: user.id,
          name: newContactForm.name,
          email: newContactForm.email,
          phone: newContactForm.phone || null,
          role: newContactForm.role,
          department: newContactForm.department || null,
          is_primary: false,
          is_decision_maker: newContactForm.isDecisionMaker,
          influence_level: newContactForm.influenceLevel,
          source: 'manual'
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setContacts([...contacts, {
          id: data.id,
          clientId: data.client_id || '',
          name: data.name,
          email: data.email,
          phone: data.phone || undefined,
          role: data.role,
          department: data.department || undefined,
          isPrimary: data.is_primary,
          isDecisionMaker: data.is_decision_maker,
          influenceLevel: data.influence_level as 'high' | 'medium' | 'low' | undefined,
          source: data.source || undefined,
          lastContact: data.last_contact || undefined,
        }]);

        setNewContactForm({
          name: '',
          email: '',
          phone: '',
          role: '',
          department: '',
          isDecisionMaker: false,
          influenceLevel: 'medium'
        });
        setShowAddContactModal(false);
        showToast('success', 'Contact added successfully');
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      showToast('error', 'Failed to save contact');
    } finally {
      setSavingContact(false);
    }
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    await loadClientData();
    setIsRefreshing(false);
    handleRunPersonaAnalysis();
  };

  const handleEditClient = () => {
    navigate(`/clients/${id}/edit`);
  };

  const handleRunPersonaAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const result = generatePersonaMetrics({
        documents: [],
        calls: [],
        meetings: [],
        emails: []
      });
      setPersonaMetrics(result.metrics);
      setEvidence(result.evidence);
      setIsAnalyzing(false);
    }, 7000);
  };

  const handleQuery = async (query: string, mode: 'quick' | 'deep'): Promise<string> => {
    setIsProcessingQuery(true);

    try {
      const searchLimit = mode === 'deep' ? 10 : 5;
      const similarityThreshold = mode === 'deep' ? 0.6 : 0.7;

      const searchResults = await semanticSearch(query, {
        clientId: id,
        limit: searchLimit,
        similarityThreshold: similarityThreshold,
      });

      const transcriptsContext = meetingTranscripts.length > 0
        ? `\n\nMeeting History (${meetingTranscripts.length} transcripts):\n` +
          meetingTranscripts.slice(0, 3).map((t, i) =>
            `${i + 1}. ${t.title} (${new Date(t.meeting_date).toLocaleDateString()})\n${t.transcript_text.substring(0, 300)}${t.transcript_text.length > 300 ? '...' : ''}`
          ).join('\n\n')
        : '';

      const clientContext = `
Client Information:
• Company: ${client?.company || 'N/A'}
• Industry: ${client?.industry || 'N/A'}
• Status: ${client?.status || 'N/A'}
• Location: ${client?.location || 'N/A'}
• Contact: ${client?.email || 'N/A'}${transcriptsContext}
`;

      if (searchResults && searchResults.length > 0) {
        const documentContext = searchResults
          .map((result, index) => `[${index + 1}] ${result.content_chunk} (from ${result.document_name}, similarity: ${(result.similarity * 100).toFixed(1)}%)`)
          .join('\n\n');

        const response = mode === 'deep'
          ? `${clientContext}\n\nDocument Analysis:\n${documentContext}\n\nKey Insights:\n• Found ${searchResults.length} relevant document sections\n• Analysis includes client profile and ${uploadedDocuments.length} uploaded documents\n• Similarity scores range from ${(searchResults[searchResults.length - 1].similarity * 100).toFixed(1)}% to ${(searchResults[0].similarity * 100).toFixed(1)}%`
          : `${clientContext}\n\nTop Document Match:\n${searchResults[0].content_chunk.substring(0, 300)}${searchResults[0].content_chunk.length > 300 ? '...' : ''}\n\n(Source: ${searchResults[0].document_name}, ${(searchResults[0].similarity * 100).toFixed(1)}% relevant)`;

        setIsProcessingQuery(false);
        return response;
      } else {
        const fallbackResponse = mode === 'deep'
          ? `${clientContext}\n\nNo matching documents found for "${query}".\n\nAvailable Information:\n• Client profile data shown above\n• ${uploadedDocuments.length} document(s) uploaded\n• ${meetingTranscripts.length} meeting transcript(s) saved\n\nTo improve search results:\n• Upload more client documents\n• Add meeting transcripts\n• Try a different search query`
          : `${clientContext}\n\nNo documents matched "${query}". ${uploadedDocuments.length === 0 ? 'Upload documents to enable document search.' : 'Try a different query or check uploaded documents.'}`;

        setIsProcessingQuery(false);
        return fallbackResponse;
      }
    } catch (error) {
      console.error('Error processing query:', error);
      setIsProcessingQuery(false);
      return `An error occurred while processing your query. Please ensure:\n• You have an OpenAI API key configured in Settings\n• Documents have been uploaded for this client\n• You have a stable internet connection\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };

  const handleGenerateOpportunity = async () => {
    if (!client || !user) return;

    setIsGeneratingOpportunity(true);
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .insert({
          client_id: id,
          user_id: user.id,
          title: `${client.company} - Growth Opportunity`,
          description: `AI-identified opportunity for ${client.company} based on recent interactions and market analysis.`,
          is_ai_generated: true,
          stage: 'qualified',
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setOpportunities([data, ...opportunities]);
      showToast('success', 'Opportunity generated successfully');
    } catch (error: any) {
      console.error('Error generating opportunity:', error);
      showToast('error', `Failed to generate opportunity: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingOpportunity(false);
    }
  };

  const handleAddManualOpportunity = async () => {
    if (!client || !user || !newOpportunityForm.title || !newOpportunityForm.description) return;

    try {
      const { data, error } = await supabase
        .from('opportunities')
        .insert({
          client_id: id,
          user_id: user.id,
          title: newOpportunityForm.title,
          description: newOpportunityForm.description,
          is_ai_generated: false,
          stage: 'lead',
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setOpportunities([data, ...opportunities]);
      setNewOpportunityForm({ title: '', description: '' });
      setShowAddOpportunityModal(false);
      showToast('success', 'Opportunity added successfully');
    } catch (error: any) {
      console.error('Error adding opportunity:', error);
      showToast('error', `Failed to add opportunity: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleEditOpportunity = (opportunity: any) => {
    setEditOpportunityForm({
      id: opportunity.id,
      title: opportunity.title,
      description: opportunity.description || '',
    });
    setShowEditOpportunityModal(true);
  };

  const handleUpdateOpportunity = async () => {
    if (!editOpportunityForm || !editOpportunityForm.title || !editOpportunityForm.description) return;

    try {
      const { error } = await supabase
        .from('opportunities')
        .update({
          title: editOpportunityForm.title,
          description: editOpportunityForm.description,
        })
        .eq('id', editOpportunityForm.id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setOpportunities(opportunities.map(o =>
        o.id === editOpportunityForm.id
          ? { ...o, title: editOpportunityForm.title, description: editOpportunityForm.description }
          : o
      ));
      setEditOpportunityForm(null);
      setShowEditOpportunityModal(false);
      showToast('success', 'Opportunity updated successfully');
    } catch (error: any) {
      console.error('Error updating opportunity:', error);
      showToast('error', `Failed to update opportunity: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDeleteOpportunity = async (opportunityId: string) => {
    if (!confirm('Are you sure you want to delete this opportunity? This action cannot be undone.')) {
      return;
    }

    setDeletingOpportunityId(opportunityId);
    try {
      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', opportunityId);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setOpportunities(opportunities.filter(o => o.id !== opportunityId));
      showToast('success', 'Opportunity deleted successfully');
    } catch (error: any) {
      console.error('Error deleting opportunity:', error);
      showToast('error', `Failed to delete opportunity: ${error?.message || 'Unknown error'}`);
    } finally {
      setDeletingOpportunityId(null);
    }
  };

  const handleConvertToProject = async (opportunityId: string) => {
    if (!client || !user) return;

    try {
      const opportunity = opportunities.find(o => o.id === opportunityId);
      if (!opportunity) return;

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({
          client_id: id,
          name: opportunity.title,
          summary: opportunity.description,
          status: 'opportunity_identified',
          project_type: 'Pre-Sales',
          opportunity_id: opportunityId,
          progress_percentage: 0,
          is_ai_generated: opportunity.is_ai_generated || false,
        })
        .select()
        .single();

      if (projectError) {
        console.error('Project insert error:', projectError);
        throw projectError;
      }

      const { error: updateError } = await supabase
        .from('opportunities')
        .update({ converted_to_project_id: projectData.id })
        .eq('id', opportunityId);

      if (updateError) {
        console.error('Opportunity update error:', updateError);
        throw updateError;
      }

      setProjects([projectData, ...projects]);
      setOpportunities(opportunities.map(o =>
        o.id === opportunityId ? { ...o, converted_to_project_id: projectData.id } : o
      ));
      showToast('success', 'Converted to project successfully');
      setActiveTab('projects');
    } catch (error: any) {
      console.error('Error converting to project:', error);
      showToast('error', `Failed to convert to project: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleGenerateProject = async () => {
    if (!client || !user) return;

    setIsGeneratingProject(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          client_id: id,
          name: `AI-Generated Project for ${client.company}`,
          description: 'AI-identified project opportunity based on client needs and capabilities',
          status: 'opportunity_identified',
          project_type: 'Pre-Sales',
          progress_percentage: 0,
          is_ai_generated: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Project generation error:', error);
        throw error;
      }

      setProjects([data, ...projects]);
      showToast('success', 'Project generated successfully');
    } catch (error: any) {
      console.error('Error generating project:', error);
      showToast('error', `Failed to generate project: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingProject(false);
    }
  };

  const handleAddProject = async () => {
    if (!newProjectForm.name.trim()) {
      showToast('error', 'Project name is required');
      return;
    }

    setSavingProject(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          client_id: id,
          name: newProjectForm.name,
          description: newProjectForm.description || null,
          status: newProjectForm.status,
          budget: newProjectForm.budget ? parseFloat(newProjectForm.budget) : null,
          timeline: newProjectForm.timeline || null,
          due_date: newProjectForm.dueDate || null,
          project_type: 'Pre-Sales',
          progress_percentage: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Project creation error:', error);
        throw error;
      }

      setProjects([data, ...projects]);
      showToast('success', 'Project created successfully');
      setShowAddProjectModal(false);
      setNewProjectForm({
        name: '',
        description: '',
        status: 'opportunity_identified',
        budget: '',
        timeline: '',
        dueDate: ''
      });
    } catch (error: any) {
      console.error('Error creating project:', error);
      showToast('error', `Failed to create project: ${error?.message || 'Unknown error'}`);
    } finally {
      setSavingProject(false);
    }
  };

  const handleUpdateProject = async (updatedProject: any) => {
    try {
      const updateData: any = {
        name: updatedProject.title || updatedProject.name,
        description: updatedProject.description,
        status: updatedProject.status,
      };

      if (updatedProject.budget !== undefined) {
        updateData.budget = updatedProject.budget;
      }
      if (updatedProject.timeline) {
        updateData.timeline = updatedProject.timeline;
      }
      if (updatedProject.dueDate) {
        updateData.due_date = updatedProject.dueDate;
      }

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', updatedProject.id);

      if (error) {
        console.error('Project update error:', error);
        throw error;
      }

      const { data: refreshedProject, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', updatedProject.id)
        .single();

      if (!fetchError && refreshedProject) {
        setProjects(projects.map(p => p.id === updatedProject.id ? refreshedProject : p));
      }

      setSelectedProject(null);
      showToast('success', 'Project updated successfully');
    } catch (error: any) {
      console.error('Error updating project:', error);
      showToast('error', `Failed to update project: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        console.error('Project delete error:', error);
        throw error;
      }

      setProjects(projects.filter(p => p.id !== projectId));
      setSelectedProject(null);
      showToast('success', 'Project deleted successfully');
    } catch (error: any) {
      console.error('Error deleting project:', error);
      showToast('error', `Failed to delete project: ${error?.message || 'Unknown error'}`);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Sparkles },
    { id: 'relationships', label: 'Relationships', icon: Users },
    { id: 'growth', label: 'Growth Opportunities', icon: TrendingUp },
    { id: 'projects', label: 'Projects & Deals', icon: Briefcase, hasSubnav: true },
    { id: 'intelligence', label: 'Intelligence & Assets', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading client data...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Client not found</p>
          <Button onClick={() => navigate('/clients')}>Back to Clients</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-background">
        <div className="px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/clients')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Button>
        </div>
      </div>

      <ClientHeader
        client={client}
        onRefreshData={handleRefreshData}
        isRefreshing={isRefreshing}
        onEditClient={handleEditClient}
        onDeleteClient={handleDeleteClient}
      />

      <div className="border-b border-border">
        <div className="px-6">
          <div className="flex gap-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 pb-4 pt-4 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {financialData ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <FinancialOverview data={financialData} />
                </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={handleRunPersonaAnalysis}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Run Persona Analysis
                        </>
                      )}
                    </Button>
                    {personaMetrics && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          exportPersonaReportAsPDF(client, personaMetrics);
                          showToast('success', 'Persona report exported successfully');
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Report
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No financial data available for this client.</p>
                </CardContent>
              </Card>
            )}

            {personaMetrics && !isAnalyzing && (
              <div className="space-y-6">
                <PersonaSummary
                  clientName={client.name}
                  company={client.company}
                  industry={client.industry}
                  metrics={personaMetrics}
                  logo={client.avatar}
                />

                <PersonaMetricsCards metrics={personaMetrics} />

                <ExplainabilityPanel evidence={evidence} />
              </div>
            )}

            {isAnalyzing && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                  <h3 className="text-lg font-semibold mb-2">Analyzing Client Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Processing interactions and generating persona insights...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'relationships' && (
          <div className="space-y-6">
            {relationshipMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Relationship Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Trust Level</p>
                      <p className="text-2xl font-bold text-foreground">{relationshipMetrics.trustLevel}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Communication</p>
                      <Badge variant="secondary">{relationshipMetrics.communicationFrequency}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Sentiment</p>
                      <p className="text-2xl font-bold text-green-600">+{relationshipMetrics.overallSentiment.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Response Rate</p>
                      <p className="text-2xl font-bold text-foreground">{relationshipMetrics.responseRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Contacts & Decision Makers</CardTitle>
                  <Button variant="primary" size="sm" onClick={() => setShowAddContactModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {contacts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No contacts added yet</p>
                    <Button variant="outline" size="sm" onClick={() => setShowAddContactModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Contact
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contacts.map(contact => (
                      <div key={contact.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                              {contact.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{contact.name}</p>
                            <p className="text-sm text-muted-foreground">{contact.role}</p>
                            {contact.email && (
                              <p className="text-xs text-muted-foreground mt-1">{contact.email}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {contact.isPrimary && (
                            <Badge variant="default">Primary</Badge>
                          )}
                          {contact.isDecisionMaker && (
                            <Badge variant="success">Decision Maker</Badge>
                          )}
                          {contact.influenceLevel && (
                            <Badge variant="secondary">{contact.influenceLevel} influence</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'growth' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Growth Opportunities</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateOpportunity}
                    disabled={isGeneratingOpportunity}
                  >
                    {isGeneratingOpportunity ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Auto-Generate
                      </>
                    )}
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setShowAddOpportunityModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Opportunity
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {opportunities.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No opportunities yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Use AI to identify potential growth areas or add manually
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {opportunities.map(opp => (
                    <div
                      key={opp.id}
                      className={`p-4 border rounded-lg ${
                        opp.converted_to_project_id
                          ? 'border-green-200 bg-green-50'
                          : 'border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-foreground">{opp.title}</h4>
                            {opp.is_ai_generated && (
                              <Badge variant="outline" size="sm">
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI
                              </Badge>
                            )}
                            {opp.converted_to_project_id && (
                              <Badge variant="success" size="sm">
                                Converted to Project
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{opp.description}</p>
                          <p className="text-xs text-muted-foreground mt-3">
                            Created {new Date(opp.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!opp.converted_to_project_id && (
                            <>
                              <button
                                onClick={() => handleEditOpportunity(opp)}
                                className="p-2 hover:bg-muted rounded transition-colors"
                                title="Edit opportunity"
                              >
                                <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </button>
                              <button
                                onClick={() => handleDeleteOpportunity(opp.id)}
                                disabled={deletingOpportunityId === opp.id}
                                className="p-2 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                title="Delete opportunity"
                              >
                                {deletingOpportunityId === opp.id ? (
                                  <Loader2 className="h-4 w-4 text-red-600 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                                )}
                              </button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleConvertToProject(opp.id)}
                              >
                                Add to Project
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="border-b border-border">
              <div className="flex gap-6">
                <button
                  onClick={() => setProjectsSubTab('projects')}
                  className={`pb-3 px-1 border-b-2 transition-colors ${
                    projectsSubTab === 'projects'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="text-sm font-medium">Projects</span>
                </button>
                <button
                  onClick={() => setProjectsSubTab('pitch-history')}
                  className={`pb-3 px-1 border-b-2 transition-colors ${
                    projectsSubTab === 'pitch-history'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className="text-sm font-medium">Pitch History</span>
                  {savedPitches.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                      {savedPitches.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {projectsSubTab === 'projects' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Projects</CardTitle>
                    <Button variant="primary" size="sm" onClick={() => setShowAddProjectModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Project
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {projects.length === 0 ? (
                    <div className="text-center py-12">
                      <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No projects yet</h3>
                      <p className="text-muted-foreground mb-6">
                        Convert opportunities to projects or create new ones
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {projects.map((project) => {
                        const getStatusColor = (status: string) => {
                          if (status === 'opportunity_identified') return 'secondary';
                          if (status === 'discussion') return 'primary';
                          if (status === 'quote') return 'warning';
                          if (status === 'win') return 'success';
                          if (status === 'loss') return 'error';
                          return 'secondary';
                        };

                        const getStatusLabel = (status: string) => {
                          if (status === 'opportunity_identified') return 'Opportunity';
                          if (status === 'discussion') return 'Discussion';
                          if (status === 'quote') return 'Quote';
                          if (status === 'win') return 'Win';
                          if (status === 'loss') return 'Loss';
                          return status;
                        };

                        return (
                          <div key={project.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-foreground">{project.name}</h4>
                                  {project.is_ai_generated && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                      <Sparkles className="h-3 w-3" />
                                      <span>AI</span>
                                    </div>
                                  )}
                                </div>
                                {project.project_code && (
                                  <p className="text-xs text-muted-foreground mb-1">
                                    {project.project_code}
                                  </p>
                                )}
                                {(project.summary || project.description) && (
                                  <p className="text-sm text-muted-foreground mt-2">
                                    {project.summary || project.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={getStatusColor(project.status)}>
                                  {getStatusLabel(project.status)}
                                </Badge>
                                <button
                                  onClick={() => setSelectedProject(project)}
                                  className="p-1 hover:bg-muted rounded transition-colors"
                                  title="View details"
                                >
                                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border">
                              <div className="space-y-2">
                                {project.project_type && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <Target className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-muted-foreground">{project.project_type}</span>
                                  </div>
                                )}
                                {project.project_manager && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-muted-foreground">{project.project_manager}</span>
                                  </div>
                                )}
                                {project.start_date && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground">Started: {new Date(project.start_date).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-2">
                                {project.due_date && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground">Due: {new Date(project.due_date).toLocaleDateString()}</span>
                                  </div>
                                )}
                                {project.budget && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground">Budget: ${project.budget.toLocaleString()}</span>
                                  </div>
                                )}
                                {project.timeline && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground">Timeline: {project.timeline}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {(project.progress_percentage !== undefined && project.progress_percentage !== null) && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-muted-foreground">Progress</span>
                                  <span className="text-xs font-medium text-foreground">{project.progress_percentage}%</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full transition-all duration-300"
                                    style={{ width: `${project.progress_percentage}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            {project.health_score !== undefined && project.health_score !== null && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-muted-foreground">Health:</span>
                                <div className={`w-2 h-2 rounded-full ${
                                  project.health_score >= 80 ? 'bg-green-500' :
                                  project.health_score >= 60 ? 'bg-blue-500' :
                                  project.health_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                }`} title={`Health Score: ${project.health_score}%`} />
                                <span className="text-xs text-muted-foreground">{project.health_score}%</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Deals Pipeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dealsProjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No active deals in pipeline
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {dealsProjects.map((deal, index) => (
                          <div key={deal.id} className={index > 0 ? 'pt-4 border-t border-border' : ''}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-foreground">
                                {deal.name}
                              </span>
                              <Badge variant={
                                deal.status === 'quote' ? 'warning' :
                                deal.status === 'win' ? 'success' :
                                deal.status === 'loss' ? 'error' : 'secondary'
                              }>
                                {deal.status === 'quote' ? 'Quote' :
                                 deal.status === 'win' ? 'Win' :
                                 deal.status === 'loss' ? 'Loss' :
                                 deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                              </Badge>
                            </div>
                            {deal.budget && (
                              <p className="text-lg font-bold text-foreground">
                                ${deal.budget.toLocaleString()}
                              </p>
                            )}
                            {deal.due_date && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Close: {new Date(deal.due_date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Total Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground mb-2">
                      ${totalPipelineValue.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Weighted pipeline value</p>
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Total Deals</span>
                        <span className="font-semibold text-foreground">{dealsProjects.length}</span>
                      </div>
                      {dealsProjects.length > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Avg Deal Size</span>
                          <span className="font-semibold text-foreground">
                            ${Math.round(totalPipelineValue / dealsProjects.length).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            )}

            {projectsSubTab === 'pitch-history' && (
              <Card>
                <CardHeader>
                  <CardTitle>Saved Pitches for {client?.company}</CardTitle>
                </CardHeader>
                <CardContent>
                  {savedPitches.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No saved pitches yet</h3>
                      <p className="text-muted-foreground mb-6">
                        Generate and save pitches from the Pitch Generator to see them here
                      </p>
                      <Button variant="primary" onClick={() => navigate('/pitch-generator')}>
                        Go to Pitch Generator
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {savedPitches.map((pitch) => (
                        <div
                          key={pitch.id}
                          className="p-4 border border-border rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-foreground">{pitch.title}</h4>
                                <Badge variant="outline" size="sm">
                                  Variant {pitch.variant}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>{new Date(pitch.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedPitch(pitch);
                                  setShowPitchModal(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const blob = new Blob([pitch.content], { type: 'text/plain' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `pitch-${pitch.variant}-${new Date(pitch.created_at).toLocaleDateString()}.txt`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" size="sm">{pitch.tone}</Badge>
                            <Badge variant="secondary" size="sm">{pitch.length}</Badge>
                          </div>

                          <div className="text-sm text-muted-foreground">
                            Services: {pitch.services?.join(', ') || 'None'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'intelligence' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:col-span-1">
                <IntelligenceAgent
                  clientId={client.id}
                  onQuery={handleQuery}
                  isProcessing={isProcessingQuery}
                />
              </div>

              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Meeting Notes
                      </CardTitle>
                      {meetingTranscripts.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowTranscriptHistory(!showTranscriptHistory);
                            if (!showTranscriptHistory) {
                              setMeetingNotes('');
                              setMeetingTitle('');
                              setMeetingDate(new Date().toISOString().split('T')[0]);
                              setEditingTranscriptId(null);
                            }
                          }}
                        >
                          {showTranscriptHistory ? 'New Note' : `History (${meetingTranscripts.length})`}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!showTranscriptHistory ? (
                      <div className="space-y-3">
                        <Input
                          value={meetingTitle}
                          onChange={(e) => setMeetingTitle(e.target.value)}
                          placeholder="Meeting title (e.g., Q4 Planning Review)"
                          disabled={savingNotes}
                        />
                        <input
                          type="date"
                          value={meetingDate}
                          onChange={(e) => setMeetingDate(e.target.value)}
                          className="w-full p-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          disabled={savingNotes}
                        />
                        <textarea
                          value={meetingNotes}
                          onChange={(e) => setMeetingNotes(e.target.value)}
                          placeholder="Add meeting transcript, key discussion points, action items..."
                          className="w-full h-48 p-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                          disabled={savingNotes}
                        />
                        <div className="flex justify-between items-center gap-2">
                          {editingTranscriptId && (
                            <span className="text-sm text-muted-foreground">Editing transcript</span>
                          )}
                          <div className="flex gap-2 ml-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setMeetingNotes('');
                                setMeetingTitle('');
                                setMeetingDate(new Date().toISOString().split('T')[0]);
                                setEditingTranscriptId(null);
                              }}
                              disabled={(!meetingNotes && !meetingTitle) || savingNotes}
                            >
                              {editingTranscriptId ? 'Cancel' : 'Clear'}
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={handleSaveMeetingNotes}
                              disabled={!meetingNotes.trim() || !meetingTitle.trim() || savingNotes}
                            >
                              {savingNotes ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-2" />
                                  {editingTranscriptId ? 'Update Transcript' : 'Save Transcript'}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {meetingTranscripts.map((transcript) => (
                          <div
                            key={transcript.id}
                            className="p-4 border border-border rounded-lg hover:bg-accent transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground">{transcript.title}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(transcript.meeting_date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setMeetingNotes(transcript.transcript_text);
                                    setMeetingTitle(transcript.title);
                                    setMeetingDate(transcript.meeting_date.split('T')[0]);
                                    setEditingTranscriptId(transcript.id);
                                    setShowTranscriptHistory(false);
                                  }}
                                  className="p-1 text-muted-foreground hover:text-primary transition-colors"
                                  title="Edit transcript"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTranscript(transcript.id)}
                                  className="p-1 text-muted-foreground hover:text-red-600 transition-colors"
                                  title="Delete transcript"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-3">
                              {transcript.transcript_text}
                            </p>
                            <button
                              onClick={() => {
                                setMeetingNotes(transcript.transcript_text);
                                setMeetingTitle(transcript.title);
                                setMeetingDate(transcript.meeting_date.split('T')[0]);
                                setEditingTranscriptId(transcript.id);
                                setShowTranscriptHistory(false);
                              }}
                              className="text-xs text-primary hover:underline mt-2"
                            >
                              View full transcript
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Documents & Assets
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDocumentUpload(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {uploadingDoc && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm text-blue-900">Uploading and generating embeddings...</span>
                      </div>
                    )}
                    {uploadedDocuments.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-sm text-muted-foreground mb-4">
                          No documents uploaded yet
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDocumentUpload(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Upload First Document
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {uploadedDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-accent transition-colors"
                          >
                            <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {doc.name}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {doc.type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(doc.uploaded_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80 transition-colors"
                                title="Download document"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                              <button
                                onClick={() => handleDeleteDocument(doc)}
                                className="text-muted-foreground hover:text-red-600 transition-colors"
                                title="Delete document"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border border-border rounded-lg p-4 hover:bg-accent transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-foreground mb-1">Export Client Data</h3>
                        <p className="text-sm text-muted-foreground">
                          Download all client information, contacts, documents, and meeting transcripts as JSON
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full justify-center"
                      onClick={handleExportClientData}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Client Data
                    </Button>
                  </div>

                  <div className="border border-border rounded-lg p-4 hover:bg-accent transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-foreground mb-1">Archive Client</h3>
                        <p className="text-sm text-muted-foreground">
                          Hide this client from your active list while preserving all data
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full justify-center"
                      onClick={handleArchiveClient}
                    >
                      Archive Client
                    </Button>
                  </div>

                  <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-red-900 mb-1">Delete Client</h3>
                        <p className="text-sm text-red-800">
                          Permanently delete this client and all associated data. This action cannot be undone.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full justify-center border-red-300 text-red-600 hover:bg-red-100"
                      onClick={handleDeleteClient}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Client
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {personaMetrics && (
        <PersonaEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          metrics={personaMetrics}
          onSave={setPersonaMetrics}
        />
      )}

      <Modal
        isOpen={showAddContactModal}
        onClose={() => setShowAddContactModal(false)}
        title="Add New Contact"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Name <span className="text-red-600">*</span>
            </label>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="John Doe"
                value={newContactForm.name}
                onChange={(e) => setNewContactForm({ ...newContactForm, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email <span className="text-red-600">*</span>
            </label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="john@example.com"
                value={newContactForm.email}
                onChange={(e) => setNewContactForm({ ...newContactForm, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Phone
            </label>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={newContactForm.phone}
                onChange={(e) => setNewContactForm({ ...newContactForm, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Job Title / Role <span className="text-red-600">*</span>
            </label>
            <Input
              placeholder="VP of Engineering"
              value={newContactForm.role}
              onChange={(e) => setNewContactForm({ ...newContactForm, role: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Department
            </label>
            <Input
              placeholder="Engineering"
              value={newContactForm.department}
              onChange={(e) => setNewContactForm({ ...newContactForm, department: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Influence Level
            </label>
            <select
              value={newContactForm.influenceLevel}
              onChange={(e) => setNewContactForm({ ...newContactForm, influenceLevel: e.target.value as 'high' | 'medium' | 'low' })}
              className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDecisionMaker"
              checked={newContactForm.isDecisionMaker}
              onChange={(e) => setNewContactForm({ ...newContactForm, isDecisionMaker: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="isDecisionMaker" className="text-sm font-medium text-foreground">
              Decision Maker
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowAddContactModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveContact}
              disabled={savingContact || !newContactForm.name || !newContactForm.email || !newContactForm.role}
            >
              {savingContact ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      <DocumentUpload
        isOpen={showDocumentUpload}
        onClose={() => setShowDocumentUpload(false)}
        onUpload={handleDocumentUpload}
      />

      <Modal
        isOpen={showAddOpportunityModal}
        onClose={() => setShowAddOpportunityModal(false)}
        title="Add Growth Opportunity"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <Input
              value={newOpportunityForm.title}
              onChange={(e) => setNewOpportunityForm({ ...newOpportunityForm, title: e.target.value })}
              placeholder="e.g., Mobile App Development"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={newOpportunityForm.description}
              onChange={(e) => setNewOpportunityForm({ ...newOpportunityForm, description: e.target.value })}
              placeholder="Describe the opportunity..."
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddOpportunityModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddManualOpportunity}
              disabled={!newOpportunityForm.title || !newOpportunityForm.description}
            >
              Create Opportunity
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditOpportunityModal}
        onClose={() => {
          setShowEditOpportunityModal(false);
          setEditOpportunityForm(null);
        }}
        title="Edit Growth Opportunity"
      >
        {editOpportunityForm && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input
                value={editOpportunityForm.title}
                onChange={(e) => setEditOpportunityForm({ ...editOpportunityForm, title: e.target.value })}
                placeholder="e.g., Mobile App Development"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={editOpportunityForm.description}
                onChange={(e) => setEditOpportunityForm({ ...editOpportunityForm, description: e.target.value })}
                placeholder="Describe the opportunity..."
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditOpportunityModal(false);
                  setEditOpportunityForm(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateOpportunity}
                disabled={!editOpportunityForm.title || !editOpportunityForm.description}
              >
                <Save className="h-4 w-4 mr-2" />
                Update Opportunity
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {selectedProject && (
        <ProjectDetailPanel
          project={{
            id: selectedProject.id,
            title: selectedProject.name,
            description: selectedProject.description || '',
            status: selectedProject.status,
            budget: selectedProject.budget,
            timeline: selectedProject.timeline,
            dueDate: selectedProject.due_date,
            clientName: client?.company || '',
            createdAt: selectedProject.created_at,
            client_id: selectedProject.client_id || id,
          }}
          isOpen={!!selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdate={handleUpdateProject}
          onDelete={handleDeleteProject}
        />
      )}

      <Modal
        isOpen={showAddProjectModal}
        onClose={() => setShowAddProjectModal(false)}
        title="Add New Project"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Project Name <span className="text-red-600">*</span>
            </label>
            <Input
              placeholder="Enter project name"
              value={newProjectForm.name}
              onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <textarea
              placeholder="Enter project description"
              value={newProjectForm.description}
              onChange={(e) => setNewProjectForm({ ...newProjectForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Status
            </label>
            <select
              value={newProjectForm.status}
              onChange={(e) => setNewProjectForm({ ...newProjectForm, status: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="opportunity_identified">Opportunity Identified</option>
              <option value="discussion">Discussion</option>
              <option value="quote">Quote</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Budget
              </label>
              <Input
                type="number"
                placeholder="0.00"
                value={newProjectForm.budget}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, budget: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Timeline
              </label>
              <Input
                placeholder="e.g., 3 months"
                value={newProjectForm.timeline}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, timeline: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Due Date
            </label>
            <Input
              type="date"
              value={newProjectForm.dueDate}
              onChange={(e) => setNewProjectForm({ ...newProjectForm, dueDate: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowAddProjectModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddProject}
              disabled={savingProject}
              className="flex-1"
            >
              {savingProject ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showPitchModal}
        onClose={() => {
          setShowPitchModal(false);
          setSelectedPitch(null);
        }}
        title={selectedPitch?.title || 'Pitch Details'}
        size="xl"
      >
        {selectedPitch && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Client:</span>
                <span className="ml-2 font-medium">{client?.company}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Variant:</span>
                <span className="ml-2 font-medium">{selectedPitch.variant}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span>
                <span className="ml-2 font-medium">
                  {new Date(selectedPitch.created_at).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Tone:</span>
                <span className="ml-2 font-medium">{selectedPitch.tone}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Badge variant="secondary">{selectedPitch.tone}</Badge>
              <Badge variant="secondary">{selectedPitch.length}</Badge>
            </div>

            <div>
              <span className="text-sm text-muted-foreground">Services:</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {selectedPitch.services?.map((service: string, idx: number) => (
                  <Badge key={idx} variant="outline" size="sm">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="font-semibold mb-3">Pitch Content</h4>
              <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm max-h-96 overflow-y-auto">
                {selectedPitch.content}
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-border">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  const blob = new Blob([selectedPitch.content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `pitch-${selectedPitch.variant}-${new Date(selectedPitch.created_at).toLocaleDateString()}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowPitchModal(false);
                  setSelectedPitch(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
