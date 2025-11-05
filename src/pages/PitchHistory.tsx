import React, { useState, useEffect } from 'react';
import { History, Sparkles, FileText, Trash2, Eye, Download, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface SavedPitch {
  id: string;
  project_id: string;
  client_id: string;
  title: string;
  content: string;
  variant: string;
  services: string[];
  tone: string;
  length: string;
  created_at: string;
  updated_at: string;
  client?: {
    name: string;
    company: string;
  };
  project?: {
    name: string;
  };
}

export const PitchHistory: React.FC = () => {
  const { user } = useAuth();
  const [pitches, setPitches] = useState<SavedPitch[]>([]);
  const [filteredPitches, setFilteredPitches] = useState<SavedPitch[]>([]);
  const [selectedPitch, setSelectedPitch] = useState<SavedPitch | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPitches();
  }, [user]);

  useEffect(() => {
    filterPitches();
  }, [searchTerm, pitches]);

  const loadPitches = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: pitchData, error } = await supabase
        .from('saved_pitches')
        .select(`
          *,
          client:clients(name, company),
          project:projects(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPitches(pitchData || []);
      setFilteredPitches(pitchData || []);
    } catch (error) {
      console.error('Error loading pitches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterPitches = () => {
    if (!searchTerm.trim()) {
      setFilteredPitches(pitches);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = pitches.filter(pitch =>
      pitch.title.toLowerCase().includes(term) ||
      pitch.content.toLowerCase().includes(term) ||
      pitch.client?.company.toLowerCase().includes(term) ||
      pitch.project?.name.toLowerCase().includes(term) ||
      pitch.services.some(s => s.toLowerCase().includes(term))
    );
    setFilteredPitches(filtered);
  };

  const handleDeletePitch = async (pitchId: string) => {
    if (!confirm('Are you sure you want to delete this pitch?')) return;

    try {
      const { error } = await supabase
        .from('saved_pitches')
        .delete()
        .eq('id', pitchId);

      if (error) throw error;

      setPitches(pitches.filter(p => p.id !== pitchId));
      if (selectedPitch?.id === pitchId) {
        setSelectedPitch(null);
      }
    } catch (error) {
      console.error('Error deleting pitch:', error);
      alert('Failed to delete pitch');
    }
  };

  const handleDownloadPitch = (pitch: SavedPitch) => {
    const content = `${pitch.title}\n\nClient: ${pitch.client?.company}\nProject: ${pitch.project?.name}\nVariant: ${pitch.variant}\nServices: ${pitch.services.join(', ')}\nTone: ${pitch.tone}\nLength: ${pitch.length}\n\n${pitch.content}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pitch-${pitch.variant}-${new Date(pitch.created_at).toLocaleDateString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <History className="h-8 w-8 text-primary" />
            Pitch History
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage all your saved pitches
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Saved Pitches</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pitches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading pitches...</p>
            </div>
          ) : filteredPitches.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchTerm ? 'No pitches found' : 'No saved pitches yet'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try a different search term' : 'Generate and save pitches from your projects to see them here'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPitches.map((pitch) => (
                <div key={pitch.id} className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{pitch.title}</h3>
                        <Badge variant="outline" size="sm">
                          Variant {pitch.variant}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Client: {pitch.client?.company || 'Unknown'}</span>
                        <span>Project: {pitch.project?.name || 'Unknown'}</span>
                        <span>{new Date(pitch.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPitch(pitch)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadPitch(pitch)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePitch(pitch.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
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
                <span className="ml-2 font-medium">{selectedPitch.client?.company}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Project:</span>
                <span className="ml-2 font-medium">{selectedPitch.project?.name}</span>
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
            </div>

            <div className="flex gap-2">
              <Badge variant="secondary">{selectedPitch.tone}</Badge>
              <Badge variant="secondary">{selectedPitch.length}</Badge>
            </div>

            <div>
              <span className="text-sm text-muted-foreground">Services:</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {selectedPitch.services?.map((service, idx) => (
                  <Badge key={idx} variant="outline" size="sm">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="font-semibold mb-3">Pitch Content</h4>
              <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                {selectedPitch.content}
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-border">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleDownloadPitch(selectedPitch)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
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
    </div>
  );
};
