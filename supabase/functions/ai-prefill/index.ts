import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

function mockWebsiteCrawl(url: string, target: string): CompanyData | ClientData {
  const domain = new URL(url).hostname.replace("www.", "").split(".")[0];
  const companyName = domain.charAt(0).toUpperCase() + domain.slice(1);

  if (target === "client") {
    return {
      name: companyName,
      website: url,
      industry: "Technology",
      about: `${companyName} is a leading technology company focused on innovation and digital transformation.`,
      contacts: [
        {
          name: "John Doe",
          email: `john@${domain}.com`,
          phone: "+1 (555) 123-4567",
          role: "CEO",
        },
        {
          name: "Jane Smith",
          email: `jane@${domain}.com`,
          phone: "+1 (555) 123-4568",
          role: "CTO",
        },
      ],
    } as ClientData;
  }

  return {
    name: companyName,
    website: url,
    industry: "Software & Technology",
    size: "50-200",
    country: "United States",
    city: "San Francisco",
    about: `${companyName} provides cutting-edge solutions for modern businesses, specializing in digital transformation and enterprise software.`,
    primary_contact_name: "Contact Team",
    primary_contact_email: `hello@${domain}.com`,
    social_profiles: [
      {
        platform: "linkedin",
        url: `https://linkedin.com/company/${domain}`,
      },
      {
        platform: "twitter",
        url: `https://twitter.com/${domain}`,
      },
    ],
    services: [
      {
        name: "Consulting Services",
        description: "Strategic technology consulting for enterprise clients",
      },
      {
        name: "Software Development",
        description: "Custom software solutions tailored to your needs",
      },
      {
        name: "Cloud Solutions",
        description: "Cloud infrastructure and migration services",
      },
    ],
  } as CompanyData;
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

    const body: PrefillRequest = await req.json();
    const { website_url, datasource_type, datasource_value, target = "company" } = body;

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

    const prefillData = mockWebsiteCrawl(url, target);

    return new Response(
      JSON.stringify({
        success: true,
        target,
        data: prefillData,
        source: website_url ? "website" : datasource_type || "unknown",
        confidence: 0.85,
        message: "Data successfully extracted and structured",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
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