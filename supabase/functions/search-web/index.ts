import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SearchRequest {
  query: string;
  clientName?: string;
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

    const { query, clientName }: SearchRequest = await req.json();

    if (!query) {
      throw new Error('query is required');
    }

    // Get Perplexity API key
    const { data: apiKeys } = await supabaseClient
      .from('api_keys')
      .select('perplexity_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    const perplexityKey = apiKeys?.perplexity_api_key || Deno.env.get('PERPLEXITY_API_KEY');

    if (!perplexityKey) {
      throw new Error('Perplexity API key not configured. Please add it in Settings.');
    }

    console.log(`Web search: "${query}"${clientName ? ` for client ${clientName}` : ''}`);

    // Enhance query with client context if provided
    const searchQuery = clientName
      ? `${query} related to ${clientName}`
      : query;

    // Call Perplexity API
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful research assistant. Provide concise, accurate information with sources when available. Focus on recent and relevant information.'
          },
          {
            role: 'user',
            content: searchQuery
          }
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', errorText);
      throw new Error('Failed to search the web');
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'No results found';
    const citations = data.citations || [];

    console.log(`Web search completed. Found ${citations.length} citations.`);

    return new Response(
      JSON.stringify({
        success: true,
        answer,
        citations,
        query: searchQuery,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in search-web function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
