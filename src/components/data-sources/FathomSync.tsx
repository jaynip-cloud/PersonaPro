import { useState } from 'react';
import { RefreshCw, Link2, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';

interface FathomSyncProps {
  clientId: string;
  onSyncComplete?: () => void;
}

export function FathomSync({ clientId, onSyncComplete }: FathomSyncProps) {
  const [folderLink, setFolderLink] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    count: number;
    message?: string;
    source?: string;
  } | null>(null);

  const handleSync = async () => {
    if (!folderLink.trim()) {
      alert('Please enter a Fathom meeting link');
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

          // Add suggestions
          if (reasons.already_synced && !reasons.no_transcript) {
            message += '\n\n💡 This recording was already synced. Click "View" to see it.';
          } else if (reasons.no_transcript) {
            message += '\n\n💡 Wait a few minutes for Fathom to process the transcript, then try again.';
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

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Link2 size={16} />
            Fathom Meeting Link
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={folderLink}
              onChange={(e) => setFolderLink(e.target.value)}
              placeholder="Paste Fathom meeting link (e.g., https://fathom.video/share/...)"
              disabled={syncing}
            />
          </div>
          <div className="flex items-start gap-1 mt-1">
            <Info size={12} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600">
              Paste individual Fathom meeting URLs to sync recordings and transcripts
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

    </div>
  );
}
