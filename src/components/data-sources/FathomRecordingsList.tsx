import { useState, useEffect } from 'react';
import { Video, Clock, Users, Calendar, TrendingUp, ExternalLink, Trash2, RefreshCw, Search, Eye, MessageSquare, Zap } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { regenerateFathomEmbeddings } from '../../utils/regenerateEmbeddings';

interface FathomRecordingsListProps {
  clientId: string;
  onRefresh?: () => void;
}

interface FathomRecording {
  id: string;
  recording_id: string;
  title: string;
  meeting_url: string;
  playback_url: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  meeting_platform: string;
  host_name: string;
  host_email: string;
  participants: any[];
  team_name: string;
  meeting_type: string;
  transcript: string;
  summary: string;
  highlights: any[];
  action_items: any[];
  topics: any[];
  embeddings_generated: boolean;
  created_at: string;
}

export function FathomRecordingsList({ clientId, onRefresh }: FathomRecordingsListProps) {
  const [recordings, setRecordings] = useState<FathomRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState<FathomRecording | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript'>('summary');

  useEffect(() => {
    loadRecordings();
  }, [clientId]);

  const loadRecordings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fathom_recordings')
        .select('*')
        .eq('client_id', clientId)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setRecordings(data || []);
    } catch (error) {
      console.error('Error loading Fathom recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (recordingId: string) => {
    if (!confirm('Are you sure you want to delete this recording? This action cannot be undone.')) {
      return;
    }

    setDeleting(recordingId);
    try {
      const { error } = await supabase
        .from('fathom_recordings')
        .delete()
        .eq('id', recordingId);

      if (error) throw error;

      setRecordings(prev => prev.filter(r => r.id !== recordingId));
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error deleting recording:', error);
      alert('Failed to delete recording');
    } finally {
      setDeleting(null);
    }
  };

  const handleRegenerateEmbeddings = async (recordingId: string, recordingTitle: string) => {
    if (!confirm(`Regenerate embeddings for "${recordingTitle}"?\n\nThis will recreate vector embeddings with improved chunking for better search results.`)) {
      return;
    }

    setRegenerating(recordingId);
    try {
      const result = await regenerateFathomEmbeddings(recordingId, true);

      if (result.success) {
        alert(`Successfully generated ${result.embeddings_created} embeddings in ${result.chunks_total} chunks!`);
        // Refresh the recordings list
        await loadRecordings();
        if (onRefresh) onRefresh();
      } else {
        alert(`Failed to regenerate embeddings: ${result.error}`);
      }
    } catch (error) {
      console.error('Error regenerating embeddings:', error);
      alert('Failed to regenerate embeddings');
    } finally {
      setRegenerating(null);
    }
  };

  const filteredRecordings = recordings.filter(recording => {
    const matchesSearch = !searchQuery ||
      recording.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recording.transcript?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recording.summary?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin text-gray-400" size={24} />
        <span className="ml-2 text-gray-600">Loading recordings...</span>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="text-center py-12">
        <Video className="mx-auto text-gray-400" size={48} />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No Fathom recordings</h3>
        <p className="mt-2 text-sm text-gray-500">
          Sync your first Fathom recording to get started with meeting intelligence
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recordings, transcripts, summaries..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="text-sm text-gray-600">
        Showing {filteredRecordings.length} of {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
      </div>

      <div className="space-y-3">
        {filteredRecordings.map((recording) => {
          const wordCount = recording.transcript ? recording.transcript.split(/\s+/).length : 0;

          return (
            <Card key={recording.id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Video className="text-purple-600 flex-shrink-0" size={20} />
                      <h3 className="text-lg font-semibold text-gray-900">{recording.title}</h3>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{new Date(recording.start_time).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{recording.duration_minutes} min</span>
                      </div>

                      {recording.meeting_platform && (
                        <div className="flex items-center gap-1">
                          <Video size={14} />
                          <span className="capitalize">{recording.meeting_platform}</span>
                        </div>
                      )}

                      {recording.participants && recording.participants.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users size={14} />
                          <span>{recording.participants.length} participant{recording.participants.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}

                      {recording.team_name && (
                        <Badge variant="primary" className="text-xs">
                          {recording.team_name}
                        </Badge>
                      )}

                      {recording.meeting_type && (
                        <Badge variant="secondary" className="text-xs">
                          {recording.meeting_type}
                        </Badge>
                      )}
                    </div>

                    {recording.summary && (
                      <div className="text-sm text-gray-700 line-clamp-2 mb-3">
                        {recording.summary.length > 200
                          ? `${recording.summary.substring(0, 200)}...`
                          : recording.summary}
                      </div>
                    )}

                    {recording.topics && recording.topics.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {recording.topics.slice(0, 5).map((topic: any, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                          >
                            {typeof topic === 'string' ? topic : topic.name}
                          </span>
                        ))}
                        {recording.topics.length > 5 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{recording.topics.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {recording.playback_url && (
                      <a
                        href={recording.playback_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Open in Fathom"
                      >
                        <ExternalLink size={18} />
                      </a>
                    )}

                    <button
                      onClick={() => setSelectedRecording(recording)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="View details"
                    >
                      <Eye size={18} />
                    </button>

                    <button
                      onClick={() => handleRegenerateEmbeddings(recording.id, recording.title)}
                      disabled={regenerating === recording.id}
                      className={`p-2 rounded transition-colors disabled:opacity-50 ${
                        !recording.embeddings_generated
                          ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                          : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                      }`}
                      title={recording.embeddings_generated ? 'Regenerate embeddings' : 'Generate embeddings (not yet created)'}
                    >
                      {regenerating === recording.id ? (
                        <RefreshCw className="animate-spin" size={18} />
                      ) : (
                        <Zap size={18} />
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(recording.id)}
                      disabled={deleting === recording.id}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      title="Delete recording"
                    >
                      {deleting === recording.id ? (
                        <RefreshCw className="animate-spin" size={18} />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {selectedRecording && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedRecording(null);
            setActiveTab('summary');
          }}
          title={selectedRecording.title}
          size="medium"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 text-sm text-gray-600 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{new Date(selectedRecording.start_time).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{selectedRecording.duration_minutes} min</span>
              </div>

              {selectedRecording.meeting_platform && (
                <div className="flex items-center gap-1">
                  <Video size={14} />
                  <span className="capitalize">{selectedRecording.meeting_platform}</span>
                </div>
              )}

              {selectedRecording.participants && selectedRecording.participants.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users size={14} />
                  <span>{selectedRecording.participants.length} participant{selectedRecording.participants.length !== 1 ? 's' : ''}</span>
                </div>
              )}

              {selectedRecording.team_name && (
                <Badge variant="primary" className="text-xs">
                  {selectedRecording.team_name}
                </Badge>
              )}

              {selectedRecording.meeting_type && (
                <Badge variant="secondary" className="text-xs">
                  {selectedRecording.meeting_type}
                </Badge>
              )}
            </div>

            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('summary')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'summary'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Summary & Insights
              </button>
              <button
                onClick={() => setActiveTab('transcript')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'transcript'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Full Transcript
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {activeTab === 'summary' ? (
                <div className="space-y-4">
                  {selectedRecording.summary && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <MessageSquare size={16} />
                        Meeting Summary
                      </h4>
                      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
                        <MarkdownRenderer content={selectedRecording.summary} />
                      </div>
                    </div>
                  )}

                  {selectedRecording.action_items && selectedRecording.action_items.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Action Items</h4>
                      <ul className="space-y-2">
                        {selectedRecording.action_items.map((item: any, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-sm bg-white p-3 rounded-lg border border-gray-200">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                            <div>
                              <p className="text-gray-700">{item.text}</p>
                              {item.assignee && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Assigned to: {item.assignee}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedRecording.highlights && selectedRecording.highlights.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Highlights</h4>
                      <div className="space-y-2">
                        {selectedRecording.highlights.map((highlight: any, idx: number) => (
                          <div key={idx} className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                            <p className="text-sm text-gray-700">{highlight.text}</p>
                            {highlight.speaker && (
                              <p className="text-xs text-gray-500 mt-1">
                                {highlight.speaker}
                                {highlight.timestamp && ` • ${Math.floor(highlight.timestamp / 60)}:${String(highlight.timestamp % 60).padStart(2, '0')}`}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedRecording.topics && selectedRecording.topics.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Topics</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedRecording.topics.map((topic: any, idx: number) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                          >
                            {typeof topic === 'string' ? topic : topic.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedRecording.participants && selectedRecording.participants.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Participants</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedRecording.participants.map((participant: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-sm bg-white p-2 rounded-lg border border-gray-200">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-medium text-white">
                              {participant.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div className="overflow-hidden">
                              <p className="font-medium text-gray-900 truncate">{participant.name}</p>
                              {participant.email && (
                                <p className="text-xs text-gray-500 truncate">{participant.email}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {selectedRecording.transcript ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <MessageSquare size={16} />
                          Full Transcript
                        </h4>
                        <span className="text-xs text-gray-500 font-medium">
                          {selectedRecording.transcript.split(/\s+/).length.toLocaleString()} words
                        </span>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
                        <MarkdownRenderer content={selectedRecording.transcript} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No transcript available
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-xs text-gray-500">
              <div>
                Synced {new Date(selectedRecording.created_at).toLocaleDateString()}
              </div>
              <div>
                Recording ID: {selectedRecording.recording_id}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
