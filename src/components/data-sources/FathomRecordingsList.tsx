import { useState, useEffect } from 'react';
import { Video, Clock, Users, Calendar, TrendingUp, ExternalLink, Trash2, RefreshCw, Search, Filter, ChevronDown, ChevronUp, MessageSquare, Eye } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';
import { MeetingDetailModal } from './MeetingDetailModal';
import { supabase } from '../../lib/supabase';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<FathomRecording | null>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

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
    <>
      <MeetingDetailModal
        isOpen={showMeetingModal}
        onClose={() => {
          setShowMeetingModal(false);
          setSelectedMeeting(null);
        }}
        meeting={selectedMeeting}
      />

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
          return (
            <Card key={recording.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Video className="text-purple-600 flex-shrink-0" size={20} />
                      <h3 className="text-lg font-semibold text-gray-900">{recording.title}</h3>
                      {recording.embeddings_generated && (
                        <Badge variant="success" className="text-xs">
                          AI Ready
                        </Badge>
                      )}
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
                      onClick={() => {
                        setSelectedMeeting(recording);
                        setShowMeetingModal(true);
                      }}
                      className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                      title="View meeting details"
                    >
                      <Eye size={18} />
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
      </div>
    </>
  );
}
