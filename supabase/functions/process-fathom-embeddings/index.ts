import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProcessRequest {
  recording_id: string;
}

interface TranscriptChunk {
  text: string;
  start_timestamp: number;
  end_timestamp: number;
  speaker_name: string;
  speaker_email: string;
}

const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;
const CHARS_PER_TOKEN = 4;

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
      .select('openai_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    const openaiKey = apiKeys?.openai_api_key || Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ProcessRequest = await req.json();
    const { recording_id } = body;

    if (!recording_id) {
      throw new Error('recording_id is required');
    }

    console.log('Processing embeddings for recording:', recording_id);

    const { data: recording, error: recordingError } = await supabaseClient
      .from('fathom_recordings')
      .select('*')
      .eq('id', recording_id)
      .single();

    if (recordingError || !recording) {
      throw new Error('Recording not found');
    }

    if (recording.embeddings_generated) {
      console.log('Embeddings already generated for this recording');
      return new Response(
        JSON.stringify({ success: true, message: 'Embeddings already generated' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const segments = parseTranscriptSegments(recording.transcript);
    const chunks = createOverlappingChunks(segments);

    console.log(`Created ${chunks.length} chunks from transcript`);

    const embeddings = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: chunk.text,
            model: 'text-embedding-3-small',
          }),
        });

        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          console.error(`OpenAI API error for chunk ${i}:`, errorText);
          continue;
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0].embedding;

        const { error: insertError } = await supabaseClient
          .from('fathom_embeddings')
          .insert({
            user_id: user.id,
            client_id: recording.client_id,
            recording_id: recording.id,
            chunk_index: i,
            chunk_text: chunk.text,
            chunk_tokens: Math.ceil(chunk.text.length / CHARS_PER_TOKEN),
            start_timestamp: chunk.start_timestamp,
            end_timestamp: chunk.end_timestamp,
            speaker_name: chunk.speaker_name,
            speaker_email: chunk.speaker_email,
            embedding: embedding,
            source_type: 'fathom_transcript',
          });

        if (insertError) {
          console.error(`Error inserting embedding for chunk ${i}:`, insertError);
          continue;
        }

        embeddings.push({ chunk_index: i, success: true });

        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error processing chunk ${i}:`, error);
      }
    }

    if (embeddings.length > 0) {
      const { error: updateError } = await supabaseClient
        .from('fathom_recordings')
        .update({ embeddings_generated: true })
        .eq('id', recording_id);

      if (updateError) {
        console.error('Error updating recording status:', updateError);
      }

      console.log(`Successfully generated ${embeddings.length} embeddings`);

      return new Response(
        JSON.stringify({
          success: true,
          embeddings_created: embeddings.length,
          chunks_total: chunks.length,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      console.error('Failed to create any embeddings');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create embeddings. Check logs for details.',
          embeddings_created: 0,
          chunks_total: chunks.length,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error('Error in process-fathom-embeddings:', error);
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

function parseTranscriptSegments(transcript: string): Array<{
  speaker: string;
  text: string;
  timestamp: number;
}> {
  const segments = [];
  const lines = transcript.split('\n').filter(line => line.trim());

  let currentTimestamp = 0;

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const speaker = match[1].trim();
      const text = match[2].trim();
      
      const speakingTime = Math.ceil(text.split(' ').length * 0.5);
      
      segments.push({
        speaker,
        text,
        timestamp: currentTimestamp,
      });

      currentTimestamp += speakingTime;
    }
  }

  return segments;
}

function createOverlappingChunks(segments: Array<{
  speaker: string;
  text: string;
  timestamp: number;
}>): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = [];
  
  const chunkSizeChars = CHUNK_SIZE * CHARS_PER_TOKEN;
  const overlapSizeChars = CHUNK_OVERLAP * CHARS_PER_TOKEN;
  
  let currentChunk = '';
  let currentSpeaker = '';
  let chunkStartTimestamp = 0;
  let chunkEndTimestamp = 0;
  let segmentIndex = 0;

  while (segmentIndex < segments.length) {
    const segment = segments[segmentIndex];
    const segmentText = `${segment.speaker}: ${segment.text}`;

    const wouldExceedLimit = currentChunk && (currentChunk.length + segmentText.length + 2) > chunkSizeChars;

    if (wouldExceedLimit) {
      chunks.push({
        text: currentChunk.trim(),
        start_timestamp: chunkStartTimestamp,
        end_timestamp: chunkEndTimestamp,
        speaker_name: currentSpeaker,
        speaker_email: '',
      });

      const overlapSegments = [];
      let overlapSize = 0;
      let backtrack = segmentIndex - 1;

      while (backtrack >= 0 && overlapSize < overlapSizeChars) {
        const seg = segments[backtrack];
        const segText = `${seg.speaker}: ${seg.text}`;
        overlapSegments.unshift(seg);
        overlapSize += segText.length;
        backtrack--;
      }

      if (overlapSegments.length > 0) {
        currentChunk = overlapSegments
          .map(s => `${s.speaker}: ${s.text}`)
          .join('\n\n');
        chunkStartTimestamp = overlapSegments[0].timestamp;
        currentSpeaker = overlapSegments[0].speaker;
      } else {
        currentChunk = '';
        chunkStartTimestamp = segment.timestamp;
        currentSpeaker = segment.speaker;
      }
    }

    if (currentChunk) {
      currentChunk += '\n\n';
    }
    currentChunk += segmentText;
    chunkEndTimestamp = segment.timestamp;

    if (!currentSpeaker) {
      currentSpeaker = segment.speaker;
      chunkStartTimestamp = segment.timestamp;
    }

    segmentIndex++;
  }

  if (currentChunk) {
    chunks.push({
      text: currentChunk.trim(),
      start_timestamp: chunkStartTimestamp,
      end_timestamp: chunkEndTimestamp,
      speaker_name: currentSpeaker,
      speaker_email: '',
    });
  }

  return chunks;
}