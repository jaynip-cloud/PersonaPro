import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface VectorizeTranscriptRequest {
  transcriptId: string;
  clientId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { transcriptId, clientId }: VectorizeTranscriptRequest = await req.json();

    if (!transcriptId) {
      throw new Error('transcriptId is required');
    }

    // Fetch the meeting transcript
    const { data: transcript, error: transcriptError } = await supabaseClient
      .from('meeting_transcripts')
      .select('*')
      .eq('id', transcriptId)
      .eq('user_id', user.id)
      .single();

    if (transcriptError || !transcript) {
      throw new Error('Meeting transcript not found');
    }

    // Check if transcript already has embeddings
    const { data: existingEmbeddings } = await supabaseClient
      .from('document_embeddings')
      .select('id')
      .eq('user_id', user.id)
      .eq('source_type', 'meeting_transcript')
      .eq('metadata->>transcript_id', transcriptId)
      .limit(1);

    if (existingEmbeddings && existingEmbeddings.length > 0) {
      // Delete existing embeddings for this transcript
      await supabaseClient
        .from('document_embeddings')
        .delete()
        .eq('user_id', user.id)
        .eq('source_type', 'meeting_transcript')
        .eq('metadata->>transcript_id', transcriptId);
    }

    const transcriptText = transcript.transcript_text || transcript.transcript || '';
    if (!transcriptText || transcriptText.trim().length === 0) {
      throw new Error('Transcript text is empty');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Split transcript into chunks (max 8000 chars per chunk)
    const chunkSize = 8000;
    const chunks: string[] = [];
    for (let i = 0; i < transcriptText.length; i += chunkSize) {
      chunks.push(transcriptText.slice(i, i + chunkSize));
    }

    console.log(`Processing ${chunks.length} chunks for transcript: ${transcript.title || transcriptId}`);

    // Generate embeddings for each chunk
    const embeddingRecords = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Call OpenAI API to generate embedding
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: chunk,
        }),
      });

      if (!embeddingResponse.ok) {
        const errorText = await embeddingResponse.text();
        console.error('OpenAI API error:', errorText);
        throw new Error(`Failed to generate embedding for chunk ${i}`);
      }

      const embeddingData = await embeddingResponse.json();
      const embedding = embeddingData.data[0].embedding;

      embeddingRecords.push({
        user_id: user.id,
        client_id: clientId || transcript.client_id || null,
        document_name: transcript.title || 'Untitled Meeting',
        document_url: null, // Meeting transcripts don't have URLs
        content_chunk: chunk,
        chunk_index: i,
        embedding: embedding,
        source_type: 'meeting_transcript',
        metadata: {
          transcript_id: transcriptId,
          meeting_date: transcript.meeting_date,
          title: transcript.title,
          sentiment: transcript.sentiment,
          action_items: transcript.action_items || [],
          chunk_total: chunks.length,
          chunk_length: chunk.length,
          created_at: transcript.created_at,
        },
      });
    }

    // Insert embeddings into database
    const { error: insertError } = await supabaseClient
      .from('document_embeddings')
      .insert(embeddingRecords);

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to store embeddings');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully vectorized meeting transcript`,
        transcriptId: transcriptId,
        chunksProcessed: chunks.length,
        embeddingsCreated: embeddingRecords.length,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred while vectorizing meeting transcript',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

