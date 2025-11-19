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
    console.log('Folder link:', folder_link);
    console.log('Team filter:', team_filter);
    console.log('Meeting type filter:', meeting_type_filter);

    let meetingsToSync: any[] = [];

    if (folder_link) {
      const folderIdMatch = folder_link.match(/folders\/([a-zA-Z0-9_-]+)/);
      const recordingIdMatch = folder_link.match(/recordings\/([a-zA-Z0-9_-]+)/);
      const callIdMatch = folder_link.match(/calls\/([a-zA-Z0-9_-]+)/);

      if (recordingIdMatch || callIdMatch) {
        const recordingId = recordingIdMatch?.[1] || callIdMatch?.[1];
        console.log('Single recording link detected:', recordingId);
        
        const recording = await fetchRecordingDetails(recordingId, apiKeys.fathom_api_key);
        const transcript = await fetchTranscript(recordingId, apiKeys.fathom_api_key);
        const summary = await fetchSummary(recordingId, apiKeys.fathom_api_key);
        const highlights = await fetchHighlights(recordingId, apiKeys.fathom_api_key);
        const actions = await fetchActions(recordingId, apiKeys.fathom_api_key);
        const participantsData = await fetchParticipants(recordingId, apiKeys.fathom_api_key);
        
        meetingsToSync = [{ ...recording, transcript, summary, highlights, actions, participants: participantsData }];
      } else if (folderIdMatch) {
        const folderId = folderIdMatch[1];
        console.log('Fetching recordings from folder:', folderId);

        console.log(`Fetching recordings from folder: ${folderId}`);
        const apiUrl = new URL(`https://api.fathom.ai/external/v1/folders/${folderId}/recordings`);
        apiUrl.searchParams.set('limit', '100');

        const listResponse = await fetch(apiUrl.toString(), {
          method: 'GET',
          headers: {
            'X-Api-Key': apiKeys.fathom_api_key,
            'Content-Type': 'application/json',
          },
        });

        if (!listResponse.ok) {
          const errorText = await listResponse.text();
          console.error(`Fathom API error (${listResponse.status}):`, errorText);
          throw new Error(`Unable to list recordings from folder. Status: ${listResponse.status}. Error: ${errorText}. Please check that the folder ID is correct and accessible with your API key.`);
        }

        const listData = await listResponse.json();
        console.log('API response structure:', Object.keys(listData));

        const recordings = listData.recordings || listData.items || [];
        console.log('Total recordings found in folder:', recordings.length);

        if (recordings.length === 0) {
          console.log('No recordings found in this folder. The folder may be empty or the folder ID may be incorrect.');
        }

        for (const recording of recordings) {
          const recordingId = recording.id || recording.recording_id;
          if (!recordingId) continue;

          try {
            const details = await fetchRecordingDetails(recordingId, apiKeys.fathom_api_key);
            const transcript = await fetchTranscript(recordingId, apiKeys.fathom_api_key);
            const summary = await fetchSummary(recordingId, apiKeys.fathom_api_key);
            const highlights = await fetchHighlights(recordingId, apiKeys.fathom_api_key);
            const actions = await fetchActions(recordingId, apiKeys.fathom_api_key);
            const participantsData = await fetchParticipants(recordingId, apiKeys.fathom_api_key);

            meetingsToSync.push({
              ...details,
              folder_id: folderId,
              transcript,
              summary,
              highlights,
              actions,
              participants: participantsData
            });
          } catch (error) {
            console.error(`Error fetching details for recording ${recordingId}:`, error);
          }
        }

        console.log(`Successfully fetched ${meetingsToSync.length} recordings with full details from folder`);
      } else {
        throw new Error('Invalid Fathom link format. Please provide a folder link (e.g., fathom.video/folders/xxx) or recording link (e.g., fathom.video/recordings/xxx)');
      }
    } else if (recording_ids && recording_ids.length > 0) {
      console.log(`Syncing ${recording_ids.length} specific recording IDs`);
      for (const recordingId of recording_ids) {
        const recording = await fetchRecordingDetails(recordingId, apiKeys.fathom_api_key);
        const transcript = await fetchTranscript(recordingId, apiKeys.fathom_api_key);
        const summary = await fetchSummary(recordingId, apiKeys.fathom_api_key);
        const highlights = await fetchHighlights(recordingId, apiKeys.fathom_api_key);
        const actions = await fetchActions(recordingId, apiKeys.fathom_api_key);
        const participantsData = await fetchParticipants(recordingId, apiKeys.fathom_api_key);
        
        meetingsToSync.push({ ...recording, transcript, summary, highlights, actions, participants: participantsData });
      }
    } else {
      throw new Error('Either folder_link or recording_ids must be provided');
    }

    if (meetingsToSync.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No recordings found to sync.', 
          recordings_synced: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const processedRecordings = [];
    const skippedRecordings = [];
    const errors = [];

    for (const meeting of meetingsToSync) {
      try {
        const recordingId = meeting.recording_id || meeting.recordingId || meeting.id;
        if (!recordingId) {
          console.log('Skipping meeting without recording_id:', meeting);
          continue;
        }

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

        const teamName = meeting.team || null;
        const meetingType = meeting.meeting_type || null;

        if (team_filter && team_filter.length > 0 && teamName && !team_filter.includes(teamName)) {
          console.log(`Recording ${recordingId} filtered out by team: ${teamName}`);
          skippedRecordings.push({ id: recordingId, title: meeting.title, reason: 'team_filter', team: teamName });
          continue;
        }

        if (meeting_type_filter && meeting_type_filter.length > 0 && meetingType && !meeting_type_filter.includes(meetingType)) {
          console.log(`Recording ${recordingId} filtered out by meeting type: ${meetingType}`);
          skippedRecordings.push({ id: recordingId, title: meeting.title, reason: 'meeting_type_filter', meeting_type: meetingType });
          continue;
        }

        let fullTranscript = '';
        const transcriptData = meeting.transcript;
        if (transcriptData) {
          if (typeof transcriptData === 'string') {
            fullTranscript = transcriptData;
          } else if (transcriptData.segments && Array.isArray(transcriptData.segments)) {
            fullTranscript = transcriptData.segments
              .map((seg: any) => `${seg.speaker || 'Unknown'}: ${seg.text}`)
              .join('\n\n');
          } else if (transcriptData.text) {
            fullTranscript = transcriptData.text;
          }
        }

        fullTranscript = cleanTranscript(fullTranscript);

        if (!fullTranscript) {
          console.log(`Recording ${recordingId} has no transcript, skipping`);
          skippedRecordings.push({ id: recordingId, title: meeting.title || meeting.meeting_title, reason: 'no_transcript' });
          continue;
        }

        const startTime = meeting.recording_start_time || meeting.start_time || meeting.scheduled_start_time;
        const endTime = meeting.recording_end_time || meeting.end_time || meeting.scheduled_end_time;
        const durationMinutes = startTime && endTime ? Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000) : 0;

        const participantsList = meeting.participants || [];
        const participants = participantsList.map((p: any) => ({
          name: p.name || '',
          email: p.email || '',
          role: p.role || '',
        }));

        const actionItemsData = meeting.action_items || meeting.actions || [];
        const actionItems = actionItemsData.map((item: any) => ({
          text: item.text || '',
          assignee: item.assignee || '',
          due_date: item.due_date || null,
          timestamp: item.timestamp || 0,
          completed: false,
        }));

        const highlightsList = (meeting.highlights || []).map((h: any) => ({
          text: h.text || '',
          timestamp: h.timestamp || 0,
          speaker: h.speaker || '',
          tag: h.tag || '',
          selected_by: h.selected_by || '',
        }));

        const summaryData = meeting.default_summary || meeting.summary;
        const summaryText = typeof summaryData === 'string' ? summaryData : (summaryData?.summary_text || summaryData?.text || '');
        const summarySections = summaryData?.summary_sections || summaryData?.sections || [];
        const topics = (summaryData?.topics || []).map((t: any) => ({
          name: typeof t === 'string' ? t : t.name || t.topic || '',
          confidence: typeof t === 'object' ? t.confidence : null,
        }));

        const { data: insertedRecording, error: insertError } = await supabaseClient
          .from('fathom_recordings')
          .insert({
            user_id: user.id,
            client_id: client_id,
            recording_id: recordingId,
            folder_id: meeting.folder_id || null,
            title: meeting.title || meeting.meeting_title || 'Untitled Meeting',
            meeting_url: meeting.url || meeting.meeting_url || '',
            playback_url: meeting.share_url || meeting.playback_url || '',
            start_time: startTime,
            end_time: endTime,
            duration_minutes: durationMinutes,
            meeting_platform: meeting.platform || '',
            host_name: meeting.host?.name || '',
            host_email: meeting.host?.email || '',
            participants: participants,
            team_name: teamName,
            meeting_type: meetingType,
            transcript: fullTranscript,
            transcript_language: transcriptData?.language || meeting.transcript_language || 'en',
            summary: summaryText,
            summary_sections: summarySections,
            highlights: highlightsList,
            action_items: actionItems,
            decisions: [],
            topics: topics,
            sentiment_score: null,
            tone_tags: [],
            raw_response: meeting,
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
        console.error(`Error processing meeting:`, error);
        errors.push({ recording_id: meeting.recording_id || 'unknown', error: error instanceof Error ? error.message : 'Unknown error' });
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

      message = `No new recordings synced. ${meetingsToSync.length} found: ${reasonText}.`;
    }

    return new Response(
      JSON.stringify({
        success: true,
        recordings_synced: processedRecordings.length,
        recordings: processedRecordings.map(r => ({ id: r.id, title: r.title })),
        skipped: skippedRecordings,
        total_found: meetingsToSync.length,
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
