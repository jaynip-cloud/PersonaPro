import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SyncRequest {
  client_id: string;
  folder_link?: string;
  recording_ids?: string[];
  team_filter?: string[];
  meeting_type_filter?: string[];
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
    console.log('Team filter:', team_filter);
    console.log('Meeting type filter:', meeting_type_filter);

    let recordingIdsToSync: string[] = [];

    if (folder_link) {
      const folderIdMatch = folder_link.match(/folders\/([a-zA-Z0-9_-]+)/);
      const recordingIdMatch = folder_link.match(/recordings\/([a-zA-Z0-9_-]+)/);
      const callIdMatch = folder_link.match(/calls\/([a-zA-Z0-9_-]+)/);

      if (recordingIdMatch || callIdMatch) {
        const recordingId = recordingIdMatch?.[1] || callIdMatch?.[1];
        console.log('Single recording link detected:', recordingId);
        recordingIdsToSync = [recordingId!];
      } else if (folderIdMatch) {
        const folderId = folderIdMatch[1];
        console.log('Fetching recordings from folder:', folderId);

      console.log(`Fetching meetings from Fathom API...`);
      const listResponse = await fetch('https://api.fathom.ai/external/v1/meetings', {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKeys.fathom_api_key,
          'Content-Type': 'application/json',
        },
      });

      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        console.error(`Fathom API error (${listResponse.status}):`, errorText);
        throw new Error(`Unable to list meetings. Status: ${listResponse.status}. Please check your API key permissions.`);
      }

      const listData = await listResponse.json();

      const allMeetings = Array.isArray(listData) ? listData : (listData.meetings || listData.data || []);

      console.log(`Total meetings retrieved: ${allMeetings.length}`);

      const folderMeetings = allMeetings.filter((item: any) => {
        const itemFolderId = item.folder_id || item.folderId || item.folder;
        return itemFolderId === folderId;
      });

        recordingIdsToSync = folderMeetings.map((item: any) => item.recording_id || item.recordingId || item.id || item.call_id);

        console.log(`Found ${recordingIdsToSync.length} meetings in folder ${folderId} (out of ${allMeetings.length} total)`);
      } else {
        throw new Error('Invalid Fathom link format. Please provide a folder link (e.g., app.fathom.video/folders/xxx) or recording link (e.g., app.fathom.video/recordings/xxx)');
      }
    } else if (recording_ids && recording_ids.length > 0) {
      recordingIdsToSync = recording_ids;
      console.log(`Syncing ${recordingIdsToSync.length} specific recording IDs`);
    } else {
      throw new Error('Either folder_link or recording_ids must be provided');
    }

    if (recordingIdsToSync.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No recordings found to sync', recordings_synced: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const processedRecordings = [];
    const skippedRecordings = [];
    const errors = [];

    for (const recordingId of recordingIdsToSync) {
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

        const teamName = recording.team || null;
        const meetingType = recording.meeting_type || null;

        if (team_filter && team_filter.length > 0 && teamName && !team_filter.includes(teamName)) {
          console.log(`Recording ${recordingId} filtered out by team: ${teamName}`);
          skippedRecordings.push({ id: recordingId, title: recording.title, reason: 'team_filter', team: teamName });
          continue;
        }

        if (meeting_type_filter && meeting_type_filter.length > 0 && meetingType && !meeting_type_filter.includes(meetingType)) {
          console.log(`Recording ${recordingId} filtered out by meeting type: ${meetingType}`);
          skippedRecordings.push({ id: recordingId, title: recording.title, reason: 'meeting_type_filter', meeting_type: meetingType });
          continue;
        }

        let fullTranscript = '';
        if (transcript && transcript.segments) {
          fullTranscript = transcript.segments
            .map((seg: any) => `${seg.speaker || 'Unknown'}: ${seg.text}`)
            .join('\n\n');
        }

        fullTranscript = cleanTranscript(fullTranscript);

        if (!fullTranscript) {
          console.log(`Recording ${recordingId} has no transcript, skipping`);
          skippedRecordings.push({ id: recordingId, title: recording.title, reason: 'no_transcript' });
          continue;
        }

        const startTime = new Date(recording.start_time).getTime();
        const endTime = new Date(recording.end_time).getTime();
        const durationMinutes = Math.round((endTime - startTime) / 60000);

        const participantsList = participantsData || recording.participants || [];
        const participants = participantsList.map((p: any) => ({
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
            folder_id: recording.folder_id || null,
            title: recording.title || 'Untitled Meeting',
            meeting_url: recording.meeting_url || '',
            playback_url: recording.playback_url || '',
            start_time: recording.start_time,
            end_time: recording.end_time,
            duration_minutes: durationMinutes,
            meeting_platform: recording.platform || '',
            host_name: recording.host?.name || '',
            host_email: recording.host?.email || '',
            participants: participants,
            team_name: teamName,
            meeting_type: meetingType,
            transcript: fullTranscript,
            transcript_language: transcript?.language || 'en',
            summary: summary?.summary_text || '',
            summary_sections: summary?.summary_sections || [],
            highlights: highlightsList,
            action_items: actionItems,
            decisions: [],
            topics: topics,
            sentiment_score: null,
            tone_tags: [],
            raw_response: { recording, transcript, summary, highlights, actions, participants: participantsData },
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
          if (reason === 'team_filter') return `${count} filtered by team`;
          if (reason === 'meeting_type_filter') return `${count} filtered by type`;
          return `${count} ${reason}`;
        })
        .join(', ');

      message = `No new recordings synced. ${recordingIdsToSync.length} found: ${reasonText}.`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        recordings_synced: processedRecordings.length,
        recordings: processedRecordings.map(r => ({ id: r.id, title: r.title })),
        skipped: skippedRecordings,
        total_found: recordingIdsToSync.length,
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
    throw new Error(`Failed to fetch recording details: ${response.status} ${errorText}`);
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
