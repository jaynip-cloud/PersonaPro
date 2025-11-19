import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ScrapeRequest {
  url: string;
  formats?: string[];
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
      .select('firecrawl_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (keysError || !apiKeys?.firecrawl_api_key) {
      return new Response(
        JSON.stringify({ error: 'Firecrawl API key not configured. Please add it in Settings.' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ScrapeRequest = await req.json();
    const { url, formats = ['markdown'] } = body;

    if (!url) {
      throw new Error('URL is required');
    }

    console.log('Scraping URL with Firecrawl:', url);

    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKeys.firecrawl_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: formats,
        onlyMainContent: true,
        timeout: 30000,
      }),
    });

    if (!firecrawlResponse.ok) {
      const errorData = await firecrawlResponse.json().catch(() => ({}));
      console.error('Firecrawl API error:', errorData);
      
      if (firecrawlResponse.status === 408 || errorData.code === 'SCRAPE_TIMEOUT') {
        throw new Error('The website took too long to respond. Try a simpler page or a different URL.');
      }
      
      throw new Error(errorData.error || `Firecrawl API error (${firecrawlResponse.status})`);
    }

    const result = await firecrawlResponse.json();

    if (!result.success) {
      throw new Error(result.error || 'Scraping failed');
    }

    console.log('Scraping completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: result.data,
        metadata: result.metadata,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Error in scrape-with-firecrawl:', error);
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
