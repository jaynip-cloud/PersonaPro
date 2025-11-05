import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { X, Save, Sparkles, Calendar, DollarSign, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PitchBuilderForm } from '../pitch/PitchBuilderForm';
import { GeneratedPitchDisplay } from '../pitch/GeneratedPitchDisplay';
import { mockClients } from '../../data/mockData';
import { generatePitchVariants } from '../../utils/pitchGenerator';
import { GeneratedPitch, PitchGeneratorInput } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Project {
  id: string;
  title: string;
  description: string;
  status: 'opportunity_identified' | 'discussion' | 'quote' | 'win' | 'loss';
  budget?: number;
  timeline?: string;
  dueDate?: string;
  clientName: string;
  createdAt: string;
  client_id?: string;
}

interface ProjectDetailPanelProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedProject: Project) => void;
}

export const ProjectDetailPanel: React.FC<ProjectDetailPanelProps> = ({
  project,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [editedProject, setEditedProject] = useState<Project>(project);
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [generatedPitches, setGeneratedPitches] = useState<GeneratedPitch[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedPitches, setSavedPitches] = useState<any[]>([]);
  const [prefilledClientId, setPrefilledClientId] = useState<string>('');
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    setEditedProject(project);
    if (project.client_id) {
      setPrefilledClientId(project.client_id);
      loadSavedPitches(project.id);
    }
    loadClients();
  }, [project]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('company', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadSavedPitches = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('saved_pitches')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedPitches(data || []);
    } catch (error) {
      console.error('Error loading saved pitches:', error);
    }
  };

  const handleSave = () => {
    onUpdate(editedProject);
  };

  const handleGeneratePitch = () => {
    setShowPitchModal(true);
  };

  const handlePitchGenerate = (input: PitchGeneratorInput) => {
    setIsGenerating(true);

    const simulatedDelay = Math.random() * 2000 + 2000;

    setTimeout(() => {
      const client = mockClients.find(c => c.id === input.clientId);
      if (!client) return;

      const { variantA, variantB } = generatePitchVariants(input, client);
      setGeneratedPitches([variantA, variantB]);
      setIsGenerating(false);
    }, simulatedDelay);
  };

  const handleSavePitch = async (pitch: GeneratedPitch) => {
    if (!user || !project.client_id) return;

    try {
      const { data, error } = await supabase
        .from('saved_pitches')
        .insert({
          project_id: project.id,
          client_id: project.client_id,
          title: `Pitch ${pitch.variant} - ${new Date().toLocaleDateString()}`,
          content: pitch.content,
          variant: pitch.variant,
          services: pitch.metadata.services,
          tone: pitch.metadata.tone,
          length: pitch.metadata.length,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setSavedPitches([data, ...savedPitches]);
      alert('Pitch saved successfully!');
    } catch (error: any) {
      console.error('Error saving pitch:', error);
      alert(`Failed to save pitch: ${error?.message || 'Unknown error'}`);
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'opportunity_identified':
        return 'secondary';
      case 'discussion':
        return 'primary';
      case 'quote':
        return 'warning';
      case 'win':
        return 'success';
      case 'loss':
        return 'error';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: Project['status']) => {
    switch (status) {
      case 'opportunity_identified':
        return 'Opportunity Identified';
      case 'discussion':
        return 'Discussion';
      case 'quote':
        return 'Quote';
      case 'win':
        return 'Win';
      case 'loss':
        return 'Loss';
      default:
        return status;
    }
  };

  const getProgressPercentage = (status: Project['status']) => {
    switch (status) {
      case 'opportunity_identified':
        return 20;
      case 'discussion':
        return 40;
      case 'quote':
        return 60;
      case 'win':
        return 100;
      case 'loss':
        return 0;
      default:
        return 0;
    }
  };

  const getProgressColor = (status: Project['status']) => {
    if (status === 'loss') return 'bg-red-500';
    if (status === 'win') return 'bg-green-500';
    return 'bg-blue-500';
  };

  if (!isOpen) return null;

  const progress = getProgressPercentage(editedProject.status);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-background shadow-xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-border p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Project Details</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Progress</label>
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(editedProject.status)}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {progress}% Complete
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <Input
              value={editedProject.title}
              onChange={(e) => setEditedProject({ ...editedProject, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={editedProject.description}
              onChange={(e) => setEditedProject({ ...editedProject, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Client</label>
            <p className="text-foreground">{project.clientName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={editedProject.status}
              onChange={(e) => setEditedProject({ ...editedProject, status: e.target.value as Project['status'] })}
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
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Budget
              </label>
              <Input
                type="number"
                value={editedProject.budget || ''}
                onChange={(e) => setEditedProject({ ...editedProject, budget: parseFloat(e.target.value) || undefined })}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </label>
              <Input
                value={editedProject.timeline || ''}
                onChange={(e) => setEditedProject({ ...editedProject, timeline: e.target.value })}
                placeholder="e.g., 3 months"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Due Date
            </label>
            <Input
              type="date"
              value={editedProject.dueDate || ''}
              onChange={(e) => setEditedProject({ ...editedProject, dueDate: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button variant="primary" className="flex-1" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleGeneratePitch}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Pitch
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Created {new Date(project.createdAt).toLocaleString()}
          </div>

          {savedPitches.length > 0 && (
            <div className="pt-6 border-t border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Saved Pitches</h3>
              <div className="space-y-3">
                {savedPitches.map((pitch) => (
                  <div key={pitch.id} className="p-4 border border-border rounded-lg bg-muted/30">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-foreground">{pitch.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(pitch.created_at).toLocaleString()} • Variant {pitch.variant}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" size="sm">{pitch.tone}</Badge>
                        <Badge variant="outline" size="sm">{pitch.length}</Badge>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      Services: {pitch.services?.join(', ') || 'None'}
                    </div>
                    <details className="text-sm">
                      <summary className="cursor-pointer text-primary hover:underline">
                        View full pitch
                      </summary>
                      <div className="mt-2 p-3 bg-background rounded border border-border whitespace-pre-wrap">
                        {pitch.content}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showPitchModal}
        onClose={() => {
          setShowPitchModal(false);
          setGeneratedPitches([]);
        }}
        title="Generate Pitch"
        size="xl"
      >
        <div className="space-y-6">
          <PitchBuilderForm
            clients={clients}
            onGenerate={handlePitchGenerate}
            isGenerating={isGenerating}
            initialClientId={prefilledClientId}
          />

          {generatedPitches.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Generated Pitches</h3>
              {generatedPitches.map((pitch) => (
                <GeneratedPitchDisplay
                  key={pitch.id}
                  pitch={pitch}
                  onSave={handleSavePitch}
                />
              ))}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};
