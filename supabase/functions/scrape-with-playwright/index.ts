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
  wait_for_selector?: string;
  extract_links?: boolean;
  extract_images?: boolean;
  screenshot?: boolean;
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

    // Get Playwright service URL and API key from environment or api_keys table
    const playwrightServiceUrl = Deno.env.get('PLAYWRIGHT_SERVICE_URL');

    if (!playwrightServiceUrl) {
      return new Response(
        JSON.stringify({
          error: 'Playwright service not configured. Please set PLAYWRIGHT_SERVICE_URL environment variable.'
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has custom Playwright API key, otherwise use default
    const { data: apiKeys } = await supabaseClient
      .from('api_keys')
      .select('playwright_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    const playwrightApiKey = apiKeys?.playwright_api_key || Deno.env.get('PLAYWRIGHT_SERVICE_API_KEY');

    if (!playwrightApiKey) {
      return new Response(
        JSON.stringify({
          error: 'Playwright API key not configured. Please add it in Settings or set PLAYWRIGHT_SERVICE_API_KEY.'
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ScrapeRequest = await req.json();
    const {
      url,
      formats = ['markdown', 'html'],
      wait_for_selector,
      extract_links = false,
      extract_images = false,
      screenshot = false
    } = body;

    if (!url) {
      throw new Error('URL is required');
    }

    console.log('Scraping URL with Playwright:', url);

    // Call the Python Playwright service
    const playwrightResponse = await fetch(`${playwrightServiceUrl}/scrape`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${playwrightApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: formats,
        wait_for_selector: wait_for_selector,
        extract_links: extract_links,
        extract_images: extract_images,
        javascript_enabled: true,
        screenshot: screenshot,
        wait_for_timeout: 30000,
      }),
    });

    if (!playwrightResponse.ok) {
      const errorData = await playwrightResponse.json().catch(() => ({}));
      console.error('Playwright service error:', errorData);

      if (playwrightResponse.status === 504 || playwrightResponse.status === 408) {
        throw new Error('The website took too long to respond. Try a simpler page or a different URL.');
      }

      throw new Error(errorData.detail || errorData.error || `Playwright service error (${playwrightResponse.status})`);
    }

    const result = await playwrightResponse.json();

    if (!result.success) {
      throw new Error('Scraping failed');
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
    console.error('Error in scrape-with-playwright:', error);
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
