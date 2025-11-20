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
const MEETINGS_API_LIMIT = 200;
const MAX_CONSECUTIVE_FAILURES = 5;
const DEBUG_MODE = true;

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
  source: 'meetings_api' | 'recordings_api' | 'scraping_fallback';
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
    console.log('Debug Mode:', DEBUG_MODE);
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
          console.warn('⚠ No exact match found via API, trying scraping fallback...');
          const scrapedRecording = await tryScrapingFallback(exactUrl, apiKeys.fathom_api_key);

          if (scrapedRecording) {
            console.log(`✓ Found via scraping: recording_id=${scrapedRecording.recording_id}`);
            recordingsToProcess = [scrapedRecording];
          } else {
            return new Response(
              JSON.stringify({
                success: true,
                message: `No recording found matching URL: ${exactUrl}. The recording may be private, not yet available, or outside the date filter range. Check logs for pagination details.`,
                recordings_synced: 0,
                debug: DEBUG_MODE ? {
                  normalized_url: normalizeUrl(exactUrl),
                  filters_applied: { created_after, created_before }
                } : undefined
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      } else if (isFolderUrl(exactUrl)) {
        throw new Error('Folder URLs are not supported. Please use individual share links or recording IDs instead.');
      } else {
        throw new Error('Invalid URL format. Provide a share link or call link.');
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

function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    let normalized = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    normalized = normalized.replace(/\/$/, '');
    normalized = normalized.toLowerCase();
    return normalized;
  } catch {
    let normalized = url.replace(/\?.*$/, '');
    normalized = normalized.replace(/\/$/, '');
    normalized = normalized.toLowerCase();
    return normalized;
  }
}

async function findMeetingByExactUrl(
  inputUrl: string,
  apiKey: string,
  filters: { created_after?: string; created_before?: string }
): Promise<RecordingData | null> {
  console.log('  → Searching for exact URL match via meetings API (cursor-based)...');

  const normalizedInput = normalizeUrl(inputUrl);
  console.log(`  → Normalized input URL: ${normalizedInput}`);

  let cursor: string | null = null;
  let pageCount = 0;
  let totalChecked = 0;

  do {
    pageCount++;
    try {
      const apiUrl = new URL('https://api.fathom.ai/external/v1/meetings');
      apiUrl.searchParams.set('limit', String(MEETINGS_API_LIMIT));

      if (cursor) {
        apiUrl.searchParams.set('cursor', cursor);
      }

      if (!filters.created_after && !filters.created_before && DEBUG_MODE) {
        console.log(`  → DEBUG: No date filters applied, scanning all meetings`);
      }

      if (filters.created_after) apiUrl.searchParams.set('created_after', filters.created_after);
      if (filters.created_before) apiUrl.searchParams.set('created_before', filters.created_before);

      console.log(`  → Page ${pageCount}: Fetching up to ${MEETINGS_API_LIMIT} meetings...`);
      const response = await fetchWithRetry(apiUrl.toString(), apiKey, 'meetings list');

      if (!response) {
        console.error('  ✗ Failed to fetch meetings list');
        return null;
      }

      const items: MeetingItem[] = response.items || [];
      const nextCursor = response.next_cursor || null;

      console.log(`  → Page ${pageCount}: Received ${items.length} meetings, next_cursor=${nextCursor ? 'exists' : 'null'}`);
      totalChecked += items.length;

      if (DEBUG_MODE && pageCount <= 3) {
        console.log(`  → DEBUG: Sample URLs from page ${pageCount}:`);
        items.slice(0, 3).forEach((item, idx) => {
          console.log(`    [${idx}] share_url: ${item.share_url || 'null'}`);
          console.log(`    [${idx}] url: ${item.url || 'null'}`);
          console.log(`    [${idx}] recording_id: ${item.recording_id || item.id || 'null'}`);
        });
      }

      for (const item of items) {
        const shareUrl = item.share_url || '';
        const meetingUrl = item.url || '';

        const normalizedShare = shareUrl ? normalizeUrl(shareUrl) : '';
        const normalizedMeeting = meetingUrl ? normalizeUrl(meetingUrl) : '';

        if (DEBUG_MODE && (normalizedShare.includes('share') || normalizedMeeting.includes('share'))) {
          console.log(`  → Comparing: ${normalizedShare} vs ${normalizedInput}`);
        }

        if (normalizedShare === normalizedInput || normalizedMeeting === normalizedInput) {
          const recordingId = String(item.recording_id || item.id || '');
          console.log(`  ✓ Exact match found on page ${pageCount}!`);
          console.log(`    → recording_id: ${recordingId}`);
          console.log(`    → matched on: ${normalizedShare === normalizedInput ? 'share_url' : 'url'}`);
          console.log(`    → Now fetching transcript and summary directly...`);

          const recordingData: RecordingData = {
            recording_id: recordingId,
            source: 'meetings_api',
            meeting: item,
          };

          await fetchTranscriptAndSummary(recordingData, apiKey);

          return recordingData;
        }
      }

      cursor = nextCursor;

      if (cursor) {
        console.log(`  → Continuing to next page (cursor exists)...`);
        await sleep(200);
      }

    } catch (error) {
      console.error(`  ✗ Error on page ${pageCount}:`, error instanceof Error ? error.message : error);
      return null;
    }
  } while (cursor !== null);

  console.log(`  ⊚ No exact match found after scanning ${pageCount} pages (${totalChecked} total meetings)`);
  console.log(`  → Filters applied: created_after=${filters.created_after || 'none'}, created_before=${filters.created_before || 'none'}`);

  return null;
}

async function tryScrapingFallback(shareUrl: string, apiKey: string): Promise<RecordingData | null> {
  console.log('  → Attempting scraping fallback for share URL...');

  try {
    const response = await fetch(shareUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FathomSync/1.0)',
      }
    });

    if (!response.ok) {
      console.log(`  ✗ Failed to fetch share page: ${response.status} ${response.statusText}`);
      return null;
    }

    const html = await response.text();

    const recordingIdMatch = html.match(/recording[_-]?id["']?\s*[:=]\s*["']?(\d+)/i);
    const dataRecordingMatch = html.match(/data-recording-id=["'](\d+)["']/i);
    const apiRecordingMatch = html.match(/\/recordings\/(\d+)/i);

    const recordingId = recordingIdMatch?.[1] || dataRecordingMatch?.[1] || apiRecordingMatch?.[1];

    if (!recordingId) {
      console.log('  ✗ Could not extract recording_id from share page HTML');
      return null;
    }

    console.log(`  → Extracted recording_id: ${recordingId} from HTML`);
    console.log(`  → Fetching transcript and summary directly...`);

    const recordingData: RecordingData = {
      recording_id: recordingId,
      source: 'scraping_fallback',
    };

    await fetchTranscriptAndSummary(recordingData, apiKey);

    if (!recordingData.transcript && !recordingData.summary) {
      console.log(`  ✗ Could not fetch transcript or summary - recording may be inaccessible`);
      return null;
    }

    return recordingData;

  } catch (error) {
    console.error('  ✗ Scraping fallback failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

async function fetchTranscriptAndSummary(recData: RecordingData, apiKey: string): Promise<void> {
  const recordingId = recData.recording_id;
  console.log(`    → Fetching transcript for recording ${recordingId}...`);

  try {
    const transcript = await fetchWithRetry(
      `https://api.fathom.ai/external/v1/recordings/${recordingId}/transcript`,
      apiKey,
      'transcript'
    );
    if (transcript) {
      recData.transcript = transcript;
      console.log(`    ✓ Transcript fetched successfully`);
    } else {
      console.warn(`    ⚠ No transcript available for recording ${recordingId}`);
    }
  } catch (error) {
    console.warn(`    ⚠ Failed to fetch transcript:`, error instanceof Error ? error.message : error);
  }

  console.log(`    → Fetching summary for recording ${recordingId}...`);

  try {
    const summary = await fetchWithRetry(
      `https://api.fathom.ai/external/v1/recordings/${recordingId}/summary`,
      apiKey,
      'summary'
    );
    if (summary) {
      recData.summary = summary;
      console.log(`    ✓ Summary fetched successfully`);
    } else {
      console.warn(`    ⚠ No summary available for recording ${recordingId}`);
    }
  } catch (error) {
    console.warn(`    ⚠ Failed to fetch summary:`, error instanceof Error ? error.message : error);
  }

  try {
    recData.highlights = await fetchWithRetry(
      `https://api.fathom.ai/external/v1/recordings/${recordingId}/highlights`,
      apiKey,
      'highlights'
    );
  } catch (error) {
  }

  try {
    recData.actions = await fetchWithRetry(
      `https://api.fathom.ai/external/v1/recordings/${recordingId}/actions`,
      apiKey,
      'actions'
    );
  } catch (error) {
  }

  try {
    recData.participants = await fetchWithRetry(
      `https://api.fathom.ai/external/v1/recordings/${recordingId}/participants`,
      apiKey,
      'participants'
    );
  } catch (error) {
  }
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
        await fetchTranscriptAndSummary(recData, apiKey);
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
