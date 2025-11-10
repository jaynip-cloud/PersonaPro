import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { GeneratedPitch } from '../../types';
import { Clock, Eye, Trash2, Copy, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';

interface PitchHistoryProps {
  onView: (pitch: GeneratedPitch) => void;
  onDelete: (pitchId: string) => void;
  onPitchesLoad?: (count: number) => void;
}

export const PitchHistory: React.FC<PitchHistoryProps> = ({
  onView,
  onDelete,
  onPitchesLoad
}) => {
  const { user } = useAuth();
  const [pitches, setPitches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'formal' | 'casual'>('all');
  const [selectedPitch, setSelectedPitch] = useState<any | null>(null);

  useEffect(() => {
    loadPitches();
  }, [user]);

  const loadPitches = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_pitches')
        .select(`
          *,
          client:clients(id, name, company)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedPitches = (data || []).map(pitch => ({
        id: pitch.id,
        clientId: pitch.client_id,
        clientName: pitch.client?.name || 'Unknown',
        clientCompany: pitch.client?.company || 'Unknown',
        services: pitch.services || [],
        tone: pitch.tone,
        length: pitch.length,
        elevatorPitch: pitch.content.split('\n\n')[0] || pitch.content,
        valuePoints: [],
        nextActions: [],
        confidence: 85,
        evidenceTags: [],
        variant: pitch.variant,
        createdAt: pitch.created_at,
        fullContent: pitch.content,
        title: pitch.title
      }));

      setPitches(transformedPitches);
      if (onPitchesLoad) {
        onPitchesLoad(transformedPitches.length);
      }
    } catch (error) {
      console.error('Error loading pitches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPitches = pitches.filter(pitch => {
    if (filter === 'all') return true;
    return pitch.tone === filter;
  });

  const sortedPitches = [...filteredPitches].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleCopy = (pitch: GeneratedPitch, e: React.MouseEvent) => {
    e.stopPropagation();

    // Support both new format and legacy format
    const isNewFormat = pitch.title && pitch.openingHook;

    let text = '';
    if (isNewFormat) {
      text = `
${pitch.title.toUpperCase()}

OPENING HOOK
${pitch.openingHook}

PROBLEM FRAMING
${pitch.problemFraming}

PROPOSED SOLUTION
${pitch.proposedSolution}

VALUE & OUTCOMES
${pitch.valueOutcomes.map((point, i) => `${i + 1}. ${point}`).join('\n')}

WHY US
${pitch.whyUs}

NEXT STEP CTA
${pitch.nextStepCTA}
      `.trim();
    } else {
      text = `
ELEVATOR PITCH
${pitch.elevatorPitch || ''}

VALUE POINTS
${(pitch.valuePoints || []).map((point, i) => `${i + 1}. ${point}`).join('\n')}

NEXT ACTIONS
${(pitch.nextActions || []).map((action, i) => `${i + 1}. ${action}`).join('\n')}
      `.trim();
    }

    navigator.clipboard.writeText(text);
  };

  const handleExport = (pitch: GeneratedPitch, e: React.MouseEvent) => {
    e.stopPropagation();

    // Support both new format and legacy format
    const isNewFormat = pitch.title && pitch.openingHook;

    let text = '';
    if (isNewFormat) {
      text = `
PITCH FOR ${(pitch.clientCompany || 'Client').toUpperCase()}
Generated: ${new Date(pitch.createdAt).toLocaleString()}

CLIENT: ${pitch.clientName || 'N/A'}
COMPANY: ${pitch.clientCompany || 'N/A'}
SERVICES: ${(pitch.services || []).join(', ')}
TONE: ${pitch.tone.toUpperCase()}

${pitch.title.toUpperCase()}

OPENING HOOK
${pitch.openingHook}

PROBLEM FRAMING
${pitch.problemFraming}

PROPOSED SOLUTION
${pitch.proposedSolution}

VALUE & OUTCOMES
${pitch.valueOutcomes.map((point, i) => `${i + 1}. ${point}`).join('\n')}

WHY US
${pitch.whyUs}

NEXT STEP CTA
${pitch.nextStepCTA}`;
    } else {
      text = `
PITCH FOR ${(pitch.clientCompany || 'Client').toUpperCase()}
Generated: ${new Date(pitch.createdAt).toLocaleString()}

CLIENT: ${pitch.clientName || 'N/A'}
COMPANY: ${pitch.clientCompany || 'N/A'}
SERVICES: ${(pitch.services || []).join(', ')}
TONE: ${pitch.tone.toUpperCase()}

ELEVATOR PITCH
${pitch.elevatorPitch || ''}

VALUE POINTS
${(pitch.valuePoints || []).map((point, i) => `${i + 1}. ${point}`).join('\n')}

SUGGESTED NEXT ACTIONS
${(pitch.nextActions || []).map((action, i) => `${i + 1}. ${action}`).join('\n')}

CONFIDENCE SCORE: ${pitch.confidence || 0}%
EVIDENCE TAGS: ${(pitch.evidenceTags || []).join(', ')}
VARIANT: ${pitch.variant || 'A'}`;
    }

    const blob = new Blob([text.trim()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pitch-${(pitch.clientCompany || 'client').toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (pitchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this pitch?')) {
      await onDelete(pitchId);
      await loadPitches();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading pitches...</p>
        </CardContent>
      </Card>
    );
  }

  if (pitches.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Saved Pitches Yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Generate your first pitch to see it appear in your history
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Pitch History</CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              All ({pitches.length})
            </button>
            <button
              onClick={() => setFilter('formal')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                filter === 'formal'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              Formal
            </button>
            <button
              onClick={() => setFilter('casual')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                filter === 'casual'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              Casual
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedPitches.map(pitch => (
            <div
              key={pitch.id}
              className="p-4 border border-border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-foreground">{pitch.clientCompany}</h4>
                  <p className="text-sm text-muted-foreground">{pitch.clientName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={pitch.tone === 'formal' ? 'default' : 'secondary'}>
                    {pitch.tone}
                  </Badge>
                  <Badge variant="secondary">
                    Variant {pitch.variant}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {pitch.confidence}%
                  </span>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-sm text-foreground line-clamp-2">
                  {pitch.elevatorPitch}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {pitch.services.map((service, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground"
                    >
                      {service}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleCopy(pitch, e)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleExport(pitch, e)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPitch(pitch);
                    }}
                    title="View pitch details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDelete(pitch.id, e)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{new Date(pitch.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Modal
        isOpen={!!selectedPitch}
        onClose={() => setSelectedPitch(null)}
        title={selectedPitch?.title || 'Pitch Details'}
        size="xl"
      >
        {selectedPitch && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Client:</span>
                <span className="ml-2 font-medium">{selectedPitch.clientCompany}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Contact:</span>
                <span className="ml-2 font-medium">{selectedPitch.clientName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Variant:</span>
                <span className="ml-2 font-medium">{selectedPitch.variant}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span>
                <span className="ml-2 font-medium">
                  {new Date(selectedPitch.createdAt).toLocaleDateString()}
                </span>
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
              <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                {selectedPitch.fullContent}
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-border">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleExport(selectedPitch, {} as React.MouseEvent)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  handleCopy(selectedPitch, {} as React.MouseEvent);
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button
                variant="ghost"
                onClick={() => setSelectedPitch(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
};
