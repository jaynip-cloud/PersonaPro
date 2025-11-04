import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmbeddingRequest {
  documentName: string;
  documentUrl: string;
  content: string;
  clientId?: string;
  metadata?: Record<string, any>;
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

    const { documentName, documentUrl, content, clientId, metadata = {} }: EmbeddingRequest = await req.json();

    if (!documentName || !content) {
      throw new Error('documentName and content are required');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Split content into chunks (max 8000 chars per chunk for safety with token limits)
    const chunkSize = 8000;
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize));
    }

    console.log(`Processing ${chunks.length} chunks for document: ${documentName}`);

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
        client_id: clientId || null,
        document_name: documentName,
        document_url: documentUrl,
        content_chunk: chunk,
        chunk_index: i,
        embedding: embedding,
        metadata: {
          ...metadata,
          chunk_total: chunks.length,
          chunk_length: chunk.length,
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
        message: `Successfully generated ${embeddingRecords.length} embeddings`,
        chunksProcessed: chunks.length,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred while generating embeddings',
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