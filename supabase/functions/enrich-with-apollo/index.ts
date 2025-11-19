import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EnrichRequest {
  domain?: string;
  company_name?: string;
  enrich_type: 'company' | 'people';
  organization_id?: string;
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
      .select('apollo_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (keysError || !apiKeys?.apollo_api_key) {
      return new Response(
        JSON.stringify({ error: 'Apollo API key not configured. Please add it in Settings.' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: EnrichRequest = await req.json();
    const { domain, company_name, enrich_type, organization_id } = body;

    if (!domain && !company_name && !organization_id) {
      throw new Error('Domain, company name, or organization ID is required');
    }

    console.log(`Enriching with Apollo (${enrich_type}):`, domain || company_name || organization_id);

    let result: any = null;

    if (enrich_type === 'company') {
      const searchBody: any = {};
      
      if (domain) {
        searchBody.domain = domain;
      } else if (organization_id) {
        const orgResponse = await fetch(`https://api.apollo.io/v1/organizations/${organization_id}`, {
          method: 'GET',
          headers: {
            'X-Api-Key': apiKeys.apollo_api_key,
            'Content-Type': 'application/json',
          },
        });

        if (!orgResponse.ok) {
          const errorText = await orgResponse.text();
          console.error('Apollo API error:', errorText);
          throw new Error(`Apollo API error (${orgResponse.status}): ${errorText}`);
        }

        result = await orgResponse.json();
      } else {
        searchBody.organization_name = company_name;
      }

      if (!result) {
        const searchResponse = await fetch('https://api.apollo.io/v1/organizations/search', {
          method: 'POST',
          headers: {
            'X-Api-Key': apiKeys.apollo_api_key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...searchBody,
            page: 1,
            per_page: 1,
          }),
        });

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          console.error('Apollo API error:', errorText);
          throw new Error(`Apollo API error (${searchResponse.status}): ${errorText}`);
        }

        const searchResult = await searchResponse.json();
        result = searchResult.organizations?.[0] || null;
      }
    } else if (enrich_type === 'people') {
      const searchBody: any = {
        page: 1,
        per_page: 10,
      };

      if (organization_id) {
        searchBody.organization_ids = [organization_id];
      } else if (domain) {
        searchBody.organization_domain = domain;
      }

      const peopleResponse = await fetch('https://api.apollo.io/v1/people/search', {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKeys.apollo_api_key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchBody),
      });

      if (!peopleResponse.ok) {
        const errorText = await peopleResponse.text();
        console.error('Apollo API error:', errorText);
        throw new Error(`Apollo API error (${peopleResponse.status}): ${errorText}`);
      }

      result = await peopleResponse.json();
    }

    console.log('Enrichment completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Error in enrich-with-apollo:', error);
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
