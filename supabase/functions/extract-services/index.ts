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

    console.log('Extracting services from:', url);

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
      metadata: pageData.metadata,
      headings: pageData.structuredData?.headings || [],
      paragraphs: pageData.structuredData?.paragraphs?.slice(0, 40) || [],
      lists: pageData.structuredData?.lists || [],
    };

    console.log('Structured data prepared:', {
      headings: structuredData.headings.length,
      paragraphs: structuredData.paragraphs.length,
      lists: structuredData.lists.length
    });

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a comprehensive service information extractor. Analyze the structured webpage data and extract ALL services comprehensively.

EXTRACTION RULES:
1. Extract services from headings (especially H2, H3), lists, and paragraphs
2. Create separate entries for parent services and sub-services
3. If a heading looks like a service, use the next paragraph as description
4. Combine related information to create detailed descriptions
5. Look for pricing information in surrounding text
6. Extract tags based on content, technology mentions, and categories

For each service:
- name: Clear, specific service name (include parent context for sub-services)
- description: 2-4 sentences combining all relevant information
- pricing: Any pricing/cost info found (or empty string)
- tags: 5-7 relevant tags (category, technology, industry)

Return JSON: {"services": [...]}`
          },
          {
            role: 'user',
            content: `Extract all services from this structured webpage data:\n\n${JSON.stringify(structuredData, null, 2)}`
          }
        ],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error('Failed to extract services using AI');
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from AI');
    }

    let extractedData;
    try {
      extractedData = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response');
    }

    console.log('Extracted services count:', extractedData.services?.length || 0);

    return new Response(
      JSON.stringify({
        success: true,
        services: extractedData.services || [],
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
    console.error('Error in extract-services function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred while extracting services',
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
