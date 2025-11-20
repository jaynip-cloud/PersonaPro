import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CHUNK_SIZE = 8;
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 500;

interface SyncRequest {
  client_id: string;
  folder_link?: string;
  recording_ids?: string[];
  team_filter?: string[];
  meeting_type_filter?: string[];
}

interface RecordingData {
  recording_id: string;
  recording?: any;
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
    const { client_id, folder_link, recording_ids, team_filter, meeting_type_filter } = body;

    if (!client_id) {
      throw new Error('client_id is required');
    }

    console.log('Syncing Fathom recordings for client:', client_id);
    console.log('Folder link:', folder_link);
    console.log('Team filter:', team_filter);
    console.log('Meeting type filter:', meeting_type_filter);

    let recordingIdsToFetch: string[] = [];

    if (folder_link) {
      const folderIdMatch = folder_link.match(/folders\/([a-zA-Z0-9_-]+)/);
      const recordingIdMatch = folder_link.match(/recordings\/([a-zA-Z0-9_-]+)/);
      const callIdMatch = folder_link.match(/calls\/([a-zA-Z0-9_-]+)/);

      if (recordingIdMatch || callIdMatch) {
        const recordingId = recordingIdMatch?.[1] || callIdMatch?.[1];
        console.log('Single recording link detected:', recordingId);
        recordingIdsToFetch = [recordingId];
      } else if (folderIdMatch) {
        const folderId = folderIdMatch[1];
        console.log('Folder link detected, folder ID:', folderId);

        const folderUrl = folder_link.startsWith('http')
          ? folder_link
          : `https://fathom.video/folders/${folderId}`;

        console.log('Attempting to fetch public folder page:', folderUrl);

        try {
          const folderResponse = await fetch(folderUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; FathomSync/1.0)',
            },
          });

          if (folderResponse.ok) {
            console.log('✓ Public folder page accessible, parsing HTML...');
            const html = await folderResponse.text();
            recordingIdsToFetch = extractRecordingIdsFromHtml(html);
            console.log(`✓ Extracted ${recordingIdsToFetch.length} recording IDs from public folder HTML`);
          } else {
            console.log(`⚠ Public folder page returned ${folderResponse.status}, falling back to API...`);
            recordingIdsToFetch = await fetchRecordingIdsFromPrivateFolder(folderId, apiKeys.fathom_api_key);
          }
        } catch (htmlFetchError) {
          console.warn('Failed to fetch public folder HTML:', htmlFetchError);
          console.log('Falling back to API...');
          recordingIdsToFetch = await fetchRecordingIdsFromPrivateFolder(folderId, apiKeys.fathom_api_key);
        }

        if (recordingIdsToFetch.length === 0) {
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Folder appears private or empty. No recordings found. Please share the folder publicly or provide specific recording IDs.',
              recordings_synced: 0,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        throw new Error('Invalid Fathom link format. Please provide a folder link (e.g., fathom.video/folders/xxx) or recording link (e.g., fathom.video/recordings/xxx)');
      }
    } else if (recording_ids && recording_ids.length > 0) {
      console.log(`Syncing ${recording_ids.length} specific recording IDs`);
      recordingIdsToFetch = recording_ids;
    } else {
      throw new Error('Either folder_link or recording_ids must be provided');
    }

    if (recordingIdsToFetch.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No recordings found to sync.',
          recordings_synced: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📦 Total recordings to fetch: ${recordingIdsToFetch.length}`);

    const recordingsData = await fetchRecordingsInChunks(recordingIdsToFetch, apiKeys.fathom_api_key);

    console.log(`📊 Fetch complete: ${recordingsData.length} recordings retrieved`);

    const processedRecordings = [];
    const skippedRecordings = [];
    const errors = [];

    for (const recData of recordingsData) {
      try {
        const recordingId = recData.recording_id;
        console.log(`Processing recording ${recordingId}...`);

        const { data: existingRecording } = await supabaseClient
          .from('fathom_recordings')
          .select('id, title')
          .eq('recording_id', recordingId)
          .maybeSingle();

        if (existingRecording) {
          console.log(`Recording ${recordingId} already exists, skipping`);
          skippedRecordings.push({ id: recordingId, title: existingRecording.title, reason: 'already_synced' });
          continue;
        }

        const recording = recData.recording;
        const transcript = recData.transcript;
        const summary = recData.summary;
        const highlights = recData.highlights;
        const actions = recData.actions;
        const participantsData = recData.participants;

        const teamName = recording?.team || null;
        const meetingType = recording?.meeting_type || null;

        if (team_filter && team_filter.length > 0 && teamName && !team_filter.includes(teamName)) {
          console.log(`Recording ${recordingId} filtered out by team: ${teamName}`);
          skippedRecordings.push({ id: recordingId, title: recording?.title, reason: 'team_filter', team: teamName });
          continue;
        }

        if (meeting_type_filter && meeting_type_filter.length > 0 && meetingType && !meeting_type_filter.includes(meetingType)) {
          console.log(`Recording ${recordingId} filtered out by meeting type: ${meetingType}`);
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
          console.log(`Recording ${recordingId} has no transcript, skipping`);
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
          console.error(`Error inserting recording ${recordingId}:`, insertError);
          errors.push({ recording_id: recordingId, error: insertError.message });
          continue;
        }

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
        console.error(`Error processing recording ${recData.recording_id}:`, error);
        errors.push({ recording_id: recData.recording_id, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    console.log(`✅ Sync complete: ${processedRecordings.length} recordings synced, ${skippedRecordings.length} skipped, ${errors.length} errors`);

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

      message = `No new recordings synced. ${recordingIdsToFetch.length} found: ${reasonText}.`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        recordings_synced: processedRecordings.length,
        recordings: processedRecordings.map(r => ({ id: r.id, title: r.title })),
        skipped: skippedRecordings,
        total_found: recordingIdsToFetch.length,
        message: message || undefined,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Error in sync-fathom-recordings:', error);
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

function extractRecordingIdsFromHtml(html: string): string[] {
  const recordingIds = new Set<string>();

  const patterns = [
    /\/(?:calls|recordings)\/([A-Za-z0-9_-]{4,})/g,
    /\/share\/([A-Za-z0-9_-]{4,})/g,
    /"recording_id"\s*:\s*"?(\d+)"?/g,
    /(?:callId|recordingId|recording_id)=([A-Za-z0-9_-]{4,})/g,
  ];

  for (const pattern of patterns) {
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const id = match[1];
      if (id && id.length >= 4) {
        recordingIds.add(id);
      }
    }
  }

  const result = Array.from(recordingIds);
  console.log(`Regex extraction found ${result.length} unique recording IDs`);
  return result;
}

async function fetchRecordingIdsFromPrivateFolder(folderId: string, apiKey: string): Promise<string[]> {
  console.log('Fetching recordings from private folder via API...');

  try {
    const apiUrl = new URL('https://api.fathom.ai/external/v1/meetings');
    apiUrl.searchParams.set('limit', '1000');

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Fathom API error (${response.status}):`, errorText);
      return [];
    }

    const data = await response.json();
    const allMeetings = data.items || [];

    console.log(`API returned ${allMeetings.length} total meetings`);

    const folderMeetings = allMeetings.filter((meeting: any) => {
      const meetingFolderId = meeting.folder_id || meeting.folderId || '';
      return meetingFolderId.toString() === folderId.toString();
    });

    console.log(`Filtered to ${folderMeetings.length} meetings in folder ${folderId}`);

    const recordingIds = folderMeetings
      .map((meeting: any) => meeting.recording_id || meeting.recordingId || meeting.id)
      .filter((id: any) => id)
      .map((id: any) => String(id));

    return recordingIds;
  } catch (error) {
    console.error('Error fetching from private folder API:', error);
    return [];
  }
}

async function fetchRecordingsInChunks(recordingIds: string[], apiKey: string): Promise<RecordingData[]> {
  const results: RecordingData[] = [];
  const chunks = chunkArray(recordingIds, CHUNK_SIZE);

  console.log(`Fetching ${recordingIds.length} recordings in ${chunks.length} chunks of ${CHUNK_SIZE}`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} recordings)...`);

    const chunkResults = await Promise.all(
      chunk.map(recordingId => fetchSingleRecordingWithRetry(recordingId, apiKey))
    );

    results.push(...chunkResults);

    if (i < chunks.length - 1) {
      await sleep(200);
    }
  }

  return results;
}

async function fetchSingleRecordingWithRetry(recordingId: string, apiKey: string): Promise<RecordingData> {
  const result: RecordingData = {
    recording_id: recordingId,
  };

  const endpoints = [
    { name: 'recording', fetcher: () => fetchRecordingDetails(recordingId, apiKey) },
    { name: 'transcript', fetcher: () => fetchTranscript(recordingId, apiKey) },
    { name: 'summary', fetcher: () => fetchSummary(recordingId, apiKey) },
    { name: 'highlights', fetcher: () => fetchHighlights(recordingId, apiKey) },
    { name: 'actions', fetcher: () => fetchActions(recordingId, apiKey) },
    { name: 'participants', fetcher: () => fetchParticipants(recordingId, apiKey) },
  ];

  for (const endpoint of endpoints) {
    try {
      const data = await endpoint.fetcher();
      (result as any)[endpoint.name] = data;
    } catch (error) {
      console.warn(`Failed to fetch ${endpoint.name} for ${recordingId}:`, error instanceof Error ? error.message : error);
      (result as any)[endpoint.name] = null;
    }
  }

  return result;
}

async function fetchRecordingDetails(recordingId: string, apiKey: string): Promise<any> {
  return await fetchWithRetry(
    `https://api.fathom.ai/external/v1/recordings/${recordingId}`,
    apiKey,
    'recording details'
  );
}

async function fetchTranscript(recordingId: string, apiKey: string): Promise<any> {
  return await fetchWithRetry(
    `https://api.fathom.ai/external/v1/recordings/${recordingId}/transcript`,
    apiKey,
    'transcript'
  );
}

async function fetchSummary(recordingId: string, apiKey: string): Promise<any> {
  return await fetchWithRetry(
    `https://api.fathom.ai/external/v1/recordings/${recordingId}/summary`,
    apiKey,
    'summary'
  );
}

async function fetchHighlights(recordingId: string, apiKey: string): Promise<any> {
  return await fetchWithRetry(
    `https://api.fathom.ai/external/v1/recordings/${recordingId}/highlights`,
    apiKey,
    'highlights'
  );
}

async function fetchActions(recordingId: string, apiKey: string): Promise<any> {
  return await fetchWithRetry(
    `https://api.fathom.ai/external/v1/recordings/${recordingId}/actions`,
    apiKey,
    'actions'
  );
}

async function fetchParticipants(recordingId: string, apiKey: string): Promise<any> {
  return await fetchWithRetry(
    `https://api.fathom.ai/external/v1/recordings/${recordingId}/participants`,
    apiKey,
    'participants'
  );
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
        console.warn(`Rate limited (429) fetching ${label}, retry ${attempt + 1}/${MAX_RETRY_ATTEMPTS} after ${retryDelay}ms`);
        await sleep(retryDelay);
        continue;
      }

      if (!response.ok) {
        if (response.status === 404 || response.status >= 400) {
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
        console.warn(`Error fetching ${label}, retry ${attempt + 1}/${MAX_RETRY_ATTEMPTS} after ${retryDelay}ms:`, lastError.message);
        await sleep(retryDelay);
      }
    }
  }

  console.error(`Failed to fetch ${label} after ${MAX_RETRY_ATTEMPTS} attempts:`, lastError?.message);
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
