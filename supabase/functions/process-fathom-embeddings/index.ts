import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProcessRequest {
  recording_id: string;
  force_regenerate?: boolean;
}

interface TranscriptChunk {
  text: string;
  start_timestamp: number;
  end_timestamp: number;
  speaker_name: string;
  speaker_email: string;
}

const CHUNK_SIZE = 150;
const CHUNK_OVERLAP = 30;
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
      .select('openai_api_key, pinecone_api_key, pinecone_host')
      .eq('user_id', user.id)
      .maybeSingle();

    const openaiKey = apiKeys?.openai_api_key || Deno.env.get('OPENAI_API_KEY');
    const pineconeKey = apiKeys?.pinecone_api_key;
    const pineconeHost = apiKeys?.pinecone_host;

    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pineconeKey || !pineconeHost) {
      return new Response(
        JSON.stringify({ error: 'Pinecone API key or host not configured' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ProcessRequest = await req.json();
    const { recording_id, force_regenerate = false } = body;

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

    if (recording.embeddings_generated && !force_regenerate) {
      console.log('Embeddings already generated for this recording');
      return new Response(
        JSON.stringify({ success: true, message: 'Embeddings already generated' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (force_regenerate) {
      console.log('Force regenerate enabled - deleting existing embeddings from Pinecone');

      try {
        const deleteResponse = await fetch(`${pineconeHost}/vectors/delete`, {
          method: 'POST',
          headers: {
            'Api-Key': pineconeKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filter: {
              recording_id: recording_id,
              source_type: 'fathom_transcript'
            }
          }),
        });

        if (!deleteResponse.ok) {
          console.error('Failed to delete old Pinecone embeddings:', await deleteResponse.text());
        }
      } catch (error) {
        console.error('Error deleting old embeddings from Pinecone:', error);
      }
    }

    const cleanedTranscript = cleanAndNormalizeTranscript(recording.transcript);
    console.log(`Cleaned transcript from ${recording.transcript.length} to ${cleanedTranscript.length} characters`);

    const segments = parseTranscriptSegments(cleanedTranscript);
    console.log(`Parsed ${segments.length} speaker segments from transcript`);

    const chunks = createOverlappingChunks(segments);
    console.log(`Created ${chunks.length} chunks from transcript`);

    const pineconeVectors = [];

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

        pineconeVectors.push({
          id: `fathom_${recording.id}_${i}_${Date.now()}`,
          values: embedding,
          metadata: {
            user_id: user.id,
            client_id: recording.client_id,
            recording_id: recording.id,
            chunk_index: i,
            text: chunk.text,
            chunk_tokens: Math.ceil(chunk.text.length / CHARS_PER_TOKEN),
            start_timestamp: chunk.start_timestamp,
            end_timestamp: chunk.end_timestamp,
            speaker_name: chunk.speaker_name,
            speaker_email: chunk.speaker_email,
            source_type: 'fathom_transcript',
            recording_title: recording.title,
            meeting_date: recording.start_time,
          }
        });

        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error processing chunk ${i}:`, error);
      }
    }

    if (pineconeVectors.length > 0) {
      console.log(`Uploading ${pineconeVectors.length} vectors to Pinecone`);

      try {
        const upsertResponse = await fetch(`${pineconeHost}/vectors/upsert`, {
          method: 'POST',
          headers: {
            'Api-Key': pineconeKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vectors: pineconeVectors,
          }),
        });

        if (!upsertResponse.ok) {
          const errorText = await upsertResponse.text();
          throw new Error(`Pinecone upsert failed: ${errorText}`);
        }

        console.log('Successfully uploaded vectors to Pinecone');
      } catch (error) {
        console.error('Error uploading to Pinecone:', error);
        throw error;
      }
    }

    if (pineconeVectors.length > 0) {
      const { error: updateError } = await supabaseClient
        .from('fathom_recordings')
        .update({ embeddings_generated: true })
        .eq('id', recording_id);

      if (updateError) {
        console.error('Error updating recording status:', updateError);
      }

      console.log(`Successfully generated ${pineconeVectors.length} embeddings`);

      return new Response(
        JSON.stringify({
          success: true,
          embeddings_created: pineconeVectors.length,
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

function cleanAndNormalizeTranscript(transcript: string): string {
  if (!transcript) return '';

  let cleaned = transcript;

  // STEP 1: Remove emojis and emoticons (all unicode emoji ranges)
  // Remove all emoji characters including symbols, pictographs, flags, etc.
  cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Misc Symbols and Pictographs
  cleaned = cleaned.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport and Map
  cleaned = cleaned.replace(/[\u{1F700}-\u{1F77F}]/gu, ''); // Alchemical Symbols
  cleaned = cleaned.replace(/[\u{1F780}-\u{1F7FF}]/gu, ''); // Geometric Shapes Extended
  cleaned = cleaned.replace(/[\u{1F800}-\u{1F8FF}]/gu, ''); // Supplemental Arrows-C
  cleaned = cleaned.replace(/[\u{1F900}-\u{1F9FF}]/gu, ''); // Supplemental Symbols and Pictographs
  cleaned = cleaned.replace(/[\u{1FA00}-\u{1FA6F}]/gu, ''); // Chess Symbols
  cleaned = cleaned.replace(/[\u{1FA70}-\u{1FAFF}]/gu, ''); // Symbols and Pictographs Extended-A
  cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, '');   // Misc symbols
  cleaned = cleaned.replace(/[\u{2700}-\u{27BF}]/gu, '');   // Dingbats
  cleaned = cleaned.replace(/[\u{231A}-\u{231B}]/gu, '');   // Watch, Hourglass
  cleaned = cleaned.replace(/[\u{23E9}-\u{23FA}]/gu, '');   // Media controls
  cleaned = cleaned.replace(/[\u{25AA}-\u{25AB}]/gu, '');   // Squares
  cleaned = cleaned.replace(/[\u{25B6}]/gu, '');            // Play button
  cleaned = cleaned.replace(/[\u{25C0}]/gu, '');            // Reverse button
  cleaned = cleaned.replace(/[\u{2934}-\u{2935}]/gu, '');   // Arrows

  // Text-based emoticons :) :( :D etc.
  cleaned = cleaned.replace(/[:;=][-']?[()DPpO\[\]{}|\\\/]/g, '');

  // STEP 2: Remove currency symbols
  cleaned = cleaned.replace(/[$€£¥₹₽₩₪₱₦₴₨₵₸₺₼₾]/g, '');

  // STEP 3: Remove math symbols (but keep hyphens for compound words)
  cleaned = cleaned.replace(/[+×÷=≠≈≤≥±∞√∑∏∫∂∆]/g, '');

  // STEP 4: Remove brackets and parentheses with their content (annotations)
  cleaned = cleaned.replace(/\[[^\]]*\]/g, ''); // Remove [annotations]
  cleaned = cleaned.replace(/\([^)]*\)/g, '');  // Remove (annotations)
  cleaned = cleaned.replace(/\{[^}]*\}/g, '');  // Remove {annotations}

  // STEP 5: Remove URLs
  cleaned = cleaned.replace(/https?:\/\/[^\s]+/gi, '');
  cleaned = cleaned.replace(/www\.[^\s]+/gi, '');

  // STEP 6: Remove email addresses
  cleaned = cleaned.replace(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+/gi, '');

  // STEP 7: Remove multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ');

  // STEP 8: Fix spacing around speaker tags (ensure "Name: " format)
  cleaned = cleaned.replace(/\s*:\s*/g, ': ');

  // STEP 9: Remove filler words and verbal tics (common in transcripts)
  const fillerWords = [
    /\b(um+|uh+|er+|ah+)\b/gi,
    /\b(like|you know|I mean|kind of|sort of),?\s*/gi,
  ];

  // Apply filler word removal selectively (don't be too aggressive)
  for (const pattern of fillerWords) {
    cleaned = cleaned.replace(pattern, '');
  }

  // STEP 10: Clean up incomplete sentences and fragments
  // Remove standalone punctuation with no content
  cleaned = cleaned.replace(/\s+[.,!?]+\s+/g, '. ');

  // Fix double periods and multiple punctuation
  cleaned = cleaned.replace(/\.{2,}/g, '.');
  cleaned = cleaned.replace(/\?{2,}/g, '?');
  cleaned = cleaned.replace(/!{2,}/g, '!');

  // STEP 11: Normalize speaker names - ensure consistent capitalization
  cleaned = cleaned.replace(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*):/, (match, name) => {
    return name.trim() + ':';
  });

  // STEP 12: Remove very short utterances (less than 3 characters after speaker name)
  const lines = [];
  const parts = cleaned.split(/(?=[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*:\s)/);

  for (const part of parts) {
    const colonIndex = part.indexOf(':');
    if (colonIndex === -1) {
      if (part.trim().length > 0) {
        lines.push(part.trim());
      }
      continue;
    }

    const text = part.substring(colonIndex + 1).trim();
    // Keep utterances with at least 3 words or meaningful content
    if (text.split(/\s+/).length >= 2 || text.length >= 10) {
      lines.push(part.trim());
    }
  }

  cleaned = lines.join(' ');

  // STEP 13: Clean up whitespace again
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // STEP 14: Ensure sentences end with punctuation
  cleaned = cleaned.replace(/([a-z0-9])\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*:)/g, '$1. $2');

  return cleaned;
}

function parseTranscriptSegments(transcript: string): Array<{
  speaker: string;
  text: string;
  timestamp: number;
}> {
  const segments = [];

  const parts = transcript.split(/(?=[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*:\s)/);

  let currentTimestamp = 0;
  let currentSpeaker = '';
  let currentText = '';
  let currentStartTime = 0;

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const speaker = trimmed.substring(0, colonIndex).trim();
    const text = trimmed.substring(colonIndex + 1).trim();

    if (!speaker || !text) continue;

    // Merge consecutive utterances from the same speaker
    if (speaker === currentSpeaker && currentText) {
      // Add to existing segment if same speaker
      currentText += ' ' + text;
    } else {
      // Different speaker - save previous segment if exists
      if (currentText && currentSpeaker) {
        segments.push({
          speaker: currentSpeaker,
          text: currentText,
          timestamp: currentStartTime,
        });
        const speakingTime = Math.ceil(currentText.split(' ').length * 0.5);
        currentTimestamp += speakingTime;
      }

      // Start new segment
      currentSpeaker = speaker;
      currentText = text;
      currentStartTime = currentTimestamp;
    }
  }

  // Add final segment
  if (currentText && currentSpeaker) {
    segments.push({
      speaker: currentSpeaker,
      text: currentText,
      timestamp: currentStartTime,
    });
  }

  console.log(`Parsed ${segments.length} speaker segments (merged consecutive same-speaker utterances)`);

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
  let chunkSegments: Array<typeof segments[0]> = [];
  let chunkStartTimestamp = 0;
  let segmentIndex = 0;

  while (segmentIndex < segments.length) {
    const segment = segments[segmentIndex];
    const segmentText = `${segment.speaker}: ${segment.text}`;
    const potentialChunkSize = currentChunk.length + (currentChunk ? 2 : 0) + segmentText.length;

    // Check if adding this segment would exceed the limit
    if (currentChunk && potentialChunkSize > chunkSizeChars) {
      // Save current chunk
      const speakers = [...new Set(chunkSegments.map(s => s.speaker))];
      const primarySpeaker = speakers.length > 0 ? speakers[0] : 'Unknown';

      chunks.push({
        text: currentChunk.trim(),
        start_timestamp: chunkStartTimestamp,
        end_timestamp: chunkSegments[chunkSegments.length - 1]?.timestamp || chunkStartTimestamp,
        speaker_name: speakers.join(', '),
        speaker_email: '',
      });

      // Create overlap: keep last few segments for context
      const overlapSegments = [];
      let overlapSize = 0;
      let backtrackIndex = chunkSegments.length - 1;

      while (backtrackIndex >= 0 && overlapSize < overlapSizeChars) {
        const seg = chunkSegments[backtrackIndex];
        const segText = `${seg.speaker}: ${seg.text}`;

        if (overlapSize + segText.length <= overlapSizeChars) {
          overlapSegments.unshift(seg);
          overlapSize += segText.length + 2;
        }
        backtrackIndex--;
      }

      // Start new chunk with overlap
      if (overlapSegments.length > 0) {
        currentChunk = overlapSegments
          .map(s => `${s.speaker}: ${s.text}`)
          .join('\n\n');
        chunkSegments = [...overlapSegments];
        chunkStartTimestamp = overlapSegments[0].timestamp;
      } else {
        currentChunk = '';
        chunkSegments = [];
        chunkStartTimestamp = segment.timestamp;
      }
    }

    // Add segment to current chunk
    if (currentChunk) {
      currentChunk += '\n\n';
    }
    currentChunk += segmentText;
    chunkSegments.push(segment);

    if (chunkSegments.length === 1) {
      chunkStartTimestamp = segment.timestamp;
    }

    segmentIndex++;
  }

  // Add final chunk
  if (currentChunk && chunkSegments.length > 0) {
    const speakers = [...new Set(chunkSegments.map(s => s.speaker))];

    chunks.push({
      text: currentChunk.trim(),
      start_timestamp: chunkStartTimestamp,
      end_timestamp: chunkSegments[chunkSegments.length - 1]?.timestamp || chunkStartTimestamp,
      speaker_name: speakers.join(', '),
      speaker_email: '',
    });
  }

  console.log(`Created ${chunks.length} chunks with smart overlap and context preservation`);

  return chunks;
}
