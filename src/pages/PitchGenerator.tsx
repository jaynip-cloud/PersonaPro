import React, { useState, useEffect } from 'react';
import { PitchBuilderForm } from '../components/pitch/PitchBuilderForm';
import { GeneratedPitchDisplay } from '../components/pitch/GeneratedPitchDisplay';
import { PitchHistory } from '../components/pitch/PitchHistory';
import { GeneratedPitch, PitchGeneratorInput } from '../types';
import { mockClients } from '../data/mockData';
import { generatePitchVariants } from '../utils/pitchGenerator';
import { FileText, History, Sparkles } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const PitchGenerator: React.FC = () => {
  const { user } = useAuth();
  const [generatedPitches, setGeneratedPitches] = useState<GeneratedPitch[]>([]);
  const [savedPitchesCount, setSavedPitchesCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'builder' | 'history'>('builder');
  const [viewingPitch, setViewingPitch] = useState<GeneratedPitch | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSavedPitchesCount();
  }, [user]);

  const loadSavedPitchesCount = async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from('saved_pitches')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setSavedPitchesCount(count || 0);
    } catch (error) {
      console.error('Error loading saved pitches count:', error);
    }
  };

  const handleGenerate = (input: PitchGeneratorInput) => {
    setIsGenerating(true);
    setViewingPitch(null);

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
    if (!user || isSaving) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('saved_pitches')
        .insert({
          project_id: null,
          client_id: pitch.clientId,
          title: `Pitch for ${pitch.clientCompany}`,
          content: `${pitch.elevatorPitch}\n\nValue Points:\n${pitch.valuePoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\nNext Actions:\n${pitch.nextActions.map((a, i) => `${i + 1}. ${a}`).join('\n')}`,
          variant: pitch.variant,
          services: pitch.services,
          tone: pitch.tone,
          length: pitch.length,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setSavedPitchesCount(prev => prev + 1);
      alert('Pitch saved successfully!');
    } catch (error) {
      console.error('Error saving pitch:', error);
      alert('Failed to save pitch');
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewPitch = (pitch: GeneratedPitch) => {
    setViewingPitch(pitch);
    setActiveTab('builder');
  };

  const handleDeletePitch = async (pitchId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('saved_pitches')
        .delete()
        .eq('id', pitchId);

      if (error) throw error;

      setSavedPitchesCount(prev => Math.max(0, prev - 1));
      if (viewingPitch?.id === pitchId) {
        setViewingPitch(null);
      }
    } catch (error) {
      console.error('Error deleting pitch:', error);
    }
  };

  const tabs = [
    { id: 'builder', label: 'Pitch Builder', icon: FileText },
    {
      id: 'history',
      label: 'History',
      icon: History,
      badge: savedPitchesCount > 0 ? savedPitchesCount : undefined
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            Pitch Generator
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered pitch creation using client personas and company insights
          </p>
        </div>
      </div>

      <div className="border-b border-border">
        <div className="flex gap-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-4 pt-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{tab.label}</span>
                {tab.badge && (
                  <Badge variant="primary" className="ml-1">
                    {tab.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <PitchBuilderForm
              clients={mockClients}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
          </div>

          <div className="space-y-6">
            {isGenerating && (
              <div className="p-12 border border-border rounded-lg bg-muted/20 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Generating Your Pitch...
                </h3>
                <p className="text-sm text-muted-foreground">
                  Analyzing client persona and crafting compelling content
                </p>
              </div>
            )}

            {!isGenerating && viewingPitch && (
              <GeneratedPitchDisplay pitch={viewingPitch} onSave={handleSavePitch} />
            )}

            {!isGenerating && !viewingPitch && generatedPitches.length > 0 && (
              <>
                {generatedPitches.map(pitch => (
                  <GeneratedPitchDisplay
                    key={pitch.id}
                    pitch={pitch}
                    onSave={handleSavePitch}
                  />
                ))}
              </>
            )}

            {!isGenerating && !viewingPitch && generatedPitches.length === 0 && (
              <div className="p-12 border border-dashed border-border rounded-lg text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Ready to Generate
                </h3>
                <p className="text-sm text-muted-foreground">
                  Fill out the form and click "Generate Pitch" to create AI-powered pitch content
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <PitchHistory
          onView={handleViewPitch}
          onDelete={handleDeletePitch}
          onPitchesLoad={(count) => setSavedPitchesCount(count)}
        />
      )}
    </div>
  );
};
