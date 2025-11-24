import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SearchRequest {
  query: string;
  client_id?: string;
  source_types?: string[];
  top_k?: number;
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
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get API keys
    const { data: apiKeys, error: keysError } = await supabaseClient
      .from('api_keys')
      .select('openai_api_key, qdrant_url, qdrant_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (keysError || !apiKeys?.openai_api_key) {
      throw new Error('OpenAI API key not configured');
    }

    if (!apiKeys.qdrant_url || !apiKeys.qdrant_api_key) {
      throw new Error('Qdrant credentials not configured');
    }

    const body: SearchRequest = await req.json();
    const { query, client_id, source_types, top_k = 20 } = body;

    if (!query) {
      throw new Error('query is required');
    }

    console.log(`Searching documents for query: "${query}"`);
    if (client_id) console.log(`Filtering by client_id: ${client_id}`);
    if (source_types) console.log(`Filtering by source_types: ${source_types.join(', ')}`);

    // Step 1: Generate embedding for query
    console.log('Step 1: Generating query embedding...');
    const queryEmbedding = await generateQueryEmbedding(query, apiKeys.openai_api_key);

    // Step 2: Search Qdrant
    console.log('Step 2: Searching Qdrant...');
    const results = await searchQdrant(
      apiKeys.qdrant_url,
      apiKeys.qdrant_api_key,
      queryEmbedding,
      client_id,
      source_types,
      top_k
    );

    console.log(`Found ${results.length} matching chunks`);

    // Step 3: Enrich results with additional document metadata if needed
    const enrichedResults = results.map(result => ({
      chunk_id: result.payload.chunk_id,
      document_id: result.payload.document_id,
      client_id: result.payload.client_id,
      source_type: result.payload.source_type,
      title: result.payload.title,
      url: result.payload.url,
      text: result.payload.text,
      chunk_index: result.payload.chunk_index,
      page_number: result.payload.page_number,
      score: result.score,
      metadata: result.payload.metadata || {},
    }));

    return new Response(
      JSON.stringify({
        success: true,
        query,
        results: enrichedResults,
        total: enrichedResults.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('Error searching documents:', error);
    
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

// Generate embedding for search query
async function generateQueryEmbedding(
  query: string,
  apiKey: string
): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: query,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Search Qdrant vector database
async function searchQdrant(
  qdrantUrl: string,
  apiKey: string,
  queryVector: number[],
  clientId?: string,
  sourceTypes?: string[],
  topK: number = 20
): Promise<any[]> {
  const collectionName = 'personapro_documents';
  
  // Build filter
  const filters: any = { must: [] };
  
  if (clientId) {
    filters.must.push({
      key: 'client_id',
      match: { value: clientId },
    });
  }
  
  if (sourceTypes && sourceTypes.length > 0) {
    filters.must.push({
      key: 'source_type',
      match: { any: sourceTypes },
    });
  }
  
  // Prepare search request
  const searchBody: any = {
    vector: queryVector,
    limit: topK,
    with_payload: true,
  };
  
  if (filters.must.length > 0) {
    searchBody.filter = filters;
  }
  
  const response = await fetch(
    `${qdrantUrl}/collections/${collectionName}/points/search`,
    {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Qdrant search error: ${response.status} ${error}`);
  }
  
  const data = await response.json();
  return data.result || [];
}
