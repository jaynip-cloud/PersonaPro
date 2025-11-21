import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  url: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { url }: RequestPayload = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log('Extracting technology from:', url);

    const authHeader = req.headers.get("Authorization");
    const scrapeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/scrape-website`;

    const scrapeResponse = await fetch(scrapeUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader || `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, includeLinks: false }),
    });

    if (!scrapeResponse.ok) {
      throw new Error(`Failed to scrape webpage: ${scrapeResponse.status}`);
    }

    const scrapeData = await scrapeResponse.json();
    if (!scrapeData.success) {
      throw new Error('Scraping failed');
    }

    const pageData = scrapeData.data;

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const structuredData = {
      pageTitle: pageData.title,
      headings: pageData.structuredData?.headings || [],
      paragraphs: pageData.structuredData?.paragraphs?.slice(0, 50) || [],
      lists: pageData.structuredData?.lists || [],
      text: pageData.text?.substring(0, 20000) || '',
    };

    console.log('Structured data prepared:', {
      headings: structuredData.headings.length,
      paragraphs: structuredData.paragraphs.length,
      lists: structuredData.lists.length
    });

    // Use OpenAI to extract technology information
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a technology stack analyzer. Extract technologies, partners, and integrations from structured webpage data.

CATEGORIES:
1. techStack: Programming languages, frameworks, databases, cloud providers, DevOps tools
2. partners: Technology partners, business partners, certifications
3. integrations: Third-party tools and services they integrate with

EXTRACTION:
- Look for technology mentions in headings, lists, and paragraphs
- Extract clean names ("React" not "React.js")
- Remove version numbers
- Avoid duplicates
- Only extract explicitly mentioned items

Return JSON: {"techStack": [...], "partners": [...], "integrations": [...]}`
          },
          {
            role: 'user',
            content: `Extract technologies from this structured webpage data:\n\n${JSON.stringify(structuredData, null, 2)}`
          }
        ],
        temperature: 0.1,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error('Failed to extract technology data using AI');
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from AI');
    }

    // Parse the JSON response
    let extractedData;
    try {
      extractedData = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response. Please try again.');
    }

    // Validate and clean the data
    const techStack = Array.isArray(extractedData.techStack)
      ? [...new Set(extractedData.techStack.filter((t: any) => typeof t === 'string' && t.trim()))]
      : [];

    const partners = Array.isArray(extractedData.partners)
      ? [...new Set(extractedData.partners.filter((p: any) => typeof p === 'string' && p.trim()))]
      : [];

    const integrations = Array.isArray(extractedData.integrations)
      ? [...new Set(extractedData.integrations.filter((i: any) => typeof i === 'string' && i.trim()))]
      : [];

    console.log('Extracted technology data:', {
      techStackCount: techStack.length,
      partnersCount: partners.length,
      integrationsCount: integrations.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        techStack,
        partners,
        integrations,
        url: url,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error('Error in extract-technology function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred while extracting technology data',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
