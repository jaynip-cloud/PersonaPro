import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CHUNK_SIZE = 6;
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 500;
const MEETINGS_API_LIMIT = 100;
const MAX_CONSECUTIVE_FAILURES = 5;

interface SyncRequest {
  client_id: string;
  folder_link?: string;
  recording_ids?: string[];
  team_filter?: string[];
  meeting_type_filter?: string[];
  created_after?: string;
  created_before?: string;
}

interface MeetingItem {
  recording_id?: string;
  id?: string;
  share_url?: string;
  url?: string;
  folder_id?: string;
  title?: string;
  meeting_title?: string;
  default_summary?: any;
  transcript?: any;
  recording_start_time?: string;
  start_time?: string;
  recording_end_time?: string;
  end_time?: string;
  platform?: string;
  host?: { name?: string; email?: string };
  team?: string;
  meeting_type?: string;
  [key: string]: any;
}

interface RecordingData {
  recording_id: string;
  source: 'meetings_api' | 'recordings_api';
  meeting?: MeetingItem;
  transcript?: any;
  summary?: any;
  highlights?: any;
  actions?: any;
  participants?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: apiKeys, error: keysError } = await supabaseClient
      .from('api_keys')
      .select('fathom_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (keysError || !apiKeys?.fathom_api_key) {
      return new Response(
        JSON.stringify({ error: 'Fathom API key not configured. Please add it in Settings.' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: SyncRequest = await req.json();
    const { client_id, folder_link, recording_ids, team_filter, meeting_type_filter, created_after, created_before } = body;

    if (!client_id) {
      throw new Error('client_id is required');
    }

    console.log('═══════════════════════════════════════');
    console.log('Fathom Sync Started');
    console.log('Client ID:', client_id);
    console.log('Input URL:', folder_link);
    console.log('Recording IDs:', recording_ids);
    console.log('Filters:', { team_filter, meeting_type_filter, created_after, created_before });
    console.log('═══════════════════════════════════════');

    let recordingsToProcess: RecordingData[] = [];

    if (folder_link) {
      const exactUrl = folder_link.trim();

      if (isShareOrCallUrl(exactUrl)) {
        console.log('📍 Detected single share/call URL, using exact match lookup');
        const matchedRecording = await findMeetingByExactUrl(exactUrl, apiKeys.fathom_api_key, { created_after, created_before });

        if (matchedRecording) {
          console.log(`✓ Found exact match: recording_id=${matchedRecording.recording_id}, source=${matchedRecording.source}`);
          recordingsToProcess = [matchedRecording];
        } else {
          console.warn('⚠ No exact match found for URL:', exactUrl);
          return new Response(
            JSON.stringify({
              success: true,
              message: `No recording found matching URL: ${exactUrl}. The recording may be private or not yet available.`,
              recordings_synced: 0,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else if (isFolderUrl(exactUrl)) {
        console.log('📁 Detected folder URL, using API-first lookup with scraping fallback');
        const folderId = extractFolderId(exactUrl);

        if (folderId) {
          recordingsToProcess = await findRecordingsInFolder(
            folderId,
            apiKeys.fathom_api_key,
            { created_after, created_before, team_filter, meeting_type_filter }
          );
          console.log(`✓ Found ${recordingsToProcess.length} recordings in folder ${folderId}`);
        } else {
          throw new Error('Invalid folder URL format');
        }
      } else {
        throw new Error('Invalid URL format. Provide a share link, call link, or folder link.');
      }
    } else if (recording_ids && recording_ids.length > 0) {
      console.log(`📋 Processing ${recording_ids.length} specific recording IDs`);
      recordingsToProcess = await fetchRecordingsByIds(recording_ids, apiKeys.fathom_api_key);
    } else {
      throw new Error('Either folder_link or recording_ids must be provided');
    }

    if (recordingsToProcess.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No recordings found to sync.',
          recordings_synced: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`\n📦 Total recordings to process: ${recordingsToProcess.length}`);

    const processedRecordings = [];
    const skippedRecordings = [];
    const errors = [];

    for (const recData of recordingsToProcess) {
      try {
        const recordingId = recData.recording_id;
        console.log(`\n→ Processing recording ${recordingId} (source: ${recData.source})...`);

        const { data: existingRecording } = await supabaseClient
          .from('fathom_recordings')
          .select('id, title')
          .eq('recording_id', recordingId)
          .maybeSingle();

        if (existingRecording) {
          console.log(`  ⊚ Already synced: "${existingRecording.title}"`);
          skippedRecordings.push({ id: recordingId, title: existingRecording.title, reason: 'already_synced' });
          continue;
        }

        const recording = recData.meeting || {};
        let transcript = recData.transcript;
        let summary = recData.summary;
        const highlights = recData.highlights;
        const actions = recData.actions;
        const participantsData = recData.participants;

        const teamName = recording?.team || null;
        const meetingType = recording?.meeting_type || null;

        if (team_filter && team_filter.length > 0 && teamName && !team_filter.includes(teamName)) {
          console.log(`  ⊚ Filtered by team: ${teamName}`);
          skippedRecordings.push({ id: recordingId, title: recording?.title, reason: 'team_filter', team: teamName });
          continue;
        }

        if (meeting_type_filter && meeting_type_filter.length > 0 && meetingType && !meeting_type_filter.includes(meetingType)) {
          console.log(`  ⊚ Filtered by meeting type: ${meetingType}`);
          skippedRecordings.push({ id: recordingId, title: recording?.title, reason: 'meeting_type_filter', meeting_type: meetingType });
          continue;
        }

        let fullTranscript = '';
        if (transcript) {
          if (typeof transcript === 'string') {
            fullTranscript = transcript;
          } else if (transcript.segments && Array.isArray(transcript.segments)) {
            fullTranscript = transcript.segments
              .map((seg: any) => `${seg.speaker || 'Unknown'}: ${seg.text}`)
              .join('\n\n');
          } else if (transcript.text) {
            fullTranscript = transcript.text;
          }
        }

        fullTranscript = cleanTranscript(fullTranscript);

        if (!fullTranscript) {
          console.log(`  ⊚ No transcript available`);
          skippedRecordings.push({ id: recordingId, title: recording?.title || 'Unknown', reason: 'no_transcript' });
          continue;
        }

        const startTime = recording?.recording_start_time || recording?.start_time || recording?.scheduled_start_time;
        const endTime = recording?.recording_end_time || recording?.end_time || recording?.scheduled_end_time;
        const durationMinutes = startTime && endTime ? Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000) : 0;

        const participants = (participantsData || []).map((p: any) => ({
          name: p.name || '',
          email: p.email || '',
          role: p.role || '',
        }));

        const actionItems = (actions || []).map((item: any) => ({
          text: item.text || '',
          assignee: item.assignee || '',
          due_date: item.due_date || null,
          timestamp: item.timestamp || 0,
          completed: false,
        }));

        const highlightsList = (highlights || []).map((h: any) => ({
          text: h.text || '',
          timestamp: h.timestamp || 0,
          speaker: h.speaker || '',
          tag: h.tag || '',
          selected_by: h.selected_by || '',
        }));

        const summaryText = typeof summary === 'string' ? summary : (summary?.summary_text || summary?.text || '');
        const summarySections = summary?.summary_sections || summary?.sections || [];
        const topics = (summary?.topics || []).map((t: any) => ({
          name: typeof t === 'string' ? t : t.name || t.topic || '',
          confidence: typeof t === 'object' ? t.confidence : null,
        }));

        const { data: insertedRecording, error: insertError } = await supabaseClient
          .from('fathom_recordings')
          .insert({
            user_id: user.id,
            client_id: client_id,
            recording_id: recordingId,
            folder_id: recording?.folder_id || null,
            title: recording?.title || recording?.meeting_title || 'Untitled Meeting',
            meeting_url: recording?.url || recording?.meeting_url || '',
            playback_url: recording?.share_url || recording?.playback_url || '',
            start_time: startTime,
            end_time: endTime,
            duration_minutes: durationMinutes,
            meeting_platform: recording?.platform || '',
            host_name: recording?.host?.name || '',
            host_email: recording?.host?.email || '',
            participants: participants,
            team_name: teamName,
            meeting_type: meetingType,
            transcript: fullTranscript,
            transcript_language: transcript?.language || recording?.transcript_language || 'en',
            summary: summaryText,
            summary_sections: summarySections,
            highlights: highlightsList,
            action_items: actionItems,
            decisions: [],
            topics: topics,
            sentiment_score: null,
            tone_tags: [],
            raw_response: recording || {},
            embeddings_generated: false,
            insights_processed: false,
          })
          .select()
          .single();

        if (insertError) {
          console.error(`  ✗ Insert error:`, insertError.message);
          errors.push({ recording_id: recordingId, error: insertError.message });
          continue;
        }

        console.log(`  ✓ Synced: "${insertedRecording.title}"`);
        processedRecordings.push(insertedRecording);

        fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-fathom-embeddings`,
          {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              recording_id: insertedRecording.id,
            }),
          }
        ).catch(err => console.error('Error triggering embeddings:', err));

      } catch (error) {
        console.error(`  ✗ Processing error:`, error instanceof Error ? error.message : error);
        errors.push({ recording_id: recData.recording_id, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log(`✅ Sync Complete`);
    console.log(`   Synced: ${processedRecordings.length}`);
    console.log(`   Skipped: ${skippedRecordings.length}`);
    console.log(`   Errors: ${errors.length}`);
    console.log('═══════════════════════════════════════\n');

    let message = '';
    if (processedRecordings.length === 0 && skippedRecordings.length > 0) {
      const skipReasons = skippedRecordings.reduce((acc: any, r: any) => {
        acc[r.reason] = (acc[r.reason] || 0) + 1;
        return acc;
      }, {});

      const reasonText = Object.entries(skipReasons)
        .map(([reason, count]) => {
          if (reason === 'already_synced') return `${count} already synced`;
          if (reason === 'no_transcript') return `${count} missing transcript`;
          if (reason === 'team_filter') return `${count} filtered by team`;
          if (reason === 'meeting_type_filter') return `${count} filtered by type`;
          return `${count} ${reason}`;
        })
        .join(', ');

      message = `No new recordings synced. ${recordingsToProcess.length} found: ${reasonText}.`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        recordings_synced: processedRecordings.length,
        recordings: processedRecordings.map(r => ({ id: r.id, title: r.title })),
        skipped: skippedRecordings,
        total_found: recordingsToProcess.length,
        message: message || undefined,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('✗ Fatal error in sync-fathom-recordings:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function isShareOrCallUrl(url: string): boolean {
  return /\/(share|calls|recordings)\/[A-Za-z0-9_-]+/.test(url);
}

function isFolderUrl(url: string): boolean {
  return /\/folders\/[A-Za-z0-9_-]+/.test(url);
}

function extractFolderId(url: string): string | null {
  const match = url.match(/\/folders\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

async function findMeetingByExactUrl(
  inputUrl: string,
  apiKey: string,
  filters: { created_after?: string; created_before?: string }
): Promise<RecordingData | null> {
  console.log('  → Searching for exact URL match via meetings API...');

  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const apiUrl = new URL('https://api.fathom.ai/external/v1/meetings');
      apiUrl.searchParams.set('limit', String(MEETINGS_API_LIMIT));
      apiUrl.searchParams.set('page', String(page));

      if (filters.created_after) apiUrl.searchParams.set('created_after', filters.created_after);
      if (filters.created_before) apiUrl.searchParams.set('created_before', filters.created_before);

      const response = await fetchWithRetry(apiUrl.toString(), apiKey, 'meetings list');

      if (!response) {
        console.error('  ✗ Failed to fetch meetings list');
        return null;
      }

      const items: MeetingItem[] = response.items || [];
      console.log(`  → Page ${page}: checking ${items.length} meetings`);

      for (const item of items) {
        const shareUrl = item.share_url || '';
        const meetingUrl = item.url || '';

        if (shareUrl === inputUrl || meetingUrl === inputUrl) {
          const recordingId = String(item.recording_id || item.id || '');
          console.log(`  ✓ Exact match found: recording_id=${recordingId}`);

          const hasTranscript = item.transcript && (typeof item.transcript === 'string' || item.transcript.segments || item.transcript.text);
          const hasSummary = item.default_summary && (typeof item.default_summary === 'string' || item.default_summary.summary_text || item.default_summary.text);

          const recordingData: RecordingData = {
            recording_id: recordingId,
            source: 'meetings_api',
            meeting: item,
            transcript: hasTranscript ? item.transcript : null,
            summary: hasSummary ? item.default_summary : null,
          };

          if (!hasTranscript || !hasSummary) {
            console.log(`  → Missing data in meetings object, fetching from recordings endpoints...`);
            await enrichRecordingData(recordingData, apiKey);
          }

          return recordingData;
        }
      }

      hasMore = items.length === MEETINGS_API_LIMIT;
      page++;

      if (hasMore) {
        await sleep(200);
      }
    } catch (error) {
      console.error(`  ✗ Error in page ${page}:`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  console.log('  ⊚ No exact match found after scanning all pages');
  return null;
}

async function findRecordingsInFolder(
  folderId: string,
  apiKey: string,
  filters: { created_after?: string; created_before?: string; team_filter?: string[]; meeting_type_filter?: string[] }
): Promise<RecordingData[]> {
  console.log(`  → Fetching recordings for folder ${folderId} via API...`);

  const recordings: RecordingData[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const apiUrl = new URL('https://api.fathom.ai/external/v1/meetings');
      apiUrl.searchParams.set('limit', String(MEETINGS_API_LIMIT));
      apiUrl.searchParams.set('page', String(page));

      if (filters.created_after) apiUrl.searchParams.set('created_after', filters.created_after);
      if (filters.created_before) apiUrl.searchParams.set('created_before', filters.created_before);

      const response = await fetchWithRetry(apiUrl.toString(), apiKey, `meetings list page ${page}`);

      if (!response) break;

      const items: MeetingItem[] = response.items || [];
      console.log(`  → Page ${page}: ${items.length} meetings`);

      const folderItems = items.filter(item => {
        const itemFolderId = String(item.folder_id || '');
        return itemFolderId === folderId;
      });

      console.log(`    → ${folderItems.length} matches folder ${folderId}`);

      for (const item of folderItems) {
        const recordingId = String(item.recording_id || item.id || '');

        if (!recordingId) continue;

        const hasTranscript = item.transcript && (typeof item.transcript === 'string' || item.transcript.segments || item.transcript.text);
        const hasSummary = item.default_summary && (typeof item.default_summary === 'string' || item.default_summary.summary_text || item.default_summary.text);

        const recordingData: RecordingData = {
          recording_id: recordingId,
          source: 'meetings_api',
          meeting: item,
          transcript: hasTranscript ? item.transcript : null,
          summary: hasSummary ? item.default_summary : null,
        };

        recordings.push(recordingData);
      }

      hasMore = items.length === MEETINGS_API_LIMIT;
      page++;

      if (hasMore) {
        await sleep(200);
      }
    } catch (error) {
      console.error(`  ✗ Error in page ${page}:`, error instanceof Error ? error.message : error);
      break;
    }
  }

  if (recordings.length > 0) {
    console.log(`  → Enriching ${recordings.length} recordings with missing data...`);
    const chunks = chunkArray(recordings, CHUNK_SIZE);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`    → Chunk ${i + 1}/${chunks.length} (${chunk.length} recordings)`);

      await Promise.all(
        chunk.map(async (recData) => {
          const needsTranscript = !recData.transcript;
          const needsSummary = !recData.summary;

          if (needsTranscript || needsSummary) {
            await enrichRecordingData(recData, apiKey);
          }
        })
      );

      if (i < chunks.length - 1) {
        await sleep(300);
      }
    }
  }

  return recordings;
}

async function fetchRecordingsByIds(
  recordingIds: string[],
  apiKey: string
): Promise<RecordingData[]> {
  console.log(`  → Fetching ${recordingIds.length} recordings by ID...`);

  const recordings: RecordingData[] = [];
  const chunks = chunkArray(recordingIds, CHUNK_SIZE);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`    → Chunk ${i + 1}/${chunks.length} (${chunk.length} IDs)`);

    const chunkResults = await Promise.all(
      chunk.map(async (recordingId) => {
        const recData: RecordingData = {
          recording_id: recordingId,
          source: 'recordings_api',
        };
        await enrichRecordingData(recData, apiKey);
        return recData;
      })
    );

    recordings.push(...chunkResults);

    if (i < chunks.length - 1) {
      await sleep(300);
    }
  }

  return recordings;
}

async function enrichRecordingData(recData: RecordingData, apiKey: string): Promise<void> {
  const recordingId = recData.recording_id;
  let consecutiveFailures = 0;

  if (!recData.meeting) {
    try {
      const details = await fetchWithRetry(
        `https://api.fathom.ai/external/v1/recordings/${recordingId}`,
        apiKey,
        'recording details'
      );
      if (details) {
        recData.meeting = details;
      } else {
        consecutiveFailures++;
      }
    } catch (error) {
      console.warn(`    ⚠ Failed to fetch details for ${recordingId}`);
      consecutiveFailures++;
    }
  }

  if (!recData.transcript) {
    try {
      const transcript = await fetchWithRetry(
        `https://api.fathom.ai/external/v1/recordings/${recordingId}/transcript`,
        apiKey,
        'transcript'
      );
      if (transcript) {
        recData.transcript = transcript;
      } else {
        consecutiveFailures++;
      }
    } catch (error) {
      console.warn(`    ⚠ Failed to fetch transcript for ${recordingId}`);
      consecutiveFailures++;
    }
  }

  if (!recData.summary) {
    try {
      const summary = await fetchWithRetry(
        `https://api.fathom.ai/external/v1/recordings/${recordingId}/summary`,
        apiKey,
        'summary'
      );
      if (summary) {
        recData.summary = summary;
      } else {
        consecutiveFailures++;
      }
    } catch (error) {
      console.warn(`    ⚠ Failed to fetch summary for ${recordingId}`);
      consecutiveFailures++;
    }
  }

  if (!recData.highlights) {
    try {
      recData.highlights = await fetchWithRetry(
        `https://api.fathom.ai/external/v1/recordings/${recordingId}/highlights`,
        apiKey,
        'highlights'
      );
    } catch (error) {
      consecutiveFailures++;
    }
  }

  if (!recData.actions) {
    try {
      recData.actions = await fetchWithRetry(
        `https://api.fathom.ai/external/v1/recordings/${recordingId}/actions`,
        apiKey,
        'actions'
      );
    } catch (error) {
      consecutiveFailures++;
    }
  }

  if (!recData.participants) {
    try {
      recData.participants = await fetchWithRetry(
        `https://api.fathom.ai/external/v1/recordings/${recordingId}/participants`,
        apiKey,
        'participants'
      );
    } catch (error) {
      consecutiveFailures++;
    }
  }

  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    console.error(`    ⚠ Circuit breaker: ${consecutiveFailures} consecutive failures for recording ${recordingId}`);
  }
}

async function fetchWithRetry(url: string, apiKey: string, label: string): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 429) {
        const retryDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(`    ⚠ Rate limited (429) fetching ${label}, retry ${attempt + 1}/${MAX_RETRY_ATTEMPTS} after ${retryDelay}ms`);
        await sleep(retryDelay);
        continue;
      }

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_RETRY_ATTEMPTS - 1) {
        const retryDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(`    ⚠ Error fetching ${label}, retry ${attempt + 1}/${MAX_RETRY_ATTEMPTS} after ${retryDelay}ms`);
        await sleep(retryDelay);
      }
    }
  }

  console.error(`    ✗ Failed to fetch ${label} after ${MAX_RETRY_ATTEMPTS} attempts`);
  return null;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanTranscript(transcript: string): string {
  let cleaned = transcript;
  cleaned = cleaned.replace(/\[inaudible\](?:\s*\[inaudible\])*/gi, '[inaudible]');
  cleaned = cleaned.replace(/\s+([.,!?])/g, '$1');
  cleaned = cleaned.replace(/([.,!?])([A-Za-z])/g, '$1 $2');
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.trim();
  return cleaned;
}
