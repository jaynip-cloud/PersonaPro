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

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Generate embedding for the search query
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
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

    // Perform vector similarity search
    let query_builder = supabaseClient.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: similarityThreshold,
      match_count: limit,
      filter_user_id: user.id,
      filter_client_id: clientId || null,
    });

    const { data: matches, error: searchError } = await query_builder;

    if (searchError) {
      // If RPC function doesn't exist, fall back to manual query
      console.log('RPC function not found, using direct query');
      
      let directQuery = supabaseClient
        .from('document_embeddings')
        .select('*')
        .eq('user_id', user.id);
      
      if (clientId) {
        directQuery = directQuery.eq('client_id', clientId);
      }
      
      const { data: allDocs, error: fetchError } = await directQuery;
      
      if (fetchError) {
        throw new Error('Failed to fetch documents');
      }

      // Manual cosine similarity calculation
      const resultsWithSimilarity = allDocs.map((doc: any) => {
        const similarity = cosineSimilarity(queryEmbedding, doc.embedding);
        return {
          ...doc,
          similarity,
        };
      }).filter((doc: any) => doc.similarity >= similarityThreshold)
        .sort((a: any, b: any) => b.similarity - a.similarity)
        .slice(0, limit);
      
      return new Response(
        JSON.stringify({
          success: true,
          results: resultsWithSimilarity,
          count: resultsWithSimilarity.length,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        results: matches || [],
        count: matches?.length || 0,
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

// Helper function for cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}