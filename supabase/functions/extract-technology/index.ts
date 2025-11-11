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

    // Use OpenAI to extract technology information from the HTML
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
            content: `You are a technology information extractor. Your task is to analyze HTML content and extract ALL technology stack, partners, and integrations mentioned on the page.

CRITICAL REQUIREMENTS:
1. Extract ALL technologies mentioned - programming languages, frameworks, libraries, databases, cloud providers, tools, platforms
2. Look for technology information in all sections: about pages, technology pages, career pages, footer, headers, feature lists
3. Identify business partners, strategic partnerships, and technology partners
4. Find third-party integrations, APIs, and platform connections
5. Extract both explicitly stated technologies and those implied by logos, badges, or references
6. Include version-specific technologies (e.g., "React 18" becomes "React")

For technology extraction, identify:
- techStack: Programming languages, frameworks, libraries, databases, cloud platforms, DevOps tools, etc.
- partners: Business partners, strategic partners, technology partners, certified partnerships
- integrations: Third-party integrations, API connections, platform integrations, embedded services

Return a JSON object with these three arrays. Extract EVERYTHING - err on the side of including more rather than less.

IMPORTANT: Return simple, clean technology names without versions or extra descriptors.

Example format:
{
  "techStack": ["React", "Node.js", "Python", "PostgreSQL", "AWS", "Docker", "Kubernetes", "TypeScript", "MongoDB", "Redis"],
  "partners": ["Microsoft", "AWS", "Google Cloud", "Salesforce", "SAP"],
  "integrations": ["Slack", "Zapier", "Stripe", "Twilio", "SendGrid", "HubSpot", "Mailchimp"]
}`
          },
          {
            role: 'user',
            content: `Extract ALL technology stack, partners, and integrations from this webpage HTML. Be thorough and comprehensive:\n\n${html.substring(0, 30000)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
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
        techStack: extractedData.techStack || [],
        partners: extractedData.partners || [],
        integrations: extractedData.integrations || [],
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
