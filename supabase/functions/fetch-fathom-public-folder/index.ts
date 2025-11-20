import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FetchPublicFolderRequest {
  client_id: string;
  public_folder_url: string;
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

    const body: FetchPublicFolderRequest = await req.json();
    const { client_id, public_folder_url } = body;

    if (!client_id || !public_folder_url) {
      throw new Error('client_id and public_folder_url are required');
    }

    console.log('Fetching public Fathom folder:', public_folder_url);

    const recordingIds = await extractRecordingIdsFromPublicFolder(public_folder_url);

    if (recordingIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No recordings found in the public folder.',
          recordings_synced: 0,
          recording_ids: []
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${recordingIds.length} recording IDs from public folder`);

    const processedRecordings = [];
    const skippedRecordings = [];
    const errors = [];

    for (const recordingId of recordingIds) {
      try {
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

        const recording = await fetchRecordingDetails(recordingId, apiKeys.fathom_api_key);
        const transcript = await fetchTranscript(recordingId, apiKeys.fathom_api_key);
        const summary = await fetchSummary(recordingId, apiKeys.fathom_api_key);
        const highlights = await fetchHighlights(recordingId, apiKeys.fathom_api_key);
        const actions = await fetchActions(recordingId, apiKeys.fathom_api_key);
        const participantsData = await fetchParticipants(recordingId, apiKeys.fathom_api_key);

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
            team_name: recording?.team || null,
            meeting_type: recording?.meeting_type || null,
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
        console.error(`Error processing recording ${recordingId}:`, error);
        errors.push({ recording_id: recordingId, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    console.log(`Sync complete: ${processedRecordings.length} recordings synced, ${skippedRecordings.length} skipped`);

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
          return `${count} ${reason}`;
        })
        .join(', ');

      message = `No new recordings synced. ${recordingIds.length} found: ${reasonText}.`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        recordings_synced: processedRecordings.length,
        recordings: processedRecordings.map(r => ({ id: r.id, title: r.title })),
        skipped: skippedRecordings,
        total_found: recordingIds.length,
        recording_ids: recordingIds,
        message: message || undefined,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Error in fetch-fathom-public-folder:', error);
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

async function extractRecordingIdsFromPublicFolder(folderUrl: string): Promise<string[]> {
  console.log('Fetching public folder HTML:', folderUrl);

  const response = await fetch(folderUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch public folder page: ${response.status}`);
  }

  const html = await response.text();

  const recordingIdPattern = /(?:recordings?\/|calls?\/)([a-zA-Z0-9_-]{8,})/gi;
  const matches = html.matchAll(recordingIdPattern);

  const recordingIds = new Set<string>();

  for (const match of matches) {
    const recordingId = match[1];
    if (recordingId && recordingId.length >= 8) {
      recordingIds.add(recordingId);
    }
  }

  const linkPattern = /href=["']([^"']*(?:recording|call)[^"']*)["\']/gi;
  const linkMatches = html.matchAll(linkPattern);

  for (const match of linkMatches) {
    const link = match[1];
    const idMatch = link.match(/(?:recordings?|calls?)\/([a-zA-Z0-9_-]{8,})/i);
    if (idMatch && idMatch[1]) {
      recordingIds.add(idMatch[1]);
    }
  }

  const recordingIdsArray = Array.from(recordingIds);
  console.log(`Extracted ${recordingIdsArray.length} unique recording IDs from public folder`);

  return recordingIdsArray;
}

async function fetchRecordingDetails(recordingId: string, apiKey: string): Promise<any> {
  const url = `https://api.fathom.ai/external/v1/recordings/${recordingId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn(`Failed to fetch recording details for ${recordingId}: ${response.status} ${errorText}`);
    return null;
  }

  return await response.json();
}

async function fetchTranscript(recordingId: string, apiKey: string): Promise<any> {
  const url = `https://api.fathom.ai/external/v1/recordings/${recordingId}/transcript`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.warn(`Failed to fetch transcript for ${recordingId}: ${response.status}`);
    return null;
  }

  return await response.json();
}

async function fetchSummary(recordingId: string, apiKey: string): Promise<any> {
  const url = `https://api.fathom.ai/external/v1/recordings/${recordingId}/summary`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.warn(`Failed to fetch summary for ${recordingId}: ${response.status}`);
    return null;
  }

  return await response.json();
}

async function fetchHighlights(recordingId: string, apiKey: string): Promise<any> {
  const url = `https://api.fathom.ai/external/v1/recordings/${recordingId}/highlights`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.warn(`Failed to fetch highlights for ${recordingId}: ${response.status}`);
    return null;
  }

  return await response.json();
}

async function fetchActions(recordingId: string, apiKey: string): Promise<any> {
  const url = `https://api.fathom.ai/external/v1/recordings/${recordingId}/actions`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.warn(`Failed to fetch actions for ${recordingId}: ${response.status}`);
    return null;
  }

  return await response.json();
}

async function fetchParticipants(recordingId: string, apiKey: string): Promise<any> {
  const url = `https://api.fathom.ai/external/v1/recordings/${recordingId}/participants`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.warn(`Failed to fetch participants for ${recordingId}: ${response.status}`);
    return null;
  }

  return await response.json();
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
