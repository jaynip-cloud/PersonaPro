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

    // Fetch the webpage content
    const webpageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!webpageResponse.ok) {
      throw new Error(`Failed to fetch webpage: ${webpageResponse.statusText}`);
    }

    const html = await webpageResponse.text();

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Use OpenAI to extract services from the HTML
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
            content: `You are a comprehensive service information extractor. Your task is to analyze HTML content and extract EVERY service, sub-service, offering, and product mentioned on the page.

CRITICAL REQUIREMENTS:
1. Extract ALL services mentioned - main services, sub-services, nested offerings, and related products
2. If a service has sub-services or variations, create separate entries for each
3. Look for services in all sections: headers, cards, lists, descriptions, menus, pricing tables, feature lists, etc.
4. Don't skip minor services or complementary offerings
5. Extract services from navigation menus, sidebars, footer sections, and all content areas
6. Include service categories, specializations, and industry-specific offerings
7. Capture both parent services and their child services as separate entries

For each service/sub-service, extract:
- name: The exact service name or title (be specific, include parent context if it's a sub-service)
- description: A detailed description (2-4 sentences) combining all information found about this service
- pricing: Any pricing information, plans, or cost indicators mentioned
- tags: Relevant tags including: category, type, technology, industry (max 7 tags)

Format service names clearly:
- Main service: "Web Development"
- Sub-service: "Web Development - E-commerce Solutions"
- Nested sub-service: "Web Development - E-commerce - Shopify Integration"

Return a JSON object with a "services" array. Extract EVERYTHING - err on the side of including more rather than less.

Example format:
{
  "services": [
    {
      "name": "Web Development",
      "description": "Custom web application development using modern frameworks and technologies. We build scalable, responsive websites tailored to your business needs with cutting-edge tools and best practices.",
      "pricing": "Starting at $5,000",
      "tags": ["web", "development", "custom", "full-stack", "responsive"]
    },
    {
      "name": "Web Development - E-commerce Solutions",
      "description": "Specialized e-commerce platform development including shopping cart integration, payment processing, and inventory management. We create secure and user-friendly online stores.",
      "pricing": "Starting at $8,000",
      "tags": ["web", "ecommerce", "shopify", "woocommerce", "online-store"]
    },
    {
      "name": "Web Development - Custom CMS",
      "description": "Build custom content management systems tailored to your workflow. Easy-to-use admin panels for managing your website content without technical knowledge.",
      "pricing": "Custom quote",
      "tags": ["web", "cms", "custom", "content-management"]
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Extract ALL services and sub-services from this webpage HTML. Be thorough and comprehensive:\n\n${html.substring(0, 30000)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
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

    // Parse the JSON response
    let extractedData;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[1]);
      } else {
        extractedData = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response');
    }

    return new Response(
      JSON.stringify({
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
