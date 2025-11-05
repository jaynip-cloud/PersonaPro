import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PrefillRequest {
  website_url?: string;
  datasource_type?: string;
  datasource_value?: string;
  target?: "company" | "client";
  perplexityKey?: string;
}

interface CompanyData {
  name?: string;
  website?: string;
  industry?: string;
  size?: string;
  country?: string;
  city?: string;
  about?: string;
  primary_contact_name?: string;
  primary_contact_email?: string;
  social_profiles?: Array<{
    platform: string;
    url: string;
  }>;
  services?: Array<{
    name: string;
    description: string;
  }>;
}

interface ClientData {
  name?: string;
  website?: string;
  industry?: string;
  about?: string;
  contacts?: Array<{
    name: string;
    email?: string;
    phone?: string;
    role?: string;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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

    const body: PrefillRequest = await req.json();
    const { website_url, datasource_type, datasource_value, target = "company", perplexityKey: requestPerplexityKey } = body;

    if (!website_url && !datasource_value) {
      return new Response(
        JSON.stringify({
          error: "Either website_url or datasource_value is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const url = website_url || datasource_value;

    if (!url) {
      return new Response(
        JSON.stringify({ error: "Invalid URL provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let perplexityKey = requestPerplexityKey || Deno.env.get('PERPLEXITY_API_KEY');

    if (!perplexityKey) {
      const { data: apiKeys, error: keysError } = await supabaseClient
        .from('api_keys')
        .select('perplexity_api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!keysError && apiKeys?.perplexity_api_key) {
        perplexityKey = apiKeys.perplexity_api_key;
      }
    }

    if (!perplexityKey) {
      return new Response(
        JSON.stringify({
          error: "Perplexity API key not configured. Please add your API key in Settings or provide it in the request.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Calling extract-company-data for URL: ${url}`);

    const extractResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/extract-company-data`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          perplexityKey: perplexityKey,
        }),
      }
    );

    if (!extractResponse.ok) {
      const errorData = await extractResponse.json();
      throw new Error(errorData.error || 'Failed to extract company data');
    }

    const extractedData = await extractResponse.json();

    if (!extractedData.success) {
      throw new Error(extractedData.error || 'Data extraction failed');
    }

    const rawData = extractedData.data;

    let prefillData: CompanyData | ClientData;

    if (target === "client") {
      prefillData = {
        name: rawData.name || '',
        website: url,
        industry: rawData.industry || '',
        about: rawData.businessInfo?.mission || rawData.description || '',
        contacts: (rawData.contacts || []).map((contact: any) => ({
          name: contact.name || '',
          email: contact.email || '',
          phone: contact.phone || '',
          role: contact.title || '',
        })),
      } as ClientData;
    } else {
      const socialProfiles = [];
      if (rawData.socialProfiles?.linkedin) {
        socialProfiles.push({
          platform: 'linkedin',
          url: rawData.socialProfiles.linkedin,
        });
      }
      if (rawData.socialProfiles?.twitter) {
        socialProfiles.push({
          platform: 'twitter',
          url: rawData.socialProfiles.twitter,
        });
      }
      if (rawData.socialProfiles?.facebook) {
        socialProfiles.push({
          platform: 'facebook',
          url: rawData.socialProfiles.facebook,
        });
      }
      if (rawData.socialProfiles?.instagram) {
        socialProfiles.push({
          platform: 'instagram',
          url: rawData.socialProfiles.instagram,
        });
      }

      prefillData = {
        name: rawData.name || '',
        website: url,
        industry: rawData.industry || '',
        size: rawData.companySize || '',
        country: rawData.location?.country || '',
        city: rawData.location?.city || '',
        about: rawData.description || '',
        primary_contact_name: rawData.contactInfo?.contactName || '',
        primary_contact_email: rawData.contactInfo?.primaryEmail || '',
        social_profiles: socialProfiles,
        services: (rawData.services || []).map((service: any) => ({
          name: service.name || '',
          description: service.description || '',
        })),
      } as CompanyData;
    }

    const contactCount = (rawData.contacts || []).length;
    const serviceCount = (rawData.services || []).length;
    const blogCount = (rawData.blogs || []).length;
    const testimonialCount = (rawData.testimonials || []).length;

    let confidenceScore = 0.5;
    if (rawData.name) confidenceScore += 0.1;
    if (rawData.industry) confidenceScore += 0.1;
    if (contactCount > 0) confidenceScore += 0.1;
    if (serviceCount > 0) confidenceScore += 0.1;
    if (rawData.socialProfiles?.linkedin) confidenceScore += 0.1;

    return new Response(
      JSON.stringify({
        success: true,
        target,
        data: prefillData,
        source: website_url ? "website" : datasource_type || "unknown",
        confidence: Math.min(confidenceScore, 0.95),
        message: "Data successfully extracted and structured using AI",
        extractionStats: {
          contacts: contactCount,
          services: serviceCount,
          blogs: blogCount,
          testimonials: testimonialCount,
          socialProfiles: Object.keys(rawData.socialProfiles || {}).filter(
            (k) => rawData.socialProfiles[k]
          ).length,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Error in ai-prefill:', error);
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