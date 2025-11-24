import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SearchRequest {
  query: string;
  clientId?: string;
  limit?: number;
  similarityThreshold?: number;
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

    const { query, clientId, limit = 10, similarityThreshold = 0.7 }: SearchRequest = await req.json();

    if (!query) {
      throw new Error('query is required');
    }

    const { data: apiKeys } = await supabaseClient
      .from('api_keys')
      .select('openai_api_key, pinecone_api_key, pinecone_host')
      .eq('user_id', user.id)
      .maybeSingle();

    const openaiApiKey = apiKeys?.openai_api_key || Deno.env.get('OPENAI_API_KEY');
    const pineconeKey = apiKeys?.pinecone_api_key;
    const pineconeHost = apiKeys?.pinecone_host;

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!pineconeKey || !pineconeHost) {
      throw new Error('Pinecone API key or host not configured');
    }

    console.log(`Searching for: "${query}" (client: ${clientId || 'all'})`);

    // Generate embedding for the search query
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error('Failed to generate query embedding');
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Build Pinecone query filter
    const filter: any = {
      user_id: { $eq: user.id }
    };

    if (clientId) {
      filter.client_id = { $eq: clientId };
    }

    // Search Pinecone
    const pineconeQuery = {
      vector: queryEmbedding,
      topK: limit,
      includeMetadata: true,
      filter: filter,
    };

    const pineconeResponse = await fetch(`${pineconeHost}/query`, {
      method: 'POST',
      headers: {
        'Api-Key': pineconeKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pineconeQuery),
    });

    if (!pineconeResponse.ok) {
      const errorText = await pineconeResponse.text();
      console.error('Pinecone query error:', errorText);
      throw new Error('Failed to search Pinecone');
    }

    const pineconeData = await pineconeResponse.json();
    const matches = pineconeData.matches || [];

    const results = matches
      .filter((match: any) => match.score >= similarityThreshold)
      .map((match: any) => ({
        id: match.id,
        similarity: match.score,
        text: match.metadata?.text || '',
        source_type: match.metadata?.source_type || 'unknown',
        client_id: match.metadata?.client_id,
        document_name: match.metadata?.document_name || match.metadata?.recording_title,
        document_url: match.metadata?.document_url,
        chunk_index: match.metadata?.chunk_index,
        recording_id: match.metadata?.recording_id,
        meeting_date: match.metadata?.meeting_date,
        speaker_name: match.metadata?.speaker_name,
        start_timestamp: match.metadata?.start_timestamp,
      }));

    console.log(`Found ${results.length} results from Pinecone`);

    return new Response(
      JSON.stringify({
        success: true,
        results: results,
        count: results.length,
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
        error: error.message || 'An error occurred while searching',
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