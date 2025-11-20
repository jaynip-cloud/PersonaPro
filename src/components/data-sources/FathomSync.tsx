import { useState } from 'react';
import { RefreshCw, FolderOpen, Settings, Link2, Calendar, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';

interface FathomSyncProps {
  clientId: string;
  onSyncComplete?: () => void;
}

const TEAM_OPTIONS = [
  { value: 'customer_success', label: 'Customer Success' },
  { value: 'executive', label: 'Executive' },
  { value: 'sales', label: 'Sales' },
];

const MEETING_TYPE_OPTIONS = [
  { value: 'client_engagement', label: 'Client Engagement' },
  { value: 'sales_initial_call', label: 'Sales Initial Call' },
  { value: 'client_call', label: 'Client Call' },
];

export function FathomSync({ clientId, onSyncComplete }: FathomSyncProps) {
  const [folderLink, setFolderLink] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [teamFilters, setTeamFilters] = useState<string[]>([]);
  const [meetingTypeFilters, setMeetingTypeFilters] = useState<string[]>([]);
  const [createdAfter, setCreatedAfter] = useState('');
  const [createdBefore, setCreatedBefore] = useState('');
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    count: number;
    message?: string;
    source?: string;
  } | null>(null);

  const handleSync = async () => {
    if (!folderLink.trim()) {
      alert('Please enter a Fathom folder or recording link');
      return;
    }

    setSyncing(true);
    setSyncResult(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-fathom-recordings`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          folder_link: folderLink,
          team_filter: teamFilters.length > 0 ? teamFilters : undefined,
          meeting_type_filter: meetingTypeFilters.length > 0 ? meetingTypeFilters : undefined,
          created_after: createdAfter || undefined,
          created_before: createdBefore || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync Fathom recordings');
      }

      // Show detailed message with diagnostics
      let message = '';

      if (result.recordings_synced > 0) {
        message = `✓ Successfully synced ${result.recordings_synced} recording${result.recordings_synced > 1 ? 's' : ''} from Fathom`;
        if (result.skipped && result.skipped.length > 0) {
          message += `\n${result.skipped.length} recording${result.skipped.length > 1 ? 's' : ''} skipped (already synced or filtered)`;
        }
      } else {
        // 0 recordings synced - provide diagnostic info
        message = result.message || '⚠️ No recordings synced';

        if (result.skipped && result.skipped.length > 0) {
          message += '\n\nDiagnostics:';

          // Count reasons
          const reasons: { [key: string]: number } = {};
          result.skipped.forEach((skip: any) => {
            reasons[skip.reason] = (reasons[skip.reason] || 0) + 1;
          });

          // Show breakdown
          if (reasons.already_synced) {
            message += `\n• ${reasons.already_synced} already synced (duplicates prevented)`;
          }
          if (reasons.no_transcript) {
            message += `\n• ${reasons.no_transcript} missing transcript (may still be processing in Fathom)`;
          }
          if (reasons.team_filter) {
            message += `\n• ${reasons.team_filter} filtered out by team filter`;
          }
          if (reasons.meeting_type_filter) {
            message += `\n• ${reasons.meeting_type_filter} filtered out by meeting type`;
          }

          // Add suggestions
          if (reasons.already_synced && !reasons.no_transcript && !reasons.team_filter && !reasons.meeting_type_filter) {
            message += '\n\n💡 All recordings were already synced. Click "View" to see them.';
          } else if (reasons.no_transcript) {
            message += '\n\n💡 Wait a few minutes for Fathom to process transcripts, then try again.';
          } else if (reasons.team_filter || reasons.meeting_type_filter) {
            message += '\n\n💡 Try removing filters (⚙️ icon) to sync all recordings.';
          }
        }
      }

      if (result.errors && result.errors.length > 0) {
        message += `\n\n⚠️ ${result.errors.length} error${result.errors.length > 1 ? 's' : ''} occurred`;

        // Show first error for debugging
        if (result.errors[0]) {
          const firstError = result.errors[0];
          message += `\n\nFirst error: ${firstError.error}`;
          if (firstError.recording_id) {
            message += `\n(Recording ID: ${firstError.recording_id})`;
          }
        }

        message += '\n\n💡 Check browser console (F12) for full details.';
        console.error('Sync errors:', result.errors);
      }

      setSyncResult({
        success: true,
        count: result.recordings_synced || 0,
        message: message,
      });

      // Clear input on success
      setFolderLink('');

      // Notify parent component
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      console.error('Error syncing Fathom recordings:', error);
      setSyncResult({
        success: false,
        count: 0,
        message: error instanceof Error ? error.message : 'Failed to sync recordings',
      });
    } finally {
      setSyncing(false);
    }
  };

  const toggleTeamFilter = (team: string) => {
    setTeamFilters(prev =>
      prev.includes(team)
        ? prev.filter(t => t !== team)
        : [...prev, team]
    );
  };

  const toggleMeetingTypeFilter = (type: string) => {
    setMeetingTypeFilters(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Link2 size={16} />
            Fathom Link
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FolderOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                value={folderLink}
                onChange={(e) => setFolderLink(e.target.value)}
                placeholder="https://fathom.video/share/... or /folders/... or /recordings/..."
                disabled={syncing}
                className="pl-10"
              />
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              disabled={syncing}
              title="Configure filters"
            >
              <Settings size={18} />
            </Button>
          </div>
          <div className="flex items-start gap-1 mt-1">
            <Info size={12} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600">
              Share links use exact API matching • Folder links sync all recordings • Supports date filters
            </p>
          </div>
        </div>

        <Button
          onClick={handleSync}
          disabled={syncing || !folderLink.trim()}
          className="mt-7"
        >
          {syncing ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw size={18} />
              Sync
            </>
          )}
        </Button>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Team
            </label>
            <div className="flex flex-wrap gap-2">
              {TEAM_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => toggleTeamFilter(option.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    teamFilters.includes(option.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {teamFilters.length === 0
                ? 'No filter - will sync all teams'
                : `Syncing only: ${teamFilters.join(', ')}`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Meeting Type
            </label>
            <div className="flex flex-wrap gap-2">
              {MEETING_TYPE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => toggleMeetingTypeFilter(option.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    meetingTypeFilters.includes(option.value)
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {meetingTypeFilters.length === 0
                ? 'No filter - will sync all meeting types'
                : `Syncing only: ${meetingTypeFilters.join(', ')}`}
            </p>
          </div>

          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Calendar size={14} />
              {showAdvanced ? 'Hide' : 'Show'} Date Range Filters
            </button>

            {showAdvanced && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Created After
                  </label>
                  <Input
                    type="date"
                    value={createdAfter}
                    onChange={(e) => setCreatedAfter(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Created Before
                  </label>
                  <Input
                    type="date"
                    value={createdBefore}
                    onChange={(e) => setCreatedBefore(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div
          className={`p-4 rounded-lg ${
            syncResult.success && syncResult.count > 0
              ? 'bg-green-50 border border-green-200'
              : syncResult.success && syncResult.count === 0
              ? 'bg-yellow-50 border border-yellow-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className="whitespace-pre-wrap">
            <p
              className={`text-sm font-medium ${
                syncResult.success && syncResult.count > 0 ? 'text-green-800' :
                syncResult.success && syncResult.count === 0 ? 'text-yellow-800' :
                'text-red-800'
              }`}
            >
              {syncResult.message || (syncResult.success ?
                `✓ Successfully synced ${syncResult.count} recording${syncResult.count !== 1 ? 's' : ''} from Fathom` :
                '✗ Sync failed'
              )}
            </p>
            {syncResult.success && syncResult.count > 0 && (
              <p className="text-xs text-green-600 mt-2">
                Embeddings are being generated in the background for semantic search and AI insights.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800 font-medium mb-1 flex items-center gap-2">
          <Info size={16} />
          How it works:
        </p>
        <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
          <li><strong>Share links:</strong> Exact API matching finds specific recordings instantly</li>
          <li><strong>Folder links:</strong> API-first approach syncs all recordings in folder</li>
          <li><strong>Smart filtering:</strong> Team, meeting type, and date range filters</li>
          <li><strong>Conditional fetching:</strong> Only calls endpoints when data is missing</li>
          <li><strong>Auto-processing:</strong> Transcripts chunked and vectorized for semantic search</li>
          <li><strong>AI insights:</strong> Embeddings power intelligent pitch generation and analysis</li>
        </ul>
      </div>
    </div>
  );
}
