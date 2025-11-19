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
  team_filter?: string[]; // ['customer_success', 'executive', 'sales']
  meeting_type_filter?: string[]; // ['client_engagement', 'sales_initial_call', 'client_call']
}

interface FathomRecording {
  id: string;
  title: string;
  start: string;
  end: string;
  duration: number;
  call_url: string;
  share_url: string;
  team?: string;
  meeting_type?: string;
  transcript?: {
    segments: Array<{
      speaker: string;
      text: string;
      start: number;
      end: number;
    }>;
  };
  summary?: {
    overview: string;
    keywords: string[];
    action_items: Array<{
      text: string;
      assignee?: string;
    }>;
  };
  participants?: Array<{
    name: string;
    email?: string;
  }>;
  host?: {
    name: string;
    email: string;
  };
  platform?: string;
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

    // Get user's Fathom API key
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

    // Step 1: Resolve folder link to recording IDs
    if (folder_link) {
      // Extract folder ID from link (format: https://app.fathom.video/folders/folder_id)
      const folderIdMatch = folder_link.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (!folderIdMatch) {
        throw new Error('Invalid Fathom folder link format');
      }
      const folderId = folderIdMatch[1];

      console.log('Fetching recordings from folder:', folderId);

      // Call Fathom API to list meetings in folder
      const fathomListUrl = new URL('https://api.fathom.ai/external/v1/meetings');
      fathomListUrl.searchParams.append('folder_id', folderId);

      const listResponse = await fetch(fathomListUrl.toString(), {
        method: 'GET',
        headers: {
          'X-Api-Key': apiKeys.fathom_api_key,
          'Content-Type': 'application/json',
        },
      });

      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        throw new Error(`Fathom API error: ${errorText}`);
      }

      const listData = await listResponse.json();
      recordingIdsToSync = (listData.items || []).map((item: any) => item.id);

      console.log(`Found ${recordingIdsToSync.length} recordings in folder`);
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

    // Step 2: Fetch detailed data for each recording
    const processedRecordings = [];
    const errors = [];

    for (const recordingId of recordingIdsToSync) {
      try {
        console.log(`Fetching recording ${recordingId}...`);

        // Check if recording already exists
        const { data: existingRecording } = await supabaseClient
          .from('fathom_recordings')
          .select('id')
          .eq('recording_id', recordingId)
          .maybeSingle();

        if (existingRecording) {
          console.log(`Recording ${recordingId} already exists, skipping`);
          continue;
        }

        // Fetch full recording data from Fathom
        const recordingUrl = `https://api.fathom.ai/external/v1/meetings/${recordingId}`;
        const recordingResponse = await fetch(recordingUrl, {
          method: 'GET',
          headers: {
            'X-Api-Key': apiKeys.fathom_api_key,
            'Content-Type': 'application/json',
          },
        });

        if (!recordingResponse.ok) {
          const errorText = await recordingResponse.text();
          console.error(`Failed to fetch recording ${recordingId}: ${errorText}`);
          errors.push({ recording_id: recordingId, error: errorText });
          continue;
        }

        const recording: any = await recordingResponse.json();

        // Extract team and meeting_type from recording metadata or tags
        const teamName = recording.team || recording.metadata?.team || null;
        const meetingType = recording.meeting_type || recording.metadata?.meeting_type || null;

        // Apply filters
        if (team_filter && team_filter.length > 0 && teamName && !team_filter.includes(teamName)) {
          console.log(`Recording ${recordingId} filtered out by team: ${teamName}`);
          continue;
        }

        if (meeting_type_filter && meeting_type_filter.length > 0 && meetingType && !meeting_type_filter.includes(meetingType)) {
          console.log(`Recording ${recordingId} filtered out by meeting type: ${meetingType}`);
          continue;
        }

        // Process transcript
        let fullTranscript = '';
        if (recording.transcript && recording.transcript.segments) {
          fullTranscript = recording.transcript.segments
            .map((seg: any) => `${seg.speaker}: ${seg.text}`)
            .join('\n\n');
        }

        // Clean transcript (remove filler, fix punctuation)
        fullTranscript = cleanTranscript(fullTranscript);

        if (!fullTranscript) {
          console.log(`Recording ${recordingId} has no transcript, skipping`);
          continue;
        }

        // Calculate duration
        const startTime = new Date(recording.start).getTime();
        const endTime = new Date(recording.end).getTime();
        const durationMinutes = Math.round((endTime - startTime) / 60000);

        // Process participants
        const participants = (recording.participants || []).map((p: any) => ({
          name: p.name || '',
          email: p.email || '',
          role: p.role || '',
        }));

        // Process action items
        const actionItems = (recording.summary?.action_items || []).map((item: any) => ({
          text: item.text || '',
          assignee: item.assignee || '',
          completed: false,
        }));

        // Process highlights
        const highlights = (recording.highlights || []).map((h: any) => ({
          text: h.text || '',
          timestamp: h.timestamp || 0,
          speaker: h.speaker || '',
          flagged_by: h.flagged_by || '',
        }));

        // Process topics/keywords
        const topics = (recording.summary?.keywords || recording.topics || []).map((t: any) => ({
          name: typeof t === 'string' ? t : t.name || t.topic || '',
          confidence: typeof t === 'object' ? t.confidence : null,
        }));

        // Extract decisions from highlights or summary
        const decisions: any[] = [];

        // Insert recording into database
        const { data: insertedRecording, error: insertError } = await supabaseClient
          .from('fathom_recordings')
          .insert({
            user_id: user.id,
            client_id: client_id,
            recording_id: recordingId,
            folder_id: recording.folder_id || null,
            title: recording.title || 'Untitled Meeting',
            meeting_url: recording.call_url || '',
            playback_url: recording.share_url || '',
            start_time: recording.start,
            end_time: recording.end,
            duration_minutes: durationMinutes,
            meeting_platform: recording.platform || '',
            host_name: recording.host?.name || '',
            host_email: recording.host?.email || '',
            participants: participants,
            team_name: teamName,
            meeting_type: meetingType,
            transcript: fullTranscript,
            transcript_language: recording.transcript?.language || 'en',
            summary: recording.summary?.overview || '',
            summary_sections: recording.summary?.sections || [],
            highlights: highlights,
            action_items: actionItems,
            decisions: decisions,
            topics: topics,
            sentiment_score: recording.sentiment?.score || null,
            tone_tags: recording.sentiment?.tags || [],
            raw_response: recording,
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

        // Trigger embeddings generation (async, don't wait)
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

    console.log(`Sync complete: ${processedRecordings.length} recordings synced`);

    return new Response(
      JSON.stringify({
        success: true,
        recordings_synced: processedRecordings.length,
        recordings: processedRecordings.map(r => ({ id: r.id, title: r.title })),
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

// Helper function to clean transcript
function cleanTranscript(transcript: string): string {
  let cleaned = transcript;

  // Remove excessive [inaudible] blocks
  cleaned = cleaned.replace(/\[inaudible\](?:\s*\[inaudible\])*/gi, '[inaudible]');

  // Remove filler words (optional, can be aggressive)
  // cleaned = cleaned.replace(/\b(um|uh|like|you know)\b/gi, '');

  // Fix punctuation spacing
  cleaned = cleaned.replace(/\s+([.,!?])/g, '$1');
  cleaned = cleaned.replace(/([.,!?])([A-Za-z])/g, '$1 $2');

  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.trim();

  return cleaned;
}
