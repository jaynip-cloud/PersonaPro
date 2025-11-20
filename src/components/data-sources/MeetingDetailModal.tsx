import { X, Calendar, Clock, Users, Video, MessageSquare, FileText } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';

interface MeetingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: {
    id: string;
    title: string;
    meeting_date?: string;
    start_time?: string;
    duration_minutes?: number;
    participants?: any[];
    meeting_platform?: string;
    summary?: string;
    transcript?: string;
    transcript_text?: string;
    highlights?: any[];
    action_items?: any[];
    topics?: any[];
  } | null;
}

export function MeetingDetailModal({ isOpen, onClose, meeting }: MeetingDetailModalProps) {
  if (!meeting) return null;

  const transcript = meeting.transcript || meeting.transcript_text || '';
  const meetingDate = meeting.meeting_date || meeting.start_time;
  const wordCount = transcript ? transcript.split(/\s+/).length : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="6xl">
      <div className="relative">
        <div className="flex items-start justify-between border-b border-gray-200 pb-4 mb-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{meeting.title}</h2>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {meetingDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={16} />
                  <span>{new Date(meetingDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
              )}

              {meeting.duration_minutes && (
                <div className="flex items-center gap-1.5">
                  <Clock size={16} />
                  <span>{meeting.duration_minutes} min</span>
                </div>
              )}

              {meeting.meeting_platform && (
                <div className="flex items-center gap-1.5">
                  <Video size={16} />
                  <span className="capitalize">{meeting.meeting_platform}</span>
                </div>
              )}

              {meeting.participants && meeting.participants.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Users size={16} />
                  <span>{meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
          {meeting.topics && meeting.topics.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Topics</h3>
              <div className="flex flex-wrap gap-2">
                {meeting.topics.map((topic: any, idx: number) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {typeof topic === 'string' ? topic : topic.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {meeting.summary && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquare size={16} />
                Meeting Summary
              </h3>
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-5 border border-blue-100">
                <MarkdownRenderer content={meeting.summary} />
              </div>
            </div>
          )}

          {meeting.action_items && meeting.action_items.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Action Items</h3>
              <ul className="space-y-2">
                {meeting.action_items.map((item: any, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
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

          {meeting.highlights && meeting.highlights.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Highlights</h3>
              <div className="space-y-2">
                {meeting.highlights.map((highlight: any, idx: number) => (
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

          {meeting.participants && meeting.participants.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Participants</h3>
              <div className="grid grid-cols-2 gap-3">
                {meeting.participants.map((participant: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                      {participant.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{participant.name}</p>
                      {participant.email && (
                        <p className="text-xs text-gray-500">{participant.email}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {transcript && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText size={16} />
                Full Transcript ({wordCount.toLocaleString()} words)
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                  {transcript}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
